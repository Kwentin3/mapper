import { describe, it, expect } from 'vitest';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('summary hub agent guidance legend (L9.7)', () => {
  it('AI preamble contains agent guidance for [HUB] and is invariant under --full-signals', async () => {
    // Baseline render
    const r1 = await runPipeline({ rootDir: '.' });
    const md1 = r1.markdown;

    // Full-signals render
    const r2 = await runPipeline({ rootDir: '.', fullSignals: true });
    const md2 = r2.markdown;

    // Extract only the AI preamble block (from '## AI Preamble' up to next top-level '## ')
    const preambleRe = /## AI Preamble[\s\S]*?\n(?=## )/i;
    const p1 = md1.match(preambleRe)?.[0] ?? md1;
    const p2 = md2.match(preambleRe)?.[0] ?? md2;

    // Must reference [HUB]
    expect(p1).toMatch(/\[HUB\]/);

    // Must mention agent action hints
    expect(p1).toMatch(/--focus-file/i);
    expect(p1).toMatch(/--full-signals/i);

    // Baseline preamble must equal full-signals preamble
    expect(p1).toBe(p2);

    // Determinism: repeated baseline render returns identical preamble
    const r3 = await runPipeline({ rootDir: '.' });
    const p3 = r3.markdown.match(preambleRe)?.[0] ?? r3.markdown;
    expect(p1).toBe(p3);
  }, { timeout: 20000 });
});
