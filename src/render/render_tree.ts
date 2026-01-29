/**
 * Core tree rendering logic.
 *
 * Features:
 * - Tree glyphs (├──, └──, etc.)
 * - Inline signals representation (e.g., `(! CYCLE)`)
 * - Focus and Depth filtering (including "stubbing" hidden risks)
 * - Integration of smart collapse.
 */

import type { DirNode, FileNode } from '../scanner/types.js';
import type { FileSignals, Signal } from '../signals/types.js';
import type { DependencyGraph } from '../graph/types.js';
import type { RenderInput, RenderOptions } from './types.js';
import { computeCollapsedPaths, countSubtreeRisks } from './smart_collapse.js';
import { stableStringCompare } from '../utils/determinism.js';
import { filterOrphanSignals } from '../signals/filter.js';
import { stablePathNormalize } from '../utils/determinism.js';


/**
 * Inline representation of a signal as it appears in the tree.
 */
function signalToString(signal: Signal): string {
  const prefix = {
    risk: '(!',
    hint: '(?',
    nav: '(→',
    context: '(i',
  }[signal.kind];
  return `${prefix} ${signal.code})`;
}

/**
 * Collect all signals for a given file path.
 */
function getSignalsForFile(
  filePath: string,
  signals: FileSignals[]
): Signal[] {
  const found = signals.find((fs) => fs.file === filePath);
  return found ? found.inline : [];
}

/**
 * Determine if a file contains any risk signals.
 */
function hasRiskSignals(filePath: string, signals: FileSignals[]): boolean {
  const fileSignals = getSignalsForFile(filePath, signals);
  return fileSignals.some((s) => s.kind === 'risk');
}

/**
 * Build a map from file path to its risk codes.
 */
function buildFileToRiskCodes(signals: FileSignals[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const fs of signals) {
    const riskCodes = fs.inline
      .filter(s => s.kind === 'risk')
      .map(s => s.code);
    if (riskCodes.length > 0) {
      map.set(fs.file, riskCodes);
    }
  }
  return map;
}

/**
 * Collect all unique risk codes in a subtree.
 */
function collectRiskCodesInSubtree(
  node: DirNode | FileNode,
  riskMap: Map<string, string[]>
): string[] {
  const codes = new Set<string>();
  function walk(n: DirNode | FileNode) {
    if (n.kind === 'file') {
      const fileRisks = riskMap.get(n.relPath);
      if (fileRisks) {
        for (const code of fileRisks) {
          codes.add(code);
        }
      }
    } else {
      for (const child of n.children) {
        walk(child);
      }
    }
  }
  walk(node);
  return Array.from(codes).sort(stableStringCompare);
}

/**
 * Render a single tree line for a node (file or directory).
 */
/**
 * Build canonical prefix for a tree row using ancestry flags and current node status.
 *
 * Rules:
 * - For each ancestor: false -> '│   ' ; true -> '    '
 * - For current node: nodeIsLast ? '└── ' : '├── '
 */
function buildTreePrefix(ancestryIsLast: boolean[], nodeIsLast: boolean): string {
  const ancestorParts = ancestryIsLast.map(a => (a ? '    ' : '│   ')).join('');
  const glyph = nodeIsLast ? '└── ' : '├── ';
  return ancestorParts + glyph;
}

function renderNodeLine(
  name: string,
  ancestryIsLast: boolean[],
  nodeIsLast: boolean,
  signals: Signal[],
  // depCounts maps relPath -> { incoming: number, outgoing: number }
  depCounts?: Map<string, { incoming: number; outgoing: number }>,
  relPath?: string,
  hubSet?: Set<string>
): string {
  const prefix = buildTreePrefix(ancestryIsLast, nodeIsLast);
  const signalStr = signals.length > 0
    ? ' ' + signals.map(signalToString).join(' ')
    : '';

  let depsStr = '';
  if (depCounts && relPath) {
    const c = depCounts.get(relPath) ?? { incoming: 0, outgoing: 0 };
    // Only render when at least one count is non-zero
    if (c.incoming !== 0 || c.outgoing !== 0) {
      depsStr = ` (←${c.incoming} →${c.outgoing})`;
    }
  }

  // Determine hub tag (only for files with a relPath)
  const hubTag = (relPath && hubSet && hubSet.has(relPath)) ? ' [HUB]' : '';

  return `${prefix}${name}${hubTag}${signalStr}${depsStr}`;
}

