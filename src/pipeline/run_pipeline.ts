/**
 * Deterministic pipeline orchestrator for the architecture mapper.
 */

import { loadEffectiveProfile } from '../config/load.js';
import { scanRepo, type ScanOptions, type ScanResult, type DirNode, type FileNode } from '../scanner/index.js';
import { parseFile, type ParseFileResult, type ParseOptions } from '../parser/index.js';
import { resolveSpecifier, type ResolverOptions, type ResolvedTarget } from '../resolver/index.js';
import { buildDependencyGraph, type BuildGraphInput, type DependencyGraph } from '../graph/index.js';
import { computeSignals, type ComputeSignalsInput, type SignalsResult } from '../signals/index.js';
import { renderArchitectureMd, type RenderInput, type RenderOptions } from '../render/index.js';
import { readFileSync } from 'fs';
import { join, dirname, relative, resolve as pathResolve } from 'path';
import { stablePathNormalize } from '../utils/determinism.js';

/**
 * Options for the entire pipeline.
 */
export interface PipelineOptions {
    rootDir: string;
    configPath?: string;
    profileName?: string;
    focus?: string;
    /** Focus a single file for deep-dive rendering (relative POSIX path) */
    focusFile?: string;
    /** When focusFile is set, number of hops (K) to fully expand (task capsule). Default handled by caller (1). */
    focusDepth?: number;
    /** View-level budget profile: small|default|large */
    budget?: 'small' | 'default' | 'large';
    depth?: number;
    fullSignals?: boolean;
    showOrphans?: boolean;
    showTemp?: boolean;
    outFile?: string;
}

/**
 * Result of a pipeline run.
 */
export interface PipelineResult {
    markdown: string;
    warnings: string[];
}

/**
 * Run the deterministic pipeline end‑to‑end.
 *
 * Steps:
 * 1. Load effective profile (config + CLI overrides).
 * 2. Scan repository for files.
 * 3. Parse each file for import/export edges.
 * 4. Resolve each specifier to internal/external targets.
 * 5. Build dependency graph.
 * 6. Compute architecture signals.
 * 7. Render the final markdown.
 *
 * The function does NOT write the markdown to disk; that is the caller's responsibility.
 */
