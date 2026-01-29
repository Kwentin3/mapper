import { test, expect } from 'vitest';
import { getContractTargeting } from '../src/contracts/contract_targeting';

test('boundary targeting true cases', () => {
  const paths = [
    'src/api/user.ts',
    'src/routes/v1.ts',
    'services/mcp-service/src/api/tools.ts',
    'src/main.ts',
  ];

  for (const p of paths) {
    const a = getContractTargeting(p);
    expect(a.isBoundary, `expected boundary for ${p}`).toBe(true);
  }
});

test('boundary targeting false cases', () => {
  const paths = [
    'src/utils/determinism.ts',
    'test/helpers/fixture_builder.ts',
    'docs/README.md',
    'services/mcp-service/src/utils/x.ts',
  ];

  for (const p of paths) {
    const a = getContractTargeting(p);
    expect(a.isBoundary, `expected NOT boundary for ${p}`).toBe(false);
  }
});

test('deterministic: repeated calls equal', () => {
  const p = 'src/routes/v1.ts';
  const r1 = getContractTargeting(p);
  const r2 = getContractTargeting(p);
  expect(r1).toEqual(r2);
});
