export type StopSeverity = 'info' | 'warn' | 'stop';
export type StopScopeKind = 'repo' | 'path' | 'file' | 'section';

export type StopCode = `STOP_${string}`;

export type StopScope = {
  kind: StopScopeKind;
  value: string;
};

export type StopLawRef = {
  doc: string;
  anchor: string;
};

/**
 * Structured stop signal used internally for deterministic "stop" pathways.
 *
 * External behavior MUST remain text-based: callers should render `reason`
 * exactly as before (no new formatting, no new lines).
 */
export type StopSignal = {
  code: StopCode;
  reason: string;
  blocking: boolean;
  severity: StopSeverity;
  scope?: StopScope;
  law_ref?: StopLawRef;
  unblock_hints?: string[];
};

export class StopError extends Error {
  readonly stop: StopSignal;

  constructor(stop: StopSignal) {
    super(stop.reason);
    this.name = 'StopError';
    this.stop = stop;
  }
}

export function isStopError(err: unknown): err is StopError {
  return err instanceof StopError && isStopSignal((err as StopError).stop);
}

// Runtime guard used by tests and defensive routing. Intentionally minimal and deterministic.
export function isStopSignal(value: unknown): value is StopSignal {
  if (!value || typeof value !== 'object') return false;
  const v = value as any;
  if (typeof v.code !== 'string' || !/^STOP_[A-Z0-9_]+$/.test(v.code)) return false;
  if (typeof v.reason !== 'string') return false;
  if (typeof v.blocking !== 'boolean') return false;
  if (v.severity !== 'info' && v.severity !== 'warn' && v.severity !== 'stop') return false;
  if (v.scope !== undefined) {
    if (!v.scope || typeof v.scope !== 'object') return false;
    if (v.scope.kind !== 'repo' && v.scope.kind !== 'path' && v.scope.kind !== 'file' && v.scope.kind !== 'section') return false;
    if (typeof v.scope.value !== 'string') return false;
  }
  if (v.law_ref !== undefined) {
    if (!v.law_ref || typeof v.law_ref !== 'object') return false;
    if (typeof v.law_ref.doc !== 'string') return false;
    if (typeof v.law_ref.anchor !== 'string') return false;
  }
  if (v.unblock_hints !== undefined) {
    if (!Array.isArray(v.unblock_hints)) return false;
    if (v.unblock_hints.some((x: any) => typeof x !== 'string')) return false;
  }
  return true;
}

