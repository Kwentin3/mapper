import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI determinism', () => {
    let tempDir: string;

    beforeEach(async () => {
        // Create a temporary directory with a simple deterministic repo
        tempDir = join(__dirname, 'temp_cli_determinism_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create repo subdirectory to isolate source files from output files
        const repoDir = join(tempDir, 'repo');
        await fs.mkdir(repoDir, { recursive: true });

        // Create src directory with a few files inside repo
        await fs.mkdir(join(repoDir, 'src'), { recursive: true });
        await fs.writeFile(join(repoDir, 'src', 'index.ts'), '// entry\n');
        await fs.writeFile(join(repoDir, 'src', 'utils.ts'), 'export const x = 1;\n');
        await fs.writeFile(join(repoDir, 'src', 'helper.ts'), 'export const y = 2;\n');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('produces identical output across two runs with same arguments', async () => {
        const repoDir = join(tempDir, 'repo');
        const output1 = join(tempDir, 'OUTPUT1.md');
        const output2 = join(tempDir, 'OUTPUT2.md');

        // First run with output placed outside the scanned repo
        const result1 = await run(['--out', output1, repoDir]);
        expect(result1.exitCode).toBe(0);
        const content1 = await fs.readFile(output1, 'utf-8');

        // Second run with identical arguments (output file different but should not affect scan)
        const result2 = await run(['--out', output2, repoDir]);
        expect(result2.exitCode).toBe(0);
        const content2 = await fs.readFile(output2, 'utf-8');

        // Byte-for-byte equality
        expect(content2).toBe(content1);

        // Also ensure the files are not empty
        expect(content1.length).toBeGreaterThan(0);
    });
});