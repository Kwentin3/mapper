# PROJECT ANAMNESIS — Current State (Factual)

## 1) Executive Summary

1. Канонические источники в этом анамнезе ограничены документами в `docs/` (PRD/PDR/ADR, манифесты, контракты, DEV_GUIDE), справкой CLI (`--help`) и фактической структурой `src/` и `docs/` (см. “Что НЕ входит”).  
2. PDR v0.9 фиксирует неуступаемые инварианты: детерминизм, только статический анализ (без runtime/исполнения), graph-first архитектуру, запрет на мутацию core graph в derived views, и LLM-friendly вывод с контролируемыми бюджетами. (`docs/prd_project_architecture_mapper_v_0.9.md:78-85`)
3. DEV_GUIDE декларирует пайплайн `scan → parser → resolver → graph → signals → derived views → render` и указывает на приоритет детерминизма (stable sort, POSIX пути, запрет на нестабильные факторы). (`docs/DEV_GUIDE.md:5-15`, `docs/DEV_GUIDE.md:37-41`, `docs/DEV_GUIDE.md:58-63`)
4. Контракт рендера дерева вынесен в документ: `buildTreePrefix(ancestryIsLast: boolean[], nodeIsLast: boolean): string`, фиксированы глифы и правила детерминизма (в т.ч. сортировки, запрет `Object.keys(..)` без сортировки). (`docs/RENDER_CONTRACTS.md:11-16`, `docs/RENDER_CONTRACTS.md:45-55`, `docs/RENDER_CONTRACTS.md:59-65`)
5. ADR утверждает запрет на эмиссию глифов дерева вне `buildTreePrefix` и обязательность использования builder для всех строк дерева. (`docs/adr/ADR-000X-tree-rendering-contract.md:11-23`)
6. AGENT_MANIFEST и TEST_POLICY_MANIFEST задают режимы MODE и STOP-сигналы (в т.ч. `STOP_CONTRACT_REQUIRED`, `STOP_MODE_MISMATCH`, `STOP_NON_HERMETIC`) и определяют иерархию приоритетов документов. (`docs/AGENT_MANIFEST.md:31-53`, `docs/test_policy_manifest.md:9-14`, `docs/test_policy_manifest.md:209-214`)

## 2) Канон и инварианты

### 2.1 Зафиксированные архитектурные инварианты

- Детерминизм “across OS, machines, and runs”. (`docs/prd_project_architecture_mapper_v_0.9.md:78-85`)
- Только статический анализ: “Static analysis only (no runtime, no execution)”. (`docs/prd_project_architecture_mapper_v_0.9.md:78-85`)
- Graph-first архитектура. (`docs/prd_project_architecture_mapper_v_0.9.md:78-85`)
- Derived views не должны мутировать core graph: “Derived views MUST NOT mutate the core graph”. (`docs/prd_project_architecture_mapper_v_0.9.md:83`)
- Контролируемые бюджеты вывода: “LLM-friendly output with controlled token budgets”. (`docs/prd_project_architecture_mapper_v_0.9.md:84-85`)

### 2.2 Детерминизм (правила и “недопустимые факторы”)

- Требование стабильных сортировок и POSIX-нормализации путей (DEV_GUIDE). (`docs/DEV_GUIDE.md:23-24`, `docs/DEV_GUIDE.md:37-41`, `docs/DEV_GUIDE.md:42-45`)
- Список факторов, которые “может нарушить детерминизм”: нестабильный порядок итерации, системное время, платформозависимые пути, сетевые запросы. (`docs/DEV_GUIDE.md:52-57`)
- “Недопустимые факторы (не использовать в рендере/сигналах)”: mtime/ctime, нестабильный порядок ФС без сортировки, платформозависимые пути без нормализации, внешние/сетевые вызовы влияющие на результат анализа. (`docs/DEV_GUIDE.md:58-63`)
- Нормализация путей в POSIX сразу после сканирования: “All paths MUST be normalized to POSIX format (`/`) immediately after scanning.” (`docs/prd_project_architecture_mapper_v_0.9.md:153-170`)

