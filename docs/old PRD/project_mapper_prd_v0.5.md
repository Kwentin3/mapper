PRD v0.4
Project Architecture Mapper
Architecture Context Artifact for Humans & LLMs

Статус: Final Planning / Ready for Implementation
Версия: 0.4
Фокус версии: архитектурные инварианты, детерминизм, контроль шума, масштабирование

0. Executive Summary

Project Architecture Mapper — это инструмент, генерирующий Architecture Context Artifact (ARCHITECTURE.md) — компактную, детерминированную и LLM-friendly карту кодовой базы.

Цель инструмента — дать человеку и AI-агенту целостную картину архитектуры до чтения исходников, чтобы:

снизить токен-стоимость,

ускорить понимание легаси,

повысить качество планирования рефакторинга,

избежать опасных изменений (циклы, нарушения границ).

Инструмент не является линтером или enforcement-системой. Он работает на эвристиках и управляет вниманием, а не выносит приговоры.

1. Problem Statement
Контекст

Современные AI-агенты способны эффективно рефакторить код, если у них есть архитектурный контекст. В реальных проектах этот контекст:

распределён по сотням/тысячам файлов,

не помещается в контекст LLM,

требует ручного объяснения.

Основные проблемы

LLM вынужден читать слишком много файлов → дорого и медленно

Существующие инструменты дают:

огромные JSON

графы-картинки (непригодны для LLM)

Разработчик не видит быстро:

где циклы,

где нарушения границ,

где настоящие hotspots,

где можно безопасно начинать рефакторинг

Ручные описания архитектуры:

субъективны

неполны

невоспроизводимы

2. What This Tool Is / Is Not
This tool IS

Генератор Architecture Context Artifact

Инструмент навигации и приоритизации

Подготовительный слой для человека и LLM

Эвристический анализ структуры и импортов

Основа для diff-first архитектурного анализа

This tool IS NOT

❌ Линтер или архитектурный “enforcer”

❌ CI-gate по умолчанию

❌ Автоматический рефакторинг

❌ Семантический анализ бизнес-логики

❌ Data-flow анализ

❌ Истина в последней инстанции

Философия:

Инструмент помогает думать, а не решает.

3. Core Concept: Architecture Context Artifact

Architecture Context Artifact — это единый файл ARCHITECTURE.md, который:

читается целиком (человеком и LLM),

используется до чтения исходников,

даёт карту местности для планирования,

оптимизирован под токены и внимание.

Ключевой принцип

LLM сначала получает карту, затем точечно читает файлы.

4. Deterministic Output Guarantee (Инвариант v0.4)
Проблема

Diff-first сценарии невозможны без строгого детерминизма.

Требование (ЖЁСТКОЕ)

При неизменной кодовой базе инструмент обязан генерировать бит-в-бит идентичный ARCHITECTURE.md.

Обязательные условия

Сортировка директорий — строго по алфавиту

Сортировка файлов — строго по алфавиту

Сортировка импортов внутри файла — строго по алфавиту

Стабильный порядок вывода сигналов

Отсутствие nondeterministic traversal (fs.readdir, async race и т.п.)

Любое изменение в файле карты = реальное архитектурное изменение.

5. Global Analysis, Local Rendering (Инвариант v0.4)
Проблема

Focus Mode может скрыть критические проблемы (например, глобальные циклы).

Архитектурное требование

Алгоритм строго разделён на два этапа:

5.1 Global Analysis Phase

анализ всего проекта

построение полного графа зависимостей

детекция всех сигналов и циклов

5.2 Rendering Phase

применение --focus, --depth, collapse

скрытие нерелевантных частей только визуально

Гарантия

Focus Mode никогда не может скрыть структурную проблему, влияющую на видимую область.

Если скрытый модуль участвует в сигнале:

он обязан быть упомянут как stub.

6. Output Format
Формат

Markdown

Дерево директорий (├──, └──)

