# Layer Violation Audit (Agent Perspective)

## 1) Executive summary

- Текущие артефакты маппера описывают **dependency graph** (importers/imports, hubs, entrypoints, truncation) и явно предупреждают, что “signals are heuristic … not formal verification” (`.tmp/nav-doctrine/ARCH.budgeted.md`).
- В CLI help отсутствуют флаги/секция, которые бы описывали **permission graph** или правила слоёв; help фокусируется на путях/фокусе/бюджетах/ORPHAN/контрактной телеметрии (`.tmp/nav-doctrine/cli-help.txt`).
- Агент по умолчанию выводит “слои” **неявно** из структуры путей (`src/cli`, `src/render`, `src/pipeline`, `test`, `docs`, `scripts`) и маркеров `[PROD]/[TEST]` (Project Tree + summary) без явных границ разрешённости (`.tmp/nav-doctrine/ARCH.budgeted.md`, `.tmp/nav-doctrine/ARCH.focus.md`).
- PDR v0.9 фиксирует, что “Layer Violation Detection” перенесён ближе и размещён на roadmap (v0.9.2/v1.0), но в текущем help/артефакте нет отдельного слоя-правила/сигнала с таким названием (`docs/prd_project_architecture_mapper_v_0.9.md`).
- В результате “dependency graph ≠ permission graph” остаётся **ментальным правилом агента**, а не сигналом/контрактом артефакта: агент склонен считать “разрешено”, если не видит явного STOP cue (допущение из промта).
- Ниже зафиксированы 5 типовых сценариев, где агент, опираясь на карту, может “честно” сделать cross-layer шаг без остановки, потому что карта показывает “видно/связано”, но не говорит “можно/нельзя”.

## 2) Implicit layers inferred by agent

Формат: Layer ID = путь/группа, которую агент выводит из дерева; это **инференция агента**, не заявленный контракт.

