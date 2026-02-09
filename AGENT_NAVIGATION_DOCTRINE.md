# Agent Navigation Doctrine (ARCHITECTURE.md)

## 1) Purpose

Rule: Treat `ARCHITECTURE.md` as a navigation and impact map for safe changes (not as runtime truth).
Why: The tool explicitly frames signals/preamble as guidance, not verification/schema.
Evidence: AI Preamble says “Signals are heuristic navigation aids, not formal verification.” and “AI Preamble is human guidance, not a machine schema.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 2) Navigation Order

1. Rule: Start by reading `## Generation Metadata`.
Why: It declares whether the view is `budgeted` or `full-signals` and what focus/depth context is active.
Evidence: `## Generation Metadata` with `- View mode: budgeted|full-signals` and focus fields. (`.tmp/nav-doctrine/ARCH.budgeted.md`, `.tmp/nav-doctrine/ARCH.full-signals.md`, `.tmp/nav-doctrine/ARCH.focus.md`)

2. Rule: Read `## Entrypoints & Public Surface` next, then `## Graph Hubs (Fan‑in / Fan‑out)`.
Why: These sections provide the intended starting points and the highest blast-radius nodes.
Evidence: Both sections appear near the top and list files with `[PROD]/[TEST]` and `[HUB]`. (`.tmp/nav-doctrine/ARCH.budgeted.md`)

3. Rule: If you are about to touch a file, use `--focus-file` for that file to inspect `← Importers` and `→ Imports`.
Why: The focus output is the dedicated deep-dive for a single target file.
Evidence: CLI help documents `--focus-file` and the focus output contains `## Focused Deep-Dive` with `← Importers` / `→ Imports`. (`.tmp/nav-doctrine/cli-help.txt`, `.tmp/nav-doctrine/ARCH.focus.md`)

4. Rule: Use `## Impact Path` to decide whether the change can reach PUBLIC-API.
Why: It answers reachability to PUBLIC-API from the focused file.
Evidence: `## Impact Path` includes `No PUBLIC-API reachable from ...` in focus output. (`.tmp/nav-doctrine/ARCH.focus.md`)

5. Rule: Use `## Project Tree` last to locate where the file sits and to scan inline signals in context.
Why: The tree provides the structural layout + inline markers per file.
Evidence: `## Project Tree` followed by a fenced code block tree. (`.tmp/nav-doctrine/ARCH.budgeted.md`, `.tmp/nav-doctrine/ARCH.focus.md`)

## 3) Entrypoints Semantics

