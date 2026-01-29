import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';

describe('signals_hubs_summary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('computes fan‑in hubs with correct scores', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(), incoming: new Set(['x.ts', 'y.ts']), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(), incoming: new Set(['x.ts']), externals: new Set() }],
          ['src/c.ts', { id: 'src/c.ts', outgoing: new Set(), incoming: new Set(['x.ts', 'y.ts', 'z.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
        { file: 'src/c.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    expect(result.hubsFanIn).toHaveLength(3);
    // Order should be descending by score (fan‑in)
    expect(result.hubsFanIn[0].file).toBe('src/c.ts');
    expect(result.hubsFanIn[0].score).toBe(3);
    expect(result.hubsFanIn[0].reason).toBe('Fan‑in 3');
    expect(result.hubsFanIn[1].file).toBe('src/a.ts');
    expect(result.hubsFanIn[1].score).toBe(2);
    expect(result.hubsFanIn[1].reason).toBe('Fan‑in 2');
    expect(result.hubsFanIn[2].file).toBe('src/b.ts');
    expect(result.hubsFanIn[2].score).toBe(1);
    expect(result.hubsFanIn[2].reason).toBe('Fan‑in 1');
  });

  it('computes fan‑out hubs with correct scores', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['x.ts', 'y.ts']), incoming: new Set(), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/c.ts', { id: 'src/c.ts', outgoing: new Set(['x.ts', 'y.ts', 'z.ts']), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
        { file: 'src/c.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    expect(result.hubsFanOut).toHaveLength(3);
    // Order should be descending by score (fan‑out)
    expect(result.hubsFanOut[0].file).toBe('src/c.ts');
    expect(result.hubsFanOut[0].score).toBe(3);
    expect(result.hubsFanOut[0].reason).toBe('Fan‑out 3');
    expect(result.hubsFanOut[1].file).toBe('src/a.ts');
    expect(result.hubsFanOut[1].score).toBe(2);
    expect(result.hubsFanOut[1].reason).toBe('Fan‑out 2');
    expect(result.hubsFanOut[2].file).toBe('src/b.ts');
    expect(result.hubsFanOut[2].score).toBe(1);
    expect(result.hubsFanOut[2].reason).toBe('Fan‑out 1');
  });

  it('does not include files with zero fan‑in/out in hubs', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['x.ts']), incoming: new Set(['y.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Only src/b.ts qualifies for both hubs
    expect(result.hubsFanIn).toHaveLength(1);
    expect(result.hubsFanIn[0].file).toBe('src/b.ts');
    expect(result.hubsFanOut).toHaveLength(1);
    expect(result.hubsFanOut[0].file).toBe('src/b.ts');
  });

  it('correctly ties score ranking by file path', () => {
    const input: ComputeSignalsInput = {
      files: ['src/b.ts', 'src/a.ts'], // order intentionally unsorted
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['x.ts']), incoming: new Set(['y.ts']), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['x.ts']), incoming: new Set(['y.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Both have same fan‑in = 1, fan‑out = 1
    // Ranking by score (equal) then by file path (stableStringCompare)
    // 'src/a.ts' < 'src/b.ts' lexicographically, so a comes first
    expect(result.hubsFanIn.map(item => item.file)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.hubsFanOut.map(item => item.file)).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('includes entrypoints and public‑api summaries', () => {
    const input: ComputeSignalsInput = {
      files: ['src/entry.ts', 'src/api.ts', 'src/ordinary.ts'],
      graph: {
        nodes: new Map([
          ['src/entry.ts', { id: 'src/entry.ts', outgoing: new Set(['x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/api.ts', { id: 'src/api.ts', outgoing: new Set(), incoming: new Set(['x.ts', 'y.ts']), externals: new Set() }],
          ['src/ordinary.ts', { id: 'src/ordinary.ts', outgoing: new Set(['x.ts']), incoming: new Set(['y.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/entry.ts', edges: [], warnings: [] },
        { file: 'src/api.ts', edges: [], warnings: [] },
        { file: 'src/ordinary.ts', edges: [], warnings: [] },
      ],
      fileMeta: {
        'src/api.ts': { depth: 0, exportCount: 8 },
        'src/ordinary.ts': { depth: 0, exportCount: 2 },
      },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // entrypoints: only src/entry.ts (fan‑in 0, fan‑out > 0)
    expect(result.entrypoints).toHaveLength(1);
    expect(result.entrypoints[0].file).toBe('src/entry.ts');
    expect(result.entrypoints[0].reason).toBe('fan-in is 0, imports others');
    expect(result.entrypoints[0].score).toBe(1); // fan‑out = 1

    // publicApi: src/api.ts (fan‑in 2, exportCount 8) and src/ordinary.ts (fan‑in 1, exportCount 2)
    // ranking by score (fan‑in + exportCount)
    expect(result.publicApi).toHaveLength(2);
    expect(result.publicApi[0].file).toBe('src/api.ts');
    expect(result.publicApi[0].score).toBe(2 + 8); // 10
    expect(result.publicApi[0].reason).toBe('Fan‑in 2, exports 8');
    expect(result.publicApi[1].file).toBe('src/ordinary.ts');
    expect(result.publicApi[1].score).toBe(1 + 2); // 3
    expect(result.publicApi[1].reason).toBe('Fan‑in 1, exports 2');
  });
});