export async function runPipeline(opts: PipelineOptions): Promise<PipelineResult> {
    const warnings: string[] = [];

    // 1. Load effective profile
    const profile = loadEffectiveProfile({
        profile: opts.profileName,
        configDir: opts.configPath ? undefined : opts.rootDir,
    });

    // 2. Scan repository
    const extraExcludes: string[] = [];
    if (opts.outFile) {
        // If the output file lies inside the rootDir, exclude ONLY that exact
        // relative path from the scan so the file written by the current run is
        // not picked up during scanning. Do NOT exclude entire directories.
        const absOut = pathResolve(opts.rootDir, opts.outFile);
        const relOut = relative(opts.rootDir, absOut);
        if (!relOut.startsWith('..') && relOut !== '') {
            // Normalize to POSIX-style and add the exact relative path to excludes
            // so scanDir can skip that file only.
            const normalized = relOut.replace(/\\/g, '/');
            if (!extraExcludes.includes(normalized)) {
                extraExcludes.push(normalized);
            }
        }
    }
    const scanOptions: ScanOptions = {
        rootDir: opts.rootDir,
        excludes: extraExcludes, // TODO: incorporate profile.excludes if added later
        maxFiles: undefined,
    };
    const scanResult: ScanResult = await scanRepo(scanOptions);
    warnings.push(...scanResult.warnings);

    // Collect all file paths (relative POSIX)
    const files: string[] = [];
    function collectFiles(node: DirNode | FileNode) {
        if (node.kind === 'file') {
            files.push(node.relPath);
        } else {
            for (const child of node.children) {
                collectFiles(child);
            }
        }
    }
    collectFiles(scanResult.root);

    // 3. Parse files
    const parseOptions: ParseOptions = {
        markDynamicImports: true,
    };
    const parsed: ParseFileResult[] = [];
    for (const file of files) {
        const absPath = join(opts.rootDir, file);
        let code: string;
        try {
            code = readFileSync(absPath, 'utf-8');
        } catch (err) {
            warnings.push(`Could not read file ${file}: ${err instanceof Error ? err.message : String(err)}`);
            continue;
        }
    const result = parseFile(file, code, parseOptions);
    // Attach original source text to the parse result for downstream heuristics
    // (deterministic, read from previously-read file content)
    (result as any).source = code;
    parsed.push(result);
    warnings.push(...result.warnings);
    }

    // 4. Resolve specifiers (prepare resolver function for graph building)
    const resolverOptions: ResolverOptions = {
        baseDir: opts.rootDir,
        projectRoot: opts.rootDir,
        extensions: profile.extensions.length > 0 ? profile.extensions : undefined,
        tsconfigPath: join(opts.rootDir, 'tsconfig.json'),
        packageJsonPath: join(opts.rootDir, 'package.json'),
        resolveDynamicImports: true,
    };

    // Resolver function expected by buildDependencyGraph
    const resolve = (from: string, specifier: string): ResolvedTarget => {
        const result = resolveSpecifier(specifier, {
            ...resolverOptions,
            baseDir: dirname(join(opts.rootDir, from)),
        });
        warnings.push(...result.warnings);
        // Pick the first resolved target (deterministic order)
        if (result.resolved.length > 0) {
            return result.resolved[0];
        }
        // Fallback: treat as unresolved
        return {
            path: specifier,
            kind: 'unresolved',
            original: specifier,
        };
    };

    // 5. Build dependency graph
    const graphInput: BuildGraphInput = {
        files,
        parsed,
        resolve,
    };
    const graph: DependencyGraph = buildDependencyGraph(graphInput);

    // 6. Compute signals
    // Prepare fileMeta (simplified – depth, loc, exportCount not yet computed)
    // For MVP we can pass empty meta; signals that depend on meta will be omitted.
    const fileMeta: Record<string, { depth: number; loc?: number; exportCount?: number }> = {};
    for (const file of files) {
        fileMeta[file] = { depth: 0 };
    }

    const signalsInput: ComputeSignalsInput = {
        files,
        graph,
        parseResults: parsed,
        semanticProfile: profile.semanticProfile,
        fileMeta,
        budgets: opts.fullSignals ? {
            entrypointsTopN: Infinity,
            publicApiTopN: Infinity,
            hubsTopN: Infinity,
            inlinePerFileMax: Infinity,
        } : {
            entrypointsTopN: profile.signalBudget.navigationSignals,
            publicApiTopN: profile.signalBudget.navigationSignals,
            hubsTopN: profile.signalBudget.navigationSignals,
            inlinePerFileMax: profile.signalBudget.structuralRisks,
        },
        thresholds: {
            bigLoc: profile.thresholds.bigLoc,
            godFanIn: profile.thresholds.godModuleFanIn,
            deepPath: profile.thresholds.deepPath,
            barrelExports: profile.thresholds.barrelHellExports,
        },
    };
    const signals: SignalsResult = computeSignals(signalsInput);
    warnings.push(...signals.warnings);

    // 7. Render markdown
    const renderInput: RenderInput = {
        tree: scanResult.root,
        signals,
        graph,
        parseResults: parsed,
    };
    // If a focusFile was requested, validate it exists in the graph (repo-local)
    if (opts.focusFile) {
        const norm = stablePathNormalize(opts.focusFile);
        let existsInGraph = false;
        if (graph && graph.nodes) {
            if (graph.nodes instanceof Map) {
                existsInGraph = graph.nodes.has(norm);
            } else if (typeof graph.nodes === 'object') {
                existsInGraph = Object.prototype.hasOwnProperty.call(graph.nodes, norm);
            }
        }
        if (!existsInGraph) {
            throw new Error(`Error: --focus-file not found: ${norm}`);
        }
    }
    const renderOptions: RenderOptions = {
        focus: opts.focus,
        focusFile: opts.focusFile,
        focusDepth: opts.focusDepth,
        budget: opts.budget,
        depth: opts.depth,
        profile: profile.id,
        fullSignals: opts.fullSignals,
        showOrphans: opts.showOrphans,
        showTemp: opts.showTemp,
        collapse: true,
    };
    const renderOutput = renderArchitectureMd(renderInput, renderOptions);

    // Collect all warnings (deduplicate? keep as is)
    const allWarnings = Array.from(new Set(warnings)).sort();

    return {
        markdown: renderOutput.content,
        warnings: allWarnings,
    };
}