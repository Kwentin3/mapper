# TEXT_TRUST_MICROFIX_IMPLEMENTATION — Minimal Copy Patch (Trust Fix)

Prompt: `FIX.TEXT.TRUST.MICROPATCH.IMPLEMENT.1`

Hard rules honored:
- Copy-only changes in renderer output (no budgets/graph/sorting/signal logic changes intended).
- Test-first (new contract test fails pre-patch, passes post-patch).
- Determinism verified by 2-run SHA256.

## 1) Executive Summary

- Fixed trust-breaking contradiction in `--full-signals` artefacts: Local Dependencies section no longer labels itself as “(Budgeted)” and no longer suggests “use --full-signals…” as a remedial action when already in full-signals.
- Scoped budget-related preamble guidance explicitly to budgeted mode (prevents misreading as a limitation of the current full-signals artefact).
- Added a contract test to prevent regression on these exact strings.
- All gates are green: `npm test`, `npm run typecheck`, `npm run build`.
- Full-signals determinism confirmed: identical SHA256 for 2 identical `--full-signals` CLI runs.

## 2) Files Changed

- `src/render/preamble.ts`
- `src/render/render_architecture_md.ts`
- `test/full_signals_text_trust_contract.test.ts` (added)
- `test/no_test_temp_dirs.test.ts` (updated: top-level `out/` not treated as stale-test-artifact)

## 3) Tests Added/Updated

### Added: `test/full_signals_text_trust_contract.test.ts`

What it asserts:
- Full-signals render output:
  - MUST NOT contain `## Local Dependencies (Budgeted)`.
  - MUST contain exact heading line `## Local Dependencies`.
  - Inside the Local Dependencies section: MUST NOT contain `use --full-signals`.
- AI preamble copy:
  - Budget guidance lines MUST be explicitly scoped (start with “In budgeted mode,” / “If this view is budgeted, …”).

This test failed on the old copy (pre-patch) and passed after the copy changes.

### Updated: `test/no_test_temp_dirs.test.ts`

Change:
- Top-level `out/` removed from the “stale leftover audit dirs” candidate list.

Reason:
- `out/` is a normal user-facing output directory; its mere existence is not a reliable stale-test-artifact signal.

## 4) Copy Changes (Before/After Snippets)

### A) Local Dependencies header/legend in full-signals

File: `src/render/render_architecture_md.ts`

Before (2 lines):
```ts
lines.push('## Local Dependencies (Budgeted)');
lines.push('... Показаны первые N ... используйте --full-signals ...');
```

After (<=4 lines):
```ts
if (fullSignals) {
  lines.push('## Local Dependencies');
  lines.push('... В full-signals режиме показан полный список.');
} else {
  lines.push('## Local Dependencies (Budgeted)');
  lines.push('... Показаны первые N ... используйте --full-signals ...');
}
```

### B) Preamble scoping for budget guidance

File: `src/render/preamble.ts`

Before → After (each is 1 line):
```text
Budgeted lists may be truncated; use --full-signals ...
In budgeted mode, lists may be truncated; use --full-signals ...
```

```text
For risky decisions rerun with --full-signals ...
If this view is budgeted, rerun with --full-signals ... for risky decisions.
```

```text
If signals are missing or unclear, rerun with --full-signals ...
If this view is budgeted and signals are missing or unclear, rerun with --full-signals ...
```

## 5) Validation (Commands + PASS)

```powershell
npm test
npm run typecheck
npm run build
```

Result: all exit code `0` (local run).

## 6) Determinism (2-run hashes)

Command:
```powershell
node dist/cli/main.js --full-signals . --out .tmp/text-trust-microfix/det-run-1.md
node dist/cli/main.js --full-signals . --out .tmp/text-trust-microfix/det-run-2.md
Get-FileHash .tmp/text-trust-microfix/det-run-1.md -Algorithm SHA256
Get-FileHash .tmp/text-trust-microfix/det-run-2.md -Algorithm SHA256
```

SHA256 #1: `B75754D00C1979675146C59C2F475865A256163B4003B112543A5C06D6066C4E`

SHA256 #2: `B75754D00C1979675146C59C2F475865A256163B4003B112543A5C06D6066C4E`

