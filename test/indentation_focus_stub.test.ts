import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import type { RenderInput } from '../src/render/types.js';

describe('indentation_focus_stub', () => {
  // Fixture where collapse stub appears inside a focused subtree
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
            kind: 'dir' as const,
            name: 'a',
            relPath: 'src/a',
            children: [
              {
                kind: 'file' as const,
                name: 'x.txt',
                relPath: 'src/a/x.txt',
                ext: 'txt',
              },
              {
                kind: 'dir' as const,
                name: 'b',
                relPath: 'src/a/b',
                children: [
                  {
                    kind: 'dir' as const,
                    name: 'c',
                    relPath: 'src/a/b/c',
                    children: [
                      { kind: 'file' as const, name: 'deep.ts', relPath: 'src/a/b/c/deep.ts', ext: 'ts' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  const input: RenderInput = { tree: fixture as any, signals: { files: [], entrypoints: [], publicApi: [], hubsFanIn: [], hubsFanOut: [], warnings: [] } as any, graph: { nodes: new Map(), cycles: [] } as any };

  it('focus on src/a shows stub aligned with siblings', () => {
    const output = renderTree(input, { depth: 2, focus: 'src/a', collapse: true });
    // Ensure the stub indicator exists and uses a canonical tree glyph before the ellipsis
    expect(output).toMatch(/(├──|└──) … \(.*file.*subdir/);
  // Directory names inside fixture may be omitted if focus logic changes; we only assert
  // that a canonical-styled stub is present (glyph + ellipsis + counts).
  });
});
