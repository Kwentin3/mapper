import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('render tree [HUB] tag (render-only)', () => {
  it('tags hub files in Project Tree and only them; deterministic across runs', async () => {
    // Create an OS temp repo dir (tests must not write to repo root)
    const repo = createTempRepoDir('render_tree_hub_tag');
  await fs.mkdir(join(repo, 'src', 'utils'), { recursive: true });
  // Create a top-level file so the root directory is not considered a "boring" chain
  await fs.writeFile(join(repo, 'README.md'), `# repo\n`);

    // Create files on disk (not strictly required for renderTree which uses relPath strings,
    // but create them to satisfy the "OS temp dir" requirement and ensure no repo-root writes)
    await fs.writeFile(join(repo, 'src', 'index.ts'), `// index\n`);
    await fs.writeFile(join(repo, 'src', 'utils', 'determinism.ts'), `// determinism\n`);

    // Build an in-memory tree matching the repo structure
    const mockTree = {
      kind: 'dir' as const,
      name: '',
      relPath: '',
      children: [
        {
          kind: 'file' as const,
          name: 'README.md',
          relPath: 'README.md',
          ext: 'md',
        },
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
      ],
    };

    // Signals: mark determinism.ts as a hub in hubsFanIn
    const mockSignals = {
      files: [],
      entrypoints: [],
      publicApi: [],
      hubsFanIn: [ { file: 'src/utils/determinism.ts', reason: 'fan-in 5', score: 5 } ],
      hubsFanOut: [],
      warnings: [],
    };

    const mockGraph = { nodes: new Map(), cycles: [] } as any;

    const input = { tree: mockTree, signals: mockSignals, graph: mockGraph } as any;

    // Baseline (budgeted) render twice to assert determinism
    const out1 = renderTree(input, { fullSignals: false });
    const out2 = renderTree(input, { fullSignals: false });
    expect(out1).toBe(out2);

    // Full-signals should behave the same w.r.t. [HUB] tagging
    const f1 = renderTree(input, { fullSignals: true });
    const f2 = renderTree(input, { fullSignals: true });
    expect(f1).toBe(f2);

    // Assert hub tag only on determinism.ts
    expect(out1).toContain('determinism.ts [HUB]');
    expect(out1).not.toContain('index.ts [HUB]');

    expect(f1).toContain('determinism.ts [HUB]');
    expect(f1).not.toContain('index.ts [HUB]');

    // Cleanup
    await fs.rm(repo, { recursive: true, force: true });
  });
});