Rule: Interpret `## Entrypoints & Public Surface` / `### Entrypoints` as the summary list of `[PROD]` entrypoints.
Why: It is a separate summary block, tagged `[PROD]/[TEST]`, separate from inline markers in the tree.
Evidence: Summary shows `### Entrypoints` with `[PROD]` items (e.g., `src/cli/main.ts`). (`.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: Interpret inline `(→ ENTRYPOINT)` as a per-file navigation marker that can appear on non-summary files, including `[TEST]` files with fan-in `0`.
Why: The tool renders `(→ ENTRYPOINT)` inline for many test files and explicitly warns about this ambiguity.
Evidence: AI Preamble line: “Summary "### Entrypoints" lists [PROD] entrypoints; inline (→ ENTRYPOINT) can also appear on [TEST] files with fan-in 0.” and tree lines like `cli_smoke.test.ts (→ ENTRYPOINT)`. (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 4) Reading the Tree

Rule: Parse `## Project Tree` as a directory tree; treat each file line as “path + inline markers”.
Why: Inline signals and dependency counts appear on the same line as the file.
Evidence: Tree lines include inline markers and counts, e.g. `... (→ ENTRYPOINT) (←0 →1)` and `(i ORPHAN)`. (`.tmp/nav-doctrine/ARCH.focus.md`, `.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: Do not treat `[HUB]` as a contract or API guarantee.
Why: `[HUB]` is explicitly “Render-only; not a contract”.
Evidence: AI Preamble: “[HUB] ... Render-only; not a contract or API guarantee.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 5) Focus & Impact Path

Rule: Use `--focus-file <path>` with repo-relative POSIX `/` separators.
Why: CLI help states POSIX separators for `--focus-file`.
Evidence: `--focus-file <path> ... (use POSIX / separators)` in help. (`.tmp/nav-doctrine/cli-help.txt`)

Rule: Treat `## Focused Deep-Dive` as the tool’s view of repo-local importers/imports for the focused file, but respect truncation.
Why: The deep-dive contains `← Importers` and `→ Imports` lists and can be truncated.
Evidence: `## Focused Deep-Dive` lists and `Truncated by budget; rerun with --full-signals (+X more).` (`.tmp/nav-doctrine/ARCH.focus.md`)

Rule: Treat `## Impact Path` as the reachability summary to PUBLIC-API (or explicit “No PUBLIC-API reachable”).
Why: It is rendered as a distinct derived view.
Evidence: `## Impact Path` section content. (`.tmp/nav-doctrine/ARCH.focus.md`)

## 6) Budgets & Truncation

Rule: Determine whether you are reading a `budgeted` or `full-signals` artifact from `## Generation Metadata` (not from file size or intuition).
Why: Budgeting changes what is included; metadata is explicit.
Evidence: `- View mode: budgeted|full-signals` lines. (`.tmp/nav-doctrine/ARCH.budgeted.md`, `.tmp/nav-doctrine/ARCH.full-signals.md`)

Rule: If you see `Truncated by budget; rerun with --full-signals (+X more).`, treat the hidden items as unknown and rerun.
Why: Budgeted lists omit items; absence is not evidence of absence.
Evidence: Canonical truncation notice appears in budgeted Local Dependencies and Focused Deep-Dive. (`.tmp/nav-doctrine/ARCH.budgeted.md`, `.tmp/nav-doctrine/ARCH.focus.md`)

Rule: Never conclude “no importers / no dependencies / no signals” from a budgeted view without checking for truncation or rerunning `--full-signals`.
Why: The preamble explicitly warns against absence-in-budgeted implying absence-in-codebase.
Evidence: AI Preamble: “Absence ... in a budgeted output does NOT mean absence ... budgets may truncate results.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 7) Signal Priority

Rule: Prioritize investigation by signal kind in this order: `(!)` then `(?)` then `(i)` then `(→)`.
Why: This is the declared “Signal Priority” for scanning.
Evidence: AI Preamble: `(!) → (?) → (i) → (→)`. (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 8) ORPHAN Interpretation

Rule: Interpret ORPHAN as “no repo-local importers” (context signal), not as “safe to change”.
Why: ORPHAN is explicitly not automatically safe.
Evidence: AI Preamble `### ORPHAN guidance` lines. (`.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: For non-code files that appear in the tree, treat `(i ORPHAN)` as context only (the file is present in the scan output, but may not be relevant to production code changes).
Why: The tree shows ORPHAN on items like scripts; the guidance does not elevate ORPHAN to a safety guarantee.
Evidence: Example tree line: `clean_artifacts.js ... (i ORPHAN)`. (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 9) Mandatory Re-runs

Rule: Rerun with `--full-signals` if (a) you see any `Truncated by budget...` relevant to the file you will touch, or (b) `## Generation Metadata` says `View mode: budgeted` and you need a complete list (importers/imports).
Why: Budgeting can hide exactly the blast-radius edges you need to reason about.
Evidence: Canonical truncation notice + AI Preamble instruction: “For risky decisions rerun with --full-signals”. (`.tmp/nav-doctrine/ARCH.focus.md`, `.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: Before making an edit to a `[HUB]` file, use `--focus-file`.
Why: Hubs have wide fan-in/fan-out and the tool’s own guidance routes you through focus for blast-radius inspection.
Evidence: AI Preamble “Agent guidance for [HUB] ... use --focus-file ... assess blast radius.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

## 10) Anti-Patterns (what you must not do)

Rule: Do not treat any signal as formal verification of correctness, runtime behavior, or safety.
Why: Signals are explicitly heuristic.
Evidence: AI Preamble: “Signals are heuristic navigation aids, not formal verification.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: Do not infer “absence” from a budgeted artifact.
Why: Budgeting truncates.
Evidence: AI Preamble: “does NOT mean absence ... budgets may truncate.” (`.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: Do not ignore `docs/agent-interpretation.md` if you are using this artifact as agent context.
Why: Both CLI help and AI Preamble point to it as the location of interpretation rules.
Evidence: CLI help: “Agent interpretation rules are defined in: docs/agent-interpretation.md”; AI Preamble includes `Agent interpretation rules: docs/agent-interpretation.md`. (`.tmp/nav-doctrine/cli-help.txt`, `.tmp/nav-doctrine/ARCH.budgeted.md`)

Rule: When evaluating `npm test`, do not treat the presence of the literal `Error:` in logs as a failure without checking exit status.
Why: UX audit captured `Error:` lines in passing test runs as a false-alarm pattern.
Evidence: `UX_AUDIT.Mapper.report.md:212` (“stderr ... Error: ... при общем PASS”).
