import { existsSync } from 'fs';
import { join, resolve, isAbsolute, extname, dirname } from 'path';
import { stableSort, stableStringCompare, stablePathNormalize } from '../utils/determinism';
import { loadTsconfigAliases } from './read_tsconfig';
import { loadPackageImports } from './read_package_json';
import type { ResolvedKind, ResolvedTarget, ResolverOptions, ResolveResult } from './types';

/**
 * Default extensions to probe when a specifier lacks an extension.
 */
const DEFAULT_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs', 'cjs'];

function normalizeExtensionsList(extensions: string[] | undefined): string[] {
  const input = extensions && extensions.length > 0 ? extensions : DEFAULT_EXTENSIONS;
  const out: string[] = [];
  for (const ext of input) {
    const trimmed = ext.startsWith('.') ? ext.slice(1) : ext;
    const lower = trimmed.toLowerCase();
    if (lower === '') continue;
    if (!out.includes(lower)) out.push(lower);
  }
  return out;
}

/**
 * Determine if a specifier is relative (starts with './' or '../') or absolute (starts with '/').
 */
function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function isAbsoluteSpecifier(specifier: string): boolean {
  return specifier.startsWith('/');
}

function isBareSpecifier(specifier: string): boolean {
  return !isRelativeSpecifier(specifier) && !isAbsoluteSpecifier(specifier) && !specifier.startsWith('#');
}

function isHashSpecifier(specifier: string): boolean {
  return specifier.startsWith('#');
}

/**
 * Probe for a file with the given base path and extensions.
 * Returns the first existing file path (with extension), or null if none exists.
 * Also checks for directory with an index file (index.{ext}).
 */
