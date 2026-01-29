Название чата: **«PRD v0.6 — Project Architecture Mapper»**

Ниже — **рефакторинг PRD до версии 0.6** с учётом согласованных правок:

* AST-парсинг как основной (строго **только для зависимостей**, без семантики)
* конфиг профилей (default + custom), авто-детект **только как рекомендация**
* динамические лимиты сигналов + `--full-signals` и таргетные запросы (для agentic/CI)
* сохранены инварианты v0.4: **детерминизм** и **global analysis → local rendering**
* семантика/data-flow **вне PRD** (явно закреплено как non-goal)

---

# PRD v0.6

## Project Architecture Mapper

### Architecture Context Artifact for Humans & LLMs

**Статус:** Final Planning / Ready for Implementation
**Версия:** 0.6
**Фокус версии:** детерминизм, global analysis, noise control, AST-first parsing, custom profiles config, agentic/interactive CLI protocol

---

## 0. Executive Summary

**Project Architecture Mapper** генерирует **Architecture Context Artifact** (`ARCHITECTURE.md`) — компактную, детерминированную и LLM-friendly карту кодовой базы.

Инструмент предназначен для **планирования**: помогает человеку и AI-агенту понять структуру, зависимости и точки риска (cycles, breaches, hotspots), чтобы:

* экономить токены,
* быстрее ориентироваться в легаси,
* безопаснее планировать рефакторинг,
* ловить архитектурные регрессии через diff.

Инструмент **не является линтером/enforcer’ом** и **не занимается семантическим/data-flow анализом**. Он управляет вниманием и приоритетами, а не “доказывает корректность”.

---

## 1. Problem Statement

### Для кого

* Разработчики, использующие AI-агентов для рефакторинга и навигации по легаси.
* Tech Leads / Архитекторы для быстрых “рентген-снимков” архитектуры и контроля регрессий в PR.

### Боль

1. LLM не держит целостную картину проекта без загрузки множества файлов → дорого/медленно.
2. `madge`, `dependency-cruiser` обычно дают JSON-лавину или графы-картинки, плохо пригодные как контекст.
3. Сложно быстро увидеть циклы, нарушения границ, “god modules”, hotspots.
4. Ручные “архитектурные промпты” субъективны и невоспроизводимы.

---

## 2. What This Tool Is / Is Not

### This tool IS

* Генератор **Architecture Context Artifact** (контекстной карты)
* Инструмент навигации и приоритизации (куда смотреть, с чего начинать)
* Эвристический анализ структуры и импортов + граф зависимостей
* Основа для diff-first архитектурных проверок

### This tool IS NOT

* ❌ Архитектурный enforcer / линтер правил
* ❌ Автоматический рефакторинг
* ❌ Семантический анализ бизнес-логики
* ❌ Data-flow / call-graph / taint analysis
* ❌ “истина” о корректности программы

**Философия:** инструмент помогает думать и планировать, сохраняя простоту запуска и читаемость вывода.

---

## 3. Core Concept: Architecture Context Artifact

**Architecture Context Artifact** (`ARCHITECTURE.md`) — файл, который:

* читается целиком человеком и LLM,
* используется **до** чтения исходников,
* задаёт маршрут анализа,
* оптимизирован под токены и внимание.

Карта должна быть **достаточно точной**, чтобы ей доверяли в diff/PR-review, и **достаточно компактной**, чтобы её реально читали.

---

## 4. Deterministic Output Guarantee (Инвариант)

Diff-first невозможен без строгого детерминизма.

### Требование

При неизменной кодовой базе инструмент обязан генерировать **бит-в-бит идентичный** вывод.

### Обязательные условия

* Директории сортируются строго по алфавиту
* Файлы сортируются строго по алфавиту
* Импорты сортируются строго по алфавиту
* Стабильный порядок сигналов и метаданных
* Никаких недетерминированных гонок обхода (async race)

**Любое изменение в `ARCHITECTURE.md` должно отражать реальное изменение проекта/правил.**

---

## 5. Global Analysis, Local Rendering (Инвариант)

Focus/Depth/Collapse не должны “прятать правду”.

### Требование

Алгоритм разделён на два этапа:

**5.1 Global Analysis Phase**

* полный обход проекта,
* построение полного графа зависимостей,
* детекция всех сигналов (включая глобальные циклы).