Краткие сигналы и зависимости

Пример
/src
  /features/auth
    ├── index.ts
    │   (! CYCLE: ./model/store.ts -> ../user/model.ts -> ./index.ts)
    └── model/auth.store.ts
        (450 loc) (? BIG) (? GOD-MODULE) (i HIGH-CHURN 50/m)
        -> (@/shared/api, @/entities/user, ...)

Принципы компактности

только локальные импорты

top-N импортов (по умолчанию 5)

остальное — ...

7. Signals Model

Сигналы — подсказки, а не ошибки.

7.1 Structural Risks (!)

CYCLE — циклические зависимости
Формат обязателен:
(! CYCLE: A.ts -> B.ts -> C.ts -> A.ts)

LAYER-BREACH — нарушения профиля слоёв

7.2 Heuristic Hints (? )

BIG — файл > N строк

GOD-MODULE — входящих зависимостей > M

DEEP-PATH — ../../../ глубже порога

BARREL-HELL — index.ts с большим числом экспортов

7.3 Context Signals (i)

HIGH-CHURN — часто меняется

STALE — давно не менялся

ORPHAN — нет входящих импортов (с осторожностью)

8. Signal Budgeting & Noise Control (v0.4)
Проблема

В легаси-проектах сигналы могут перегрузить внимание.

Решение

Каждый тип сигнала имеет лимит отображения.

Пример
(! CYCLE) Found 147 cycles (showing top 5 shortest)
(? BIG)   Found 82 files (showing top 20 by LOC)


Принцип:

Мы не скрываем правду, мы управляем вниманием.

9. Smart Collapse (Принцип v0.4)

Show problems, hide boring structure

Правила

папка может быть схлопнута, если:

внутри нет (!) или (? )

если в глубине есть (!):

путь к нему раскрывается автоматически

--depth — мягкое ограничение

10. Architecture Profiles
10.1 Default (structure-agnostic)

CYCLE, BIG, GOD-MODULE, DEEP-PATH

HIGH-CHURN, STALE, ORPHAN

10.2 FSD Profile (opt-in)

LAYER-BREACH

FEATURE-CROSS

FSD — профиль, а не норма.

11. Alias Resolution (Baseline Requirement)
Проблема

Без алиасов граф разрывается.

Требование

Эвристический резолвинг:

