# REPLAY_AGENT_USABILITY — Usability Replay (Post-Canon)

Mode: VERIFY, AUDIT, REPORT. No code changes.

Date: 2026-02-09 (local run)

Artifacts directory: `out/replay-agent/`

## 1) Executive Summary

1) Ориентация стала проще (context load снизился) за счёт того, что “первичный контекст режима/флагов” теперь стабильно находится внутри каждого артефакта в `## Generation Metadata` (а не восстанавливается “по памяти”). Evidence: `out/replay-agent/B1.quick.md` и `out/replay-agent/B2.full.md` содержат `## Generation Metadata` и `View mode: ...` (см. §3, B1/B2 excerpts).

2) Дрейф доверия (help/preamble) снизился за счёт переноса ключевых anti-drift пояснений “в сам артефакт”: entrypoints (summary vs inline), “signals ≠ verification”, и ссылка на `docs/agent-interpretation.md`. Evidence: `out/replay-agent/B1.quick.md:5`, `out/replay-agent/B1.quick.md:20`, `out/replay-agent/B1.quick.md:22` (см. §3, B1).

3) Layer STOP Semantics реально помогает предотвращать “видно ≠ можно”: в протоколе явно зафиксированы HARD STOP для `src/* ↔ test/*` и “allowed-by-graph ≠ allowed-by-policy”. Evidence: `LAYER_STOP_SEMANTICS_CANON.md` триггеры `LS-01`, `LS-10`, `LS-11` (см. §4).

4) Боли/дыры остаются: budgeted-усечение по умолчанию всё ещё требует доп. прогона для рискованных решений (особенно в focus-view), permission graph всё ещё не выражен в артефактах, а в full-signals артефакте встречается текст, который выглядит как “budgeted disclaimer” и может путать. Evidence: `out/replay-agent/B1.quick.md`/`out/replay-agent/B3.focus.md` имеют `Truncated by budget...` (см. §3), `LAYER_STOP_SEMANTICS_CANON.md` §5 (“until permission graph exists”), `out/replay-agent/B2.full.md:256` (см. §5.D).

## 2) Commands Run (A + B)

### Task A — Baseline checks

```powershell
npm test
npm run typecheck
npm run build
```

- `npm test` exit code: `0` (file: `out/replay-agent/A1.npm-test.exitcode.txt`)
  - Key PASS lines: `out/replay-agent/A1.npm-test.summary.txt`
    - `Test Files  105 passed (105)`
    - `Tests  331 passed (331)`
  - “Error:” noise check: `ErrorLineCount=0` (command evidence recorded during audit: `rg -n 'Error:' out/replay-agent/A1.npm-test.log.txt`).
- `npm run typecheck` exit code: `0` (file: `out/replay-agent/A2.typecheck.exitcode.txt`)
  - Key line: `tsc --noEmit` (file: `out/replay-agent/A2.typecheck.log.txt`)
- `npm run build` exit code: `0` (file: `out/replay-agent/A3.build.exitcode.txt`)
  - Key line: `tsc` (file: `out/replay-agent/A3.build.log.txt`)

### CLI help (source of truth per prompt)

```powershell
node dist/cli/main.js --help
```

- Exit code: `0` (file: `out/replay-agent/CLI.help.exitcode.txt`)
- Extract: `out/replay-agent/CLI.help.extract.txt`

### Task B — CLI scenarios

```powershell
node dist/cli/main.js . --out out/replay-agent/B1.quick.md
node dist/cli/main.js --full-signals . --out out/replay-agent/B2.full.md
node dist/cli/main.js --focus-file src/cli/run.ts --focus-depth 1 . --out out/replay-agent/B3.focus.md
node dist/cli/main.js --show-orphans . --out out/replay-agent/B4.orphans.md
```

- B1 exit code: `0` (file: `out/replay-agent/B1.quick.exitcode.txt`), CLI output: `out/replay-agent/B1.quick.cli.log.txt`
- B2 exit code: `0` (file: `out/replay-agent/B2.full.exitcode.txt`), CLI output: `out/replay-agent/B2.full.cli.log.txt`
- B3 exit code: `0` (file: `out/replay-agent/B3.focus.exitcode.txt`), CLI output: `out/replay-agent/B3.focus.cli.log.txt`
- B4 exit code: `0` (file: `out/replay-agent/B4.orphans.exitcode.txt`), CLI output: `out/replay-agent/B4.orphans.cli.log.txt`

