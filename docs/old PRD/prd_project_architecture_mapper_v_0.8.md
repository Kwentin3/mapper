# Project Architecture Mapper — PRD v0.8.2

**Статус:** Finalized for Release  \
**Версия:** 0.8.2  \
**Фокус версии:** детерминизм, global analysis, noise control, AST-first parsing, LLM-oriented mental map, monorepo support, explicit heuristics

<!-- Generated specification version: prd-v0.8 -->

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
   1. [Для кого](#21-для-кого)
   2. [Боль](#22-боль)
3. [What This Tool Is / Is Not](#3-what-this-tool-is--is-not)
4. [Core Concept: Architecture Context Artifact](#4-core-concept-architecture-context-artifact)
5. [Deterministic Output Guarantee (Invariant)](#5-deterministic-output-guarantee-invariant)
6. [Global Analysis → Local Rendering (Invariant)](#6-global-analysis--local-rendering-invariant)
7. [Output Format](#7-output-format)
   1. [Base Tree Format](#71-base-tree-format)
   2. [Header Summary Blocks](#72-header-summary-blocks)
8. [Signals Model](#8-signals-model)
   1. [Structural Risks `(!)`](#81-structural-risks-)
   2. [Heuristic Hints `(? )`](#82-heuristic-hints-)
   3. [Context Signals `(i)`](#83-context-signals-i)
   4. [Navigation Signals `(→)`](#84-navigation-signals-)
9. [Signal Budgeting & Noise Control](#9-signal-budgeting--noise-control)
10. [Default Heuristic Thresholds](#10-default-heuristic-thresholds)
11. [Smart Collapse Principle](#11-smart-collapse-principle)
12. [Alias Resolution](#12-alias-resolution)
13. [Parsing Strategy — AST-first](#13-parsing-strategy--ast-first)
    1. [Dynamic Import Policy](#131-dynamic-import-policy)
    2. [Entrypoints & Public Surface Detection](#132-entrypoints--public-surface-detection)
14. [Architecture Profiles](#14-architecture-profiles)
    1. [Default Profile](#141-default-profile)
    2. [Built-in Profiles](#142-built-in-profiles)
    3. [Monorepo Profile](#143-monorepo-profile)
    4. [Custom Config](#144-custom-config)
    5. [Boundary Hints (LLM-friendly)](#145-boundary-hints-llm-friendly)
15. [Error Recovery Strategy](#15-error-recovery-strategy)
16. [AI Preamble — How to Use This Map](#16-ai-preamble--how-to-use-this-map)
17. [Diff-first Use Cases](#17-diff-first-use-cases)
18. [Performance Constraints](#18-performance-constraints)
19. [Future Plans: Agentic CLI Protocol](#19-future-plans-agentic-cli-protocol)
20. [Non-Goals](#20-non-goals)
21. [Summary](#21-summary)

---

## 1. Executive Summary

**Project Architecture Mapper** — автоматический инструмент, генерирующий **Architecture Context Artifact** (`ARCHITECTURE.md`): компактную, детерминированную и LLM-friendly ментальную карту кодовой базы.

Инструмент предназначен для *планирования, навигации и безопасного рефакторинга*. Он не анализирует бизнес-семантику и не навязывает архитектурные правила — он управляет вниманием.

---

## 2. Problem Statement

### 2.1 Для кого

- разработчики, использующие AI-кодовых агентов;
- Tech Lead / Architects;
- команды с diff-first процессом.

### 2.2 Боль

1. LLM не удерживает целостную картину проекта без структурного контекста.
2. Существующие инструменты либо слишком шумные, либо не LLM-friendly.
3. Архитектурные знания теряются и не воспроизводимы.

---

## 3. What This Tool Is / Is Not

### 3.1 This tool **IS**

- генератор архитектурного контекста;
- инструмент навигации и приоритизации;
- эвристический анализ import/export зависимостей;
- база для diff-first проверок.

### 3.2 This tool **IS NOT**

- ❌ линтер или enforcement;
- ❌ семантический анализ;
- ❌ автоматический рефакторинг;
- ❌ доказательство корректности.

---

## 4. Core Concept: Architecture Context Artifact

`ARCHITECTURE.md` — это *ментальная карта проекта*, предназначенная для чтения целиком человеком и LLM **до** анализа исходников.

---

## 5. Deterministic Output Guarantee (Invariant)

При неизменной кодовой базе вывод обязан быть **бит-в-бит идентичным**.

Детерминизм обеспечивается:
- фиксированными порогами эвристик;
- стабильной сортировкой всех сущностей;
- отсутствием nondeterministic traversal.
- кодировка UTF‑8 без BOM гарантирует корректное отображение Unicode глифов (→, ├──, └──) и отсутствие заменных символов.

---

## 6. Global Analysis → Local Rendering (Invariant)

Анализ всегда выполняется глобально и полностью **до** применения фильтров.

Rendering не имеет права скрывать архитектурные сигналы, влияющие на видимую область.

---

## 7. Output Format

### 7.1 Base Tree Format

- Markdown tree (`├──`, `└──`);
- локальные импорты;
- сигналы inline.

### 7.2 Header Summary Blocks

В начале файла выводятся два summary-блока (top-N):

- **Entrypoints & Public Surface**
- **Graph Hubs (Fan-in / Fan-out)**

---

## 8. Signals Model

### 8.1 Structural Risks `(!)`

- `CYCLE`
- `LAYER-BREACH`
- `CROSS-PACKAGE-DEPENDENCY`

### 8.2 Heuristic Hints `(? )`

- `BIG`
- `GOD-MODULE`
- `DEEP-PATH`
- `BARREL-HELL`
- `DYNAMIC-IMPORT`
- `PARSE-ERROR`

### 8.3 Context Signals `(i)`

- `HIGH-CHURN`
- `STALE`
- `ORPHAN`

### 8.4 Navigation Signals `(→)`

- `ENTRYPOINT`
- `PUBLIC-API`
- `HUB`

---

## 9. Signal Budgeting & Noise Control

Все сигналы подлежат budget-ограничениям (top-N) по умолчанию.

Флаг `--full-signals` расширяет лимиты, не нарушая детерминизм.

---

## 10. Default Heuristic Thresholds

| Signal | Threshold | Rationale |
|------|----------|-----------|
| BIG | >300 LOC | Upper bound of comfortable review |
| GOD-MODULE | >15 fan-in | Cognitive load limit |
| DEEP-PATH | >3 | Readability threshold |
| BARREL-HELL | >10 exports | Loss of module identity |

Все пороги являются частью профиля и обязательны для детерминизма.

---

## 11. Smart Collapse Principle

**Show problems, hide boring structure.**

---

## 12. Alias Resolution

Приоритет разрешения алиасов:

1. `tsconfig.json`
2. `package.json` (`imports` / `exports`)
3. эвристики по умолчанию

---

## 13. Parsing Strategy — AST-first

AST используется только для import/export анализа.

### 13.1 Dynamic Import Policy

Dynamic imports:
- игнорируются по умолчанию;
- могут помечаться как `(? DYNAMIC-IMPORT)`;
- не резолвятся семантически.

### 13.2 Entrypoints & Public Surface Detection

Эвристики:
- `package.json`: `main`, `exports`, `bin`;
- типовые bootstrap-файлы;
- barrel index и re-export hubs.

---

## 14. Architecture Profiles

### 14.1 Default Profile

Structure-agnostic.

### 14.2 Built-in Profiles

- `fsd`

### 14.3 Monorepo Profile

- единый `ARCHITECTURE.md` на репозиторий;
- packages как top-level nodes;
- cross-package imports → `(! CROSS-PACKAGE-DEPENDENCY)`.

### 14.4 Custom Config

JSON / YAML / JS:
- thresholds;
- aliases;
- exclusions;
- layer rules.

### 14.5 Boundary Hints (LLM-friendly)

Boundary hints — навигационная легенда, не enforcement.

---

## 15. Error Recovery Strategy

- AST parse error → skip file + `(? PARSE-ERROR)`;
- circular aliases → break on heuristic level;
- invalid config → fallback to default profile.

---

## 16. AI Preamble — How to Use This Map

**Navigation Strategy:**
1. Start from `(→ ENTRYPOINT)`
2. Follow `(↗ FAN-OUT)` hubs
3. Avoid `(!)` paths during refactoring

**Signal Priority:**
- `(!)` blocking risks
- `(? )` code smells
- `(→)` navigation hints

**Safe Zones:**
- ORPHAN modules
- files without incoming edges

---

## 17. Diff-first Use Cases

- before / after refactor;
- PR review;
- regression detection.

---

## 18. Performance Constraints

v0.8 prioritizes correctness and determinism over speed.

---

## 19. Future Plans: Agentic CLI Protocol

LLM-driven exploration via `--focus`, `--depth`, `--profile`.

---

## 20. Non-Goals

- ❌ семантический анализ;
- ❌ data-flow / call-graph;
- ❌ enforcement архитектуры.

---

## 21. Summary

PRD v0.8 формализует архитектурный маппер как детерминированный, LLM-ориентированный инструмент навигации и планирования, готовый к непосредственной имплементации.

