import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI contract: --focus-file not found', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = join(__dirname, 'temp_focus_file_not_found_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(join(tempDir, 'hello.ts'), '// hello');
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('returns exitCode=1 and prints deterministic not-found message', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await run(['--focus-file', 'src/nope.ts', tempDir]);
        expect(result.exitCode).toBe(1);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toBe('Error: --focus-file not found: src/nope.ts');
    });
});
