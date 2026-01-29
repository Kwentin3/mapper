/**
 * AI Preamble text that appears at the top of ARCHITECTURE.md.
 *
 * This text is taken directly from PRD v0.8, Section 16.
 */

export const AI_PREAMBLE = `## AI Preamble — How to Use This Map

### Navigation Strategy
1. Start from (→ ENTRYPOINT) files.
2. For changes, use --focus-file=<path> to see ← importers and → imports.
3. Use Fan‑out hubs to find orchestrators; use Fan‑in hubs to assess blast radius.
4. If you see (!) signals, treat them as high risk and investigate before refactor.
5. Use --full-signals to remove budgeting limits when you need the full view.

### Summary markers & budgeting
[HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
 - [PROD] / [TEST] markers appear in summary sections to separate production vs test code.
 - Budgeted lists may be truncated; use --full-signals to disable budgets and show full lists.

### Interpretation rules for agents
- Absence of an item or signal in a budgeted output does NOT mean absence in the codebase; budgets may truncate results.
- For risky decisions rerun with --full-signals to obtain the full view.
- [HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
- Signals are heuristic navigation aids, not formal verification.
- AI Preamble is human guidance, not a machine schema; prefer stable top-level "##" headings as anchors when parsing.

Agent guidance for [HUB]
- If you change a [HUB] file: use --focus-file <path> to inspect importers/imports and assess blast radius.
- If signals are missing or unclear, rerun with --full-signals before making risky decisions.
- Run tests after modifying hub files; hub changes often have wide impact.

### Signal Priority
(!) → (?) → (i) → (→)

### ORPHAN guidance
- ORPHAN means "no repo-local importers" (or the equivalent in your project).
- ORPHAN is not automatically safe; check PUBLIC-API / ENTRYPOINT / deep-dive before assuming low risk.
`;