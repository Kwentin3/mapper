# Agent Trust & Drift Audit (Architecture Mapper)

## 1) Executive summary

- Инвентаризированы “text promises” из 3 источников: CLI help, AI Preamble внутри `ARCHITECTURE.md`, и `AGENT_NAVIGATION_DOCTRINE.md` (минимум по 6 на источник).
- Проверено фактами 6 обещаний (TP-01/02/03/04/10/13) на текущем репозитории с сохранением доказательств в `.tmp/cli-error-ux/` и `.tmp/trust-drift/`.
- Найдено 1 подтверждённое расхождение “текст ↔ факт”: help заявляет POSIX `/` для `--focus-file`, но Windows `\\` принимаются без ошибки (TP-01 = MISMATCH).
- Остальные проверенные обещания совпали с наблюдаемым поведением (MATCH), включая “no-args анализирует текущую директорию”, “--show-orphans существенно меняет количество ORPHAN”, “default output = ARCHITECTURE.md”, “budgeted выдаёт truncation-hint + full-signals”.
- Модель деградации доверия (ниже) фиксирует типовые триггеры: одно явное несоответствие, шумная обвязка ошибок в PowerShell, и фрагментарный контекст (когда агент видит только часть артефакта).
- Сформирован минимальный набор Trust Anchors (TA-01..TA-10) как “закон интерпретации” для агента при ограниченном/устаревшем контексте, с привязкой к источникам.

## 2) Text Promises Inventory (TP-*)

Формат: Quote ≤ 20 слов; классификация “как это выглядит агенту”.

| Promise ID | Source | Quote (≤20 words) | Interpreted as |
|---|---|---|---|
| TP-01 | help | “use POSIX / separators” (`--focus-file`) | STRONG GUIDANCE |
| TP-02 | help | “--show-orphans Show ORPHAN signals for test/docs/config files” | LAW |
| TP-03 | help | “If no path is provided, the current directory is analyzed.” | LAW |
| TP-04 | help | “--out <file> ... (default: ARCHITECTURE.md)” | LAW |
| TP-05 | help | “Contract Telemetry signals are architectural facts.” | LAW |
| TP-06 | help | “Agent interpretation rules are defined in: docs/agent-interpretation.md” | STRONG GUIDANCE |
| TP-07 | preamble | “Start from (→ ENTRYPOINT) files.” | STRONG GUIDANCE |
| TP-08 | preamble | “use --focus-file=<path> to see ← importers and → imports.” | STRONG GUIDANCE |
| TP-09 | preamble | “[HUB] ... Render-only; not a contract or API guarantee.” | LAW |
| TP-10 | preamble | “Absence ... in a budgeted output does NOT mean absence ...” | LAW |
| TP-11 | preamble | “For risky decisions rerun with --full-signals” | STRONG GUIDANCE |
| TP-12 | preamble | “Signals are heuristic navigation aids, not formal verification.” | LAW |
| TP-13 | doctrine | “Start by reading ## Generation Metadata.” | LAW |
| TP-14 | doctrine | “Read Entrypoints & Public Surface next.” | STRONG GUIDANCE |
| TP-15 | doctrine | “Interpret summary Entrypoints as [PROD] entrypoints.” | STRONG GUIDANCE |
| TP-16 | doctrine | “If you see Truncated by budget... rerun --full-signals.” | LAW |
| TP-17 | doctrine | “Prioritize: (!) then (?) then (i) then (→).” | LAW |
| TP-18 | doctrine | “Do not treat any signal as formal verification.” | LAW |

## 3) Mismatch matrix (TP-* → MATCH/MISMATCH)

### Checked promises (with evidence)

