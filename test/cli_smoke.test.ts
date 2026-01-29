import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../src/cli/run.js';

describe('CLI smoke tests', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('--help flag', () => {
        it('exits with code 0', async () => {
            const result = await run(['--help']);
            expect(result.exitCode).toBe(0);
        });

        it('prints help text', async () => {
            await run(['--help']);
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Usage:');
            expect(output).toContain('--help');
        });
    });

    describe('--version flag', () => {
        it('exits with code 0', async () => {
            const result = await run(['--version']);
            expect(result.exitCode).toBe(0);
        });

        it('prints version line', async () => {
            await run(['--version']);
            expect(consoleLogSpy).toHaveBeenCalledWith('Project Architecture Mapper v0.8');
        });
    });

    describe('default output', () => {
        it('exits with code 0 when no arguments', async () => {
            const result = await run([]);
            expect(result.exitCode).toBe(0);
        });

        it('ignores unknown flags and still exits with code 0', async () => {
            const result = await run(['--unknown', '--profile', 'fsd']);
            expect(result.exitCode).toBe(0);
        });
    });

    describe('--profile flag', () => {
        it('does not affect exit code', async () => {
            const result = await run(['--profile', 'fsd']);
            expect(result.exitCode).toBe(0);
        });
    });

    describe('--config flag', () => {
        it('does not affect exit code', async () => {
            const result = await run(['--config', 'some/file.json']);
            expect(result.exitCode).toBe(0);
        });
    });
});