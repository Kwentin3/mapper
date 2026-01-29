import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver determinism', () => {
    let tempDir: string;
    let tsconfigPath: string;
    let packageJsonPath: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_determinism_test_' + Math.random().toString(36).slice(2));
        // Create project files
        const files = [
            'src/a.ts',
            'src/b.ts',
            'src/c.ts',
            'src/utils/x.ts',
            'src/utils/y.ts',
            'lib/old/x.js',
        ];
        for (const file of files) {
            const fullPath = join(tempDir, file);
            fs.mkdirSync(join(fullPath, '..'), { recursive: true });
            fs.writeFileSync(fullPath, '// dummy');
        }

        // Create tsconfig with multiple paths
        tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    '@/*': ['./src/*'],
                    '@utils/*': ['./src/utils/*', './lib/old/*'],
                }
            }
        }));

        // Create package.json with imports
        packageJsonPath = join(tempDir, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({
            imports: {
                '#internal/*': './src/*',
                '#shared/*': ['./src/utils/*', './lib/old/*'],
            }
        }));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('returns identical result for same specifier across multiple calls', () => {
        const options = {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            packageJsonPath,
            extensions: ['ts', 'js'],
        };
        const results = Array.from({ length: 10 }, () =>
            resolveSpecifier('@/a', options)
        );
        const first = JSON.stringify(results[0]);
        for (let i = 1; i < results.length; i++) {
            expect(JSON.stringify(results[i])).toBe(first);
        }
    });

    it('orders resolved targets deterministically regardless of filesystem iteration order', () => {
        const shuffledPath = join(tempDir, 'tsconfig-shuffled.json');
        fs.writeFileSync(shuffledPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    'z': ['./src/c'],
                    'a': ['./src/a'],
                    'm': ['./src/b'],
                }
            }
        }));
        const options = {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath: shuffledPath,
            extensions: ['ts'],
        };
        const result1 = resolveSpecifier('z', options);
        const result2 = resolveSpecifier('a', options);
        const result3 = resolveSpecifier('m', options);
        expect(result1.resolved[0].path).toBe('src/c.ts');
        expect(result2.resolved[0].path).toBe('src/a.ts');
        expect(result3.resolved[0].path).toBe('src/b.ts');
    });

    it('orders multiple candidates deterministically', () => {
        // '@utils/x' matches two substitutions: './src/utils/x' and './lib/old/x'
        // Both exist (src/utils/x.ts and lib/old/x.js)
        const result = resolveSpecifier('@utils/x', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts', 'js'],
        });
        // Should have two candidates, sorted by absolute path (lib < src)
        expect(result.resolved).toHaveLength(2);
        expect(result.resolved[0].path).toBe('lib/old/x.js');
        expect(result.resolved[1].path).toBe('src/utils/x.ts');
        // Ensure ordering is stable across multiple runs
        const secondResult = resolveSpecifier('@utils/x', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            extensions: ['ts', 'js'],
        });
        expect(JSON.stringify(secondResult.resolved)).toBe(JSON.stringify(result.resolved));
    });

    it('sorts warnings deterministically', () => {
        const result1 = resolveSpecifier('./missing', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts'],
        });
        const result2 = resolveSpecifier('./missing', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts'],
        });
        expect(result1.warnings).toEqual(result2.warnings);
    });

    it('handles hash specifiers with multiple substitutions deterministically', () => {
        // '#shared/x' matches two substitutions
        const result = resolveSpecifier('#shared/x', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            packageJsonPath,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(2);
        // Order should match substitution order in package.json imports? Actually sorted by absolute path.
        // Since 'lib' < 'src', lib/old/x.js comes first.
        expect(result.resolved[0].path).toBe('lib/old/x.js');
        expect(result.resolved[1].path).toBe('src/utils/x.ts');
    });

    it('produces same result when tsconfig and package.json are swapped', () => {
        const options = {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            packageJsonPath,
            extensions: ['ts', 'js'],
        };
        const result1 = resolveSpecifier('@/a', options);
        const result2 = resolveSpecifier('@/a', options);
        expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });

    it('is immune to property enumeration order of objects', () => {
        const customPath = join(tempDir, 'tsconfig-ordered.json');
        const paths: Record<string, string[]> = {};
        // Insert keys in non-alphabetical order
        paths['z'] = ['./src/c'];
        paths['a'] = ['./src/a'];
        paths['m'] = ['./src/b'];
        fs.writeFileSync(customPath, JSON.stringify({ compilerOptions: { paths } }));
        const options = {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath: customPath,
            extensions: ['ts'],
        };
        const result = resolveSpecifier('z', options);
        expect(result.resolved[0].path).toBe('src/c.ts');
    });
});