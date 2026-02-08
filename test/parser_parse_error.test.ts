import { describe, test, expect, afterEach, vi } from 'vitest'
import { parseFile } from '../src/parser/parse_file.js';
import type { ParseOptions } from '../src/parser/types.js';

describe('Parser error recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  const defaultOpts: ParseOptions = { markDynamicImports: false }

  test('broken syntax triggers warning and no edges', () => {
    const code = `import from './foo' // missing identifier`
    const result = parseFile('broken.ts', code, defaultOpts)
    expect(result.file).toBe('broken.ts')
      expect(result.edges).toEqual([])
      expect(result.warnings).toEqual(['(? PARSE-ERROR:SYNTAX) broken.ts'])
  })

  test('empty file yields empty edges and no warning', () => {
    const code = ''
    const result = parseFile('empty.ts', code, defaultOpts)
    expect(result.edges).toEqual([])
    expect(result.warnings).toEqual([])
  })

  test('valid file with no imports yields empty edges and no warning', () => {
    const code = `const x = 1;`
    const result = parseFile('noimport.ts', code, defaultOpts)
    expect(result.edges).toEqual([])
    expect(result.warnings).toEqual([])
  })

  test('deterministic warning format', () => {
    const code = `export {`
    const result = parseFile('unfinished.ts', code, defaultOpts)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatch(/^\(\? PARSE-ERROR:SYNTAX\) unfinished\.ts$/)
  })
})
