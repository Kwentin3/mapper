import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI positional out handling', () => {
    let tempDir: string;
    let outputPath: string;

    beforeEach(async () => {
        tempDir = join(__dirname, 'temp_cli_positional_out_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(join(tempDir, 'dummy.ts'), '// dummy');
        outputPath = join(tempDir, 'OUTPUT.md');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('treats second positional argument as --out when --out is not provided', async () => {
        const result = await run([tempDir, 'OUTPUT.md']);
        expect(result.exitCode).toBe(0);
        const exists = await fs.access(outputPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
        const content = await fs.readFile(outputPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toMatch(/^## AI Preamble/);
    });

    it('errors when both --out and positional out are provided', async () => {
        const result = await run(['--out', 'OUT1.md', tempDir, 'OUT2.md']);
        expect(result.exitCode).toBe(1);
        // Neither OUT2.md (positional) nor OUT1.md should be created in tempDir because of error
        const out1 = join(tempDir, 'OUT1.md');
        const out2 = join(tempDir, 'OUT2.md');
        const exists1 = await fs.access(out1).then(() => true).catch(() => false);
        const exists2 = await fs.access(out2).then(() => true).catch(() => false);
        expect(exists1).toBe(false);
        expect(exists2).toBe(false);
    });

    it('errors when too many positional arguments are provided', async () => {
        const result = await run([tempDir, 'OUT.md', 'EXTRA.md']);
        expect(result.exitCode).toBe(1);
        const out = join(tempDir, 'OUT.md');
        const exists = await fs.access(out).then(() => true).catch(() => false);
        expect(exists).toBe(false);
    });
});
