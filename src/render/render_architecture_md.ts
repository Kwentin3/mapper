/**
 * Main entry point for rendering the complete ARCHITECTURE.md content.
 */

import type { RenderInput, RenderOptions, RenderOutput } from './types.js';
import { AI_PREAMBLE } from './preamble.js';
import { renderSummary } from './render_summary.js';
import { renderTree } from './render_tree.js';
import { getBuiltInProfile } from '../config/profiles.js';
import { getViewBudgets } from './budgets.js';
import type { SignalBudgets } from '../signals/types.js';
import { stableStringCompare, stablePathNormalize } from '../utils/determinism.js';
import { classifyPathKind, formatTruncationNotice, formatHubTruncationHint } from './format.js';
import type { DirNode, FileNode } from '../scanner/types.js';
import type { ContractSignal, ContractSignalMap, ContractStatus } from '../signals/contract_types.js';

/**
 * Convert a profile's signal‑budget settings to the SignalBudgets expected by the summary renderer.
 *
 * This mapping is a heuristic; the exact translation should be defined by the architecture.
 * For now we use sensible defaults.
 */
function profileToBudgets(profileId: string): SignalBudgets {
  const profile = getBuiltInProfile(profileId);
  // Use the profile's navigationSignals as a proxy for entrypoints/hubs top‑N.
  const topN = profile.signalBudget.navigationSignals;
  return {
    entrypointsTopN: topN,
    publicApiTopN: topN,
    hubsTopN: topN,
    inlinePerFileMax: profile.signalBudget.structuralRisks,
  };
}

/**
 * Render the entire architecture map as a single markdown string.
 */
