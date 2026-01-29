import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI golden fixture repo', () => {
    let tempDir: string;
    let repoDir: string;

    beforeEach(async () => {
        // Create a temporary directory
        tempDir = join(__dirname, 'temp_golden_fixture_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create repo subdirectory
        repoDir = join(tempDir, 'repo');
        await fs.mkdir(repoDir, { recursive: true });

        // 1. package.json
        await fs.writeFile(join(repoDir, 'package.json'), JSON.stringify({
            name: 'fixture-repo',
            version: '1.0.0',
            type: 'module',
        }, null, 2));

        // 2. tsconfig.json with baseUrl + paths
        await fs.writeFile(join(repoDir, 'tsconfig.json'), JSON.stringify({
            compilerOptions: {
                baseUrl: '.',
                paths: {
                    '@/*': ['src/*'],
                    '@packages/*': ['packages/*/src'],
                },
                moduleResolution: 'node',
                target: 'ES2020',
                module: 'ES2020',
            },
        }, null, 2));

        // Create src directory
        await fs.mkdir(join(repoDir, 'src'), { recursive: true });
        // Create deep/layer directory for parse error file
        await fs.mkdir(join(repoDir, 'src', 'deep', 'layer'), { recursive: true });
        // Create packages/pkgA/src and packages/pkgB/src
        await fs.mkdir(join(repoDir, 'packages', 'pkgA', 'src'), { recursive: true });
        await fs.mkdir(join(repoDir, 'packages', 'pkgB', 'src'), { recursive: true });

        // 3. src/index.ts - imports via alias and relative, creates cycle with a.ts
        await fs.writeFile(join(repoDir, 'src', 'index.ts'), `
import { a } from './a';
import { hub } from '@/hub';
import { deepFile } from './deep/layer/deeper/another';
import { pkgA } from '@packages/pkgA';

console.log(a, hub, deepFile, pkgA);
`.trim());

        // 4. src/a.ts - imports index.ts to create a cycle, also imports hub
        await fs.writeFile(join(repoDir, 'src', 'a.ts'), `
import { index } from './index';
import { hub } from '@/hub';
export const a = 1;
`.trim());

        // 5. src/hub.ts - hub file imported by multiple files
        await fs.writeFile(join(repoDir, 'src', 'hub.ts'), `
export const hub = 'hub';
`.trim());

        // 6. src/deep/layer/bad.ts - parse error (invalid syntax)
        await fs.writeFile(join(repoDir, 'src', 'deep', 'layer', 'bad.ts'), `
const x = ;
`.trim());

        // 7. src/deep/layer/deeper/another.ts - deep path > 3
        await fs.mkdir(join(repoDir, 'src', 'deep', 'layer', 'deeper'), { recursive: true });
        await fs.writeFile(join(repoDir, 'src', 'deep', 'layer', 'deeper', 'another.ts'), `
export const deepFile = 'deep';
`.trim());

        // 8. packages/pkgA/src/index.ts - with dynamic import
        await fs.writeFile(join(repoDir, 'packages', 'pkgA', 'src', 'index.ts'), `
export const pkgA = 'pkgA';
// Dynamic import for (? DYNAMIC-IMPORT)
export const load = () => import('./lazy');
`.trim());

        // 9. packages/pkgA/src/lazy.ts (optional)
        await fs.writeFile(join(repoDir, 'packages', 'pkgA', 'src', 'lazy.ts'), `
export const lazy = 'lazy';
`.trim());

        // 10. packages/pkgB/src/index.ts
        await fs.writeFile(join(repoDir, 'packages', 'pkgB', 'src', 'index.ts'), `
export const pkgB = 'pkgB';
`.trim());
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('produces deterministic output with golden fixture repo', async () => {
        const output1 = join(tempDir, 'OUTPUT1.md');
        const output2 = join(tempDir, 'OUTPUT2.md');

        // First run
        const result1 = await run(['--out', output1, repoDir, '--profile', 'default', '--full-signals']);
        expect(result1.exitCode).toBe(0);
        const content1 = await fs.readFile(output1, 'utf-8');

        // Second run with identical arguments
        const result2 = await run(['--out', output2, repoDir, '--profile', 'default', '--full-signals']);
        expect(result2.exitCode).toBe(0);
        const content2 = await fs.readFile(output2, 'utf-8');

        // Byte-for-byte equality
        expect(content2).toBe(content1);

        // Ensure output is not empty
        expect(content1.length).toBeGreaterThan(0);

        // Check for AI Preamble header (should be present)
        expect(content1).toMatch(/^## AI Preamble — How to Use This Map/);

        // Check for both Summary blocks titles
        expect(content1).toMatch(/## Entrypoints & Public Surface/);
        expect(content1).toMatch(/## Graph Hubs \(Fan‑in \/ Fan‑out\)/);

        // Check for tree glyph characters
        expect(content1).toMatch(/├──/);
        expect(content1).toMatch(/└──/);

        // Ensure no CRLF (only LF line endings)
        expect(content1).not.toMatch(/\r\n/);
    });
});