### 2.3 Жёсткие запреты (Hard / Blocking)

- Запрет на “invent behavior/APIs/contracts” и ослабление тестов под текущую реализацию (AGENT_MANIFEST). (`docs/AGENT_MANIFEST.md:7-15`, `docs/AGENT_MANIFEST.md:102-106`)
- Hermetic unit tests: “no DB, no network, no external services”; также “No sleeps”. (`docs/test_policy_manifest.md:18-25`, `docs/test_policy_manifest.md:157-161`)
- Запрет “fictional APIs” и требование подтверждать существование символа перед использованием/моком. (`docs/AGENT_MANIFEST.md:115-118`, `docs/test_policy_manifest.md:23-24`, `docs/test_policy_manifest.md:51-55`)
- Для control-flow примитивов: mock должен вызывать callback и вернуть результат; mock, пропускающий callback, объявлен невалидным. (`docs/AGENT_MANIFEST.md:110-113`, `docs/test_policy_manifest.md:37-40`)
- Render tree glyphs: “No code outside `buildTreePrefix` may emit the glyphs `│`, `├──`, or `└──`.” (`docs/adr/ADR-000X-tree-rendering-contract.md:19-23`)

### 2.4 Принятые решения (ADR / PDR), считающиеся “законом”

- ADR-000X: единый канонический builder `buildTreePrefix(...)`; все строки дерева обязаны получать префикс через него; запрет эмитить глифы вне builder. (`docs/adr/ADR-000X-tree-rendering-contract.md:11-23`)
- PDR v0.9 фиксирует инварианты и пометку об обязательной “amendment” при нарушении: “If a future change violates this PDR, it MUST include an explicit amendment.” (`docs/prd_project_architecture_mapper_v_0.9.md:389-396`)
- PDR v0.9: порядок сигналов в рендере (группы и алфавитная сортировка внутри группы). (`docs/prd_project_architecture_mapper_v_0.9.md:277-286`)
- PDR v0.9: “Test linkage” определяется только по import-graph и явно не является coverage/branch metrics/runtime execution. (`docs/prd_project_architecture_mapper_v_0.9.md:223-244`)
- PDR v0.9: доменные сигналы (1C/OData) “NOT part of core”; зарезервированы для profiles/plugins. (`docs/prd_project_architecture_mapper_v_0.9.md:336-346`)

## 3) Реализовано vs задекларировано

> Примечание: метка `[REAL]` в этом разделе основана на фактическом наличии директорий/файлов в `src/` и/или на работающем CLI `--help`. Внутреннее поведение кода не анализировалось (см. “Что НЕ входит”).

### 3.1 [REAL] (наблюдаемые компоненты)

