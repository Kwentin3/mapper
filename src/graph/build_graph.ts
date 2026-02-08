/**
 * Builds a deterministic dependency graph from parsed import edges.
 */

import type { BuildGraphInput, DependencyGraph, GraphNode } from './types.js';
import { stableStringCompare } from '../utils/determinism.js';

/**
 * Build a dependency graph from parsed files and a resolver.
 */
export function buildDependencyGraph(input: BuildGraphInput): DependencyGraph {
    const { files, parsed, resolve } = input;

    // Map from file id to its graph node
    const nodes = new Map<string, GraphNode>();

    // Initialize nodes for all internal files
    for (const file of files) {
        nodes.set(file, {
            id: file,
            outgoing: new Set<string>(),
            incoming: new Set<string>(),
            externals: new Set<string>(),
        });
    }

    // Process each parsed file
    for (const parseResult of parsed) {
        const from = parseResult.file;
        const fromNode = nodes.get(from);
        if (!fromNode) {
            // Should not happen because we created nodes for all files
            continue;
        }

        for (const edge of parseResult.edges) {
            // Type-only imports/exports are a compile-time concern and should not
            // contribute to the runtime dependency graph (and hub metrics).
            if (edge.isTypeOnly) {
                continue;
            }
            const resolved = resolve(from, edge.specifier);
            switch (resolved.kind) {
                case 'internal': {
                    const target = resolved.path;
                    if (nodes.has(target)) {
                        // Add edge from -> target
                        fromNode.outgoing.add(target);
                        const targetNode = nodes.get(target);
                        if (targetNode) {
                            targetNode.incoming.add(from);
                        }
                    }
                    break;
                }
                case 'external': {
                    // Record external dependency
                    fromNode.externals.add(resolved.path);
                    break;
                }
                case 'unresolved':
                    // Ignore, no edge
                    break;
                case 'alias':
                    // Treat as internal? According to resolver, alias is a kind of internal.
                    // The resolved.path is the actual file path.
                    if (nodes.has(resolved.path)) {
                        fromNode.outgoing.add(resolved.path);
                        const targetNode = nodes.get(resolved.path);
                        if (targetNode) {
                            targetNode.incoming.add(from);
                        }
                    }
                    break;
            }
        }
    }

    // Detect cycles using Tarjan's algorithm on internal nodes only
    const cycles = findCycles(nodes);

    return { nodes, cycles };
}

/**
 * Tarjan's strongly connected components algorithm.
 * Returns a list of cycles (SCCs with size > 1, or self‑imports).
 * Each cycle is normalized to start with its smallest node id,
 * and the list of cycles is sorted lexicographically.
 */
function findCycles(nodes: Map<string, GraphNode>): string[][] {
    const indexMap = new Map<string, number>();
    const lowLinkMap = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    const sccs: string[][] = [];
    let index = 0;

    const visit = (v: string) => {
        indexMap.set(v, index);
        lowLinkMap.set(v, index);
        index++;
        stack.push(v);
        onStack.add(v);

        const node = nodes.get(v);
        if (!node) return;

        for (const w of node.outgoing) {
            if (!nodes.has(w)) continue; // skip external edges
            if (!indexMap.has(w)) {
                visit(w);
                lowLinkMap.set(v, Math.min(lowLinkMap.get(v)!, lowLinkMap.get(w)!));
            } else if (onStack.has(w)) {
                lowLinkMap.set(v, Math.min(lowLinkMap.get(v)!, indexMap.get(w)!));
            }
        }

        if (lowLinkMap.get(v) === indexMap.get(v)) {
            const scc: string[] = [];
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                scc.push(w);
            } while (w !== v);
            sccs.push(scc);
        }
    };

    // Process nodes in deterministic order (sorted by id)
    const sortedIds = Array.from(nodes.keys()).sort(stableStringCompare);
    for (const id of sortedIds) {
        if (!indexMap.has(id)) {
            visit(id);
        }
    }

    // Filter SCCs that are cycles (size > 1) or self‑imports (size === 1 with self‑edge)
    const cycles: string[][] = [];
    for (const scc of sccs) {
        if (scc.length > 1) {
            // Multi‑node cycle
            cycles.push(buildCycleFromSCC(scc, nodes));
        } else if (scc.length === 1) {
            const v = scc[0];
            const node = nodes.get(v);
            // Self‑import if node.outgoing contains v
            if (node && node.outgoing.has(v)) {
                cycles.push([v]);
            }
        }
    }

    // Sort cycles lexicographically
    cycles.sort((a, b) => {
        const aStr = a.join(',');
        const bStr = b.join(',');
        return stableStringCompare(aStr, bStr);
    });

    return cycles;
}

/**
 * Build a directed cycle from a strongly connected component.
 * Assumes the SCC forms a single simple cycle (each node has exactly one outgoing edge to another node in the SCC).
 * Returns the cycle starting with the smallest node id and following the direction of edges.
 */
function buildCycleFromSCC(scc: string[], nodes: Map<string, GraphNode>): string[] {
    const sccSet = new Set(scc);
    // Map each node to its outgoing edge(s) that stay inside the SCC.
    const outgoing = new Map<string, string[]>();
    for (const v of scc) {
        const node = nodes.get(v)!;
        const targets = Array.from(node.outgoing).filter(w => sccSet.has(w));
        // Sort for determinism
        targets.sort(stableStringCompare);
        outgoing.set(v, targets);
    }

    // Choose start node as the smallest id (deterministic)
    const start = scc.reduce((min, cur) => stableStringCompare(cur, min) < 0 ? cur : min);
    const visited = new Set<string>();
    const cycle: string[] = [];
    let current = start;
    while (!visited.has(current)) {
        visited.add(current);
        cycle.push(current);
        const targets = outgoing.get(current);
        if (!targets || targets.length === 0) {
            // No outgoing edge inside SCC – should not happen for a proper cycle.
            // Fallback: treat SCC as a set without order.
            break;
        }
        // Follow the first outgoing edge (deterministic because targets are sorted)
        const next = targets[0];
        // Prevent infinite loop if edge leads back to a node already in cycle (except start).
        if (next === start && visited.size === scc.length) {
            // We have completed the cycle
            cycle.push(next);
            break;
        }
        current = next;
    }

    // If the cycle does not include all nodes, something is wrong; fallback to sorted SCC.
    if (cycle.length !== scc.length + 1) { // +1 because we duplicate start at the end
        // Return SCC sorted (old behavior)
        return scc.sort(stableStringCompare);
    }

    // Remove the duplicate start at the end if present (we added it)
    if (cycle.length > 1 && cycle[0] === cycle[cycle.length - 1]) {
        cycle.pop();
    }
    return cycle;
}
