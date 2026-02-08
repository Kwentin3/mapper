import { describe, it, expect } from 'vitest';
import { computeContractTelemetry } from '../src/signals/compute_contract_telemetry.js';
import type { SemanticProfileV0 } from '../src/config/profiles.js';
import type { ParseFileResult } from '../src/parser/types.js';
import { stableStringCompare } from '../src/utils/determinism.js';

type TelemetryResult = ReturnType<typeof computeContractTelemetry>;

type ProfileOverrides = Partial<SemanticProfileV0> & {
  boundary?: { include?: string[]; exclude?: string[] };
  anchors?: { inbound?: string[]; outbound?: string[] };
};

function buildProfile(overrides: ProfileOverrides = {}): SemanticProfileV0 {
  return {
    version: 0,
    boundary: {
      include: overrides.boundary?.include ?? ['src/**'],
      exclude: overrides.boundary?.exclude ?? ['**/dist/**'],
    },
    anchors: {
      inbound: overrides.anchors?.inbound ?? ['@inbound'],
      outbound: overrides.anchors?.outbound ?? ['@outbound'],
    },
  };
}

function parseResult(file: string, source?: string): ParseFileResult {
  return {
    file,
    edges: [],
    warnings: [],
    ...(source !== undefined ? { source } : {}),
  };
}

function getSignal(map: TelemetryResult, file: string) {
  return map[file.replace(/\\/g, '/')];
}

