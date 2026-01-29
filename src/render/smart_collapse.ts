/**
 * Smart collapse logic for hiding boring directory chains.
 *
 * A directory chain is considered "boring" if:
 * - it contains exactly one child directory,
 * - it contains no files (or only files without risk signals),
 * - the child directory is also boring (recursive).
 *
 * This module identifies such chains and returns a set of paths that can be
 * collapsed (i.e., omitted from the tree rendering) without hiding any risks.
 */

import type { DirNode, FileNode } from '../scanner/types.js';
import type { FileSignals } from '../signals/types.js';

/**
 * Count files and subdirectories in a subtree.
 * Returns an object with fileCount and subdirCount.
 */
export function countSubtreeItems(node: DirNode | FileNode): { fileCount: number; subdirCount: number } {
  let fileCount = 0;
  let subdirCount = 0;

  function walk(n: DirNode | FileNode) {
    if (n.kind === 'file') {
      fileCount++;
    } else {
      // For directories, count them as subdirs and recurse into children
      subdirCount++;
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return { fileCount, subdirCount };
}

/**
 * Count files and subdirectories in the immediate children of a directory.
 * This is used when a directory is collapsed to show what's hidden.
 */
export function countImmediateChildren(node: DirNode): { fileCount: number; subdirCount: number } {
  let fileCount = 0;
  let subdirCount = 0;

  for (const child of node.children) {
    if (child.kind === 'file') {
      fileCount++;
    } else {
      subdirCount++;
    }
  }

  return { fileCount, subdirCount };
}

/**
 * Count risk signals in a subtree.
 * Returns the total number of risk signals found in all files in the subtree.
 */
export function countSubtreeRisks(
  node: DirNode | FileNode,
  signals: FileSignals[]
): number {
  let riskCount = 0;

  // Build a map of file paths to their risk count
  const riskMap = new Map<string, number>();
  for (const fs of signals) {
    const count = fs.inline.filter((s) => s.kind === 'risk').length;
    if (count > 0) {
      riskMap.set(fs.file, count);
    }
  }

  function walk(n: DirNode | FileNode) {
    if (n.kind === 'file') {
      const count = riskMap.get(n.relPath) || 0;
      riskCount += count;
    } else {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return riskCount;
}

/**
 * Extract the set of file paths that carry risk signals.
 */
function extractRiskyFiles(signals: FileSignals[]): Set<string> {
  const risky = new Set<string>();
  for (const fs of signals) {
    const hasRisk = fs.inline.some((s) => s.kind === 'risk');
    if (hasRisk) {
      risky.add(fs.file);
    }
  }
  return risky;
}

/**
 * Determine whether a directory node is "boring" given the set of risky files.
 *
 * A directory is boring if:
 * - it has exactly one child, and that child is a directory;
 * - it contains no files (or all its files are not risky).
 * The child directory may or may not be boring; that does not affect this node.
 */
function isBoringDir(
  node: DirNode,
  riskyFiles: Set<string>
): boolean {
  // Count children
  const childDirs = node.children.filter((c): c is DirNode => c.kind === 'dir');
  const childFiles = node.children.filter((c): c is FileNode => c.kind === 'file');

  // Must have exactly one child directory and zero files
  if (childDirs.length !== 1 || childFiles.length > 0) {
    return false;
  }

  // Any file in this directory that is risky disqualifies collapsing
  for (const file of childFiles) {
    if (riskyFiles.has(file.relPath)) {
      return false;
    }
  }

  return true;
}

/**
 * Collect all directory paths that are part of a boring chain.
 * The result includes every directory that is boring, regardless of its child.
 * If a directory is boring, we still recurse into its child (because the child
 * might also be boring and should be collapsed as well).
 */
function collectBoringPaths(
  node: DirNode,
  riskyFiles: Set<string>,
  currentPath: string,
  result: Set<string>
): void {
  // Check if this directory is boring
  if (isBoringDir(node, riskyFiles)) {
    result.add(currentPath);
  }
  // Recurse into all child directories (even if this one is boring)
  for (const child of node.children) {
    if (child.kind === 'dir') {
      collectBoringPaths(child, riskyFiles, child.relPath, result);
    }
  }
}

/**
 * Compute which directory paths should be collapsed (hidden) in the tree rendering.
 *
 * @param tree The scanned directory tree.
 * @param signals Computed signals for all files.
 * @returns A Set of POSIX‑relative paths that can be collapsed.
 */
export function computeCollapsedPaths(
  tree: DirNode,
  signals: FileSignals[]
): Set<string> {
  const riskyFiles = extractRiskyFiles(signals);
  const collapsed = new Set<string>();
  collectBoringPaths(tree, riskyFiles, tree.relPath, collapsed);
  return collapsed;
}