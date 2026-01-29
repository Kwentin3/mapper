import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';
import type { DependencyGraph } from '../src/graph/types.js';
import type { ParseFileResult } from '../src/parser/types.js';

describe('signals_inline_basic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('detects CYCLE risk', () => {
    const input: ComputeSignalsInput = {
      files: ['src/a.ts', 'src/b.ts'],
      graph: {
        nodes: new Map([
          ['src/a.ts', { id: 'src/a.ts', outgoing: new Set(['src/b.ts']), incoming: new Set(['src/b.ts']), externals: new Set() }],
          ['src/b.ts', { id: 'src/b.ts', outgoing: new Set(['src/a.ts']), incoming: new Set(['src/a.ts']), externals: new Set() }],
        ]),
        cycles: [['src/a.ts', 'src/b.ts']],
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
    const fileA = result.files.find(f => f.file === 'src/a.ts');
    const fileB = result.files.find(f => f.file === 'src/b.ts');

  expect(fileA?.inline).toContainEqual({ kind: 'risk', code: 'CYCLE' });
  expect(fileB?.inline).toContainEqual({ kind: 'risk', code: 'CYCLE' });
  });

  it('detects PARSE-ERROR hint', () => {
    const input: ComputeSignalsInput = {
      files: ['src/error.ts'],
      graph: {
        nodes: new Map([
          ['src/error.ts', { id: 'src/error.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/error.ts', edges: [], warnings: ['SyntaxError: Unexpected token'] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

  const result = computeSignals(input);
  const file = result.files.find(f => f.file === 'src/error.ts');
  expect(file?.inline).toContainEqual({ kind: 'hint', code: 'PARSE-ERROR:SYNTAX' });
  });

  it('detects DYNAMIC-IMPORT hint', () => {
    const input: ComputeSignalsInput = {
      files: ['src/dynamic.ts'],
      graph: {
        nodes: new Map([
          ['src/dynamic.ts', { id: 'src/dynamic.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        {
          file: 'src/dynamic.ts',
          edges: [
            { from: 'src/dynamic.ts', specifier: './module', kind: 'dynamic', isTypeOnly: false },
          ],
          warnings: [],
        },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/dynamic.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'DYNAMIC-IMPORT' });
  });

  it('detects ORPHAN context', () => {
    const input: ComputeSignalsInput = {
      files: ['src/orphan.ts'],
      graph: {
        nodes: new Map([
          ['src/orphan.ts', { id: 'src/orphan.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/orphan.ts', edges: [], warnings: [] },
      ],
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/orphan.ts');
    expect(file?.inline).toContainEqual({ kind: 'context', code: 'ORPHAN' });
  });

  it('detects GOD-MODULE hint when fan-in exceeds threshold', () => {
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

  it('detects DEEP-PATH hint when depth exceeds threshold', () => {
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
      fileMeta: { 'src/deep.ts': { depth: 5 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/deep.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'DEEP-PATH' });
  });

  it('detects BARREL-HELL hint when export count exceeds threshold', () => {
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
      fileMeta: { 'src/barrel.ts': { depth: 0, exportCount: 15 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/barrel.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'BARREL-HELL' });
  });

  it('detects BIG hint when LOC exceeds threshold', () => {
    const input: ComputeSignalsInput = {
      files: ['src/big.ts'],
      graph: {
        nodes: new Map([
          ['src/big.ts', { id: 'src/big.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() }],
        ]),
        cycles: [],
      },
      parseResults: [
        { file: 'src/big.ts', edges: [], warnings: [] },
      ],
      fileMeta: { 'src/big.ts': { depth: 0, loc: 500 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/big.ts');
    expect(file?.inline).toContainEqual({ kind: 'hint', code: 'BIG' });
  });

  it('respects inlinePerFileMax budget', () => {
    const input: ComputeSignalsInput = {
      files: ['src/many.ts'],
      graph: {
        nodes: new Map([
          ['src/many.ts', { id: 'src/many.ts', outgoing: new Set(), incoming: new Set(['a.ts']), externals: new Set() }],
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
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 2 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/many.ts');
    // Should have exactly 2 signals (due to budget)
    expect(file?.inline.length).toBe(2);
    // The first two signals added (CYCLE, PARSE-ERROR) should be present
  expect(file?.inline.map(s => s.code)).toEqual(['CYCLE', 'PARSE-ERROR:SYNTAX']);
  });
});