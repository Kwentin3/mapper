# Project Architecture Mapper — PRD v0.7

**Статус:** Final Planning / Ready for Implementation  \
**Версия:** 0.7  \
**Фокус версии:** детерминизм, global analysis, noise control, AST-first parsing, architecture profiles, *LLM-oriented mental map*

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
   2. [Compactness Rules](#72-compactness-rules)
   3. [Header Summary Blocks](#73-header-summary-blocks)
8. [Signals Model](#8-signals-model)
   1. [Structural Risks `(!)`](#81-structural-risks-)
   2. [Heuristic Hints `(? )`](#82-heuristic-hints-)
   3. [Context Signals `(i)`](#83-context-signals-i)
   4. [Navigation Signals `(→)`](#84-navigation-signals-)
9. [Signal Budgeting & Noise Control](#9-signal-budgeting--noise-control)
10. [Smart Collapse Principle](#10-smart-collapse-principle)
11. [Alias Resolution](#11-alias-resolution)
12. [Parsing Strategy — AST-first](#12-parsing-strategy--ast-first)
    1. [Entrypoints & Public Surface Detection](#121-entrypoints--public-surface-detection)
13. [Architecture Profiles](#13-architecture-profiles)
    1. [Default Profile](#131-default-profile)
    2. [Built-in Profiles](#132-built-in-profiles)
    3. [Custom Config](#133-custom-config)
    4. [Boundary Hints (LLM-friendly)](#134-boundary-hints-llm-friendly)
14. [Diff-first Use Cases](#14-diff-first-use-cases)
15. [AI Preamble (Optional)](#15-ai-preamble-optional)
16. [Future Plans: Agentic CLI Protocol](#16-future-plans-agentic-cli-protocol)
17. [Non-Goals](#17-non-goals)
18. [Summary](#18-summary)

---

## 1. Executive Summary

**Project Architecture Mapper** — это автоматический инструмент, генерирующий **Architecture Context Artifact** (`ARCHITECTURE.md`): компактную, детерминированную и LLM-friendly ментальную карту кодовой базы.

Инструмент предназначен для *планирования и навигации*, а не для доказательства корректности кода. Он помогает человеку и AI-агенту:

- быстро понять структуру проекта;
- увидеть архитектурные риски;
- выбрать безопасный маршрут рефакторинга;
- работать с legacy без загрузки десятков файлов в контекст.

---

## 2. Problem Statement

### 2.1 Для кого

- разработчики, использующие AI-агентов для анализа и рефакторинга;
- Tech Lead / Architects для быстрых архитектурных снимков;
- команды, практикующие diff-first подход в PR.

### 2.2 Боль

1. LLM не удерживает целостную картину проекта без предварительной структуры.
2. Существующие инструменты дают либо JSON-лавину, либо визуальные графы, непригодные как контекст.
3. Архитектурные описания вручную субъективны и не воспроизводимы.
4. Сложно понять, *где начинать чтение кода* и *что трогать опасно*.

---

## 3. What This Tool Is / Is Not

### 3.1 This tool **IS**

- генератор Architecture Context Artifact;
- инструмент навигации и приоритизации внимания;
- эвристический анализ import/export зависимостей;
- основа для архитектурных diff-проверок.

### 3.2 This tool **IS NOT**

- ❌ линтер или enforcement архитектуры;
- ❌ автоматический рефакторинг;
- ❌ семантический или data-flow анализ;
- ❌ истина о корректности программы.

---

## 4. Core Concept: Architecture Context Artifact

`ARCHITECTURE.md` — это файл, который:

- читается целиком человеком и LLM;
- используется **до** чтения исходников;
- задаёт маршрут анализа;
- оптимизирован под токены и внимание.

Это *ментальная карта проекта*, а не технический отчёт.

---

## 5. Deterministic Output Guarantee (Invariant)

При неизменной кодовой базе инструмент обязан генерировать **бит-в-бит идентичный вывод**.

Обязательные условия:

- сортировка директорий, файлов и импортов по алфавиту;
- стабильный порядок сигналов;
- отсутствие nondeterministic traversal и async race.

Любое изменение в `ARCHITECTURE.md` должно отражать реальное изменение проекта или правил анализа.

---

## 6. Global Analysis → Local Rendering (Invariant)

Анализ всегда разделён на два этапа:

### 6.1 Global Analysis Phase

- полный обход проекта;
- построение полного графа зависимостей;
- детекция **всех** сигналов (включая глобальные циклы).

### 6.2 Rendering Phase

- применение `--focus`, `--depth`, smart-collapse;
- скрытие частей структуры **без потери сигналов**;
- если скрытый модуль участвует в сигнале, он отображается как stub.

---

## 7. Output Format

### 7.1 Base Tree Format

- Markdown;
- древовидная структура (`├──`, `└──`);
- локальные зависимости и сигналы.

### 7.2 Compactness Rules

- по умолчанию только локальные импорты;
- top-N импортов на файл;
- `...` для усечённых списков.

### 7.3 Header Summary Blocks

В начале файла добавляются два компактных summary-блока:

**Entrypoints & Public Surface (top-N)**
- `(→ ENTRYPOINT)` — вероятные точки входа;
- `(→ PUBLIC-API)` — публичные поверхности модулей.

**Graph Hubs (top-N)**
- `(↘ FAN-IN)` — узлы с высоким входящим fan-in;
- `(↗ FAN-OUT)` — узлы-оркестраторы.

Summary-блоки строго лимитированы и детерминированы.

---

## 8. Signals Model

Сигналы — это подсказки, а не ошибки.

### 8.1 Structural Risks `(!)`

- `CYCLE` — циклические зависимости;
- `LAYER-BREACH` — нарушение архитектурных границ.

### 8.2 Heuristic Hints `(? )`

- `BIG`, `GOD-MODULE`, `DEEP-PATH`, `BARREL-HELL`.

### 8.3 Context Signals `(i)`

- `HIGH-CHURN`, `STALE`, `ORPHAN`.

### 8.4 Navigation Signals `(→)`

- `ENTRYPOINT` — точка начала чтения;
- `PUBLIC-API` — стабильная поверхность;
- `HUB` — центр графа.

---

## 9. Signal Budgeting & Noise Control

По умолчанию применяется ограничение сигналов:

- показывается top-N;
- остальные агрегируются в summary.

Флаг `--full-signals` снимает лимиты, но не отключает сортировку и детерминизм.

---

## 10. Smart Collapse Principle

**Show problems, hide boring structure.**

- папки без сигналов могут быть схлопнуты;
- путь к проблеме всегда раскрыт;
- `--depth` — мягкое ограничение.

---

## 11. Alias Resolution

Поддерживается эвристический резолвинг:

- `@/* → ./src/*`
- `~/ → ./src/`
- `src/* → ./src/*`

---

## 12. Parsing Strategy — AST-first

AST используется как основной метод анализа import/export зависимостей.

Fallback — regex / best-effort.

### 12.1 Entrypoints & Public Surface Detection

Используются детерминированные эвристики:

- `package.json`: `main`, `module`, `exports`, `bin`;
- типовые файлы (`main.ts`, `index.ts`, `bootstrap.ts`);
- barrel-файлы и re-export hubs.

Семантический анализ не выполняется.

---

## 13. Architecture Profiles

### 13.1 Default Profile

Structure-agnostic правила.

### 13.2 Built-in Profiles

- `fsd` — Feature-Sliced Design.

### 13.3 Custom Config

JSON / YAML / JS:

- пороги сигналов;
- алиасы;
- исключения;
- правила слоёв.

### 13.4 Boundary Hints (LLM-friendly)

Профили могут задавать *подсказки границ*:

- слои и зоны;
- допустимые направления импортов;
- public API паттерны.

Это не enforcement, а навигационная легенда.

---

## 14. Diff-first Use Cases

- до / после рефакторинга;
- PR review;
- обнаружение архитектурных регрессий.

---

## 15. AI Preamble (Optional)

Опциональные инструкции для LLM. Не контракт.

---

## 16. Future Plans: Agentic CLI Protocol

Переход от статической карты к исследованию:

- `--focus`, `--depth`, `--profile`;
- LLM как активный исследователь архитектуры.

---

## 17. Non-Goals

- ❌ семантический и data-flow анализ;
- ❌ enforcement архитектуры;
- ❌ замена линтеров и тестов.

---

## 18. Summary

PRD v0.7 формирует минимально шумную, детерминированную и LLM-ориентированную ментальную карту кодовой базы, пригодную для планирования, навигации и безопасного рефакторинга.

