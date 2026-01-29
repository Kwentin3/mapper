/**
 * Graph types for dependency analysis.
 */

import type { ParseFileResult } from '../parser/types.js';
import type { ResolvedTarget } from '../resolver/types.js';

/**
 * A node in the dependency graph.
 */
export interface GraphNode {
    /** Unique identifier (relative POSIX path). */
    id: string;
    /** IDs of nodes that this node imports (outgoing edges). */
    outgoing: Set<string>;
    /** IDs of nodes that import this node (incoming edges). */
    incoming: Set<string>;
    /** IDs of external modules that this node depends on. */
    externals: Set<string>;
}

/**
 * A complete dependency graph.
 */
export interface DependencyGraph {
    /** Mapping from node ID to its graph node. */
    nodes: Map<string, GraphNode>;
    /** List of cycles, each cycle is an array of node IDs. */
    cycles: string[][];
}

/**
 * Input required to build the dependency graph.
 */
export interface BuildGraphInput {
    /** All internal file paths (relative POSIX). */
    files: string[];
    /** Parsed results for each file, in the same order as `files`. */
    parsed: ParseFileResult[];
    /**
     * Resolver function that, given a source file and a specifier,
     * returns a single resolved target.
     */
    resolve: (from: string, spec: string) => ResolvedTarget;
}