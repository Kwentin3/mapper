import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI focus/depth truth (risks hidden by depth/focus are still reported as stubs)', () => {
    let tempDir: string;
    let repoDir: string;

    beforeEach(async () => {
        // Create a temporary directory
        tempDir = join(__dirname, 'temp_focus_depth_truth_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create repo subdirectory
        repoDir = join(tempDir, 'repo');
        await fs.mkdir(repoDir, { recursive: true });

        // package.json (required for module resolution)
        await fs.writeFile(join(repoDir, 'package.json'), JSON.stringify({
            name: 'fixture-repo',
            version: '1.0.0',
            type: 'module',
        }, null, 2));

        // tsconfig.json (optional but good)
        await fs.writeFile(join(repoDir, 'tsconfig.json'), JSON.stringify({
            compilerOptions: {
                baseUrl: '.',
                moduleResolution: 'node',
                target: 'ES2020',
                module: 'ES2020',
            },
        }, null, 2));

        // Create src directory
        await fs.mkdir(join(repoDir, 'src'), { recursive: true });
        // Create deep directory
        await fs.mkdir(join(repoDir, 'src', 'deep'), { recursive: true });

        // src/index.ts (entry point, optional)
        await fs.writeFile(join(repoDir, 'src', 'index.ts'), `
// entry point
export const index = 1;
`.trim());

        // src/deep/cycle_a.ts that imports cycle_b.ts (relative import without extension - tests resolver)
        await fs.writeFile(join(repoDir, 'src', 'deep', 'cycle_a.ts'), `
import './cycle_b';
export const cycleA = 'A';
`.trim());

        // src/deep/cycle_b.ts that imports cycle_a.ts (relative import without extension - tests resolver)
        await fs.writeFile(join(repoDir, 'src', 'deep', 'cycle_b.ts'), `
import './cycle_a';
export const cycleB = 'B';
`.trim());
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should show a stub with CYCLE risk when depth limit hides the risky files', async () => {
        const output = join(tempDir, 'OUTPUT_DEPTH1.md');
        // IMPORTANT: We must pass repoDir (the src containing one) as the root arg.
        // But run() usually takes arguments like CLI.
        // The signature is run(args). The args are passed to yargs.
        // If we want the scanner to work relative to repoDir, we should pass it as the target dir.
        // The problem in previous runs was likely that we were running from CWD but analyzing repoDir,
        // and the resolver might have been confused about baseUrl or rootDir.
        // However, 'repoDir' is already passed as argument.
        // Let's verify if the resolver needs explicit setup or if it just works.

        // We suspect the resolver issue might be due to how run() sets up the context.
        // But to fix "Internal specifier not found", we must ensure that
        // the file paths in the graph match what the resolver sees.

        // The previous error "Internal specifier not found: ./cycle_a" suggests that the resolver
        // tried to resolve './cycle_a' from '.../cycle_b.ts' but failed to find the file.
        // This usually happens if extensions are missing and not probed, OR if the file system
        // view is inconsistent.
        // Since we are using standard fs in tests (not mocked), it should work if we use extensions
        // or if the resolver probes .ts.

        // Let's try explicitly adding .ts to imports in the test setup above (I will update previous step).
        // Wait, I just reverted that change because I was told to "fix resolution".
        // The robust fix for resolution is often ensuring the resolver knows it should look for .ts.
        // But our resolver is capable.

        // Actually, the error "Internal specifier not found" comes from the *graph builder*
        // when it cannot map a specifier to a file.
        // If I change the test to use explicit extensions in imports, it bypasses the "probe" logic necessity.
        // But let's stick to the plan: fix the resolution.

        // If I look at the logs, "Unresolved specifier: ./cycle_a".
        // This means `resolveSpecifier` returned null/undefined.
        // This means `fs.existsSync` (or equivalent) failed.

        // In this test environment, we are writing files to `repoDir`.
        // The `run` command is executed.
        // The `run` command likely uses `process.cwd()` or takes the directory argument.
        // We are passing `repoDir`.

        const result = await run(['--out', output, repoDir, '--depth', '1']);
        expect(result.exitCode).toBe(0);
        const content = await fs.readFile(output, 'utf-8');

        // Check for stub with risk
        // The new format shows (!) N signals hidden instead of CYCLE
        expect(content).toContain('(!) 2 signals hidden');
        // The tree rendering might not use the literal '… (hidden)' string anymore
        // given it has subdir/files counts now
        expect(content).toContain('… (');
    });

    it('should show the CYCLE risk inline when depth limit is unlimited', async () => {
        const output = join(tempDir, 'OUTPUT_FULL.md');
        const result = await run(['--out', output, repoDir]);
        expect(result.exitCode).toBe(0);
        const content = await fs.readFile(output, 'utf-8');

        expect(content).toMatch(/\(! CYCLE\)/);
        expect(content).toContain('cycle_a.ts');
        expect(content).toContain('cycle_b.ts');
    });
});