**5.2 Rendering Phase**

* применение `--focus`, `--depth`, collapse,
* визуальное скрытие частей проекта без потери сигналов, влияющих на видимую область.

Если скрытый модуль участвует в сигнале, который затрагивает видимую область, он должен быть упомянут как **stub**.

---

## 6. Output Format

### Базовый формат

* Markdown
* дерево директорий (`├──`, `└──`)
* краткие сигналы и зависимости

### Пример

```markdown
/src
  /features/auth
    ├── index.ts
    │   (! CYCLE: ./model/store.ts -> ../user/model.ts (collapsed) -> ./index.ts)
    └── model/auth.store.ts
        (450 loc) (? BIG) (? GOD-MODULE) (i HIGH-CHURN 50/m)
        -> (@/shared/api, @/entities/user, ...)
```

### Компактность (по умолчанию)

* только локальные импорты (node_modules вне фокуса)
* top-N импортов на файл (например, 5) + `...`

---

## 7. Signals Model

Сигналы — **подсказки**, не “ошибки”.

### 7.1 Structural Risks `(!)`

* `CYCLE` — циклические зависимости
  **Обязательный формат:**
  `(! CYCLE: A.ts -> B.ts -> C.ts -> A.ts)`
* `LAYER-BREACH` — нарушение правил профиля слоёв (если включён профиль)

### 7.2 Heuristic Hints `(? )`

* `BIG` — файл > N LOC
* `GOD-MODULE` — входящих зависимостей > M (in-degree)
* `DEEP-PATH` — относительный путь `../../../` глубже порога
* `BARREL-HELL` — “толстый” index.ts с большим числом экспортов

### 7.3 Context Signals `(i)`

* `HIGH-CHURN` — часто меняется (git)
* `STALE` — давно не менялся
* `ORPHAN` — нет входящих импортов (с оговорками: entrypoints)

---

## 8. Signal Budgeting & Noise Control (v0.6)

### Проблема

В легаси сигналы могут превратить карту в “стену плача”, которую игнорируют и люди, и LLM.

### Решение: лимиты + эскалация

По умолчанию включён **Signal Budgeting**: выводятся только top-N по каждому типу сигналов, остальное агрегируется.

Пример:

```markdown
(! CYCLE) Found 147 cycles (showing top 5 shortest)
(? BIG)   Found 82 files (showing top 20 by LOC)
```

### Full View (осознанная эскалация)

Добавляется флаг:

* `--full-signals` — печатает полный список сигналов (без лимитов)

Принцип:

> Инструмент не скрывает правду. Он по умолчанию управляет вниманием, но даёт полный режим по запросу.

### Targeted Signals (для agentic/CI)

В будущем (v1.0+) допускается режим запросов “только по типу” или “по severity” (см. Agentic CLI Protocol).

---

## 9. Smart Collapse (Принцип)

**Show problems, hide boring stuff.**

* Папки без `(!)` и `(? )` могут быть свёрнуты.
* Если в глубине есть `(!)`, путь к нему раскрывается автоматически, даже если превышен `--depth`.
* `--depth` — мягкое ограничение, а не “нож”.

---

## 10. Alias Resolution (Baseline)

### Требование

Для сохранения связности графа включён эвристический резолвинг распространённых алиасов:

* `@/* → ./src/*`
* `~/ → ./src/`
* `src/* → ./src/*`

Цель — связность графа, а не стопроцентная точность во всех кастомных схемах.

---

## 11. Parsing Strategy (AST-first, строго в рамках структуры) — v0.6

### Цель

Повысить точность графа зависимостей, чтобы:

* меньше ложных `CYCLE`,
* меньше “битых” связей,
* выше доверие к diff/PR-review.

### Требование (v0.6)

**AST-based parsing является основным** методом извлечения импортов и re-exports, если среда позволяет.

**Рекомендуемый механизм:** TypeScript Compiler API, когда:

* проект TS/JS,
* `typescript` доступен (локально или через devDependencies),
* анализируемые файлы включают TS/TSX.

### Fallback

Если AST недоступен (например, чистый JS без TS, или окружение ограничено):

* включается regex/best-effort режим.

### Жёсткая граница (важно)

AST используется **только** для:

