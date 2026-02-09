# UX_AUDIT — Architecture Mapper (Hands-On Agent Run)

## 1) Executive Summary

- Среда запуска: Windows + PowerShell; Node `v22.19.0`, npm `11.6.2` (фактический вывод команд).
- Зависимости: `node_modules` присутствует (без переустановки).
- Baseline checks: `npm test`, `npm run typecheck`, `npm run build` завершились с exit code `0`.
- CLI smoke на текущем репозитории выполнен 3 сценариями (B1/B2/B3); все завершились exit code `0` и “✅ No warnings.”; файлы отчётов созданы в `out/ux-audit/`.
- Детерминизм (2 прогона одного сценария `--full-signals`): SHA256 совпал; вердикт `identical`.
- Основные UX-наблюдения (pain points) связаны с: двусмысленностью “entrypoints” (в summary vs inline-markers), бюджетными усечениями списков (нужно помнить контекст budgeted/full), и “шумом” в `npm test` выводе из негативных кейсов (stderr с `Error:` при общем PASS).

## 2) Что запускал (команды + статус)

### 2.1 Версии среды

```powershell
node -v
npm -v
```

- Exit: `0`
- Output (фрагмент):
  - `v22.19.0`
  - `11.6.2`

### 2.2 Проверка зависимостей

```powershell
Test-Path node_modules
```

- Exit: `0`
- Output (факт): `node_modules: PRESENT`

### 2.3 Baseline validation

```powershell
npm test
npm run typecheck
npm run build
```

- `npm test`: Exit `0`
  - Output (фрагмент): `Test Files 102 passed (102)`; `Tests 328 passed (328)`
  - Наблюдение: в конце вывода присутствуют строки `stderr ... Error: ...` (из тестов на ошибки), при общем PASS.
- `npm run typecheck`: Exit `0`
  - Output (фрагмент): `tsc --noEmit`
- `npm run build`: Exit `0`
  - Output (фрагмент): `tsc`

## 3) Результаты прогонов CLI (B1/B2/B3)

### 3.1 Help (источник по флагам)

```powershell
node dist/cli/main.js --help
```

- Exit: `0`
- Output (фрагмент):
  - `Usage: mapper [options] [<path>]`
  - `--full-signals      Show all signals, ignoring budget limits`
  - `--focus-file <path> Focus a single repo-relative file for a deep‑dive (use POSIX / separators)`
  - `Contract Telemetry signals are architectural facts.`
  - `Agent interpretation rules are defined in: docs/agent-interpretation.md`

### 3.2 B1 “быстрый обзор”

```powershell
node dist/cli/main.js . --out out/ux-audit/run-B1.quick.md
```

- Exit: `0`
- Файл: `out/ux-audit/run-B1.quick.md` (создан)
- Output (фрагмент из CLI stdout): `✅ Architecture map written to ...run-B1.quick.md` + `✅ No warnings.`
- Наблюдаемые якоря в артефакте (фрагменты из файла):
  - `## AI Preamble — How to Use This Map`
  - `## Entrypoints & Public Surface`
  - `## Graph Hubs (Fan‑in / Fan‑out)`
  - `## Contract coverage`
  - В дереве присутствуют inline-markers, включая `(→ ENTRYPOINT)` и `(i ORPHAN)` (пример: `PROJECT_ANAMNESIS.report.md (i ORPHAN)`).

### 3.3 B2 “полный аудит сигналов”

```powershell
node dist/cli/main.js --full-signals . --out out/ux-audit/run-B2.full-signals.md
```

- Exit: `0`
- Файл: `out/ux-audit/run-B2.full-signals.md` (создан)
- Output (фрагмент из CLI stdout): `✅ Architecture map written to ...run-B2.full-signals.md` + `✅ No warnings.`
- Наблюдение: `--full-signals` увеличивает объём артефакта (факт по размеру файла относительно B1).
- Пример ORPHAN в дереве (фрагмент строки из файла): `PROJECT_ANAMNESIS.report.md (i ORPHAN)` (как объект скана, не как доказательство UX).

### 3.4 B3 “фокус на одном файле”

Выбранный файл: `src/cli/run.ts` (repo-relative, POSIX separators).

```powershell
node dist/cli/main.js --focus-file src/cli/run.ts --focus-depth 1 . --out out/ux-audit/run-B3.focus-file.md
```

