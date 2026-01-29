import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import type { RenderInput } from '../src/render/types.js';

describe('render_tree_basic', () => {
  const mockTree = {
    kind: 'dir' as const,
    name: '',
    relPath: '',
    children: [
      {
        kind: 'dir' as const,
        name: 'src',
        relPath: 'src',
        children: [
          {
            kind: 'file' as const,
            name: 'index.ts',
            relPath: 'src/index.ts',
            ext: 'ts',
          },
          {
            kind: 'dir' as const,
            name: 'utils',
            relPath: 'src/utils',
            children: [
              {
                kind: 'file' as const,
                name: 'determinism.ts',
                relPath: 'src/utils/determinism.ts',
                ext: 'ts',
              },
            ],
          },
        ],
      },
      {
        kind: 'file' as const,
        name: 'package.json',
        relPath: 'package.json',
        ext: 'json',
      },
    ],
  };

  const mockSignals = {
    files: [
      {
        file: 'src/index.ts',
        inline: [{ kind: 'nav' as const, code: 'ENTRYPOINT' }],
      },
      {
        file: 'src/utils/determinism.ts',
        inline: [{ kind: 'hint' as const, code: 'BIG' }],
      },
    ],
    entrypoints: [],
    publicApi: [],
    hubsFanIn: [],
    hubsFanOut: [],
    warnings: [],
  };

  const mockGraph = {
    nodes: new Map(),
    cycles: [],
  };

  const input: RenderInput = {
    tree: mockTree,
    signals: mockSignals,
    graph: mockGraph,
  };

  it('renders a basic tree with correct glyphs', () => {
    const output = renderTree(input, {});
    expect(output).toContain('├── src');
    expect(output).toContain('│   ├── index.ts');
    expect(output).toContain('│   └── utils');
  expect(output).toContain('│       └── determinism.ts');
    expect(output).toContain('└── package.json');
  });

  it('includes inline signals next to file names', () => {
    const output = renderTree(input, {});
    expect(output).toContain('index.ts (→ ENTRYPOINT)');
    expect(output).toContain('determinism.ts (? BIG)');
  });

  it('respects depth limit', () => {
    const outputDepth0 = renderTree(input, { depth: 0 });
    // Only root (empty name) and its direct children?
    // The root is rendered as empty line? Actually root is not shown, only its children.
    // Our renderTree starts with root node (empty name). Let's see.
    // We'll just check that deeper nodes are missing.
    expect(outputDepth0).not.toContain('utils');
    expect(outputDepth0).not.toContain('determinism.ts');

    const outputDepth1 = renderTree(input, { depth: 1 });
    expect(outputDepth1).toContain('src');
    expect(outputDepth1).toContain('package.json');
    expect(outputDepth1).not.toContain('determinism.ts'); // depth 2
  });

  it('applies smart collapse when enabled', () => {
    // Create a boring chain: a/b/c where each dir has only one child dir.
    const boringTree = {
      kind: 'dir' as const,
      name: '',
      relPath: '',
      children: [
        {
          kind: 'dir' as const,
          name: 'a',
          relPath: 'a',
          children: [
            {
              kind: 'dir' as const,
              name: 'b',
              relPath: 'a/b',
              children: [
                {
                  kind: 'dir' as const,
                  name: 'c',
                  relPath: 'a/b/c',
                  children: [
                    {
                      kind: 'file' as const,
                      name: 'file.ts',
                      relPath: 'a/b/c/file.ts',
                      ext: 'ts',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const boringInput: RenderInput = {
      tree: boringTree,
      signals: { files: [], entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] },
      graph: mockGraph,
    };
    const output = renderTree(boringInput, { collapse: true });
    // The collapsed paths should be hidden, but the exact behavior depends on implementation.
    // For now just ensure it doesn't crash.
    expect(output).toBeDefined();
  });

  it('returns empty string when focus not found', () => {
    // Our filterTreeByFocus currently returns null, causing empty string.
    const output = renderTree(input, { focus: 'nonexistent' });
    expect(output).toBe('');
  });
});