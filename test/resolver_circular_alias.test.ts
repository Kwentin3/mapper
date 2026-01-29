import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver circular aliases', () => {
    let tempDir: string;
    let tsconfigPath: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_circular_test_' + Math.random().toString(36).slice(2));
        // Create a file that will be resolved
        const appFile = join(tempDir, 'src/app.ts');
        fs.mkdirSync(join(appFile, '..'), { recursive: true });
        fs.writeFileSync(appFile, '// dummy');

        // Create tsconfig with circular paths
        tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    "@/*": ["./src/*"],
                    "./src/*": ["@/*"],  // circular reference
                    "loop/*": ["loop/*"], // self‑reference
                    "deep/*": ["deeper/*"],
                    "deeper/*": ["deep/*"], // mutual circular
                }
            }
        }, null, 2));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('does not infinite loop on circular tsconfig paths', () => {
        // This test ensures the resolver terminates and returns a deterministic result.
        const result = resolveSpecifier('@/app', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        });
        // Should resolve to src/app.ts via alias '@/*' -> './src/*'
        const valid = result.resolved.find(t => t.path === 'src/app.ts');
        expect(valid).toBeDefined();
        // It could also produce other candidates due to circular mapping, but that's okay.
    });

    it('produces same result across multiple runs (deterministic)', () => {
        const options = {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        };
        const first = resolveSpecifier('@/app', options);
        const second = resolveSpecifier('@/app', options);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });

    it('handles self‑referencing alias', () => {
        const result = resolveSpecifier('loop/anything', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        });
        // Should not hang; we just check that it returns something (maybe external).
        expect(result.resolved).toBeDefined();
    });

    it('handles mutual circular aliases', () => {
        const result = resolveSpecifier('deep/foo', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        });
        expect(result.resolved).toBeDefined();
        // No assertion about content, just termination.
    });
});