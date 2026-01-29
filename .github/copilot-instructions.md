# Copilot instructions — Project Architecture Mapper

Short: This repository is a TypeScript CLI that scans a codebase and emits an
ARCHITECTURE.md artifact. Edit TypeScript in `src/`, run `npm run build`, and
validate with `npm test` (Vitest). Node >=18 and TypeScript are required.

Key files and entry points
- `src/cli/run.ts` — CLI argument parsing and top-level orchestration (calls
  `runPipeline`). Examples: flags `--focus`, `--depth`, `--full-signals`,
  `--show-orphans`, `--out`.
- `src/pipeline/run_pipeline.ts` — main pipeline runner (scanner → parser →
  graph → resolver → render).
- `src/scanner`, `src/parser`, `src/graph`, `src/resolver`, `src/render`,
  `src/signals` — primary components implementing the data flow.
- `test/` — extensive Vitest suite checking determinism, rendering, resolver
  behaviors and CLI edge cases (use these tests to understand intended
  semantics and invariants).

Build / test / run (exact commands)
- Build: `npm run build` (runs `tsc` and emits `dist/`)
- Typecheck only: `npm run typecheck` (tsc --noEmit)
- Tests: `npm test` (runs `vitest run`); watch mode: `npm run test:watch`
- Run built CLI: `node dist/cli/main.js --out ARCHITECTURE.md .` or use the
  installed `project-architecture-mapper` bin after `npm link` or global
  install.

Project conventions and patterns
- Determinism is important: many tests assert deterministic ordering and
  outputs. Avoid introducing non-deterministic iteration orders. Sorting is
  used at various points (see `graph` & `render` modules).
- Output encoding must be UTF-8 without BOM (note in `README.md`). Output
  directory is excluded from scanning to avoid self-inclusion.
- CLI returns structured exit codes: 0 success, 1 user error (invalid path/flags),
  2 internal error. See `src/cli/run.ts` for examples.
- Profiles: built-in profile names include `default`, `fsd`, `monorepo` (used
  via `--profile`). Check pipeline/profile code paths when changing behavior.
- Type declarations and bundling: TS compiler emits `declaration` files and
  targets CommonJS (`tsconfig.json`). Keep `rootDir: ./src` and output to
  `dist/` when changing source layout.

Editing workflow guidance for Copilot/AI edits
- Prefer editing TypeScript under `src/` and run `npm run build` to produce
  runnable JS in `dist/` before manual test runs.
- When changing CLI semantics, update `test/cli_*.test.ts` files and run
  `npm test` — many tests exercise argument parsing edge cases and focus/depth
  behavior.
- When adding new public-facing flags or profiles, update `src/cli/run.ts`,
  add unit tests under `test/`, and update README usage examples.

Cross-component expectations
- Dataflow: scanner → parser → graph → resolver → pipeline → render → file
  output. Look for `runPipeline` invocations to trace the full flow.
- Signals and budgets: signal calculation and budget thresholds live under
  `src/signals`. Tests under `test/signals_*` show expected budgets and outputs.

Quick examples (from repo)
- Parse args: `src/cli/run.ts` uses `util.parseArgs` with `allowUnknown: true`.
- Writing output: CLI writes UTF-8 with `writeFileSync(outPath, result.markdown, 'utf-8')`.

Verification checklist for PRs produced by an AI
1. `npm run typecheck` must pass.
2. `npm run build` must succeed and produce `dist/` artifacts.
3. `npm test` (Vitest) must pass; update/add tests when behavior changes.
4. Preserve deterministic ordering; add sorting when necessary.

If any guidance is unclear or you want more examples (e.g., a walkthrough of
how `scanner → parser → graph` passes a file through the system), ask and I
will add a short trace referencing specific functions and test cases.