| Layer ID | Inferred boundary (agent view) | Evidence in artifacts |
|---|---|---|
| L-src/cli | Всё под `src/cli/` как “CLI слой” | `## Project Tree` содержит `src/cli/...` (`.tmp/nav-doctrine/ARCH.focus.md`), summary Entrypoints содержит `src/cli/main.ts` `[PROD]` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-src/pipeline | `src/pipeline/` как “оркестрация/пайплайн” | Tree: `src/pipeline/run_pipeline.ts [HUB]` (`.tmp/nav-doctrine/ARCH.focus.md`); Local Dependencies показывает `src/cli/run.ts → src/pipeline/run_pipeline.ts` (`.tmp/nav-doctrine/ARCH.focus.md`). |
| L-src/render | `src/render/` как “рендер артефакта” | Local Dependencies: `src/render/index.ts → src/render/preamble.ts`, `src/render/render_architecture_md.ts`, `src/render/render_summary.ts` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-src/signals | `src/signals/` как “сигналы/классификация” | Local Dependencies: `src/signals/index.ts → src/signals/compute_signals.ts ...` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-src/utils | `src/utils/` как “общие утилиты” | Graph Hubs: `src/utils/determinism.ts [PROD] [HUB]` (`.tmp/nav-doctrine/ARCH.budgeted.md`); Local Dependencies показывает входящие из разных папок (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-test | Всё под `test/` как “test слой” | Tree: `test/*.test.ts (→ ENTRYPOINT)` (`.tmp/nav-doctrine/ARCH.focus.md`); AI Preamble различает summary `[PROD]` и inline `(→ ENTRYPOINT)` на `[TEST]` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-docs | Всё под `docs/` как “документация/контракты” | Tree перечисляет `docs/...` включая `prd_project_architecture_mapper_v_0.9.md`, `agent-interpretation.md` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| L-scripts | Всё под `scripts/` как “скрипты/инфра” | Tree: `scripts/clean_artifacts.js (? DYNAMIC-IMPORT) (i ORPHAN)` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |

## 3) Simulated agent violations (scenarios)

Дальше: “что dependency graph позволяет” = что агент видит как существующую связность/доступность путей и отсутствие запрета в help/preamble/доктрине; это не утверждение о policy.

### S1) CLI тянет render напрямую

- Scenario: в `src/cli/run.ts` агент добавляет импорт из `src/render/index.ts` чтобы “сразу отрендерить”.
- Agent assumption: “оба модуля в `src/`, значит перенос/импорт допустим”.
- What dependency graph shows/allows: в карте нет слоя-разделителя; `src/cli/run.ts` уже импортирует `src/pipeline/run_pipeline.ts` (`## Focused Deep-Dive` показывает `→ Imports: src/pipeline/run_pipeline.ts`) (`.tmp/nav-doctrine/ARCH.focus.md`).
- Potential layer violation: смешение “CLI” и “render” как неявных слоёв (L-src/cli ↔ L-src/render).
- Why agent wouldn’t stop: в CLI help/AI Preamble нет STOP cue вида “cross-layer запрещён”; preamble говорит про HUB/ORPHAN/heuristics, но не про разрешённость импортов (`.tmp/nav-doctrine/cli-help.txt`, `.tmp/nav-doctrine/ARCH.budgeted.md`).

### S2) Pipeline тянет render/budgets “для логирования/форматирования”

- Scenario: агент добавляет импорт из `src/render/format.ts` или `src/render/budgets.ts` в `src/pipeline/run_pipeline.ts`.
- Agent assumption: “раз есть общий граф и всё статически анализируется, то технически можно”.
- What dependency graph shows/allows: `src/render/render_architecture_md.ts` уже импортирует `src/render/format.ts` и `src/render/budgets.ts` (Local Dependencies) (`.tmp/nav-doctrine/ARCH.budgeted.md`).
- Potential layer violation: смешение L-src/pipeline ↔ L-src/render.
- Why agent wouldn’t stop: карта показывает существующие ребра внутри `src/render`, но не обозначает зависимости на модули из `src/render/*` как запрещённые для `src/pipeline/*`.

### S3) Прод-код переиспользует test helper

- Scenario: агент вносит изменение так, что `src/*` начинает импортировать `test/helpers/fixture_builder.ts` или `test/helpers/temp_dirs.ts` “чтобы не писать заново”.
- Agent assumption: “в дереве тестовые файлы видны, значит они просто часть репозитория; запрета нет”.
- What dependency graph shows/allows: карта явно показывает тестовые хабы и их связи с `src/utils/determinism.ts` (Local Dependencies: `test/helpers/fixture_builder.ts → src/utils/determinism.ts`) (`.tmp/nav-doctrine/ARCH.budgeted.md`).
- Potential layer violation: L-src/* ↔ L-test (инверсия привычного направления “tests depend on src”).
- Why agent wouldn’t stop: preamble различает `[PROD]/[TEST]` как маркеры summary, но не формулирует разрешённость направлений зависимости между ними (`.tmp/nav-doctrine/ARCH.budgeted.md`).

### S4) Prod-код тянет scripts-утилиту

- Scenario: агент импортирует/переиспользует логику из `scripts/clean_artifacts.js` в `src/*` (например для “очистки/побочных задач”).
- Agent assumption: “скрипт уже в дереве и помечен ORPHAN, значит локально безопасен для reuse”.
- What dependency graph shows/allows: `scripts/clean_artifacts.js` присутствует в `## Project Tree` и помечен `(i ORPHAN)` и `(? DYNAMIC-IMPORT)` (`.tmp/nav-doctrine/ARCH.budgeted.md`).
- Potential layer violation: L-scripts ↔ L-src/* (инфра-скрипт становится зависимостью продукта).
- Why agent wouldn’t stop: ORPHAN guidance в preamble прямо говорит, что ORPHAN “not automatically safe”, но не связывает это с “не использовать как shared dependency” (нет явного STOP cue) (`.tmp/nav-doctrine/ARCH.budgeted.md`).

### S5) “Глобальный util” становится транзитивным мостом между слоями

- Scenario: агент “выносит helper в общий модуль” и кладёт его в `src/utils/…`, после чего его начинают импортировать CLI/pipeline/render/signals.
- Agent assumption: “`src/utils` уже HUB (determinism.ts), значит это правильное место для общего кода”.
- What dependency graph shows/allows: `src/utils/determinism.ts` уже отмечен как `[HUB]` (high fan-in) (`.tmp/nav-doctrine/ARCH.budgeted.md`), а карта не помечает “utils как boundary-only”.
- Potential layer violation: неявное склеивание L-src/cli, L-src/pipeline, L-src/render, L-src/signals через общий util.
- Why agent wouldn’t stop: `[HUB]` в preamble явно “Render-only; not a contract”, то есть сам факт HUB не несёт policy-смысл и не даёт STOP (`.tmp/nav-doctrine/ARCH.budgeted.md`).

## 4) Missing STOP signals

Формат: Context → Expected STOP cue → What exists instead → Drift risk.

| Context | Expected STOP cue (agent expectation) | What exists instead | Drift risk |
|---|---|---|---|
| Cross `src/*` folders (cli ↔ pipeline ↔ render ↔ signals) | Явная формулировка “разрешённые направления зависимостей” | Есть `[HUB]`, сигналы `(!)/(?)`, но они не про policy; help не содержит “layers” секции | Агент смешивает слои ради локальной правки, потому что “запрета не видно”. |
| `src/*` ↔ `test/*` | Явный STOP “prod must not depend on tests” (как permission) | В карте есть маркеры `[PROD]/[TEST]` (summary) и inline `(→ ENTRYPOINT)` на tests, но без правила направлений | Агент путает “видимость тестов” с “допустимостью зависимости на них”. |
| `src/*` ↔ `docs/*` / `scripts/*` | STOP “docs/scripts не являются зависимостями продукта” | ORPHAN/heuristic сигналы и дерево путей; нет policy-границы | Агент использует инфраструктурные файлы как общие модули, потому что они “в проекте и сканируются”. |
| Budgeted view | STOP “в этой точке данных недостаточно” | Есть truncation notice “Truncated by budget; rerun …” | Если агент видит урезанный фрагмент без truncation-строки, он делает выводы о полноте/отсутствии связей. |

## 5) False permission patterns

| Signal or absence | Agent interpretation | Why it’s dangerous (agent-side) | Evidence |
|---|---|---|---|
| “Файл присутствует в Project Tree” | “Раз он в дереве, он часть допустимой области изменений/зависимостей” | Tree отражает скан/видимость, а не policy; permission graph отсутствует | `## Project Tree` показывает `docs/`, `scripts/`, `test/` рядом с `src/` (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| “Есть import edge A → B” | “Значит A имеет право зависеть от B” | Edge показывает факт зависимости (dependency graph), но не “можно” как правило слоёв | Local Dependencies и Focused Deep-Dive показывают `→ Imports`/`← Importers` (`.tmp/nav-doctrine/ARCH.focus.md`). |
| `[HUB]` | “Это центральный модуль, его можно использовать отовсюду” | Preamble прямо говорит: `[HUB]` “not a contract”; HUB не равен “официальная точка зависимости” | AI Preamble: “[HUB] … Render-only; not a contract …” (`.tmp/nav-doctrine/ARCH.budgeted.md`). |
| Отсутствие сигнала “запрещено” | “Раз нет STOP, значит разрешено” | Это данное допущение агента из промта; текущие тексты его не опровергают правилами слоёв | В help/preamble нет layer-permission секций; PDR лишь размещает “Layer Violation Detection” на roadmap (`.tmp/nav-doctrine/cli-help.txt`, `.tmp/nav-doctrine/ARCH.budgeted.md`, `docs/prd_project_architecture_mapper_v_0.9.md`). |

## 6) Minimal guardrail vocabulary (agent thinking, no enforcement)

Набор терминов, которых агенту не хватает как “языка мышления” для различения “видно” vs “можно”:

1. permission graph
2. visibility vs permission
3. cross-layer dependency
4. one-way boundary
5. test-only dependency
6. boundary crossing
7. adapter-only access
8. allowed-by-graph vs allowed-by-policy

## 7) Next minimal step (audit-only)

Сделать “diff-аудит контекста” на одном реальном изменении: выбрать файл `[HUB]` (например `src/cli/run.ts` или `src/pipeline/run_pipeline.ts`) и зафиксировать, какие cross-folder импорты агент бы добавил “по умолчанию” при локальной задаче, и какие STOP cues он пытался бы найти в help/preamble/доках (без внесения изменений).
