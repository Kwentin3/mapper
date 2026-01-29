import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import { fb } from './helpers/fixture_builder.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('render: Impact Path (focus-file → PUBLIC-API)', () => {
  let tempDir: string;
  let fixture: ReturnType<typeof fb>;

  beforeAll(async () => {
  tempDir = createTempRepoDir('temp_impact_path');
  fixture = fb();

  // Build simple chain: src/a.ts -> src/b.ts -> src/api.ts (public)
  // Also create additional branches from a.ts; add all imports in a single call so they accumulate
  const aTargets = ['./b.ts', './x.ts'];
  for (let i = 1; i <= 5; i++) aTargets.push(`./more_api_${i}.ts`);
  fixture.imports('src/a.ts', aTargets);
    
    fixture.imports('src/b.ts', ['./api.ts']);
    fixture.file('src/api.ts');
    fixture.signal('src/api.ts', '→ PUBLIC-API');

  // Second branch to another public API: src/a.ts -> src/x.ts -> src/api2.ts
    fixture.imports('src/x.ts', ['./api2.ts']);
    fixture.file('src/api2.ts');
    fixture.signal('src/api2.ts', '→ PUBLIC-API');

    // Add additional public APIs reachable for budget test
    for (let i = 1; i <= 5; i++) {
      const p = `src/more_api_${i}.ts`;
      fixture.file(p);
      fixture.signal(p, '→ PUBLIC-API');
    }

    await fixture.writeToDisk(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows Impact Path section and paths to PUBLIC-API (budgeted + full-signals)', async () => {
  // Use fixture's built RenderInput so we can inject PUBLIC-API signals deterministically
  const ri = fixture.buildRenderInput();
  const out = renderArchitectureMd(ri, { focusFile: 'src/a.ts' });
  const md = out.content;

    expect(md).toContain('## Impact Path');
    expect(md).toContain('src/a.ts');
    expect(md).toContain('src/b.ts');
    expect(md).toContain('src/api.ts');
  // Path line(s) should include at least one path from the focus file to a PUBLIC-API
  expect(md).toMatch(/`src\/a\.ts` → `.*` \(→ PUBLIC-API\)/);

  // Budgeting: default PATH_BUDGET=3 should truncate when >3 and show canonical notice
  expect(md).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

    // full-signals shows all paths (no truncation)
  const outFull = renderArchitectureMd(ri, { focusFile: 'src/a.ts', fullSignals: true });
  expect(outFull.content).toContain('## Impact Path');
  expect(outFull.content).not.toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);
  // When fullSignals is set, the specific longer path via b.ts should appear
  expect(outFull.content).toMatch(/`src\/a\.ts` → `src\/b\.ts` → `src\/api\.ts` \(→ PUBLIC-API\)/);

    // Determinism: two runs equal
  const out2 = renderArchitectureMd(ri, { focusFile: 'src/a.ts' });
  expect(md).toBe(out2.content);
  });
});
