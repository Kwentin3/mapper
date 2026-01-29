import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('contract: truth preservation under --depth (PRD v0.9)', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = createTempRepoDir('temp_contract_depth_truth');

        const fixture = fb();

        // Build a subtree that will be collapsed when depth=2
        // Structure: root/level1/level2/level3/risky.ts
    // Create two files that import each other to form a cycle (structural risk)
    fixture.imports('root/level1/level2/level3/a.ts', ['./b.ts']);
    fixture.imports('root/level1/level2/level3/b.ts', ['./a.ts']);

        // Add some extra files to make counts stable
        fixture.makeMany('root/level1/level2/many', { files: 3, prefix: 'f', ext: '.ts' });

        await fixture.writeToDisk(tempDir);
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('collapsed stub reports hidden risk signals (Z >= 1) when depth=2', async () => {
        const result = await runPipeline({ rootDir: tempDir, depth: 2, fullSignals: false });

        const md = result.markdown;

    // Find the stub line (contains canonical Unicode ellipsis and counts)
    const stubLine = md.split('\n').find(l => l.includes('… ('));
        expect(stubLine).toBeDefined();

        // The stub line should include a hidden signals indicator with the (!) glyph
        // Match patterns like: '(X files, Y subdir, (!) Z signal' (singular/plural)
        const m = stubLine!.match(/\(.*\(!\)\s*(\d+)\s*signal/);
        expect(m).not.toBeNull();

        const hiddenSignals = m ? Number(m[1]) : 0;
        expect(hiddenSignals).toBeGreaterThanOrEqual(1);

        // Bonus: assert files/subdirs counts appear (non-exact numbers are acceptable here)
        expect(stubLine).toMatch(/\(\d+ files?, \d+ subdir/);
    });
});
