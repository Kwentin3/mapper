# UX_FIXES — Mapper Minimal UX Improvements (Contract-Tested)

## 1) Что было неудобно (цитата из UX_AUDIT)

1. Entrypoints ambiguity:
   - “Термин “entrypoint” в артефакте встречается в двух уровнях с разной семантикой…” (`UX_AUDIT.Mapper.report.md:141`)
   - “рекомендация preamble “Start from (→ ENTRYPOINT) files” требует уточнения…” (`UX_AUDIT.Mapper.report.md:145`)
2. Budgeted vs full-signals context loss:
   - “легко потерять состояние “я уже в full-signals или ещё в budgeted”…” (`UX_AUDIT.Mapper.report.md:202`)
3. Повторяющиеся truncation подсказки в focus-view:
   - Пример показывает `Truncated by budget...` + дополнительную строку: `Note: this [HUB] list is truncated...` (`UX_AUDIT.Mapper.report.md:166-168`)
4. Agent interpretation rules “вынесены наружу”:
   - “CLI help явно отправляет к `docs/agent-interpretation.md` … но артефакт … не содержит ссылку…” (`UX_AUDIT.Mapper.report.md:189`)
5. `Error:` в `npm test` при PASS:
   - “`npm test` вывод содержит `stderr ... Error: ...` даже при общем PASS …” (`UX_AUDIT.Mapper.report.md:212`)

## 2) Что изменено (1–2 строки)

1. В AI Preamble добавлены точные пояснения: summary-entrypoints vs inline `(→ ENTRYPOINT)` и ссылка на `docs/agent-interpretation.md`. (`src/render/preamble.ts`)
2. В артефакт добавлен детерминированный блок `## Generation Metadata` с явным `View mode: budgeted|full-signals` и краткой provenance по флагам. (`src/render/render_architecture_md.ts`)
3. Убрана избыточная строка `Note: this [HUB] list is truncated...` (оставлен один канонический `Truncated by budget...`). (`src/render/render_architecture_md.ts`, `src/render/format.ts`)
4. `run()` для CLI получил опциональный `io` (log/error) для тестов, чтобы негативные кейсы не писали в реальный stderr при PASS. (`src/cli/run.ts`)

## 3) Как это проверяется (тест)

1. Entrypoints ambiguity + agent interpretation link:
   - `test/ai_preamble_contract.test.ts`
2. Budgeted vs full-signals context:
   - `test/render_generation_metadata_contract.test.ts`
3. Dedup truncation note in focus-view:
   - `test/focus_truncation_hint_dedup_contract.test.ts`
   - `test/summary_hub_truncation_hint.test.ts`
4. `Error:` noise in passing tests:
   - `test/cli_silent_io_contract.test.ts`
   - также обновлены вызовы с ожидаемыми ошибками: `test/cli_positional_out.test.ts`, `test/focus_depth_cli_contract.test.ts`

Верификация:

```powershell
npm test
npm run typecheck
npm run build
```

Результат: все команды завершились с exit code `0` (локальный запуск).

## 4) Детерминизм (доказательство)

Сценарий: 2 одинаковых прогона `--full-signals` (вывод пишется в `.tmp/` чтобы не попадать в скан).

```powershell
node dist/cli/main.js --full-signals . --out .tmp/ux-fixes/det-run-1.md
node dist/cli/main.js --full-signals . --out .tmp/ux-fixes/det-run-2.md
Get-FileHash .tmp/ux-fixes/det-run-1.md -Algorithm SHA256
Get-FileHash .tmp/ux-fixes/det-run-2.md -Algorithm SHA256
```

- SHA256 #1: `8241B593C480222DB16000DDB9E20508ABEB65CC01AE393FDCAA85434FAFA4ED`
- SHA256 #2: `8241B593C480222DB16000DDB9E20508ABEB65CC01AE393FDCAA85434FAFA4ED`
- Вердикт: `IDENTICAL`

