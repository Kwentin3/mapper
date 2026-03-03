import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const { runPipelineMock } = vi.hoisted(() => ({
    runPipelineMock: vi.fn(),
}));

vi.mock('../src/pipeline/run_pipeline.js', () => ({
    runPipeline: runPipelineMock,
}));

import { run } from '../src/cli/run.js';

describe('CLI --show-temp flag', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = createTempRepoDir('temp_cli_show_temp');
        await fs.mkdir(tempDir, { recursive: true });
        runPipelineMock.mockReset();
        runPipelineMock.mockResolvedValue({
            markdown: '# mocked\n',
            warnings: [],
        });
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('passes showTemp=true to pipeline when --show-temp is set', async () => {
        const result = await run([tempDir, '--show-temp', '--out', 'OUT.md']);
        expect(result.exitCode).toBe(0);

        expect(runPipelineMock).toHaveBeenCalledTimes(1);
        expect(runPipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                rootDir: resolve(tempDir),
                showTemp: true,
            })
        );
    });
});
