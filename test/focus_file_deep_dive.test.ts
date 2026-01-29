import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: focused deep-dive for a single file (--focus-file)', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = createTempRepoDir('temp_focus_file_deep_dive');
        const fixture = fb();

    // Basic structure:
    // src/a.ts imports ./b.ts and ./c.ts (relative imports)
    fixture.imports('src/a.ts', ['./b.ts', './c.ts']);
        fixture.file('src/b.ts');
        fixture.file('src/c.ts');

    // src/d.ts imports src/a.ts (same dir)
    fixture.imports('src/d.ts', ['./a.ts']);

    // tests/t1.test.ts imports src/a.ts (relative from tests/)
    fixture.imports('tests/t1.test.ts', ['../src/a.ts']);

        await fixture.writeToDisk(tempDir);
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('renders focused deep-dive with correct importers and imports (sorted)', async () => {
        const r = await runPipeline({ rootDir: tempDir, focusFile: 'src/a.ts' });
        const md = r.markdown;

        // Ensure the Focused Deep-Dive section exists and contains the path
        expect(md).toContain('## Focused Deep-Dive');
        expect(md).toContain('`src/a.ts`');

        // Extract the Focused Deep-Dive block
        const lines = md.split('\n');
        const start = lines.findIndex(l => l.trim() === '## Focused Deep-Dive');
        expect(start).toBeGreaterThanOrEqual(0);
        const block: string[] = [];
        for (let i = start + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('## ')) break;
            block.push(line);
        }
        const blockText = block.join('\n');

        // Importers should contain src/d.ts and tests/t1.test.ts (sorted)
        expect(blockText).toMatch(/←.*src\/d.ts/);
        expect(blockText).toMatch(/←.*tests\/t1.test.ts/);

        // Imports should contain src/b.ts and src/c.ts (sorted)
        expect(blockText).toMatch(/→.*src\/b.ts/);
        expect(blockText).toMatch(/→.*src\/c.ts/);
    });

    it('applies truncation by default and can be expanded with --full-signals', async () => {
        // Build a larger fixture where src/a.ts imports many files
        const many = fb();
        const filesCount = 12; // > N (10)
        const imports: string[] = [];
        for (let i = 1; i <= filesCount; i++) {
            const p = `src/many${i}.ts`;
            // from src/a.ts these should be relative imports in the same dir
            imports.push(`./many${i}.ts`);
            many.file(p);
        }
        many.imports('src/a.ts', imports);
        // ensure other minimal files exist so graph contains src/a.ts
        many.file('src/a.ts');
        await many.writeToDisk(join(tempDir, 'many'));

        // Run baseline (should be truncated)
        const rBase = await runPipeline({ rootDir: join(tempDir, 'many'), focusFile: 'src/a.ts' });
        expect(rBase.markdown).toContain('## Focused Deep-Dive');
    // Truncation indicator: canonical single-line notice
    expect(rBase.markdown).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

        // Run with fullSignals (no truncation)
        const rFull = await runPipeline({ rootDir: join(tempDir, 'many'), focusFile: 'src/a.ts', fullSignals: true });
        expect(rFull.markdown).toContain('## Focused Deep-Dive');
    // Should NOT contain truncation indicator
    expect(rFull.markdown).not.toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
    });
});
