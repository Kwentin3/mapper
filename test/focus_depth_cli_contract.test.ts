import { describe, it, expect } from 'vitest';
import { run } from '../src/cli/run.js';

describe('CLI: --focus-depth validation', () => {
  it('rejects negative or non-integer values deterministically', async () => {
    const r1 = await run(['--focus-depth', '-1', '.']);
    expect(r1.exitCode).toBe(1);

    const r2 = await run(['--focus-depth', 'weird', '.']);
    expect(r2.exitCode).toBe(1);
  });
});
