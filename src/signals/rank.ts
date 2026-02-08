/**
 * Stable ranking utilities for deterministic top‑N selection.
 */

import { stableSort, stableStringCompare } from '../utils/determinism.js';
import type { SummaryItem } from './types.js';
import { ENTRYPRIORITY_PATTERNS, ENTRYPRIORITY_EXCLUDE_PATTERNS } from './policies.js';

/**
 * Convert a glob pattern to a RegExp.
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Handle ** patterns first (replace with placeholder)
  let regexStr = escaped.replace(/\*\*/g, '___DOUBLESTAR___');
  
  // Convert * to [^/]* (single asterisk)
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  
  // Restore ** patterns (convert placeholder to .*)
  regexStr = regexStr.replace(/___DOUBLESTAR___/g, '.*');
  
  // Convert ? to .
  regexStr = regexStr.replace(/\?/g, '.');
  
  return new RegExp('^' + regexStr + '$');
}

/**
 * Pre-compiled regex patterns for entrypoint priority.
 */
const PRIORITY_REGEXES = ENTRYPRIORITY_PATTERNS.map(globToRegex);

/**
 * Pre-compiled regex patterns for entrypoint exclusion.
 */
const EXCLUDE_REGEXES = ENTRYPRIORITY_EXCLUDE_PATTERNS.map(globToRegex);

/**
 * Check if a file path matches any of the exclude patterns.
 */
function matchesExcludePattern(filePath: string): boolean {
  return EXCLUDE_REGEXES.some(regex => regex.test(filePath));
}

/**
 * Compute priority score for a file path based on priority patterns.
 * Higher priority files get higher scores.
 */
function computePriorityScore(filePath: string): number {
  for (let i = 0; i < PRIORITY_REGEXES.length; i++) {
    if (PRIORITY_REGEXES[i].test(filePath)) {
      // Higher index = lower priority, so we invert
      return PRIORITY_REGEXES.length - i;
    }
  }
  // Root-level bootstrap files get lowest priority
  return 0;
}

/**
 * Apply entrypoint ranking with priority and exclusion rules.
 * - Files matching exclude patterns are removed entirely
 * - Remaining files are ranked by priority, then by original score, then by file path
 */
export function rankEntrypoints(items: SummaryItem[]): SummaryItem[] {
  // Filter out excluded files
  const filtered = items.filter(item => !matchesExcludePattern(item.file));
  
  // Compute priority scores and sort
  return stableSort(filtered, (a, b) => {
    // 1. Priority score (higher first)
    const priorityA = computePriorityScore(a.file);
    const priorityB = computePriorityScore(b.file);
    if (priorityA > priorityB) return -1;
    if (priorityA < priorityB) return 1;
    
    // 2. Original score (higher first)
    if (a.score > b.score) return -1;
    if (a.score < b.score) return 1;
    
    // 3. File path (ascending)
    return stableStringCompare(a.file, b.file);
  });
}

/**
 * Sort summary items by descending score, then by ascending file path.
 * Returns a new array; preserves original order when scores are equal.
 */
export function rankByScore(items: SummaryItem[]): SummaryItem[] {
  return stableSort(items, (a, b) => {
    // Higher score first
    if (a.score > b.score) return -1;
    if (a.score < b.score) return 1;
    // Scores equal → compare file paths
    return stableStringCompare(a.file, b.file);
  });
}

/**
 * Take at most `limit` items from ranked list.
 * If there are fewer items than the limit, returns all items.
 */
export function takeTopN(items: SummaryItem[], limit: number): SummaryItem[] {
  if (limit <= 0) return [];
  const ranked = rankByScore(items);
  return ranked.slice(0, limit);
}

/**
 * Compute fan‑in (incoming edges) for a given node.
 */
export function fanIn(node: { incoming: Set<string> }): number {
  return node.incoming.size;
}

/**
 * Compute fan‑out (outgoing edges) for a given node.
 */
export function fanOut(node: { outgoing: Set<string> }): number {
  return node.outgoing.size;
}
