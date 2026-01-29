import { readFileSync, existsSync } from 'fs';
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

/**
 * Load path aliases from a tsconfig.json file.
 *
 * @param tsconfigPath Absolute path to tsconfig.json (defaults to '<projectRoot>/tsconfig.json').
 * @returns Map from pattern (e.g., '@/*') to array of possible substitutions (e.g., ['./src/*']).
 *          Returns empty object if file not found, invalid JSON, or no paths defined.
 */
export function loadTsconfigAliases(tsconfigPath: string): Record<string, string[]> {
  if (!existsSync(tsconfigPath)) {
    return {};
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
      return result;
    }
    return {};
  } catch {
    // If any error occurs (parse, read, etc.) return empty aliases.
    return {};
  }
}