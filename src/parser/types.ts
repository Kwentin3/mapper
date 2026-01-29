/**
 * Parser contracts for AST‑first import/export extraction.
 */

export type ImportKind =
  | 'import'
  | 'export'
  | 'reexport'
  | 'dynamic'

export interface ImportEdge {
  /** Relative path of the source file (as passed to parser). */
  from: string
  /** Raw module specifier string, exactly as it appears in source. */
  specifier: string
  kind: ImportKind
  isTypeOnly: boolean
}

export interface ParseFileResult {
  /** Relative path of the parsed file. */
  file: string
  /** Deterministically ordered list of import edges. */
  edges: ImportEdge[]
  /** Deterministically ordered list of warnings. */
  warnings: string[]
  /** Optional original source text used for text-based heuristics. */
  source?: string
}

export interface ParseOptions {
  /**
   * If true, dynamic imports (`import('...')` and `require('...')`) are emitted
   * as edges with `kind: 'dynamic'`. If false, they are ignored.
   */
  markDynamicImports: boolean
}