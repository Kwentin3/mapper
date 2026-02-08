import { describe, test, expect, afterEach, vi } from 'vitest'
import { parseWithAst } from '../src/parser/ast_parser.js';
import { parseWithRegex } from '../src/parser/regex_fallback.js';
import type { ParseOptions } from '../src/parser/types.js';

describe('Dynamic import detection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  test('AST: dynamic import ignored when markDynamicImports = false', () => {
    const code = `import('./foo')`
    const opts: ParseOptions = { markDynamicImports: false }
    const edges = parseWithAst(code, 'test.ts', opts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([])
  })

  test('AST: dynamic import captured when markDynamicImports = true', () => {
    const code = `import('./foo')`
    const opts: ParseOptions = { markDynamicImports: true }
    const edges = parseWithAst(code, 'test.ts', opts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './foo',
        kind: 'dynamic',
        isTypeOnly: false,
      },
    ])
  })

  test('AST: require ignored when markDynamicImports = false', () => {
    const code = `require('./bar')`
    const opts: ParseOptions = { markDynamicImports: false }
    const edges = parseWithAst(code, 'test.ts', opts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([])
  })

  test('AST: require captured when markDynamicImports = true', () => {
    const code = `require('./bar')`
    const opts: ParseOptions = { markDynamicImports: true }
    const edges = parseWithAst(code, 'test.ts', opts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './bar',
        kind: 'dynamic',
        isTypeOnly: false,
      },
    ])
  })

  test('Regex: dynamic import ignored when markDynamicImports = false', () => {
    const code = `import('./foo')`
    const opts: ParseOptions = { markDynamicImports: false }
    const edges = parseWithRegex(code, 'test.ts', opts)
    expect(edges).toEqual([])
  })

  test('Regex: dynamic import captured when markDynamicImports = true', () => {
    const code = `import('./foo')`
    const opts: ParseOptions = { markDynamicImports: true }
    const edges = parseWithRegex(code, 'test.ts', opts)
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './foo',
        kind: 'dynamic',
        isTypeOnly: false,
      },
    ])
  })

  test('Regex: require captured when markDynamicImports = true', () => {
    const code = `require('./bar')`
    const opts: ParseOptions = { markDynamicImports: true }
    const edges = parseWithRegex(code, 'test.ts', opts)
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './bar',
        kind: 'dynamic',
        isTypeOnly: false,
      },
    ])
  })

  test('AST: mixed static and dynamic imports sorted correctly', () => {
    const code = `
      import('./c')
      import './a'
      require('./d')
      export * from './b'
    `
    const opts: ParseOptions = { markDynamicImports: true }
    const edges = parseWithAst(code, 'test.ts', opts)
    expect(edges).not.toBeNull()
    // Order: import (static), export, dynamic, dynamic (sorted by specifier within same kind)
    // static import './a' (kind import)
    // export './b' (kind export)
    // dynamic './c' (kind dynamic)
    // dynamic './d' (kind dynamic)
    expect(edges!).toHaveLength(4)
    expect(edges![0]).toEqual({
      from: 'test.ts',
      specifier: './a',
      kind: 'import',
      isTypeOnly: false,
    })
    expect(edges![1]).toEqual({
      from: 'test.ts',
      specifier: './b',
      kind: 'export',
      isTypeOnly: false,
    })
    expect(edges![2]).toEqual({
      from: 'test.ts',
      specifier: './c',
      kind: 'dynamic',
      isTypeOnly: false,
    })
    expect(edges![3]).toEqual({
      from: 'test.ts',
      specifier: './d',
      kind: 'dynamic',
      isTypeOnly: false,
    })
  })
})
