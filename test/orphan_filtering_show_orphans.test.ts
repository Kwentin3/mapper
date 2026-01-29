import { describe, it, expect } from 'vitest';
import { filterOrphanSignals } from '../src/signals/filter.js';
import type { FileSignals } from '../src/signals/types.js';

describe('orphan filtering with --show-orphans flag', () => {
  it('shows all ORPHAN signals when showOrphans is true', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'test/example.test.ts',
        inline: [
          { kind: 'context', code: 'ORPHAN' },
          { kind: 'hint', code: 'BIG' },
        ],
      },
      {
        file: 'docs/README.md',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'package.json',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'src/main.ts',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, true);

    // All files should keep their ORPHAN signals
    for (const file of filtered) {
      expect(file.inline.some(s => s.code === 'ORPHAN')).toBe(true);
    }
  });

  it('preserves all signals when showOrphans is true', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'test/example.test.ts',
        inline: [
          { kind: 'context', code: 'ORPHAN' },
          { kind: 'risk', code: 'CYCLE' },
          { kind: 'hint', code: 'BIG' },
        ],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, true);
    const testFile = filtered.find(f => f.file === 'test/example.test.ts');

    expect(testFile).toBeDefined();
    expect(testFile?.inline).toHaveLength(3);
    expect(testFile?.inline.map(s => s.code)).toEqual(['ORPHAN', 'CYCLE', 'BIG']);
  });

  it('showOrphans flag overrides default filtering', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'test/example.test.ts',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    // Default behavior: ORPHAN is hidden
    const defaultFiltered = filterOrphanSignals(fileSignals, false);
    expect(defaultFiltered[0].inline.some(s => s.code === 'ORPHAN')).toBe(false);

    // With --show-orphans: ORPHAN is shown
    const showOrphansFiltered = filterOrphanSignals(fileSignals, true);
    expect(showOrphansFiltered[0].inline.some(s => s.code === 'ORPHAN')).toBe(true);
  });
});
