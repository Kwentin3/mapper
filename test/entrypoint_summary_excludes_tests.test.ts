import { describe, it, expect } from 'vitest';
import { rankEntrypoints } from '../src/signals/rank.js';
import type { SummaryItem } from '../src/signals/types.js';

describe('entrypoint summary excludes tests', () => {
  it('excludes test files from entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'test/setup.test.ts', reason: 'No incoming edges', score: 5 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
      { file: 'tests/integration.test.ts', reason: 'No incoming edges', score: 4 },
    ];

    const ranked = rankEntrypoints(items);

    // Only src/main.ts should remain
    expect(ranked).toHaveLength(1);
    expect(ranked[0].file).toBe('src/main.ts');
  });

  it('excludes docs files from entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'docs/README.md', reason: 'No incoming edges', score: 5 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
    ];

    const ranked = rankEntrypoints(items);

    // Only src/main.ts should remain
    expect(ranked).toHaveLength(1);
    expect(ranked[0].file).toBe('src/main.ts');
  });

  it('excludes spec files from entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'src/utils.spec.ts', reason: 'No incoming edges', score: 5 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
    ];

    const ranked = rankEntrypoints(items);

    // Only src/main.ts should remain
    expect(ranked).toHaveLength(1);
    expect(ranked[0].file).toBe('src/main.ts');
  });

  it('excludes examples and tmp files from entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'examples/demo.ts', reason: 'No incoming edges', score: 5 },
      { file: 'tmp/cache.js', reason: 'No incoming edges', score: 4 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
    ];

    const ranked = rankEntrypoints(items);

    // Only src/main.ts should remain
    expect(ranked).toHaveLength(1);
    expect(ranked[0].file).toBe('src/main.ts');
  });

  it('excludes dist files from entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'dist/bundle.js', reason: 'No incoming edges', score: 5 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
    ];

    const ranked = rankEntrypoints(items);

    // Only src/main.ts should remain
    expect(ranked).toHaveLength(1);
    expect(ranked[0].file).toBe('src/main.ts');
  });

  it('includes src files in entrypoint summary', () => {
    const items: SummaryItem[] = [
      { file: 'src/main.ts', reason: 'No incoming edges', score: 3 },
      { file: 'src/utils.ts', reason: 'No incoming edges', score: 2 },
      { file: 'src/index.ts', reason: 'No incoming edges', score: 4 },
    ];

    const ranked = rankEntrypoints(items);

    // All src files should remain
    expect(ranked).toHaveLength(3);
    expect(ranked.map(r => r.file)).toContain('src/main.ts');
    expect(ranked.map(r => r.file)).toContain('src/utils.ts');
    expect(ranked.map(r => r.file)).toContain('src/index.ts');
  });

  it('prioritizes src files over lib files', () => {
    const items: SummaryItem[] = [
      { file: 'lib/utils.js', reason: 'No incoming edges', score: 10 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 5 },
    ];

    const ranked = rankEntrypoints(items);

    // src/main.ts should come first due to higher priority
    expect(ranked[0].file).toBe('src/main.ts');
    expect(ranked[1].file).toBe('lib/utils.js');
  });

  it('prioritizes src files over packages/*/src files', () => {
    const items: SummaryItem[] = [
      { file: 'packages/pkg1/src/index.ts', reason: 'No incoming edges', score: 10 },
      { file: 'src/main.ts', reason: 'No incoming edges', score: 5 },
    ];

    const ranked = rankEntrypoints(items);

    // src/main.ts should come first due to higher priority
    expect(ranked[0].file).toBe('src/main.ts');
    expect(ranked[1].file).toBe('packages/pkg1/src/index.ts');
  });

  it('prioritizes packages/*/src files over lib files', () => {
    const items: SummaryItem[] = [
      { file: 'lib/utils.js', reason: 'No incoming edges', score: 10 },
      { file: 'packages/pkg1/src/index.ts', reason: 'No incoming edges', score: 5 },
    ];

    const ranked = rankEntrypoints(items);

    // packages/pkg1/src/index.ts should come first due to higher priority
    expect(ranked[0].file).toBe('packages/pkg1/src/index.ts');
    expect(ranked[1].file).toBe('lib/utils.js');
  });

  it('applies same priority within same pattern, sorts by score then path', () => {
    const items: SummaryItem[] = [
      { file: 'src/z.ts', reason: 'No incoming edges', score: 3 },
      { file: 'src/a.ts', reason: 'No incoming edges', score: 5 },
      { file: 'src/b.ts', reason: 'No incoming edges', score: 5 },
    ];

    const ranked = rankEntrypoints(items);

    // All have same priority (src/**), so sort by score then path
    expect(ranked[0].file).toBe('src/a.ts'); // score 5, a < b
    expect(ranked[1].file).toBe('src/b.ts'); // score 5
    expect(ranked[2].file).toBe('src/z.ts'); // score 3
  });

  it('handles empty list', () => {
    const items: SummaryItem[] = [];
    const ranked = rankEntrypoints(items);
    expect(ranked).toHaveLength(0);
  });

  it('handles all excluded files', () => {
    const items: SummaryItem[] = [
      { file: 'test/setup.test.ts', reason: 'No incoming edges', score: 5 },
      { file: 'docs/README.md', reason: 'No incoming edges', score: 4 },
      { file: 'examples/demo.ts', reason: 'No incoming edges', score: 3 },
    ];

    const ranked = rankEntrypoints(items);
    expect(ranked).toHaveLength(0);
  });
});
