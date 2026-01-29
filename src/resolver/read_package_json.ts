import { readFileSync, existsSync } from 'fs';

/**
 * Strip JavaScript‑style comments (// and /* *\/) from a JSON‑like string.
 * Naive implementation; does not handle comments inside string literals.
 */
function stripJsonComments(jsonStr: string): string {
  let inString = false;
  let escape = false;
  let result = '';
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escape) {
      escape = false;
      result += ch;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      result += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = !inString;
      result += ch;
      continue;
    }
    if (!inString) {
      // Check for // comment
      if (ch === '/' && i + 1 < jsonStr.length && jsonStr[i + 1] === '/') {
        // Skip to end of line
        while (i < jsonStr.length && jsonStr[i] !== '\n') i++;
        continue;
      }
      // Check for /* comment
      if (ch === '/' && i + 1 < jsonStr.length && jsonStr[i + 1] === '*') {
        // Skip until */
        i += 2;
        while (i < jsonStr.length && !(jsonStr[i] === '*' && i + 1 < jsonStr.length && jsonStr[i + 1] === '/')) i++;
        i += 1; // skip the '/'
        continue;
      }
    }
    result += ch;
  }
  return result;
}

/**
 * Recursively extract string substitutions from a package.json imports/exports value.
 * Returns an array of all string leaves under the given object.
 */
function extractSubstitutions(obj: any): string[] {
  if (typeof obj === 'string') {
    return [obj];
  }
  if (Array.isArray(obj)) {
    const result: string[] = [];
    for (const item of obj) {
      result.push(...extractSubstitutions(item));
    }
    return result;
  }
  if (obj && typeof obj === 'object') {
    // For conditional objects, prefer 'default' or 'import' (Node.js resolution)
    const keys = Object.keys(obj);
    // Order matters: 'import' > 'default' > first key
    const preferred = keys.find(k => k === 'import') ?? keys.find(k => k === 'default') ?? keys[0];
    if (preferred) {
      return extractSubstitutions(obj[preferred]);
    }
    return [];
  }
  return [];
}

/**
 * Load import mappings from a package.json file.
 *
 * @param packageJsonPath Absolute path to package.json.
 * @returns Map from import pattern (e.g., '#internal/*') to array of possible substitutions (e.g., ['./lib/*']).
 *          Returns empty object if file not found, invalid JSON, or no imports/exports defined.
 */
export function loadPackageImports(packageJsonPath: string): Record<string, string[]> {
  if (!existsSync(packageJsonPath)) {
    return {};
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const stripped = stripJsonComments(content);
    const parsed = JSON.parse(stripped);
    const result: Record<string, string[]> = {};

    // Handle "imports" field (subpath imports)
    if (parsed.imports && typeof parsed.imports === 'object') {
      for (const [pattern, mapping] of Object.entries(parsed.imports)) {
        const subs = extractSubstitutions(mapping);
        if (subs.length > 0) {
          result[pattern] = subs;
        }
      }
    }

    // Handle "exports" field (can also be used for resolution)
    if (parsed.exports && typeof parsed.exports === 'object') {
      // Top-level exports can be a string, array, or conditional object.
      // For simplicity, we treat each key as a pattern (e.g., '.' or './subpath').
      // However, exports mapping is more complex; we'll just add the root '.' mapping.
      // This is minimal support.
      if (typeof parsed.exports === 'string') {
        result['.'] = [parsed.exports];
      } else if (parsed.exports['.']) {
        const subs = extractSubstitutions(parsed.exports['.']);
        if (subs.length > 0) {
          result['.'] = subs;
        }
      }
    }

    return result;
  } catch {
    // If any error occurs, return empty map.
    return {};
  }
}