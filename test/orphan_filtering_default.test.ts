import { describe, it, expect } from 'vitest';
import { filterOrphanSignals, matchesOrphanFilter } from '../src/signals/filter.js';
import type { FileSignals } from '../src/signals/types.js';

describe('orphan filtering default behavior', () => {
  it('hides ORPHAN signals for test files by default', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'test/example.test.ts',
        inline: [
          { kind: 'context', code: 'ORPHAN' },
          { kind: 'hint', code: 'BIG' },
        ],
      },
      {
        file: 'src/main.ts',
        inline: [
          { kind: 'context', code: 'ORPHAN' },
          { kind: 'hint', code: 'BIG' },
        ],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);

    // Test file should have ORPHAN removed
    const testFile = filtered.find(f => f.file === 'test/example.test.ts');
    expect(testFile).toBeDefined();
    expect(testFile?.inline).toHaveLength(1);
    expect(testFile?.inline[0].code).toBe('BIG');
    expect(testFile?.inline.some(s => s.code === 'ORPHAN')).toBe(false);

    // Source file should keep ORPHAN
    const srcFile = filtered.find(f => f.file === 'src/main.ts');
    expect(srcFile).toBeDefined();
    expect(srcFile?.inline).toHaveLength(2);
    expect(srcFile?.inline.some(s => s.code === 'ORPHAN')).toBe(true);
  });

  it('hides ORPHAN signals for docs files', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'docs/README.md',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);
    const docFile = filtered.find(f => f.file === 'docs/README.md');

    expect(docFile).toBeDefined();
    expect(docFile?.inline).toHaveLength(0);
  });

  it('hides ORPHAN signals for config files', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'package.json',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'tsconfig.json',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'package-lock.json',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);

    for (const file of filtered) {
      expect(file.inline.some(s => s.code === 'ORPHAN')).toBe(false);
    }
  });

  it('hides ORPHAN signals for build/dist files', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'dist/bundle.js',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'build/output.js',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
      {
        file: 'tmp/cache.js',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);

    for (const file of filtered) {
      expect(file.inline.some(s => s.code === 'ORPHAN')).toBe(false);
    }
  });

  it('hides ORPHAN signals for spec files', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'src/utils.spec.ts',
        inline: [{ kind: 'context', code: 'ORPHAN' }],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);
    const specFile = filtered.find(f => f.file === 'src/utils.spec.ts');

    expect(specFile).toBeDefined();
    expect(specFile?.inline).toHaveLength(0);
  });

  it('matchesOrphanFilter correctly identifies noise files', () => {
    expect(matchesOrphanFilter('test/example.test.ts')).toBe(true);
    expect(matchesOrphanFilter('tests/integration.test.ts')).toBe(true);
    expect(matchesOrphanFilter('src/utils.spec.ts')).toBe(true);
    expect(matchesOrphanFilter('docs/README.md')).toBe(true);
    expect(matchesOrphanFilter('package.json')).toBe(true);
    expect(matchesOrphanFilter('tsconfig.json')).toBe(true);
    expect(matchesOrphanFilter('package-lock.json')).toBe(true);
    expect(matchesOrphanFilter('dist/bundle.js')).toBe(true);
    expect(matchesOrphanFilter('build/output.js')).toBe(true);
    expect(matchesOrphanFilter('tmp/cache.js')).toBe(true);
    expect(matchesOrphanFilter('node_modules/lodash/index.js')).toBe(true);
    
    // Source files should not match
    expect(matchesOrphanFilter('src/main.ts')).toBe(false);
    expect(matchesOrphanFilter('lib/utils.js')).toBe(false);
    expect(matchesOrphanFilter('index.ts')).toBe(false);
  });

  it('preserves other signals when filtering ORPHAN', () => {
    const fileSignals: FileSignals[] = [
      {
        file: 'test/example.test.ts',
        inline: [
          { kind: 'context', code: 'ORPHAN' },
          { kind: 'risk', code: 'CYCLE' },
          { kind: 'hint', code: 'BIG' },
          { kind: 'hint', code: 'PARSE-ERROR:SYNTAX' },
        ],
      },
    ];

    const filtered = filterOrphanSignals(fileSignals, false);
    const testFile = filtered.find(f => f.file === 'test/example.test.ts');

    expect(testFile).toBeDefined();
    expect(testFile?.inline).toHaveLength(3);
  expect(testFile?.inline.map(s => s.code)).toEqual(['CYCLE', 'BIG', 'PARSE-ERROR:SYNTAX']);
  });
});
