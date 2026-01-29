/**
 * Deterministic file system scanner.
 */

import { Dirent, promises as fs } from 'fs';
import { join, resolve as pathResolve } from 'path';
import {
    stablePathNormalize,
    stableStringCompare,
    stableSort,
} from '../utils/determinism';
import { shouldExclude } from './excludes';
import {
    DirNode,
    FileNode,
    ScanOptions,
    ScanResult,
    NodeKind,
} from './types';

/**
 * Recursively scan a directory and build a tree node.
 */
async function scanDir(
    absPath: string,
    relPath: string,
    opts: ScanOptions,
    stats: { files: number; dirs: number },
    warnings: string[],
    fileCount: { current: number }
): Promise<DirNode | null> {
    const dirName = absPath.split(/[\\/]/).pop() || '';
    // Check exclusion
    if (shouldExclude(dirName, relPath, undefined, opts.excludes)) {
        return null;
    }

    let entries: Dirent[];
    try {
        entries = await fs.readdir(absPath, { withFileTypes: true });
    } catch (err) {
        const message = `Failed to read directory ${relPath}: ${err instanceof Error ? err.message : String(err)}`;
        warnings.push(message);
        return null;
    }

    // Deterministic sort of entries BEFORE further processing
    const sortedEntries = stableSort(entries, (a, b) =>
        stableStringCompare(a.name, b.name)
    );

    const children: Array<DirNode | FileNode> = [];

    for (const entry of sortedEntries) {
        // Soft cap check
        if (opts.maxFiles !== undefined && fileCount.current >= opts.maxFiles) {
            break;
        }

        const entryRel = relPath === '' ? entry.name : `${relPath}/${entry.name}`;
        const entryAbs = join(absPath, entry.name);

        if (entry.isDirectory()) {
            const childDir = await scanDir(
                entryAbs,
                entryRel,
                opts,
                stats,
                warnings,
                fileCount
            );
            if (childDir !== null) {
                children.push(childDir);
                stats.dirs++;
            }
        } else if (entry.isFile()) {
            if (shouldExclude(entry.name, entryRel, undefined, opts.excludes)) {
                continue;
            }
            const ext = entry.name.includes('.')
                ? entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase()
                : '';
            const fileNode: FileNode = {
                kind: 'file',
                name: entry.name,
                relPath: stablePathNormalize(entryRel),
                ext,
            };
            children.push(fileNode);
            stats.files++;
            fileCount.current++;
        }
        // Symlinks, etc. are ignored
    }

    // Stable sort children: directories first, then files, each group sorted by name
    const sortedChildren = stableSort(children, (a, b) => {
        if (a.kind !== b.kind) {
            // 'dir' < 'file' (directories first)
            return a.kind === 'dir' ? -1 : 1;
        }
        return stableStringCompare(a.name, b.name);
    });

    const dirNode: DirNode = {
        kind: 'dir',
        name: dirName,
        relPath: stablePathNormalize(relPath),
        children: sortedChildren,
    };
    return dirNode;
}

/**
 * Scan a repository starting from `rootDir` and return a deterministic file tree.
 */
export async function scanRepo(opts: ScanOptions): Promise<ScanResult> {
    // Resolve the provided root directory to an absolute path first so that
    // segments like '.' or relative paths are not interpreted as literal
    // directory names (which could be excluded by the dot-folder rule).
    const rootDir = stablePathNormalize(pathResolve(opts.rootDir));
    const stats = { files: 0, dirs: 0 };
    const warnings: string[] = [];
    const fileCount = { current: 0 };

    const root = await scanDir(
        rootDir,
        '',
        opts,
        stats,
        warnings,
        fileCount
    );

    if (!root) {
        throw new Error(`Root directory ${rootDir} could not be scanned (excluded or unreadable).`);
    }

    // Ensure warnings are deterministically ordered (they already are due to push order,
    // but we could sort them for extra safety). We'll keep insertion order as it's deterministic.
    const sortedWarnings = stableSort(warnings, stableStringCompare);

    return {
        root,
        stats,
        warnings: sortedWarnings,
    };
}
