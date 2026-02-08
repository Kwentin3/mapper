import { describe, it, expect } from 'vitest';
import { DEFAULT_PROFILE } from '../src/config/profiles.js';
import { mergeConfigIntoProfile } from '../src/config/load.js';

type SemanticProfile = NonNullable<typeof DEFAULT_PROFILE.semanticProfile>;

function compareLex(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function isSorted(values: string[]): boolean {
  return values.every((value, index) => index === 0 || compareLex(values[index - 1], value) <= 0);
}

describe('Profile v0 semanticProfile', () => {
  it('DEFAULT_PROFILE contains v0 semanticProfile with sorted arrays', () => {
    const semantic = DEFAULT_PROFILE.semanticProfile as SemanticProfile;

    expect(semantic).toBeDefined();
    expect(semantic.version).toBe(0);
    expect(semantic.boundary.include).toEqual([
      'src/**/api.{ts,tsx,js,jsx}',
      'src/**/index.{ts,tsx,js,jsx}',
      'src/**/routes.{ts,tsx,js,jsx}',
    ]);
    expect(semantic.boundary.exclude).toEqual([
      '**/*.spec.*',
      '**/*.test.*',
      '**/__mocks__/**',
      '**/__tests__/**',
      '**/build/**',
      '**/dist/**',
      '**/mocks/**',
      '**/node_modules/**',
      '**/out/**',
      '**/test/**',
      '**/tests/**',
    ]);
    expect(semantic.anchors.inbound).toEqual(['@inbound']);
    expect(semantic.anchors.outbound).toEqual(['@outbound']);
    expect(isSorted(semantic.boundary.include)).toBe(true);
    expect(isSorted(semantic.boundary.exclude)).toBe(true);
    expect(isSorted(semantic.anchors.inbound)).toBe(true);
    expect(isSorted(semantic.anchors.outbound)).toBe(true);
  });

  it('merge replaces only provided arrays and preserves defaults', () => {
    const merged = mergeConfigIntoProfile(DEFAULT_PROFILE, {
      semanticProfile: {
        boundary: {
          include: ['src/**/routes.ts', 'src/**/api.ts'],
        },
        anchors: {
          inbound: ['@inbound', '@alpha'],
        },
      } as any,
    });

    const semantic = merged.semanticProfile as SemanticProfile;
    expect(semantic.boundary.include).toEqual(['src/**/api.ts', 'src/**/routes.ts']);
    const expectedExclude = [...(DEFAULT_PROFILE.semanticProfile?.boundary.exclude ?? [])]
      .sort((a, b) => a.localeCompare(b));
    expect(semantic.boundary.exclude).toEqual(expectedExclude);
    expect(semantic.anchors.inbound).toEqual(['@alpha', '@inbound']);
    expect(semantic.anchors.outbound).toEqual(DEFAULT_PROFILE.semanticProfile?.anchors.outbound);
  });

  it('merge replaces exclude-only and outbound-only arrays', () => {
    const merged = mergeConfigIntoProfile(DEFAULT_PROFILE, {
      semanticProfile: {
        boundary: {
          exclude: ['**/dist/**', '**/build/**'],
        },
        anchors: {
          outbound: ['@outbound', '@beta'],
        },
      } as any,
    });

    const semantic = merged.semanticProfile as SemanticProfile;
    expect(semantic.boundary.exclude).toEqual(['**/build/**', '**/dist/**']);
    expect(semantic.boundary.include).toEqual(DEFAULT_PROFILE.semanticProfile?.boundary.include);
    expect(semantic.anchors.outbound).toEqual(['@beta', '@outbound']);
    expect(semantic.anchors.inbound).toEqual(DEFAULT_PROFILE.semanticProfile?.anchors.inbound);
  });

  it('normalizes POSIX patterns for boundary include', () => {
    const merged = mergeConfigIntoProfile(DEFAULT_PROFILE, {
      semanticProfile: {
        boundary: {
          include: ['src\\api\\index.ts'],
        },
      } as any,
    });

    const semantic = merged.semanticProfile as SemanticProfile;
    expect(semantic.boundary.include).toEqual(['src/api/index.ts']);
  });

  it('semanticProfile merge does not affect unrelated fields', () => {
    const merged = mergeConfigIntoProfile(DEFAULT_PROFILE, {
      semanticProfile: {
        anchors: {
          inbound: ['@x'],
        },
      } as any,
    });

    expect(merged.thresholds).toEqual(DEFAULT_PROFILE.thresholds);
    expect(merged.signalBudget).toEqual(DEFAULT_PROFILE.signalBudget);
    expect(merged.monorepo).toBe(DEFAULT_PROFILE.monorepo);
    expect(merged.layerAware).toBe(DEFAULT_PROFILE.layerAware);
    expect(merged.extensions).toEqual(DEFAULT_PROFILE.extensions);
  });
});
