import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('entrypoint ORPHAN suppression (render-only)', () => {
  it('suppresses (i ORPHAN) for entrypoints by default and shows it with --show-orphans', async () => {
    const temp = join(__dirname, 'temp_entrypoint_orphan_' + Math.random().toString(36).slice(2));
    const repo = join(temp, 'repo');
    await fs.mkdir(repo, { recursive: true });

    // A.ts imports B.ts -> A has fan-out >0 and no incoming => ENTRYPOINT and ORPHAN
    await fs.writeFile(join(repo, 'A.ts'), "import './B.ts';\n");
    await fs.writeFile(join(repo, 'B.ts'), "// B\n");

    const base = await runPipeline({ rootDir: repo });
    const mdBase = base.markdown;

    // Find A.ts line in tree
    // Extract the Project Tree code block
    function extractTree(md: string) {
      const parts = md.split(/\r?\n/);
      const start = parts.indexOf('```');
      const end = parts.indexOf('```', start + 1);
      if (start === -1 || end === -1) return [];
      return parts.slice(start + 1, end);
    }

    const treeLines = extractTree(mdBase);
    const aLine = treeLines.find(l => l.includes('A.ts'));
    expect(aLine).toBeDefined();
    // Should contain ENTRYPOINT nav
    expect(aLine).toContain('(→ ENTRYPOINT)');
    // By default ORPHAN should be suppressed
    expect(aLine).not.toContain('(i ORPHAN)');

    // With showOrphans: ORPHAN should appear
    const shown = await runPipeline({ rootDir: repo, showOrphans: true });
    const mdShown = shown.markdown;
  const treeLinesShown = extractTree(mdShown);
  const aLineShown = treeLinesShown.find(l => l.includes('A.ts'));
    expect(aLineShown).toBeDefined();
    expect(aLineShown).toContain('(→ ENTRYPOINT)');
    expect(aLineShown).toContain('(i ORPHAN)');

    await fs.rm(temp, { recursive: true, force: true });
  });
});
