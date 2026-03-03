# TEXT_TRUST_MICROFIX — Full-Signals “Budgeted-Limit” Trust Audit

Mode: AUDIT, NONCODE, REPORT. No code changes (analysis-only).

Scope: identify copy/text fragments inside `--full-signals` artefacts that read like budget limits and can undermine agent trust in context completeness.

Sources of truth used (per request):
- `REPLAY_AGENT_USABILITY.report.md`
- `out/replay-agent/B2.full.md` (full-signals)
- `out/replay-agent/B1.quick.md` (budgeted, for contrast)
- `AGENT_TEXT_STRICTNESS_CANON.md` (LAW/GUIDANCE/HINT + Trust Anchors)

## 1) Executive Summary

- Problem is confirmed: `out/replay-agent/B2.full.md` (full-signals) contains copy that looks like budgeted limitations, including a section explicitly titled `(Budgeted)` and an instruction to “use --full-signals for the full list” while already in full-signals mode.
- The most trust-damaging fragment is in the “Local Dependencies” view: `out/replay-agent/B2.full.md:255-256`.
- Several preamble bullets in full-signals also talk about “budgeted truncation” and “rerun with --full-signals”; they are true as general guidance, but their scoping is not explicit, so an agent can misread them as current-view constraints.
- Minimal microfix is possible at copy-level (1–2 lines per fragment): clarify scope (“In budgeted mode…”) and remove the self-contradiction in the full-signals artefact (“(Budgeted)” label + “use --full-signals…” line).
- Risk profile of copy-only changes: does not touch logic/signals; determinism remains a pure function of input and renderer (text changes are deterministic). See §6.

## 2) Misleading Fragments In Full-Signals (Task A)

Criteria used: reads like budget limitation (“shown first N…”, “use --full-signals…”) or labels a view as budgeted inside a full-signals artefact.

### FRAG-01 — Local Dependencies labeled as budgeted inside full-signals (strong mismatch)

- Mode/run: `node dist/cli/main.js --full-signals . --out out/replay-agent/B2.full.md` (exit `0`: `out/replay-agent/B2.full.exitcode.txt`)
- Evidence (exact quote ≤2 lines, with line numbers):
  - `out/replay-agent/B2.full.md:255`
    - `## Local Dependencies (Budgeted)`
  - `out/replay-agent/B2.full.md:256`
    - `Списки ... Показаны первые N зависимостей; используйте --full-signals для полного списка.`
- Why this can be interpreted as “context not complete” in full-signals:
  - It explicitly says the view is “(Budgeted)” and implies a list-length cap (“first N”) plus a remedial action (“use --full-signals”) that the agent has already taken (see `View mode: full-signals` in `out/replay-agent/B2.full.md:39`).

### FRAG-02 — Preamble budgeted limitation bullet present in full-signals (scope ambiguity)

- Evidence (quote ≤1 line):
  - `out/replay-agent/B2.full.md:14`
    - `- Budgeted lists may be truncated; use --full-signals to disable budgets and show full lists.`
- Confusion mechanism:
  - In a full-signals artefact, this reads like a global disclaimer unless the agent actively cross-checks TA-02 (“Generation Metadata = truth about mode/focus”). (`AGENT_TEXT_STRICTNESS_CANON.md:40`)

### FRAG-03 — Preamble “rerun with --full-signals” bullet present in full-signals (scope ambiguity)

- Evidence:
  - `out/replay-agent/B2.full.md:18`
    - `- For risky decisions rerun with --full-signals to obtain the full view.`
- Confusion mechanism:
  - In a full-signals artefact, it suggests “you might still be missing the full view”, unless scoped to budgeted mode / unless anchored to `View mode: full-signals`.

### FRAG-04 — Preamble “signals missing => rerun --full-signals” bullet present in full-signals (scope ambiguity)

- Evidence:
  - `out/replay-agent/B2.full.md:26`
    - `- If signals are missing or unclear, rerun with --full-signals before making risky decisions.`
- Confusion mechanism:
  - Same: the instruction is correct as guidance, but in a full-signals output it reads like the current output might still be incomplete.

## 3) Budgeted vs Full Contrast (Task B)

For each fragment: whether it appears in budgeted, whether it appears in full-signals, and agent confusion risk.

- FRAG-01
  - Present in budgeted? yes (`out/replay-agent/B1.quick.md:89-90` contains the same section header+line)
  - Present in full-signals? yes (`out/replay-agent/B2.full.md:255-256`)
  - Agent confusion risk:
    - High: it duplicates budgeted labeling into full-signals, contradicting `View mode: full-signals` (`out/replay-agent/B2.full.md:39`) and undermining “full context” trust.

- FRAG-02
  - Present in budgeted? yes (`out/replay-agent/B1.quick.md:14`)
  - Present in full-signals? yes (`out/replay-agent/B2.full.md:14`)
  - Agent confusion risk:
    - Medium: true but underscoped; can be misread as applying to the current artefact instead of budgeted-only.

- FRAG-03
  - Present in budgeted? yes (`out/replay-agent/B1.quick.md:18`)
  - Present in full-signals? yes (`out/replay-agent/B2.full.md:18`)
  - Agent confusion risk:
    - Medium: reads like “you still might not have full view”, despite being in `View mode: full-signals`.

