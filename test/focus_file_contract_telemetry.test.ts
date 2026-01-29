import { test, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

let tempDir = '';

beforeAll(async () => {
  tempDir = createTempRepoDir('temp_focus_contract_telemetry');
  const fixture = fb();
  // Create files
  fixture.file('src/api/in_only.ts');
  fixture.file('src/api/full.ts');
  fixture.file('src/utils/u.ts');
  await fixture.writeToDisk(tempDir);

  // Overwrite with desired contents
  await fs.writeFile(join(tempDir, 'src/api/in_only.ts'), "const inputSchema = z.object({});\n");
  await fs.writeFile(join(tempDir, 'src/api/full.ts'), "const inputSchema = z.object({});\nconst responseSchema = z.object({});\n");
  await fs.writeFile(join(tempDir, 'src/utils/u.ts'), "const inputSchema = z.object({});\n");
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('focused contract telemetry block presence and correctness', async () => {
  // 1) in_only.ts (boundary input-only)
  const r1 = await runPipeline({ rootDir: tempDir, focusFile: 'src/api/in_only.ts' });
  const md1 = r1.markdown;
  expect(md1).toContain('## Focused Deep-Dive');
  expect(md1).toContain('### Contract Telemetry');
  expect(md1).toContain('- Boundary: yes');
  expect(md1).toContain('- Input: yes');
  expect(md1).toContain('- Output: no');
  expect(md1).toMatch(/- Input anchors: .*inputSchema/);

  // 2) full.ts (boundary with input + output)
  const r2 = await runPipeline({ rootDir: tempDir, focusFile: 'src/api/full.ts' });
  const md2 = r2.markdown;
  expect(md2).toContain('- Boundary: yes');
  expect(md2).toContain('- Input: yes');
  expect(md2).toContain('- Output: yes');
  expect(md2).toMatch(/- Input anchors: .*inputSchema/);
  expect(md2).toMatch(/- Output anchors: .*responseSchema/);

  // 3) u.ts (non-boundary, input only) — should show CONTRACT: input but NOT NO_CONTRACT/INPUT_ONLY
  const r3 = await runPipeline({ rootDir: tempDir, focusFile: 'src/utils/u.ts' });
  const md3 = r3.markdown;
  expect(md3).toContain('- Boundary: no');
  expect(md3).toContain('- Input: yes');
  expect(md3).toContain('- Output: no');

  // Determinism: run twice and compare markdown equality
  const r1b = await runPipeline({ rootDir: tempDir, focusFile: 'src/api/in_only.ts' });
  expect(r1.markdown).toEqual(r1b.markdown);
});
