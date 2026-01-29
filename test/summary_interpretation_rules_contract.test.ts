import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { promises as fs } from 'fs';

describe('AI Preamble interpretation rules contract (L10.1)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = createTempRepoDir('temp_summary_interpret');
    const fixture = fb();
    fixture.file('src/a.ts');
    fixture.imports('src/b.ts', ['./a.ts']);
    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('preamble contains interpretation rules and is invariant/deterministic', async () => {
    const r1 = await runPipeline({ rootDir: tempDir, fullSignals: false });
    const md1 = r1.markdown;

    const r2 = await runPipeline({ rootDir: tempDir, fullSignals: true });
    const md2 = r2.markdown;

    const preambleRe = /## AI Preamble[\s\S]*?\n(?=## )/i;
    const p1 = md1.match(preambleRe)?.[0] ?? md1;
    const p2 = md2.match(preambleRe)?.[0] ?? md2;

    // Section header present
    expect(p1).toMatch(/### Interpretation rules for agents/);

    // Key phrase checks
    expect(p1).toMatch(/heuristic/i);
  expect(p1).toMatch(/navigat/i);
    expect(p1).toMatch(/--full-signals/);
    expect(p1).toMatch(/\[HUB\]/);
    expect(p1).toMatch(/not a contract/i);

    // Invariance and determinism
    expect(p1).toBe(p2);

    const r3 = await runPipeline({ rootDir: tempDir, fullSignals: false });
    const p3 = r3.markdown.match(preambleRe)?.[0] ?? r3.markdown;
    expect(p1).toBe(p3);
  }, { timeout: 20000 });
});
