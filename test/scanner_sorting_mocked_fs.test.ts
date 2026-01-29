import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { scanRepo } from '../src/scanner/scan.js';

describe('scanner sorting with mocked fs', () => {
    let readdirSpy: any;

    beforeEach(() => {
        // Nothing
    });

    afterEach(() => {
        if (readdirSpy) {
            readdirSpy.mockRestore();
        }
        vi.restoreAllMocks();
    });

    function createEntry(name: string, isDir: boolean) {
        return {
            name,
            isFile: () => !isDir,
            isDirectory: () => isDir,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
            isSocket: () => false,
        };
    }

    it('sorts children even when readdir returns unsorted entries', async () => {
        const tempDir = join(__dirname, 'temp_mock_test');
        // Track call count to differentiate root from subdirectory calls
        let callCount = 0;
        const mockReaddir = vi.spyOn(fs, 'readdir').mockImplementation(async (path, options) => {
            callCount++;
            // First call is for the root, return unsorted entries
            if (callCount === 1) {
                return [
                    createEntry('b', false),  // file 'b'
                    createEntry('a', false),  // file 'a'
                    createEntry('z', true),   // directory 'z'
                    createEntry('c', false),  // file 'c'
                    createEntry('m', true),   // directory 'm'
                ] as any;
            }
            // Subsequent calls are for subdirectories (z, m) – return empty to stop recursion
            return [];
        });

        readdirSpy = mockReaddir;

        const result = await scanRepo({ rootDir: tempDir });

        // Expect children to be sorted: directories first (m, z), then files (a, b, c)
        const childNames = result.root.children.map(c => c.name);
        const childKinds = result.root.children.map(c => c.kind);

        // Directories should come before files
        expect(childKinds).toEqual(['dir', 'dir', 'file', 'file', 'file']);
        // Names within each group sorted alphabetically
        expect(childNames).toEqual(['m', 'z', 'a', 'b', 'c']);

        // Ensure the mock was called at least once
        expect(mockReaddir).toHaveBeenCalled();
    });

    it('sorts directories before files and uses stableStringCompare within groups', async () => {
        const tempDir = join(__dirname, 'temp_mock_test2');
        let callCount = 0;
        const mockReaddir = vi.spyOn(fs, 'readdir').mockImplementation(async (path, options) => {
            callCount++;
            if (callCount === 1) {
                return [
                    createEntry('fileB', false),
                    createEntry('dirA', true),
                    createEntry('fileA', false),
                    createEntry('dirB', true),
                ] as any;
            }
            return [];
        });

        readdirSpy = mockReaddir;

        const result = await scanRepo({ rootDir: tempDir });
        const childNames = result.root.children.map(c => c.name);
        const childKinds = result.root.children.map(c => c.kind);

        // Directories first, sorted by name, then files sorted by name
        expect(childKinds).toEqual(['dir', 'dir', 'file', 'file']);
        expect(childNames).toEqual(['dirA', 'dirB', 'fileA', 'fileB']);
    });
});
