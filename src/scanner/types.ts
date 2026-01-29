/**
 * Types for deterministic file system scanning.
 */

export type NodeKind = 'dir' | 'file'

export interface FileNodeBase {
    kind: NodeKind
    name: string          // single segment
    relPath: string       // posix, repo-root-relative (from stablePathNormalize)
}

export interface FileNode extends FileNodeBase {
    kind: 'file'
    ext: string           // lowercased extension without dot, '' if none
}

export interface DirNode extends FileNodeBase {
    kind: 'dir'
    children: Array<DirNode | FileNode>  // MUST be stably sorted by (kind, name)
}

export interface ScanOptions {
    rootDir: string
    excludes?: string[]      // additional glob-like segments optional
    maxFiles?: number        // optional soft cap
}

export interface ScanResult {
    root: DirNode
    stats: { files: number; dirs: number }
    warnings: string[]       // deterministic ordering
}
