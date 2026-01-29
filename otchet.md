# Отчёт по задаче L10.1 — Interpretation Rules for Agents (AI Preamble)

Коротко

Добавлен компактный, детерминированный блок «Interpretation rules for agents» в AI preamble (файл `src/render/preamble.ts`) и создан контрактный тест `test/summary_interpretation_rules_contract.test.ts`, который гарантирует наличие оговорок и инвариантность preamble при `--full-signals`. Изменения строго render-only.

1) Изменённые файлы

- `src/render/preamble.ts` — добавлен раздел "### Interpretation rules for agents" (5–7 коротких ASCII строк).
- `test/summary_interpretation_rules_contract.test.ts` — новый контрактный тест, проверяющий наличие ключевых фраз и инвариантность/детерминизм.

2) Короткое содержание добавленного блока в `AI Preamble`

- Absence of an item or signal in a budgeted output does NOT mean absence in the codebase; budgets may truncate results.
- For risky decisions rerun with --full-signals to obtain the full view.
- [HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
- Signals are heuristic navigation aids, not formal verification.
- AI Preamble is human guidance, not a machine schema; prefer stable top-level "##" headings as anchors when parsing.

3) Что проверяет новый тест

- Извлекает блок `## AI Preamble` (между заголовком и следующим топ‑уровнем `##`).
- Проверяет наличие заголовка `### Interpretation rules for agents`.
- Проверяет ключевые фразы: `heuristic`, `navigat` (navigation/navigational), `--full-signals`, `[HUB]`, `not a contract`.
- Проверяет инвариантность: baseline (budgeted) preamble === full-signals preamble (byte-for-byte).
- Проверяет детерминизм: повторный baseline рендер равен первому.

4) Quality gates — результаты (raw)

- `npm run typecheck` → EXIT:0 (PASS)
- `npm run build` → EXIT:0 (PASS)
- `npm run test -- test/summary_interpretation_rules_contract.test.ts` → PASS
  - Test Files 1 passed (1)
  - Tests 1 passed (1)
- `npm run test` (full suite) → PASS
  - Test Files 99 passed (99)
  - Tests 309 passed (309)

5) Детерминизм и scope

- Блок preamble детерминирован и не зависит от `--full-signals` (тест подтверждает равенство).
- Изменения только render/test — `signals/`, `graph/`, `scanner/`, `parser/` не менялись.

6) Примеры строк (evidence)

Ниже фрагмент из AI preamble, содержащий обязательные элементы (показано в repo-рендере):

```
[HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
- Budgeted lists may be truncated; use --full-signals to disable budgets and show full lists.

### Interpretation rules for agents
- Absence of an item or signal in a budgeted output does NOT mean absence in the codebase; budgets may truncate results.
- For risky decisions rerun with --full-signals to obtain the full view.
- [HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
- Signals are heuristic navigation aids, not formal verification.
- AI Preamble is human guidance, not a machine schema; prefer stable top-level "##" headings as anchors when parsing.
```

7) Замечания / рекомендации

- Блок преднамеренно короткий и декларативный: его цель — дать агента-интерпретатору минимальные правила безопасности и эскалации.
- При желании можно добавить unit-test, проверяющий точную строку `formatHubTruncationHint()` для защиты byte-for-byte инварианта.

Заключение

L10.1 выполнена: preamble получил компактный интерпретационный контракт, тесты покрывают инвариантность и детерминизм, все quality gates зелёные.
