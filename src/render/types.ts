/**
 * Types for rendering the architecture map.
 */

import type { DirNode } from '../scanner/types.js';
import type { SignalsResult } from '../signals/types.js';
import type { ParseFileResult } from '../parser/types.js';
import type { DependencyGraph } from '../graph/types.js';

/**
 * Options that control the rendering behavior.
 */
export interface RenderOptions {
  /**
   * Focus on a specific file or directory (relative POSIX path).
   * If provided, the tree will be filtered to show only ancestors,
   * siblings, and direct children of the focused node.
   */
  focus?: string;

  /**
   * Maximum depth to render (>= 0).
   * 0 means only the root, 1 means root and its immediate children, etc.
   */
  depth?: number;

  /**
   * Architecture profile (e.g., 'default', 'fsd', 'monorepo').
   * Influences which signals are considered and how collapse works.
   */
  profile?: string;

  /**
   * If true, show all signals regardless of budgeting limits.
   * If false (default), apply top‑N limits per signal category.
   */
  fullSignals?: boolean;

  /**
   * If true, show ORPHAN signals for test/docs/config files.
   * If false (default), hide ORPHAN signals for expected "noise" files.
   */
  showOrphans?: boolean;

  /**
   * If true, render temp fixture directories (test/temp_*) normally.
   * If false (default), apply policy-collapse to hide them behind a stub.
   */
  showTemp?: boolean;

  /**
   * If true, apply smart collapse to hide boring directory chains.
   * If false, render the full tree.
   */
  collapse?: boolean;
  /** If provided, render a focused deep-dive section for exactly one file. */
  focusFile?: string;
  /** When focusFile is set, number of hops (K) to fully expand (task capsule). Defaults to 1 when focusFile is present and focusDepth is undefined. */
  focusDepth?: number;
  /** View-level budget profile: small|default|large */
  budget?: 'small' | 'default' | 'large';
}

/**
 * All the data required to render the architecture map.
 */
export interface RenderInput {
  /** The scanned file‑system tree. */
  tree: DirNode;
  /** Computed signals (entrypoints, public API, hubs, inline). */
  signals: SignalsResult;
  /** Dependency graph (cycles, fan‑in/fan‑out). */
  graph: DependencyGraph;
  /** Optional parse results including original source text for render-only heuristics. */
  parseResults?: ParseFileResult[];
}

/**
 * The result of rendering – the exact content of ARCHITECTURE.md.
 */
export interface RenderOutput {
  /** The generated markdown string, ready to be written to a file. */
  content: string;
}