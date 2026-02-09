import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI run(): silent IO contract (test UX)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(__dirname, 'temp_cli_silent_io_' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(join(tempDir, 'dummy.ts'), '// dummy');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('can suppress error printing while still returning exitCode=1', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await run([tempDir, 'OUT.md', 'EXTRA.md'], { log: () => {}, error: () => {} } as any);
    expect(result.exitCode).toBe(1);
    // Contract: when IO is provided, run() must not write to global console.error
    expect(errSpy).not.toHaveBeenCalled();
  });
});

