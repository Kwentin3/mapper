import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import { formatHubTruncationHint } from '../src/render/format.js';

describe('summary hub truncation hint (L9.8)', () => {
  it('shows hub-aware truncation hint when a truncated list concerns a hub and hides it under --full-signals; deterministic', async () => {
    const nodeId = 'src/foo.ts';

    // Construct a minimal graph where nodeId has many incoming edges
    const incoming = Array.from({ length: 10 }).map((_, i) => `lib/dep${i}.ts`);
    const graph = {
      nodes: {
        [nodeId]: {
          incoming,
          outgoing: [],
        },
      },
    } as any;

    // Signals mark nodeId as a hub (render-only hubSet is built from hubsFanIn/hubsFanOut)
    const signals = {
      hubsFanIn: [{ file: nodeId }],
      hubsFanOut: [],
      files: [],
      entrypoints: [],
      publicApi: [],
    } as any;

    const tree = {
      kind: 'dir',
      name: '',
      relPath: '',
      children: [
        {
          kind: 'dir',
          name: 'src',
          relPath: 'src',
          children: [
            { kind: 'file', name: 'foo.ts', relPath: nodeId, ext: 'ts' },
          ],
        },
      ],
    } as any;

    // Baseline (budgeted) render
    const r1 = renderArchitectureMd({ tree, signals, graph }, { profile: 'default', fullSignals: false });
    const md1 = r1.content;

    // Full-signals render (no truncation expected)
    const r2 = renderArchitectureMd({ tree, signals, graph }, { profile: 'default', fullSignals: true });
    const md2 = r2.content;

    // The hub-aware hint must appear in the baseline (budgeted) render
    expect(md1).toContain(formatHubTruncationHint());

    // Under full-signals the hint should not be present (no truncation)
    expect(md2).not.toContain(formatHubTruncationHint());

    // Determinism: repeated baseline render is identical
    const r3 = renderArchitectureMd({ tree, signals, graph }, { profile: 'default', fullSignals: false });
    expect(md1).toBe(r3.content);
  }, { timeout: 20000 });
});