- FRAG-04
  - Present in budgeted? yes (`out/replay-agent/B1.quick.md:26`)
  - Present in full-signals? yes (`out/replay-agent/B2.full.md:26`)
  - Agent confusion risk:
    - Medium: same scoping issue.

## 4) Strictness Classification (Task C)

Canon references:
- LAW requires no known “text ↔ fact” mismatch; otherwise it cannot be LAW. (`AGENT_TEXT_STRICTNESS_CANON.md:9-10`)
- TA-02: `## Generation Metadata` is truth about mode/focus. (`AGENT_TEXT_STRICTNESS_CANON.md:40`)
- TA-03: `Truncated by budget => unknown; rerun --full-signals`. (`AGENT_TEXT_STRICTNESS_CANON.md:41`)

Per-fragment classification (in the context of a **full-signals artefact**):

- FRAG-01: **HINT (as written, in full-signals)**, and should be rephrased.
  - Why: it conflicts with the mode truth anchor (TA-02) by labeling the view as “(Budgeted)” and instructing “use --full-signals…” inside an artefact whose metadata says `View mode: full-signals` (`out/replay-agent/B2.full.md:39`).
  - Under canon, a mismatching statement cannot be treated as LAW. (`AGENT_TEXT_STRICTNESS_CANON.md:10`)

- FRAG-02: **GUIDANCE (scope needs to be explicit)**.
  - Why: the content is a correct navigation rule for budgeted outputs (aligns with TP-10/TA-03 intent), but in a full-signals artefact it should not read like an active limitation of the current view.
  - In full-signals it should be **softened/re-scoped** (“In budgeted mode…”), not removed, because it remains true and helps prevent “absence-as-evidence” when reading other artefacts.

- FRAG-03: **GUIDANCE (scope needs to be explicit)**.
  - Why: rerun advice is context-dependent; in full-signals it becomes redundant. It should be re-scoped to budgeted mode to avoid implying incompleteness in full-signals.

- FRAG-04: **GUIDANCE (scope needs to be explicit)**.
  - Why: same.

## 5) Minimal Text Fix Proposal (Task D, No Implementation)

Constraint honored: copy-only changes; no new features/signals; max 2 lines per fragment.

### FRAG-01 (full-signals local deps label + “use --full-signals” line)

- Before (≤2 lines):
  - `out/replay-agent/B2.full.md:255-256`
    ```text
    ## Local Dependencies (Budgeted)
    Списки ... Показаны первые N зависимостей; используйте --full-signals для полного списка.
    ```
- After (≤2 lines, copy-level):
  ```text
  ## Local Dependencies
  В budgeted режиме: показаны первые N; в full-signals: показан полный список.
  ```
- Why this restores trust (agent perspective):
  - Removes self-contradiction inside a full-signals artefact and aligns the view’s copy with TA-02 mode truth.

### FRAG-02 (preamble: budgeted truncation)

- Before:
  - `out/replay-agent/B2.full.md:14`
    ```text
     - Budgeted lists may be truncated; use --full-signals to disable budgets and show full lists.
    ```
- After:
  ```text
   - In budgeted mode, lists may be truncated; use --full-signals to disable budgets and show full lists.
  ```
- Why:
  - Makes scoping explicit, reducing the chance the agent reads it as a limitation of the current full-signals artefact.

### FRAG-03 (preamble: risky decisions rerun)

- Before:
  - `out/replay-agent/B2.full.md:18`
    ```text
    - For risky decisions rerun with --full-signals to obtain the full view.
    ```
- After:
  ```text
  - If this view is budgeted, rerun with --full-signals to obtain the full view for risky decisions.
  ```
- Why:
  - Keeps guidance but prevents “I’m still not full” implication when already in full-signals.

### FRAG-04 (preamble: missing/unclear signals rerun)

- Before:
  - `out/replay-agent/B2.full.md:26`
    ```text
    - If signals are missing or unclear, rerun with --full-signals before making risky decisions.
    ```
- After:
  ```text
  - If this view is budgeted and signals are missing/unclear, rerun with --full-signals before risky decisions.
  ```
- Why:
  - Same scoping fix.

## 6) Risk & Safety Assessment (Task E)

- Can this microfix break determinism?
  - No in principle: it is copy-only; rendered text remains deterministic given the same inputs and mode. It changes output bytes, but not determinism (repeat runs still match within the same version).

- Can it change the meaning of budgeted mode?
  - No: proposed changes only add explicit scoping (“In budgeted mode…”) and clarify that full-signals is the full list; it does not weaken the budgeted warning, and it does not alter truncation behavior.

- Can it conflict with Trust Anchors?
  - It reduces conflicts: FRAG-01 currently conflicts with TA-02 (mode truth). The “After” aligns copy with TA-02 and preserves TA-03’s intent (budgeted truncation implies unknown; rerun full-signals).

## 7) Next Step (Implementation Or Stop)

Implementation is justified (copy-only) if the goal is to eliminate the confirmed trust-undermining mismatch in full-signals artefacts:
- Primary justification: FRAG-01 is a direct contradiction inside `out/replay-agent/B2.full.md` (`View mode: full-signals` vs “(Budgeted)” + “use --full-signals…”).

If you want to stop after audit: the problem is confirmed and precisely localized; no further steps are required to prove it.

