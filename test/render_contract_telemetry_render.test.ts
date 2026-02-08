import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import type { RenderInput } from '../src/render/types.js';
import type { DirNode, FileNode } from '../src/scanner/types.js';
import type { SignalsResult } from '../src/signals/types.js';
import type { ContractSignal } from '../src/signals/contract_types.js';
import type { DependencyGraph } from '../src/graph/types.js';

type InlineSignal = { kind: 'risk' | 'hint' | 'nav' | 'context'; code: string };

type SignalEntry = [string, ContractSignal];

const makeSignal = (
  status: 'C+' | 'C?' | 'C0' | 'C~',
  inbound: string[] = [],
  outbound: string[] = []
): ContractSignal => ({
  status,
  evidence: {
    anchorsFound: {
      inbound,
      outbound,
    },
  },
});

const buildContractSignals = (entries: SignalEntry[]) => {
  const map: Record<string, ContractSignal> = {};
  for (const [file, signal] of entries) {
    map[file] = signal;
  }
  return map;
};

const buildTree = (files: string[]): DirNode => {
  const fileNodes: FileNode[] = files.map((file) => {
    const name = file.split('/').pop() ?? file;
    return {
      kind: 'file' as const,
      name,
      relPath: file,
      ext: name.includes('.') ? name.split('.').pop() ?? '' : '',
    };
  });

  return {
    kind: 'dir',
    name: '',
    relPath: '',
    children: [
      {
        kind: 'dir',
        name: 'src',
        relPath: 'src',
        children: fileNodes,
      },
    ],
  } as DirNode;
};

const buildGraph = (files: string[]): DependencyGraph => {
  const nodes = new Map<string, { incoming: string[]; outgoing: string[] }>();
  for (const file of files) {
    nodes.set(file, { incoming: [], outgoing: [] });
  }
  return { nodes, cycles: [] };
};

const buildSignals = (args: {
  contractSignals: Record<string, ContractSignal>;
  inline?: Record<string, InlineSignal[]>;
  hubs?: string[];
}): SignalsResult => {
  const inline = args.inline ?? {};
  const hubs = args.hubs ?? [];
  return {
    files: Object.keys(inline).map((file) => ({ file, inline: inline[file] })),
    entrypoints: [],
    publicApi: [],
    hubsFanIn: hubs.map((file) => ({ file, reason: 'Fan-in 2', score: 2 })),
    hubsFanOut: [],
    warnings: [],
    contractSignals: args.contractSignals,
  };
};

const extractTreeLines = (markdown: string): string[] => {
  const parts = markdown.split('```');
  if (parts.length < 2) return [];
  return parts[1].trim().split('\n');
};

