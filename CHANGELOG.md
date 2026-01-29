# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-28

### Fixed / Changed
- Защитные проверки для контрактной телеметрии в рендере: поле render input `parseResults` не влияет на итоговый markdown, если не используется `--focus-file`.
- Корректировка приоритета контрактных сигналов: теперь "health" сигналы границ (INPUT_ONLY_CONTRACT, OUTPUT_ONLY_CONTRACT, NO_CONTRACT) приоритетно сохраняются при применении inlinePerFileMax; информационная телеметрия `CONTRACT: input/output` не приоритетна и может быть обрезана.
- Стабилизация тестов бюджетов: уточнены проверки в `budget_profiles_contract.test.ts` для детерминированности.


## [0.8.1] - 2026-01-21

### Fixed
- Fixed determinism when output directory is inside root (auto-excluded).
- Added default excludes tmp/temp.
- Added resolver fallback for .js/.mjs/.cjs/.jsx to TS sources.

## [0.8.2] - 2026-01-22

### Fixed
- Normalize tree renderer prefix logic: introduce canonical `buildTreePrefix` and unify node/stub rendering to fix misaligned vertical guides and inconsistent collapse stubs.

### Added
- `docs/RENDER_CONTRACTS.md` — developer-facing contract and agent guidance for the renderer.

### Tests
- Added regression tests covering indentation, focused stubs and collapse behavior; updated rendering tests to the canonical output.

## Unreleased - 2026-01-23

### Added
- CLI flag `--focus-file=<path>`: renders a new "Focused Deep-Dive" section in `ARCHITECTURE.md` for exactly one repo-local file. The section lists repo-local importers (←) and imports (→), POSIX-normalized and lexicographically sorted. The view is budgeted (N = 10) with a canonical truncation indicator `(… +K more)`; pass `--full-signals` to disable truncation.

### Notes
- The feature is render-only and preserves analysis truth: it only surfaces adjacency information from the existing dependency graph and does not change signal computation or project tree semantics. If the requested file is not found in the graph, the CLI fails deterministically with exit code 1 and message: `Error: --focus-file not found: <path>`.