describe('computeContractTelemetry', () => {
  it('supports brace expansion in glob patterns (e.g., index.{ts,tsx})', () => {
    const semanticProfile = buildProfile({
      boundary: {
        include: ['src/**/index.{ts,tsx}'],
        exclude: [],
      },
      anchors: {
        inbound: ['@inbound'],
        outbound: ['@outbound'],
      },
    });

    const files = ['src/one/index.ts', 'src/two/index.tsx', 'src/three/index.js'];
    const parseResults = [
      parseResult('src/one/index.ts', 'const a = 1;'),
      parseResult('src/two/index.tsx', 'const b = 2;'),
      parseResult('src/three/index.js', 'const c = 3;'),
    ];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });

    expect(getSignal(result, 'src/one/index.ts')?.status).toBe('C0');
    expect(getSignal(result, 'src/two/index.tsx')?.status).toBe('C0');
    expect(getSignal(result, 'src/three/index.js')?.status).toBe('C~');
  });

  it('boundary detection: exclude wins, include-only true, undetermined -> C~', () => {
    const semanticProfile = buildProfile({
      boundary: {
        include: ['src/**'],
        exclude: ['src/secret/**'],
      },
      anchors: {
        inbound: ['@inbound'],
        outbound: ['@outbound'],
      },
    });

    const files = ['src/api/index.ts', 'src/secret/hidden.ts', 'docs/readme.md'];
    const parseResults = [
      parseResult('src/api/index.ts', 'const noop = 1;'),
      parseResult('src/secret/hidden.ts', '@inbound'),
      parseResult('docs/readme.md', 'docs'),
    ];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });

    expect(getSignal(result, 'src/secret/hidden.ts')).toBeUndefined();
    expect(getSignal(result, 'src/api/index.ts')?.status).toBe('C0');
    expect(getSignal(result, 'docs/readme.md')?.status).toBe('C~');
  });

  it('anchor detection and status classification', () => {
    const semanticProfile = buildProfile({
      boundary: { include: ['src/**'], exclude: [] },
      anchors: {
        inbound: ['@inbound', '/foo\\d+/'],
        outbound: ['@outbound'],
      },
    });

    const files = ['src/api/edge.ts', 'src/api/in.ts', 'src/api/empty.ts'];
    const parseResults = [
      parseResult('src/api/edge.ts', '@inbound @outbound foo123'),
      parseResult('src/api/in.ts', '@inbound'),
      parseResult('src/api/empty.ts', 'const value = 42;'),
    ];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });

    expect(getSignal(result, 'src/api/edge.ts')?.status).toBe('C+');
    expect(getSignal(result, 'src/api/in.ts')?.status).toBe('C?');
    expect(getSignal(result, 'src/api/empty.ts')?.status).toBe('C0');

    const inboundExpected = ['@inbound', '/foo\\d+/'].sort(stableStringCompare);
    expect(getSignal(result, 'src/api/edge.ts')?.evidence?.anchorsFound.inbound).toEqual(inboundExpected);
    expect(getSignal(result, 'src/api/edge.ts')?.evidence?.anchorsFound.outbound).toEqual(['@outbound']);
  });

  it('anchors are deduplicated and sorted by pattern', () => {
    const semanticProfile = buildProfile({
      anchors: {
        inbound: ['@inbound', '@inbound', '/foo/'],
        outbound: ['@outbound', '@outbound'],
      },
    });
    const files = ['src/api/dup.ts'];
    const parseResults = [parseResult('src/api/dup.ts', '@inbound @outbound foo')];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });
    const inbound = getSignal(result, 'src/api/dup.ts')?.evidence?.anchorsFound.inbound ?? [];
    const outbound = getSignal(result, 'src/api/dup.ts')?.evidence?.anchorsFound.outbound ?? [];

    expect(inbound).toEqual(['@inbound', '/foo/'].sort(stableStringCompare));
    expect(outbound).toEqual(['@outbound']);
  });

  it('unreadable or binary source returns C~ with empty anchors', () => {
    const semanticProfile = buildProfile({ boundary: { include: ['src/**'], exclude: [] } });

    const files = ['src/api/unreadable.ts', 'src/api/binary.ts'];
    const parseResults = [
      parseResult('src/api/unreadable.ts'),
      parseResult('src/api/binary.ts', 'abc\u0000def'),
    ];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });

    expect(getSignal(result, 'src/api/unreadable.ts')?.status).toBe('C~');
    expect(getSignal(result, 'src/api/binary.ts')?.status).toBe('C~');
    expect(getSignal(result, 'src/api/unreadable.ts')?.evidence?.anchorsFound).toEqual({ inbound: [], outbound: [] });
    expect(getSignal(result, 'src/api/binary.ts')?.evidence?.anchorsFound).toEqual({ inbound: [], outbound: [] });
  });

  it('default evidence contains only anchorsFound', () => {
    const semanticProfile = buildProfile({ boundary: { include: ['src/**'], exclude: [] } });
    const files = ['src/api/evidence.ts'];
    const parseResults = [parseResult('src/api/evidence.ts', '@inbound')];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });
    const evidence = getSignal(result, 'src/api/evidence.ts')?.evidence ?? {};

    expect(evidence).toHaveProperty('anchorsFound');
    expect('boundaryMatch' in evidence).toBe(false);
    expect('anchorsMissing' in evidence).toBe(false);
    expect('notes' in evidence).toBe(false);
  });

  it('deterministic across file and pattern order', () => {
    const semanticProfileA = buildProfile({
      boundary: { include: ['src/one/**', 'src/two/**'], exclude: ['src/ignore/**'] },
      anchors: { inbound: ['@inbound'], outbound: ['@outbound'] },
    });
    const semanticProfileB = buildProfile({
      boundary: { include: ['src/two/**', 'src/one/**'], exclude: ['src/ignore/**'] },
      anchors: { inbound: ['@inbound'], outbound: ['@outbound'] },
    });

    const filesA = ['src/one/a.ts', 'src/two/b.ts'];
    const filesB = ['src/two/b.ts', 'src/one/a.ts'];
    const parseResults = [
      parseResult('src/one/a.ts', '@inbound'),
      parseResult('src/two/b.ts', '@outbound'),
    ];

    const resultA = computeContractTelemetry({ files: filesA, semanticProfile: semanticProfileA, parseResults });
    const resultB = computeContractTelemetry({ files: filesB, semanticProfile: semanticProfileB, parseResults });

    expect(JSON.stringify(resultA)).toBe(JSON.stringify(resultB));
  });

  it('normalizes map keys to POSIX paths', () => {
    const semanticProfile = buildProfile({ boundary: { include: ['src/**'], exclude: [] } });
    const files = ['src\\api\\posix.ts'];
    const parseResults = [parseResult('src\\api\\posix.ts', '@inbound')];

    const result = computeContractTelemetry({ files, semanticProfile, parseResults });

    expect(result['src/api/posix.ts']).toBeDefined();
  });
});