## 3) Key Observations Per Run (B1–B4)

### B1) Quick overview (budgeted): `out/replay-agent/B1.quick.md`

- Created: yes (size `20223` bytes).
- Mode is explicit and local to artifact (context anchor):
  - `## Generation Metadata`
  - `- View mode: budgeted`
  - Evidence excerpt (from file):
    ```text
    ## Generation Metadata
    - View mode: budgeted
    - Profile: default
    - Budget profile: default
    ```
- Trust/interpretation anchor text is now in-artefact (reduces “help/preamble drift”):
  - Entrypoints ambiguity disambiguated inline:
    - `Summary "### Entrypoints" lists [PROD] entrypoints; inline (→ ENTRYPOINT) can also appear on [TEST] files...` (`out/replay-agent/B1.quick.md:5`)
  - Anti-drift law present:
    - `Signals are heuristic navigation aids, not formal verification.` (`out/replay-agent/B1.quick.md:20`)
  - Interpretation rules pointer present:
    - `Agent interpretation rules: docs/agent-interpretation.md` (`out/replay-agent/B1.quick.md:22`)
- Budgeted incompleteness is still a live concern:
  - Truncation hints present (count observed during audit): `Truncated by budget` occurrences in B1 = `12`.

### B2) Full signals: `out/replay-agent/B2.full.md`

- Created: yes (size `56098` bytes).
- Mode is explicit and removes the “is this budgeted?” mental overhead:
  - Evidence excerpt:
    ```text
    ## Generation Metadata
    - View mode: full-signals
    - Budget profile: default (ignored when --full-signals)
    ```
- Practical completeness delta vs budgeted:
  - Truncation hints: B2 count `0` (audit measurement: `TruncatedCounts ... B2=0`).
- Potential confusing text inside full-signals run:
  - `out/replay-agent/B2.full.md:256` contains: `Показаны первые N зависимостей; используйте --full-signals для полного списка.` (см. §5.D).

### B3) Focus file: `out/replay-agent/B3.focus.md` (focus=`src/cli/run.ts`, depth=`1`)

- Focus file exists: `src/cli/run.ts` (`Test-Path src/cli/run.ts` returned `True` during run).
- Focus capsule makes “what exactly is focused” explicit:
  - Evidence excerpt:
    ```text
    (i VIEW: task capsule, focus=src/cli/run.ts, depth=1)
    ```
    (see also `out/replay-agent/B3.focus.md` metadata: `- Focus file: src/cli/run.ts`, `- Focus depth: 1`)
- “Decision support” sections are present and separable:
  - `## Focused Deep-Dive` (`out/replay-agent/B3.focus.md:92`)
  - `## Impact Path` + reachability conclusion:
    - `No PUBLIC-API reachable from src/cli/run.ts.` (`out/replay-agent/B3.focus.md:108`)
- But it is still budgeted by default and thus still potentially incomplete:
  - Truncation hints: B3 count `13` (audit measurement: `TruncatedCounts ... B3=13`).

### B4) Show orphans: `out/replay-agent/B4.orphans.md`

- ORPHAN scope-expansion is explicit in metadata:
  - `- ORPHAN rendering: enabled (--show-orphans)` (`out/replay-agent/B4.orphans.md:42`)
- The delta is measurable (so the agent can treat this as “expanded context”, not cosmetics):
  - `(i ORPHAN)` occurrences:
    - B1 (default): `16`
    - B4 (`--show-orphans`): `149`
  - Evidence: counts measured directly from artifacts during audit (see also samples in `out/replay-agent/B4.orphans.md` around `docs/` and `test/` ORPHAN lines).
- Usability tradeoff:
  - Better for “what’s unreferenced across layers” scanning.
  - More noise for quick navigation (large ORPHAN surface in docs/tests).

## 4) Simulated Change Decision (C) — Agent Thinking (No Change Made)

Simulated change request: “переиспользовать `test/helpers/fixture_builder.ts` в prod-коде (например импортнуть из `src/cli/run.ts`)” (НЕ делал).

