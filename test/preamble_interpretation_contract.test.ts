import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { promises as fs } from 'fs';

describe('AI Preamble interpretation contract (L10.1)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = createTempRepoDir('temp_preamble_interpret');
    const fixture = fb();
    // small repo: 3 files with a simple import chain
    fixture.file('src/a.ts');
    fixture.imports('src/b.ts', ['./a.ts']);
    fixture.imports('src/c.ts', ['./b.ts']);
    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('preamble contains interpretation rules and is invariant/deterministic', async () => {
    // Baseline
    const r1 = await runPipeline({ rootDir: tempDir, fullSignals: false });
    const md1 = r1.markdown;

    // Full-signals
    const r2 = await runPipeline({ rootDir: tempDir, fullSignals: true });
    const md2 = r2.markdown;

    // Extract AI Preamble block (from header to next top-level '## ')
    const preambleRe = /## AI Preamble[\s\S]*?\n(?=## )/i;
    const p1 = md1.match(preambleRe)?.[0] ?? md1;
    const p2 = md2.match(preambleRe)?.[0] ?? md2;

    // Key phrase checks
    expect(p1).toMatch(/\[HUB\]/);
    expect(p1).toMatch(/fan[^A-Za-z0-9]*in|fan[^A-Za-z0-9]*out/i);
    expect(p1).toMatch(/Render[- ]?only/i);
    expect(p1).toMatch(/not a contract/i);
    expect(p1).toMatch(/does NOT mean absence/i);
    expect(p1).toMatch(/--full-signals/);
    expect(p1).toMatch(/not a machine schema|not a schema/i);

    // Invariance: baseline === full-signals preamble
    expect(p1).toBe(p2);

    // Determinism: repeated baseline render equals the first
    const r3 = await runPipeline({ rootDir: tempDir, fullSignals: false });
    const p3 = r3.markdown.match(preambleRe)?.[0] ?? r3.markdown;
    expect(p1).toBe(p3);
  }, { timeout: 20000 });
});
