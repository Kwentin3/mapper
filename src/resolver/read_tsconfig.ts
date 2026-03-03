import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Very simple comment stripper for JSON with line comments (//) and block comments (/* *\/).
 * Does not handle trailing commas, but that's okay for tsconfig (TypeScript's tsconfig reader is more tolerant).
 */
function stripJsonComments(jsonText: string): string {
  let inString = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  let out = '';

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    const next = jsonText[i + 1];

    if (escape) {
      escape = false;
      out += ch;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      out += ch;
      continue;
    }

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch; // keep newline
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // skip the '/'
      }
      continue;
    }

    // start of string
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    // start of line comment
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++; // skip second '/'
      continue;
    }

    // start of block comment
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++; // skip '*'
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Tolerant JSON parse that strips comments before parsing.
 */
function parseJsonTolerant(text: string): any {
  const cleaned = stripJsonComments(text);
  return JSON.parse(cleaned);
}

type AliasesCacheEntry = {
  mtimeMs: number;
  size: number;
  value: Record<string, string[]>;
};

const aliasesCache = new Map<string, AliasesCacheEntry>();

function readFileSignature(path: string): { mtimeMs: number; size: number } | null {
  try {
    const st = statSync(path);
    return { mtimeMs: st.mtimeMs, size: st.size };
  } catch {
    return null;
  }
}

/**
 * Load path aliases from a tsconfig.json file.
 *
 * @param tsconfigPath Absolute path to tsconfig.json (defaults to '<projectRoot>/tsconfig.json').
 * @returns Map from pattern (e.g., '@/*') to array of possible substitutions (e.g., ['./src/*']).
 *          Returns empty object if file not found, invalid JSON, or no paths defined.
 */
export function loadTsconfigAliases(tsconfigPath: string): Record<string, string[]> {
  if (!existsSync(tsconfigPath)) {
    aliasesCache.delete(tsconfigPath);
    return {};
  }

  const signature = readFileSignature(tsconfigPath);
  if (!signature) {
    aliasesCache.delete(tsconfigPath);
    return {};
  }

  const cached = aliasesCache.get(tsconfigPath);
  if (cached && cached.mtimeMs === signature.mtimeMs && cached.size === signature.size) {
    return cached.value;
  }

  try {
    const content = readFileSync(tsconfigPath, 'utf-8');
    const parsed = parseJsonTolerant(content);
    const paths = parsed?.compilerOptions?.paths;
    if (paths && typeof paths === 'object' && !Array.isArray(paths)) {
      // Ensure each value is an array of strings
      const result: Record<string, string[]> = {};
      for (const [pattern, substitutions] of Object.entries(paths)) {
        if (Array.isArray(substitutions)) {
          result[pattern] = substitutions.filter((s): s is string => typeof s === 'string');
        } else if (typeof substitutions === 'string') {
          result[pattern] = [substitutions];
        }
      }
      aliasesCache.set(tsconfigPath, { ...signature, value: result });
      return result;
    }
    aliasesCache.set(tsconfigPath, { ...signature, value: {} });
    return {};
  } catch {
    // If any error occurs (parse, read, etc.) return empty aliases.
    aliasesCache.set(tsconfigPath, { ...signature, value: {} });
    return {};
  }
}
