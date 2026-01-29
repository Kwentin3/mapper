import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildDependencyGraph } from '../src/graph/build_graph.js';
import type { BuildGraphInput } from '../src/graph/types.js';

describe('graph_external', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('adds external dependencies to externals set', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                if (spec === 'lodash') {
                    return { kind: 'external' as const, path: 'node_modules/lodash/index.js', original: spec };
                }
                if (spec === 'react') {
                    return { kind: 'external' as const, path: 'node_modules/react/index.js', original: spec };
                }
                return { kind: 'unresolved' as const, path: '', original: spec };
            });

        const input: BuildGraphInput = {
            files: ['src/a.ts', 'src/b.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: 'lodash', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: 'react', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/b.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;

        // externals should contain the resolved paths (or original specifiers?)
        // According to our implementation, we add resolved.path
        expect(Array.from(nodeA.externals).sort()).toEqual([
            'node_modules/lodash/index.js',
            'node_modules/react/index.js',
        ]);
        expect(nodeA.outgoing.size).toBe(0);
        expect(nodeA.incoming.size).toBe(0);
        expect(nodeB.externals.size).toBe(0);
    });

    it('ignores unresolved specifiers', () => {
        const resolve = vi.fn()
            .mockImplementation(() => ({
                kind: 'unresolved' as const,
                path: '',
                original: '',
            }));

        const input: BuildGraphInput = {
            files: ['src/a.ts'],
            parsed: [
                {
                    file: 'src/a.ts',
                    edges: [
                        { from: 'src/a.ts', specifier: './missing', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: 'unknown-package', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        expect(nodeA.externals.size).toBe(0);
        expect(nodeA.outgoing.size).toBe(0);
        expect(nodeA.incoming.size).toBe(0);
    });

    it('handles mix of internal, external, and unresolved', () => {
        const resolve = vi.fn()
            .mockImplementation((from: string, spec: string) => {
                if (spec === './b') {
                    return { kind: 'internal' as const, path: 'src/b.ts', original: spec };
                }
                if (spec === 'lodash') {
                    return { kind: 'external' as const, path: 'node_modules/lodash', original: spec };
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
                        { from: 'src/a.ts', specifier: 'lodash', kind: 'import', isTypeOnly: false },
                        { from: 'src/a.ts', specifier: './missing', kind: 'import', isTypeOnly: false },
                    ],
                    warnings: [],
                },
                { file: 'src/b.ts', edges: [], warnings: [] },
            ],
            resolve,
        };

        const graph = buildDependencyGraph(input);

        const nodeA = graph.nodes.get('src/a.ts')!;
        const nodeB = graph.nodes.get('src/b.ts')!;

        expect(Array.from(nodeA.outgoing)).toEqual(['src/b.ts']);
        expect(Array.from(nodeA.externals)).toEqual(['node_modules/lodash']);
        expect(Array.from(nodeB.incoming)).toEqual(['src/a.ts']);
        expect(nodeB.externals.size).toBe(0);
        expect(nodeB.outgoing.size).toBe(0);
    });
});