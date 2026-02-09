# Layer STOP Semantics Canon (Agent Protocol)

## 1) Purpose

Определяет, когда кодовый агент обязан остановиться перед потенциальным cross-layer шагом, какие признаки считать “risk of layer violation”, и какой минимальный запрос контекста сделать вместо попытки “угадать”. Основано на: `LAYER_VIOLATION_AGENT_AUDIT.report.md`, `AGENT_NAVIGATION_DOCTRINE.md`, `AGENT_TEXT_STRICTNESS_CANON.md`, PDR v0.9 (Layer Violation Detection планируется, не описано как enforced сейчас: `docs/prd_project_architecture_mapper_v_0.9.md` §12).

## 2) STOP Types

- HARD STOP: агент не делает cross-layer изменение/импорт до получения явного разрешающего контекста (permission), потому что permission graph отсутствует/не выражен в артефактах.
Action: запросить/проверить минимальный контекст (см. §4) и только затем продолжать.

- SOFT STOP: агент продолжает только если ставка низкая и есть достаточный контекст (focus-view + отсутствие truncation); иначе эскалирует до HARD STOP.
Action: сначала расширить контекст (focus/full-signals), затем решить “нужен ли HARD STOP”.

## 3) STOP Triggers (LS-XX)

Формат: Trigger → Level → Evidence → Agent action (1–2 пункта).

