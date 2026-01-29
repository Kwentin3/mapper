import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI UTF-8 output guarantee', () => {
    let tempDir: string;
    let repoDir: string;

    beforeEach(async () => {
        // Create a temporary directory
        tempDir = join(__dirname, 'temp_utf8_output_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create repo subdirectory
        repoDir = join(tempDir, 'repo');
        await fs.mkdir(repoDir, { recursive: true });

        // Minimal package.json
        await fs.writeFile(join(repoDir, 'package.json'), JSON.stringify({
            name: 'utf8-test',
            version: '1.0.0',
            type: 'module',
        }, null, 2));

        // Create src directory with a simple file
        await fs.mkdir(join(repoDir, 'src'), { recursive: true });
        await fs.writeFile(join(repoDir, 'src', 'index.ts'), `
// Simple file with Unicode comment → arrow
export const hello = 'world';
`.trim());
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('writes output as UTF‑8 without BOM and preserves Unicode glyphs', async () => {
        const outputPath = join(tempDir, 'ARCHITECTURE.md');
        const result = await run(['--out', outputPath, repoDir]);
        expect(result.exitCode).toBe(0);

        // Read file as buffer to check BOM
        const buffer = await fs.readFile(outputPath);
        // Check no UTF-8 BOM (EF BB BF)
        expect(buffer.length).toBeGreaterThan(0);
        if (buffer.length >= 3) {
            expect(buffer[0]).not.toBe(0xEF);
            expect(buffer[1]).not.toBe(0xBB);
            expect(buffer[2]).not.toBe(0xBF);
        }

        // Read as UTF-8 string
        const content = buffer.toString('utf-8');

        // Ensure no replacement characters (U+FFFD)
        expect(content).not.toContain('\uFFFD');

        // Ensure Unicode tree glyphs are present (they are used in tree rendering)
        expect(content).toMatch(/├──/);
        expect(content).toMatch(/└──/);
        // Optionally check for arrow glyph used in signals (→)
        expect(content).toMatch(/→/);

        // Ensure no CRLF line endings
        expect(content).not.toMatch(/\r\n/);

        // Ensure file is valid UTF-8 (Node's decode succeeded)
        // Already guaranteed by toString not throwing.
    });
});