| Promise ID | Evidence (command / output / artifact) | Verdict | Agent impact (behavior shift) |
|---|---|---|---|
| TP-01 | Help: `.tmp/nav-doctrine/cli-help.txt` line “use POSIX / separators”; факт: `.tmp/cli-error-ux/C2.exitcode.txt`=`0`, `.tmp/cli-error-ux/C2.stdout.txt` shows success for `src\\cli\\run.ts`. | MISMATCH | Агент начинает игнорировать help-ограничение формата пути как “нестрогое”. |
| TP-02 | Help: `.tmp/nav-doctrine/cli-help.txt` “--show-orphans ...”; факт: `.tmp/trust-drift/orphan_counts.txt` (15 → 149 ORPHAN) и `.tmp/trust-drift/with-orphans.md` содержит строку “ORPHAN rendering: enabled (--show-orphans)”. | MATCH | Агент считает `--show-orphans` реальным переключателем “контекст шире”, а не косметикой. |
| TP-03 | Help: `.tmp/nav-doctrine/cli-help.txt` “If no path...”; факт: `.tmp/trust-drift/noargs.exitcode.txt`=`0`, `.tmp/trust-drift/noargs.stdout.txt` “Architecture map written ...”. | MATCH | Агент ожидает “быстрый старт” без аргументов и не ищет обязательный positional `<path>`. |
| TP-04 | Help: `.tmp/nav-doctrine/cli-help.txt` “default: ARCHITECTURE.md”; факт: `.tmp/trust-drift/noargs.stdout.txt` и `.tmp/cli-error-ux/C2.stdout.txt` пишут в `...\\ARCHITECTURE.md`. | MATCH | Агент полагается на дефолтный артефакт без обязательного `--out`. |
| TP-10 | Preamble: `.tmp/nav-doctrine/ARCH.budgeted.md` (“Absence ... budgeted ... budgets may truncate”); факт: `.tmp/nav-doctrine/ARCH.budgeted.md` содержит “Truncated by budget; rerun with --full-signals (+X more).” | MATCH | Агент переносит “отсутствие ≠ отсутствие” в правила чтения budgeted-артефактов и избегает ложных выводов. |
| TP-13 | Doctrine: `AGENT_NAVIGATION_DOCTRINE.md` “Start by reading ## Generation Metadata”; факт: `.tmp/nav-doctrine/ARCH.budgeted.md` содержит `## Generation Metadata` и “View mode: budgeted”. | MATCH | Агент закрепляет “режим генерации” как первичный контекст и не смешивает budgeted/full. |

### Unchecked / not directly verifiable in this audit

- TP-05 (help, “Contract Telemetry signals are architectural facts.”): NOT-VERIFIABLE в рамках этого аудита без отдельной “ground truth” проверки “фактологичности”.
- TP-06 (help → docs/agent-interpretation.md): NOT-VERIFIABLE в рамках этого аудита (не проверялась полнота/актуальность этого файла относительно поведения).
- TP-07/08/09/11/12/14/15/16/17/18: не выделялись как отдельные “text ↔ факт” проверки сверх покрытых TP-10/TP-13; они подтверждаются наличием соответствующих строк/секций в `.tmp/nav-doctrine/ARCH.budgeted.md` и/или `AGENT_NAVIGATION_DOCTRINE.md`, но не были “обстреляны” отдельными экспериментами.

## 4) Trust Degradation Model (triggers)

Формат: Trigger → Typical agent behavior shift → Risk.

1. Trigger: help формулирует ограничение, но фактическое поведение его не соблюдает (пример: TP-01).
Typical agent behavior shift: перестаёт считать help “строгим” и начинает трактовать его как “примерное”.
Risk: агент игнорирует и другие help-ограничения даже там, где они строгие (ошибки запуска, неверные предпосылки контекста).

2. Trigger: ошибки в PowerShell выглядят как “падение системы” из-за `NativeCommandError`-обвязки (см. `.tmp/cli-error-ux/*.stderr.txt`).
Typical agent behavior shift: начинает ориентироваться по наличию “Error:” как по главному сигналу, либо наоборот “привыкает” к Error и теряет чувствительность.
Risk: ложная тревога (паникует при валидаторах) или пропуск реальной ошибки (игнорирует Error-строки).

3. Trigger: агент получает только фрагмент контекста (например, кусок focus-view без `## Generation Metadata`).
Typical agent behavior shift: делает выводы о полноте/отсутствии зависимостей из видимого куска.
Risk: дрейф в сторону “absence-as-evidence”, неверная оценка blast radius, пропуск truncation.

4. Trigger: смешение “LAW” и “guidance” в одном месте (help/preamble), без явной границы по строгости.
Typical agent behavior shift: выбирает “свою” строгость на основе прошлого опыта, а не источника.
Risk: непредсказуемость поведения агента между сессиями и репозиториями (дрейф правил интерпретации).

## 5) Trust Anchors (TA-*)

Формат: statement (1 строка) + source reference + why it prevents drift (1 строка).

- TA-01: Exit code определяет успех/провал, а не наличие слова `Error:` в логах.
Source reference: `AGENT_NAVIGATION_DOCTRINE.md` (rule про `npm test` + exit status), `.tmp/cli-error-ux/*.exitcode.txt`.
Why it prevents drift: снижает ложные тревоги и “привыкание к Error” при чтении stderr в PowerShell.

- TA-02: `## Generation Metadata` это источник истины о режиме (`budgeted` vs `full-signals`) и фокусе.
Source reference: `AGENT_NAVIGATION_DOCTRINE.md` (Navigation Order), `.tmp/nav-doctrine/ARCH.budgeted.md` (“View mode: budgeted”).
Why it prevents drift: предотвращает неверные выводы о полноте данных при чтении артефакта.

