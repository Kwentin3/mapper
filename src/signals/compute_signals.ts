/**
 * Compute architecture signals from global graph and file metadata.
 */

import type { DependencyGraph } from '../graph/types.js';
import type { ParseFileResult } from '../parser/types.js';
import type { Signal, SignalKind, FileSignals, SummaryItem, SignalsResult, SignalBudgets } from './types.js';
import { rankByScore, takeTopN, fanIn, fanOut, rankEntrypoints } from './rank.js';
import { stableStringCompare } from '../utils/determinism.js';
import { computeContractSignals } from './contracts_signals.js';

export interface ComputeSignalsInput {
  files: string[];
  graph: DependencyGraph;
  parseResults: ParseFileResult[];
  fileMeta: Record<string, { depth: number; loc?: number; exportCount?: number }>;
  budgets: SignalBudgets;
  thresholds: { bigLoc: number; godFanIn: number; deepPath: number; barrelExports: number };
}

function createSignal(kind: SignalKind, code: string): Signal {
  return { kind, code };
}

/**
 * Determine if a file is part of any cycle.
 */
function isFileInCycle(file: string, cycles: string[][]): boolean {
  return cycles.some(cycle => cycle.includes(file));
}

/**
 * Determine if a file has a parse error (any warning).
 */
function hasParseError(file: string, parseResults: ParseFileResult[]): boolean {
  const result = parseResults.find(r => r.file === file);
  return result ? result.warnings.length > 0 : false;
}

/**
 * Determine parse error category for a file, if any.
 * Returns one of 'SYNTAX'|'UNSUPPORTED'|'IO' or null when none.
 */
function parseErrorCategory(file: string, parseResults: ParseFileResult[]): 'SYNTAX' | 'UNSUPPORTED' | 'IO' | null {
  const result = parseResults.find(r => r.file === file);
  if (!result || !result.warnings || result.warnings.length === 0) return null;

  // First, check for already formatted warnings produced by parseFile
  for (const w of result.warnings) {
    const m = /^\(\? PARSE-ERROR(?::([A-Z-]+))?\)/.exec(w);
    if (m) {
      return (m[1] as 'SYNTAX' | 'UNSUPPORTED' | 'IO') || 'UNSUPPORTED';
    }
  }

  // Fallback heuristics for legacy/raw warning strings
  for (const w of result.warnings) {
    if (/SyntaxError/i.test(w)) return 'SYNTAX';
    if (/ENOENT|Could not read|cannot read|no such file/i.test(w)) return 'IO';
  }

  // Default fallback — treat unknown parse warnings as syntax-related for safety
  return 'SYNTAX';
}

/**
 * Determine if a file contains dynamic imports.
 */
function hasDynamicImport(file: string, parseResults: ParseFileResult[]): boolean {
  const result = parseResults.find(r => r.file === file);
  return result ? result.edges.some(edge => edge.kind === 'dynamic') : false;
}