export function renderArchitectureMd(
  input: RenderInput,
  opts: RenderOptions = {}
): RenderOutput {
  const { tree, signals, graph } = input;
  const {
    focus,
    depth,
    profile = 'default',
    fullSignals = false,
    collapse = true,
    showOrphans = false,
  } = opts;

  const lines: string[] = [];

  // 1. AI Preamble
  lines.push(AI_PREAMBLE);
  lines.push('');

  // 2. Header summary blocks
  const budgets = profileToBudgets(profile);
  const summary = renderSummary(signals, budgets, fullSignals);
  // If focusFile + capsule depth is active, annotate the summary with the task capsule view line
  if (opts.focusFile) {
    const k = typeof (opts as any).focusDepth === 'number' ? (opts as any).focusDepth : 1;
    lines.push(`(i VIEW: task capsule, focus=${opts.focusFile}, depth=${k})`);
  }
  lines.push(summary);
  lines.push('');

  const contractCoverage = renderContractCoverage(signals?.contractSignals ?? {});
  if (contractCoverage) {
    lines.push(contractCoverage);
    lines.push('');
  }

  // 2b. Local Dependencies (budgeted derived view)
  // Select top M fan-in and top M fan-out hubs deterministically.
    // View-level budgets (list caps, hubs M, deep-dive)
    const viewBudgets = getViewBudgets((opts.budget as any) || 'default', fullSignals);
    const LIST_BUDGET = viewBudgets.LIST_BUDGET;
    const listCap = fullSignals ? Infinity : LIST_BUDGET;

  // Build a render-only hubSet from signals so we can emit HUB-aware hints nearby truncated lists
  const hubSet = new Set<string>();
  if (signals && Array.isArray(signals.hubsFanIn)) {
    for (const h of signals.hubsFanIn) {
      if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize((h.file || '').replace(/\\/g, '/')));
    }
  }
  if (signals && Array.isArray(signals.hubsFanOut)) {
    for (const h of signals.hubsFanOut) {
      if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize((h.file || '').replace(/\\/g, '/')));
    }
  }

  // Normalize graph.nodes into an array of entries for deterministic ranking
  const graphNodesEntries: Array<[string, any]> = [];
  if (graph && graph.nodes) {
    if (graph.nodes instanceof Map) {
      for (const [k, v] of (graph.nodes as Map<string, any>).entries()) graphNodesEntries.push([k, v]);
    } else if (Array.isArray(graph.nodes)) {
      const arr = graph.nodes as any[];
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        graphNodesEntries.push([e[0], e[1]]);
      }
    } else if (typeof graph.nodes === 'object') {
      for (const k of Object.keys(graph.nodes as Record<string, any>).sort()) graphNodesEntries.push([k, (graph.nodes as any)[k]]);
    }
  }

    // 2c. Focused Deep‑Dive for a single file (budgeted)
    // Renders only when opts.focusFile is provided.
    const DEEP_DIVE_BUDGET = viewBudgets.DEEP_DIVE_BUDGET;
    if (opts.focusFile) {
      const normTarget = opts.focusFile.replace(/\\/g, '/');
      // Locate node in graph (graph.nodes may be Map or object)
      let targetNode: any = null;
      if (graph && graph.nodes) {
        if (graph.nodes instanceof Map) targetNode = graph.nodes.get(normTarget);
        else if (typeof graph.nodes === 'object') targetNode = (graph.nodes as any)[normTarget] || null;
      }
      if (targetNode) {
        // Build hub set from signals (render-only tagging)
        const hubSet = new Set<string>();
        if (signals && Array.isArray(signals.hubsFanIn)) {
          for (const h of signals.hubsFanIn) {
            if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize((h.file || '').replace(/\\/g, '/')));
          }
        }
        if (signals && Array.isArray(signals.hubsFanOut)) {
          for (const h of signals.hubsFanOut) {
            if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize((h.file || '').replace(/\\/g, '/')));
          }
        }

        lines.push('## Focused Deep-Dive');
        lines.push('');
        const kind = classifyPathKind(normTarget);
        // If the signals-provided hub set is empty (e.g., due to budgeting),
        // fall back to a conservative graph-derived check: treat any node with
        // non-zero fan-in or fan-out as a hub for render-only tagging. This
        // keeps the UI helpful and deterministic while remaining render-only.
        const normNormTarget = stablePathNormalize(normTarget);
        let hubTag = '';
        if (hubSet.size > 0) {
          hubTag = hubSet.has(normNormTarget) ? ' [HUB]' : '';
        } else {
          const inCount = (targetNode.incoming instanceof Set) ? targetNode.incoming.size : (targetNode.incoming?.length ?? 0);
          const outCount = (targetNode.outgoing instanceof Set) ? targetNode.outgoing.size : (targetNode.outgoing?.length ?? 0);
          hubTag = (inCount > 0 || outCount > 0) ? ' [HUB]' : '';
        }
        lines.push(`\`${normTarget}\` [${kind}]${hubTag}`);
        lines.push('');

        const contractSignal = signals?.contractSignals?.[normTarget];
        if (contractSignal) {
          const inbound = (contractSignal.evidence?.anchorsFound?.inbound ?? []).slice().sort(stableStringCompare);
          const outbound = (contractSignal.evidence?.anchorsFound?.outbound ?? []).slice().sort(stableStringCompare);
          const fmtAnchors = (arr: string[]) => (arr.length > 0 ? arr.join(', ') : '(none)');

          lines.push('### Contract Telemetry');
          lines.push('');
          lines.push(`- Status: ${contractSignal.status}`);
          lines.push(`- Inbound anchors: ${fmtAnchors(inbound)}`);
          lines.push(`- Outbound anchors: ${fmtAnchors(outbound)}`);
          lines.push('');
        }

    const incomingArr: string[] = targetNode ? ((targetNode.incoming instanceof Set) ? Array.from(targetNode.incoming) : (targetNode.incoming ?? [])) : [];
    const outgoingArr: string[] = targetNode ? ((targetNode.outgoing instanceof Set) ? Array.from(targetNode.outgoing) : (targetNode.outgoing ?? [])) : [];
    incomingArr.sort();
    outgoingArr.sort();

        const inCap = opts.fullSignals ? Infinity : DEEP_DIVE_BUDGET;
        const outCap = opts.fullSignals ? Infinity : DEEP_DIVE_BUDGET;
        const inShown = incomingArr.slice(0, inCap === Infinity ? incomingArr.length : inCap);
        const outShown = outgoingArr.slice(0, outCap === Infinity ? outgoingArr.length : outCap);
        const inMore = Math.max(0, incomingArr.length - inShown.length);
        const outMore = Math.max(0, outgoingArr.length - outShown.length);

        const fmt = (arr: string[]) => arr.map(x => `\`${x}\``).join(', ');

        const inLine = inShown.length > 0 ? fmt(inShown) : 'none';
        const outLine = outShown.length > 0 ? fmt(outShown) : 'none';

        lines.push(`- ` + '`←`' + ` Importers (repo-local): ${inLine}`);
        if (!fullSignals && inMore > 0) {
          lines.push(formatTruncationNotice(inMore));
          // If this Local Dependencies entry is a known hub, add the hub-aware hint
          const idNorm = stablePathNormalize(normNormTarget);
          if (hubSet.has(idNorm)) {
            lines.push(formatHubTruncationHint());
          }
        }
        lines.push(`- ` + '`→`' + ` Imports (repo-local): ${outLine}`);
        if (!fullSignals && outMore > 0) {
          lines.push(formatTruncationNotice(outMore));
          const idNorm = stablePathNormalize(normNormTarget);
          if (hubSet.has(idNorm)) {
            lines.push(formatHubTruncationHint());
          }
        }
        lines.push('');
      }
    }

    // Impact Path: trace shortest dependency paths from focusFile to PUBLIC-API files
    // Render-only derived view showing up to PATH_BUDGET distinct PUBLIC-API targets.
    const PATH_BUDGET = 3;
    if (opts.focusFile) {
      const normFocus = opts.focusFile.replace(/\\/g, '/');
      // Identify PUBLIC-API files from signals
      const publicApiFiles = new Set<string>();
      if (signals && Array.isArray(signals.files)) {
        for (const f of signals.files) {
          if (Array.isArray(f.inline) && f.inline.some(s => s.kind === 'nav' && s.code === 'PUBLIC-API')) {
            publicApiFiles.add(f.file.replace(/\\/g, '/'));
          }
        }
      }

      // Build adjacency following outgoing edges (directed)
      const adj = new Map<string, string[]>();
      if (graph && graph.nodes) {
        const entries: Array<[string, any]> = [];
        if (graph.nodes instanceof Map) {
          for (const [k, v] of (graph.nodes as Map<string, any>).entries()) entries.push([k, v]);
        } else if (Array.isArray(graph.nodes)) {
          for (const e of graph.nodes as any[]) entries.push([e[0], e[1]]);
        } else if (typeof graph.nodes === 'object') {
          for (const k of Object.keys(graph.nodes as Record<string, any>).sort()) entries.push([k, (graph.nodes as any)[k]]);
        }
        for (const [id, node] of entries) {
          const idNorm = (id || '').replace(/\\/g, '/');
          const outgoingArr: string[] = node ? ((node.outgoing instanceof Set) ? Array.from(node.outgoing) : (node.outgoing ?? [])) : [];
          const outs = outgoingArr.map((o: string) => (o || '').replace(/\\/g, '/')).filter((o: string) => o !== '');
          outs.sort();
          adj.set(idNorm, outs);
        }
      }

      // Helper: BFS to find shortest path from start to target following adj (directed)
      function bfsPath(start: string, target: string): string[] | null {
        if (start === target) return [start];
        const q: string[] = [start];
        const parent = new Map<string, string | null>();
        parent.set(start, null);
        while (q.length > 0) {
          const cur = q.shift()!;
          const neigh = adj.get(cur) || [];
          for (const nb of neigh) {
            if (!parent.has(nb)) {
              parent.set(nb, cur);
              if (nb === target) {
                // Reconstruct path
                const path: string[] = [];
                let cur2: string | null = nb;
                while (cur2) {
                  path.push(cur2);
                  cur2 = parent.get(cur2) || null;
                }
                path.reverse();
                return [start].concat(path.slice(1));
              }
              q.push(nb);
            }
          }
        }
        return null;
      }

      // For each PUBLIC-API, find shortest path (if reachable)
      const candidates: Array<{ target: string; path: string[] }> = [];
      const sortedPublics = Array.from(publicApiFiles).sort();
      for (const p of sortedPublics) {
        const path = bfsPath(normFocus, p);
        if (path) candidates.push({ target: p, path });
      }

      // Sort paths by length then lexicographically by the rendered path string
      // Use the same join token used when rendering so tie-breakers match
      candidates.sort((a, b) => {
        if (a.path.length !== b.path.length) return a.path.length - b.path.length;
        const as = a.path.map(x => x.replace(/\\/g, '/')).join(' → ');
        const bs = b.path.map(x => x.replace(/\\/g, '/')).join(' → ');
        return stableStringCompare(as, bs);
      });

      lines.push('## Impact Path');
      lines.push('');
      if (candidates.length === 0) {
        lines.push(`No PUBLIC-API reachable from ${normFocus}.`);
        lines.push('');
      } else {
        const showAll = !!opts.fullSignals;
        const toShow = showAll ? candidates : candidates.slice(0, PATH_BUDGET);
        for (const c of toShow) {
          const fmt = c.path.map(x => `\`${x}\``).join(' → ');
          lines.push(`${fmt} (→ PUBLIC-API)`);
        }
        if (!showAll && candidates.length > PATH_BUDGET) {
          const more = candidates.length - PATH_BUDGET;
          lines.push('');
          if (!fullSignals && more > 0) lines.push(formatTruncationNotice(more));
        }
        lines.push('');
      }
    }

  // If signals.files are present, ensure any file mentioned there is included so
  // rendering remains stable across input representation transformations
  if (signals && Array.isArray(signals.files) && signals.files.length > 0) {
    for (const f of signals.files) {
      if (!graphNodesEntries.some(e => e[0] === f.file)) {
        graphNodesEntries.push([f.file, { incoming: [], outgoing: [] }]);
      }
    }
  }

  if (graphNodesEntries.length > 0) {
    // Compute ranking for fan-in and fan-out
    const byIn = [...graphNodesEntries].sort((a, b) => {
      const ai = (a[1].incoming instanceof Set) ? a[1].incoming.size : (a[1].incoming?.length ?? 0);
      const bi = (b[1].incoming instanceof Set) ? b[1].incoming.size : (b[1].incoming?.length ?? 0);
      if (bi !== ai) return bi - ai; // desc
      return a[0].localeCompare(b[0]);
    });
    const byOut = [...graphNodesEntries].sort((a, b) => {
      const ao = (a[1].outgoing instanceof Set) ? a[1].outgoing.size : (a[1].outgoing?.length ?? 0);
      const bo = (b[1].outgoing instanceof Set) ? b[1].outgoing.size : (b[1].outgoing?.length ?? 0);
      if (bo !== ao) return bo - ao; // desc
      return a[0].localeCompare(b[0]);
    });

  const M = viewBudgets.HUBS_TOP_M; // choose top M hubs by profile
    const topIn = byIn.slice(0, M).map(e => e[0]);
    const topOut = byOut.slice(0, M).map(e => e[0]);

    // Deduplicate while preserving order: in-ranking then out-ranking
    const selected: string[] = [];
    for (const id of topIn.concat(topOut)) {
      if (!selected.includes(id)) selected.push(id);
    }

    if (selected.length > 0) {
      lines.push('## Local Dependencies (Budgeted)');
      lines.push('Списки отсортированы лексикографически по POSIX (repo-relative). Показаны первые N зависимостей; используйте --full-signals для полного списка.');
      lines.push('');
      for (const id of selected) {
        lines.push(`\`${id}\``);
        // find node
        const nodeEntry = graphNodesEntries.find(e => e[0] === id);
        const node = nodeEntry ? nodeEntry[1] : null;
        const incomingArr: string[] = node ? ((node.incoming instanceof Set) ? Array.from(node.incoming) : (node.incoming ?? [])) : [];
        const outgoingArr: string[] = node ? ((node.outgoing instanceof Set) ? Array.from(node.outgoing) : (node.outgoing ?? [])) : [];
        // keep only local paths (they are already local in graph)
        incomingArr.sort();
        outgoingArr.sort();

        const inShown = incomingArr.slice(0, listCap === Infinity ? incomingArr.length : listCap);
        const outShown = outgoingArr.slice(0, listCap === Infinity ? outgoingArr.length : listCap);

        const inMore = Math.max(0, incomingArr.length - inShown.length);
        const outMore = Math.max(0, outgoingArr.length - outShown.length);

  const fmt = (arr: string[]) => arr.map(x => `\`${x}\``).join(', ');

        const inLine = inShown.length > 0 ? fmt(inShown) : '';
        const outLine = outShown.length > 0 ? fmt(outShown) : '';

        const inSuffix = inMore > 0 ? ` (… +${inMore} more)` : '';
        const outSuffix = outMore > 0 ? ` (… +${outMore} more)` : '';

        // Render lines without the old inline ellipsis suffix. Add canonical
        // truncation notice as a separate line when applicable.
        lines.push(`- \`←\` ${inLine}`);
        if (!fullSignals && inMore > 0) {
          lines.push(formatTruncationNotice(inMore));
          // If this Local Dependencies entry is a known hub, add the hub-aware hint
          const idNorm = stablePathNormalize(id.replace(/\\/g, '/'));
          if (hubSet.has(idNorm)) {
            lines.push(formatHubTruncationHint());
          }
        }
        lines.push(`- \`→\` ${outLine}`);
        if (!fullSignals && outMore > 0) {
          lines.push(formatTruncationNotice(outMore));
          const idNorm = stablePathNormalize(id.replace(/\\/g, '/'));
          if (hubSet.has(idNorm)) {
            lines.push(formatHubTruncationHint());
          }
        }
        lines.push('');
      }
    }
  }

  // 3. Tree section header
  lines.push('## Project Tree');
  if (focus) {
    lines.push(`*Focused on:* \`${focus}\``);
  }
  if (depth !== undefined && depth < Infinity) {
    lines.push(`*Depth limit:* ${depth}`);
  }
  lines.push('');

  // 4. The tree itself
  let treeOutput = renderTree(input, { focus, depth, profile, fullSignals, collapse, showOrphans, focusFile: opts.focusFile, focusDepth: (opts as any).focusDepth });
  treeOutput = applyContractMarkersToTree(treeOutput, signals?.contractSignals ?? {}, input.tree as DirNode);
  lines.push('```');
  lines.push(treeOutput);
  lines.push('```');

  const content = lines.join('\n').trim() + '\n';
  return { content };
}

