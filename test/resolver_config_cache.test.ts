import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { loadTsconfigAliases } from '../src/resolver/read_tsconfig.js';
import { loadPackageImports } from '../src/resolver/read_package_json.js';

describe('resolver config readers cache', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = createTempRepoDir('temp_resolver_cache');
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('reuses tsconfig aliases from cache when file is unchanged', async () => {
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        await fs.writeFile(
            tsconfigPath,
            JSON.stringify(
                {
                    compilerOptions: {
                        paths: {
                            '@/*': ['src/*'],
                        },
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const first = loadTsconfigAliases(tsconfigPath);
        const second = loadTsconfigAliases(tsconfigPath);

        expect(second).toBe(first);
        expect(first['@/*']).toEqual(['src/*']);
        expect(second['@/*']).toEqual(['src/*']);
    });

    it('invalidates tsconfig cache when file content changes', async () => {
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        await fs.writeFile(
            tsconfigPath,
            JSON.stringify(
                {
                    compilerOptions: {
                        paths: {
                            '@old/*': ['src/*'],
                        },
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const first = loadTsconfigAliases(tsconfigPath);
        expect(first['@old/*']).toEqual(['src/*']);

        await fs.writeFile(
            tsconfigPath,
            JSON.stringify(
                {
                    compilerOptions: {
                        paths: {
                            '@new/*': ['app/*'],
                            '@longer_alias/*': ['lib/*'],
                        },
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const second = loadTsconfigAliases(tsconfigPath);
        expect(second['@new/*']).toEqual(['app/*']);
        expect(second['@old/*']).toBeUndefined();
    });

    it('reuses package imports from cache when file is unchanged', async () => {
        const packagePath = join(tempDir, 'package.json');
        await fs.writeFile(
            packagePath,
            JSON.stringify(
                {
                    name: 'tmp',
                    imports: {
                        '#core/*': ['./src/*'],
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const first = loadPackageImports(packagePath);
        const second = loadPackageImports(packagePath);

        expect(second).toBe(first);
        expect(first['#core/*']).toEqual(['./src/*']);
        expect(second['#core/*']).toEqual(['./src/*']);
    });

    it('invalidates package imports cache when file content changes', async () => {
        const packagePath = join(tempDir, 'package.json');
        await fs.writeFile(
            packagePath,
            JSON.stringify(
                {
                    name: 'tmp',
                    imports: {
                        '#old/*': ['./old/*'],
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const first = loadPackageImports(packagePath);
        expect(first['#old/*']).toEqual(['./old/*']);

        await fs.writeFile(
            packagePath,
            JSON.stringify(
                {
                    name: 'tmp',
                    imports: {
                        '#new/*': ['./new/*'],
                        '#longer_alias/*': ['./lib/*'],
                    },
                },
                null,
                2
            ),
            'utf-8'
        );

        const second = loadPackageImports(packagePath);
        expect(second['#new/*']).toEqual(['./new/*']);
        expect(second['#old/*']).toBeUndefined();
    });
});
