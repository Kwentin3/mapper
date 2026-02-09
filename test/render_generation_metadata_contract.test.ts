import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('Render generation metadata (UX contract)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = createTempRepoDir('temp_generation_metadata');
    const fixture = fb();
    fixture.file('src/a.ts');
    fixture.imports('src/b.ts', ['./a.ts']);
    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('declares view mode as budgeted vs full-signals deterministically', async () => {
    const rBudgeted = await runPipeline({ rootDir: tempDir, fullSignals: false });
    expect(rBudgeted.markdown).toContain('## Generation Metadata');
    expect(rBudgeted.markdown).toContain('- View mode: budgeted');

    const rFull = await runPipeline({ rootDir: tempDir, fullSignals: true });
    expect(rFull.markdown).toContain('## Generation Metadata');
    expect(rFull.markdown).toContain('- View mode: full-signals');

    // Determinism: same inputs -> identical output
    const rBudgeted2 = await runPipeline({ rootDir: tempDir, fullSignals: false });
    expect(rBudgeted.markdown).toBe(rBudgeted2.markdown);
  }, { timeout: 20000 });
});
