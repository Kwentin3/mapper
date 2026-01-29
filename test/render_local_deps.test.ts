import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('Render local dependency counts (L1)', () => {
  it('shows local fan-in and fan-out counts for files', async () => {
    const temp = join(__dirname, 'temp_render_local_deps_' + Math.random().toString(36).slice(2));
    // Setup repo
    await fs.mkdir(join(temp, 'repo'), { recursive: true });
    const repo = join(temp, 'repo');

    // C has no imports
    await fs.writeFile(join(repo, 'C.ts'), `// C`);
    // B imports C
    await fs.writeFile(join(repo, 'B.ts'), `import './C';\n`);
    // A imports B and C
    await fs.writeFile(join(repo, 'A.ts'), `import './B';\nimport './C';\n`);

    const result1 = await runPipeline({ rootDir: repo });
    const md1 = result1.markdown;

    // Run again to assert determinism
    const result2 = await runPipeline({ rootDir: repo });
    const md2 = result2.markdown;

    expect(md1).toBe(md2);

    // Assert counts: A => (←0 →2); B => (←1 →1); C => (←2 →0)
    expect(md1).toMatch(/A\.ts.*\(←0 →2\)/);
    expect(md1).toMatch(/B\.ts.*\(←1 →1\)/);
    expect(md1).toMatch(/C\.ts.*\(←2 →0\)/);

    // Cleanup
    await fs.rm(temp, { recursive: true, force: true });
  });
});
