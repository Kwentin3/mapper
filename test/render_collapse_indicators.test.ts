import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import type { RenderInput } from '../src/render/types.js';
import type { DirNode, FileNode } from '../src/scanner/types.js';
import type { FileSignals } from '../src/signals/types.js';

function dir(name: string, relPath: string, children: (DirNode | FileNode)[]): DirNode {
  return { kind: 'dir', name, relPath, children };
}

function file(name: string, relPath: string, ext = 'ts'): FileNode {
  return { kind: 'file', name, relPath, ext };
}

const mockGraph = {
  nodes: new Map(),
  cycles: [],
};

describe('render_collapse_indicators', () => {
  it('shows file and subdir counts for collapsed directories', () => {
    // Create a boring chain: a/b/c with multiple files and subdirs
    const tree = dir('', '', [
      dir('a', 'a', [
        dir('b', 'a/b', [
          dir('c', 'a/b/c', [
            file('file1.ts', 'a/b/c/file1.ts'),
            file('file2.ts', 'a/b/c/file2.ts'),
            file('file3.ts', 'a/b/c/file3.ts'),
            dir('subdir1', 'a/b/c/subdir1', [
              file('subfile1.ts', 'a/b/c/subdir1/subfile1.ts'),
            ]),
            dir('subdir2', 'a/b/c/subdir2', [
              file('subfile2.ts', 'a/b/c/subdir2/subfile2.ts'),
            ]),
          ]),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [];
    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output = renderTree(input, { collapse: true });
    
    // The collapsed directories should show counts
    expect(output).toContain('(5 files, 5 subdirs)');
  });

  it('includes risk count when hidden signals exist', () => {
    // Create a boring chain with risks in the collapsed subtree
    const tree = dir('', '', [
      dir('legacy', 'legacy', [
        dir('old', 'legacy/old', [
          file('risk1.ts', 'legacy/old/risk1.ts'),
          file('risk2.ts', 'legacy/old/risk2.ts'),
          file('safe.ts', 'legacy/old/safe.ts'),
          dir('subdir', 'legacy/old/subdir', [
            file('risk3.ts', 'legacy/old/subdir/risk3.ts'),
          ]),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [
      { file: 'legacy/old/risk1.ts', inline: [{ kind: 'risk', code: 'CYCLE' }] },
      { file: 'legacy/old/risk2.ts', inline: [{ kind: 'risk', code: 'ORPHAN' }] },
      { file: 'legacy/old/subdir/risk3.ts', inline: [{ kind: 'risk', code: 'CYCLE' }] },
    ];

    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output = renderTree(input, { collapse: true });
    
    // Should show 4 files, 3 subdirs, and 3 hidden signals
    expect(output).toContain('(4 files, 3 subdirs, (!) 3 signals hidden)');
  });

  it('shows deterministic formatting', () => {
    const tree = dir('', '', [
      dir('parser', 'parser', [
        dir('core', 'parser/core', [
          file('parse.ts', 'parser/core/parse.ts'),
          file('tokenize.ts', 'parser/core/tokenize.ts'),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [];
    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output1 = renderTree(input, { collapse: true });
    const output2 = renderTree(input, { collapse: true });
    
    expect(output1).toBe(output2);
  });

  it('handles collapsed directories with only files', () => {
    const tree = dir('', '', [
      dir('utils', 'utils', [
        dir('helpers', 'utils/helpers', [
          file('helper1.ts', 'utils/helpers/helper1.ts'),
          file('helper2.ts', 'utils/helpers/helper2.ts'),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [];
    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output = renderTree(input, { collapse: true });
    
    // Should show 2 files, 2 subdirs
    expect(output).toContain('(2 files, 2 subdirs)');
  });

  it('handles collapsed directories with only subdirs', () => {
    const tree = dir('', '', [
      dir('packages', 'packages', [
        dir('pkg1', 'packages/pkg1', [
          dir('src', 'packages/pkg1/src', []),
        ]),
        dir('pkg2', 'packages/pkg2', [
          dir('src', 'packages/pkg2/src', []),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [];
    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output = renderTree(input, { collapse: true });
    
    // packages is collapsed, has 5 subdirs in total
    expect(output).toContain('(0 files, 5 subdirs)');
  });

  it('does not show risk count when no hidden signals exist', () => {
    const tree = dir('', '', [
      dir('src', 'src', [
        dir('lib', 'src/lib', [
          file('util.ts', 'src/lib/util.ts'),
          file('helper.ts', 'src/lib/helper.ts'),
        ]),
      ]),
    ]);

    const signals: FileSignals[] = [];
    const input: RenderInput = {
      tree,
      signals: { files: signals, entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };

    const output = renderTree(input, { collapse: true });
    
    // Should NOT contain "signals hidden"
    expect(output).not.toContain('signals hidden');
  });
});