- TA-03: `Truncated by budget...` означает “часть скрыта”; трактуй скрытое как unknown и используй `--full-signals`.
Source reference: `.tmp/nav-doctrine/ARCH.budgeted.md` (строки “Truncated by budget; rerun with --full-signals”), `AGENT_NAVIGATION_DOCTRINE.md` (Budgets & Truncation).
Why it prevents drift: блокирует “absence-as-evidence” в budgeted-режиме.

- TA-04: “Signals are heuristic navigation aids, not formal verification.”
Source reference: `.tmp/nav-doctrine/ARCH.budgeted.md` (AI Preamble).
Why it prevents drift: удерживает агента от выводов про корректность/рантайм по сигналам.

- TA-05: `[HUB]` это render-marker, “not a contract or API guarantee”.
Source reference: `.tmp/nav-doctrine/ARCH.budgeted.md` (AI Preamble).
Why it prevents drift: предотвращает ошибку “HUB = public API” и неправильную приоритизацию.

- TA-06: Summary `### Entrypoints` и inline `(→ ENTRYPOINT)` имеют разную семантику (summary = [PROD], inline может быть [TEST]).
Source reference: `.tmp/nav-doctrine/ARCH.budgeted.md` (AI Preamble строка про ambiguity), `AGENT_NAVIGATION_DOCTRINE.md` (Entrypoints Semantics).
Why it prevents drift: снижает риск начать навигацию с тестовых “entrypoint”-файлов по inline-маркеру.

- TA-07: `--show-orphans` реально расширяет ORPHAN-рендеринг для test/docs/config.
Source reference: `.tmp/nav-doctrine/cli-help.txt` (help), `.tmp/trust-drift/orphan_counts.txt`, `.tmp/trust-drift/with-orphans.md` (“ORPHAN rendering: enabled ...”).
Why it prevents drift: агент понимает, что отсутствие ORPHAN в одном режиме не означает отсутствие в другом.

- TA-08: `--focus-file` предназначен для deep-dive `← Importers` / `→ Imports`.
Source reference: `.tmp/nav-doctrine/cli-help.txt` (`--focus-file`), `.tmp/nav-doctrine/ARCH.budgeted.md` (AI Preamble), `.tmp/nav-doctrine/ARCH.focus.md` (`## Focused Deep-Dive`).
Why it prevents drift: удерживает агента от “правок без карты зависимостей” по одному дереву.

- TA-09: “Agent interpretation rules are defined in: docs/agent-interpretation.md”.
Source reference: `.tmp/nav-doctrine/cli-help.txt`, `.tmp/nav-doctrine/ARCH.budgeted.md` (AI Preamble).
Why it prevents drift: агент знает, где искать “правила чтения” при частичном контексте.

- TA-10: “Contract Telemetry signals are architectural facts.”
Source reference: `.tmp/nav-doctrine/cli-help.txt`.
Why it prevents drift: задаёт агенту режим обращения с C+/C?/C0/C~ как с жёсткими маркерами, а не с “советами”.

## 6) Drift Tests (E1–E3)

### E1) Агенту дали только `ARCHITECTURE.md` (budgeted)

- Что он сделает правильно: увидит `## Generation Metadata` и отличит `budgeted`; заметит `Truncated by budget...` и не будет считать списки полными.
- Где риск дрейфа: если агенту дали фрагмент без `Generation Metadata` или без truncation-линий, он может сделать вывод “ничего больше нет”.
- Какие anchors спасают: TA-02, TA-03, TA-04, TA-06.

### E2) Агенту дали только CLI help (без доков)

- Что он сделает правильно: узнает ключевые флаги (`--out`, `--full-signals`, `--show-orphans`, `--focus-file`) и что “no path => current directory”.
- Где риск дрейфа: увидев TP-01-подобные расхождения, агент начнёт считать help “примерным” и игнорировать другие формулировки.
- Какие anchors спасают: TA-01, TA-07, TA-09, TA-10 (как “закон из help”), плюс фиксация факта MISMATCH по TP-01.

### E3) Агенту дали только focus-view фрагмент

- Что он сделает правильно: воспользуется `← Importers` / `→ Imports` и `## Impact Path` для оценки достижения PUBLIC-API.
- Где риск дрейфа: если truncation присутствует, но вырезан из фрагмента, агент может считать importers/imports полными; если вырезан `Generation Metadata`, он не поймёт режим.
- Какие anchors спасают: TA-02, TA-03, TA-08.

## 7) Next minimal step (audit-only)

Провести аналогичную проверку “text ↔ факт” для заявленных перечислимых значений (`--profile`, `--budget`) через намеренно неверные значения с фиксацией `exit code`/stdout/stderr, чтобы выявить, насколько help-формулировки про допустимые значения воспринимаются агентом как строгие.