- [REAL] CLI: наличие `src/cli/` (`src/cli/index.ts`, `src/cli/main.ts`, `src/cli/run.ts`) и доступная справка `node dist/cli/main.js --help` (см. раздел 4.3). (`src/cli/index.ts`, `src/cli/main.ts`, `src/cli/run.ts`)
- [REAL] Pipeline orchestration: `src/pipeline/run_pipeline.ts`. (`src/pipeline/run_pipeline.ts`)
- [REAL] Scanner: `src/scanner/` (`excludes.ts`, `scan.ts`, `types.ts`, `index.ts`). (`src/scanner/excludes.ts`, `src/scanner/scan.ts`, `src/scanner/types.ts`, `src/scanner/index.ts`)
- [REAL] Parser: `src/parser/` (`ast_parser.ts`, `parse_file.ts`, `regex_fallback.ts`, `types.ts`, `index.ts`). (`src/parser/ast_parser.ts`, `src/parser/parse_file.ts`, `src/parser/regex_fallback.ts`, `src/parser/types.ts`, `src/parser/index.ts`)
- [REAL] Resolver: `src/resolver/` (`resolve_specifier.ts`, `read_tsconfig.ts`, `read_package_json.ts`, `types.ts`, `index.ts`). (`src/resolver/resolve_specifier.ts`, `src/resolver/read_tsconfig.ts`, `src/resolver/read_package_json.ts`, `src/resolver/types.ts`, `src/resolver/index.ts`)
- [REAL] Graph: `src/graph/` (`build_graph.ts`, `types.ts`, `index.ts`). (`src/graph/build_graph.ts`, `src/graph/types.ts`, `src/graph/index.ts`)
- [REAL] Signals: `src/signals/` (compute, policies, types, ranking, filtering). (`src/signals/compute_signals.ts`, `src/signals/compute_contract_telemetry.ts`, `src/signals/policies.ts`, `src/signals/types.ts`, `src/signals/rank.ts`, `src/signals/filter.ts`, `src/signals/index.ts`)
- [REAL] Render: `src/render/` (в т.ч. `render_architecture_md.ts`, `render_tree.ts`, `smart_collapse.ts`, `budgets.ts`). (`src/render/render_architecture_md.ts`, `src/render/render_tree.ts`, `src/render/smart_collapse.ts`, `src/render/budgets.ts`, `src/render/index.ts`)
- [REAL] Determinism util: `src/utils/determinism.ts`. (`src/utils/determinism.ts`)
- [REAL] Config: `src/config/load.ts`, `src/config/profiles.ts`. (`src/config/load.ts`, `src/config/profiles.ts`)
- [REAL] Contracts (code-level folder exists): `src/contracts/` (`scan_contract_anchors.ts` и др.). (`src/contracts/scan_contract_anchors.ts`, `src/contracts/contract_targeting.ts`, `src/contracts/boundary_targeting.ts`)

### 3.2 [DECLARED] (задекларировано документами; реализация в коде не подтверждалась этим анамнезом)

- [DECLARED] Канонический пайплайн: `scan → parser → resolver → graph → signals → derived views → render`. (`docs/DEV_GUIDE.md:5-6`)
- [DECLARED] Правило: рендер “используется как источник фактов” для людей и кодовых агентов; нестабильность вывода повышает риск неверных рекомендаций/галлюцинаций. (`docs/DEV_GUIDE.md:49-51`)
- [DECLARED] Контракт функции `buildTreePrefix(ancestryIsLast: boolean[], nodeIsLast: boolean): string` и требование использовать её для префикса строки узла. (`docs/RENDER_CONTRACTS.md:11-16`, `docs/RENDER_CONTRACTS.md:33-39`, `docs/adr/ADR-000X-tree-rendering-contract.md:13-23`)
- [DECLARED] Contract Telemetry обозначения `[C+] [C?] [C0] [C~]` (смысл и статус) и утверждение, что “Contract Telemetry signals are architectural facts” (из CLI help). (см. раздел 4.3)
- [DECLARED] “Task Capsule (Scope)” как раздел в AGENT_MANIFEST; правила “no repo-wide scanning / no opportunistic refactors / stop on missing context”. (`docs/AGENT_MANIFEST.md:22-29`)

### 3.3 [DEFERRED] / [PLANNED] (явно помечено в каноне как отложенное/планируемое)

- [DEFERRED] `--as-task-capsule` “explicitly deferred to v1.0”. (`docs/prd_project_architecture_mapper_v_0.9.md:373-384`)
- [PLANNED] Layer-crossing rules “planned (see v0.9.2+), not enforced today.” (`docs/prd_project_architecture_mapper_v_0.9.md:308`)
- [PLANNED] Layer violation detection: v0.9.2 “basic directional rules”; v1.0 “full profile-based semantics”. (`docs/prd_project_architecture_mapper_v_0.9.md:355-365`)

## 4) Контракты и их статус

### 4.1 Контракты рендера (обязательные vs рекомендательные)

