import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: task capsule (--focus-file + --focus-depth)', () => {
  let tempDir: string;

  beforeAll(async () => {
  tempDir = createTempRepoDir('temp_focus_task_capsule');
    const fixture = fb();

    // Build chain: src/A.ts -> ./B.ts -> ./C.ts -> ./D.ts (depth 3)
    fixture.file('src/A.ts');
    fixture.file('src/B.ts');
    fixture.file('src/C.ts');
    fixture.file('src/D.ts');
    fixture.imports('src/A.ts', ['./B.ts']);
    fixture.imports('src/B.ts', ['./C.ts']);
    fixture.imports('src/C.ts', ['./D.ts']);

    // An external importer of A to exercise incoming edges
    fixture.file('tests/t_importer.test.ts');
    fixture.imports('tests/t_importer.test.ts', ['../src/A.ts']);

    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('renders nodes within K hops fully and collapses nodes beyond K as stubs', async () => {
    const r = await runPipeline({ rootDir: tempDir, focusFile: 'src/A.ts', focusDepth: 1 });
    const md = r.markdown;

    // Extract Project Tree fenced block
    const start = md.indexOf('## Project Tree');
    expect(start).toBeGreaterThanOrEqual(0);
    const treeStart = md.indexOf('```', start);
    const treeEnd = md.indexOf('```', treeStart + 3);
    const treeBlock = md.slice(treeStart + 3, treeEnd).trim();

  // A and its direct neighbor B should be present (as file names under the src/ dir)
  expect(treeBlock).toContain('A.ts');
  expect(treeBlock).toContain('B.ts');

  // There should be a stub indicator summarizing hidden nodes (task capsule in effect)
  expect(treeBlock).toMatch(/… \(/);

    // full-signals should override and show everything
    const rFull = await runPipeline({ rootDir: tempDir, focusFile: 'src/A.ts', focusDepth: 1, fullSignals: true });
    const mdFull = rFull.markdown;
    const s = mdFull.indexOf('## Project Tree');
    const ts = mdFull.indexOf('```', s);
    const te = mdFull.indexOf('```', ts + 3);
    const treeFull = mdFull.slice(ts + 3, te).trim();
  // In full-signals mode, deeper nodes are shown normally
  expect(treeFull).toContain('C.ts');
  expect(treeFull).toContain('D.ts');

    // determinism: two runs with same flags equal
    const r2 = await runPipeline({ rootDir: tempDir, focusFile: 'src/A.ts', focusDepth: 1 });
    expect(r.markdown).toBe(r2.markdown);
  });
});
