import { it, expect } from 'vitest';
import { execSync } from 'child_process';

it('help contains --budget and allowed values', () => {
  const out = execSync('node ./dist/cli/main.js --help', { encoding: 'utf8' });
  expect(out).toContain('--budget');
  expect(out).toContain('small');
  expect(out).toContain('default');
  expect(out).toContain('large');
});
