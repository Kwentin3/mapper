import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver package.json imports', () => {
    let tempDir: string;
    let packageJsonPath: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_package_imports_test_' + Math.random().toString(36).slice(2));
        // Create project files
        const files = [
            'src/internal/module.ts',
            'src/internal/utils.ts',
            'lib/legacy.js',
            'dist/index.js',
            'assets/icon.svg',
        ];
        for (const file of files) {
            const fullPath = join(tempDir, file);
            fs.mkdirSync(join(fullPath, '..'), { recursive: true });
            fs.writeFileSync(fullPath, '// dummy');
        }

        // Create package.json with imports and exports
        packageJsonPath = join(tempDir, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({
            name: 'test-package',
            imports: {
                '#internal/*': './src/internal/*',
                '#utils': './src/internal/utils.ts',
                '#legacy/*': ['./lib/legacy/*', './src/internal/*'],
                '#assets/*': {
                    'import': './assets/*',
                    'default': './assets/*.svg',
                },
                '#root': './dist/index.js',
            },
            exports: {
                '.': './dist/index.js',
                './submodule': './src/internal/module.ts',
            },
        }, null, 2));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('resolves hash specifier with wildcard', () => {
        const result = resolveSpecifier('#internal/module', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['ts'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('alias');
        expect(result.resolved[0].path).toBe('src/internal/module.ts');
        expect(result.resolved[0].aliasPattern).toBe('(package.json imports)');
    });

    it('resolves exact hash specifier without wildcard', () => {
        const result = resolveSpecifier('#utils', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['ts'],
        });
        expect(result.resolved[0].path).toBe('src/internal/utils.ts');
    });

    it('tries multiple substitutions in order', () => {
        // #legacy/module maps to ['./lib/legacy/module', './src/internal/module']
        // Only the second exists (src/internal/module.ts)
        const result = resolveSpecifier('#legacy/module', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/internal/module.ts');
    });

    it('handles conditional mapping (import field)', () => {
        // #assets/icon maps to an object with 'import' and 'default'
        // The extractSubstitutions prefers 'import' over 'default'
        // Both point to './assets/icon' and './assets/icon.svg' respectively.
        // Since we have assets/icon.svg in files, the resolution should find it.
        const result = resolveSpecifier('#assets/icon', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['svg', 'ts', 'js'],
        });
        // The substitution './assets/icon' (without extension) will be probed with extensions.
        // Since we have 'assets/icon.svg' with extension .svg, and extensions list includes 'svg', it should match.
        expect(result.resolved[0].path).toBe('assets/icon.svg');
    });

    it('falls back to unresolved when no file found', () => {
        const result = resolveSpecifier('#internal/nonexistent', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['ts'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Package import not resolved: #internal/nonexistent');
    });

    it('returns empty imports when package.json not found', () => {
        const result = resolveSpecifier('#internal/module', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath: join(tempDir, 'nonexistent.json'),
            extensions: ['ts'],
        });
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Package import not resolved: #internal/module');
    });

    it('handles JSON with comments gracefully', () => {
        const commentedPath = join(tempDir, 'package-comments.json');
        fs.writeFileSync(commentedPath, `{
            // comment
            "imports": {
                "#comment/*": "./src/*"
            }
        }`);
        // Create the file that will be resolved
        const commentFile = join(tempDir, 'src/comment.ts');
        fs.mkdirSync(join(commentFile, '..'), { recursive: true });
        fs.writeFileSync(commentFile, '// dummy');
        const result = resolveSpecifier('#comment/comment', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath: commentedPath,
            extensions: ['ts'],
        });
        expect(result.resolved[0].path).toBe('src/comment.ts');
    });
});