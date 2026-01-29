import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('docs/config ORPHAN suppression (render-only)', () => {
  it('suppresses ORPHAN for docs/ and top-level config files by default and shows with --show-orphans', async () => {
    const temp = join(__dirname, 'temp_docs_orphan_' + Math.random().toString(36).slice(2));
    const repo = join(temp, 'repo');
    await fs.mkdir(join(repo, 'docs'), { recursive: true });

    await fs.writeFile(join(repo, 'docs', 'guide.md'), `// guide\n`);
    await fs.writeFile(join(repo, 'README.md'), `# readme\n`);

    const base = await runPipeline({ rootDir: repo });
    const mdBase = base.markdown;
  // Extract tree block to inspect inline signals
  const parts = mdBase.split(/\r?\n/);
  const start = parts.indexOf('```');
  const end = parts.indexOf('```', start + 1);
  const treeLines = start === -1 || end === -1 ? [] : parts.slice(start + 1, end);

  // docs/guide.md should be present but not show (i ORPHAN) by default
  const docsLine = treeLines.find(l => l.includes('guide.md'));
    expect(docsLine).toBeDefined();
    expect(docsLine).not.toContain('(i ORPHAN)');

  // README.md also should be suppressed by default
  const readmeLine = treeLines.find(l => l.includes('README.md'));
    expect(readmeLine).toBeDefined();
    expect(readmeLine).not.toContain('(i ORPHAN)');

    // With showOrphans: the ORPHAN context should appear
  const shown = await runPipeline({ rootDir: repo, showOrphans: true });
  const mdShown = shown.markdown;
  const shownParts = mdShown.split(/\r?\n/);
  const shownStart = shownParts.indexOf('```');
  const shownEnd = shownParts.indexOf('```', shownStart + 1);
  const shownTreeLines = shownStart === -1 || shownEnd === -1 ? [] : shownParts.slice(shownStart + 1, shownEnd);
  const docsLineShown = shownTreeLines.find(l => l.includes('guide.md'));
    expect(docsLineShown).toBeDefined();
    expect(docsLineShown).toContain('(i ORPHAN)');

  const readmeLineShown = shownTreeLines.find(l => l.includes('README.md'));
    expect(readmeLineShown).toBeDefined();
    expect(readmeLineShown).toContain('(i ORPHAN)');

    await fs.rm(temp, { recursive: true, force: true });
  });
});
