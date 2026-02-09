# Step 4.0 — Contract Telemetry Rendering Plan

## 1) Tree-Level Rendering
- Marker: `[C+] [C?] [C0] [C~]` appended to file markers.
- Placement: after `[PROD]/[TEST]` and `[HUB]`, before any inline signal text.
  - Example: `src/api/order.ts [PROD] [HUB] [C?]`
- Ordering: `[PROD]/[TEST]` → `[HUB]` → `[C*]`.
- Omission rules:
  - Non‑boundary files: no `[C*]` marker.
  - `[C~]` in tree is optional; default to hidden unless focus mode is enabled.

## 2) Summary Section (Coverage)
Add a compact summary block after existing summary sections and before Local Dependencies:

```
## Contract Coverage
- C+: 18  C?: 7  C0: 5  C~: 42
- High‑risk (C0, C?): src/api/order.ts, src/api/payments.ts
```

- Counts computed only from `contractSignals` entries.
- High‑risk list includes only `C0` and `C?`, max N=5, lexicographically sorted.
- C~ is counted but not listed.

## 3) Focused Deep‑Dive Rendering
Only in focus mode (`--focus-file`):

```
### Contract Telemetry (focus)
- Status: C?
- Inbound anchors: @inbound, /foo\d+/
- Outbound anchors: (missing)
```

- Evidence shown: `anchorsFound`, and if available, `boundaryMatch`.
- No `notes`, no policy text, no inferred warnings.

## 4) Ordering & Determinism Rules
- Tree order unchanged; `[C*]` does not affect ordering.
- Coverage counts order fixed: `C+ C? C0 C~`.
- High‑risk list sorted by POSIX path.
- Anchor lists sorted lexicographically (already computed).

## 5) Noise Control Rules
- Hide `[C~]` in tree unless focus mode is enabled.
- High‑risk list truncated to N=5 with “+N more”.
- Evidence only in focus view; none in default run.

## 6) Agent Interpretation Hooks (Render-Side)
Single short legend (once):

```
[C+] contracted boundary
[C?] partial contract
[C0] no contract
[C~] unknown / undetermined
```

- No duplicated policy text (policy stays in AGENT_MANIFEST).
