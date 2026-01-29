import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI generate file', () => {
    let tempDir: string;
    let outputPath: string;

    beforeEach(async () => {
        // Create a temporary directory
        tempDir = join(__dirname, 'temp_cli_generate_file_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create a dummy source file to make the repo non-empty
        await fs.writeFile(join(tempDir, 'dummy.ts'), '// dummy');

        outputPath = join(tempDir, 'OUTPUT.md');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('writes markdown file to disk when --out flag is used', async () => {
        const result = await run(['--out', 'OUTPUT.md', tempDir]);

        expect(result.exitCode).toBe(0);
        // Check that file exists
        const exists = await fs.access(outputPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        // Ensure file is not empty
        const content = await fs.readFile(outputPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
        // Should contain the expected preamble
        expect(content).toMatch(/^## AI Preamble/);
    });

    it('uses default output file ARCHITECTURE.md when --out is omitted', async () => {
        const defaultOutput = join(tempDir, 'ARCHITECTURE.md');
        const result = await run([tempDir]);

        expect(result.exitCode).toBe(0);
        const exists = await fs.access(defaultOutput).then(() => true).catch(() => false);
        expect(exists).toBe(true);
    });
});