* извлечения import/export зависимостей,
* распознавания type-only imports,
* корректного учёта re-exports.

AST **не используется** для:

* анализа логики,
* data-flow,
* call graph,
* интерпретации исполнения.

---

## 12. Architecture Profiles (default + custom configs) — v0.6

### 12.1 Default Profile

Structure-agnostic набор сигналов и порогов.

### 12.2 Built-in Profiles

Например:

* `fsd` — включает `LAYER-BREACH`, `FEATURE-CROSS` и прочие правила FSD

### 12.3 Custom Profile Config (ключевое v0.6)

Добавляется конфиг-файл (например, JSON/YAML) для:

* порогов (`BIG`, `GOD-MODULE`, `DEEP-PATH`)
* правил слоёв (что кому можно импортировать)
* специфичных исключений/ignore patterns
* определения алиасов (расширение baseline)

Примерная идея:

* `project-mapper.config.json` или `mapper.config.js`

### 12.4 Auto-detection (только рекомендация)

Если инструмент детектит “похожую” структуру (например, FSD), он может:

* **предложить** использовать профиль (`fsd`),
* но **не включает его автоматически**.

Принцип:

> Профиль — это lens (оптика), а не law (закон).

---

## 13. Diff-first Use Cases

* сравнение до/после рефакторинга,
* PR review (архитектурные регрессии),
* “main vs feature branch” сравнение сигналов и структуры.

Важный эффект:

* архитектурные регрессии (например, новые циклы) становятся видимыми даже при “нормальном” кодовом diff.

---

## 14. AI Preamble (Optional)

Опциональный блок инструкций для LLM:

* как использовать карту,
* приоритеты сигналов,
* ограничения на чтение файлов и запросы.

Не контракт. Не обязателен. Может быть переписан пользователем.

---

## 15. Future Plans: Agentic CLI Protocol (v1.0+)

### Переход от читателя к исследователю

Когда LLM может сама запускать инструмент с `--focus`, `--depth`, `--profile`, `--signals`, она становится **исследователем**: зондирует проект, запрашивая детализацию только там, где нужно, экономя токены.

### 15.1 Self-Description Capability (Agent Schema)

Инструмент умеет описывать свои параметры в LLM-friendly виде (JSON Schema).

Команда:

```bash
node project_mapper.js --agent-schema
```

Пример:

```json
{
  "name": "generate_architecture_map",
  "description": "Generates a structural map of the codebase with dependency and architecture signals.",
  "parameters": {
    "focus": { "type": "string", "description": "Path to focus rendering on." },
    "depth": { "type": "integer", "description": "Max tree depth." },
    "profile": { "type": "string", "enum": ["default", "fsd"], "description": "Architecture profile." },
    "output": { "type": "string", "enum": ["file", "stdout"], "description": "Output mode." },
    "fullSignals": { "type": "boolean", "description": "Emit full signals without limits." }
  }
}
```

### 15.2 X-Ray Mode (Focus & Slice)

```bash
node project_mapper.js --focus="features/payment" --depth=2 --output=stdout
```

### 15.3 Architecture Diff (Agent/CI Check)

```bash
node project_mapper.js --diff --base=HEAD~1
```

Пример результата:

```markdown
[!] NEW CYCLE DETECTED
Path: src/features/auth -> src/features/user -> src/features/auth
```

---

## 16. Non-Goals (жёстко)

* ❌ семантический/data-flow анализ (`--semantic` не входит в дорожную карту v0.x–v1.0 данного PRD)
* ❌ call graph / taint analysis / execution modeling
* ❌ enforcement архитектуры
* ❌ “идеальная точность” любой ценой (мы повышаем точность графа через AST, но сохраняем практичность)
* ❌ замена линтеров/тестов

---

## 17. Итог

PRD v0.6 фиксирует:

* строгий детерминизм для diff-first
* global analysis → local rendering (без “ложной чистоты” в focus)
* управляемый шум + осознанный full-view
* AST-first parsing для доверия к графу
* профили через конфиг (lens, not law)
* понятный путь к agentic-интерактивности (v1.0+)

---

Если хочешь, следующим шагом я сделаю **короткое “Release Notes v0.6”** (что именно добавилось относительно v0.4) — это удобно для обсуждения в команде и фиксации решения.
