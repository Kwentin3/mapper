import { describe, it, expect } from 'vitest';
import { classifyPathKind } from '../src/render/format.js';

describe('classifyPathKind contract', () => {
  it('classifies test paths as TEST and prod as PROD', () => {
    expect(classifyPathKind('test/helpers/fixture_builder.ts')).toBe('TEST');
    expect(classifyPathKind('tests/helpers/fixture_builder.ts')).toBe('TEST');
    expect(classifyPathKind('src/__tests__/x.ts')).toBe('TEST');
    expect(classifyPathKind('src/foo.test.ts')).toBe('TEST');
    expect(classifyPathKind('src/foo.spec.ts')).toBe('TEST');

    expect(classifyPathKind('src/cli/main.ts')).toBe('PROD');
  });
});
