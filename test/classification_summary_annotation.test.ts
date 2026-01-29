import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: deterministic PROD/TEST classification in summaries', () => {
    let tempDir: string;

    beforeAll(async () => {
    tempDir = createTempRepoDir('temp_classify_summary');

        const fixture = fb();

        // Create two entrypoint-like files by giving them outgoing imports
        fixture.imports('src/main.ts', ['./lib.ts']);
        fixture.file('src/lib.ts');

        fixture.imports('test/main.test.ts', ['./helper.ts']);
        fixture.file('test/helper.ts');

        await fixture.writeToDisk(tempDir);
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('annotates Entrypoints with [PROD] and [TEST] tags deterministically', async () => {
        const r1 = await runPipeline({ rootDir: tempDir });
        const r2 = await runPipeline({ rootDir: tempDir });

        // Determinism: outputs should be identical across runs
        expect(r1.markdown).toEqual(r2.markdown);

        const md = r1.markdown;

        // Find Fan-out Hubs block (both files should appear as they have outgoing imports)
        const lines = md.split('\n');
        const start = lines.findIndex(l => l.trim() === '### Fan‑out Hubs');
        expect(start).toBeGreaterThanOrEqual(0);

        // Collect following list items until blank line or next header
        const items: string[] = [];
        for (let i = start + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().length === 0) break;
            if (line.startsWith('### ')) break;
            items.push(line.trim());
        }

        // Expect to see our two files with tags in the Fan‑out Hubs section
        const hasSrc = items.some(l => l.includes('`src/main.ts`') && l.includes('[PROD]'));
        const hasTest = items.some(l => l.includes('`test/main.test.ts`') && l.includes('[TEST]'));

        expect(hasSrc).toBe(true);
        expect(hasTest).toBe(true);
    });
});