/**
 * Recursive tree rendering with focus, depth, and collapse.
 *
 * @param node Current directory node
 * @param signals All file signals
 * @param riskMap Map from file path to its risk codes (precomputed)
 * @param collapsedPaths Set of directory paths that should be collapsed
 * @param focusPath The focused path (if any)
 * @param depthLimit Maximum rendering depth
 * @param currentDepth Current depth in recursion
 * @param isLast Whether this node is the last child of its parent
 * @param prefix Prefix string for building tree glyphs
 * @returns Array of lines for this subtree
 */
function renderTreeNode(
  node: DirNode | FileNode,
  signals: FileSignals[],
  riskMap: Map<string, string[]>,
  collapsedPaths: Set<string>,
  focusPath: string | undefined,
  depthLimit: number,
  currentDepth: number,
  isLast: boolean,
  ancestryIsLast: boolean[],
  showOrphans: boolean,
  showTemp: boolean,
  depCounts?: Map<string, { incoming: number; outgoing: number }>,
  // Task capsule support: distances map (relPath -> distance in hops) and focusDepth
  distances?: Map<string, number>,
  focusDepth?: number,
  fullSignals?: boolean,
  hubSet?: Set<string>
): string[] {
  // Apply depth limit
  if (currentDepth > depthLimit) {
    return [];
  }

  // Determine if this node is hidden due to focus
  // (Focus logic is applied at a higher level; here we assume the node is already filtered)

  const lines: string[] = [];

  // Skip rendering the root directory (empty relPath) – only its children matter
  const isRootDir = node.kind === 'dir' && node.relPath === '';
  if (!isRootDir) {
    // Render this node
    let nodeSignals = node.kind === 'file'
      ? getSignalsForFile(node.relPath, signals)
      : [];
    // Suppress ORPHAN inline signal in render layer according to PRD v0.9 rules:
    // - If showOrphans option is false and the node has an ENTRYPOINT nav signal,
    //   remove the ORPHAN context signal from the inline list (do not change
    //   computed signals; this is render-only). This keeps the ORPHAN signal in
    //   the signals catalog but avoids UX noise on entrypoints.
    // - Files under docs/ and top-level config filenames are already filtered
    //   by filterOrphanSignals earlier in the pipeline; this guard ensures
    //   rule A is enforced here deterministically.
    if (node.kind === 'file' && !showOrphans) {
      const hasEntrypoint = nodeSignals.some(s => s.kind === 'nav' && s.code === 'ENTRYPOINT');
      // Suppress ORPHAN for docs/ and a small set of top-level config filenames.
      const configSuppress = new Set([
        'README.md', 'CHANGELOG.md', 'tsconfig.json', 'package.json', 'package-lock.json'
      ]);
      const isDocsOrConfig = node.relPath.startsWith('docs/') || configSuppress.has(node.relPath);
      if (hasEntrypoint || isDocsOrConfig) {
        nodeSignals = nodeSignals.filter(s => !(s.kind === 'context' && s.code === 'ORPHAN'));
      }
    }
    const line = renderNodeLine(
      node.name,
      ancestryIsLast,
      isLast,
      nodeSignals,
      node.kind === 'file' ? depCounts : undefined,
      node.kind === 'file' ? node.relPath : undefined,
      hubSet
    );
    lines.push(line);
  }

  // If it's a directory, render its children
  if (node.kind === 'dir') {
    
    // Helper to count items in hidden subtree
    const countSubtreeItems = (n: DirNode) => {
      let fileCount = 0;
      let subdirCount = 0;
      function walk(curr: DirNode | FileNode, isRoot: boolean) {
        if (curr.kind === 'file') {
          fileCount++;
        } else {
          if (!isRoot) subdirCount++;
          for (const child of curr.children) {
            walk(child, false);
          }
        }
      }
      walk(n, true);
      return { fileCount, subdirCount };
    };

    // Policy: collapse temp fixture directories by default (render-only)
    const shouldPolicyCollapseDir = (relPath: string, showTempFlag: boolean): boolean => {
      if (showTempFlag) return false;
      const norm = stablePathNormalize(relPath || '');
      // Match POSIX prefix 'test/temp_'
      return norm.startsWith('test/temp_');
    };

    if (shouldPolicyCollapseDir(node.relPath, showTemp)) {
      const { fileCount, subdirCount } = countSubtreeItems(node);
      const riskCount = countSubtreeRisks(node, signals);

      const stubAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
      const stubPrefix = buildTreePrefix(stubAncestry, true);
      let indicator = `(${fileCount} file${fileCount !== 1 ? 's' : ''}, ${subdirCount} subdir${subdirCount !== 1 ? 's' : ''}`;
      if (riskCount > 0) {
        indicator += `, (!) ${riskCount} signal${riskCount !== 1 ? 's' : ''} hidden`;
      }
      indicator += ')';
      lines.push(`${stubPrefix}… ${indicator}`);
      return lines;
    }

    // Check if this directory is collapsed
    if (collapsedPaths.has(node.relPath)) {
      const { fileCount, subdirCount } = countSubtreeItems(node);
      const riskCount = countSubtreeRisks(node, signals);
      
      // Build the indicator string
      let indicator = `(${fileCount} file${fileCount !== 1 ? 's' : ''}, ${subdirCount} subdir${subdirCount !== 1 ? 's' : ''}`;
      if (riskCount > 0) {
        indicator += `, (!) ${riskCount} signal${riskCount !== 1 ? 's' : ''} hidden`;
      }
      indicator += ')';
      
      // Instead of rendering children, we add a stub indicating collapse with counts
      // The stub is rendered as a single child row; build its prefix from ancestry
      const stubAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
      const stubPrefix = buildTreePrefix(stubAncestry, true);
      lines.push(`${stubPrefix}… ${indicator}`);
      return lines;
    }

    // Check if depth limit hides children
    if (currentDepth >= depthLimit) {
      const { fileCount, subdirCount } = countSubtreeItems(node);
      const riskCount = countSubtreeRisks(node, signals);

      if (fileCount > 0 || subdirCount > 0) {
        const stubAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
        const stubPrefix = buildTreePrefix(stubAncestry, true);
        let indicator = `(${fileCount} file${fileCount !== 1 ? 's' : ''}, ${subdirCount} subdir${subdirCount !== 1 ? 's' : ''}`;
        if (riskCount > 0) {
          indicator += `, (!) ${riskCount} signal${riskCount !== 1 ? 's' : ''} hidden`;
        }
        indicator += ')';
        lines.push(`${stubPrefix}… ${indicator}`);
      }
      return lines;
    }

    // If task capsule is active (focusFile + focusDepth), hide children beyond K hops by
    // aggregating them into a single stub row. We only apply this when fullSignals is false.
    const capsuleActive = typeof focusPath === 'string' && typeof focusDepth === 'number' && !fullSignals && distances instanceof Map;

    if (!capsuleActive) {
      const childCount = node.children.length;
      for (let i = 0; i < childCount; i++) {
        const child = node.children[i];
        const childIsLast = i === childCount - 1;
        // If we skipped the root, children should be rendered at the same depth (currentDepth)
        // and their ancestry should not include the root marker. For non-root, append current
        // node's isLast flag to the ancestry for children.
        const childAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
        const childDepth = isRootDir ? currentDepth : currentDepth + 1;
        const childLines = renderTreeNode(
          child,
          signals,
          riskMap,
          collapsedPaths,
          focusPath,
          depthLimit,
          childDepth,
          childIsLast,
          childAncestry,
          showOrphans,
          showTemp,
          depCounts,
          distances,
          focusDepth,
          fullSignals,
          hubSet
        );
        lines.push(...childLines);
      }
    } else {
      // Capsule active: determine which children have any descendant within focusDepth
      const visibleChildren: Array<{ child: DirNode | FileNode; isLast: boolean }> = [];
      let hiddenFilesTotal = 0;
      let hiddenSubdirsTotal = 0;
      let hiddenSignalsTotal = 0;

      // Helper to determine if any file under node has distance <= focusDepth
      function subtreeHasWithinK(n: DirNode | FileNode): boolean {
        if (!distances) return true; // if distances unavailable, treat as visible
        if (n.kind === 'file') {
          // Attempt exact lookup, fall back to best-effort suffix match for file name.
          let d = distances.get(n.relPath);
          if (d === undefined) {
            const name = n.name;
            for (const k of distances.keys()) {
              if (k === name || k.endsWith('/' + name)) {
                d = distances.get(k);
                break;
              }
            }
          }
          return typeof d === 'number' && d <= (focusDepth as number);
        }
        // directory
        for (const c of n.children) {
          if (subtreeHasWithinK(c)) return true;
        }
        return false;
      }

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childIsLast = i === node.children.length - 1;
        const hasWithin = subtreeHasWithinK(child);

        if (hasWithin) {
          visibleChildren.push({ child, isLast: childIsLast });
        } else {
          // Aggregate hidden counts for this child's subtree
          const { fileCount, subdirCount } = ((): { fileCount: number; subdirCount: number } => {
            let f = 0;
            let s = 0;
            function walk(curr: DirNode | FileNode, isRoot: boolean) {
              if (curr.kind === 'file') f++;
              else {
                if (!isRoot) s++;
                for (const cc of curr.children) walk(cc, false);
              }
            }
            walk(child, true);
            return { fileCount: f, subdirCount: s };
          })();
          hiddenFilesTotal += fileCount;
          hiddenSubdirsTotal += subdirCount;
          if (child.kind === 'file') {
            hiddenSignalsTotal += hasRiskSignals(child.relPath, signals) ? 1 : 0;
          } else {
            hiddenSignalsTotal += countSubtreeRisks(child as DirNode, signals);
          }
        }
      }

      // Render visible children normally (recursing)
      for (let i = 0; i < visibleChildren.length; i++) {
        const { child, isLast: childIsLast } = visibleChildren[i];
        const childAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
        const childDepth = isRootDir ? currentDepth : currentDepth + 1;
        const childLines = renderTreeNode(
          child,
          signals,
          riskMap,
          collapsedPaths,
          focusPath,
          depthLimit,
          childDepth,
          childIsLast,
          childAncestry,
          showOrphans,
          showTemp,
          depCounts,
          distances,
          focusDepth,
          fullSignals,
          hubSet
        );
        lines.push(...childLines);
      }

      // If there were hidden children, append a single stub summary row
      if (hiddenFilesTotal > 0 || hiddenSubdirsTotal > 0) {
        const stubAncestry = isRootDir ? ancestryIsLast : ancestryIsLast.concat([isLast]);
        const stubPrefix = buildTreePrefix(stubAncestry, true);
        let indicator = `(${hiddenFilesTotal} file${hiddenFilesTotal !== 1 ? 's' : ''}, ${hiddenSubdirsTotal} subdir${hiddenSubdirsTotal !== 1 ? 's' : ''}`;
        if (hiddenSignalsTotal > 0) {
          indicator += `, (!) ${hiddenSignalsTotal} signal${hiddenSignalsTotal !== 1 ? 's' : ''} hidden`;
        }
        indicator += ')';
        lines.push(`${stubPrefix}… ${indicator}`);
      }
    }
  }

  return lines;
}