- Exit: `0`
- Файл: `out/ux-audit/run-B3.focus-file.md` (создан)
- Output (фрагмент из CLI stdout): `✅ Architecture map written to ...run-B3.focus-file.md` + `✅ No warnings.`
- Наблюдаемые секции deep-dive (фрагменты из файла):
  - `(i VIEW: task capsule, focus=src/cli/run.ts, depth=1)`
  - `## Focused Deep-Dive`
  - `### Contract Telemetry` со статусом и inbound/outbound anchors
  - Списки `← Importers` и `→ Imports`, с сообщениями `Truncated by budget; rerun with --full-signals (+X more).`
  - `## Impact Path` с фразой: `No PUBLIC-API reachable from src/cli/run.ts.`

## 4) Детерминизм (2-run check)

### 4.1 Сценарий

Один и тот же сценарий запущен 2 раза:

```powershell
node dist/cli/main.js --full-signals . --out out/ux-audit/det-run-1.md
node dist/cli/main.js --full-signals . --out out/ux-audit/det-run-2.md
```

- Exit: оба раза `0`

### 4.2 Метод сравнения

SHA256:

- `det-run-1 SHA256=C4E200AC8388B4949F3C4DA18D4880900845E1F182E2AE3A7110C8A4AB4B9A21`
- `det-run-2 SHA256=C4E200AC8388B4949F3C4DA18D4880900845E1F182E2AE3A7110C8A4AB4B9A21`

### 4.3 Вердикт

`identical` (hash совпал; diff не потребовался).

## 5) Pain Points (факты + примеры)

### 5.1 Навигация (entrypoints/public api/hubs)

- Pain: Термин “entrypoint” в артефакте встречается в двух уровнях с разной семантикой, что заставляет агента проверять “что именно считается entrypoint” для навигации.
- Где проявилось:
  - Summary: `## Entrypoints & Public Surface` в `out/ux-audit/run-B1.quick.md` (видны 2 entrypoints: `src/resolver/index.ts`, `src/cli/main.ts` в первых ~80 строках).
  - Inline-markers в дереве: большое число строк с `(→ ENTRYPOINT)` (включая test-файлы). Факт: по `rg` найдено `102` совпадения `(→ ENTRYPOINT)` в `out/ux-audit/run-B1.quick.md`.
- Почему боль для агента: рекомендация preamble “Start from (→ ENTRYPOINT) files” требует уточнения, идти ли по summary-entrypoints или по множеству inline-entrypoints.
- Минимальный пример (фрагмент вывода):
```text
### Entrypoints
- `src/resolver/index.ts` [PROD] – fan-in is 0, imports others
- `src/cli/main.ts` [PROD] – fan-in is 0, imports others
```
и (inline в дереве, тесты как ENTRYPOINT):
```text
│   ├── cli_smoke.test.ts (→ ENTRYPOINT) (←0 →1)
│   ├── cli_utf8_output.test.ts (→ ENTRYPOINT) (←0 →1)
│   ├── contract_telemetry_compute.test.ts (→ ENTRYPOINT) (←0 →2)
```

### 5.2 Task capsule / focus (контекст достаточен ли для безопасной правки)

- Pain: В focus-view списки importers/deps могут быть усечены бюджетом, из-за чего “blast radius” виден частично без явного перехода в full view.
- Где проявилось: `out/ux-audit/run-B3.focus-file.md` в секциях `← Importers` и `## Local Dependencies (Budgeted)` с повторяющимися сообщениями усечения.
- Почему боль для агента: при оценке риска изменения hub-файла агенту приходится помнить, что список неполный, и делать ещё один прогон с `--full-signals` как обязательный шаг для уверенности.
- Минимальный пример:
```text
- `←` Importers (repo-local): `src/cli/index.ts`, `test/budget_profiles_contract.test.ts`, ...
Truncated by budget; rerun with --full-signals (+6 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
```

### 5.3 Сигналы (помогают/шумят/непонятны)

- Pain: ORPHAN сигнал в дереве поднимается на файлы, которые не являются кодом (например артефакты/доки), и без `--show-orphans` (в этом запуске флаг не использовался) агент получает “ORPHAN guidance” как глобальное правило, но конкретный смысл “эквивалент в вашем проекте” остаётся общим.
- Где проявилось:
  - ORPHAN guidance присутствует в preamble (`out/ux-audit/run-B1.quick.md`, `out/ux-audit/run-B2.full-signals.md`, `out/ux-audit/run-B3.focus-file.md`).
  - В дереве обнаружены строки вида `PROJECT_ANAMNESIS.report.md (i ORPHAN)` (например в `out/ux-audit/run-B1.quick.md` и `out/ux-audit/run-B2.full-signals.md`).
