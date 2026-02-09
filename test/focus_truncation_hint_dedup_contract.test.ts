import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('Focused deep-dive truncation UX (dedup)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = createTempRepoDir('temp_focus_truncation_dedup');
    const fixture = fb();
    const core = 'src/core.ts';
    fixture.file(core);

    // 15 importers ensures DEEP_DIVE_BUDGET (default=10) truncation in focus-view
    for (let i = 1; i <= 15; i++) {
      const p = `src/importer${i}.ts`;
      fixture.imports(p, ['./core.ts']);
    }

    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('does not emit redundant HUB-specific truncation hint lines in focus-view', async () => {
    const r = await runPipeline({ rootDir: tempDir, focusFile: 'src/core.ts', fullSignals: false });
    const md = r.markdown;
    expect(md).toContain('## Focused Deep-Dive');
    expect(md).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
    expect(md).not.toContain('Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.');
  }, { timeout: 20000 });
});
