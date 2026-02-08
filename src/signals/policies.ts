/**
 * Policies/constants used by the signals layer.
 *
 * Keep these out of `src/signals/types.ts` so that `types.ts` can remain
 * type-only for most importers. This reduces unnecessary graph edges and
 * lowers cascade risk.
 */

/**
 * File patterns for which ORPHAN signals should be hidden by default.
 * These are "noise" files that are expected to have no incoming edges.
 */
export const ORPHAN_FILTER_PATTERNS = [
  'test/**',
  'tests/**',
  '**/tests/**',
  '**/*.test.*',
  '**/*.spec.*',
  'docs/**',
  '**/*.md',
  'package.json',
  'tsconfig.json',
  '*-lock.json',
  '*.lock',
  'dist/**',
  'build/**',
  'tmp*/**',
  'node_modules/**',
] as const;

/**
 * Priority patterns for entrypoint ranking (high → low).
 * Used to exclude test/docs files and prioritize source files.
 */
export const ENTRYPRIORITY_PATTERNS = [
  'src/**',
  'packages/*/src/**',
  'lib/**',
] as const;

/**
 * Patterns that should NEVER be included in entrypoint summary.
 */
export const ENTRYPRIORITY_EXCLUDE_PATTERNS = [
  'test/**',
  'tests/**',
  '**/tests/**',
  'docs/**',
  '**/*.test.*',
  '**/*.spec.*',
  'examples/**',
  'tmp/**',
  'dist/**',
] as const;

