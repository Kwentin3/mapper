import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import type { RenderInput } from '../src/render/types.js';

describe('indentation_contract', () => {
  // Deterministic fixture with depth >= 3 and a collapse stub at depth=2
  const fixture = {
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
            name: 'before.txt',
            relPath: 'src/before.txt',
            ext: 'txt',
          },
          {
            kind: 'dir' as const,
            name: 'deepdir',
            relPath: 'src/deepdir',
            children: [
              {
                kind: 'dir' as const,
                name: 'level2',
                relPath: 'src/deepdir/level2',
                children: [
                  {
                    kind: 'file' as const,
                    name: 'file.ts',
                    relPath: 'src/deepdir/level2/file.ts',
                    ext: 'ts',
                  },
                ],
              },
            ],
          },
          {
            kind: 'file' as const,
            name: 'after.txt',
            relPath: 'src/after.txt',
            ext: 'txt',
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

  const mockSignals = { files: [], entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] };
  const mockGraph = { nodes: new Map(), cycles: [] };

  const input: RenderInput = { tree: fixture, signals: mockSignals as any, graph: mockGraph as any };

  it('renders canonical prefixes and aligns collapse stubs exactly', () => {
    const output = renderTree(input, { depth: 2 });
    const expected = [
      '├── src',
      '│   ├── before.txt',
      '│   ├── deepdir',
      '│   │   └── … (1 file, 1 subdir)',
      '│   └── after.txt',
      '└── package.json',
    ].join('\n');

    expect(output).toBe(expected);
  });
});