- Обязательные инварианты/запреты:
  - “одинаковый вход => одинаковый вывод (бит-в-бит)”, UTF-8, без trailing spaces. (`docs/RENDER_CONTRACTS.md:16`)
  - Канонические глифы и правила построения префикса (ancestry, nodeIsLast). (`docs/RENDER_CONTRACTS.md:45-55`)
  - Детерминизм: сортировки; запрет `Object.keys(..)` без сортировки; pure вычисления влияющие на вывод; UTF-8 без BOM. (`docs/RENDER_CONTRACTS.md:59-65`)
  - ADR-000X: запрет эмитить глифы `│`, `├──`, `└──` вне `buildTreePrefix`; обязательность использования builder для всех строк дерева. (`docs/adr/ADR-000X-tree-rendering-contract.md:19-23`)
- Рекомендательные практики:
  - “Практические рекомендации…” включая чеклист для изменений рендера и предложения про флаг `legacy-glyphs`. (`docs/RENDER_CONTRACTS.md:89-99`, `docs/RENDER_CONTRACTS.md:91-95`)

### 4.2 Контракты тестов (механика и стоп-сигналы)

- Документ тестовой механики: `docs/test_policy_manifest.md` (Scope & Authority). (`docs/test_policy_manifest.md:4-12`)
- Обязательные “Hard Rules (Blocking)” (hermetic, no sleeps, behavior-level assertions, и т.д.). (`docs/test_policy_manifest.md:18-26`)
- STOP-сигналы тестовой политики: `STOP_CONTRACT_REQUIRED`, `STOP_MODE_MISMATCH`, `STOP_NON_HERMETIC`, `STOP_REQUIRE_CONTEXT`. (`docs/test_policy_manifest.md:209-214`)

### 4.3 Контракт CLI (источник истины, флаги, помощь)

- Документ `docs/CLI.md` фиксирует, что “Источник истины для синтаксиса и списка флагов: `mapper --help`”. (`docs/CLI.md:3`)
- CLI help (фактический вывод команды): `node dist/cli/main.js --help` (захвачено в этой среде).  
  - Usage: `mapper [options] [<path>]`.  
  - Назначение: “Generate an Architecture Context Artifact (ARCHITECTURE.md) for the given path.”  
  - Опции включают `--config`, `--profile`, `--budget`, `--focus`, `--focus-file`, `--focus-depth`, `--depth`, `--full-signals`, `--show-orphans`, `--show-temp`, `--out`.  
  - В CLI help определены коды Contract Telemetry `[C+] [C?] [C0] [C~]` и фраза “Contract Telemetry signals are architectural facts.”  
  - В CLI help сказано: “Agent interpretation rules are defined in: docs/agent-interpretation.md”.  

### 4.4 Агентные контракты поведения (MODE/STOP/иерархия)

- MODE, определённые в AGENT_MANIFEST: `MODE=NONCODE`, `MODE=TEST`, `MODE=CODE`, `MODE=FULL` + правило STOP при отсутствии/неясности MODE. (`docs/AGENT_MANIFEST.md:38-45`)
- STOP-сигналы маршрутизации (AGENT_MANIFEST): `STOP_TESTS_REQUIRED`, `STOP_CONTRACT_REQUIRED`, `STOP_MODE_MISMATCH`, `STOP_REQUIRE_CONTEXT`. (`docs/AGENT_MANIFEST.md:47-52`)
- “NO_CONTRACT_NO_CODE (Hard Stop)” и условия STOP_CONTRACT_REQUIRED. (`docs/AGENT_MANIFEST.md:91-101`)

## 5) Агентная модель и режимы

### 5.1 MODE (что существует и что разрешают)

- `MODE=NONCODE` — analysis/docs/planning; “no code changes unless explicitly permitted”. (`docs/AGENT_MANIFEST.md:39-43`)
- `MODE=TEST` — tests only; “do not modify implementation”. (`docs/AGENT_MANIFEST.md:41-43`, `docs/test_policy_manifest.md:29-33`)
- `MODE=CODE` — implementation only; “do not write new tests”. (`docs/AGENT_MANIFEST.md:42-43`)
- `MODE=FULL` — tests first, then implementation, then validation. (`docs/AGENT_MANIFEST.md:43-44`, `docs/AGENT_MANIFEST.md:84-88`)