function collectPathSets(root: DirNode): { fileSet: Set<string>; dirSet: Set<string> } {
  const fileSet = new Set<string>();
  const dirSet = new Set<string>();
  const walk = (node: DirNode | FileNode) => {
    if (node.kind === 'file') {
      fileSet.add(stablePathNormalize(node.relPath));
      return;
    }
    if (node.relPath) {
      dirSet.add(stablePathNormalize(node.relPath));
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return { fileSet, dirSet };
}

function extractTreeNodeName(content: string): string {
  const tokens = [' [HUB]', ' (!', ' (?', ' (→', ' (i', ' (←', ' ('];
  let end = content.length;
  for (const token of tokens) {
    const idx = content.indexOf(token);
    if (idx >= 0 && idx < end) end = idx;
  }
  return content.slice(0, end).trim();
}

function insertContractMarker(line: string, marker: string): string {
  if (line.includes(marker)) return line;
  const tokens = [' (!', ' (?', ' (→', ' (i', ' (←'];
  let idx = -1;
  for (const token of tokens) {
    const pos = line.indexOf(token);
    if (pos >= 0 && (idx < 0 || pos < idx)) idx = pos;
  }
  if (idx < 0) return line + marker;
  return line.slice(0, idx) + marker + line.slice(idx);
}

function applyContractMarkersToTree(
  treeOutput: string,
  contractSignals: ContractSignalMap,
  root: DirNode
): string {
  const entries = Object.entries(contractSignals ?? {});
  if (entries.length === 0) return treeOutput;

  const contractMap = new Map<string, ContractSignal>();
  for (const [file, signal] of entries) {
    contractMap.set(stablePathNormalize((file || '').replace(/\\/g, '/')), signal);
  }

  const { fileSet, dirSet } = collectPathSets(root);
  const lines = treeOutput.split('\n');
  const pathStack: string[] = [];

  const processed = lines.map((line) => {
    const match = /^(.*?)(├── |└── )(.+)$/.exec(line);
    if (!match) return line;

    const prefix = match[1] + match[2];
    const content = match[3];
    const depth = Math.max(0, Math.floor(prefix.length / 4) - 1);
    const name = extractTreeNodeName(content);
    if (!name) return line;

    const parentParts = pathStack.slice(0, depth);
    const relPath = parentParts.concat([name]).join('/');
    const normPath = stablePathNormalize(relPath);

    if (dirSet.has(normPath)) {
      pathStack[depth] = name;
      pathStack.length = depth + 1;
      return line;
    }

    if (!fileSet.has(normPath)) {
      return line;
    }

    const signal = contractMap.get(normPath);
    if (!signal || signal.status === 'C~') return line;
    return insertContractMarker(line, ` [${signal.status}]`);
  });

  return processed.join('\n');
}

function renderContractCoverage(signals: ContractSignalMap): string {
  const entries = Object.entries(signals ?? {})
    .map(([file, signal]) => ({
      file: stablePathNormalize((file || '').replace(/\\/g, '/')),
      signal,
    }))
    .sort((a, b) => stableStringCompare(a.file, b.file));

  if (entries.length === 0) return '';

  const counts: Record<ContractStatus, number> = {
    'C+': 0,
    'C?': 0,
    'C0': 0,
    'C~': 0,
  };

  for (const entry of entries) {
    counts[entry.signal.status] += 1;
  }

  const highRisk = entries.filter(entry => entry.signal.status === 'C0' || entry.signal.status === 'C?');
  const cap = 5;
  const shown = highRisk.slice(0, cap);
  const more = Math.max(0, highRisk.length - shown.length);

  const lines: string[] = [];
  lines.push('## Contract coverage');
  lines.push('');
  lines.push(`- C+: ${counts['C+']}`);
  lines.push(`- C?: ${counts['C?']}`);
  lines.push(`- C0: ${counts['C0']}`);
  lines.push(`- C~: ${counts['C~']}`);
  lines.push('');
  lines.push('### High-risk (C0/C?)');
  if (shown.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of shown) {
      lines.push(`- \`${entry.file}\` (${entry.signal.status})`);
    }
    if (more > 0) {
      lines.push(`- +${more} more`);
    }
  }
  lines.push('');
  lines.push('### Legend');
  lines.push('- [C+] boundary with inbound + outbound anchors');
  lines.push('- [C?] boundary with partial anchors');
  lines.push('- [C0] boundary with no anchors');
  lines.push('- [C~] not in boundary or unreadable');

  return lines.join('\n').trim();
}