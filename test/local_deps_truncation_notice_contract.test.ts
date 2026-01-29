import { it, expect } from 'vitest';
import { fb } from './helpers/fixture_builder.js';
import { renderArchitectureMd } from '../src/render/index.js';

it('Local Dependencies shows canonical truncation notice when budgeted and not when full-signals', () => {
  const builder = fb();
  // Create a hub with many importers to force truncation for LIST_BUDGET=2 (small)
  builder.file('src/hub.ts');
  for (let i = 1; i <= 5; i++) {
    builder.imports(`src/imp${i}.ts`, ['src/hub.ts']);
  }

  const input = builder.buildRenderInput();

  const outBudget = renderArchitectureMd(input, { budget: 'small', profile: 'default', fullSignals: false });
  expect(outBudget.content).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

  const outFull = renderArchitectureMd(input, { budget: 'small', profile: 'default', fullSignals: true });
  expect(outFull.content).not.toContain('Truncated by budget; rerun with --full-signals');
});
