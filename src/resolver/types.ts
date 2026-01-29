/**
 * Resolver contracts for deterministic module specifier resolution.
 */

/**
 * Classification of a resolved specifier.
 */
export type ResolvedKind =
  | 'internal'   // local file inside the project (relative or absolute)
  | 'external'   // module from node_modules (bare specifier)
  | 'unresolved' // cannot be resolved (unknown)
  | 'alias'      // resolved via tsconfig path or package.json import map

/**
 * A single candidate target after resolution.
 */
export interface ResolvedTarget {
  /** Normalized file system path (POSIX, relative to project root). */
  path: string
  /** Classification of this target. */
  kind: ResolvedKind
  /** Original specifier before resolution. */
  original: string
  /** For aliases, the pattern that matched (e.g., '@/*'). */
  aliasPattern?: string
}

/**
 * Options for the resolver.
 */
export interface ResolverOptions {
  /** Base directory for relative specifiers (usually the directory of the importing file). */
  baseDir: string
  /** Project root directory (for tsconfig.json and package.json lookup). */
  projectRoot: string
  /** File extensions to try when probing for files (without dot). */
  extensions?: string[]
  /** Path to tsconfig.json (default: '<projectRoot>/tsconfig.json'). */
  tsconfigPath?: string
  /** Path to package.json (default: '<projectRoot>/package.json'). */
  packageJsonPath?: string
  /** Whether to treat dynamic imports (`import('...')`) as resolvable. */
  resolveDynamicImports?: boolean
}

/**
 * Result of resolving a single specifier.
 */
export interface ResolveResult {
  /** The original specifier as it appears in source code. */
  specifier: string
  /** Deterministically ordered list of possible resolution targets. */
  resolved: ResolvedTarget[]
  /** Warnings encountered during resolution (deterministically ordered). */
  warnings: string[]
}