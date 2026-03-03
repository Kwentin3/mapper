import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('pipeline fileMeta integration', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = createTempRepoDir('temp_pipeline_filemeta');

        await fs.mkdir(join(tempDir, 'src', 'aa', 'bb', 'cc', 'dd'), { recursive: true });
        await fs.mkdir(join(tempDir, 'src'), { recursive: true });
        await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'tmp', version: '1.0.0' }, null, 2), 'utf-8');

        const bigLines = Array.from({ length: 350 }, (_, i) => `const v${i} = ${i};`).join('\n') + '\n';
        await fs.writeFile(join(tempDir, 'src', 'big.ts'), bigLines, 'utf-8');

        const manyExports = Array.from({ length: 12 }, (_, i) => `export const e${i} = ${i};`).join('\n') + '\n';
        await fs.writeFile(join(tempDir, 'src', 'aa', 'bb', 'cc', 'dd', 'barrel.ts'), manyExports, 'utf-8');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('emits BIG, DEEP-PATH and BARREL-HELL from runtime metadata', async () => {
        const result = await runPipeline({
            rootDir: tempDir,
            fullSignals: true,
        });

        const fileToCodes = new Map(
            result.signals.files.map(item => [item.file, item.inline.map(signal => signal.code)] as const)
        );

        expect(fileToCodes.get('src/big.ts') ?? []).toContain('BIG');

        const barrelCodes = fileToCodes.get('src/aa/bb/cc/dd/barrel.ts') ?? [];
        expect(barrelCodes).toContain('DEEP-PATH');
        expect(barrelCodes).toContain('BARREL-HELL');
    });
});
