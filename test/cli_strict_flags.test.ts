import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../src/cli/run.js';

describe('CLI --strict-flags', () => {
    let consoleErrorSpy: any;
    let consoleLogSpy: any;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fails on unknown long options in strict mode', async () => {
        const result = await run(['--strict-flags', '--unknown']);
        expect(result.exitCode).toBe(1);
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toBe('Error: unknown option(s): --unknown. Use --help.');
    });

    it('fails on unknown short options in strict mode', async () => {
        const result = await run(['--strict-flags', '-x']);
        expect(result.exitCode).toBe(1);
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toBe('Error: unknown option(s): -x. Use --help.');
    });

    it('allows known options in strict mode', async () => {
        const result = await run(['--strict-flags', '--help']);
        expect(result.exitCode).toBe(0);
        expect(consoleLogSpy).toHaveBeenCalled();
    });
});
