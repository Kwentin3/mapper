# CLI Error UX Audit (Mapper)

## 1) Executive summary

- Прогнаны 6 edge/error-кейсов CLI из промта (A1/A2/B1/B2/C1/C2) в Windows PowerShell; для каждого зафиксированы `stdout`, `stderr`, `exit code` в `.tmp/cli-error-ux/`.
- Во всех “ожидаемо ошибочных” кейсах A1/A2/B1/B2/C1 CLI завершался с `exit code = 1`, `stdout` был пуст, ключевая причина формулировалась одной строкой вида `Error: ...` в `stderr`.
- В PowerShell к строке ошибки добавляется “обвязка” `NativeCommandError` (`At line:...`, `CategoryInfo...`), что визуально утяжеляет ошибку; первая строка остаётся самой информативной.
- Кейс `--focus-file src\\cli\\run.ts` (Windows `\\`) не вызвал ошибки: `exit code = 0`, `stderr` пуст, CLI создал артефакт по умолчанию и сообщил “✅ Architecture map written ...”.
- В кейсе `node ... --focus-file .` ошибка формулируется как “not found: .”, что показывает: значение `--focus-file` трактуется как путь к файлу (а точка воспринимается как недопустимый “файл”), при этом позиционный `<path>` не был задан и не упоминается в ошибке.

## 2) Таблица кейсов

Источник истины по флагам: `node dist/cli/main.js --help` (вывод сохранён в `.tmp/cli-error-ux/HELP.stdout.txt`).

| Case | Command | Exit code | stdout (fragment) | stderr (fragment) | Agent interpretation |
|---|---|---:|---|---|---|
| A1 | `node dist/cli/main.js --focus-file src/does/not/exist.ts .` | 1 | _(empty)_ | `Error: --focus-file not found: src/does/not/exist.ts` | Флаг `--focus-file` валидируется как существующий файл. Следующий шаг понятен: указать реальный repo-relative файл. |
| A2 | `node dist/cli/main.js ./no-such-dir` | 1 | _(empty)_ | `Error: Invalid path './no-such-dir': directory does not exist.` | Позиционный `<path>` валидируется как существующий каталог. Следующий шаг понятен: исправить путь/запустить из нужной директории. |
| B1 | `node dist/cli/main.js --focus-depth -1 .` | 1 | _(empty)_ | `Error: --focus-depth must be a non‑negative integer.` | Чёткая валидация значения: “неотрицательное целое”. Следующий шаг понятен: `0` или положительное. |
| B2 | `node dist/cli/main.js --out out.md ARCH.md .` | 1 | _(empty)_ | `Error: output path provided both as --out and as a positional argument. Use --out only.` | Конфликт ввода объяснён прямо в тексте (что неверно и как вводить). Следующий шаг понятен: убрать позиционный `ARCH.md`. |
| C1 | `node dist/cli/main.js --focus-file .` | 1 | _(empty)_ | `Error: --focus-file not found: .` | Агент видит, что `--focus-file` ожидает файл, а `.` не проходит как “файл”. Риск ступора: агент мог думать, что `.` это анализируемый `<path>`, а не значение флага. |
| C2 | `node dist/cli/main.js --focus-file src\\cli\\run.ts .` | 0 | `✅ Architecture map written to ...\\ARCHITECTURE.md` | _(empty)_ | Несмотря на `--help` (“use POSIX / separators”), Windows `\\` принимаются без пояснения. Агент не получает явной подсказки про формат пути в этой ветке. |

## 3) Вывод (stdout/stderr) по кейсам (фрагменты)

Ниже приведены короткие фрагменты фактического вывода (как он попал в файлы в `.tmp/cli-error-ux/`).

### A1 — non-existent focus file

Command: `node dist/cli/main.js --focus-file src/does/not/exist.ts .`  
Exit code: `1` (`.tmp/cli-error-ux/A1.exitcode.txt`)

