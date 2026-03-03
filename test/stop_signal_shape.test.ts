import { describe, it, expect } from 'vitest';
import { StopError, isStopSignal } from '../src/stop/stop_signal.js';

describe('StopSignal shape', () => {
  it('accepts the expected shape and rejects obvious non-signals', () => {
    const stop = {
      code: 'STOP_UNIT_TEST_SHAPE',
      reason: 'reason text',
      blocking: true,
      severity: 'stop' as const,
      scope: { kind: 'repo' as const, value: '.' },
      law_ref: { doc: 'docs/architecture/agents/AGENT_MANIFEST.md', anchor: 'Stop Signals (Routing)' },
      unblock_hints: ['hint1'],
    };

    expect(isStopSignal(stop)).toBe(true);
    expect(isStopSignal({})).toBe(false);
    expect(isStopSignal({ code: 'NOPE', reason: 'x', blocking: true, severity: 'stop' })).toBe(false);
  });

  it('StopError carries a StopSignal and keeps message == reason', () => {
    const stop = {
      code: 'STOP_UNIT_TEST_ERROR',
      reason: 'Error: deterministic message',
      blocking: true,
      severity: 'stop' as const,
    };
    const err = new StopError(stop);
    expect(err.message).toBe(stop.reason);
    expect(isStopSignal(err.stop)).toBe(true);
  });
});


