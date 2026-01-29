import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { scanRepo } from '../src/scanner/index.js';
import { parseFile } from '../src/parser/index.js';
import { buildDependencyGraph } from '../src/graph/index.js';
import { computeSignals } from '../src/signals/index.js';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';

describe('Contract telemetry non-sticky under budget', () => {
  it('CONTRACT: input is not guaranteed sticky under tight inlinePerFileMax', async () => {
  const temp = createTempRepoDir('temp_contract_telemetry_not_sticky');
  const repo = join(temp, 'repo');
    await fs.mkdir(join(repo, 'src', 'api'), { recursive: true });

    // edge.ts: boundary candidate with BOTH input and output anchors -> emits CONTRACT: input and CONTRACT: output (contexts)
    const edgePath = join(repo, 'src', 'api', 'edge.ts');
  // Include dynamic import and an intentional parse warning token to generate multiple signals
  const edgeSrc = `const inputSchema = {};\nconst responseSchema = {};\nconst dyn = import('./dyn');\n<<<BAD_PARSE`;
    await fs.writeFile(edgePath, edgeSrc);

    // Create many signals for the same file to exceed inline budget: cycle, parse warning, many importers
    await fs.writeFile(join(repo, 'src', 'api', 'cycle1.ts'), `import './edge';\n`);
    for (let i = 1; i <= 20; i++) {
      const p = join(repo, `src/importer${i}.ts`);
      await fs.writeFile(p, `import './api/edge';\n`);
    }

    // Scan
    const scanResult = await scanRepo({ rootDir: repo, excludes: [], maxFiles: undefined });

    // Gather files list
    const files: string[] = [];
    function collect(node: any) {
      if (!node) return;
      if (node.kind === 'file') files.push(node.relPath);
      else for (const c of node.children) collect(c);
    }
    collect(scanResult.root);

    // Parse and attach source
    const parsed: any[] = [];
    for (const f of files) {
      const abs = join(repo, f);
      const code = await fs.readFile(abs, 'utf-8');
      const pr = parseFile(f, code, { markDynamicImports: true });
      (pr as any).source = code;
      parsed.push(pr);
    }

    // Graph
    const graph = buildDependencyGraph({ files, parsed, resolve: (from: string, spec: string) => {
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const fromDir = from.includes('/') ? from.split('/').slice(0, -1).join('/') : '.';
        const resolved = (join(fromDir, spec) as any).replace(/\\/g, '/');
        const norm = resolved.split('\\').join('/');
        return { kind: 'internal', path: norm, original: spec };
      }
      return { kind: 'external', path: spec, original: spec };
    } });

    // Signals with tight inlinePerFileMax = 2
    const fileMeta: Record<string, { depth: number }> = {};
    for (const f of files) fileMeta[f] = { depth: 0 };
    const signals = computeSignals({ files, graph, parseResults: parsed, fileMeta, budgets: { entrypointsTopN: Infinity, publicApiTopN: Infinity, hubsTopN: Infinity, inlinePerFileMax: 2 }, thresholds: { bigLoc: 1000, godFanIn: 15, deepPath: 1000, barrelExports: 1000 } });

    // Render with collapse off so Project Tree is fully visible
    const ri = { tree: scanResult.root, graph, signals } as any;
    const out = renderArchitectureMd(ri, { collapse: false, showTemp: true });
    const md = out.content;

    // CONTRACT: input is rendered as a context '(i CONTRACT: input)'
    // Under tight budgets it is allowed to be dropped; assert that it may be absent.
    const appears = /\(i CONTRACT: input\)/.test(md);
    // For the test to be meaningful, we expect it's possible to be missing under tiny budget.
    expect(appears).toBe(false);

    // Determinism
    const out2 = renderArchitectureMd(ri, { collapse: false, showTemp: true });
    expect(out.content).toBe(out2.content);

    await fs.rm(temp, { recursive: true, force: true });
  });
});
