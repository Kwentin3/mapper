/**
 * Public API for the parser module.
 */

export type { ImportEdge, ImportKind, ParseFileResult, ParseOptions } from './types'
export { parseWithAst } from './ast_parser'
export { parseWithRegex } from './regex_fallback'
export { parseFile } from './parse_file'