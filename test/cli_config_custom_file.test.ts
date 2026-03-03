import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { run } from '../src/cli/run.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('CLI --config custom file', () => {
    let tempDir: string;
    let configPath: string;

    beforeEach(async () => {
        tempDir = createTempRepoDir('temp_cli_config_custom');
        await fs.mkdir(join(tempDir, 'src'), { recursive: true });

        await fs.writeFile(join(tempDir, 'src', 'core.ts'), 'export const core = 1;\n');
        await fs.writeFile(join(tempDir, 'src', 'use.ts'), "import './core.ts';\n");

        configPath = join(tempDir, 'custom-thresholds.json');
        await fs.writeFile(
            configPath,
            JSON.stringify(
                {
                    thresholds: {
                        godModuleFanIn: 0,
                    },
                },
                null,
                2
            ),
            'utf-8'
        );
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('applies thresholds from explicit config file path', async () => {
        const outName = 'OUT.md';
        const result = await run([tempDir, '--config', configPath, '--out', outName]);
        expect(result.exitCode).toBe(0);

        const markdown = await fs.readFile(join(tempDir, outName), 'utf-8');
        expect(markdown).toContain('core.ts');
        expect(markdown).toContain('(? GOD-MODULE)');
    });
});
