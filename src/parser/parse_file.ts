/**
 * Top‑level file parser that orchestrates AST‑first extraction with regex fallback.
 */

import { parseWithAstInfo } from './ast_parser'
import { parseWithRegex } from './regex_fallback'
import type { ParseFileResult, ParseOptions } from './types'

/**
 * Parse a single file and return deterministic import edges and warnings.
 * Never throws.
 */
export function parseFile(
  filePath: string,
  code: string,
  opts: ParseOptions
): ParseFileResult {
  const warnings: string[] = []
  const astResult = parseWithAstInfo(code, filePath, opts)
  let edges = astResult.edges
  if (edges === null) {
    // AST parsing failed → fallback to regex
    const category = astResult.error ?? 'UNSUPPORTED'
    // Push deterministic, categorized warning. Do NOT include raw exception text.
    warnings.push(`(? PARSE-ERROR:${category}) ${filePath}`)
    edges = parseWithRegex(code, filePath, opts)
  }

  // If both AST and regex produced no edges, edges is empty array (already).
  // Ensure deterministic ordering (already sorted by each parser).
  // However, we need to sort warnings as well (they are added in deterministic order).
  // Since we only add one warning deterministically, fine.

  return {
    file: filePath,
    edges,
    warnings,
  }
}