import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { scanRepo } from '../src/scanner/index.js';
import { parseFile } from '../src/parser/index.js';
import { buildDependencyGraph } from '../src/graph/index.js';
import { computeSignals } from '../src/signals/index.js';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';

describe('Contract health signals sticky under inline budget', () => {
  it('boundary INPUT_ONLY_CONTRACT survives tight inlinePerFileMax', async () => {
    const temp = createTempRepoDir('temp_contract_sticky');
    const repo = join(temp, 'repo');
    await fs.mkdir(join(repo, 'src', 'api'), { recursive: true });

    // edge.ts: boundary candidate with input-only anchor and dynamic import
    const edgePath = join(repo, 'src', 'api', 'edge.ts');
    const edgeSrc = `import './cycle1';\nconst inputSchema = { /* anchor */ };\nconst x = import('./dyn');\n` +
      `// trailing invalid token to produce a parse warning\n<<<INVALID`;
    await fs.writeFile(edgePath, edgeSrc);

    // cycle partner to induce CYCLE risk
    await fs.writeFile(join(repo, 'src', 'api', 'cycle1.ts'), `import './edge';\n`);

    // Many importers to raise fan-in (GOD-MODULE) for edge.ts
    for (let i = 1; i <= 16; i++) {
      const p = join(repo, `src/importer${i}.ts`);
      await fs.writeFile(p, `import './api/edge';\n`);
    }

    // Also add a dyn module referenced by dynamic import
    await fs.writeFile(join(repo, 'src', 'api', 'dyn.ts'), `export const d = 1;\n`);

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

    // Build graph
    const graph = buildDependencyGraph({ files, parsed, resolve: (from: string, spec: string) => {
      // simple resolver for tests: resolve relative imports to POSIX normalized paths
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const fromDir = from.includes('/') ? from.split('/').slice(0, -1).join('/') : '.';
        const resolved = (join(fromDir, spec) as any).replace(/\\/g, '/');
        const norm = resolved.split('\\').join('/');
        return { kind: 'internal', path: norm, original: spec };
      }
      return { kind: 'external', path: spec, original: spec };
    } });

    // Compute signals with tight inlinePerFileMax = 2
    const fileMeta: Record<string, { depth: number }> = {};
    for (const f of files) fileMeta[f] = { depth: 0 };
    const signals = computeSignals({ files, graph, parseResults: parsed, fileMeta, budgets: { entrypointsTopN: Infinity, publicApiTopN: Infinity, hubsTopN: Infinity, inlinePerFileMax: 2 }, thresholds: { bigLoc: 1000, godFanIn: 15, deepPath: 1000, barrelExports: 1000 } });

    // Render
    const ri = { tree: scanResult.root, graph, signals } as any;
  const out = renderArchitectureMd(ri, { showTemp: true, collapse: false });

    // Assert the Project Tree contains the contract health hint for edge.ts
    const md = out.content;
    expect(md).toContain('src/api/edge.ts');
    expect(md).toMatch(/\(\? INPUT_ONLY_CONTRACT\)/);

    // Determinism: repeated runs produce identical markdown
  const out2 = renderArchitectureMd(ri, { showTemp: true, collapse: false });
    expect(out.content).toBe(out2.content);

    // Cleanup
    await fs.rm(temp, { recursive: true, force: true });
  });
});
