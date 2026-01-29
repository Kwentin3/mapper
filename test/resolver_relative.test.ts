import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver relative paths', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_relative_test_' + Math.random().toString(36).slice(2));
        // Create directory structure and files
        const files = [
            'src/a.ts',
            'src/b.ts',
            'src/nested/c.ts',
            'src/nested/index.ts',
            'src/utils/helper.js',
            'src/utils/helper.ts',
            'src/utils/index.ts',
        ];
        for (const file of files) {
            const fullPath = join(tempDir, file);
            fs.mkdirSync(join(fullPath, '..'), { recursive: true });
            fs.writeFileSync(fullPath, '// dummy content');
        }
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('resolves ./a to src/a.ts when baseDir is src', () => {
        const result = resolveSpecifier('./a', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/a.ts');
        expect(result.resolved[0].kind).toBe('internal');
        expect(result.warnings).toHaveLength(0);
    });

    it('resolves ../a from nested directory', () => {
        const result = resolveSpecifier('../a', {
            baseDir: join(tempDir, 'src/nested'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/a.ts');
    });

    it('resolves absolute specifier /src/a', () => {
        const result = resolveSpecifier('/src/a', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/a.ts');
    });

    it('probes extensions in order', () => {
        const result = resolveSpecifier('./utils/helper', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/utils/helper.ts');
    });

    it('falls back to .js when .ts not found', () => {
        // Remove .ts file
        fs.unlinkSync(join(tempDir, 'src/utils/helper.ts'));
        const result = resolveSpecifier('./utils/helper', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/utils/helper.js');
    });

    it('resolves directory index file', () => {
        const result = resolveSpecifier('./nested', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved[0].path).toBe('src/nested/index.ts');
    });

    it('returns warning and unresolved target when file not found', () => {
        const result = resolveSpecifier('./nonexistent', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'js'],
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.resolved[0].path).toBe('./nonexistent');
        expect(result.warnings).toContain('Internal specifier not found: ./nonexistent');
    });

    it('handles multiple candidate extensions with deterministic ordering', () => {
        // Add .tsx and .jsx versions
        fs.writeFileSync(join(tempDir, 'src/multi.tsx'), '// dummy');
        fs.writeFileSync(join(tempDir, 'src/multi.jsx'), '// dummy');
        const result = resolveSpecifier('./multi', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'tsx', 'js', 'jsx'],
        });
        // Should return the first existing extension according to order (ts)
        // but there is no .ts file, so .tsx should be first? Wait we didn't create .ts.
        // Actually we didn't create src/multi.ts, so the first existing extension is .tsx.
        // Let's adjust expectation.
        // We'll create src/multi.ts to test ordering.
        fs.writeFileSync(join(tempDir, 'src/multi.ts'), '// dummy');
        const result2 = resolveSpecifier('./multi', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['ts', 'tsx', 'js', 'jsx'],
        });
        expect(result2.resolved[0].path).toBe('src/multi.ts');
    });
});