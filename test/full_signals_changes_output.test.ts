import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('full-signals flag contract test', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = createTempRepoDir('temp_full_signals_test');
        
        const fixture = fb();
        for (let i = 1; i <= 10; i++) {
            fixture.imports(`src/entry${i}.ts`, ['./dep.ts']);
        }
        fixture.file('src/dep.ts');
        await fixture.writeToDisk(tempDir);
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('baseline output should be truncated', async () => {
        const result = await runPipeline({
            rootDir: tempDir,
            fullSignals: false
        });

        const entrypointLines = result.markdown.split('\n')
            .filter(line => line.trim().startsWith('- `src/entry') && line.includes('fan-in is 0'));
        
        expect(entrypointLines.length).toBeLessThanOrEqual(5);
    });

    it('full-signals output should NOT be truncated', async () => {
        const result = await runPipeline({
            rootDir: tempDir,
            fullSignals: true
        });

        const entrypointLines = result.markdown.split('\n')
            .filter(line => line.trim().startsWith('- `src/entry') && line.includes('fan-in is 0'));
        
        expect(entrypointLines.length).toBe(10);
    });

    it('output should be different between baseline and full-signals', async () => {
        const baseline = await runPipeline({ 
            rootDir: tempDir,
            fullSignals: false 
        });
        const full = await runPipeline({ 
            rootDir: tempDir,
            fullSignals: true 
        });

        expect(baseline.markdown).not.toBe(full.markdown);
    });

    it('ordering should be stable and deterministic', async () => {
        const run1 = await runPipeline({ 
            rootDir: tempDir,
            fullSignals: true 
        });
        const run2 = await runPipeline({ 
            rootDir: tempDir,
            fullSignals: true 
        });

        expect(run1.markdown).toBe(run2.markdown);
    });
});
