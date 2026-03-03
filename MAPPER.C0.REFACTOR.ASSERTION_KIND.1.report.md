# MAPPER.C0.REFACTOR.ASSERTION_KIND.1 — Report

## 1) Executive Summary

- Introduced a minimal `AssertionKind` primitive (`FACT | INFERENCE | POLICY | UNKNOWN`) and threaded it through core signal structures as an **optional** field named `assertionKind` (not `kind`, because `Signal.kind` already means `risk|hint|nav|context`).
- Marked `assertionKind` in multiple signal sources (FACT for contract telemetry + contract anchor facts; INFERENCE for heuristic hints and nav candidates).
- Render output is unchanged: the new field is not rendered and does not influence ordering/budgets; a dedicated test proves string output equality with/without `assertionKind`.
- Verification passes: `npm test`, `npm run typecheck`, `npm run build`.

## 2) What Was Done

### TASK A — Current “Signal” Model (Where signals are created/sorted/rendered)

- Signal shape (inline signals): `src/signals/types.ts` (`Signal` with `kind` + `code`, per-file `FileSignals`, and global `SignalsResult`).
- Contract telemetry shape (coverage layer): `src/signals/contract_types.ts` (`ContractSignalMap` consumed by render to show `[C+] [C?] [C0]` and coverage summary).
- Where signals are created:
  - Heuristic/graph-derived inline signals and summary candidates: `src/signals/compute_signals.ts`.
  - Contract-anchor derived inline signals (`CONTRACT: input/output`, boundary health hints): `src/signals/contracts_signals.ts`.
  - Contract telemetry (C+/C?/C0/C~) derived from anchors + profile include/exclude: `src/signals/compute_contract_telemetry.ts`.
- Where signals are ordered/bucketed:
  - File list and merge order are deterministic: `src/signals/compute_signals.ts` uses sorted files, stable comparisons, and fixed precedence buckets (`risk` → `hint` → `context` → `nav`).
  - Contract hints are sorted by `code` before merging: `src/signals/compute_signals.ts`.
- Where signals reach render:
  - Pipeline calls `computeSignals(...)` then `renderArchitectureMd(...)`: `src/pipeline/run_pipeline.ts`.
  - Renderer consumes `signals.files[].inline` and `signals.contractSignals` but never serializes unknown fields: `src/render/render_architecture_md.ts`, `src/render/render_tree.ts`, `src/render/render_summary.ts`.
- “Danger zones” for adding a field:
  - Tests using deep-equality against `{ kind, code }` objects (fixed by switching to `objectContaining`).
  - Any future sort/budget code must not include `assertionKind` in comparisons (confirmed unchanged; no comparisons were modified).

### TASK B — Introduce AssertionKind (minimal)

- Added `AssertionKind` union type and `Signal.assertionKind?: AssertionKind`:
  - `src/signals/types.ts`
- Added `ContractSignal.assertionKind?: AssertionKind` to carry the same primitive through contract telemetry:
  - `src/signals/contract_types.ts`
- Default behavior:
  - If `assertionKind` is not present, it is treated as `UNKNOWN` by convention (no global backfill was introduced to avoid changing serialization everywhere).
- Marked at least 3 sources:
  - Contract telemetry: `src/signals/compute_contract_telemetry.ts` sets `assertionKind: 'FACT'`.
  - Heuristic hints and nav signals: `src/signals/compute_signals.ts` sets `assertionKind: 'INFERENCE'` for threshold/heuristic hints + nav candidates, and `FACT` for direct graph/parser facts (e.g., `CYCLE`, `ORPHAN`, `DYNAMIC-IMPORT`, `PARSE-ERROR:*`).
  - Contract-anchor inline signals:
    - `CONTRACT: input/output`, `NO_CONTRACT` as `FACT`
    - `INPUT_ONLY_CONTRACT` / `OUTPUT_ONLY_CONTRACT` as `INFERENCE`
    - `src/signals/contracts_signals.ts`

### TASK C — Guarantee “Render Output Must Not Change”

- Added a contract test proving **byte-for-byte identical** markdown output when `assertionKind` is present vs absent:
  - `test/assertion_kind_render_stability.test.ts`
- Updated tests that previously required exact object deep-equality for inline signals (now resilient to extra fields while still asserting the observable behavior: presence/absence of the intended signal):
  - `test/signals_inline_basic.test.ts`
  - `test/signals_thresholds.test.ts`
  - `test/entrypoint_inline_signal.test.ts`

## 3) Evidence

### Files Changed / Added

- `src/signals/types.ts`
- `src/signals/contract_types.ts`
- `src/signals/compute_signals.ts`
- `src/signals/contracts_signals.ts`
- `src/signals/compute_contract_telemetry.ts`
- `test/assertion_kind_render_stability.test.ts` (new)
- `test/signals_inline_basic.test.ts`
- `test/signals_thresholds.test.ts`
- `test/entrypoint_inline_signal.test.ts`

### Commands (PowerShell)

- `npm test` → PASS
- `npm run typecheck` → PASS
- `npm run build` → PASS

### Render Output Unchanged (What was compared)

- `test/assertion_kind_render_stability.test.ts` asserts:
  - `renderArchitectureMd(inputWithoutAssertionKind) === renderArchitectureMd(inputWithAssertionKind)`
  - output does not contain `assertionKind` nor any `AssertionKind` literals

## 4) Verdict

PASS

## 5) Next Minimal Step

- Extend `assertionKind` marking to any remaining high-signal producers where the nature is unambiguous (FACT vs INFERENCE), without changing render behavior or ordering.