### 5.2 STOP-сигналы (что определено)

- В AGENT_MANIFEST: `STOP_TESTS_REQUIRED`, `STOP_CONTRACT_REQUIRED`, `STOP_MODE_MISMATCH`, `STOP_REQUIRE_CONTEXT`. (`docs/AGENT_MANIFEST.md:47-52`)
- В TEST_POLICY_MANIFEST добавлен `STOP_NON_HERMETIC` для “non-hermetic requirement for unit tests”. (`docs/test_policy_manifest.md:209-214`)

### 5.3 Иерархия/приоритет документов (что над чем)

- AGENT_MANIFEST задаёт precedence:
  - 1) “Architecture contracts and schemas are the law.”
  - 2) “This manifest defines agent behavior (always in effect).”
  - 3) `docs/test_policy_manifest.md` при наличии “overrides only test mechanics”. (`docs/AGENT_MANIFEST.md:33-37`)
- TEST_POLICY_MANIFEST повторяет precedence в своей области (test mechanics). (`docs/test_policy_manifest.md:9-12`)
- `docs/CLI.md` фиксирует, что источник истины по флагам и синтаксису — `mapper --help`. (`docs/CLI.md:3`)

## 6) Зоны неопределённости

> Это карта “неизвестного” в рамках ограниченных источников. Это не баг-лист.

- Документы `docs/DEV_GUIDE.md` и `docs/RENDER_CONTRACTS.md` ссылаются на файлы в `test/` (например `test/helpers/fixture_builder.ts`, `test/contract_prd_truth_preservation_depth.test.ts`), но в этом анамнезе структура/содержимое `test/` не использовались как источник истины (не входит в разрешённые источники). (`docs/DEV_GUIDE.md:16-19`, `docs/RENDER_CONTRACTS.md:129-131`)
- CLI help утверждает, что “Agent interpretation rules are defined in: docs/agent-interpretation.md”, но `docs/agent-interpretation.md` не входит в список разрешённых источников для этого анамнеза; содержимое и “обязательность” этого файла не оценивались здесь. (см. раздел 4.3)
- PDR v0.9 описывает решения, опирающиеся на `package.json` и `tsconfig.json` как “Accepted Sources (in priority order)” для Public API Surface Detection; фактическая реализация этих правил в коде не проверялась в рамках ограничений (структура `src/` фиксируется, но содержимое файлов не анализировалось). (`docs/prd_project_architecture_mapper_v_0.9.md:94-125`)
- PDR v0.9 содержит планирование по v0.9.2/v1.0 (layer crossing rules, layer violation detection, task capsule mode). Наличие/отсутствие реализации этих пунктов в коде не подтверждалось в рамках этого анамнеза (см. ограничения источников). (`docs/prd_project_architecture_mapper_v_0.9.md:308`, `docs/prd_project_architecture_mapper_v_0.9.md:355-365`, `docs/prd_project_architecture_mapper_v_0.9.md:373-384`)

## 7) Что НЕ входит в анамнез (явно)

- Любые выводы/рекомендации/архитектурные предложения (включая “что улучшить”) — вне scope.
- Любая информация из файлов вне списка разрешённых источников, даже если файлы существуют (например `README.md`, `ARCHITECTURE.md`, `ARCHITECTURE_CONTRACT_COVERAGE.md`, `docs/agent-interpretation.md`, `docs/deploy.md`, `docs/ARCHITECTURE_MAP.md`).
- Содержимое исходников `src/**/*.ts` (кроме факта существования путей в структуре `src/`) не анализировалось как доказательство поведения/семантики.
- Структура и содержимое `test/` не использовались как источник истины (только факт упоминаний в разрешённых документах).