describe('render: contract telemetry (render-level)', () => {
  it('renders tree markers and preserves marker ordering', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'src/e.ts'];
    const tree = buildTree(files);
    const graph = buildGraph(files);
    const contractSignals = buildContractSignals([
      ['src/a.ts', makeSignal('C+')],
      ['src/b.ts', makeSignal('C?')],
      ['src/c.ts', makeSignal('C0')],
      ['src/d.ts', makeSignal('C~')],
    ]);
    const signals = buildSignals({
      contractSignals,
      inline: {
        'src/a.ts': [{ kind: 'risk', code: 'CYCLE' }],
      },
      hubs: ['src/a.ts'],
    });

    const input: RenderInput = { tree, signals, graph };
    const output = renderArchitectureMd(input, { collapse: false, showTemp: true });
    const treeLines = extractTreeLines(output.content);

    const lineA = treeLines.find((line) => line.includes('a.ts')) ?? '';
    const lineB = treeLines.find((line) => line.includes('b.ts')) ?? '';
    const lineC = treeLines.find((line) => line.includes('c.ts')) ?? '';
    const lineD = treeLines.find((line) => line.includes('d.ts')) ?? '';
    const lineE = treeLines.find((line) => line.includes('e.ts')) ?? '';

    expect(lineA).toContain('[HUB]');
    expect(lineA).toContain('[C+]');
    expect(lineB).toContain('[C?]');
    expect(lineC).toContain('[C0]');
    expect(lineD).not.toContain('[C~]');
    expect(lineE).not.toMatch(/\[C[+?0~]\]/);

    const hubIndex = lineA.indexOf('[HUB]');
    const contractIndex = lineA.indexOf('[C+]');
    const signalIndex = lineA.indexOf('(! CYCLE)');
    expect(hubIndex).toBeGreaterThan(-1);
    expect(contractIndex).toBeGreaterThan(hubIndex);
    expect(signalIndex).toBeGreaterThan(contractIndex);
  });

  it('renders contract coverage summary with sorted, truncated high-risk list', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'src/e.ts', 'src/f.ts', 'src/g.ts', 'src/h.ts'];
    const tree = buildTree(files);
    const graph = buildGraph(files);
    const contractSignals = buildContractSignals([
      ['src/a.ts', makeSignal('C?')],
      ['src/b.ts', makeSignal('C0')],
      ['src/c.ts', makeSignal('C0')],
      ['src/d.ts', makeSignal('C?')],
      ['src/e.ts', makeSignal('C0')],
      ['src/f.ts', makeSignal('C?')],
      ['src/g.ts', makeSignal('C0')],
      ['src/h.ts', makeSignal('C+')],
      ['src/x.ts', makeSignal('C~')],
    ]);
    const signals = buildSignals({ contractSignals });

    const input: RenderInput = { tree, signals, graph };
    const output = renderArchitectureMd(input, { collapse: false, showTemp: true });

    expect(output.content).toContain('## Contract coverage');
    expect(output.content).toContain('- C+: 1');
    expect(output.content).toContain('- C?: 3');
    expect(output.content).toContain('- C0: 4');
    expect(output.content).toContain('- C~: 1');

    const sectionStart = output.content.indexOf('### High-risk (C0/C?)');
    const sectionEnd = output.content.indexOf('### Legend', sectionStart);
    const highRiskBlock = output.content.slice(sectionStart, sectionEnd);
    const highRiskLines = highRiskBlock
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- `'));

    const highRiskFiles = highRiskLines.map((line) => line.slice(3, line.indexOf('`', 3)));
    const expectedHighRisk = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'src/e.ts', 'src/f.ts', 'src/g.ts'];
    const expectedSorted = expectedHighRisk.slice().sort((a, b) => a.localeCompare(b));

    expect(highRiskFiles).toEqual(expectedSorted.slice(0, 5));
    expect(highRiskBlock).toContain('- +2 more');
    expect(highRiskBlock).not.toContain('src/h.ts');
    expect(highRiskBlock).not.toContain('src/x.ts');
  });

  it('renders focused contract telemetry details without extra evidence fields', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const tree = buildTree(files);
    const graph = buildGraph(files);
    const contractSignals = buildContractSignals([
      ['src/a.ts', makeSignal('C?', ['@inbound'], [])],
    ]);
    const signals = buildSignals({ contractSignals });

    const input: RenderInput = { tree, signals, graph };
    const output = renderArchitectureMd(input, { focusFile: 'src/a.ts', collapse: false, showTemp: true });

    expect(output.content).toContain('### Contract Telemetry');
    expect(output.content).toContain('- Status: C?');
    expect(output.content).toContain('- Inbound anchors: @inbound');
    expect(output.content).toContain('- Outbound anchors: (none)');
    expect(output.content).not.toContain('boundaryMatch');
    expect(output.content).not.toContain('anchorsMissing');
    expect(output.content).not.toContain('notes');
  });

  it('suppresses coverage and markers when contractSignals is empty', () => {
    const files = ['src/a.ts'];
    const tree = buildTree(files);
    const graph = buildGraph(files);
    const signals = buildSignals({ contractSignals: {} });

    const input: RenderInput = { tree, signals, graph };
    const output = renderArchitectureMd(input, { collapse: false, showTemp: true });

    expect(output.content).not.toContain('## Contract coverage');
    expect(output.content).not.toContain('### Legend');
    expect(output.content).not.toMatch(/\[C[+?0~]\]/);
  });

  it('is deterministic regardless of contractSignals insertion order', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const tree = buildTree(files);
    const graph = buildGraph(files);

    const signalsA = buildSignals({
      contractSignals: buildContractSignals([
        ['src/a.ts', makeSignal('C+')],
        ['src/b.ts', makeSignal('C?')],
        ['src/c.ts', makeSignal('C0')],
      ]),
    });

    const signalsB = buildSignals({
      contractSignals: buildContractSignals([
        ['src/c.ts', makeSignal('C0')],
        ['src/a.ts', makeSignal('C+')],
        ['src/b.ts', makeSignal('C?')],
      ]),
    });

    const inputA: RenderInput = { tree, signals: signalsA, graph };
    const inputB: RenderInput = { tree, signals: signalsB, graph };

    const outA = renderArchitectureMd(inputA, { collapse: false, showTemp: true });
    const outB = renderArchitectureMd(inputB, { collapse: false, showTemp: true });

    expect(outA.content).toBe(outB.content);

    const treeLines = extractTreeLines(outA.content);
    const indexA = treeLines.findIndex((line) => line.includes('a.ts'));
    const indexB = treeLines.findIndex((line) => line.includes('b.ts'));
    expect(indexA).toBeGreaterThan(-1);
    expect(indexB).toBeGreaterThan(-1);
    expect(indexA).toBeLessThan(indexB);
  });
});
