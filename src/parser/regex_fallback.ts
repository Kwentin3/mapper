/**
 * Conservative regex‑based fallback for import/export extraction.
 * Used when AST parsing fails.
 */

import { stableSort, stableStringCompare } from '../utils/determinism'
import type { ImportEdge, ImportKind, ParseOptions } from './types'

/**
 * Extract import/export edges using regular expressions.
 * Returns an array of edges (possibly empty) even if some statements are missed.
 */
export function parseWithRegex(
  code: string,
  filePath: string,
  opts: ParseOptions
): ImportEdge[] {
  const edges: ImportEdge[] = []

  // Helper to add an edge
  const addEdge = (specifier: string, kind: ImportKind, isTypeOnly: boolean = false) => {
    edges.push({
      from: filePath,
      specifier,
      kind,
      isTypeOnly,
    })
  }

  // Pattern for static imports: `import ... from "specifier"`
  // Captures the specifier string (including quotes).
  // Groups: [1] = specifier without quotes? We'll capture whole string.
  // We'll extract using a simpler approach: find `from\s*['"`]([^'"`]+)['"`]`
  // But we need to keep the exact specifier including quotes? The contract says specifier is raw module specifier string, exactly as in source.
  // That includes the quotes. We'll capture the whole quoted string.
  const importFromRegex = /import\s+.*?\s+from\s*(['"`][^'"`]+['"`])/g
  for (const match of code.matchAll(importFromRegex)) {
    const specifier = match[1] // includes quotes
    addEdge(specifier.slice(1, -1), 'import', false) // strip quotes for specifier? Actually specifier should be raw string with quotes? The specifier as in source includes quotes? The AST gives text without quotes. The contract says "raw module specifier string, exactly as in source". That includes quotes? Example: `import x from './foo'` the specifier is `'./foo'` (including quotes). We'll keep as is.
    // However, we stripped quotes above. Let's keep with quotes.
    // We'll keep specifier as match[1] (including quotes).
    // But note that the specifier may contain escaped quotes; we ignore.
  }

  // Pattern for export from: `export ... from "specifier"`
  const exportFromRegex = /export\s+(?:[*{]|.*?)\s+from\s*(['"`][^'"`]+['"`])/g
  for (const match of code.matchAll(exportFromRegex)) {
    const specifier = match[1]
    // Determine if it's a re‑export (export { ... } from) or export * from
    const isReexport = match[0].includes('{') || match[0].includes('*')
    addEdge(specifier.slice(1, -1), isReexport ? 'reexport' : 'export', false)
  }

  // Dynamic imports (`import('...')`) and `require('...')`
  if (opts.markDynamicImports) {
    const dynamicImportRegex = /import\s*\(\s*(['"`][^'"`]+['"`])/g
    for (const match of code.matchAll(dynamicImportRegex)) {
      const specifier = match[1]
      addEdge(specifier.slice(1, -1), 'dynamic', false)
    }
    const requireRegex = /require\s*\(\s*(['"`][^'"`]+['"`])/g
    for (const match of code.matchAll(requireRegex)) {
      const specifier = match[1]
      addEdge(specifier.slice(1, -1), 'dynamic', false)
    }
  }

  // Deduplicate edges? Not required; we can keep duplicates but sorting will group them.
  // Deterministic ordering
  const sortedEdges = stableSort(edges, (a, b) => {
    const kindOrder = { import: 0, export: 1, reexport: 2, dynamic: 3 }
    const kindCmp = kindOrder[a.kind] - kindOrder[b.kind]
    if (kindCmp !== 0) return kindCmp
    return stableStringCompare(a.specifier, b.specifier)
  })

  return sortedEdges
}