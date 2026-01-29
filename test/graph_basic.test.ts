import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';

describe('graph_basic', () => {
    afterEach(() => {
        // restore any mocked functions
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('creates nodes for all internal files', () => {
        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
            parsed: [
                { file: 'src/a.ts', edges: [], warnings: [] },
                { file: 'src/b.ts', edges: [], warnings: [] },
                { file: 'src/c.ts', edges: [], warnings: [] },
            ],
            resolve: vi.fn().mockReturnValue({ kind: 'unresolved', path: '', original: '' }),
        };

        const graph = buildDependencyGraph(input);

        expect(graph.nodes.size).toBe(3);
        expect(graph.nodes.has('src/a.ts')).toBe(true);
        expect(graph.nodes.has('src/b.ts')).toBe(true);
        expect(graph.nodes.has('src/c.ts')).toBe(true);

        const nodeA = graph.nodes.get('src/a.ts')!;
        expect(nodeA.outgoing.size).toBe(0);
        expect(nodeA.incoming.size).toBe(0);
        expect(nodeA.externals.size).toBe(0);
    });

    it('adds internal edges', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // simple mapping
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
                        { from: 'src/a.ts', specifier: './c', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/b.ts', edges: [], warnings: [] },
                { file: 'src/c.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;
        const nodeC = graph.nodes.get('src/c.ts')!;

        // outgoing from A
        expect(Array.from(nodeA.outgoing).sort()).toEqual(['src/b.ts', 'src/c.ts']);
        // incoming to B and C
        expect(Array.from(nodeB.incoming).sort()).toEqual(['src/a.ts']);
        expect(Array.from(nodeC.incoming).sort()).toEqual(['src/a.ts']);

        // no externals
        expect(nodeA.externals.size).toBe(0);
        expect(nodeB.externals.size).toBe(0);
        expect(nodeC.externals.size).toBe(0);

        // cycles should be empty
        expect(graph.cycles).toEqual([]);
    });

    it('computes fan-in and fan-out correctly', () => {
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

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
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
                        { from: 'src/b.ts', specifier: './d', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/c.ts', edges: [], warnings: [] },
                { file: 'src/d.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;
        const nodeC = graph.nodes.get('src/c.ts')!;
        const nodeD = graph.nodes.get('src/d.ts')!;

        expect(nodeA.outgoing.size).toBe(1);
        expect(nodeA.incoming.size).toBe(0);
        expect(nodeB.outgoing.size).toBe(2);
        expect(nodeB.incoming.size).toBe(1);
        expect(nodeC.outgoing.size).toBe(0);
        expect(nodeC.incoming.size).toBe(1);
        expect(nodeD.outgoing.size).toBe(0);
        expect(nodeD.incoming.size).toBe(1);

        // edges
        expect(Array.from(nodeA.outgoing)).toEqual(['src/b.ts']);
        expect(Array.from(nodeB.outgoing).sort()).toEqual(['src/c.ts', 'src/d.ts']);
        expect(Array.from(nodeC.incoming)).toEqual(['src/b.ts']);
        expect(Array.from(nodeD.incoming)).toEqual(['src/b.ts']);
    });
});