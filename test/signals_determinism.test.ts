import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';
import { stableJsonStringify } from '../src/utils/determinism.js';

describe('signals_determinism', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  const baseInput: ComputeSignalsInput = {
    files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
    graph: {
      nodes: new Map([
        ['src/a.ts', { id: 'src/a.ts', outgoing: new Set<string>(['src/b.ts']), incoming: new Set<string>(['src/c.ts']), externals: new Set<string>() }],
        ['src/b.ts', { id: 'src/b.ts', outgoing: new Set<string>(['src/c.ts']), incoming: new Set<string>(['src/a.ts']), externals: new Set<string>() }],
        ['src/c.ts', { id: 'src/c.ts', outgoing: new Set<string>(['src/a.ts']), incoming: new Set<string>(['src/b.ts']), externals: new Set<string>() }],
      ]),
      cycles: [['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/a.ts']],
    },
    parseResults: [
      { file: 'src/a.ts', edges: [], warnings: [] },
      { file: 'src/b.ts', edges: [], warnings: [] },
      { file: 'src/c.ts', edges: [], warnings: ['Syntax error'] },
    ],
    fileMeta: {
      'src/a.ts': { depth: 1, loc: 200 },
      'src/b.ts': { depth: 2, loc: 400 },
      'src/c.ts': { depth: 3, exportCount: 12 },
    },
    budgets: { entrypointsTopN: 2, publicApiTopN: 2, hubsTopN: 2, inlinePerFileMax: 5 },
    thresholds: { bigLoc: 300, godFanIn: 10, deepPath: 2, barrelExports: 10 },
  };

  it('produces identical output on repeated calls', () => {
    const result1 = computeSignals(baseInput);
    const result2 = computeSignals(baseInput);
    const json1 = stableJsonStringify(result1);
    const json2 = stableJsonStringify(result2);
    expect(json1).toBe(json2);
  });

  it('produces identical output when files are reordered', () => {
    const reorderedInput: ComputeSignalsInput = {
      ...baseInput,
      files: ['src/c.ts', 'src/a.ts', 'src/b.ts'], // different order
    };
    const result1 = computeSignals(baseInput);
    const result2 = computeSignals(reorderedInput);
    const json1 = stableJsonStringify(result1);
    const json2 = stableJsonStringify(result2);
    expect(json1).toBe(json2);
  });

  it('produces identical output when parseResults order differs', () => {
    // parseResults order does not affect logic because we look up by file
    const shuffledParseResults = [...baseInput.parseResults].reverse();
    const shuffledInput: ComputeSignalsInput = {
      ...baseInput,
      parseResults: shuffledParseResults,
    };
    const result1 = computeSignals(baseInput);
    const result2 = computeSignals(shuffledInput);
    const json1 = stableJsonStringify(result1);
    const json2 = stableJsonStringify(result2);
    expect(json1).toBe(json2);
  });

  it('produces identical output when node map iteration order differs', () => {
    // Create a map with different insertion order using the same node objects
    const originalEntries = Array.from(baseInput.graph.nodes.entries());
    const reversedEntries = originalEntries.reverse();
    const nodes = new Map(reversedEntries);
    const shuffledGraph = { nodes, cycles: baseInput.graph.cycles };
    const shuffledInput: ComputeSignalsInput = {
      ...baseInput,
      graph: shuffledGraph,
    };
    const result1 = computeSignals(baseInput);
    const result2 = computeSignals(shuffledInput);
    const json1 = stableJsonStringify(result1);
    const json2 = stableJsonStringify(result2);
    expect(json1).toBe(json2);
  });

  it('produces identical output when budgets are zero', () => {
    const zeroBudgetInput: ComputeSignalsInput = {
      ...baseInput,
      budgets: { entrypointsTopN: 0, publicApiTopN: 0, hubsTopN: 0, inlinePerFileMax: 0 },
    };
    const result1 = computeSignals(zeroBudgetInput);
    const result2 = computeSignals(zeroBudgetInput);
    const json1 = stableJsonStringify(result1);
    const json2 = stableJsonStringify(result2);
    expect(json1).toBe(json2);
  });

  it('maintains deterministic ordering of inline signals within a file', () => {
    // Create a file that triggers multiple signals; ensure they appear in the same order
    const input: ComputeSignalsInput = {
      files: ['src/multi.ts'],
      graph: {
        nodes: new Map([
          ['src/multi.ts', {
            id: 'src/multi.ts',
            outgoing: new Set<string>(),
            incoming: new Set<string>(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts', 'i.ts', 'j.ts', 'k.ts', 'l.ts', 'm.ts', 'n.ts', 'o.ts', 'p.ts']),
            externals: new Set<string>(),
          }],
        ]),
        cycles: [['src/multi.ts']],
      },
      parseResults: [
        {
          file: 'src/multi.ts',
          edges: [{ from: 'src/multi.ts', specifier: './x', kind: 'dynamic', isTypeOnly: false }],
          warnings: ['parse error'],
        },
      ],
      fileMeta: { 'src/multi.ts': { depth: 5, loc: 500, exportCount: 20 } },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };
    const result = computeSignals(input);
    const file = result.files.find(f => f.file === 'src/multi.ts');
    const signalCodes = file?.inline.map(s => s.code);
  // Expected order: CYCLE, PARSE-ERROR:<CATEGORY>, DYNAMIC-IMPORT, GOD-MODULE, DEEP-PATH, BARREL-HELL, BIG, PUBLIC-API
  // (ORPHAN not triggered because fan‑in > 0)
  expect(signalCodes).toEqual(['CYCLE', 'PARSE-ERROR:SYNTAX', 'DYNAMIC-IMPORT', 'GOD-MODULE', 'DEEP-PATH', 'BARREL-HELL', 'BIG', 'PUBLIC-API']);
  });
});