import { describe, it, expect } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import { renderArchitectureMd } from '../src/render/index.js';
import { stableJsonStringify, stableStringCompare } from '../src/utils/determinism.js';
import type { BuildGraphInput } from '../src/graph/types.js';
import type { DependencyGraph } from '../src/graph/types.js';
import type { DirNode, FileNode } from '../src/scanner/types.js';
import type { SignalsResult } from '../src/signals/types.js';

/**
 * Convert internal DependencyGraph (with Map/Set) to a plain JS object
 * with deterministic ordering so it can be stably stringified.
 */
function graphToPlain(g: DependencyGraph) {
    const nodes: Record<string, any> = {};
    for (const [id, node] of Array.from(g.nodes.entries()).sort((a, b) => stableStringCompare(a[0], b[0]))) {
        nodes[id] = {
            incoming: Array.from(node.incoming).sort(stableStringCompare),
            outgoing: Array.from(node.outgoing).sort(stableStringCompare),
            externals: Array.from(node.externals).sort(stableStringCompare),
        };
    }
    // cycles should already be deterministic, but normalize each cycle for safety
    const cycles = g.cycles.map(c => Array.from(c).sort(stableStringCompare));
    cycles.sort((a, b) => stableStringCompare(a.join(','), b.join(',')));
    return { nodes, cycles };
}

describe('graph_immutability', () => {
    it('rendering should not mutate the core dependency graph', () => {
        // Build a small example graph using the same style as other tests
        const resolve = (_from: string, spec: string) => {
            const map: Record<string, string> = {
                './b': 'src/b.ts',
                './c': 'src/c.ts',
            };
            const path = map[spec];
            if (path) return { kind: 'internal' as const, path, original: spec };
            return { kind: 'unresolved' as const, path: '', original: spec };
        };

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
            parsed: [
                { file: 'src/a.ts', edges: [ { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false }, { from: 'src/a.ts', specifier: './c', kind: 'import', isTypeOnly: false } ], warnings: [] },
                { file: 'src/b.ts', edges: [], warnings: [] },
                { file: 'src/c.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const before = stableJsonStringify(graphToPlain(graph));

        // Create a minimal tree and signals expected by renderArchitectureMd
        const tree: DirNode = {
            kind: 'dir',
            name: '',
            relPath: '',
            children: [
                { kind: 'file', name: 'a.ts', relPath: 'src/a.ts', ext: 'ts' } as FileNode,
                { kind: 'file', name: 'b.ts', relPath: 'src/b.ts', ext: 'ts' } as FileNode,
                { kind: 'file', name: 'c.ts', relPath: 'src/c.ts', ext: 'ts' } as FileNode,
            ],
        };

        const signals: SignalsResult = {
            files: [
                { file: 'src/a.ts', inline: [] },
                { file: 'src/b.ts', inline: [] },
                { file: 'src/c.ts', inline: [] },
            ],
            entrypoints: [],
            publicApi: [],
            hubsFanIn: [],
            hubsFanOut: [],
            warnings: [],
        };

        // Call the renderer which should not mutate the graph
        const out = renderArchitectureMd({ tree, signals, graph }, { profile: 'default' });
        expect(typeof out.content).toBe('string');

        const after = stableJsonStringify(graphToPlain(graph));

        expect(after).toEqual(before);
    });
});
