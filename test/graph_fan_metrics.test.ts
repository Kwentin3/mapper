import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';

describe('graph_fan_metrics', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('computes fan‑in and fan‑out for a simple chain', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                const map: Record<string, string> = {
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
                { file: 'src/c.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;
        const nodeC = graph.nodes.get('src/c.ts')!;

        expect(nodeA.outgoing.size).toBe(1); // A → B
        expect(nodeA.incoming.size).toBe(0);

        expect(nodeB.outgoing.size).toBe(1); // B → C
        expect(nodeB.incoming.size).toBe(1); // A → B

        expect(nodeC.outgoing.size).toBe(0);
        expect(nodeC.incoming.size).toBe(1); // B → C
    });

    it('computes fan‑in for a node imported by multiple others', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                if (spec === './common') {
                    return { kind: 'internal' as const, path: 'src/common.ts', original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/common.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './common', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/b.ts',
                    edges: [
                        { from: 'src/b.ts', specifier: './common', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/c.ts',
                    edges: [
                        { from: 'src/c.ts', specifier: './common', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/common.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const common = graph.nodes.get('src/common.ts')!;
        expect(common.incoming.size).toBe(3); // imported by A, B, C
        expect(common.outgoing.size).toBe(0);

        const nodeA = graph.nodes.get('src/a.ts')!;
        expect(nodeA.outgoing.size).toBe(1);
        expect(nodeA.incoming.size).toBe(0);
    });

    it('computes fan‑out for a node that imports multiple others', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                const map: Record<string, string> = {
                    './x': 'src/x.ts',
                    './y': 'src/y.ts',
                    './z': 'src/z.ts',
                };
                const path = map[spec];
                if (path) {
                    return { kind: 'internal' as const, path, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/entry.ts', 'src/x.ts', 'src/y.ts', 'src/z.ts'],
            parsed: [
                {
                    file: 'src/entry.ts',
                    edges: [
                        { from: 'src/entry.ts', specifier: './x', kind: 'import', isTypeOnly: false },
                        { from: 'src/entry.ts', specifier: './y', kind: 'import', isTypeOnly: false },
                        { from: 'src/entry.ts', specifier: './z', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/x.ts', edges: [], warnings: [] },
                { file: 'src/y.ts', edges: [], warnings: [] },
                { file: 'src/z.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const entry = graph.nodes.get('src/entry.ts')!;
        expect(entry.outgoing.size).toBe(3); // imports X, Y, Z
        expect(entry.incoming.size).toBe(0);

        const nodeX = graph.nodes.get('src/x.ts')!;
        expect(nodeX.incoming.size).toBe(1);
        expect(nodeX.outgoing.size).toBe(0);
    });

    it('ignores external dependencies for fan‑in/fan‑out', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                if (spec === './internal') {
                    return { kind: 'internal' as const, path: 'src/internal.ts', original: spec };
                }
                if (spec === 'lodash') {
                    return { kind: 'external' as const, path: 'node_modules/lodash', original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/internal.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './internal', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: 'lodash', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/internal.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        expect(nodeA.outgoing.size).toBe(1); // only internal edge
        expect(nodeA.externals.size).toBe(1); // external dependency

        const internal = graph.nodes.get('src/internal.ts')!;
        expect(internal.incoming.size).toBe(1);
        expect(internal.outgoing.size).toBe(0);
    });

    it('handles isolated nodes (no edges)', () => {
        const resolve = vi.fn()
            .mockImplementation(() => ({ kind: 'unresolved' as const, path: '', original: '' }));

        const input: BuildGraphInput = {
            files: ['src/alone.ts', 'src/isolated.ts'],
            parsed: [
                { file: 'src/alone.ts', edges: [], warnings: [] },
                { file: 'src/isolated.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const alone = graph.nodes.get('src/alone.ts')!;
        expect(alone.outgoing.size).toBe(0);
        expect(alone.incoming.size).toBe(0);
        expect(alone.externals.size).toBe(0);

        const isolated = graph.nodes.get('src/isolated.ts')!;
        expect(isolated.outgoing.size).toBe(0);
        expect(isolated.incoming.size).toBe(0);
        expect(isolated.externals.size).toBe(0);
    });
});