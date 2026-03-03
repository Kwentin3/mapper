import { stableSort, stableStringCompare } from '../utils/determinism.js';
import type { AgentDiffV1, AgentSignalDeltaV1, AgentSnapshotV1 } from './types.js';
import { AGENT_DIFF_SCHEMA_V1, AGENT_SNAPSHOT_SCHEMA_V1 } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asSet(values: string[]): Set<string> {
  return new Set(values);
}

function diffStringSets(base: Set<string>, head: Set<string>): { added: string[]; removed: string[] } {
  const added = stableSort(Array.from(head).filter(v => !base.has(v)), stableStringCompare);
  const removed = stableSort(Array.from(base).filter(v => !head.has(v)), stableStringCompare);
  return { added, removed };
}

function signalKey(signal: AgentSignalDeltaV1): string {
  return `${signal.file}|${signal.kind}|${signal.code}`;
}

function buildSignalIndex(snapshot: AgentSnapshotV1): Map<string, AgentSignalDeltaV1> {
  const map = new Map<string, AgentSignalDeltaV1>();
  for (const file of snapshot.files) {
    for (const signal of file.signals) {
      const value: AgentSignalDeltaV1 = {
        file: file.path,
        kind: signal.kind,
        code: signal.code,
      };
      map.set(signalKey(value), value);
    }
  }
  return map;
}

function summaryFiles(items: Array<{ file: string }>): Set<string> {
  return new Set(items.map(item => item.file));
}

export function assertAgentSnapshot(value: unknown): asserts value is AgentSnapshotV1 {
  if (!isRecord(value)) {
    throw new Error('Error: invalid artifact JSON shape (expected object).');
  }
  const maybe = value;
  if (maybe.schemaVersion !== AGENT_SNAPSHOT_SCHEMA_V1) {
    throw new Error(`Error: unsupported artifact schemaVersion: ${String(maybe.schemaVersion)}.`);
  }
  if (!Array.isArray(maybe.files) || !isRecord(maybe.graph)) {
    throw new Error('Error: invalid artifact JSON shape (missing files/graph).');
  }
  const graph = maybe.graph;
  if (!Array.isArray(graph.edges) || !Array.isArray(graph.nodes)) {
    throw new Error('Error: invalid artifact JSON shape (missing graph arrays).');
  }
  for (const edge of graph.edges) {
    if (!isRecord(edge) || typeof edge.id !== 'string') {
      throw new Error('Error: invalid artifact JSON shape (edge.id is required).');
    }
  }

  if (!isRecord(maybe.summary)) {
    throw new Error('Error: invalid artifact JSON shape (missing summary).');
  }
  const summary = maybe.summary;
  const summaryKeys = ['entrypoints', 'publicApi', 'hubsFanIn', 'hubsFanOut'] as const;
  for (const key of summaryKeys) {
    const items = summary[key];
    if (!Array.isArray(items)) {
      throw new Error(`Error: invalid artifact JSON shape (summary.${key} must be an array).`);
    }
    for (const item of items) {
      if (!isRecord(item) || typeof item.file !== 'string') {
        throw new Error(`Error: invalid artifact JSON shape (summary.${key} items require file).`);
      }
    }
  }

  for (const file of maybe.files) {
    if (!isRecord(file) || typeof file.path !== 'string' || !Array.isArray(file.signals)) {
      throw new Error('Error: invalid artifact JSON shape (files[] requires path and signals).');
    }
    for (const signal of file.signals) {
      if (!isRecord(signal) || typeof signal.kind !== 'string' || typeof signal.code !== 'string') {
        throw new Error('Error: invalid artifact JSON shape (file signal requires kind/code).');
      }
    }
  }
}

export function computeArtifactDiff(base: AgentSnapshotV1, head: AgentSnapshotV1): AgentDiffV1 {
  const baseFiles = asSet(base.files.map(file => file.path));
  const headFiles = asSet(head.files.map(file => file.path));

  const baseEdges = asSet(base.graph.edges.map(edge => edge.id));
  const headEdges = asSet(head.graph.edges.map(edge => edge.id));

  const baseSignalIndex = buildSignalIndex(base);
  const headSignalIndex = buildSignalIndex(head);
  const baseSignalKeys = new Set(baseSignalIndex.keys());
  const headSignalKeys = new Set(headSignalIndex.keys());

  const signalAddedKeys = stableSort(
    Array.from(headSignalKeys).filter(key => !baseSignalKeys.has(key)),
    stableStringCompare
  );
  const signalRemovedKeys = stableSort(
    Array.from(baseSignalKeys).filter(key => !headSignalKeys.has(key)),
    stableStringCompare
  );

  const entrypoints = diffStringSets(summaryFiles(base.summary.entrypoints), summaryFiles(head.summary.entrypoints));
  const publicApi = diffStringSets(summaryFiles(base.summary.publicApi), summaryFiles(head.summary.publicApi));
  const hubsFanIn = diffStringSets(summaryFiles(base.summary.hubsFanIn), summaryFiles(head.summary.hubsFanIn));
  const hubsFanOut = diffStringSets(summaryFiles(base.summary.hubsFanOut), summaryFiles(head.summary.hubsFanOut));

  return {
    schemaVersion: AGENT_DIFF_SCHEMA_V1,
    base: {
      schemaVersion: base.schemaVersion,
      stats: { ...base.stats },
    },
    head: {
      schemaVersion: head.schemaVersion,
      stats: { ...head.stats },
    },
    delta: {
      fileCount: head.stats.fileCount - base.stats.fileCount,
      nodeCount: head.stats.nodeCount - base.stats.nodeCount,
      edgeCount: head.stats.edgeCount - base.stats.edgeCount,
      warningCount: head.stats.warningCount - base.stats.warningCount,
    },
    changes: {
      filesAdded: diffStringSets(baseFiles, headFiles).added,
      filesRemoved: diffStringSets(baseFiles, headFiles).removed,
      edgesAdded: diffStringSets(baseEdges, headEdges).added,
      edgesRemoved: diffStringSets(baseEdges, headEdges).removed,
      signalsAdded: signalAddedKeys.map(key => headSignalIndex.get(key)!).filter(Boolean),
      signalsRemoved: signalRemovedKeys.map(key => baseSignalIndex.get(key)!).filter(Boolean),
      entrypointsAdded: entrypoints.added,
      entrypointsRemoved: entrypoints.removed,
      publicApiAdded: publicApi.added,
      publicApiRemoved: publicApi.removed,
      hubsFanInAdded: hubsFanIn.added,
      hubsFanInRemoved: hubsFanIn.removed,
      hubsFanOutAdded: hubsFanOut.added,
      hubsFanOutRemoved: hubsFanOut.removed,
    },
  };
}
