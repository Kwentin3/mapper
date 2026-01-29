import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';

describe('signals_budgeting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('respects entrypointsTopN budget', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['src/x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['src/x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/c.ts', { id: 'src/c.ts', outgoing: new Set(['src/x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/d.ts', { id: 'src/d.ts', outgoing: new Set(['src/x.ts']), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
        { file: 'src/c.ts', edges: [], warnings: [] },
        { file: 'src/d.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 2, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Should have exactly 2 entrypoints (top‑N by score)
    expect(result.entrypoints).toHaveLength(2);
    // The entrypoints should be the ones with highest fan‑out (all equal in this case)
    // Tie‑breaking by file path; expect 'src/a.ts' and 'src/b.ts' because they are first after sorting?
    // The ranking uses score (fan‑out) which is 1 for all, then stableStringCompare.
    // Since we don't care which two, just ensure length.
  });

  it('respects publicApiTopN budget', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(), incoming: new Set(['src/x.ts']), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(), incoming: new Set(['src/x.ts', 'src/y.ts']), externals: new Set() }],
          ['src/c.ts', { id: 'src/c.ts', outgoing: new Set(), incoming: new Set(['src/x.ts', 'src/y.ts', 'src/z.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
        { file: 'src/c.ts', edges: [], warnings: [] },
      ],
      fileMeta: {
        'src/a.ts': { depth: 0, exportCount: 5 },
        'src/b.ts': { depth: 0, exportCount: 10 },
        'src/c.ts': { depth: 0, exportCount: 15 },
      },
      budgets: { entrypointsTopN: 5, publicApiTopN: 1, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Should have exactly 1 publicApi item (top‑N by score)
    expect(result.publicApi).toHaveLength(1);
    // The highest score is src/c.ts (fan‑in 3 + exportCount 15 = 18)
    expect(result.publicApi[0].file).toBe('src/c.ts');
  });

  it('respects hubsTopN budget for fan‑in hubs', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(), incoming: new Set(['x.ts']), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(), incoming: new Set(['x.ts', 'y.ts']), externals: new Set() }],
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
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 2, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Should have exactly 2 hubsFanIn items
    expect(result.hubsFanIn).toHaveLength(2);
    // The two with highest fan‑in are src/c.ts (3) and src/b.ts (2)
    const files = result.hubsFanIn.map(item => item.file);
    expect(files).toContain('src/c.ts');
    expect(files).toContain('src/b.ts');
  });

  it('respects hubsTopN budget for fan‑out hubs', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['x.ts', 'y.ts']), incoming: new Set(), externals: new Set() }],
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
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 2, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    // Should have exactly 2 hubsFanOut items
    expect(result.hubsFanOut).toHaveLength(2);
    // The two with highest fan‑out are src/c.ts (3) and src/b.ts (2)
    const files = result.hubsFanOut.map(item => item.file);
    expect(files).toContain('src/c.ts');
    expect(files).toContain('src/b.ts');
  });

  it('respects inlinePerFileMax budget across multiple signal kinds', () => {
    const input: ComputeSignalsInput = {
      files: ['src/many.ts'],
      graph: {
        nodes: new Map([
          ['src/many.ts', {
            id: 'src/many.ts',
            outgoing: new Set(),
            incoming: new Set(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts', 'i.ts', 'j.ts', 'k.ts', 'l.ts', 'm.ts', 'n.ts', 'o.ts', 'p.ts']),
            externals: new Set(),
          }],
        ]),
        cycles: [['src/many.ts']],
      },
      parseResults: [
        {
          file: 'src/many.ts',
          edges: [{ from: 'src/many.ts', specifier: './x', kind: 'dynamic', isTypeOnly: false }],
          warnings: ['parse error'],
        },
      ],
      fileMeta: { 'src/many.ts': { depth: 5, loc: 500, exportCount: 20 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 3 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/many.ts');
    expect(file?.inline.length).toBe(3);
  // The first three signals added are CYCLE (risk), PARSE-ERROR:<CATEGORY> (hint), DYNAMIC-IMPORT (hint)
  const codes = file?.inline.map(s => s.code);
  expect(codes).toEqual(['CYCLE', 'PARSE-ERROR:SYNTAX', 'DYNAMIC-IMPORT']);
  });

  it('returns empty arrays when budgets are zero', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['x.ts']), incoming: new Set(), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(), incoming: new Set(['x.ts']), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/a.ts', edges: [], warnings: [] },
        { file: 'src/b.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/b.ts': { depth: 0, exportCount: 12 } },
      budgets: { entrypointsTopN: 0, publicApiTopN: 0, hubsTopN: 0, inlinePerFileMax: 0 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    expect(result.entrypoints).toHaveLength(0);
    expect(result.publicApi).toHaveLength(0);
    expect(result.hubsFanIn).toHaveLength(0);
    expect(result.hubsFanOut).toHaveLength(0);
    // inline signals should be empty because inlinePerFileMax = 0
    const fileA = result.files.find(f => f.file === 'src/a.ts');
    expect(fileA?.inline).toHaveLength(0);
  });
});