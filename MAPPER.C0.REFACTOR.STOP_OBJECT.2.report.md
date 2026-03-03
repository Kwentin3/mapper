# MAPPER.C0.REFACTOR.STOP_OBJECT.2 — Report

## 1) Executive Summary

- Introduced a single internal `StopSignal` object and `StopError` carrier for deterministic stop pathways, while preserving **exact external text output** (CLI + Markdown render format unchanged; StopSignal never renders).
- Converted existing stop-like early exits in CLI/pipeline/scanner to produce `StopSignal` internally and render the same legacy text externally.
- Added a unit test validating `StopSignal` shape and a stability proof via existing CLI contract test for focus-file not-found (exact string match).
- Verification: `npm test`, `npm run typecheck`, `npm run build` all PASS.

## 2) Inventory of Existing STOP Cases (as found)

| Stop code / legacy text | Where (file:function) | Level | External rendering today |
|---|---|---|---|
| `Error: Invalid path '<...>': path must not start with '-'.` | `src/cli/run.ts:run` (path/flag validation) | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: output path provided both as --out and as a positional argument. Use --out only.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: too many positional arguments. Usage: [<root>] [<out>]` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: Invalid path '<...>': directory does not exist.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: Invalid path '<...>': path is not a directory.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: --depth must be a non‑negative integer.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: --focus-depth must be a non‑negative integer.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: --out must be a file path, not a directory.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: output parent directory does not exist.` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: invalid --budget value: <...>` | `src/cli/run.ts:run` | config/CLI args | printed via `console.error` (exitCode=1) |
| `Error: --focus-file not found: <...>` | `src/pipeline/run_pipeline.ts:runPipeline` | pipeline | printed via `console.error` (exitCode=1) |
| `Root directory <...> could not be scanned (excluded or unreadable).` | `src/scanner/scan.ts:scanRepo` | pipeline/scanner | printed via `console.error('Internal error:', <message>)` (exitCode=2) |
| Other unhandled errors | `src/cli/index.ts:main` | CLI top-level | printed as `Unhandled error:` / `Fatal error:` and exitCode=2 |

Notes:
- No STOP cases that look like *project architectural enforcement* were found; current stop-like cases are CLI/pipeline/scanner user errors or fatal errors.

## 3) What Changed (TASK B/C)

### StopSignal type (lean)

- Added `src/stop/stop_signal.ts`:
  - `StopSignal` with the required fields (no index signature).
  - `StopError` that carries `stop: StopSignal` and preserves `message === reason`.
  - Guards `isStopSignal` and `isStopError` for deterministic routing.

### Converted existing stop paths

- Pipeline focus-file not found now throws `StopError` with `StopSignal.code = STOP_FOCUS_FILE_NOT_FOUND` and the exact same `reason` string as before:
  - `src/pipeline/run_pipeline.ts`
- Scanner root scan failure now throws `StopError` with `StopSignal.code = STOP_SCAN_ROOT_UNREADABLE` and the exact same `reason` string as before:
  - `src/scanner/scan.ts`
- CLI now creates `StopSignal` objects for existing early-exit validations and returns them as `stop?: StopSignal` while printing the same legacy text:
  - `src/cli/run.ts`
- CLI catch routing now prefers `StopError`/`StopSignal` when present, but renders text exactly as before:
  - `STOP_FOCUS_FILE_NOT_FOUND` → prints `reason` only, `exitCode=1`
  - other `StopError` → prints `Internal error:` + `reason`, `exitCode=2`
  - legacy fallback (string-based focus-file prefix) preserved for backward compatibility.

## 4) Tests (TASK D)

- Unit test for shape:
  - `test/stop_signal_shape.test.ts` validates `isStopSignal` and `StopError` behavior.
- Contract/stability evidence for “text out, structure inside”:
  - Existing contract test still asserts exact output string for focus-file not found:
    - `test/focus_file_not_found_cli_contract.test.ts`
- No markdown renderer changes were introduced; StopSignal does not appear in output.

## 5) Evidence

### Files Changed / Added

- `src/stop/stop_signal.ts` (new)
- `src/cli/run.ts`
- `src/pipeline/run_pipeline.ts`
- `src/scanner/scan.ts`
- `test/stop_signal_shape.test.ts` (new)

### Commands (PowerShell)

- `npm test` → PASS
- `npm run typecheck` → PASS
- `npm run build` → PASS

## 6) Verdict

PASS

## 7) Next Minimal Step

- Add `law_ref` and `unblock_hints` to existing StopSignals where an explicit canon anchor exists (docs only), without changing any printed text or exit codes.

