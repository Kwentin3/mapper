import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('orphan render determinism', () => {
  it('produces identical output across two runs for same flags', async () => {
    const temp = join(__dirname, 'temp_orphan_determinism_' + Math.random().toString(36).slice(2));
    const repo = join(temp, 'repo');
    await fs.mkdir(repo, { recursive: true });

    await fs.writeFile(join(repo, 'README.md'), `# readme\n`);
    await fs.writeFile(join(repo, 'A.ts'), `// a\n`);

    const run1 = await runPipeline({ rootDir: repo });
    const run2 = await runPipeline({ rootDir: repo });

    expect(run1.markdown).toBe(run2.markdown);

    await fs.rm(temp, { recursive: true, force: true });
  });
});
