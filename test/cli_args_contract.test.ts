import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI args contract (PRD v0.9)', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = join(__dirname, 'temp_cli_args_contract_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(join(tempDir, 'dummy.ts'), '// dummy');
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('Contract A: errors with >1 positional args and prints deterministic message', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await run([tempDir, 'OUT.md', 'EXTRA.md']);
        expect(result.exitCode).toBe(1);
        expect(spy).toHaveBeenCalled();
        // Exact deterministic error message asserted by contract
        expect(spy.mock.calls[0][0]).toBe('Error: too many positional arguments. Usage: [<root>] [<out>]');
    });

    it('Contract B1: --out file path creates file with UTF-8 deterministic content', async () => {
        const outPath = 'OUT_FILE.md';
        const result = await run(['--out', outPath, tempDir]);
        expect(result.exitCode).toBe(0);
        const full = join(tempDir, outPath);
        const exists = await fs.access(full).then(() => true).catch(() => false);
        expect(exists).toBe(true);
        // Read as UTF-8 (should not throw) and ensure content present
        const content = await fs.readFile(full, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
        // No BOM: first char should not be 0xEF — ensure deterministic encoding
        const buf = await fs.readFile(full);
        expect(buf[0]).not.toBe(0xEF);
    });

    it('Contract B2: --out pointing to an existing directory fails with deterministic message', async () => {
        const outDir = 'out_dir';
        const dirFull = join(tempDir, outDir);
        await fs.mkdir(dirFull, { recursive: true });
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await run(['--out', outDir, tempDir]);
        expect(result.exitCode).toBe(1);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toBe('Error: --out must be a file path, not a directory.');
    });

    it('Contract B3: --out parent directory missing fails deterministically', async () => {
        const outPath = 'no_such_parent/OUT.md';
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await run(['--out', outPath, tempDir]);
        expect(result.exitCode).toBe(1);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toBe('Error: output parent directory does not exist.');
    });

    it('Contract C: --out filename does not affect analysis (content hash equal)', async () => {
        // Use a repo subdirectory to avoid outputs being scanned. This mirrors
        // existing project tests and ensures outputs do not affect analysis.
        const repoDir = join(tempDir, 'repo');
        await fs.mkdir(repoDir, { recursive: true });
        await fs.writeFile(join(repoDir, 'index.ts'), '// entry');

        const out1 = join(tempDir, 'A.md');
        const out2 = join(tempDir, 'B.md');
        const run1 = await run(['--out', out1, repoDir]);
        expect(run1.exitCode).toBe(0);
        const run2 = await run(['--out', out2, repoDir]);
        expect(run2.exitCode).toBe(0);
        const b1 = await fs.readFile(out1);
        const b2 = await fs.readFile(out2);
        // Simple byte equality: hash equality proof
        expect(b1.equals(b2)).toBe(true);
    });
});
