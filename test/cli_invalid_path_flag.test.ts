import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../src/cli/run.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('CLI path validation', () => {
    let consoleErrorSpy: any;
    let consoleLogSpy: any;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('invalid path starting with dash', () => {
        it('exits with code 1', async () => {
            const result = await run(['-Force']);
            expect(result.exitCode).toBe(1);
        });

        it('prints error message about invalid path', async () => {
            await run(['-Force']);
            expect(consoleErrorSpy).toHaveBeenCalled();
            const output = consoleErrorSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Invalid path');
        });
    });

    describe('non-existent directory', () => {
        it('exits with code 1', async () => {
            const result = await run(['./non-existent-12345']);
            expect(result.exitCode).toBe(1);
        });

        it('prints error message about directory not existing', async () => {
            await run(['./non-existent-12345']);
            expect(consoleErrorSpy).toHaveBeenCalled();
            const output = consoleErrorSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Invalid path');
        });
    });

    describe('path is a file, not a directory', () => {
        let tempFile: string;
        let tempDir: string;

        beforeEach(async () => {
            tempDir = createTempRepoDir('temp_path_validation');
            await fs.mkdir(tempDir, { recursive: true });
            tempFile = join(tempDir, 'file.txt');
            await fs.writeFile(tempFile, 'dummy');
        });

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true });
        });

        it('exits with code 1', async () => {
            const result = await run([tempFile]);
            expect(result.exitCode).toBe(1);
        });

        it('prints error message about not being a directory', async () => {
            await run([tempFile]);
            expect(consoleErrorSpy).toHaveBeenCalled();
            const output = consoleErrorSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Invalid path');
        });
    });

    describe('valid directory', () => {
        let tempDir: string;

        beforeEach(async () => {
            tempDir = createTempRepoDir('temp_valid');
            await fs.mkdir(tempDir, { recursive: true });
        });

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true });
        });

        it('exits with code 0', async () => {
            const result = await run([tempDir]);
            expect(result.exitCode).toBe(0);
        });
    });

    describe('omitted path defaults to current directory', () => {
        it('exits with code 0', async () => {
            const result = await run([]);
            expect(result.exitCode).toBe(0);
        });
    });
});
