import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Tree rendering contract guard', () => {
  it('only the canonical builder may contain tree glyphs', async () => {
    const filePath = join(__dirname, '..', 'src', 'render', 'render_tree.ts');
    const src = await fs.readFile(filePath, 'utf-8');

    // Remove comments (block and line) and string literals to avoid false positives.
    let stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/(^|[^:])\/\/.*$/gm, '') // line comments (ignore // in URLs by simple heuristic)
      .replace(/(['"`])(?:\\.|(?!\1).)*\1/gs, ''); // string literals (single, double, template)

    const builderName = 'function buildTreePrefix';
    const idx = stripped.indexOf(builderName);
    expect(idx).toBeGreaterThan(-1);

    // Find the function body by locating the opening brace and matching to its closing brace.
    const openBrace = stripped.indexOf('{', idx);
    expect(openBrace).toBeGreaterThan(-1);

    // Match braces to find function end
    let depth = 0;
    let endIdx = -1;
    for (let i = openBrace; i < stripped.length; i++) {
      const ch = stripped[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    expect(endIdx).toBeGreaterThan(openBrace);

    const before = stripped.slice(0, openBrace);
    const builderBody = stripped.slice(openBrace, endIdx + 1);
    const after = stripped.slice(endIdx + 1);

    // Glyph patterns to forbid outside builder
    const patterns = [/│/, /├──/, /└──/];

    for (const p of patterns) {
      expect(p.test(before)).toBe(false);
      expect(p.test(after)).toBe(false);
    }
  });
});
