import { describe, test, expect, afterEach, vi } from 'vitest'
import { parseFile } from '../src/parser/parse_file'
import { stableJsonStringify } from '../src/utils/determinism'
import type { ParseOptions } from '../src/parser/types'

describe('Parser determinism', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  const opts: ParseOptions = { markDynamicImports: true }

  test('same file parsed twice yields identical stable JSON', () => {
    const code = `
      import './b'
      export * from './a'
      import('./c')
      require('./d')
    `
    const result1 = parseFile('test.ts', code, opts)
    const result2 = parseFile('test.ts', code, opts)
    expect(stableJsonStringify(result1)).toBe(stableJsonStringify(result2))
  })

  test('deterministic ordering across different parse orders', () => {
    const code = `
      import './z'
      import './a'
      export * from './b'
      export { foo } from './c'
    `
    const result = parseFile('test.ts', code, opts)
    // edges should be sorted by kind then specifier
    const kinds = result.edges.map(e => e.kind)
    const specifiers = result.edges.map(e => e.specifier)
    // Expect order: import './a', import './z', export './b', reexport './c'
    expect(kinds).toEqual(['import', 'import', 'export', 'reexport'])
    expect(specifiers).toEqual(['./a', './z', './b', './c'])
  })

  test('deterministic warning ordering', () => {
    // This test is trivial because we only have one warning scenario.
    // But we can test that warnings are always in the same order.
    const code = `import from` // broken
    const result1 = parseFile('broken.ts', code, opts)
    const result2 = parseFile('broken.ts', code, opts)
    expect(result1.warnings).toEqual(result2.warnings)
  })
})