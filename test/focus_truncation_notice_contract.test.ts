import { it, expect } from 'vitest';
import { fb } from './helpers/fixture_builder.js';
import { renderArchitectureMd } from '../src/render/index.js';

it('Focused deep-dive shows canonical truncation notice for importers/imports when budgeted', () => {
  const builder = fb();
  // Create a focused file with many importers (incoming)
  builder.file('src/target.ts');
  for (let i = 1; i <= 8; i++) {
    builder.imports(`src/from${i}.ts`, ['src/target.ts']);
  }

  const input = builder.buildRenderInput();

  const outBudget = renderArchitectureMd(input, { budget: 'small', profile: 'default', fullSignals: false, focusFile: 'src/target.ts' });
  expect(outBudget.content).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

  const outFull = renderArchitectureMd(input, { budget: 'small', profile: 'default', fullSignals: true, focusFile: 'src/target.ts' });
  expect(outFull.content).not.toContain('Truncated by budget; rerun with --full-signals');
});
