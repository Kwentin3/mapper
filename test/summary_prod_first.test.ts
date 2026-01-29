import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: PROD-first summary grouping', () => {
  let tempDir: string;

  beforeAll(async () => {
  tempDir = createTempRepoDir('temp_prod_first');

    const fixture = fb();

    // Create PROD fan-out items (under src/)
    fixture.imports('src/p1.ts', ['./lib1.ts']);
    fixture.imports('src/p2.ts', ['./lib2.ts']);
    fixture.file('src/lib1.ts');
    fixture.file('src/lib2.ts');

    // Create TEST fan-out items (under test/)
    fixture.imports('test/t1.test.ts', ['./h1.ts']);
    fixture.imports('test/t2.test.ts', ['./h2.ts']);
    fixture.file('test/h1.ts');
    fixture.file('test/h2.ts');

    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('renders PROD items before TEST items with indicator and preserves order', async () => {
    const r1 = await runPipeline({ rootDir: tempDir });
    const r2 = await runPipeline({ rootDir: tempDir });

    // Determinism
    expect(r1.markdown).toEqual(r2.markdown);

    const md = r1.markdown;
    const lines = md.split('\n');
    const start = lines.findIndex(l => l.trim() === '### Fan‑out Hubs');
    expect(start).toBeGreaterThanOrEqual(0);

    const items: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length === 0) break;
      if (line.startsWith('### ')) break;
      items.push(line.trim());
    }

    // Expect the first two PROD items in order
    const prodIndexP1 = items.findIndex(l => l.includes('`src/p1.ts`'));
    const prodIndexP2 = items.findIndex(l => l.includes('`src/p2.ts`'));
    expect(prodIndexP1).toBeGreaterThanOrEqual(0);
    expect(prodIndexP2).toBeGreaterThan(prodIndexP1);

    // Expect indicator present with count 2
    const indicatorIndex = items.findIndex(l => l === '- (tests: 2 moved to bottom)');
    expect(indicatorIndex).toBeGreaterThanOrEqual(0);

    // Test items should appear after the indicator in order
    const testIndexT1 = items.findIndex(l => l.includes('`test/t1.test.ts`'));
    const testIndexT2 = items.findIndex(l => l.includes('`test/t2.test.ts`'));
    expect(testIndexT1).toBeGreaterThan(indicatorIndex);
    expect(testIndexT2).toBeGreaterThan(testIndexT1);
  });
});
