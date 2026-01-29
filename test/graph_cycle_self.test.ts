import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';

describe('graph_cycle_self', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('detects a self‑import (cycle of length 1)', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // self import: specifier './a' resolves to same file
                if (spec === './a') {
                    return { kind: 'internal' as const, path: 'src/a.ts', original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './a', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        expect(graph.cycles).toHaveLength(1);
        const cycle = graph.cycles[0];
        expect(cycle).toEqual(['src/a.ts']);
        // Edge should be present
        const node = graph.nodes.get('src/a.ts')!;
        expect(node.outgoing.has('src/a.ts')).toBe(true);
        expect(node.incoming.has('src/a.ts')).toBe(true);
    });

    it('does not treat external dependencies as self‑import', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // external dependency, not internal
                return { kind: 'external' as const, path: 'lodash', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: 'lodash', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        // No cycles because edge is external, not internal
        expect(graph.cycles).toEqual([]);
        const node = graph.nodes.get('src/a.ts')!;
        expect(node.outgoing.size).toBe(0);
        expect(node.externals.has('lodash')).toBe(true);
    });

    it('handles multiple nodes with self‑imports', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                // each file imports itself
                if (spec === './self') {
                    return { kind: 'internal' as const, path: from, original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './self', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/b.ts',
                    edges: [
                        { from: 'src/b.ts', specifier: './self', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                {
                    file: 'src/c.ts',
                    edges: [
                        { from: 'src/c.ts', specifier: './self', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        // Should have three cycles (one per node)
        expect(graph.cycles).toHaveLength(3);
        // Cycles should be sorted lexicographically
        const cycles = graph.cycles.map(c => c[0]).sort();
        expect(cycles).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
        // Each node's outgoing includes itself
        for (const file of input.files) {
            const node = graph.nodes.get(file)!;
            expect(node.outgoing.has(file)).toBe(true);
            expect(node.incoming.has(file)).toBe(true);
        }
    });
});