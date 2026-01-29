import { stablePathNormalize, stableSort, stableStringCompare } from '../../src/utils/determinism.js';
import * as path from 'path';
import type { BuildGraphInput, DependencyGraph, GraphNode } from '../../src/graph/types.js';
import type { RenderInput } from '../../src/render/types.js';
import type { DirNode, FileNode } from '../../src/scanner/types.js';
import type { SignalsResult, Signal, SignalKind } from '../../src/signals/types.js';
import type { ParseFileResult } from '../../src/parser/types.js';
import type { ResolvedTarget } from '../../src/resolver/types.js';

export class FixtureBuilder {
    private filesSet = new Set<string>();
    private dirsSet = new Set<string>();
    private importsMap = new Map<string, string[]>();
    private signalsMap = new Map<string, Signal[]>();

    constructor() {
        this.dirsSet.add('.');
    }

    dir(path: string): this {
        const norm = stablePathNormalize(path);
        if (norm === '.') return this;
        this.dirsSet.add(norm);
        // Ensure parent directories exist
        const parts = norm.split('/');
        for (let i = 1; i < parts.length; i++) {
            this.dirsSet.add(parts.slice(0, i).join('/'));
        }
        return this;
    }

    file(path: string): this {
        const norm = stablePathNormalize(path);
        this.filesSet.add(norm);
        // Ensure parent directory exists
        const parts = norm.split('/');
        if (parts.length > 1) {
            this.dir(parts.slice(0, -1).join('/'));
        }
        return this;
    }

    makeMany(dirPath: string, options: { files: number; prefix: string; ext: string }): this {
        this.dir(dirPath);
        for (let i = 1; i <= options.files; i++) {
            const fileName = `${options.prefix}${i.toString().padStart(2, '0')}${options.ext}`;
            this.file(`${dirPath}/${fileName}`);
        }
        return this;
    }

    chain(startDir: string, depth: number): this {
        let currentDir = stablePathNormalize(startDir);
        for (let i = 0; i < depth; i++) {
            this.dir(currentDir);
            this.file(`${currentDir}/file_${i}.ts`);
            currentDir = `${currentDir}/step_${i}`;
        }
        return this;
    }

    imports(from: string, targets: string[]): this {
        const normFrom = stablePathNormalize(from);
        this.file(normFrom);
        const normTargets = targets.map(t => stablePathNormalize(t));
        normTargets.forEach(t => this.file(t));
        this.importsMap.set(normFrom, normTargets);
        return this;
    }

    signal(path: string, signalStr: string): this {
        const normPath = stablePathNormalize(path);
        this.file(normPath);
        
        let kind: SignalKind = 'hint';
        let code = signalStr;

        if (signalStr.startsWith('!')) {
            kind = 'risk';
            code = signalStr.slice(1).trim();
        } else if (signalStr.startsWith('→')) {
            kind = 'nav';
            code = signalStr.slice(1).trim();
        } else if (signalStr.startsWith('i')) {
            kind = 'hint';
            code = signalStr.slice(1).trim();
        }

        const current = this.signalsMap.get(normPath) || [];
        current.push({ kind, code });
        this.signalsMap.set(normPath, current);
        return this;
    }

    buildGraphInput(): BuildGraphInput {
        const sortedFiles = Array.from(this.filesSet).sort(stableStringCompare);
        const parsed: ParseFileResult[] = sortedFiles.map(f => ({
            file: f,
            edges: (this.importsMap.get(f) || []).map(imp => ({
                from: f,
                specifier: imp,
                kind: 'import',
                isTypeOnly: false
            })),
            warnings: []
        }));

        const resolve = (from: string, spec: string): ResolvedTarget => {
            const normSpec = stablePathNormalize(spec);
            if (this.filesSet.has(normSpec)) {
                return { kind: 'internal', path: normSpec, original: spec };
            }
            return { kind: 'external', path: spec, original: spec };
        };

        return { files: sortedFiles, parsed, resolve };
    }

    async writeToDisk(targetDir: string): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');

