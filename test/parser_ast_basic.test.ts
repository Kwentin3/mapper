import { describe, test, expect, afterEach, vi } from 'vitest'
import { parseWithAst } from '../src/parser/ast_parser.js';
import type { ParseOptions } from '../src/parser/types.js';

describe('AST parser basic extraction', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  const defaultOpts: ParseOptions = { markDynamicImports: false }

  test('extracts static import', () => {
    const code = `import { foo } from './module'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './module',
        kind: 'import',
        isTypeOnly: false,
      },
    ])
  })

  test('extracts default import', () => {
    const code = `import bar from '../bar'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: '../bar',
        kind: 'import',
        isTypeOnly: false,
      },
    ])
  })

  test('extracts export from', () => {
    const code = `export { baz } from './baz'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './baz',
        kind: 'reexport',
        isTypeOnly: false,
      },
    ])
  })

  test('extracts export * from', () => {
    const code = `export * from './all'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './all',
        kind: 'export',
        isTypeOnly: false,
      },
    ])
  })

  test('detects type‑only import', () => {
    const code = `import type { Foo } from './types'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './types',
        kind: 'import',
        isTypeOnly: true,
      },
    ])
  })

  test('detects type‑only import with inline type', () => {
    const code = `import { type Bar } from './bar'`
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges).toEqual([
      {
        from: 'test.ts',
        specifier: './bar',
        kind: 'import',
        isTypeOnly: true,
      },
    ])
  })

  test('multiple imports produce deterministic ordering', () => {
    const code = `
      import './z'
      import './a'
      export * from './b'
    `
    const edges = parseWithAst(code, 'test.ts', defaultOpts)
    expect(edges).not.toBeNull()
    expect(edges!).toHaveLength(3)
    // Expect sorted by kind (import, import, export) then specifier
    expect(edges![0].specifier).toBe('./a')
    expect(edges![1].specifier).toBe('./z')
    expect(edges![2].specifier).toBe('./b')
    expect(edges![2].kind).toBe('export')
  })
})
