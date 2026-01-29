import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import type { RenderInput } from '../src/render/types.js';

describe('render_focus_not_found', () => {
  const mockInput: RenderInput = {
    tree: {
      kind: 'dir',
      name: '',
      relPath: '',
      children: [
        {
          kind: 'dir',
          name: 'src',
          relPath: 'src',
          children: [
            {
              kind: 'file',
              name: 'index.ts',
              relPath: 'src/index.ts',
              ext: 'ts',
            },
          ],
        },
      ],
    },
    signals: {
      files: [],
      entrypoints: [],
      publicApi: [],
      hubsFanIn: [],
      hubsFanOut: [],
      warnings: [],
    },
    graph: {
      nodes: new Map(),
      cycles: [],
    },
  };

  it('returns empty tree when focus path does not exist', () => {
    const result = renderArchitectureMd(mockInput, { focus: 'nonexistent/path' });
    // The tree section should be empty (no lines between ``` and ```)
    expect(result.content).toContain('```');
    // After the opening backticks there should be nothing (or maybe placeholder).
    // Our current implementation returns empty string for tree, resulting in empty code block.
    const treeBlock = result.content.match(/```\n([\s\S]*?)\n```/);
    expect(treeBlock?.[1].trim()).toBe('');
  });

  it('still includes preamble and summary blocks', () => {
    const result = renderArchitectureMd(mockInput, { focus: 'nonexistent' });
    expect(result.content).toContain('## AI Preamble');
    expect(result.content).toContain('## Entrypoints & Public Surface');
    expect(result.content).toContain('## Graph Hubs');
  });
});