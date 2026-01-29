import { describe, it, expect } from 'vitest';
import { renderTree } from '../src/render/render_tree.js';
import { fb } from './helpers/fixture_builder.js';

describe('depth_collapse_indicators', () => {
  it('shows collapse indicator with file/subdir count even when no risks (depth=2)', () => {
      // Root -> a -> b -> c -> file1.ts
      const fixture = fb().file('a/b/c/file1.ts');
      const input = fixture.buildRenderInput();

      // depth=2 means:
      // depth 0: root (skipped)
      // depth 1: a
      // depth 2: b
      // depth 3: c (stubbed)
      const output = renderTree(input, { depth: 2, collapse: false });
      
      // In current implementation, if the chain is a/b/c, a is at depth 1, b at depth 2.
      // The stub appears UNDER b.
      expect(output).toContain('… (1 file, 1 subdir)');
  });

  it('includes hidden risk count when risks exist in depth-limited subtree', () => {
      const fixture = fb()
          .file('src/feature/risky.ts')
          .file('src/feature/safe.ts')
          .signal('src/feature/risky.ts', '! CYCLE');

      const input = fixture.buildRenderInput();

      // depth=1 means:
      // depth 0: root (skipped)
      // depth 1: src
      // depth 2: feature (stubbed)
      const output = renderTree(input, { depth: 1, collapse: false });
      
      // feature has 2 files in its subtree
      // and 1 hidden risk
      expect(output).toContain('… (2 files, 1 subdir, (!) 1 signal hidden)');
  });

  it('is deterministic across runs', () => {
    const fixture = fb().file('a/b/f1.ts');
    const input = fixture.buildRenderInput();

    const output1 = renderTree(input, { depth: 1 });
    const output2 = renderTree(input, { depth: 1 });
    
    expect(output1).toBe(output2);
  });
});
