# CLI Reference

Источник истины для синтаксиса и списка флагов: `mapper --help` (или `node dist/cli/main.js --help` при локальной разработке). Этот файл даёт краткую шпаргалку и рецепты.

## Usage

```text
mapper [options] [<path>]
```

Если `<path>` не указан, анализируется текущая директория.

## Options

- `-h, --help` показать справку
- `-v, --version` показать версию
- `--config <file>` использовать пользовательский конфиг
- `--profile <name>` использовать встроенный профиль (`default`, `fsd`, `monorepo`)
- `--budget <name>` профиль бюджетов представления: `small`, `default`, `large`
- `--focus <path>` сфокусировать дерево на поддиректории
- `--focus-file <path>` deep‑dive по одному repo-relative файлу (используйте POSIX `/` разделители)
- `--focus-depth <K>` при `--focus-file` разворачивает capsule на `K` hops (по умолчанию `1`, `K >= 0`)
- `--depth <number>` ограничить глубину дерева (0 = только корень)
- `--full-signals` показать все сигналы, игнорируя бюджеты
- `--show-orphans` показать ORPHAN пометки для test/docs/config файлов
- `--show-temp` не применять policy‑collapse к `test/temp_*` (для отладки тестовых фикстур)
- `--out <file>` путь выходного файла (по умолчанию `ARCHITECTURE.md`)

## Recipes

Базовый запуск:

```powershell
node dist/cli/main.js .
```

Сгенерировать в файл:

```powershell
node dist/cli/main.js --out REPORT.md .
```

Сфокусироваться на поддиректории:

```powershell
node dist/cli/main.js --focus src .
```

Фокус на файле (deep‑dive + Impact Path):

```powershell
node dist/cli/main.js --focus-file src/a.ts .
```

Полный вывод без бюджетов:

```powershell
node dist/cli/main.js --full-signals .
```

## Errors & Messages (частые)

- `too many positional arguments. Usage: [<root>] [<out>]` слишком много позиционных аргументов
- `output path provided both as --out and as a positional argument. Use --out only.` конфликт аргументов вывода
- `--focus-depth must be a non-negative integer.` неверное значение `--focus-depth`
- `Error: --out directory does not exist` родительская директория для `--out` отсутствует
- `--focus-file not found: <path>` файл не найден в проекте

