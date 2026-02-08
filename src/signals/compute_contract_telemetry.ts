import type { ContractEvidence, ContractSignalMap } from './contract_types.js';
import type { ParseFileResult } from '../parser/types.js';
import type { SemanticProfileV0 } from '../config/profiles.js';
import { stableStringCompare } from '../utils/determinism.js';

export interface ComputeContractTelemetryInput {
  files: string[];
  semanticProfile?: SemanticProfileV0;
  parseResults?: ParseFileResult[];
}

export function computeContractTelemetry(
  input: ComputeContractTelemetryInput
): ContractSignalMap {
  const { files, semanticProfile, parseResults } = input;
  const contractSignals: ContractSignalMap = {};

  const normalizedFiles = files.map(normalizePosixPath).sort(stableStringCompare);
  const includePatterns = semanticProfile?.boundary.include ?? [];
  const excludePatterns = semanticProfile?.boundary.exclude ?? [];
  const inboundAnchors = semanticProfile?.anchors.inbound ?? [];
  const outboundAnchors = semanticProfile?.anchors.outbound ?? [];

  // Expand brace patterns like `index.{ts,tsx}` deterministically. We keep the
  // expanded pattern string as the evidence key (simple and stable).
  const includeRegexes = expandBracePatterns(includePatterns)
    .map(pattern => [pattern, globToRegex(pattern)] as const);
  const excludeRegexes = expandBracePatterns(excludePatterns)
    .map(pattern => [pattern, globToRegex(pattern)] as const);

  const sourceMap = new Map<string, string>();
  if (parseResults) {
    for (const result of parseResults) {
      const source = (result as any).source;
      if (typeof source === 'string') {
        sourceMap.set(normalizePosixPath(result.file), source);
      }
    }
  }

  for (const file of normalizedFiles) {
    const excludedBy = firstMatch(file, excludeRegexes);
    if (excludedBy) {
      continue;
    }

    const includedBy = firstMatch(file, includeRegexes);
    if (!includedBy) {
      contractSignals[file] = {
        status: 'C~',
        evidence: buildEvidence({ inbound: [], outbound: [] }),
      };
      continue;
    }

    const source = sourceMap.get(file);
    if (!source || isBinaryContent(source)) {
      contractSignals[file] = {
        status: 'C~',
        evidence: buildEvidence({ inbound: [], outbound: [] }),
      };
      continue;
    }

    const foundInbound = findAnchors(source, inboundAnchors);
    const foundOutbound = findAnchors(source, outboundAnchors);
    const hasInbound = foundInbound.length > 0;
    const hasOutbound = foundOutbound.length > 0;

    const status = hasInbound && hasOutbound
      ? 'C+'
      : hasInbound || hasOutbound
        ? 'C?'
        : 'C0';

    contractSignals[file] = {
      status,
      evidence: buildEvidence({ inbound: foundInbound, outbound: foundOutbound }),
    };
  }

  return contractSignals;
}

function normalizePosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const doubleStarToken = '__DOUBLE_STAR__';
  let regexStr = escaped.replace(/\*\*/g, doubleStarToken);
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  regexStr = regexStr.replace(new RegExp(doubleStarToken, 'g'), '.*');
  return new RegExp(`^${regexStr}$`);
}

function expandBracePatterns(patterns: string[]): string[] {
  const out = new Set<string>();
  for (const p of patterns) {
    for (const expanded of expandFirstBrace(p)) {
      out.add(expanded);
    }
  }
  return [...out].sort(stableStringCompare);
}

function expandFirstBrace(pattern: string): string[] {
  const start = pattern.indexOf('{');
  if (start < 0) return [pattern];
  const end = pattern.indexOf('}', start + 1);
  if (end < 0) return [pattern];

  const head = pattern.slice(0, start);
  const body = pattern.slice(start + 1, end);
  const tail = pattern.slice(end + 1);

  const parts = body.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return [pattern];

  const expanded: string[] = [];
  for (const part of parts) {
    for (const next of expandFirstBrace(`${head}${part}${tail}`)) {
      expanded.push(next);
    }
  }
  // Deterministic ordering; also de-dupe in case of repeated parts.
  return [...new Set(expanded)].sort(stableStringCompare);
}

function firstMatch(file: string, patterns: ReadonlyArray<readonly [string, RegExp]>): string | undefined {
  for (const [pattern, regex] of patterns) {
    if (regex.test(file)) {
      return pattern;
    }
  }
  return undefined;
}

function findAnchors(text: string, anchors: string[]): string[] {
  const found = new Set<string>();
  for (const anchor of anchors) {
    if (isRegexAnchor(anchor)) {
      const pattern = anchor.slice(1, -1);
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        found.add(anchor);
      }
    } else if (text.includes(anchor)) {
      found.add(anchor);
    }
  }
  return [...found].sort(stableStringCompare);
}

function isRegexAnchor(anchor: string): boolean {
  return anchor.length > 1 && anchor.startsWith('/') && anchor.endsWith('/');
}

function isBinaryContent(text: string): boolean {
  return text.includes('\u0000');
}

function buildEvidence(anchorsFound: { inbound: string[]; outbound: string[] }): ContractEvidence {
  return {
    anchorsFound,
  };
}
