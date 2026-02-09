import { describe, it, expect } from 'vitest';
import { fb } from './helpers/fixture_builder.js';
import { renderArchitectureMd } from '../src/render/index.js';
import { AI_PREAMBLE } from '../src/render/preamble.js';

function extractSection(md: string, headerPrefix: string): string {
  const start = md.indexOf(headerPrefix);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = md.slice(start);
  const endRel = rest.indexOf('\n## ', 1);
  return rest.slice(0, endRel === -1 ? rest.length : endRel);
}

describe('text trust microfix (contract)', () => {
  it('full-signals output must not present Local Dependencies as budgeted or suggest rerun --full-signals inside that section', () => {
    const builder = fb();
    builder.file('src/hub.ts');
    for (let i = 1; i <= 6; i++) {
      builder.imports(`src/imp${i}.ts`, ['./hub.ts']);
    }

    const input = builder.buildRenderInput();
    const outFull = renderArchitectureMd(input, { budget: 'small', profile: 'default', fullSignals: true }).content;

    // Header must be non-budgeted in full-signals.
    expect(outFull).not.toContain('## Local Dependencies (Budgeted)');
    expect(outFull.split(/\r?\n/)).toContain('## Local Dependencies');

    // The Local Dependencies section must not contain "use --full-signals" as a remedial action.
    const localDeps = extractSection(outFull, '## Local Dependencies');
    expect(localDeps).not.toContain('use --full-signals');
  });

  it('preamble budget guidance must be explicitly scoped to budgeted mode (avoid implying full-signals is incomplete)', () => {
    // These are copy-level trust anchors: wording must be scoped.
    expect(AI_PREAMBLE).toContain('In budgeted mode, lists may be truncated; use --full-signals to disable budgets and show full lists.');
    expect(AI_PREAMBLE).toContain('If this view is budgeted, rerun with --full-signals to obtain the full view for risky decisions.');
    expect(AI_PREAMBLE).toContain('If this view is budgeted and signals are missing or unclear, rerun with --full-signals before making risky decisions.');
  });
});

