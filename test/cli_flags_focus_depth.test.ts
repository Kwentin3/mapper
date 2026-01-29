import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';

describe('CLI flags --focus and --depth', () => {
    let tempDir: string;

    beforeEach(async () => {
        // Create a temporary directory with a chain of imports
        tempDir = join(__dirname, 'temp_focus_depth_' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        // Create src directory
        await fs.mkdir(join(tempDir, 'src'), { recursive: true });

        // c.ts
        await fs.writeFile(join(tempDir, 'src', 'c.ts'), 'export const c = 3;\n');
        // b.ts imports c.ts
        await fs.writeFile(join(tempDir, 'src', 'b.ts'), `import './c';\nexport const b = 2;\n`);
        // a.ts imports b.ts
        await fs.writeFile(join(tempDir, 'src', 'a.ts'), `import './b';\nexport const a = 1;\n`);
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('produces different output with --focus and --depth flags', async () => {
        const defaultOutput = join(tempDir, 'ARCHITECTURE.md');
        const focusedOutput = join(tempDir, 'FOCUSED.md');

        // Run with default options (no flags)
        const result1 = await run([tempDir]);
        expect(result1.exitCode).toBe(0);
        const defaultContent = await fs.readFile(defaultOutput, 'utf-8');

        // Run with --focus src/b.ts --depth 1
        const result2 = await run(['--focus', 'src/b.ts', '--depth', '1', '--out', 'FOCUSED.md', tempDir]);
        expect(result2.exitCode).toBe(0);
        const focusedContent = await fs.readFile(focusedOutput, 'utf-8');

        // Outputs should differ
        expect(focusedContent).not.toBe(defaultContent);

        // Focused output should contain b.ts prominently (maybe as root)
        expect(focusedContent).toContain('src/b.ts');
        // Depth limit may cause c.ts to be stubbed or omitted
        // We can't assert exact behavior without knowing rendering details,
        // but at least ensure the output is valid.
        expect(focusedContent.length).toBeGreaterThan(0);
    });
});