- LS-01: `src/*` начинает зависеть от `test/*` (test helper reuse).
Level: HARD. Evidence: Layer audit S3; Missing STOP signals row “src/* ↔ test/*”.
Agent action: 1) классифицировать как “test-only dependency”; 2) запросить разрешающий документ/контракт (permission) на такое направление.

- LS-02: `src/*` начинает зависеть от `docs/*`.
Level: HARD. Evidence: Missing STOP signals row “src/* ↔ docs/* / scripts/*”.
Agent action: 1) проверить “visibility vs permission”; 2) запросить контекст, который явно разрешает `src → docs`.

- LS-03: `src/*` начинает зависеть от `scripts/*`.
Level: HARD. Evidence: Layer audit S4; Missing STOP signals row “src/* ↔ docs/* / scripts/*”.
Agent action: 1) классифицировать как boundary crossing; 2) запросить разрешающий контекст/обоснование доступа (adapter-only access vs direct).

- LS-04: cross-folder внутри `src/` (например `src/cli` ↔ `src/render`).
Level: SOFT. Evidence: Layer audit S1; Missing STOP signals row “Cross src/* folders”.
Agent action: 1) проверить focus-view для обеих сторон; 2) спросить “one-way boundary?” (есть ли разрешённое направление).

- LS-05: cross-folder внутри `src/` (например `src/pipeline` ↔ `src/render`).
Level: SOFT. Evidence: Layer audit S2; Missing STOP signals row “Cross src/* folders”.
Agent action: 1) запросить permission на направление `pipeline → render`; 2) если контекст отсутствует, эскалировать до HARD STOP.

- LS-06: “reuse мотив”: вынести helper в “общий модуль” (`src/utils/*`) для импорта “везде”.
Level: HARD. Evidence: Layer audit S5 (transitive мост).
Agent action: 1) сформулировать как cross-layer dependency risk; 2) запросить правило “one-way boundary” для `src/utils` (allowed-by-policy).

- LS-07: использование `[HUB]` как аргумента “можно зависеть отовсюду”.
Level: HARD. Evidence: False permission patterns row `[HUB]`; AI Preamble: “[HUB] … not a contract …” (цитируется в layer audit).
Agent action: 1) не трактовать HUB как permission; 2) запросить разрешающий контекст на зависимость.

- LS-08: “absence of prohibition” (нет текста “нельзя”, значит “можно”).
Level: HARD. Evidence: False permission patterns row “Отсутствие сигнала ‘запрещено’”.
Agent action: 1) признать permission unknown; 2) задать Permission Questions (§4).

- LS-09: агент делает выводы по budgeted/обрезанному фрагменту перед cross-layer шагом.
Level: SOFT. Evidence: Missing STOP signals row “Budgeted view”; Doctrine: “Truncated by budget… rerun …”.
Agent action: 1) если есть truncation или режим budgeted, запросить `--full-signals`; 2) повторить focus-view.

- LS-10: агент видит импортный edge и трактует его как разрешение (allowed-by-graph ⇒ allowed-by-policy).
Level: HARD. Evidence: False permission patterns row “Есть import edge A → B”.
Agent action: 1) разделить dependency graph vs permission graph; 2) запросить policy-контекст на boundary crossing.

- LS-11: смешение `[PROD]/[TEST]` маркеров с разрешённостью направлений.
Level: HARD. Evidence: Missing STOP signals row “src/* ↔ test/*”; layer audit summary о неявных слоях.
Agent action: 1) зафиксировать “test-only dependency?”; 2) требовать разрешения на `PROD → TEST`.

- LS-12: попытка “обойти протокол” из-за локальной оптимизации (“сделаю маленькую правку, слои не важны”).
Level: SOFT. Evidence: Mental model в промте + Layer audit scenarios S1–S5 (локальная мотивация reuse).
Agent action: 1) остановиться и обозначить boundary crossing; 2) запросить минимальный permission-контекст.

## 4) Minimal Permission Questions Protocol (HARD STOP)

1. Это “visibility vs permission”: я вижу модуль в дереве, но есть ли permission на зависимость?
2. Это cross-layer dependency? Какие “слои” (по путям) пересекаются: `src/*` / `test/*` / `docs/*` / `scripts/*` / разные папки в `src/*`?
3. Это test-only dependency (из `test/*`) или prod-код?
4. Есть ли one-way boundary: какое направление разрешено (если вообще)?
5. Это allowed-by-graph vs allowed-by-policy: есть ли текст/контракт, который делает это “LAW”, а не “GUIDANCE/HINT” (`AGENT_TEXT_STRICTNESS_CANON.md`)?
6. Это boundary crossing, который должен идти через adapter-only access, а не direct dependency?
7. Достаточно ли контекста: есть ли focus-view и нет ли truncation/budgeted неизвестности?

## 5) Safe Use Rules (until permission graph exists)

- Rule: Всегда отделяй dependency graph от permission graph; отсутствие STOP cue не равно “разрешено”.
Why: Это зафиксировано как blind spot (“absence of prohibition”) в layer audit.
Trust anchors: TA-04 (signals not verification).

- Rule: Перед правкой файла и перед любым boundary crossing бери focus-view для затрагиваемых файлов.
Why: Иначе агент действует по “дереву” без карты importers/imports.
Trust anchors: TA-08.

- Rule: Если видишь `Truncated by budget…` или режим `budgeted`, считай скрытое unknown и расширяй контекст.
Why: Absence-in-budgeted не является фактом отсутствия.
Trust anchors: TA-02, TA-03.

- Rule: Не используй `[HUB]` как аргумент разрешённости; HUB = навигация/риск, не permission.
Why: `[HUB]` объявлен “not a contract”.
Trust anchors: TA-05.

- Rule: Для `src/* ↔ test/*`, `src/* ↔ docs/*`, `src/* ↔ scripts/*` всегда включай HARD STOP.
Why: В layer audit эти зоны помечены как Missing STOP signals (permission не выражен).
Trust anchors: TA-06 (prod/test semantics), TA-04.

## 6) Mini examples (E1–E3)

- E1 “импортировать test helper в prod”.
Triggers: LS-01, LS-11, LS-08. Level: HARD.
Questions: #2, #3, #4, #5. Next minimal step: запросить permission-контекст (док/контракт) на `src → test`.

- E2 “использовать scripts утилиту в src”.
Triggers: LS-03, LS-08, LS-10. Level: HARD.
Questions: #1, #2, #6. Next minimal step: запросить policy-контекст “можно ли direct dependency на scripts”, или остановиться.

- E3 “вынести helper в src/utils и импортировать везде”.
Triggers: LS-06, LS-07, LS-04/LS-05. Level: HARD.
Questions: #2, #4, #5, #6. Next minimal step: запросить правило one-way boundary/permission для `src/utils` и направлений доступа.