- Почему боль для агента: приоритетность сигналов задаёт “(!) → (?) → (i) → (→)”, но ORPHAN как `(i)` может восприниматься как важный навигационный маркер; при этом для документов/артефактов агенту нужен отдельный “что делать дальше” (например, игнорировать при правках кода vs учитывать при публичной поверхности).
- Минимальный пример:
```text
### ORPHAN guidance
- ORPHAN means "no repo-local importers" (or the equivalent in your project).
- ORPHAN is not automatically safe; check PUBLIC-API / ENTRYPOINT / deep-dive before assuming low risk.
...
├── PROJECT_ANAMNESIS.report.md (i ORPHAN)
```

### 5.4 Контракты (где хотелось правила интерпретации рядом)

- Pain: CLI help явно отправляет к `docs/agent-interpretation.md` как к “rules”, но артефакт (B1/B2/B3) не содержит ссылку на это как на обязательный шаг, и агенту приходится переключаться между help/доками/артефактом.
- Где проявилось: stdout `node dist/cli/main.js --help`.
- Почему боль для агента: правила интерпретации вынесены наружу, а агент обычно работает из артефакта `ARCHITECTURE.md` как единого контекста.
- Минимальный пример:
```text
Agent interpretation rules are defined in:
    docs/agent-interpretation.md
```

### 5.5 Бюджеты (truncation мешает/помогает)

- Pain: В артефакте есть одновременно “Budgeted lists may be truncated” (в preamble) и многочисленные локальные `Truncated by budget...`. Для агента это создаёт постоянную необходимость проверять, где именно “могут быть пропуски”.
- Где проявилось: `out/ux-audit/run-B1.quick.md` и особенно `out/ux-audit/run-B3.focus-file.md` (много повторов).
- Почему боль для агента: легко потерять состояние “я уже в full-signals или ещё в budgeted”, особенно при цитировании фрагментов артефакта в последующих шагах.
- Минимальный пример:
```text
Budgeted lists may be truncated; use --full-signals to disable budgets and show full lists.
...
Truncated by budget; rerun with --full-signals (+20 more).
```

### 5.6 Ошибки/edge cases (сообщения подсказывают ли следующий шаг)

- Pain: `npm test` вывод содержит `stderr ... Error: ...` даже при общем PASS (негативные тесты на валидаторы аргументов CLI), что может выглядеть как “сломано” при поверхностном просмотре логов агентом.
- Где проявилось: вывод `npm test` (фрагмент в конце запуска).
- Почему боль для агента: агент часто воспринимает `Error:` как сигнал остановки, особенно без финального контекста о PASS/expected-failure.
- Минимальный пример:
```text
Error: output path provided both as --out and as a positional argument. Use --out only.
Error: too many positional arguments. Usage: [<root>] [<out>]
```

## 6) Wish-list (без реализации)

1. Хочу/нужно, чтобы различие между summary-entrypoints и inline `(→ ENTRYPOINT)` было явно проговорено рядом с “Navigation Strategy”, потому что сейчас агенту приходится проверять на практике, где “правильный старт”.
2. Хочу/нужно, чтобы артефакт явно маркировал, “budgeted” он или “full-signals”, потому что при чтении фрагментов легко потерять контекст усечений.
3. Хочу/нужно, чтобы focus-view давал более явный индикатор “список неполный” одним местом (сводкой), потому что повторяющиеся `Truncated by budget...` размазывают внимание.
4. Хочу/нужно, чтобы было ближе/встроено правило интерпретации “Contract Telemetry signals are architectural facts” (и где именно находятся правила интерпретации), потому что сейчас это видно в help, но не обязательно “в руках” при чтении артефакта.
5. Хочу/нужно, чтобы “ORPHAN guidance” уточняло, как интерпретировать ORPHAN для не-кодовых файлов (docs/артефакты), потому что текущая формулировка абстрактна (“or the equivalent in your project”).
6. Хочу/нужно, чтобы выходной артефакт фиксировал provenance “какой командой и какими флагами получен этот файл”, потому что иначе агенту приходится восстанавливать параметры запуска по косвенным признакам.
7. Хочу/нужно, чтобы сообщения об ожидаемых ошибках (валидаторы CLI аргументов) были проще отличимы от настоящих падений при чтении логов `npm test`, потому что `Error:` в stderr может триггерить ложную тревогу у агента.

## 7) Next minimal step (1 пункт)

Проверить UX ветки ошибок CLI “руками агента” на реальном репозитории: прогнать `node dist/cli/main.js --focus-file <bad-path> .` и `--focus-depth -1`, зафиксировать exit code и текст ошибки из stdout/stderr (насколько следующий шаг понятен из сообщения).