        await fs.mkdir(targetDir, { recursive: true });

        // Dirs
        const sortedDirs = Array.from(this.dirsSet).sort(stableStringCompare);
        for (const dir of sortedDirs) {
            if (dir === '.') continue;
            await fs.mkdir(path.join(targetDir, dir), { recursive: true });
        }

        // Files
        for (const file of this.filesSet) {
            const content = this.importsMap.has(file)
                ? this.importsMap.get(file)!.map(imp => `import '${imp}';`).join('\n')
                : '// test file';
            await fs.writeFile(path.join(targetDir, file), content);
        }
    }

    buildRenderInput(): RenderInput {
        const graphInput = this.buildGraphInput();
        
        // Build Tree
        const root: DirNode = { kind: 'dir', name: '', relPath: '.', children: [] };
        const nodeMap = new Map<string, DirNode | FileNode>();
        nodeMap.set('.', root);

        const sortedDirs = Array.from(this.dirsSet).sort((a, b) => a.split('/').length - b.split('/').length || stableStringCompare(a, b));
        for (const dirPath of sortedDirs) {
            if (dirPath === '.') continue;
            const parts = dirPath.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.length === 1 ? '.' : parts.slice(0, -1).join('/');
            const parent = nodeMap.get(parentPath) as DirNode;
            const node: DirNode = { kind: 'dir', name, relPath: dirPath, children: [] };
            parent.children.push(node);
            nodeMap.set(dirPath, node);
        }

        const sortedFiles = Array.from(this.filesSet).sort(stableStringCompare);
        for (const filePath of sortedFiles) {
            const parts = filePath.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.length === 1 ? '.' : parts.slice(0, -1).join('/');
            const parent = nodeMap.get(parentPath) as DirNode;
            const ext = name.includes('.') ? name.split('.').pop()! : '';
            const node: FileNode = { kind: 'file', name, relPath: filePath, ext };
            parent.children.push(node);
        }

        const sortChildren = (node: DirNode) => {
            node.children = stableSort(node.children, (a, b) => {
                if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
                return stableStringCompare(a.name, b.name);
            });
            node.children.forEach(child => {
                if (child.kind === 'dir') sortChildren(child);
            });
        };
        sortChildren(root);

        // Build Graph
        const nodes = new Map<string, GraphNode>();
        for (const f of sortedFiles) {
            nodes.set(f, { id: f, outgoing: new Set(), incoming: new Set(), externals: new Set() });
        }

        // Resolve import specifiers relative to the "from" file when they are
        // relative (./ or ../). This mirrors the resolver behavior used in the
        // pipeline and ensures graph edges point at the actual file keys
        // (e.g. 'src/api.ts' rather than './api.ts').
    // Use POSIX path operations so normalization keeps forward slashes.
        for (const [from, targets] of this.importsMap.entries()) {
            const fromNode = nodes.get(from)!;
            const fromDir = from.includes('/') ? from.split('/').slice(0, -1).join('/') : '.';
            for (const target of targets) {
                let resolved = target;
                if (target.startsWith('./') || target.startsWith('../')) {
                    // Resolve relative to the parent directory of `from`.
                    // Use posix join to keep forward slashes across platforms.
                    resolved = path.posix.normalize(path.posix.join(fromDir, target));
                }
                // Normalize to our stable canonical form
                resolved = resolved.replace(/\\/g, '/');

                if (nodes.has(resolved)) {
                    fromNode.outgoing.add(resolved);
                    nodes.get(resolved)!.incoming.add(from);
                } else {
                    fromNode.externals.add(resolved);
                }
            }
        }

        const graph: DependencyGraph = { nodes, cycles: [] };

        // Build Signals
        const signals: SignalsResult = {
            files: Array.from(this.signalsMap.entries()).map(([file, inline]) => ({ file, inline })),
            entrypoints: [],
            publicApi: [],
            hubsFanIn: [],
            hubsFanOut: [],
            warnings: []
        };

        return { tree: root, graph, signals };
    }
}

export const fb = () => new FixtureBuilder();
