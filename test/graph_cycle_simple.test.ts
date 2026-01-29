import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';

describe('graph_cycle_simple', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('detects a 2‑node cycle (A → B → A)', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // A imports B, B imports A
                if (from === 'src/a.ts' && spec === './b') {
                    return { kind: 'internal' as const, path: 'src/b.ts', original: spec };
                }
                if (from === 'src/b.ts' && spec === './a') {
                    return { kind: 'internal' as const, path: 'src/a.ts', original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/b.ts',
                    edges: [
                        { from: 'src/b.ts', specifier: './a', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        // Expect one cycle
        expect(graph.cycles).toHaveLength(1);
        const cycle = graph.cycles[0];
        // Cycle should be normalized to start with smallest node id (src/a.ts < src/b.ts)
        expect(cycle).toEqual(['src/a.ts', 'src/b.ts']);
        // Ensure edges exist
        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;
        expect(nodeA.outgoing.has('src/b.ts')).toBe(true);
        expect(nodeB.outgoing.has('src/a.ts')).toBe(true);
    });

    it('detects a 3‑node cycle (A → B → C → A)', () => {
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

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/b.ts',
                    edges: [
                        { from: 'src/b.ts', specifier: './c', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/c.ts',
                    edges: [
                        { from: 'src/c.ts', specifier: './a', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        expect(graph.cycles).toHaveLength(1);
        const cycle = graph.cycles[0];
        // Smallest node id is src/a.ts, then src/b.ts, then src/c.ts
        expect(cycle).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    });

    it('normalizes cycles to start with smallest node id', () => {
        // Create a cycle C -> A -> B -> C (where smallest is A)
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                const map: Record<string, string> = {
                    './a': 'src/a.ts',
                    './b': 'src/b.ts',
                    './c': 'src/c.ts',
                };
                const path = map[spec];
                if (path) {
                    return { kind: 'internal' as const, path, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
            parsed: [
                {
                    file: 'src/c.ts',
                    edges: [
                        { from: 'src/c.ts', specifier: './a', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './b', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/b.ts',
                    edges: [
                        { from: 'src/b.ts', specifier: './c', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        expect(graph.cycles).toHaveLength(1);
        const cycle = graph.cycles[0];
        // Regardless of edge order, cycle should start with smallest id (src/a.ts)
        expect(cycle).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    });

    it('returns empty cycles when there are none', () => {
        const resolve = vi.fn()
            .mockImplementation(() => ({ kind: 'unresolved' as const, path: '', original: '' }));

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts'],
            parsed: [
                { file: 'src/a.ts', edges: [], warnings: [] },
                { file: 'src/b.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);
        expect(graph.cycles).toEqual([]);
    });
});