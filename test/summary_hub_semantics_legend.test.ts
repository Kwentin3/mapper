import { describe, it, expect } from 'vitest';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('summary hub semantics legend (L9.6)', () => {
  it('preamble mentions [HUB], fan-in/fan-out, includes render-only/not a contract; deterministic and invariant under full-signals', async () => {
    // Baseline render (default budgets/profile)
    const r1 = await runPipeline({ rootDir: '.' });
    const md1 = r1.markdown;

    // Full-signals render
    const r2 = await runPipeline({ rootDir: '.', fullSignals: true });
    const md2 = r2.markdown;

  // Extract only the AI preamble section (from the preamble header to the next top-level section)
  const preambleRe = /## AI Preamble[\s\S]*?\n(?=## )/i;
  const p1 = md1.match(preambleRe)?.[0] ?? md1;
  const p2 = md2.match(preambleRe)?.[0] ?? md2;

  // Presence of HUB marker inside the preamble
  expect(p1).toMatch(/\[HUB\]/);

  // Presence of fan-in or fan-out wording nearby (allow some punctuation)
  expect(p1).toMatch(/fan[^A-Za-z0-9]*in|fan[^A-Za-z0-9]*out/i);

  // Presence of explicit semantics - either "render-only" or "not a contract"
  expect(p1).toMatch(/render[- ]?only|not a contract/i);

  // Determinism / equality for the preamble across baseline vs full-signals
  expect(p1).toBe(p2);

  // Determinism: repeated baseline render returns identical preamble
  const r3 = await runPipeline({ rootDir: '.' });
  const p3 = r3.markdown.match(preambleRe)?.[0] ?? r3.markdown;
  expect(p1).toBe(p3);
  }, { timeout: 20000 });
});
