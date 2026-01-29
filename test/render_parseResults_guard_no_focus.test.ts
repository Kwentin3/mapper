import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempRepoDir } from './helpers/temp_dirs.js';
import { scanRepo } from '../src/scanner/index.js';
import { parseFile } from '../src/parser/index.js';
import { buildDependencyGraph } from '../src/graph/index.js';
import { computeSignals } from '../src/signals/index.js';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';

describe('Render parseResults guard (L8.4a)', () => {
  it('parseResults present must not change output when no focusFile is set', async () => {
  const temp = createTempRepoDir('temp_render_parse_guard');
  const repo = join(temp, 'repo');
    await fs.mkdir(join(repo, 'src'), { recursive: true });
    await fs.mkdir(join(repo, 'src', 'api'), { recursive: true });

    // Write minimal repo fixture
    await fs.writeFile(join(repo, 'src', 'a.ts'), `import './b';\n`);
    await fs.writeFile(join(repo, 'src', 'b.ts'), `export const v = 1;\n`);
    await fs.writeFile(join(repo, 'src', 'api', 'edge.ts'), `// boundary candidate\n`);

    // 1) Scan repository
    const scanResult = await scanRepo({ rootDir: repo, excludes: [], maxFiles: undefined });

    // Collect files list (relative POSIX)
    const files: string[] = [];
    function collect(node: any) {
      if (!node) return;
      if (node.kind === 'file') {
        files.push(node.relPath);
      } else if (node.children) {
        for (const c of node.children) collect(c);
      }
    }
    collect(scanResult.root);

    // 2) Parse files (preserve source)
    const parsed: any[] = [];
    for (const f of files) {
      const abs = join(repo, f);
      const code = await fs.readFile(abs, 'utf-8');
      const pr = parseFile(f, code, { markDynamicImports: true });
      (pr as any).source = code;
      parsed.push(pr);
    }

    // 3) Build graph
    const graph = buildDependencyGraph({ files, parsed, resolve: (from: string, spec: string) => {
      // Simple resolver for our tiny fixture: resolve relative paths
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const fromDir = from.includes('/') ? from.split('/').slice(0, -1).join('/') : '.';
        const resolved = (join(fromDir, spec) as any).replace(/\\/g, '/');
        const norm = resolved.split('\\').join('/');
        return { kind: 'internal', path: norm, original: spec };
      }
      return { kind: 'external', path: spec, original: spec };
    } });

    // 4) Compute signals (use conservative budgets like pipeline would)
    const fileMeta: Record<string, { depth: number }> = {};
    for (const f of files) fileMeta[f] = { depth: 0 };
    const signals = computeSignals({ files, graph, parseResults: parsed, fileMeta, budgets: { entrypointsTopN: Infinity, publicApiTopN: Infinity, hubsTopN: Infinity, inlinePerFileMax: Infinity }, thresholds: { bigLoc: 1000, godFanIn: 1000, deepPath: 1000, barrelExports: 1000 } });

    // 5) Build two RenderInput variants: without parseResults and with parseResults
    const baseInput = { tree: scanResult.root, signals, graph } as any;
    const withParseInput = { tree: scanResult.root, signals, graph, parseResults: parsed } as any;

    // Render each variant twice to assert determinism
    const outA1 = renderArchitectureMd(baseInput, {});
    const outA2 = renderArchitectureMd(baseInput, {});
    expect(outA1.content).toBe(outA2.content);

    const outB1 = renderArchitectureMd(withParseInput, {});
    const outB2 = renderArchitectureMd(withParseInput, {});
    expect(outB1.content).toBe(outB2.content);

    // Finally assert the two variants produce identical markdown when no focusFile set
    expect(outA1.content).toBe(outB1.content);

    // Cleanup
    await fs.rm(temp, { recursive: true, force: true });
  });
});
