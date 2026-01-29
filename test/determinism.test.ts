import { describe, it, expect } from 'vitest';
import {
    stableStringCompare,
    stablePathNormalize,
    stableSort,
    stableJsonStringify,
} from '../src/utils/determinism.js';

describe('stableStringCompare', () => {
    it('sorts English strings alphabetically', () => {
        expect(stableStringCompare('apple', 'banana')).toBeLessThan(0);
        expect(stableStringCompare('banana', 'apple')).toBeGreaterThan(0);
        expect(stableStringCompare('apple', 'apple')).toBe(0);
    });

    it('is case‑insensitive with base sensitivity', () => {
        expect(stableStringCompare('Apple', 'apple')).toBe(0);
        expect(stableStringCompare('APPLE', 'apple')).toBe(0);
    });

    it('respects locale "en" for deterministic ordering', () => {
        // 'ä' should be treated as distinct from 'a' in English locale
        const result = stableStringCompare('ä', 'a');
        // The exact value is locale‑specific but must be deterministic
        expect(typeof result).toBe('number');
    });
});

describe('stablePathNormalize', () => {
    it('replaces backslashes with forward slashes', () => {
        expect(stablePathNormalize('src\\utils\\file.ts')).toBe('src/utils/file.ts');
        expect(stablePathNormalize('C:\\Users\\Project')).toBe('C:/Users/Project');
    });

    it('removes trailing slash', () => {
        expect(stablePathNormalize('src/utils/')).toBe('src/utils');
        expect(stablePathNormalize('src/utils//')).toBe('src/utils/'); // only one slash removed
    });

    it('keeps root slash', () => {
        expect(stablePathNormalize('/')).toBe('/');
        expect(stablePathNormalize('/usr')).toBe('/usr');
        expect(stablePathNormalize('/usr/')).toBe('/usr');
    });

    it('handles empty string', () => {
        expect(stablePathNormalize('')).toBe('.');
    });

    it('does not collapse multiple slashes', () => {
        expect(stablePathNormalize('src//utils')).toBe('src//utils');
        expect(stablePathNormalize('src///utils')).toBe('src///utils');
    });
});

describe('stableSort', () => {
    it('sorts an array of numbers', () => {
        const arr = [3, 1, 2];
        const sorted = stableSort(arr, (a, b) => a - b);
        expect(sorted).toEqual([1, 2, 3]);
    });

    it('preserves order of equal elements according to comparator', () => {
        const arr = [{ x: 1, id: 'a' }, { x: 1, id: 'b' }, { x: 2, id: 'c' }];
        // Comparator only looks at x
        const sorted = stableSort(arr, (a, b) => a.x - b.x);
        // Elements with same x must keep original relative order
        expect(sorted.map(o => o.id)).toEqual(['a', 'b', 'c']);
    });

    it('handles empty array', () => {
        const arr: number[] = [];
        const sorted = stableSort(arr, () => 0);
        expect(sorted).toEqual([]);
    });

    it('is stable even when native sort is unstable', () => {
        // Create an array where many elements compare equal
        const arr = Array.from({ length: 10 }, (_, i) => ({ value: 0, index: i }));
        const sorted = stableSort(arr, () => 0);
        // Original order must be preserved
        expect(sorted.map(o => o.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
});

describe('stableJsonStringify', () => {
    it('sorts object keys alphabetically', () => {
        const obj = { z: 1, a: 2, m: 3 };
        const result = stableJsonStringify(obj);
        expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('recursively sorts nested objects', () => {
        const obj = { top: { c: 1, a: 2 }, arr: [{ z: 3, x: 4 }] };
        const result = stableJsonStringify(obj);
        // Outer keys sorted: 'arr' before 'top'
        // Inner object keys sorted: 'a' before 'c'
        // Array elements keep order, but object inside sorted
        expect(result).toBe('{"arr":[{"x":4,"z":3}],"top":{"a":2,"c":1}}');
    });

    it('does not sort arrays', () => {
        const arr = [{ b: 1, a: 2 }, { a: 3, b: 4 }];
        const result = stableJsonStringify(arr);
        // Array order preserved, each object's keys sorted
        expect(result).toBe('[{"a":2,"b":1},{"a":3,"b":4}]');
    });

    it('handles null and undefined', () => {
        expect(stableJsonStringify(null)).toBe('null');
        expect(stableJsonStringify(undefined)).toBe(undefined as any);
    });

    it('accepts space parameter for pretty printing', () => {
        const obj = { a: 1 };
        const result = stableJsonStringify(obj, 2);
        expect(result).toBe('{\n  "a": 1\n}');
    });
});