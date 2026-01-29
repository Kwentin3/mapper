import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver external default', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_external_test_' + Math.random().toString(36).slice(2));
        // Create a single file for internal resolution tests
        const localFile = join(tempDir, 'src/local.ts');
        fs.mkdirSync(join(localFile, '..'), { recursive: true });
        fs.writeFileSync(localFile, '// dummy');
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('treats bare specifier as external when no tsconfig paths', () => {
        const result = resolveSpecifier('lodash', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('external');
        expect(result.resolved[0].path).toBe('lodash');
        expect(result.warnings).toHaveLength(0);
    });

    it('treats bare specifier as external even when tsconfig paths exist but no match', () => {
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    '@/*': ['./src/*'],
                }
            }
        }));
        const result = resolveSpecifier('react', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].kind).toBe('external');
        expect(result.resolved[0].path).toBe('react');
    });

    it('does not treat relative specifier as external', () => {
        const result = resolveSpecifier('./missing', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        // Should be internal but not found -> warning, unresolved target
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Internal specifier not found: ./missing');
    });

    it('does not treat absolute specifier as external', () => {
        const result = resolveSpecifier('/src/missing', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Internal specifier not found: /src/missing');
    });

    it('does not treat hash specifier as external', () => {
        const result = resolveSpecifier('#unknown', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Package import not resolved: #unknown');
    });

    it('prefers alias over external when tsconfig path matches', () => {
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    'my‑alias': ['./src/local'],
                }
            }
        }));
        const result = resolveSpecifier('my‑alias', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        });
        expect(result.resolved[0].kind).toBe('alias');
        expect(result.resolved[0].path).toBe('src/local.ts');
    });

    it('falls back to external when alias matches but file not found', () => {
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    'my‑alias': ['./src/nonexistent'],
                }
            }
        }));
        const result = resolveSpecifier('my‑alias', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts'],
        });
        expect(result.resolved[0].kind).toBe('external');
        expect(result.resolved[0].path).toBe('my‑alias');
    });

    it('handles scoped package names', () => {
        const result = resolveSpecifier('@angular/core', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].kind).toBe('external');
        expect(result.resolved[0].path).toBe('@angular/core');
    });
});