@/* → ./src/*

~/ → ./src/

src/* → ./src/*

Цель — связность графа, не 100% точность.

12. Parsing Strategy
MVP

улучшенный Regex

multi-line imports

re-exports

dynamic imports (best effort)

Опционально

TypeScript Compiler API, если typescript уже установлен

13. Diff-first Use Cases

сравнение до/после рефакторинга

архитектурный review PR

обнаружение регрессий (новые циклы, breaches)

14. AI Preamble (Optional)

Опциональный блок инструкций для LLM:

как использовать карту

в каком порядке реагировать на сигналы

Не контракт, не обязателен, полностью заменяем.

15. Non-Goals

❌ семантический анализ

❌ data-flow анализ

❌ enforcement архитектуры

❌ идеальная точность

❌ замена линтеров и тестов

16. Future Plans: Agentic CLI Protocol (v1.0+)
Переход от «читателя» к «исследователю»

На этапах v0.4–v0.5 инструмент рассматривается как статический генератор Architecture Context Artifact (ARCHITECTURE.md), предназначенный для чтения человеком и LLM.

В версии v1.0+ планируется эволюция инструмента в сторону agent-first интерфейса, где LLM перестаёт быть пассивным читателем карты и становится активным исследователем кодовой базы.

Ключевая идея:

Когда LLM может сама запускать инструмент с флагами --focus, --depth, --profile, она начинает зондировать проект, запрашивая ровно тот срез архитектуры, который нужен в текущий момент, и тем самым радикально экономит токены.

16.1 Agentic CLI Protocol — концепция

Agentic CLI Protocol — это соглашение, при котором:

CLI-инструмент может быть использован как Tool / Function в агентной системе

LLM динамически управляет запуском инструмента

вывод становится частичным, контекстным и целевым

В этом режиме:

ARCHITECTURE.md перестаёт быть единственным способом взаимодействия

карта проекта становится навигационным API, а не статическим артефактом

16.2 Self-Description Capability (Agent Schema)

Для корректного tool-use LLM должна понимать возможности инструмента без догадок.

Требование (v1.0+)

Инструмент должен уметь самоописывать свой интерфейс в формате, пригодном для LLM (JSON Schema / OpenAI Tools / MCP-style).

Команда
node project_mapper.js --agent-schema

Пример вывода
{
  "name": "generate_architecture_map",
  "description": "Generates a structural map of the codebase with dependency and architecture analysis.",
  "parameters": {
    "focus": {
      "type": "string",
      "description": "Relative path to focus analysis on (e.g., 'src/features/auth'). Hides unrelated folders."
    },
    "depth": {
      "type": "integer",
      "description": "Max depth of the tree visualization. Default: unlimited."
    },
    "profile": {
      "type": "string",
      "enum": ["default", "fsd"],
      "description": "Architectural rules profile to apply."
    },
    "output": {
      "type": "string",
      "enum": ["file", "stdout"],
      "description": "Output mode. 'stdout' is optimized for agent usage."
    }
  }
}

Ценность

LLM не гадает, какие флаги существуют

команды формируются детерминированно

инструмент легко интегрируется в:

Tool Use

Function Calling

MCP / Agent Frameworks

16.3 X-Ray Mode (Focus & Slice)
Концепция

LLM может запрашивать рентгеновский снимок конкретного модуля, не загружая в контекст весь проект.

Это превращает архитектурную карту в интерактивную систему навигации.

Команда агента
node project_mapper.js --focus="features/payment" --depth=2 --output=stdout

Результат (stdout)
# FOCUS MAP: features/payment (Depth: 2)

/src
  /features
    /payment
      ├── index.ts        (! CYCLE)
      ├── model/          (collapsed)
      └── ui/             (collapsed)

... (rest of project hidden)

Ключевые свойства

соблюдаются инварианты v0.4:

глобальный анализ

детерминизм

сигналы не скрываются

вывод минимален и token-efficient

идеально подходит для пошагового reasoning агента

16.4 Iterative Exploration Pattern (Agent Loop)

В агентном сценарии возможен следующий цикл:

Агент запрашивает общий контекст

Видит (! CYCLE) или (? BIG)

Делает уточняющий запрос:

--focus=features/payment --depth=3


Получает уточнённый срез

Решает, какие файлы читать дальше

Таким образом:

карта заменяет массовый read_file

LLM читает на порядок меньше кода

повышается точность и безопасность рефакторинга

16.5 Architecture Diff (Agent / CI Usage)

В версии v1.0+ инструмент может использоваться для агентной или CI-проверки архитектурных регрессий.

Команда
node project_mapper.js --diff --base=HEAD~1

Пример результата
[!] NEW CYCLE DETECTED
Path: src/features/auth -> src/features/user -> src/features/auth

Использование

агент может:

остановить рефакторинг

предупредить пользователя

предложить план устранения

CI может использовать вывод как сигнал, а не как жёсткий gate

16.6 Границы и предостережения

Agentic CLI Protocol — future direction, не обязательство v0.x

Статический ARCHITECTURE.md остаётся:

основным артефактом

базовой точкой входа

Agent mode — надстройка, а не замена

Принцип:

Сначала человек и LLM читают карту.
Потом LLM учится ходить по ней сама.

16.7 Почему это важно стратегически

Этот раздел:

защищает проект от устаревания

делает его совместимым с будущими агентными системами

объясняет, почему формат и инварианты v0.4 критичны

превращает CLI из «скрипта» в инструмент мышления для AI