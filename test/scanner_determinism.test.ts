import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { scanRepo } from '../src/scanner/scan.js';
import { stableJsonStringify } from '../src/utils/determinism.js';

describe('scanner determinism', () => {
    let tempDir: string;

    beforeAll(async () => {
        // Create a temporary directory with a deterministic structure
        tempDir = join(__dirname, 'temp_scanner_test');
        await fs.mkdir(tempDir, { recursive: true });

        // Create a few files and directories in a known order
        await fs.mkdir(join(tempDir, 'src'));
        await fs.writeFile(join(tempDir, 'src', 'index.ts'), '// dummy');
        await fs.writeFile(join(tempDir, 'src', 'utils.ts'), '// dummy');
        await fs.mkdir(join(tempDir, 'src', 'nested'));
        await fs.writeFile(join(tempDir, 'src', 'nested', 'helper.ts'), '// dummy');
        await fs.mkdir(join(tempDir, 'node_modules'));          // should be excluded
        await fs.writeFile(join(tempDir, 'node_modules', 'foo.js'), '// dummy');
        await fs.mkdir(join(tempDir, '.git'));                  // dotfolder, excluded
        await fs.writeFile(join(tempDir, '.git', 'config'), 'dummy');
        await fs.mkdir(join(tempDir, 'dist'));                  // excluded by default
        await fs.writeFile(join(tempDir, 'dist', 'out.js'), '// dummy');
        await fs.mkdir(join(tempDir, 'build'));                 // excluded by default
        await fs.writeFile(join(tempDir, 'build', 'artifact'), 'dummy');
        await fs.mkdir(join(tempDir, 'included'));
        await fs.writeFile(join(tempDir, 'included', 'ok.txt'), 'content');
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('produces identical JSON across multiple scans', async () => {
        const opts = { rootDir: tempDir };
        const results = await Promise.all([
            scanRepo(opts),
            scanRepo(opts),
            scanRepo(opts),
        ]);

        const strings = results.map(r => stableJsonStringify(r));
        for (let i = 1; i < strings.length; i++) {
            expect(strings[i]).toBe(strings[0]);
        }
    });

    it('excludes default excluded folders (node_modules, dist, build, .git)', async () => {
        const result = await scanRepo({ rootDir: tempDir });

        // Ensure excluded folders are not present in the tree
        function collectPaths(node: any): string[] {
            const paths: string[] = [node.relPath];
            if (node.children) {
                for (const child of node.children) {
                    paths.push(...collectPaths(child));
                }
            }
            return paths;
        }

        const allPaths = collectPaths(result.root);
        expect(allPaths).not.toContain('node_modules');
        expect(allPaths).not.toContain('node_modules/foo.js');
        expect(allPaths).not.toContain('.git');
        expect(allPaths).not.toContain('.git/config');
        expect(allPaths).not.toContain('dist');
        expect(allPaths).not.toContain('dist/out.js');
        expect(allPaths).not.toContain('build');
        expect(allPaths).not.toContain('build/artifact');

        // Included folders should be present
        expect(allPaths).toContain('included');
        expect(allPaths).toContain('included/ok.txt');
        expect(allPaths).toContain('src');
        expect(allPaths).toContain('src/index.ts');
        expect(allPaths).toContain('src/nested/helper.ts');
    });

    it('sorts children deterministically (dirs before files, then by name)', async () => {
        const result = await scanRepo({ rootDir: tempDir });

        function verifySorting(node: any): void {
            if (!node.children) return;
            let lastKind: 'dir' | 'file' | null = null;
            let lastName = '';
            for (const child of node.children) {
                // Kind ordering: dirs must come before files
                if (lastKind === 'file' && child.kind === 'dir') {
                    throw new Error(`Found directory after file: ${child.relPath}`);
                }
                // Within same kind, names must be sorted
                if (lastKind === child.kind && lastName.localeCompare(child.name, 'en', { sensitivity: 'base' }) > 0) {
                    throw new Error(`Names out of order: ${lastName} before ${child.name}`);
                }
                lastKind = child.kind;
                lastName = child.name;
                verifySorting(child);
            }
        }

        expect(() => verifySorting(result.root)).not.toThrow();
    });

    it('respects maxFiles soft cap', async () => {
        const result = await scanRepo({ rootDir: tempDir, maxFiles: 2 });
        expect(result.stats.files).toBeLessThanOrEqual(2);
        // The exact number depends on traversal order, but should be <=2
    });
});
