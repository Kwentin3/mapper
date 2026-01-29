import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI self‑scan output directory determinism', () => {
    let tempDir: string;

    beforeEach(async () => {
        // Create a temporary directory with a simple deterministic repo
        tempDir = join(__dirname, 'temp_cli_selfscan_' + Math.random().toString(36).slice(2));
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

    it('produces identical output when output directory is a subfolder of the scanned root', async () => {
        const repoDir = join(tempDir, 'repo');
        const outSubDir = join(repoDir, 'tmp');
        await fs.mkdir(outSubDir, { recursive: true });
        const outputFile = join(outSubDir, 'ARCHITECTURE.md');

        // First run
        const result1 = await run(['--out', outputFile, repoDir]);
        expect(result1.exitCode).toBe(0);
        const content1 = await fs.readFile(outputFile, 'utf-8');

        // Second run – should be identical despite the output file already existing
        const result2 = await run(['--out', outputFile, repoDir]);
        expect(result2.exitCode).toBe(0);
        const content2 = await fs.readFile(outputFile, 'utf-8');

        // Byte‑for‑byte equality
        expect(content2).toBe(content1);

        // Ensure the output is not empty
        expect(content1.length).toBeGreaterThan(0);

        // Additionally, verify that the output directory 'tmp' is not mentioned in the architecture map
        // (i.e., the scanner correctly excluded it).
        // Since the map only contains source files, we can check that 'tmp/' does not appear.
        expect(content1).not.toContain('tmp/');
        expect(content1).not.toMatch(/^\s*tmp\s*$/m);
    });

    it('also works with nested output directories (e.g., tmp/subdir)', async () => {
        const repoDir = join(tempDir, 'repo');
        const outSubDir = join(repoDir, 'tmp', 'subdir');
        await fs.mkdir(outSubDir, { recursive: true });
        const outputFile = join(outSubDir, 'ARCHITECTURE.md');

        // First run
        const result1 = await run(['--out', outputFile, repoDir]);
        expect(result1.exitCode).toBe(0);
        const content1 = await fs.readFile(outputFile, 'utf-8');

        // Second run
        const result2 = await run(['--out', outputFile, repoDir]);
        expect(result2.exitCode).toBe(0);
        const content2 = await fs.readFile(outputFile, 'utf-8');

        expect(content2).toBe(content1);
        expect(content1.length).toBeGreaterThan(0);

        // The top‑level segment 'tmp' should be excluded, so 'tmp/' should not appear.
        expect(content1).not.toContain('tmp/');
    });
});