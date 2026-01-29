/**
 * AST‑based parser for import/export extraction using TypeScript compiler API.
 */

import * as ts from 'typescript'
import { stableSort, stableStringCompare } from '../utils/determinism'
import type { ImportEdge, ImportKind, ParseOptions } from './types'

/**
 * Check whether the source file contains any syntactic errors.
 * Ignores semantic errors (missing modules, types) and missing lib errors.
 */
function hasParseErrors(sourceFile: ts.SourceFile): boolean {
  // Create a minimal program to obtain diagnostics
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    // Use an ES module flavor so ESM features like `import.meta` parse correctly.
    // Historically CommonJS here caused valid ESM test files to be treated as
    // parse errors (code 1343). Using ESNext avoids false parse failures.
    module: ts.ModuleKind.ESNext,
    strict: true,
    skipLibCheck: true,
    noLib: true, // avoid missing lib errors
  }
  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => fileName === sourceFile.fileName ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: () => true,
    readFile: () => '',
    getDefaultLibFileName: () => '', // no lib
  }
  const program = ts.createProgram([sourceFile.fileName], compilerOptions, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  // Only consider syntactic errors (parse errors) that are tied to this source file
  return diagnostics.some(d => {
    if (d.category !== ts.DiagnosticCategory.Error || d.file !== sourceFile) {
      return false
    }
    // Parse errors have codes < 2000, semantic errors >= 2000.
    // Ignore semantic errors (missing modules, missing types, etc.)
    if (d.code! >= 2000) {
      return false
    }
    // Any remaining error is considered a parse error
    return true
  })
}

/**
 * Try to parse the source code with AST.
 * Returns an array of edges if parsing succeeded, `null` if AST parsing failed
 * (syntax error, unsupported language version, etc.).
 */
export function parseWithAstInfo(
  code: string,
  filePath: string,
  opts: ParseOptions
): { edges: ImportEdge[] | null; error?: 'SYNTAX' | 'UNSUPPORTED' } {
  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      /*setParentNodes*/ true
    )

    // If the source contains syntactic errors, treat as parse failure
    if (hasParseErrors(sourceFile)) {
      return { edges: null, error: 'SYNTAX' }
    }

    const edges: ImportEdge[] = []

    const visit = (node: ts.Node) => {
      // Static imports
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier
        if (ts.isStringLiteral(specifier)) {
          edges.push({
            from: filePath,
            specifier: specifier.text,
            kind: 'import',
            isTypeOnly: isImportTypeOnly(node),
          })
        }
      }

      // Exports with a `from` clause (including re‑exports)
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text
        // Determine if it's a re‑export (export { ... } from '...') or export * from '...'
        const kind: ImportKind = node.exportClause ? 'reexport' : 'export'
        edges.push({
          from: filePath,
          specifier,
          kind,
          isTypeOnly: false, // export ... from cannot be type‑only in TypeScript
        })
      }

      // Dynamic imports (`import('...')`) and `require('...')` calls
      if (opts.markDynamicImports && ts.isCallExpression(node)) {
        const expr = node.expression
        // import('...')
        if (expr.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
          const arg = node.arguments[0]
          if (ts.isStringLiteral(arg)) {
            edges.push({
              from: filePath,
              specifier: arg.text,
              kind: 'dynamic',
              isTypeOnly: false,
            })
          }
        }
        // require('...')
        if (
          ts.isIdentifier(expr) &&
          expr.text === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0]
          if (ts.isStringLiteral(arg)) {
            edges.push({
              from: filePath,
              specifier: arg.text,
              kind: 'dynamic',
              isTypeOnly: false,
            })
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    // Deterministic ordering
    const sortedEdges = stableSort(edges, (a, b) => {
      // 1) by kind
      const kindOrder = { import: 0, export: 1, reexport: 2, dynamic: 3 }
      const kindCmp = kindOrder[a.kind] - kindOrder[b.kind]
      if (kindCmp !== 0) return kindCmp
      // 2) by specifier
      return stableStringCompare(a.specifier, b.specifier)
    })

    return { edges: sortedEdges }
  } catch (err) {
    // Any error during AST parsing → treat as failure
    return { edges: null, error: 'UNSUPPORTED' }
  }
}

/**
 * Check whether an import declaration is type‑only.
 */
function isImportTypeOnly(node: ts.ImportDeclaration): boolean {
  // `import type ...`
  if (node.importClause?.isTypeOnly) return true

  // `import { type X }`
  const clause = node.importClause
  if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    return clause.namedBindings.elements.some((elem) => elem.isTypeOnly)
  }

  return false
}

// Backwards-compatible wrapper used by tests and other callers that expect
// the original signature `parseWithAst(...): ImportEdge[] | null`.
export function parseWithAst(code: string, filePath: string, opts: ParseOptions): ImportEdge[] | null {
  return parseWithAstInfo(code, filePath, opts).edges;
}