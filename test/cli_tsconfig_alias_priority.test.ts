import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('CLI tsconfig alias priority (tsconfig > package.json > default)', () => {
    let tempDir: string;
    let tsconfigPath: string;
    let packageJsonPath: string;

    beforeEach(() => {
        // Create temporary directory
        tempDir = join(__dirname, 'temp_tsconfig_priority_' + Math.random().toString(36).slice(2));
        fs.mkdirSync(tempDir, { recursive: true });

        // Create source file
        const srcDir = join(tempDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(join(srcDir, 'a.ts'), '// dummy');

        // Create dist file (misleading mapping)
        const distDir = join(tempDir, 'dist');
        fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(join(distDir, 'a.js'), '// dummy');

        // Create tsconfig.json with @/* -> src/*
        tsconfigPath = join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsconfigPath, JSON.stringify({
            compilerOptions: {
                paths: {
                    '@/*': ['./src/*']
                }
            }
        }, null, 2));

        // Create package.json with misleading @/* -> ./dist/*
        packageJsonPath = join(tempDir, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({
            name: 'test-package',
            imports: {
                '@/*': './dist/*'
            }
        }, null, 2));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('should prioritize tsconfig paths over package.json imports for @/* alias', () => {
        const result = resolveSpecifier('@/a', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            tsconfigPath,
            packageJsonPath,
            extensions: ['ts', 'js'],
        });

        // Should have exactly one resolved target
        expect(result.resolved).toHaveLength(1);

        const target = result.resolved[0];
        // Should be resolved via tsconfig alias
        expect(target.kind).toBe('alias');
        expect(target.aliasPattern).toBe('(tsconfig paths)');
        // Should point to src/a.ts (tsconfig) not dist/a.js (package.json)
        expect(target.path).toBe('src/a.ts');
    });
});