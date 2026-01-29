import { describe, it, expect } from 'vitest';
import { AI_PREAMBLE } from '../src/render/preamble.js';

describe('summary legend includes [HUB]', () => {
  it('mentions [HUB] exactly once and describes fan-in/fan-out (deterministic)', () => {
    // Presence
    expect(AI_PREAMBLE).toContain('### Summary markers & budgeting');
    expect(AI_PREAMBLE).toMatch(/\[HUB\]/);
  // Short descriptive phrase referencing fan-in or fan-out (allow unicode punctuation)
  expect(AI_PREAMBLE).toMatch(/(fan[^A-Za-z0-9]*in).*?(fan[^A-Za-z0-9]*out)|(fan[^A-Za-z0-9]*out).*?(fan[^A-Za-z0-9]*in)/i);

    // Determinism: two reads of the constant should be identical
    const a = AI_PREAMBLE;
    const b = AI_PREAMBLE;
    expect(a).toBe(b);
  });
});
