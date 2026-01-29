import { test, expect } from 'vitest';
import { scanContractAnchors } from '../src/contracts/scan_contract_anchors';

test('ignores anchors inside comments and strings', () => {
  const src = `
    // this comment mentions inputSchema and responseSchema
    const s1 = "inputSchema";
    const s2 = 'responseSchema';
    const t = \`template with inputSchema and responseSchema\`;
  `;

  const res = scanContractAnchors(src);
  expect(res.hasInput).toBe(false);
  expect(res.hasOutput).toBe(false);
  expect(res.inputAnchors).toEqual([]);
  expect(res.outputAnchors).toEqual([]);
});

test('detects real anchors and is deterministic', () => {
  const src = `
    const inputSchema = z.object({ name: z.string() });
    const responseSchema = z.object({ ok: z.boolean() });
  `;

  const res1 = scanContractAnchors(src);
  const res2 = scanContractAnchors(src);

  // deterministic equality across runs
  expect(res1).toEqual(res2);

  // input anchors should include inputSchema and zodObject
  expect(res1.hasInput).toBe(true);
  expect(res1.inputAnchors).toEqual(['inputSchema', 'zodObject']);

  // output anchors should include responseSchema
  expect(res1.hasOutput).toBe(true);
  expect(res1.outputAnchors).toEqual(['responseSchema']);
});
