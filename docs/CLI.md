# CLI Reference

Ниже перечислены флаги CLI и краткое описание использования. Команды приведены в PowerShell‑совместимом формате.

--out <file>
- Назначение: Записать результат в указанный файл. По умолчанию ARCHITECTURE.md.
- Дефолт: ARCHITECTURE.md
- Пример:
```powershell
node dist/cli/main.js --out REPORT.md .
```

--profile <name>
- Назначение: Выбрать профиль бюджетов (например `default`, `fsd`, `monorepo`).
- Дефолт: `default`
```markdown
# CLI Reference

Ниже собран актуальный список флагов CLI, их поведение и несколько рецептов использования. Примеры в PowerShell‑совместимом формате.

Основные флаги
--------------
- `--out <file>` — записать результат в указанный файл (по умолчанию `ARCHITECTURE.md`).
	Пример: `node dist/cli/main.js --out REPORT.md .`

- `-h, --help` — показать справку по CLI (короткая подсказка).

- `-v, --version` — показать версию установленного CLI.

- `--config <file>` — использовать нестандартный файл конфигурации (если поддерживается).

-- `--profile <name>` — выбрать профиль бюджетов. В проекте встречаются профили `default`, `fsd`, `monorepo`.

- `--focus <path>` — сфокусировать дерево на поддиректории (локальный обзор).
	Пример: `node dist/cli/main.js --focus src .`

- `--focus-file <path>` — активирует focused deep‑dive и рендер Impact Path для одного файла (repo‑relative путь).
	Пример: `node dist/cli/main.js --focus-file src/a.ts .`

- `--focus-depth <K>` — при `--focus-file` расширяет task capsule на K hops (K ≥ 0). По умолчанию `1`.
	Пример: `node dist/cli/main.js --focus-file src/a.ts --focus-depth 2 .`

- `--depth <N>` — ограничение глубины Project Tree в рендере (0 = только корень).
	Пример: `node dist/cli/main.js --depth 2 .`

- `--full-signals` — отключает бюджетирование и показывает все сигналы/элементы (весь возможный детальный вывод). Это полезно для полного аудита.
	Пример: `node dist/cli/main.js --full-signals .`

- `--budget <name>` — выбрать предопределённый набор бюджетов на уровне просмотра (поддерживаемые значения: `small`, `default`, `large`).
	Пример: `node dist/cli/main.js --budget small .`

> Примечание: `--full-signals` отключает бюджетирование и показывает все сигналы/элементы.

- `--show-orphans` — показать ORPHAN пометки (по умолчанию некоторые тестовые/документные файлы скрыты).

- `--show-temp` — не применять policy‑collapse к папкам `test/temp_*` (польза для отладки тестовых фикстур).

Ошибки и сообщения
-------------------
- "too many positional arguments. Usage: [<root>] [<out>]" — слишком много позиционных аргументов.
- "output path provided both as --out and as a positional argument. Use --out only." — конфликт аргументов.
- "--focus-depth must be a non‑negative integer." — неверное значение для `--focus-depth`.
- "Error: --out directory does not exist" — указан путь `--out`, но родительская директория отсутствует.
- "--focus-file not found: <path>" — файл не найден в проекте.

Приоритеты флагов
-----------------
- `--full-signals` отключает все бюджеты и capsule truncation — показывает максимально подробный вывод.
- `--focus-file` включает focused deep‑dive и Impact Path.
- `--focus-depth` влияет только на поведение при `--focus-file`.

Профили бюджетов и их смысл
---------------------------
- `small` — агрессивное сокращение списка inline‑сигналов и уменьшение глубины докладов; полезно для быстрых обзоров больших монореп.
- `default` — сбалансированный профиль (по умолчанию).
- `large` — более щедрые лимиты, полезно для глубокого исследования небольших репозиториев.

Рецепты (короткие сценарии)
---------------------------
1) Быстрый обзор репозитория (профиль `fsd`):

```powershell
node dist/cli/main.js --profile fsd .
```

2) Рабочая сессия над одной задачей (фокус на файле + умеренные лимиты):

```powershell
node dist/cli/main.js --focus-file src/feature/handler.ts --focus-depth 2 .
```

3) Перед рефакторингом — полный impact analysis:

```powershell
node dist/cli/main.js --focus-file src/critical/module.ts --full-signals .
```

4) Детерминированная генерация отчёта в файл:

```powershell
node dist/cli/main.js --out ./out/ARCHITECTURE.md .
```

TIP ДЛЯ АГЕНТА / LLM

Короткие практические советы для автоматических агентов, использующих CLI:
- Сначала вызовите `--help` для подтверждения доступных флагов и синтаксиса.
- Начинайте с профильного режима (`--profile default` или `--profile fsd`) для быстрого обзора.
- Для изменений используйте `--focus-file <path>` и `--focus-depth` для сужения области исследования; `--full-signals` — только при необходимости полного аудита.

Советы
------
- Исключайте папку вывода из скана, чтобы избежать self‑scan (CLI по умолчанию защищает от этого).
- Для CI: запускайте `node dist/cli/main.js --full-signals` в контролируемой среде, чтобы собрать все сигналы для аудита.

```