Step-by-step (with Trust Anchors TA-XX and Layer STOP triggers LS-XX):

1. Start from mode truth (TA-02): read `## Generation Metadata` in the artifact I’m holding, not assume.
   - Evidence: `out/replay-agent/B1.quick.md:37` shows `View mode: budgeted`.

2. Recognize budgeted unknowns (TA-03): if the change is risky, budgeted output is not enough.
   - Evidence: budgeted truncation exists in B1/B3/B4 (B1 has `Truncated by budget...` count `12`; B3 has `13`).

3. Identify the candidate “donor” helper and its layer:
   - Evidence: `out/replay-agent/B4.orphans.md` lists `test/helpers/fixture_builder.ts` as `[TEST] [HUB]` (fan-in hub), which makes it tempting but also high blast-radius in tests.

4. HARD STOP for `src/* → test/*` (LS-01, LS-11): this is a cross-layer dependency (`src/*` depending on `test/*`).
   - Evidence: `LAYER_STOP_SEMANTICS_CANON.md` defines `LS-01` (“src/* starts depending on test/*”) and `LS-11` (mixing `[PROD]/[TEST]` markers with permission).

5. Separate dependency-graph visibility from permission (LS-10, LS-08): even if an import edge exists somewhere, it is not a permission rule.
   - Evidence: `LAYER_STOP_SEMANTICS_CANON.md` `LS-10` (allowed-by-graph ≠ allowed-by-policy), `LS-08` (absence of prohibition ≠ allowed).

6. Apply anti-drift “HUB is not permission” (TA-05 + LS-07): `[HUB]` increases risk, it doesn’t grant “import from anywhere”.
   - Evidence: artifact preamble says `[HUB] ... not a contract or API guarantee.` (e.g. `out/replay-agent/B1.quick.md` preamble) and `LAYER_STOP_SEMANTICS_CANON.md` `LS-07`.

7. If I still need impact context, I ask for it via focus view (TA-08) and avoid partial lists (TA-03):
   - Evidence: focus capsule exists (`out/replay-agent/B3.focus.md`), but it’s budgeted and truncated; so I would request a rerun with `--full-signals` for the focused file before reasoning about complete importers/imports.

8. Permission context I would request (Minimal Permission Questions protocol, HARD STOP):
   - Evidence: `LAYER_STOP_SEMANTICS_CANON.md` §4 questions.
   - Requested context (verbatim topics, not a solution):
     - Is `src/* → test/*` ever allowed in this repo? If yes, for what cases?
     - Is there a one-way boundary policy that explicitly allows this direction?
     - If not allowed, what is the approved location/pattern for shared helpers (policy-level, not code-level)?

9. Decision outcome (audit-only): I do not proceed with the change without explicit permission context; current artifacts show visibility, not permission (HARD STOP remains).

## 5) Drift & Pain Comparison vs `UX_AUDIT.Mapper.report.md` (D)

### Better (3–6)

- Generation mode/context is now embedded in the artefact, reducing “budgeted vs full” confusion.
  - Evidence (baseline pain): `UX_FIXES.Mapper.report.md` §1.2 references `UX_AUDIT.Mapper.report.md` about context loss.
  - Evidence (now): `out/replay-agent/B1.quick.md` contains `## Generation Metadata` and `View mode: budgeted`; `out/replay-agent/B2.full.md` contains `View mode: full-signals`.

- Entrypoints ambiguity is explicitly disambiguated inside the preamble text.
  - Evidence (baseline pain): `UX_FIXES.Mapper.report.md` §1.1.
  - Evidence (now): `out/replay-agent/B1.quick.md:5` contains the summary-vs-inline rule.

- “Agent interpretation rules” pointer is now available in-artefact (less dependency on CLI help as a separate context).
  - Evidence (baseline pain): `UX_FIXES.Mapper.report.md` §1.4.
  - Evidence (now): `out/replay-agent/B1.quick.md:22` contains `docs/agent-interpretation.md`.

- Redundant truncation note is gone (deduped).
  - Evidence (claimed change): `UX_FIXES.Mapper.report.md` §2.3 (“removed Note: this [HUB] list is truncated...”).
  - Evidence (now): audit search returned `RedundantNoteMatches=0` across `out/replay-agent/B1.quick.md`, `out/replay-agent/B2.full.md`, `out/replay-agent/B3.focus.md`, `out/replay-agent/B4.orphans.md`.

- “Error:” noise in passing `npm test` output is gone (reduces false alarm drift).
  - Evidence (baseline pain): `UX_FIXES.Mapper.report.md` §1.5.
  - Evidence (now): `out/replay-agent/A1.npm-test.exitcode.txt` is `0` and `rg 'Error:' out/replay-agent/A1.npm-test.log.txt` returned 0 matches during this replay.

### Unchanged (3–6)

- Budgeted truncation still exists and still forces reruns for risky decisions; focus-view in particular still shows truncation.
  - Evidence: `out/replay-agent/B1.quick.md` and `out/replay-agent/B3.focus.md` contain multiple `Truncated by budget; rerun with --full-signals ...` lines.

- “Help vs reality” risk remains documented: some help text is not strictly enforced by runtime (trust drift trigger).
  - Evidence: `AGENT_TEXT_STRICTNESS_CANON.md` table marks TP-01 (POSIX separators) as `HINT` due to mismatch; this replay did not re-audit TP-01, so it remains an open trust-risk in canon.

- Permission graph is still not expressed by artefacts (so “видно ≠ можно” remains a general hazard).
  - Evidence: `LAYER_STOP_SEMANTICS_CANON.md` §5 explicitly frames rules as “until permission graph exists”.

- `--show-orphans` expands context, but still yields a large cross-layer surface (potentially hard to scan in one pass).
  - Evidence: `(i ORPHAN)` count rises from `16` (B1) to `149` (B4).

### New pain (if any)

- In `--full-signals` artefact, there is still a sentence that reads like a budgeted disclaimer (“shown first N dependencies; use --full-signals”), which is confusing when already in full-signals mode.
  - Evidence: `out/replay-agent/B2.full.md:256` contains: `Показаны первые N зависимостей; используйте --full-signals для полного списка.`

## 6) Wish-list (E) — No Design / No Implementation

- Нужно, чтобы full-signals режим не содержал текста, который выглядит как budgeted-ограничение, потому что это снижает доверие к “полноте” full-signals.
- Хочу, чтобы focus-view по умолчанию явно предлагал “полный” режим для blast-radius оценок, потому что сейчас `budgeted` + truncation делает “глубокий dive” частично неизвестным.
- Нужно/хочу, чтобы permission (allowed-by-policy) был выражен явно (хотя бы как текстовые boundary rules), потому что сейчас агент вынужден HARD STOP’ить по LS-01/02/03/10 и запрашивать внешний контекст.
- Хочу, чтобы в артефакте был компактный “trust anchors” блок (TA-01..TA-08) как быстрый чеклист, потому что сейчас он разнесён по отдельным канонам.
- Нужно, чтобы в артефакте было ясно, какие части построены по budget profiles (и где именно применяется лимит), потому что “Truncated by budget” встречается во многих местах и это повышает когнитивную нагрузку.
- Хочу, чтобы `--show-orphans` имел более явный “когда использовать” контекст рядом с ORPHAN rendering, потому что иначе легко включить его “по привычке” и получить перегруженный вывод.
- Нужно/хочу, чтобы артефакт различал “орфаны-код” и “орфаны-доки/отчёты” более явно, потому что сейчас в expanded контексте агент тратит внимание на нерелевантные для кода файлы.
- Хочу, чтобы различие “dependency graph” vs “permission graph” было подсвечено рядом с ключевыми derived views (hubs/focus), потому что это частая ловушка (LS-10).

## 7) Next Minimal Step (Audit-Only)

Сделать один дополнительный прогон focus-view именно для рискованного решения (без изменений кода):

```powershell
node dist/cli/main.js --full-signals --focus-file src/cli/run.ts --focus-depth 1 . --out out/replay-agent/B3.focus.full-signals.md
```

Цель: зафиксировать, как меняются `← Importers` / `→ Imports` и `Impact Path` без budget-truncation, и оценить, насколько меньше “unknown” остаётся для агента.

