import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver tsconfig paths', () => {
    let tempDir: string;
    let tsconfigPath: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_tsconfig_test_' + Math.random().toString(36).slice(2));
        // Create project files
        const files = [
            'src/components/Button.tsx',
            'src/components/Button.js',
            'src/utils/helpers.ts',
            'src/features/auth/Login.ts',
            'lib/old/utils/helpers.js',
        ];
        for (const file of files) {
            const fullPath = join(tempDir, file);
            fs.mkdirSync(join(fullPath, '..'), { recursive: true });
            fs.writeFileSync(fullPath, '// dummy');
        }

        // Create tsconfig.json
        tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    '@components/*': ['./src/components/*'],
                    '@utils/*': ['./src/utils/*', './lib/old/utils/*'],
                    '@features/auth': ['./src/features/auth/Login'],
                    'exact/match': ['./src/components/Button.tsx'],
                }
            }
        }, null, 2));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('resolves wildcard alias with longest match', () => {
        const result = resolveSpecifier('@components/Button', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['tsx', 'ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('alias');
        expect(result.resolved[0].path).toBe('src/components/Button.tsx');
        expect(result.resolved[0].aliasPattern).toBe('(tsconfig paths)');
    });

    it('prefers longer pattern when multiple aliases match', () => {
        const customTsconfigPath = join(tempDir, 'tsconfig-custom.json');
        fs.writeFileSync(customTsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    '@components/*': ['./src/components/*'],
                    '@components/Button/*': ['./src/components/Button/*'],
                }
            }
        }));
        // Create a file that matches the longer pattern
        const iconFile = join(tempDir, 'src/components/Button/icon.tsx');
        fs.mkdirSync(join(iconFile, '..'), { recursive: true });
        fs.writeFileSync(iconFile, '// dummy');
        const result = resolveSpecifier('@components/Button/icon', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath: customTsconfigPath,
            extensions: ['tsx'],
        });
        expect(result.resolved[0].path).toBe('src/components/Button/icon.tsx');
        expect(result.warnings).toHaveLength(0);
    });

    it('falls back to external when no matching file found', () => {
        const result = resolveSpecifier('@components/NotFound', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['tsx', 'ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('external');
        expect(result.resolved[0].path).toBe('@components/NotFound');
    });

    it('handles multiple substitutions for a single pattern', () => {
        const result = resolveSpecifier('@utils/helpers', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(2);
        // Candidates are sorted deterministically by absolute path.
        // Since 'lib' < 'src' lexicographically, lib/old/utils/helpers.js comes first.
        expect(result.resolved[0].path).toBe('lib/old/utils/helpers.js');
        expect(result.resolved[1].path).toBe('src/utils/helpers.ts');
        expect(result.resolved[0].kind).toBe('alias');
        expect(result.resolved[1].kind).toBe('alias');
    });

    it('resolves exact match without wildcard', () => {
        const result = resolveSpecifier('exact/match', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['tsx', 'ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/components/Button.tsx');
    });

    it('returns empty aliases when tsconfig not found', () => {
        const result = resolveSpecifier('@components/Button', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath: join(tempDir, 'nonexistent.json'),
            extensions: ['tsx'],
        });
        expect(result.resolved[0].kind).toBe('external');
    });

    it('handles tsconfig with comments gracefully', () => {
        const commentedTsconfigPath = join(tempDir, 'tsconfig-comments.json');
        fs.writeFileSync(commentedTsconfigPath, `{
            // This is a comment
            "compilerOptions": {
                "paths": {
                    "@/*": ["./src/*"]  // trailing comment
                }
            }
        }`);
        // Create the file that will be resolved
        const appFile = join(tempDir, 'src/app.ts');
        fs.mkdirSync(join(appFile, '..'), { recursive: true });
        fs.writeFileSync(appFile, '// dummy');
        const result = resolveSpecifier('@/app', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath: commentedTsconfigPath,
            extensions: ['ts'],
        });
        expect(result.resolved[0].path).toBe('src/app.ts');
    });
});