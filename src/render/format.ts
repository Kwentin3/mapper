/**
 * Small rendering helpers for formatting file paths and derived annotations.
 */
import { stablePathNormalize } from '../utils/determinism.js';

/**
 * Classify a repository‑relative POSIX path as PROD or TEST according to
 * deterministic, path‑only rules (render/view layer only).
 *
 * Rules (exact, do not expand):
 * - TEST if path starts with `test/` or `tests/`, or contains `/test/` or `/tests/`
 * - TEST if filename matches `*.test.*` or `*.spec.*`
 * - TEST if path contains `__tests__` or `__fixtures__`
 * - TEST if path contains `/fixtures/`
 * - Otherwise PROD
 */
export function classifyPathKind(path: string): 'PROD' | 'TEST' {
    const norm = stablePathNormalize(path);

    // Containment rules: handle leading 'test/' or 'tests/' specially (startsWith)
    if (norm.startsWith('test/') || norm.startsWith('tests/') || norm.includes('/test/') || norm.includes('/tests/')) return 'TEST';
    if (norm.includes('__tests__') || norm.includes('__fixtures__')) return 'TEST';
    if (norm.includes('/fixtures/')) return 'TEST';

    // Filename rules: match *.test.* or *.spec.* (any extension)
    if ((/(^|\/)[^\/]+\.(test|spec)\.[^\/]+$/).test(norm)) return 'TEST';

    return 'PROD';
}

/**
 * Canonical truncation notice for budgeted lists.
 * Must be ASCII, deterministic and exact byte-for-byte.
 * Example: "Truncated by budget; rerun with --full-signals (+3 more)."
 */
export function formatTruncationNotice(hiddenCount: number): string {
    return `Truncated by budget; rerun with --full-signals (+${hiddenCount} more).`;
}

/**
 * HUB-aware truncation hint: short, ASCII, deterministic.
 * Render-only guidance visible when a truncated list contains a hub.
 */
export function formatHubTruncationHint(): string {
    return 'Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.';
}
