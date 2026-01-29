/**
 * Deterministic utilities for consistent output across runs.
 */

/**
 * Compare two strings in a stable, locale‐aware manner.
 * Uses 'en' locale for consistency across environments.
 */
export function stableStringCompare(a: string, b: string): number {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

/**
 * Normalize a file system path to a canonical string form.
 * - Backslashes are replaced with forward slashes.
 * - Trailing slash is removed (unless the path is root '/').
 * - Multiple slashes are not collapsed (preserved as is).
 */
export function stablePathNormalize(path: string): string {
    if (path.length === 0) return '.';
    let normalized = path.replace(/\\/g, '/');
    // Remove trailing slash unless it's the root '/'
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

/**
 * Sort an array stably using a custom comparator.
 * If the comparator returns 0, the original order is preserved.
 * Implementation uses the Schwartzian transform (decorate‑sort‑undecorate)
 * to guarantee stability regardless of the underlying sort algorithm.
 */
export function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
    // Decorate each element with its original index
    const decorated = array.map((value, index) => ({ value, index }));
    decorated.sort((a, b) => {
        const cmp = comparator(a.value, b.value);
        if (cmp !== 0) return cmp;
        // If equal according to comparator, fall back to original index
        return a.index - b.index;
    });
    // Undecorate
    return decorated.map(({ value }) => value);
}

/**
 * Recursively sort all object keys alphabetically and return a stable JSON string.
 * Arrays are kept in their original order (no sorting).
 * Primitives are returned as their normal JSON representation.
 */
export function stableJsonStringify(value: any, space?: string | number): string {
    const replacer = (_key: string, val: any): any => {
        if (val == null || typeof val !== 'object') {
            return val;
        }
        // Array: keep order, but recursively process elements
        if (Array.isArray(val)) {
            return val.map((item) => replacer('', item));
        }
        // Object: sort keys alphabetically
        const sortedObj: Record<string, any> = {};
        const keys = Object.keys(val).sort(stableStringCompare);
        for (const k of keys) {
            sortedObj[k] = replacer(k, val[k]);
        }
        return sortedObj;
    };
    return JSON.stringify(value, replacer, space);
}