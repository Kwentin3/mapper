import type { AssertionKind, SignalKind, SummaryItem } from '../signals/types.js';

export const AGENT_SNAPSHOT_SCHEMA_V1 = 'mapper.agent.v1' as const;
export const AGENT_DIFF_SCHEMA_V1 = 'mapper.diff.v1' as const;

export interface AgentSignalV1 {
  kind: SignalKind;
  code: string;
  assertionKind?: AssertionKind;
}

export interface AgentFileV1 {
  /** Stable file identifier (repo-relative POSIX path). */
  id: string;
  path: string;
  ext: string;
  depth: number;
  loc?: number;
  exportCount?: number;
  signals: AgentSignalV1[];
}

export interface AgentNodeV1 {
  id: string;
  fanIn: number;
  fanOut: number;
  externals: string[];
}

export interface AgentEdgeV1 {
  /** Stable edge identifier. */
  id: string;
  from: string;
  to: string;
}

export interface AgentSnapshotV1 {
  schemaVersion: typeof AGENT_SNAPSHOT_SCHEMA_V1;
  profile: string;
  view: {
    fullSignals: boolean;
    budget: 'small' | 'default' | 'large';
    focus?: string;
    focusFile?: string;
    focusDepth?: number;
    depth?: number;
    showOrphans: boolean;
    showTemp: boolean;
  };
  stats: {
    fileCount: number;
    nodeCount: number;
    edgeCount: number;
    cycleCount: number;
    warningCount: number;
  };
  files: AgentFileV1[];
  graph: {
    nodes: AgentNodeV1[];
    edges: AgentEdgeV1[];
    cycles: string[][];
  };
  summary: {
    entrypoints: SummaryItem[];
    publicApi: SummaryItem[];
    hubsFanIn: SummaryItem[];
    hubsFanOut: SummaryItem[];
  };
  warnings: string[];
}

export interface AgentSignalDeltaV1 {
  file: string;
  kind: SignalKind;
  code: string;
}

export interface AgentDiffV1 {
  schemaVersion: typeof AGENT_DIFF_SCHEMA_V1;
  base: {
    schemaVersion: string;
    stats: AgentSnapshotV1['stats'];
  };
  head: {
    schemaVersion: string;
    stats: AgentSnapshotV1['stats'];
  };
  delta: {
    fileCount: number;
    nodeCount: number;
    edgeCount: number;
    warningCount: number;
  };
  changes: {
    filesAdded: string[];
    filesRemoved: string[];
    edgesAdded: string[];
    edgesRemoved: string[];
    signalsAdded: AgentSignalDeltaV1[];
    signalsRemoved: AgentSignalDeltaV1[];
    entrypointsAdded: string[];
    entrypointsRemoved: string[];
    publicApiAdded: string[];
    publicApiRemoved: string[];
    hubsFanInAdded: string[];
    hubsFanInRemoved: string[];
    hubsFanOutAdded: string[];
    hubsFanOutRemoved: string[];
  };
}