function probeFile(basePath: string, extensions: string[]): string | null {
  const originalExt = extname(basePath);
  // If basePath already has an extension, check existence directly
  if (originalExt !== '') {
    if (existsSync(basePath)) {
      return basePath;
    }
    // File with original extension not found – try fallback extensions
    // Remove the original extension from basePath
    const baseWithoutExt = basePath.slice(0, -originalExt.length);
    // Determine which extensions to try (excluding the original extension)
    const filteredExtensions = extensions.filter(ext => `.${ext}` !== originalExt);
    // Try each fallback extension
    for (const ext of filteredExtensions) {
      const candidate = `${baseWithoutExt}.${ext}`;
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    // Also try as a directory with an index file (using filtered extensions)
    if (existsSync(baseWithoutExt)) {
      for (const ext of filteredExtensions) {
        const candidate = join(baseWithoutExt, `index.${ext}`);
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  // No original extension – try each extension
  for (const ext of extensions) {
    const candidate = `${basePath}.${ext}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Try as a directory with an index file
  if (existsSync(basePath)) {
    for (const ext of extensions) {
      const candidate = join(basePath, `index.${ext}`);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Convert an absolute file system path to a project‑relative POSIX path.
 */
function toProjectRelativePath(absolutePath: string, projectRoot: string): string {
  let relative = absolutePath;
  if (absolutePath.startsWith(projectRoot)) {
    relative = absolutePath.slice(projectRoot.length).replace(/\\/g, '/');
    if (relative.startsWith('/')) {
      relative = relative.slice(1);
    }
  }
  return stablePathNormalize(relative);
}

/**
 * Re‑order extension list to prioritize TypeScript files when the specifier ends with a JavaScript extension.
 * This implements the fallback rule:
 *   - .js, .mjs, .cjs → try .ts then .tsx
 *   - .jsx → try .tsx then .ts
 * The original extension is already probed first by probeFile.
 */
function reorderExtensionsForJsFallback(specifier: string, extensions: string[]): string[] {
  const lower = specifier.toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    // Priority: .ts, .tsx, then the rest of extensions (excluding duplicates)
    const priority = ['ts', 'tsx'];
    const rest = extensions.filter(ext => !priority.includes(ext));
    return [...priority, ...rest];
  }
  if (lower.endsWith('.jsx')) {
    // Priority: .tsx, .ts, then the rest
    const priority = ['tsx', 'ts'];
    const rest = extensions.filter(ext => !priority.includes(ext));
    return [...priority, ...rest];
  }
  // No reordering
  return extensions;
}

/**
 * Internal resolution for relative/absolute specifiers.
 * Returns an array of resolved targets (could be multiple if extensions produce different possibilities).
 */
function resolveInternal(
  specifier: string,
  options: ResolverOptions
): ResolvedTarget[] {
  const { baseDir, projectRoot } = options;
  const normalizedExtensions = normalizeExtensionsList(options.extensions);
  const finalExtensions = reorderExtensionsForJsFallback(specifier, normalizedExtensions);
  const resolvedAbsolute = isAbsoluteSpecifier(specifier)
    ? resolve(projectRoot, specifier.slice(1)) // strip leading '/'
    : resolve(baseDir, specifier);

  const probed = probeFile(resolvedAbsolute, finalExtensions);
  if (probed) {
    const path = toProjectRelativePath(probed, projectRoot);
    return [
      {
        path,
        kind: 'internal',
        original: specifier,
      },
    ];
  }

  // Not found
  return [];
}

/**
 * Expand a bare specifier using tsconfig paths.
 * Returns a list of candidate substitutions (absolute paths).
 */
function expandTsconfigPaths(
  specifier: string,
  options: ResolverOptions
): string[] {
  const { projectRoot, tsconfigPath = join(projectRoot, 'tsconfig.json') } = options;
  const aliases = loadTsconfigAliases(tsconfigPath);
  const candidates: string[] = [];

  for (const [pattern, substitutions] of Object.entries(aliases)) {
    // Simple pattern matching: only support '*' wildcard at end.
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (specifier.startsWith(prefix + '/')) {
        const suffix = specifier.slice(prefix.length + 1); // +1 for '/'
        for (const sub of substitutions) {
          if (sub.includes('*')) {
            const candidate = sub.replace('*', suffix);
            candidates.push(resolve(projectRoot, candidate));
          } else {
            // If substitution does not contain '*', treat as exact replacement (ignore suffix)
            candidates.push(resolve(projectRoot, sub));
          }
        }
      }
    } else if (pattern === specifier) {
      // Exact match
      for (const sub of substitutions) {
        candidates.push(resolve(projectRoot, sub));
      }
    }
  }

  // Deduplicate and keep order deterministic
  const unique = Array.from(new Set(candidates));
  return stableSort(unique, stableStringCompare);
}

/**
 * Expand a hash specifier using package.json imports.
 */
function expandPackageImports(
  specifier: string,
  options: ResolverOptions
): string[] {
  const { projectRoot, packageJsonPath = join(projectRoot, 'package.json') } = options;
  const imports = loadPackageImports(packageJsonPath);
  const candidates: string[] = [];

  for (const [pattern, substitutions] of Object.entries(imports)) {
    // Simple pattern matching: only support '*' wildcard at end.
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (specifier.startsWith(prefix + '/')) {
        const suffix = specifier.slice(prefix.length + 1); // +1 for '/'
        for (const sub of substitutions) {
          if (sub.includes('*')) {
            const candidate = sub.replace('*', suffix);
            candidates.push(resolve(projectRoot, candidate));
          } else {
            // If substitution does not contain '*', treat as exact replacement (ignore suffix)
            candidates.push(resolve(projectRoot, sub));
          }
        }
      }
    } else if (pattern === specifier) {
      // Exact match
      for (const sub of substitutions) {
        candidates.push(resolve(projectRoot, sub));
      }
    }
  }

  // Deduplicate and keep order deterministic
  const unique = Array.from(new Set(candidates));
  return stableSort(unique, stableStringCompare);
}

/**
 * Core resolution logic.
 */
export function resolveSpecifier(
  specifier: string,
  options: ResolverOptions
): ResolveResult {
  const warnings: string[] = [];
  const resolved: ResolvedTarget[] = [];

  // Step 1: Determine specifier type
  const isRelative = isRelativeSpecifier(specifier);
  const isAbsolute = isAbsoluteSpecifier(specifier);
  const isHash = isHashSpecifier(specifier);
  const isBare = isBareSpecifier(specifier);

  // Step 2: Internal resolution (relative / absolute)
  if (isRelative || isAbsolute) {
    const internal = resolveInternal(specifier, options);
    resolved.push(...internal);
    if (internal.length === 0) {
      warnings.push(`Internal specifier not found: ${specifier}`);
    }
  }

  // Step 3: Tsconfig paths (bare specifiers)
  if (isBare) {
    const pathCandidates = expandTsconfigPaths(specifier, options);
    const pathTargets: ResolvedTarget[] = [];
    const normalizedExtensions = normalizeExtensionsList(options.extensions);
    for (const cand of pathCandidates) {
      const probed = probeFile(cand, normalizedExtensions);
      if (probed) {
        pathTargets.push({
          path: toProjectRelativePath(probed, options.projectRoot),
          kind: 'alias',
          original: specifier,
          aliasPattern: '(tsconfig paths)',
        });
      }
    }
    if (pathTargets.length > 0) {
      resolved.push(...pathTargets);
    } else {
      // Fallback to external
      resolved.push({
        path: specifier,
        kind: 'external',
        original: specifier,
      });
    }
  }

  // Step 4: Package imports (hash specifiers)
  if (isHash) {
    const importCandidates = expandPackageImports(specifier, options);
    const importTargets: ResolvedTarget[] = [];
    const normalizedExtensions = normalizeExtensionsList(options.extensions);
    for (const cand of importCandidates) {
      const probed = probeFile(cand, normalizedExtensions);
      if (probed) {
        importTargets.push({
          path: toProjectRelativePath(probed, options.projectRoot),
          kind: 'alias',
          original: specifier,
          aliasPattern: '(package.json imports)',
        });
      }
    }
    if (importTargets.length > 0) {
      resolved.push(...importTargets);
    } else {
      warnings.push(`Package import not resolved: ${specifier}`);
      resolved.push({
        path: specifier,
        kind: 'unresolved',
        original: specifier,
      });
    }
  }

  // Step 5: Heuristics – if nothing resolved yet, treat as external or unresolved
  if (resolved.length === 0) {
    if (isBare) {
      resolved.push({
        path: specifier,
        kind: 'external',
        original: specifier,
      });
    } else {
      resolved.push({
        path: specifier,
        kind: 'unresolved',
        original: specifier,
      });
      warnings.push(`Unresolved specifier: ${specifier}`);
    }
  }

  // Ensure deterministic ordering of resolved targets
  const sortedResolved = stableSort(resolved, (a, b) => {
    const kindOrder: Record<ResolvedKind, number> = {
      internal: 0,
      alias: 1,
      external: 2,
      unresolved: 3,
    };
    const cmp = kindOrder[a.kind] - kindOrder[b.kind];
    if (cmp !== 0) return cmp;
    return stableStringCompare(a.path, b.path);
  });

  // Sort warnings as well (they are added in deterministic order but safe to sort)
  const sortedWarnings = stableSort(warnings, stableStringCompare);

  return {
    specifier,
    resolved: sortedResolved,
    warnings: sortedWarnings,
  };
}
