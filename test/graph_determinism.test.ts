import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';
import { stableJsonStringify } from '../src/utils/determinism.js';

/**
 * Convert a graph to a deterministic JSON‑serializable object.
 * This allows us to compare two graphs for equality regardless of
 * internal ordering of Sets/Map entries.
 */
function graphToStableObject(graph: ReturnType<typeof buildDependencyGraph>) {
    const nodes: Record<string, any> = {};
    // Iterate over node IDs in sorted order
    const sortedIds = Array.from(graph.nodes.keys()).sort();
    for (const id of sortedIds) {
        const node = graph.nodes.get(id)!;
        nodes[id] = {
            outgoing: Array.from(node.outgoing).sort(),
            incoming: Array.from(node.incoming).sort(),
            externals: Array.from(node.externals).sort(),
        };
    }
    // Cycles are already normalized and sorted by the algorithm
    const cycles = graph.cycles.map(cycle => [...cycle]); // ensure each cycle is an array
    return { nodes, cycles };
}

describe('graph_determinism', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('produces identical graph regardless of file order', () => {
        // Mock resolver that maps specifiers to known paths
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                const map: Record<string, string> = {
                    './b': 'src/b.ts',
                    './c': 'src/c.ts',
                    './d': 'src/d.ts',
                };
                const path = map[spec];
                if (path) {
                    return { kind: 'internal' as const, path, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        // Input with one order
        const input1: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: './c', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/b.ts', edges: [], warnings: [] },
                { file: 'src/c.ts', edges: [], warnings: [] },
                { file: 'src/d.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        // Same input but files and parsed arrays shuffled
        const input2: BuildGraphInput = {
            files: ['src/d.ts', 'src/c.ts', 'src/b.ts', 'src/a.ts'],
            parsed: [
                { file: 'src/d.ts', edges: [], warnings: [] },
                { file: 'src/c.ts', edges: [], warnings: [] },
                { file: 'src/b.ts', edges: [], warnings: [] },
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: './c', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph1 = buildDependencyGraph(input1);
        const graph2 = buildDependencyGraph(input2);

        const stable1 = graphToStableObject(graph1);
        const stable2 = graphToStableObject(graph2);

        expect(stableJsonStringify(stable1)).toBe(stableJsonStringify(stable2));
    });

    it('normalizes cycles to a canonical form', () => {
        // A cycle A → B → C → A can be represented starting at any node.
        // Our algorithm should always produce the same normalized cycle.
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                const map: Record<string, string> = {
                    './b': 'src/b.ts',
                    './c': 'src/c.ts',
                    './a': 'src/a.ts',
                };
                const path = map[spec];
                if (path) {
                    return { kind: 'internal' as const, path, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        // Three possible edge orders that still form the same cycle
        const inputs: BuildGraphInput[] = [
            {
                files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
                parsed: [
                    { file: 'src/a.ts', edges: [{ from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false }], warnings: [] },
                    { file: 'src/b.ts', edges: [{ from: 'src/b.ts', specifier: './c', kind: 'import', isTypeOnly: false }], warnings: [] },
                    { file: 'src/c.ts', edges: [{ from: 'src/c.ts', specifier: './a', kind: 'import', isTypeOnly: false }], warnings: [] },
                ],
                resolve,
            },
            {
                files: ['src/c.ts', 'src/a.ts', 'src/b.ts'],
                parsed: [
                    { file: 'src/c.ts', edges: [{ from: 'src/c.ts', specifier: './a', kind: 'import', isTypeOnly: false }], warnings: [] },
                    { file: 'src/a.ts', edges: [{ from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false }], warnings: [] },
                    { file: 'src/b.ts', edges: [{ from: 'src/b.ts', specifier: './c', kind: 'import', isTypeOnly: false }], warnings: [] },
                ],
                resolve,
            },
        ];

        const cycles = inputs.map(input => buildDependencyGraph(input).cycles);
        // All should have exactly one cycle
        cycles.forEach(c => expect(c).toHaveLength(1));
        // All cycles should be identical
        const first = cycles[0][0].join(',');
        for (let i = 1; i < cycles.length; i++) {
            expect(cycles[i][0].join(',')).toBe(first);
        }
        // The cycle should start with the smallest node id (src/a.ts)
        expect(cycles[0][0]).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    });

    it('sorts cycles lexicographically', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // all specifiers resolve to the same file (self import)
                if (spec === './self') {
                    return { kind: 'internal' as const, path: from, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/z.ts', 'src/a.ts', 'src/m.ts'],
            parsed: [
                { file: 'src/z.ts', edges: [{ from: 'src/z.ts', specifier: './self', kind: 'import', isTypeOnly: false }], warnings: [] },
                { file: 'src/a.ts', edges: [{ from: 'src/a.ts', specifier: './self', kind: 'import', isTypeOnly: false }], warnings: [] },
                { file: 'src/m.ts', edges: [{ from: 'src/m.ts', specifier: './self', kind: 'import', isTypeOnly: false }], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);
        // Should have three cycles (self‑imports)
        expect(graph.cycles).toHaveLength(3);
        // Cycles should be sorted lexicographically by their only element
        const ids = graph.cycles.map(c => c[0]);
        expect(ids).toEqual(['src/a.ts', 'src/m.ts', 'src/z.ts']);
    });

    it('handles external dependencies deterministically', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                if (spec.startsWith('external')) {
                    return { kind: 'external' as const, path: spec, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input1: BuildGraphInput = {
            files: ['src/a.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: 'external2', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: 'external1', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const input2: BuildGraphInput = {
            files: ['src/a.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: 'external1', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: 'external2', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph1 = buildDependencyGraph(input1);
        const graph2 = buildDependencyGraph(input2);

        const node1 = graph1.nodes.get('src/a.ts')!;
        const node2 = graph2.nodes.get('src/a.ts')!;
        // externals set should be the same regardless of edge order
        expect(Array.from(node1.externals).sort()).toEqual(['external1', 'external2']);
        expect(Array.from(node2.externals).sort()).toEqual(['external1', 'external2']);
    });
});