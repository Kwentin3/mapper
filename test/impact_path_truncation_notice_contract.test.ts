import { it, expect } from 'vitest';
import { fb } from './helpers/fixture_builder.js';
import { renderArchitectureMd } from '../src/render/index.js';

it('Impact path candidate list MUST show canonical truncation notice when budgeted and must not under --full-signals (deterministic)', () => {
  const builder = fb();
  // deterministic focused file that reaches many distinct PUBLIC-API targets via identical-length paths:
  // src/focus.ts -> src/mid{i}.ts -> src/api/api{i}.ts (→ PUBLIC-API)
  builder.file('src/focus.ts');

  const mids: string[] = [];
  const apis: string[] = [];
  // create N = 6 intermediates (must be > PATH_BUDGET which is 3 in renderer)
  for (let i = 1; i <= 6; i++) {
    const mid = `src/mid${i}.ts`;
    const api = `src/api/api${i}.ts`;
    builder.file(mid);
    builder.file(api);
    // Mark api as PUBLIC-API using fixture helper
    builder.signal(api, '→ PUBLIC-API');
    // mid imports api (distinct path per api)
    builder.imports(mid, [api]);
    mids.push(mid);
    apis.push(api);
  }

  // Focus imports all mids in a single call to avoid overwrite semantics
  builder.imports('src/focus.ts', mids);

  const input = builder.buildRenderInput();

  // Render baseline (budgeted) twice to assert determinism
  const outBudget1 = renderArchitectureMd(input, { profile: 'default', fullSignals: false, focusFile: 'src/focus.ts' });
  const outBudget2 = renderArchitectureMd(input, { profile: 'default', fullSignals: false, focusFile: 'src/focus.ts' });
  expect(outBudget1.content).toBe(outBudget2.content);

  // Render full-signals twice as well
  const outFull1 = renderArchitectureMd(input, { profile: 'default', fullSignals: true, focusFile: 'src/focus.ts' });
  const outFull2 = renderArchitectureMd(input, { profile: 'default', fullSignals: true, focusFile: 'src/focus.ts' });
  expect(outFull1.content).toBe(outFull2.content);

  // Strict contracts:
  // - baseline MUST contain the canonical truncation notice line
  // - full MUST NOT contain it
  const noticeRe = /Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./;
  expect(noticeRe.test(outBudget1.content)).toBe(true);
  expect(noticeRe.test(outFull1.content)).toBe(false);

  // Sanity: full view should list at least PATH_BUDGET candidates (renderer uses PATH_BUDGET=3)
  const candidateLineRegex = /`[^`]+`\s*→\s*`[^`]+`\s*→\s*`[^`]+`\s*\(→ PUBLIC-API\)/g;
  const fullMatches = outFull1.content.match(candidateLineRegex) || [];
  expect(fullMatches.length).toBeGreaterThanOrEqual(3);
});
