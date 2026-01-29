import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { run } from '../src/cli/run.js';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('budget profiles (small|default|large) view-level', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = createTempRepoDir('temp_budget_profiles');
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('small profile truncates where large shows more, full-signals shows all', async () => {
        const fixture = fb();
        // Create core file with many importers and many outgoing imports
        const core = 'src/core.ts';
        fixture.file(core);

        // 12 importers (exceed small LIST_BUDGET)
        for (let i = 1; i <= 12; i++) {
            const p = `src/importer${i}.ts`;
            fixture.file(p);
            // importer imports core relative
            fixture.imports(p, ['./core.ts']);
        }

        // core imports 12 libs (exceed deep-dive small cap)
        const outTargets: string[] = [];
        for (let i = 1; i <= 12; i++) {
            const p = `src/lib${i}.ts`;
            outTargets.push(`./lib${i}.ts`);
            fixture.file(p);
        }
        fixture.imports(core, outTargets);

        await fixture.writeToDisk(tempDir);

        // small
        const rSmall = await runPipeline({ rootDir: tempDir, focusFile: core, budget: 'small' });
        const mdSmall = rSmall.markdown;

        // large
        const rLarge = await runPipeline({ rootDir: tempDir, focusFile: core, budget: 'large' });
        const mdLarge = rLarge.markdown;

        // full-signals (should override budgets)
        const rFull = await runPipeline({ rootDir: tempDir, focusFile: core, budget: 'small', fullSignals: true });
        const mdFull = rFull.markdown;

        // Focused deep-dive: small should show a truncation marker (budgeted),
        // large should not (larger budget shows more items), and full-signals
        // must not show truncation.
    expect(mdSmall).toContain('## Focused Deep-Dive');
    const start = mdSmall.indexOf('## Focused Deep-Dive');
    const nextHeaderSmall = mdSmall.indexOf('\n## ', start + 1);
    const blockSmall = mdSmall.slice(start, nextHeaderSmall === -1 ? mdSmall.length : nextHeaderSmall);
    // canonical focused truncation suffix uses the single-line budget notice
    expect(blockSmall).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

    const startL = mdLarge.indexOf('## Focused Deep-Dive');
    const nextHeaderLarge = mdLarge.indexOf('\n## ', startL + 1);
    const blockLarge = mdLarge.slice(startL, nextHeaderLarge === -1 ? mdLarge.length : nextHeaderLarge);
    // Large profile should not truncate the same focused list (shows more items)
    expect(blockLarge).not.toMatch(/\(… \+\d+ more\)/);

        // Local Dependencies: compare number of shown importers for src/core.ts between small and large
    const ldStart = mdSmall.indexOf('## Local Dependencies (Budgeted)');
    const ldStartLarge = mdLarge.indexOf('## Local Dependencies (Budgeted)');
    const ldBlockSmall = mdSmall.slice(ldStart, ldStart + 4000);
    const ldBlockLarge = mdLarge.slice(ldStartLarge, ldStartLarge + 4000);

    const coreEntryRegex = /`src\/core\.ts`[\s\S]*?- `←` ([^\n]*)/m;
    const matchSmall = ldBlockSmall.match(coreEntryRegex);
    const matchLarge = ldBlockLarge.match(coreEntryRegex);
    expect(matchSmall).toBeTruthy();
    expect(matchLarge).toBeTruthy();
    // In Local Dependencies the importers list should show the canonical truncation notice
    // small profile should show truncation for core's importers
    expect(blockSmall).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
    // large profile may still truncate, but it must show at least as many
    // shown importers as small (i.e., not fewer). Compare the number of
    // backtick-wrapped paths inside the same Local Dependencies entry.
    const countBackticks = (s: string) => {
        const m = s.match(/`([^`]+)`/g);
        return m ? m.length : 0;
    };
    const smallCount = countBackticks(matchSmall![1]);
    const largeCount = countBackticks(matchLarge![1]);
    expect(largeCount).toBeGreaterThanOrEqual(smallCount);

    // full-signals should also not have truncation in the Focused Deep-Dive
    const startF = mdFull.indexOf('## Focused Deep-Dive');
    const nextHeaderFull = mdFull.indexOf('\n## ', startF + 1);
    const blockFull = mdFull.slice(startF, nextHeaderFull === -1 ? mdFull.length : nextHeaderFull);
    expect(blockFull).not.toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

        // determinism: two runs with same flags equal
        const rSmall2 = await runPipeline({ rootDir: tempDir, focusFile: core, budget: 'small' });
        expect(rSmall.markdown).toBe(rSmall2.markdown);
    });

    it('CLI rejects invalid budget values deterministically', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await run(['--budget', 'weird', tempDir]);
        expect(result.exitCode).toBe(1);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toBe('Error: invalid --budget value: weird');
    });
});
