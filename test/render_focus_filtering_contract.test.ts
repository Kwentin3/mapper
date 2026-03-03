import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import type { RenderInput } from '../src/render/types.js';

describe('render focus filtering contract', () => {
    const tree = {
        kind: 'dir' as const,
        name: '',
        relPath: '',
        children: [
            {
                kind: 'dir' as const,
                name: 'src',
                relPath: 'src',
                children: [
                    { kind: 'file' as const, name: 'a.ts', relPath: 'src/a.ts', ext: 'ts' },
                    { kind: 'file' as const, name: 'b.ts', relPath: 'src/b.ts', ext: 'ts' },
                    {
                        kind: 'dir' as const,
                        name: 'c',
                        relPath: 'src/c',
                        children: [
                            { kind: 'file' as const, name: 'c1.ts', relPath: 'src/c/c1.ts', ext: 'ts' },
                            {
                                kind: 'dir' as const,
                                name: 'deep',
                                relPath: 'src/c/deep',
                                children: [
                                    { kind: 'file' as const, name: 'd.ts', relPath: 'src/c/deep/d.ts', ext: 'ts' },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                kind: 'dir' as const,
                name: 'docs',
                relPath: 'docs',
                children: [
                    { kind: 'file' as const, name: 'readme.md', relPath: 'docs/readme.md', ext: 'md' },
                ],
            },
        ],
    };

    const input: RenderInput = {
        tree,
        signals: { files: [], entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
        graph: { nodes: new Map(), cycles: [] },
    };

    it('focus on file keeps ancestors, file siblings, and hides unrelated branches', () => {
        const output = renderTree(input, { focus: 'src/b.ts', collapse: false });
        expect(output).toContain('src');
        expect(output).toContain('a.ts');
        expect(output).toContain('b.ts');
        expect(output).toContain('c');
        expect(output).not.toContain('docs');
        expect(output).not.toContain('c1.ts');
        expect(output).not.toContain('d.ts');
    });

    it('focus on directory keeps direct children but not deeper descendants', () => {
        const output = renderTree(input, { focus: 'src/c', collapse: false });
        expect(output).toContain('src');
        expect(output).toContain('a.ts');
        expect(output).toContain('b.ts');
        expect(output).toContain('c');
        expect(output).toContain('c1.ts');
        expect(output).toContain('deep');
        expect(output).not.toContain('docs');
        expect(output).not.toContain('d.ts');
    });
});
