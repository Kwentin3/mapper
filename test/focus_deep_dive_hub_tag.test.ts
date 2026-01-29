import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('Focused Deep-Dive [HUB] tag (render-only)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = createTempRepoDir('focus_deep_dive_hub_tag');
    // create a small fixture for negative test
    const fixture = fb();
    // Minimal non-hub files
    fixture.file('src/a.ts');
    fixture.file('src/b.ts');
    fixture.imports('src/a.ts', ['./b.ts']);

    // Create a small hub fixture: many files import src/hub.ts so it becomes a fan-in hub
    fixture.file('src/hub.ts');
    fixture.makeMany('src', { files: 5, prefix: 'user', ext: '.ts' });
    for (let i = 1; i <= 5; i++) {
      const user = `src/user${i.toString().padStart(2, '0')}.ts`;
      fixture.imports(user, ['./hub.ts']);
    }
    // Add a true non-hub leaf file with no incoming/outgoing edges for the negative test
    fixture.file('src/leaf.ts');
    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows [HUB] for a known hub when focused, and not for non-hub; invariant under full-signals and deterministic', async () => {
    // Positive: find any hub listed in the repo summary (use fullSignals to ensure hubs are visible),
    // then focus that file and expect the Focused Deep‑Dive header to include [HUB].
  // Use the temp repo we just created so tests are hermetic
  const baseFull = await runPipeline({ rootDir: tempDir, fullSignals: true });
  const mdFull = baseFull.markdown;
  // We created a synthetic hub at src/hub.ts in this temp repo; use it directly.
  const hubPath = 'src/hub.ts';

  const rHub = await runPipeline({ rootDir: tempDir, focusFile: hubPath });
    const mdHub = rHub.markdown;
    expect(mdHub).toContain('## Focused Deep-Dive');
    // Focus header should contain the path and the [HUB] marker
    const escaped = hubPath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp('`' + escaped + '` \\[[A-Z]+\\] \\[HUB\\]');
    expect(mdHub).toMatch(re);

    // Full-signals invariance
  const rHubFull = await runPipeline({ rootDir: tempDir, focusFile: hubPath, fullSignals: true });
    expect(rHubFull.markdown).toMatch(re);

    // Determinism: two runs identical for same inputs (baseline)
  const r1 = await runPipeline({ rootDir: tempDir, focusFile: hubPath });
  const r2 = await runPipeline({ rootDir: tempDir, focusFile: hubPath });
    expect(r1.markdown).toBe(r2.markdown);

    // Negative: focus a true non-hub file in our small temp fixture
    const rNon = await runPipeline({ rootDir: tempDir, focusFile: 'src/leaf.ts' });
    const mdNon = rNon.markdown;
    expect(mdNon).toContain('## Focused Deep-Dive');
    expect(mdNon).toMatch(/`src\/leaf.ts` \[[A-Z]+\]/);
    expect(mdNon).not.toMatch(/`src\/leaf.ts` \[[A-Z]+\] \[HUB\]/);
  });
});
