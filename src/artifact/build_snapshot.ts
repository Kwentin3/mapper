import type { DependencyGraph } from '../graph/types.js';
import type { Profile } from '../config/profiles.js';
import type { SignalsResult, Signal } from '../signals/types.js';
import { stableSort, stableStringCompare } from '../utils/determinism.js';
import type { AgentEdgeV1, AgentFileV1, AgentNodeV1, AgentSignalV1, AgentSnapshotV1 } from './types.js';
import { AGENT_SNAPSHOT_SCHEMA_V1 } from './types.js';

type SnapshotOptions = {
  fullSignals?: boolean;
  budget?: 'small' | 'default' | 'large';
  focus?: string;
  focusFile?: string;
  focusDepth?: number;
  depth?: number;
  showOrphans?: boolean;
  showTemp?: boolean;
};

function signalKindOrder(kind: Signal['kind']): number {
  switch (kind) {
    case 'risk':
      return 0;
    case 'hint':
      return 1;
    case 'context':
      return 2;
    case 'nav':
      return 3;
    default:
      return 99;
  }
}

function sortSignalsDeterministically(signals: Signal[]): AgentSignalV1[] {
  return stableSort(
    signals.map(s => ({ ...s })),
    (a, b) =>
      signalKindOrder(a.kind) - signalKindOrder(b.kind) ||
      stableStringCompare(a.code, b.code) ||
      stableStringCompare(a.assertionKind ?? '', b.assertionKind ?? '')
  );
}

function toExtension(path: string): string {
  const dot = path.lastIndexOf('.');
  if (dot < 0 || dot === path.length - 1) return '';
  return path.slice(dot + 1).toLowerCase();
}

function buildFiles(
  files: string[],
  fileMeta: Record<string, { depth: number; loc?: number; exportCount?: number }>,
  signals: SignalsResult
): AgentFileV1[] {
  const signalMap = new Map(signals.files.map(fs => [fs.file, fs.inline] as const));
  const sortedFiles = stableSort([...files], stableStringCompare);
  return sortedFiles.map(file => {
    const meta = fileMeta[file] ?? { depth: 0 };
    return {
      id: file,
      path: file,
      ext: toExtension(file),
      depth: meta.depth,
      loc: meta.loc,
      exportCount: meta.exportCount,
      signals: sortSignalsDeterministically(signalMap.get(file) ?? []),
    };
  });
}

function buildNodes(graph: DependencyGraph): AgentNodeV1[] {
  const nodes: AgentNodeV1[] = [];
  for (const [id, node] of graph.nodes.entries()) {
    nodes.push({
      id,
      fanIn: node.incoming.size,
      fanOut: node.outgoing.size,
      externals: stableSort(Array.from(node.externals), stableStringCompare),
    });
  }
  return stableSort(nodes, (a, b) => stableStringCompare(a.id, b.id));
}

function buildEdges(graph: DependencyGraph): AgentEdgeV1[] {
  const edges: AgentEdgeV1[] = [];
  for (const [from, node] of graph.nodes.entries()) {
    for (const to of node.outgoing) {
      if (!graph.nodes.has(to)) continue;
      edges.push({
        id: `${from}->${to}`,
        from,
        to,
      });
    }
  }
  return stableSort(edges, (a, b) => stableStringCompare(a.from, b.from) || stableStringCompare(a.to, b.to));
}

export function buildAgentSnapshot(input: {
  opts: SnapshotOptions;
  profile: Profile;
  files: string[];
  fileMeta: Record<string, { depth: number; loc?: number; exportCount?: number }>;
  signals: SignalsResult;
  graph: DependencyGraph;
  warnings: string[];
}): AgentSnapshotV1 {
  const { opts, profile, files, fileMeta, signals, graph, warnings } = input;
  const nodes = buildNodes(graph);
  const edges = buildEdges(graph);
  const artifactFiles = buildFiles(files, fileMeta, signals);

  return {
    schemaVersion: AGENT_SNAPSHOT_SCHEMA_V1,
    profile: profile.id,
    view: {
      fullSignals: opts.fullSignals === true,
      budget: opts.budget ?? 'default',
      focus: opts.focus,
      focusFile: opts.focusFile,
      focusDepth: opts.focusDepth,
      depth: opts.depth,
      showOrphans: opts.showOrphans === true,
      showTemp: opts.showTemp === true,
    },
    stats: {
      fileCount: artifactFiles.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      cycleCount: graph.cycles.length,
      warningCount: warnings.length,
    },
    files: artifactFiles,
    graph: {
      nodes,
      edges,
      cycles: graph.cycles.map(cycle => [...cycle]),
    },
    summary: {
      entrypoints: signals.entrypoints.map(item => ({ ...item })),
      publicApi: signals.publicApi.map(item => ({ ...item })),
      hubsFanIn: signals.hubsFanIn.map(item => ({ ...item })),
      hubsFanOut: signals.hubsFanOut.map(item => ({ ...item })),
    },
    warnings: [...warnings],
  };
}