export function computeSignals(input: ComputeSignalsInput): SignalsResult {
  const { files, graph, parseResults, fileMeta, budgets, thresholds } = input;
  const { nodes, cycles } = graph;
  const { entrypointsTopN, publicApiTopN, hubsTopN, inlinePerFileMax } = budgets;
  const { bigLoc, godFanIn, deepPath, barrelExports } = thresholds;

  const fileSignals: FileSignals[] = [];
  const entrypointCandidates: SummaryItem[] = [];
  const publicApiCandidates: SummaryItem[] = [];
  const hubsFanInCandidates: SummaryItem[] = [];
  const hubsFanOutCandidates: SummaryItem[] = [];
  const warnings: string[] = [];

  // Helper to get node by file id (POSIX path)
  const getNode = (file: string) => nodes.get(file);

  // Deterministic order of files
  const sortedFiles = [...files].sort(stableStringCompare);

  for (const file of sortedFiles) {
    const node = getNode(file);
    const meta = fileMeta[file] || { depth: 0 };
    let inline: Signal[] = [];

    // --- Structural Risks (!) ---
    if (isFileInCycle(file, cycles)) {
      inline.push(createSignal('risk', 'CYCLE'));
    }

    // --- Heuristic Hints (?) ---
    const pe = parseErrorCategory(file, parseResults);
    if (pe) {
      inline.push(createSignal('hint', `PARSE-ERROR:${pe}`));
    }
    if (hasDynamicImport(file, parseResults)) {
      inline.push(createSignal('hint', 'DYNAMIC-IMPORT'));
    }
    // ORPHAN: no incoming edges (fan-in === 0) and not an entrypoint? treat as context
    if (node && fanIn(node) === 0) {
      inline.push(createSignal('context', 'ORPHAN'));
    }
    // GOD-MODULE: fan-in exceeds threshold
    if (node && fanIn(node) > godFanIn) {
      inline.push(createSignal('hint', 'GOD-MODULE'));
    }
    // DEEP-PATH: depth exceeds threshold
    if (meta.depth > deepPath) {
      inline.push(createSignal('hint', 'DEEP-PATH'));
    }
    // BARREL-HELL: export count exceeds threshold
    if (meta.exportCount && meta.exportCount > barrelExports) {
      inline.push(createSignal('hint', 'BARREL-HELL'));
    }
    // BIG: LOC meets or exceeds threshold
    if (meta.loc && meta.loc >= bigLoc) {
      inline.push(createSignal('hint', 'BIG'));
    }

    // --- Navigation Signals (→) ---
    // For entrypoints (files with fanIn === 0 and fanOut > 0)
    if (node && fanIn(node) === 0 && fanOut(node) > 0) {
      inline.push(createSignal('nav', 'ENTRYPOINT'));
    }
    // For public API files (high fan-in and high export count)
    const exportCnt = meta.exportCount || 0;
    if (node && fanIn(node) > 0 && exportCnt > 0) {
      inline.push(createSignal('nav', 'PUBLIC-API'));
    }

    // Apply inline per‑file budget
    // Merge in contract-derived signals (deterministic)
    // Compute contract signals once for all files (outside loop would be slightly more efficient)
    // but keep simple: compute map before loop (see below). 
    
    // We'll merge after collecting all signals to maintain precedence ordering.

    fileSignals.push({ file, inline });

    // --- Navigation candidates (→) ---
    // Entrypoint heuristic: file with fan‑in === 0 (no one imports it) and fan‑out > 0 (imports others)
    if (node && fanIn(node) === 0 && fanOut(node) > 0) {
      entrypointCandidates.push({
        file,
        reason: 'fan-in is 0, imports others',
        score: fanOut(node), // use fan‑out as score
      });
    }

    // Public‑API heuristic: high fan‑in and high export count
    if (node && fanIn(node) > 0 && exportCnt > 0) {
      publicApiCandidates.push({
        file,
        reason: `Fan‑in ${fanIn(node)}, exports ${exportCnt}`,
        score: fanIn(node) + exportCnt,
      });
    }

    // Hub (fan‑in) candidate
    if (node && fanIn(node) > 0) {
      hubsFanInCandidates.push({
        file,
        reason: `Fan‑in ${fanIn(node)}`,
        score: fanIn(node),
      });
    }

    // Hub (fan‑out) candidate
    if (node && fanOut(node) > 0) {
      hubsFanOutCandidates.push({
        file,
        reason: `Fan‑out ${fanOut(node)}`,
        score: fanOut(node),
      });
    }
  }

  // Apply entrypoint ranking with priority and exclusion rules
  const rankedEntrypoints = rankEntrypoints(entrypointCandidates);

  // Contract-derived signals: compute once and merge deterministically into fileSignals
  const contractMap = computeContractSignals({ files: sortedFiles, parseResults });

  // Merge while preserving original detection order for existing signals.
  // For contract signals of the same kind, append them deterministically (sorted by code).
  for (const fs of fileSignals) {
    const contractSigs = contractMap.get(fs.file) || [];
    const contractHints = contractSigs.filter(s => s.kind === 'hint').sort((a, b) => stableStringCompare(a.code, b.code));
    const contractContexts = contractSigs.filter(s => s.kind === 'context').sort((a, b) => stableStringCompare(a.code, b.code));

    const risks: Signal[] = [];
    const hints: Signal[] = [];
    const contexts: Signal[] = [];
    const navs: Signal[] = [];

    for (const s of fs.inline) {
      if (s.kind === 'risk') risks.push(s);
      else if (s.kind === 'hint') hints.push(s);
      else if (s.kind === 'context') contexts.push(s);
      else if (s.kind === 'nav') navs.push(s);
    }

  // Prioritize only boundary "health" contract signals so they survive
  // inline per-file budgeting. Other contract telemetry signals (e.g.
  // 'CONTRACT: input' / 'CONTRACT: output') should follow normal ordering.
  // Health hints: INPUT_ONLY_CONTRACT, OUTPUT_ONLY_CONTRACT
  const healthHintCodes = new Set(['INPUT_ONLY_CONTRACT', 'OUTPUT_ONLY_CONTRACT']);
  const healthContextCodes = new Set(['NO_CONTRACT']);

  const contractHealthHints = contractHints.filter(s => healthHintCodes.has(s.code));
  const otherContractHints = contractHints.filter(s => !healthHintCodes.has(s.code));

  const contractHealthContexts = contractContexts.filter(s => healthContextCodes.has(s.code));
  const otherContractContexts = contractContexts.filter(s => !healthContextCodes.has(s.code));

  // Merge into buckets preserving normal precedence but putting health signals
  // at the start of their respective buckets only.
  const hintsBucket = [...contractHealthHints, ...hints, ...otherContractHints];
  const contextsBucket = [...contractHealthContexts, ...contexts, ...otherContractContexts];

  fs.inline = [...risks, ...hintsBucket, ...contextsBucket, ...navs];

  // Apply inline per-file budget after merging
  if (fs.inline.length > inlinePerFileMax) fs.inline = fs.inline.slice(0, inlinePerFileMax);
  }
  const rankedPublicApi = rankEntrypoints(publicApiCandidates);
  
  // Apply top‑N budgeting
  const entrypoints = takeTopN(rankedEntrypoints, entrypointsTopN);
  const publicApi = takeTopN(rankedPublicApi, publicApiTopN);
  const hubsFanIn = takeTopN(hubsFanInCandidates, hubsTopN);
  const hubsFanOut = takeTopN(hubsFanOutCandidates, hubsTopN);

  return {
    files: fileSignals,
    entrypoints,
    publicApi,
    hubsFanIn,
    hubsFanOut,
    warnings,
  };
}