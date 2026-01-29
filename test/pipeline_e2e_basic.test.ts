import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('pipeline E2E basic', () => {
    let tempDir: string;

    beforeAll(async () => {
        // Create a temporary directory with a minimal repo
        tempDir = join(__dirname, 'temp_pipeline_e2e');
        await fs.mkdir(tempDir, { recursive: true });

        // Create src directory
        await fs.mkdir(join(tempDir, 'src'), { recursive: true });

        // Create src/a.ts
        await fs.writeFile(join(tempDir, 'src', 'a.ts'), 'export const a = 1;\n');

        // Create src/index.ts that imports a.ts
        await fs.writeFile(join(tempDir, 'src', 'index.ts'), `import './a';\n`);
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('runs pipeline successfully and returns markdown with tree structure', async () => {
        const result = await runPipeline({ rootDir: tempDir });

        // No errors thrown
        expect(result.warnings).toBeInstanceOf(Array);
        // Result contains markdown
        expect(typeof result.markdown).toBe('string');
        expect(result.markdown.length).toBeGreaterThan(0);

        // Tree structure appears (look for typical tree characters)
        expect(result.markdown).toMatch(/├──|└──|│/);

        // Ensure the root directory appears in the tree (collapsed or not)
        const rootName = tempDir.split('\\').pop() || 'temp_pipeline_e2e';
        expect(result.markdown).toContain(rootName);

        // Ensure there is no error indication
        expect(result.markdown).not.toContain('Internal error');
    });
});