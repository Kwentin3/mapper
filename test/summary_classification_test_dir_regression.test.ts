import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('summary classification regression: test/ directory', () => {
  it('marks files under test/ as [TEST] in summary hubs', async () => {
    const temp = join(__dirname, 'temp_summary_classif_' + Math.random().toString(36).slice(2));
    const repo = join(temp, 'repo');
    await fs.mkdir(repo, { recursive: true });

  // Create src/p.ts
  await fs.mkdir(join(repo, 'src'), { recursive: true });
  await fs.writeFile(join(repo, 'src', 'p.ts'), `import '../test/helpers/fixture_builder';\n`);
    // Create test/helpers/fixture_builder.ts
    await fs.mkdir(join(repo, 'test', 'helpers'), { recursive: true });
    await fs.writeFile(join(repo, 'test', 'helpers', 'fixture_builder.ts'), `export const x = 1;\n`);

    const r1 = await runPipeline({ rootDir: repo });
    const r2 = await runPipeline({ rootDir: repo });

    const md1 = r1.markdown;
    const md2 = r2.markdown;

    // Determinism
    expect(md1).toBe(md2);

    // In summary hubs or entrypoints the file should be labeled [TEST]
    expect(md1).toMatch(/`test\/helpers\/fixture_builder\.ts` \[TEST\]/);

    // Cleanup
    await fs.rm(temp, { recursive: true, force: true });
  });
});
