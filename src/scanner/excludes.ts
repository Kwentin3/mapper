/**
 * Exclusion logic for file system scanning.
 */

const DEFAULT_EXCLUDES = ['node_modules', 'dist', 'build', '.git', 'tmp', 'temp'] as const;

/**
 * Determine whether a file/directory should be excluded from scanning.
 *
 * @param name - single segment name (e.g., 'node_modules', '.git')
 * @param relPath - full relative path (POSIX) from the repository root
 * @param defaults - optional list of default excludes; if omitted, DEFAULT_EXCLUDES is used
 * @param extra - optional additional exclude patterns (exact segment matches)
 * @returns true if the item should be skipped
 */
import { stablePathNormalize } from '../utils/determinism';

export function shouldExclude(
    name: string,
    relPath: string,
    defaults: string[] = [...DEFAULT_EXCLUDES],
    extra?: string[]
): boolean {
    // dotfolder rule: any segment starting with '.' is excluded
    if (name.startsWith('.')) {
        return true;
    }

    const allExcludes = [...defaults, ...(extra ?? [])];
    // If any exclude matches the simple segment name, skip
    if (allExcludes.includes(name)) return true;
    // Also allow exact relative-path exclusions (POSIX normalized)
    const normRel = stablePathNormalize(relPath);
    if (allExcludes.includes(normRel)) return true;
    return false;
}
