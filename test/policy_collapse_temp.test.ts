import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: policy-collapse for test/temp_* directories', () => {
  let tempDir: string;

  beforeAll(async () => {
  tempDir = createTempRepoDir('temp_policy_temp');

    const fixture = fb();

    // Create a temp fixture directory with nested files
    fixture.file('test/temp_demo/a.ts');
    fixture.file('test/temp_demo/sub/b.ts');
    fixture.file('test/temp_demo/sub/c.ts');

    // Create a small cycle inside temp_demo to generate a risk signal
    fixture.imports('test/temp_demo/a.ts', ['./sub/b.ts']);
    fixture.imports('test/temp_demo/sub/b.ts', ['./../a.ts']);

    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('collapses test/temp_demo/ by default and shows stub with counts and hidden signals', async () => {
    const r1 = await runPipeline({ rootDir: tempDir });
    const r2 = await runPipeline({ rootDir: tempDir });

    // Determinism
    expect(r1.markdown).toEqual(r2.markdown);

    const md = r1.markdown;
  // The tree should contain a stub child line (ellipsis + counts)
  // Extract the Project Tree fenced code block to scope assertions to the tree only
  const ptStart = md.indexOf('## Project Tree');
  expect(ptStart).toBeGreaterThanOrEqual(0);
  const firstFence = md.indexOf('```', ptStart);
  expect(firstFence).toBeGreaterThanOrEqual(0);
  const secondFence = md.indexOf('```', firstFence + 3);
  expect(secondFence).toBeGreaterThan(firstFence);
  const treeBlock = md.slice(firstFence, secondFence + 3);

  // Assert that a collapsed stub child line exists in the tree block
  expect(treeBlock).toContain('… (');

  // The temp directory name should not be expanded in the tree block (it is collapsed)
  expect(treeBlock).not.toContain('temp_demo');

  // Ensure children of the temp directory do not appear inside the Project Tree block
  expect(treeBlock).not.toContain('sub/b.ts');
  });

  it('renders temp directory normally when --show-temp is set', async () => {
    const r = await runPipeline({ rootDir: tempDir, showTemp: true });
    const md = r.markdown;

    // Stub should be absent; children should be visible
    expect(md).not.toContain('test/temp_demo …');
    expect(md).toContain('sub/b.ts');
  });
});