/**
 * Find a node by its relative path (DFS). Returns null if not found.
 */
function findNodeByPath(
  node: DirNode | FileNode,
  targetPath: string
): DirNode | FileNode | null {
  if (node.relPath === targetPath) {
    return node;
  }
  if (node.kind === 'dir') {
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Filter the tree to only show ancestors, siblings, and direct children of the focused node.
 * Returns a new DirNode that contains only the relevant parts, or null if focus not found.
 */
function filterTreeByFocus(
  root: DirNode,
  focusPath: string
): DirNode | null {
  // If focus path is empty, return the whole tree (focus on root)
  if (focusPath === '') {
    return root;
  }
  // Check if the focused node exists
  const focused = findNodeByPath(root, focusPath);
  if (!focused) {
    return null;
  }
  // TODO: actually filter the tree (Step 7 of MVP v0.8)
  // For now, return the whole tree.
  return root;
}

/**
 * Apply depth limit by stubbing nodes beyond the limit that contain risks.
 */
function applyDepthStub(
  root: DirNode,
  signals: FileSignals[],
  depthLimit: number
): DirNode {
  // TODO: implement depth stubbing (Step 7 of MVP v0.8)
  // For now, return the tree unchanged.
  return root;
}

/**
 * Render the full file‑system tree as a markdown‑style tree.
 */
export function renderTree(
  input: RenderInput,
  options: RenderOptions
): string {
  const { tree, signals, graph } = input;
  const { focus, depth = Infinity, collapse = true, showOrphans = false, showTemp = false } = options;

  // Build dependency counts map from graph (only internal repo nodes are present in graph.nodes)
  const depCounts = new Map<string, { incoming: number; outgoing: number }>();
  if (graph && graph.nodes) {
    // graph.nodes may be a Map (normal runtime) or a plain object/JSON (tests that
    // deep-clone inputs). Handle both shapes deterministically.
    if (typeof (graph.nodes as any).forEach === 'function' && graph.nodes instanceof Map) {
      for (const [id, node] of graph.nodes as Map<string, any>) {
        depCounts.set(id, { incoming: node.incoming instanceof Set ? node.incoming.size : (node.incoming?.length ?? 0), outgoing: node.outgoing instanceof Set ? node.outgoing.size : (node.outgoing?.length ?? 0) });
      }
    } else if (Array.isArray(graph.nodes)) {
      for (const entry of graph.nodes as any[]) {
        const [id, node] = entry;
        depCounts.set(id, { incoming: node.incoming instanceof Set ? node.incoming.size : (node.incoming?.length ?? 0), outgoing: node.outgoing instanceof Set ? node.outgoing.size : (node.outgoing?.length ?? 0) });
      }
    } else if (typeof graph.nodes === 'object') {
      for (const id of Object.keys(graph.nodes as Record<string, any>).sort()) {
        const node = (graph.nodes as any)[id];
        depCounts.set(id, { incoming: node.incoming instanceof Set ? node.incoming.size : (node.incoming?.length ?? 0), outgoing: node.outgoing instanceof Set ? node.outgoing.size : (node.outgoing?.length ?? 0) });
      }
    }
  }

  // Step 0: Apply orphan filtering
  const filteredSignals = filterOrphanSignals(signals.files, showOrphans);

  // Step 1: Apply focus filtering
  let filteredTree = tree;
  if (focus !== undefined) {
    const focused = filterTreeByFocus(tree, focus);
    if (focused === null) {
      // Focus not found – according to spec we should render nothing?
      return '';
    }
    filteredTree = focused;
  }

  // Step 2: Apply depth stubbing
  const depthLimit = depth === undefined ? Infinity : depth;
  let stubTree = applyDepthStub(filteredTree, filteredSignals, depthLimit);

  // Step 3: Compute collapsed paths
  const collapsedPaths = collapse
    ? computeCollapsedPaths(stubTree, filteredSignals)
    : new Set<string>();

  // Step 4: Build risk map
  const riskMap = buildFileToRiskCodes(filteredSignals);

  // Step 4b: If focusFile + focusDepth provided, compute graph distances (hops) from focusFile
  let distances: Map<string, number> | undefined = undefined;
  const focusFile = (options as any).focusFile as string | undefined;
  const focusDepth = (options as any).focusDepth as number | undefined;
  const fullSignals = !!options.fullSignals;
  if (focusFile && typeof focusDepth === 'number' && !fullSignals && graph && graph.nodes) {
    // Build adjacency (undirected) for repo-local nodes
    const adj = new Map<string, Set<string>>();
    const entries: Array<[string, any]> = [];
    if (graph.nodes instanceof Map) {
      for (const [k, v] of (graph.nodes as Map<string, any>).entries()) entries.push([k, v]);
    } else if (Array.isArray(graph.nodes)) {
      for (const e of graph.nodes as any[]) entries.push([e[0], e[1]]);
    } else if (typeof graph.nodes === 'object') {
      for (const k of Object.keys(graph.nodes as Record<string, any>).sort()) entries.push([k, (graph.nodes as any)[k]]);
    }
    for (const [id, node] of entries) {
      const idNorm = id.replace(/\\/g, '/');
      adj.set(idNorm, new Set<string>());
    }
    for (const [id, node] of entries) {
      const idNorm = id.replace(/\\/g, '/');
      const incomingArr: string[] = node ? ((node.incoming instanceof Set) ? Array.from(node.incoming) : (node.incoming ?? [])) : [];
      const outgoingArr: string[] = node ? ((node.outgoing instanceof Set) ? Array.from(node.outgoing) : (node.outgoing ?? [])) : [];
      for (const n of incomingArr.concat(outgoingArr)) {
        const nNorm = (n || '').replace(/\\/g, '/');
        if (!adj.has(nNorm)) continue; // skip external/untracked nodes
        adj.get(idNorm)!.add(nNorm);
        adj.get(nNorm)!.add(idNorm);
      }
    }

    // BFS
    distances = new Map<string, number>();
    const start = focusFile.replace(/\\/g, '/');
    if (adj.has(start)) {
      const q: string[] = [start];
      distances.set(start, 0);
      while (q.length > 0) {
        const cur = q.shift()!;
        const dcur = distances.get(cur)!;
        const neigh = adj.get(cur);
        if (!neigh) continue;
        for (const nb of Array.from(neigh).sort()) {
          if (!distances.has(nb)) {
            distances.set(nb, dcur + 1);
            q.push(nb);
          }
        }
      }
    }
    
  }

  // Build set of hub files from signals (fan-in and fan-out) for render-only tagging
  const hubSet = new Set<string>();
  if (signals && Array.isArray(signals.hubsFanIn)) {
    for (const h of signals.hubsFanIn) {
      if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize(h.file.replace(/\\/g, '/')));
    }
  }
  if (signals && Array.isArray(signals.hubsFanOut)) {
    for (const h of signals.hubsFanOut) {
      if (h && typeof h.file === 'string') hubSet.add(stablePathNormalize(h.file.replace(/\\/g, '/')));
    }
  }

  // Step 5: Render the tree lines
  const lines = renderTreeNode(
    stubTree,
    filteredSignals,
    riskMap,
    collapsedPaths,
    focusFile,
    depthLimit,
    0, // currentDepth
    true, // isLast (root is always last in its context)
    [], // ancestryIsLast
    showOrphans,
    showTemp,
    depCounts,
    distances,
    focusDepth,
    fullSignals
    ,
    hubSet
  );

  // If the tree is empty, return a placeholder
  if (lines.length === 0) {
    return '(empty tree)';
  }

  return lines.join('\n');
}
