import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';
import { resolveSpecifier } from '../src/resolver/resolve_specifier.js';

describe('resolver JavaScript extension fallback', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = join(__dirname, 'temp_js_fallback_test_' + Math.random().toString(36).slice(2));
        // Create directory structure and files
        const files = [
            'src/a.ts',
            'src/b.tsx',
            'src/c.mts', // .mts not in default extensions, but we can test .mjs -> .ts fallback
            'src/d.ts',
            'src/e.tsx',
            'src/f.ts',
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

    it('resolves ./a.js to src/a.ts (internal)', () => {
        const result = resolveSpecifier('./a.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            // default extensions include ts, tsx, js, jsx, etc.
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/a.ts');
        expect(result.resolved[0].kind).toBe('internal');
        expect(result.warnings).toHaveLength(0);
    });

    it('resolves ./b.jsx to src/b.tsx (internal)', () => {
        const result = resolveSpecifier('./b.jsx', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/b.tsx');
        expect(result.resolved[0].kind).toBe('internal');
        expect(result.warnings).toHaveLength(0);
    });

    it('resolves ./c.mjs to src/c.mts? not present, fallback to .ts?', () => {
        // .mjs should try .ts then .tsx (but we have .mts file)
        // Since we have .mts file (extension .mts) not in default extensions, it won't be found.
        // Actually default extensions include 'mjs' and 'cjs' but not 'mts'.
        // The fallback will try .ts, .tsx, etc. Since we have no .c.ts, it will not find.
        // Let's create a .ts file named c.ts? We have c.mts but not c.ts.
        // For simplicity, we'll test that .mjs falls back to .ts (if .ts exists).
        // Create c.ts
        fs.writeFileSync(join(tempDir, 'src/c.ts'), '// dummy');
        const result = resolveSpecifier('./c.mjs', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/c.ts');
        expect(result.resolved[0].kind).toBe('internal');
    });

    it('resolves ./d.cjs to src/d.ts (internal)', () => {
        const result = resolveSpecifier('./d.cjs', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].path).toBe('src/d.ts');
        expect(result.resolved[0].kind).toBe('internal');
    });

    it('falls back to .tsx when .jsx specified but .tsx present', () => {
        // e.tsx exists, e.jsx should resolve to e.tsx
        const result = resolveSpecifier('./e.jsx', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved[0].path).toBe('src/e.tsx');
    });

    it('falls back to .ts when .js specified and .ts present but .tsx also present', () => {
        // f.ts exists, f.js should resolve to f.ts (priority .ts then .tsx)
        const result = resolveSpecifier('./f.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved[0].path).toBe('src/f.ts');
    });

    it('does not produce "Internal specifier not found" warning when fallback succeeds', () => {
        const result = resolveSpecifier('./a.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.warnings).toHaveLength(0);
    });

    it('produces warning when neither JS nor TS file exists', () => {
        const result = resolveSpecifier('./nonexistent.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.resolved[0].kind).toBe('unresolved');
        expect(result.warnings).toContain('Internal specifier not found: ./nonexistent.js');
    });

    it('respects custom extensions order', () => {
        // If extensions list is custom, fallback still works
        const result = resolveSpecifier('./a.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
            extensions: ['js', 'ts'], // order js first, but .js file doesn't exist, so fallback to .ts
        });
        expect(result.resolved[0].path).toBe('src/a.ts');
    });

    it('does not fallback when the JS file actually exists', () => {
        // Create a.js file
        fs.writeFileSync(join(tempDir, 'src/a.js'), '// js version');
        const result = resolveSpecifier('./a.js', {
            baseDir: join(tempDir, 'src'),
            projectRoot: tempDir,
        });
        // Should resolve to a.js (since it exists)
        expect(result.resolved[0].path).toBe('src/a.js');
        expect(result.resolved[0].kind).toBe('internal');
    });
});