import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import type { RenderInput } from '../src/render/types.js';

describe('assertionKind: render stability', () => {
  it('does not affect ARCHITECTURE.md output when present/absent', () => {
    const inputA: RenderInput = {
      tree: {
        kind: 'dir',
        name: '',
        relPath: '',
        children: [
          {
            kind: 'dir',
            name: 'src',
            relPath: 'src',
            children: [{ kind: 'file', name: 'main.ts', relPath: 'src/main.ts', ext: 'ts' }],
          },
        ],
      },
      signals: {
        files: [
          {
            file: 'src/main.ts',
            inline: [
              { kind: 'nav', code: 'ENTRYPOINT' },
              { kind: 'risk', code: 'CYCLE' },
            ],
          },
        ],
        entrypoints: [{ file: 'src/main.ts', reason: 'main', score: 10 }],
        publicApi: [],
        hubsFanIn: [],
        hubsFanOut: [],
        warnings: [],
        contractSignals: {
          'src/main.ts': { status: 'C+' },
        },
      },
      graph: {
        nodes: new Map([
          [
            'src/main.ts',
            { id: 'src/main.ts', outgoing: new Set(), incoming: new Set(), externals: new Set() },
          ],
        ]),
        cycles: [['src/main.ts']],
      },
    };

    const inputB: RenderInput = {
      ...inputA,
      signals: {
        ...inputA.signals,
        files: [
          {
            file: 'src/main.ts',
            inline: [
              { kind: 'nav', code: 'ENTRYPOINT', assertionKind: 'INFERENCE' },
              { kind: 'risk', code: 'CYCLE', assertionKind: 'FACT' },
            ],
          },
        ],
        contractSignals: {
          'src/main.ts': { status: 'C+', assertionKind: 'FACT' },
        },
      },
    };

    const outA = renderArchitectureMd(inputA, { collapse: false, showTemp: true }).content;
    const outB = renderArchitectureMd(inputB, { collapse: false, showTemp: true }).content;

    expect(outB).toBe(outA);
    expect(outB).not.toContain('assertionKind');
    expect(outB).not.toContain('FACT');
    expect(outB).not.toContain('INFERENCE');
    expect(outB).not.toContain('POLICY');
    expect(outB).not.toContain('UNKNOWN');
  });
});

