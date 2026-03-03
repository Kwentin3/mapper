import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('CLI --format json', () => {
    let tempDir: string;
    let outDir: string;

    beforeEach(async () => {
        tempDir = createTempRepoDir('temp_cli_format_json');
        outDir = createTempRepoDir('temp_cli_format_json_out');
        await fs.mkdir(join(tempDir, 'src'), { recursive: true });
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'tmp', version: '1.0.0' }, null, 2), 'utf-8');
        await fs.writeFile(join(tempDir, 'src', 'a.ts'), 'export const A = 1;\n', 'utf-8');
        await fs.writeFile(join(tempDir, 'src', 'b.ts'), "import { A } from './a.js';\nexport const B = A;\n", 'utf-8');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
        await fs.rm(outDir, { recursive: true, force: true });
    });

    it('writes schema-versioned deterministic JSON artifact', async () => {
        const outA = join(outDir, 'OUT_A.json');
        const outB = join(outDir, 'OUT_B.json');

        const resA = await run(['--format', 'json', '--out', outA, tempDir]);
        const resB = await run(['--format', 'json', '--out', outB, tempDir]);
        expect(resA.exitCode).toBe(0);
        expect(resB.exitCode).toBe(0);

        const contentA = await fs.readFile(outA, 'utf-8');
        const contentB = await fs.readFile(outB, 'utf-8');
        expect(contentA).toBe(contentB);

        const parsed = JSON.parse(contentA) as any;
        expect(parsed.schemaVersion).toBe('mapper.agent.v1');
        expect(parsed.stats.fileCount).toBeGreaterThan(0);
        expect(parsed.files.some((f: any) => f.path === 'src/a.ts')).toBe(true);
        expect(parsed.files.some((f: any) => f.path === 'src/b.ts')).toBe(true);
        expect(parsed.graph.edges.some((e: any) => e.from === 'src/b.ts' && e.to === 'src/a.ts')).toBe(true);
    });

    it('uses ARCHITECTURE.json by default in json format', async () => {
        const result = await run(['--format', 'json', tempDir]);
        expect(result.exitCode).toBe(0);

        const jsonPath = join(tempDir, 'ARCHITECTURE.json');
        const exists = await fs.access(jsonPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
    });
});
