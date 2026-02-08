<!-- README for Project Architecture Mapper - concise, engineering tone, Russian -->
# Project Architecture Mapper

CLI для детерминированного построения архитектурной карты репозитория в Markdown (`ARCHITECTURE.md`).

## Для кого
- Разработчики и ревьюеры: impact‑paths перед изменениями.
- Архитекторы: entrypoints, hub‑файлы, fan‑in / fan‑out.
- Кодовые агенты: детерминированный контекст для навигации и оценки риска.

## Чем является (и чем не является)
- Это статический анализ (без исполнения кода).
- Это навигация и оценка blast radius, а не линтер и не “enforcement” инструмент.
- Сигналы эвристические; источник истины по флагам и синтаксису всегда `--help`.

## Quick start (установленный пакет)
Канонический путь: установить пакет и запускать через `npx mapper ...`.

```powershell
npm install @kwentin3/mapper
npx mapper --help
npx mapper .
```

Windows note: `npx @kwentin3/mapper --help` может быть нестабилен; предпочитайте `npm install @kwentin3/mapper` и затем `npx mapper ...`.

Если нужно вызвать бин напрямую:

```powershell
.\node_modules\.bin\mapper.cmd --help
```

## Примеры
Фокус на одном файле (deep‑dive + Impact Path):

```powershell
npx mapper --focus-file src/app/main.ts .
```

Профиль бюджетов:

```powershell
npx mapper --profile fsd .
```

Полный вывод без бюджетов:

```powershell
npx mapper --full-signals .
```

Запись в файл:

```powershell
npx mapper --out REPORT.md .
```

## Локальная разработка (в этом репозитории)

```powershell
npm install
npm run build
node dist/cli/main.js --help
node dist/cli/main.js .
npm test
```

## Как читать `ARCHITECTURE.md`
- AI Preamble: правила интерпретации и приоритет сигналов.
- Budgeting: если список обрезан, это явно помечается; для полного аудита используйте `--full-signals`.
- Для изменений: `--focus-file <path>` показывает `← importers` и `→ imports` для оценки blast radius.

Важно: `ARCHITECTURE.md` генерируется CLI. Если карта устарела, перегенерируйте; не редактируйте вручную.

## Документация
- `docs/CLI.md` — флаги CLI и рецепты.
- `docs/DEV_GUIDE.md` — архитектура пайплайна, детерминизм, правила для derived views.
- `docs/RENDER_CONTRACTS.md` — контракт рендера дерева (важно для совместимости вывода).
- `docs/test_policy_manifest.md` — тестовая политика проекта.
- `docs/prd_project_architecture_mapper_v_0.9.md` — design decisions / инварианты (PRD/PDR).

## Troubleshooting
Если видите `'mapper' is not recognized`:
- Убедитесь, что пакет установлен: `npm install @kwentin3/mapper`.
- Проверьте: `npx mapper --help`.
- Альтернатива: `.\node_modules\.bin\mapper.cmd --help`.
