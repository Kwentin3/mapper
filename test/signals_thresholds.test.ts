import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';

describe('signals_thresholds', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('does NOT emit BIG when LOC is below threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/small.ts'],
      graph: {
        nodes: new Map([
          ['src/small.ts', { id: 'src/small.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/small.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/small.ts': { depth: 0, loc: 250 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/small.ts');
    expect(file?.inline).not.toContainEqual({ kind: 'hint', code: 'BIG' });
  });

  it('emits BIG when LOC equals threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/exact.ts'],
      graph: {
        nodes: new Map([
          ['src/exact.ts', { id: 'src/exact.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/exact.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/exact.ts': { depth: 0, loc: 300 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/exact.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'BIG' });
  });

  it('does NOT emit GOD-MODULE when fan‑in equals threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/god.ts'],
      graph: {
        nodes: new Map([
          ['src/god.ts', {
            id: 'src/god.ts',
            outgoing: new Set(),
            incoming: new Set(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts', 'i.ts', 'j.ts', 'k.ts', 'l.ts', 'm.ts', 'n.ts', 'o.ts']),
            externals: new Set(),
          }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/god.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/god.ts');
    expect(file?.inline).not.toContainEqual({ kind: 'hint', code: 'GOD-MODULE' });
  });

  it('emits GOD-MODULE when fan‑in exceeds threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/god.ts'],
      graph: {
        nodes: new Map([
          ['src/god.ts', {
            id: 'src/god.ts',
            outgoing: new Set(),
            incoming: new Set(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts', 'i.ts', 'j.ts', 'k.ts', 'l.ts', 'm.ts', 'n.ts', 'o.ts', 'p.ts']),
            externals: new Set(),
          }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/god.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/god.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'GOD-MODULE' });
  });

  it('does NOT emit DEEP-PATH when depth equals threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/deep.ts'],
      graph: {
        nodes: new Map([
          ['src/deep.ts', { id: 'src/deep.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/deep.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/deep.ts': { depth: 3 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/deep.ts');
    expect(file?.inline).not.toContainEqual({ kind: 'hint', code: 'DEEP-PATH' });
  });

  it('emits DEEP-PATH when depth exceeds threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/deep.ts'],
      graph: {
        nodes: new Map([
          ['src/deep.ts', { id: 'src/deep.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/deep.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/deep.ts': { depth: 4 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/deep.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'DEEP-PATH' });
  });

  it('does NOT emit BARREL-HELL when export count equals threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/barrel.ts'],
      graph: {
        nodes: new Map([
          ['src/barrel.ts', { id: 'src/barrel.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/barrel.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/barrel.ts': { depth: 0, exportCount: 10 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/barrel.ts');
    expect(file?.inline).not.toContainEqual({ kind: 'hint', code: 'BARREL-HELL' });
  });

  it('emits BARREL-HELL when export count exceeds threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/barrel.ts'],
      graph: {
        nodes: new Map([
          ['src/barrel.ts', { id: 'src/barrel.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/barrel.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/barrel.ts': { depth: 0, exportCount: 11 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/barrel.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'BARREL-HELL' });
  });
});