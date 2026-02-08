/**
 * Exclusion logic for file system scanning.
 */

const DEFAULT_EXCLUDES = ['node_modules', 'dist', 'build', '.git', 'tmp', 'temp'] as const;

// Prefix-based exclusions for repo-relative POSIX paths. Keep this list small and
// specific: these are known transient artifacts that should not pollute maps.
const DEFAULT_PREFIX_EXCLUDES = [
    // Created by legacy CLI path validation tests when run from the repo root.
    // Even if stale dirs exist on disk, we should not render them in maps.
    'test/temp_path_validation_',
] as const;

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

    // Prefix-based exclusions (repo-relative POSIX paths).
    for (const prefix of DEFAULT_PREFIX_EXCLUDES) {
        if (normRel.startsWith(prefix)) return true;
    }
    return false;
}
