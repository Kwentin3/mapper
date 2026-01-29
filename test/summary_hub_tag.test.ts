import { describe, it, expect } from 'vitest';
import { renderSummary } from '../src/render/render_summary.js';

describe('summary hub tag (render-only)', () => {
  it('tags hub files in Fan-in / Fan-out summary lists and only there; deterministic across runs', () => {
    const signals = {
      files: [],
      entrypoints: [ { file: 'src/index.ts', reason: 'entrypoint', score: 1 } ],
      publicApi: [],
      hubsFanIn: [ { file: 'src/utils/determinism.ts', reason: 'Fan-in 20', score: 20 } ],
      hubsFanOut: [],
      warnings: [],
    } as any;

    const budgets = {
      entrypointsTopN: 5,
      publicApiTopN: 5,
      hubsTopN: 5,
      inlinePerFileMax: 10,
    } as any;

    // Baseline (budgeted) render twice to assert determinism
    const out1 = renderSummary(signals, budgets, false);
    const out2 = renderSummary(signals, budgets, false);
    expect(out1).toBe(out2);

    // Full-signals render twice
    const f1 = renderSummary(signals, budgets, true);
    const f2 = renderSummary(signals, budgets, true);
    expect(f1).toBe(f2);

    // Positive: the known hub should be tagged in Fan-in Hubs
    expect(out1).toContain('`src/utils/determinism.ts` [PROD] [HUB] – Fan-in 20');
    expect(f1).toContain('`src/utils/determinism.ts` [PROD] [HUB] – Fan-in 20');

    // Negative: entrypoint should NOT be tagged [HUB]
    expect(out1).toContain('`src/index.ts` [PROD] – entrypoint');
    expect(out1).not.toContain('`src/index.ts` [PROD] [HUB]');
  });
});
