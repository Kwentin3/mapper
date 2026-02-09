# Agent Text Strictness Canon (LAW / GUIDANCE / HINT)

## 1) Purpose

Единое правило для кодовых агентов: как трактовать текстовые утверждения Architecture Mapper, чтобы не уехать в дрейф при неполном/устаревшем контексте. Источники: `AGENT_TRUST_DRIFT_AUDIT.report.md` (TP-*, TA-*), `AGENT_NAVIGATION_DOCTRINE.md`, CLI help (`node dist/cli/main.js --help`), AI Preamble в `ARCHITECTURE.md`.

## 2) Canonical Scale (LAW / GUIDANCE / HINT)

- LAW: текст, влияющий на безопасность решений, полноту контекста или корректность интерпретации; нарушение ведёт к неверным выводам.
- LAW: утверждение считается LAW только если в аудите нет подтверждённого расхождения “текст ↔ факт”; иначе не LAW.
- GUIDANCE: строгая навигация “как действовать”, но допускает исключения по фактическому поведению/среде.
- GUIDANCE: если текст выглядит “как закон”, но аудиторски NOT-VERIFIABLE или замечены исключения, это GUIDANCE (не LAW).
- HINT: подсказка/предпочтение/пример, не гарантия; на неё нельзя опираться для выводов.

## 3) Text Classification Table (TP-* / TA-*)

Justification: 1 строка, строго по `AGENT_TRUST_DRIFT_AUDIT.report.md` (checked verdicts, NOT-VERIFIABLE, TA anchors) и наблюдаемым mismatch’ам.

| Text ID | Source | Classified as | Justification (from audit) |
|---|---|---|---|
| TP-01 | help | HINT | В аудите зафиксирован MISMATCH: “POSIX /” заявлено, но `\\` принят без ошибки. |
| TP-02 | help | LAW | В аудите checked MATCH: `--show-orphans` меняет ORPHAN-рендеринг (counts/артефакт). |
| TP-03 | help | LAW | В аудите checked MATCH: “no path => current directory analyzed”. |
| TP-04 | help | LAW | В аудите checked MATCH: default output `ARCHITECTURE.md` подтверждён stdout. |
| TP-05 | help | GUIDANCE | В аудите отмечено NOT-VERIFIABLE как “фактологичность” без отдельной ground-truth проверки. |
| TP-06 | help | GUIDANCE | В аудите: это указатель на место правил интерпретации; не проверялась полнота/актуальность. |
| TP-07 | preamble | GUIDANCE | В аудите: навигационная инструкция (start from ENTRYPOINT), не проверялась как “обязательность”. |
| TP-08 | preamble | GUIDANCE | В аудите: навигационная инструкция (use `--focus-file`), без отдельной проверки строгости. |
| TP-09 | preamble | LAW | В аудите: интерпретационный запрет “HUB not contract”; используется как anti-drift anchor. |
| TP-10 | preamble | LAW | В аудите checked MATCH: budgeted-absense ≠ absense; есть truncation-hints. |
| TP-11 | preamble | GUIDANCE | В аудите: “rerun with --full-signals for risky decisions” как guidance (не proof). |
| TP-12 | preamble | LAW | В аудите: “signals are heuristic, not verification” как ключевой anti-drift закон. |
| TP-13 | doctrine | LAW | В аудите checked MATCH: `## Generation Metadata` реально есть и несёт режим. |
| TP-14 | doctrine | GUIDANCE | В аудите: навигационный порядок чтения секций. |
| TP-15 | doctrine | LAW | В аудите: semantic rule для корректной интерпретации entrypoints summary vs inline. |
| TP-16 | doctrine | LAW | В аудите: “Truncated by budget => unknown; rerun” как ключевой trust anchor. |
| TP-17 | doctrine | GUIDANCE | В аудите: “priority order” влияет на навигацию/скоринг внимания, не на факты. |
| TP-18 | doctrine | LAW | В аудите: повтор закона “not verification” как anti-drift правило. |
| TA-01 | doctrine | LAW | В аудите: anchor “exit code > слово Error в логах” (ложная тревога). |
| TA-02 | doctrine | LAW | В аудите: anchor “Generation Metadata = truth about mode/focus”. |
| TA-03 | preamble | LAW | В аудите: anchor “Truncated by budget => unknown; rerun --full-signals”. |
| TA-04 | preamble | LAW | В аудите: anchor “Signals are navigation aids, not verification”. |
| TA-05 | preamble | LAW | В аудите: anchor “[HUB] render-marker; not contract”. |
| TA-06 | preamble | LAW | В аудите: anchor “summary Entrypoints vs inline ENTRYPOINT” (anti-drift). |
| TA-07 | help | LAW | В аудите: anchor “--show-orphans реально расширяет ORPHAN-рендеринг”. |
| TA-08 | help | LAW | В аудите: anchor “--focus-file для deep-dive importers/imports”. |
| TA-09 | help | GUIDANCE | В аудите: anchor-указатель на `docs/agent-interpretation.md` (без проверки полноты). |
| TA-10 | help | GUIDANCE | В аудите: “Contract Telemetry ... facts” упомянуто как anchor, но TP-05 NOT-VERIFIABLE. |

## 4) Conflict & Ambiguity Notes

- TP-01 risk: агент будет считать help-ограничения “нестрогими” и начнёт игнорировать help целиком (audit: trust degradation trigger).
Limited-context interpretation: при одном help агент может решить, что “если тут не строго, то и остальное не строго”.

- TP-05 / TA-10 risk: текст выглядит как LAW (“architectural facts”), но в аудите помечен NOT-VERIFIABLE.
Limited-context interpretation: агент может принять это за абсолютный закон и переносить на любые выводы без проверки источников.

- TP-11 risk: “for risky decisions rerun” может восприниматься как LAW, хотя классифицирован как GUIDANCE.
Limited-context interpretation: агент либо будет делать лишние прогоны всегда, либо игнорировать rerun даже когда видел truncation.

## 5) Injection Test Summary

### Scenario 1: agent has only CLI help + this scale

- Treated as LAW: TP-02/03/04; TA-07/08; TA-01 (как правило чтения логов через exit code, если агент видит его в контексте).
- Drift prevented by scale: TP-01 явно не LAW (HINT), поэтому mismatch не “ломает доверие ко всему help”.

### Scenario 2: agent has only an `ARCHITECTURE.md` fragment + this scale

- Treated as LAW: TP-10/12; TA-02/03/04/05/06 (если фрагмент включает соответствующие строки/`##` секции).
- Drift prevented by scale: без `Truncated by budget...` и/или `## Generation Metadata` агент не повышает выводы до уровня фактов (не делает “absence-as-evidence”).