```text
node : Error: --focus-file not found: src/does/not/exist.ts
At line:9 char:1
+ node dist/cli/main.js --focus-file src/does/not/exist.ts . 1> "$outdi ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Error: --focus-...es/not/exist.ts:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
```

### A2 — non-existent directory path

Command: `node dist/cli/main.js ./no-such-dir`  
Exit code: `1` (`.tmp/cli-error-ux/A2.exitcode.txt`)

```text
node : Error: Invalid path './no-such-dir': directory does not exist.
At line:12 char:1
+ node dist/cli/main.js ./no-such-dir 1> "$outdir/A2.stdout.txt" 2> "$o ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Error: Invalid ...does not exist.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
```

### B1 — negative focus depth

Command: `node dist/cli/main.js --focus-depth -1 .`  
Exit code: `1` (`.tmp/cli-error-ux/B1.exitcode.txt`)

```text
node : Error: --focus-depth must be a non‑negative integer.
At line:15 char:1
+ node dist/cli/main.js --focus-depth -1 . 1> "$outdir/B1.stdout.txt" 2 ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Error: --focus-...gative integer.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
```

### B2 — ambiguous positional output vs --out

Command: `node dist/cli/main.js --out out.md ARCH.md .`  
Exit code: `1` (`.tmp/cli-error-ux/B2.exitcode.txt`)

```text
node : Error: output path provided both as --out and as a positional argument. Use --out only.
At line:18 char:1
+ node dist/cli/main.js --out out.md ARCH.md . 1> "$outdir/B2.stdout.tx ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Error: output p...Use --out only.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
```

### C1 — “--focus-file without path” as written in prompt

Command: `node dist/cli/main.js --focus-file .`  
Exit code: `1` (`.tmp/cli-error-ux/C1.exitcode.txt`)

```text
node : Error: --focus-file not found: .
At line:21 char:1
+ node dist/cli/main.js --focus-file . 1> "$outdir/C1.stdout.txt" 2> "$ ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Error: --focus-file not found: .:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
```

### C2 — Windows path separators for --focus-file

Command: `node dist/cli/main.js --focus-file src\\cli\\run.ts .`  
Exit code: `0` (`.tmp/cli-error-ux/C2.exitcode.txt`)

```text
✅ Architecture map written to D:\Users\Roman\Desktop\Проекты\Маппер кода\ARCHITECTURE.md
✅ No warnings.
```

## 4) Общие UX-наблюдения (по фактам)

- Ошибки валидации аргументов формулируются как “`Error: <specific message>`”; это первая строка `stderr` в A1/A2/B1/B2/C1.
- В PowerShell вокруг этой строки всегда появляется стандартная обвязка `NativeCommandError` (строки `At line:...`, `CategoryInfo...`), которая не добавляет новой информации о причине, но увеличивает объём/шум ошибки.
- `--help` заявляет ожидание POSIX `/` для `--focus-file`, но кейс C2 показывает, что `\\`-путь принимается и приводит к успешной генерации артефакта (без дополнительных пояснений в stdout/stderr этой ветки).

## 5) Что НЕ является проблемой (важно)

- `exit code = 1` на некорректных аргументах/путях (A1/A2/B1/B2/C1) — это ожидаемое поведение для “failure-path” и подтверждается стабильным отсутствием успешного stdout.
- В этих ошибочных ветках нет stack trace; ошибка выражена одной конкретной строкой `Error: ...` (дополнительные строки в `stderr` — это PowerShell-обвязка выполнения, а не “внутренний” stack trace приложения).

## 6) Next minimal step (1 пункт)

Проверить UX ошибок для неверных значений перечислимых флагов (похожий failure-path, но другая ветка): например, несуществующий `--profile` или `--budget` с фиксацией `exit code`/stdout/stderr по той же схеме, чтобы увидеть, даёт ли CLI “корректный формат” для этих значений.

