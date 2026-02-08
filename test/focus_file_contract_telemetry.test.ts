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
  fixture.file('src/api.ts');
  fixture.file('src/routes.ts');
  fixture.file('src/utils/u.ts');
  await fixture.writeToDisk(tempDir);

  // Overwrite with desired contents
  await fs.writeFile(join(tempDir, 'src/api.ts'), "// @inbound\n");
  await fs.writeFile(join(tempDir, 'src/routes.ts'), "// @inbound\n// @outbound\n");
  await fs.writeFile(join(tempDir, 'src/utils/u.ts'), "// @inbound\n");

  // Provide a semantic profile override with simple glob patterns
  const config = {
    semanticProfile: {
      version: 0,
      boundary: {
        include: ['src/api.ts', 'src/routes.ts'],
        exclude: [],
      },
      anchors: {
        inbound: ['@inbound'],
        outbound: ['@outbound'],
      },
    },
  };
  await fs.writeFile(join(tempDir, '.architecture.json'), JSON.stringify(config, null, 2));
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('focused contract telemetry block presence and correctness', async () => {
  // 1) api.ts (boundary input-only)
  const r1 = await runPipeline({ rootDir: tempDir, focusFile: 'src/api.ts', showTemp: true });
  const md1 = r1.markdown;
  expect(md1).toContain('## Focused Deep-Dive');
  expect(md1).toContain('### Contract Telemetry');
  expect(md1).toContain('- Status: C?');
  expect(md1).toContain('- Inbound anchors: @inbound');
  expect(md1).toContain('- Outbound anchors: (none)');

  // 2) routes.ts (boundary with input + output)
  const r2 = await runPipeline({ rootDir: tempDir, focusFile: 'src/routes.ts', showTemp: true });
  const md2 = r2.markdown;
  expect(md2).toContain('- Status: C+');
  expect(md2).toContain('- Inbound anchors: @inbound');
  expect(md2).toContain('- Outbound anchors: @outbound');
  expect(md2).toContain('## Contract coverage');

  // 3) u.ts (non-boundary, input only) — excluded from boundary
  const r3 = await runPipeline({ rootDir: tempDir, focusFile: 'src/utils/u.ts', showTemp: true });
  const md3 = r3.markdown;
  expect(md3).toContain('- Status: C~');
  expect(md3).toContain('- Inbound anchors: (none)');
  expect(md3).toContain('- Outbound anchors: (none)');

  // Determinism: run twice and compare markdown equality
  const r1b = await runPipeline({ rootDir: tempDir, focusFile: 'src/api.ts', showTemp: true });
  expect(r1.markdown).toEqual(r1b.markdown);
});
