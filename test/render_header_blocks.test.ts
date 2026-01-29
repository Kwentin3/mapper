import { describe, it, expect } from 'vitest';
import { renderSummary } from '../src/render/render_summary.js';
import type { SignalsResult, SignalBudgets } from '../src/signals/types.js';

describe('render_header_blocks', () => {
  const mockSignals: SignalsResult = {
    files: [],
    entrypoints: [
      { file: 'src/cli/main.ts', reason: 'main entry', score: 10 },
      { file: 'src/scanner/index.ts', reason: 'export hub', score: 8 },
      { file: 'src/parser/index.ts', reason: 'public API', score: 6 },
    ],
    publicApi: [
      { file: 'src/scanner/index.ts', reason: 'export hub', score: 9 },
      { file: 'src/parser/index.ts', reason: 're‑export', score: 7 },
    ],
    hubsFanIn: [
      { file: 'src/graph/build_graph.ts', reason: 'fan‑in 15', score: 15 },
      { file: 'src/signals/compute_signals.ts', reason: 'fan‑in 12', score: 12 },
      { file: 'src/scanner/scan.ts', reason: 'fan‑in 10', score: 10 },
    ],
    hubsFanOut: [
      { file: 'src/cli/main.ts', reason: 'fan‑out 20', score: 20 },
      { file: 'src/graph/build_graph.ts', reason: 'fan‑out 18', score: 18 },
    ],
    warnings: [],
  };

  const mockBudgets: SignalBudgets = {
    entrypointsTopN: 2,
    publicApiTopN: 1,
    hubsTopN: 2,
    inlinePerFileMax: 3,
  };

  it('respects entrypointsTopN limit', () => {
    const output = renderSummary(mockSignals, mockBudgets, false);
    expect(output).toContain('### Entrypoints');
    expect(output).toContain('`src/cli/main.ts`');
    expect(output).toContain('`src/scanner/index.ts`');
    // Third entrypoint should be omitted
    expect(output).not.toContain('`src/parser/index.ts`');
  // Should show canonical budget truncation notice
  expect(output).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
  });

  it('respects publicApiTopN limit', () => {
    const output = renderSummary(mockSignals, mockBudgets, false);
    expect(output).toContain('### Public API');
    expect(output).toContain('`src/scanner/index.ts`');
    expect(output).not.toContain('`src/parser/index.ts`');
  expect(output).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
  });

  it('respects hubsTopN limit for fan‑in', () => {
    const output = renderSummary(mockSignals, mockBudgets, false);
    expect(output).toContain('### Fan‑in Hubs');
    expect(output).toContain('`src/graph/build_graph.ts`');
    expect(output).toContain('`src/signals/compute_signals.ts`');
    expect(output).not.toContain('`src/scanner/scan.ts`');
  expect(output).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
  });

  it('respects hubsTopN limit for fan‑out', () => {
    const output = renderSummary(mockSignals, mockBudgets, false);
    expect(output).toContain('### Fan‑out Hubs');
    expect(output).toContain('`src/cli/main.ts`');
    expect(output).toContain('`src/graph/build_graph.ts`');
  // No third fan‑out hub present, so no truncation notice
  // Check only within fan‑out section
  const fanOutSection = output.split('### Fan‑out Hubs')[1]?.split('##')[0] || '';
  expect(fanOutSection).not.toMatch(/Truncated by budget; rerun with --full-signals/);
  });

  it('shows all items when fullSignals is true', () => {
    const output = renderSummary(mockSignals, mockBudgets, true);
    // All three entrypoints should appear
    expect(output).toContain('`src/cli/main.ts`');
    expect(output).toContain('`src/scanner/index.ts`');
    expect(output).toContain('`src/parser/index.ts`');
  // No canonical truncation notice when fullSignals is true
  expect(output).not.toMatch(/Truncated by budget; rerun with --full-signals/);
    // All public API items
    expect(output).toContain('`src/parser/index.ts`');
    // All fan‑in hubs
    expect(output).toContain('`src/scanner/scan.ts`');
  });

  it('renders empty blocks when arrays are empty', () => {
    const emptySignals: SignalsResult = {
      files: [],
      entrypoints: [],
      publicApi: [],
      hubsFanIn: [],
      hubsFanOut: [],
      warnings: [],
    };
    const output = renderSummary(emptySignals, mockBudgets, false);
    // Should still contain section headers
    expect(output).toContain('## Entrypoints & Public Surface');
    expect(output).toContain('## Graph Hubs (Fan‑in / Fan‑out)');
    // No sub‑headers because there is no data
    expect(output).not.toContain('### Entrypoints');
    expect(output).not.toContain('### Public API');
    expect(output).not.toContain('### Fan‑in Hubs');
    expect(output).not.toContain('### Fan‑out Hubs');
  });

  it('produces deterministic output (same input → same string)', () => {
    const out1 = renderSummary(mockSignals, mockBudgets, false);
    const out2 = renderSummary(mockSignals, mockBudgets, false);
    expect(out1).toBe(out2);
  });
});