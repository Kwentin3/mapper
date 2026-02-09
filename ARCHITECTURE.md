## AI Preamble — How to Use This Map

### Navigation Strategy
1. Start from (→ ENTRYPOINT) files.
   Summary "### Entrypoints" lists [PROD] entrypoints; inline (→ ENTRYPOINT) can also appear on [TEST] files with fan-in 0.
2. For changes, use --focus-file=<path> to see ← importers and → imports.
3. Use Fan‑out hubs to find orchestrators; use Fan‑in hubs to assess blast radius.
4. If you see (!) signals, treat them as high risk and investigate before refactor.
5. Use --full-signals to remove budgeting limits when you need the full view.

### Summary markers & budgeting
[HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
 - [PROD] / [TEST] markers appear in summary sections to separate production vs test code.
 - In budgeted mode, lists may be truncated; use --full-signals to disable budgets and show full lists.

### Interpretation rules for agents
- Absence of an item or signal in a budgeted output does NOT mean absence in the codebase; budgets may truncate results.
- If this view is budgeted, rerun with --full-signals to obtain the full view for risky decisions.
- [HUB] marks graph hubs (high fan-in or fan-out). Render-only; not a contract or API guarantee.
- Signals are heuristic navigation aids, not formal verification.
- AI Preamble is human guidance, not a machine schema; prefer stable top-level "##" headings as anchors when parsing.
- Agent interpretation rules: docs/agent-interpretation.md

Agent guidance for [HUB]
- If you change a [HUB] file: use --focus-file <path> to inspect importers/imports and assess blast radius.
- If this view is budgeted and signals are missing or unclear, rerun with --full-signals before making risky decisions.
- Run tests after modifying hub files; hub changes often have wide impact.

### Signal Priority
(!) → (?) → (i) → (→)

### ORPHAN guidance
- ORPHAN means "no repo-local importers" (or the equivalent in your project).
- ORPHAN is not automatically safe; check PUBLIC-API / ENTRYPOINT / deep-dive before assuming low risk.


## Generation Metadata

- View mode: budgeted
- Profile: default
- Budget profile: default

## Entrypoints & Public Surface

### Entrypoints
- `src/resolver/index.ts` [PROD] – fan-in is 0, imports others
- `src/cli/main.ts` [PROD] – fan-in is 0, imports others

## Graph Hubs (Fan‑in / Fan‑out)

### Fan‑in Hubs
- `src/pipeline/run_pipeline.ts` [PROD] [HUB] – Fan‑in 25
- `src/utils/determinism.ts` [PROD] [HUB] – Fan‑in 22
- `src/cli/run.ts` [PROD] [HUB] – Fan‑in 17
- (tests: 2 moved to bottom)
- `test/helpers/fixture_builder.ts` [TEST] [HUB] – Fan‑in 25
- `test/helpers/temp_dirs.ts` [TEST] [HUB] – Fan‑in 21

### Fan‑out Hubs
- `src/render/render_architecture_md.ts` [PROD] [HUB] – Fan‑out 7
- `src/render/index.ts` [PROD] [HUB] – Fan‑out 6
- `src/signals/index.ts` [PROD] [HUB] – Fan‑out 6
- (tests: 2 moved to bottom)
- `test/contract_signals_sticky_under_inline_budget.test.ts` [TEST] [HUB] – Fan‑out 6
- `test/contract_telemetry_not_sticky_budget.test.ts` [TEST] [HUB] – Fan‑out 6


## Contract coverage

- C+: 0
- C?: 0
- C0: 7
- C~: 106

### High-risk (C0/C?)
- `src/cli/index.ts` (C0)
- `src/graph/index.ts` (C0)
- `src/parser/index.ts` (C0)
- `src/render/index.ts` (C0)
- `src/resolver/index.ts` (C0)
- +2 more

### Legend
- [C+] boundary with inbound + outbound anchors
- [C?] boundary with partial anchors
- [C0] boundary with no anchors
- [C~] not in boundary or unreadable

## Local Dependencies (Budgeted)
Списки отсортированы лексикографически по POSIX (repo-relative). Показаны первые N зависимостей; используйте --full-signals для полного списка.

`src/pipeline/run_pipeline.ts`
- `←` `src/cli/run.ts`, `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`
Truncated by budget; rerun with --full-signals (+22 more).
- `→` `src/config/load.ts`, `src/utils/determinism.ts`

`test/helpers/fixture_builder.ts`
- `←` `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`, `test/contract_prd_truth_preservation_depth.test.ts`
Truncated by budget; rerun with --full-signals (+22 more).
- `→` `src/utils/determinism.ts`

`src/utils/determinism.ts`
- `←` `src/graph/build_graph.ts`, `src/parser/ast_parser.ts`, `src/parser/regex_fallback.ts`
Truncated by budget; rerun with --full-signals (+19 more).
- `→` 

`test/helpers/temp_dirs.ts`
- `←` `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`, `test/cli_invalid_path_flag.test.ts`
Truncated by budget; rerun with --full-signals (+18 more).
- `→` 

`src/cli/run.ts`
- `←` `src/cli/index.ts`, `test/budget_profiles_contract.test.ts`, `test/cli_args_contract.test.ts`
Truncated by budget; rerun with --full-signals (+14 more).
- `→` `src/pipeline/run_pipeline.ts`

`src/render/render_architecture_md.ts`
- `←` `src/render/index.ts`, `test/contract_signals_sticky_under_inline_budget.test.ts`, `test/contract_telemetry_not_sticky_budget.test.ts`
Truncated by budget; rerun with --full-signals (+9 more).
- `→` `src/config/profiles.ts`, `src/render/budgets.ts`, `src/render/format.ts`
Truncated by budget; rerun with --full-signals (+4 more).

`src/render/index.ts`
- `←` `test/focus_truncation_notice_contract.test.ts`, `test/full_signals_text_trust_contract.test.ts`, `test/graph_immutability.test.ts`
Truncated by budget; rerun with --full-signals (+2 more).
- `→` `src/render/preamble.ts`, `src/render/render_architecture_md.ts`, `src/render/render_summary.ts`
Truncated by budget; rerun with --full-signals (+3 more).

`src/signals/index.ts`
- `←` `test/contract_signals_sticky_under_inline_budget.test.ts`, `test/contract_telemetry_not_sticky_budget.test.ts`, `test/render_parseResults_guard_no_focus.test.ts`
- `→` `src/signals/compute_signals.ts`, `src/signals/contract_types.ts`, `src/signals/filter.ts`
Truncated by budget; rerun with --full-signals (+3 more).

`test/contract_signals_sticky_under_inline_budget.test.ts`
- `←` 
- `→` `src/graph/index.ts`, `src/parser/index.ts`, `src/render/render_architecture_md.ts`
Truncated by budget; rerun with --full-signals (+3 more).

`test/contract_telemetry_not_sticky_budget.test.ts`
- `←` 
- `→` `src/graph/index.ts`, `src/parser/index.ts`, `src/render/render_architecture_md.ts`
Truncated by budget; rerun with --full-signals (+3 more).

## Project Tree

```
└── Маппер кода
    ├── docs
    │   ├── adr
    │   │   └── ADR-000X-tree-rendering-contract.md
    │   ├── old PRD
    │   │   ├── prd_project_architecture_mapper_v_0.8.md
    │   │   ├── project_mapper_prd_v0.2.md
    │   │   ├── project_mapper_prd_v0.3.md
    │   │   ├── project_mapper_prd_v0.4.md
    │   │   ├── project_mapper_prd_v0.5.md
    │   │   ├── project_mapper_prd_v0.6.md
    │   │   ├── project_mapper_prd_v0.7.md
    │   │   └── project_mapper_prd.md
    │   ├── AGENT_MANIFEST.md
    │   ├── agent-interpretation.md
    │   ├── ARCHITECTURE_MAP.md
    │   ├── CLI.md
    │   ├── deploy.md
    │   ├── DEV_GUIDE.md
    │   ├── PR_DESCRIPTION.md
    │   ├── prd_project_architecture_mapper_v_0.9.md
    │   ├── RENDER_CONTRACTS.md
    │   └── test_policy_manifest.md
    ├── out
    │   └── … (22 files, 1 subdir)
    ├── scripts
    │   └── clean_artifacts.js (? DYNAMIC-IMPORT) (i ORPHAN)
    ├── src
    │   ├── cli
    │   │   ├── index.ts (←1 →1)
    │   │   ├── main.ts (→ ENTRYPOINT) (←0 →1)
    │   │   └── run.ts [HUB] (? GOD-MODULE) (←17 →1)
    │   ├── config
    │   │   ├── load.ts (i CONTRACT: input) (←2 →1)
    │   │   └── profiles.ts (←3 →0)
    │   ├── contracts
    │   │   ├── boundary_targeting.ts (←1 →0)
    │   │   ├── contract_targeting.ts (←2 →1)
    │   │   └── scan_contract_anchors.ts (i CONTRACT: input) (i CONTRACT: output) (←2 →0)
    │   ├── graph
    │   │   ├── build_graph.ts (←8 →1)
    │   │   ├── index.ts (←3 →2)
    │   │   └── types.ts (←1 →0)
    │   ├── parser
    │   │   ├── ast_parser.ts (←4 →1)
    │   │   ├── index.ts (←3 →4)
    │   │   ├── parse_file.ts (←3 →2)
    │   │   ├── regex_fallback.ts (←3 →1)
    │   │   └── types.ts (←1 →0)
    │   ├── pipeline
    │   │   └── run_pipeline.ts [HUB] (? GOD-MODULE) (←25 →2)
    │   ├── render
    │   │   ├── budgets.ts (←1 →0)
    │   │   ├── format.ts (←4 →1)
    │   │   ├── index.ts [HUB] (←5 →6)
    │   │   ├── preamble.ts (←5 →0)
    │   │   ├── render_architecture_md.ts [HUB] (←12 →7)
    │   │   ├── render_summary.ts (←4 →1)
    │   │   ├── render_tree.ts (←10 →3)
    │   │   ├── smart_collapse.ts (←3 →0)
    │   │   └── types.ts (←1 →0)
    │   ├── resolver
    │   │   ├── index.ts (→ ENTRYPOINT) (←0 →4)
    │   │   ├── read_package_json.ts (i CONTRACT: input) (←2 →0)
    │   │   ├── read_tsconfig.ts (i CONTRACT: input) (←2 →0)
    │   │   ├── resolve_specifier.ts (←9 →3)
    │   │   └── types.ts (←1 →0)
    │   ├── scanner
    │   │   ├── excludes.ts (←2 →1)
    │   │   ├── index.ts (←3 →3)
    │   │   ├── scan.ts (←3 →3)
    │   │   └── types.ts (←2 →0)
    │   ├── signals
    │   │   ├── compute_contract_telemetry.ts (←2 →1)
    │   │   ├── compute_signals.ts (←7 →4)
    │   │   ├── contract_types.ts (←1 →0)
    │   │   ├── contracts_signals.ts (←1 →2)
    │   │   ├── filter.ts (←4 →1)
    │   │   ├── index.ts [HUB] (←3 →6)
    │   │   ├── policies.ts (←3 →0)
    │   │   ├── rank.ts (←3 →2)
    │   │   └── types.ts (←1 →0)
    │   └── utils
    │       └── determinism.ts [HUB] (? GOD-MODULE) (←22 →0)
    ├── test
    │   ├── helpers
    │   │   ├── fixture_builder.ts [HUB] (? DYNAMIC-IMPORT) (? GOD-MODULE) (←25 →1)
    │   │   └── temp_dirs.ts [HUB] (? GOD-MODULE) (←21 →0)
    │   ├── src
    │   │   └── a.ts
    │   ├── a.ts
    │   ├── ai_preamble_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── budget_profiles_contract.test.ts (→ ENTRYPOINT) (←0 →4)
    │   ├── classification_summary_annotation.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── classify_path_kind_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_args_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_budget_flag.test.ts
    │   ├── cli_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_flags_focus_depth.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_focus_depth_truth.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_generate_file.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_golden_fixture_repo.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_invalid_path_flag.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── cli_noise_control.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_positional_out.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_selfscan_outdir_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_silent_io_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_smoke.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_tsconfig_alias_priority.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_utf8_output.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── contract_boundary_targeting.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── contract_prd_truth_preservation_depth.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── contract_signals_sticky_under_inline_budget.test.ts [HUB] (→ ENTRYPOINT) (←0 →6)
    │   ├── contract_telemetry_compute.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── contract_telemetry_not_sticky_budget.test.ts [HUB] (→ ENTRYPOINT) (←0 →6)
    │   ├── depth_collapse_indicators.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── docs_config_orphan_suppressed.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── entrypoint_inline_signal.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── entrypoint_orphan_suppressed_by_default.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── entrypoint_summary_excludes_tests.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── fixture_builder_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── focus_deep_dive_hub_tag.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_depth_cli_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── focus_file_contract_telemetry.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_file_deep_dive.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_file_not_found_cli_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── focus_task_capsule.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_truncation_hint_dedup_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── full_signals_changes_output.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── full_signals_text_trust_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── graph_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── graph_cycle_self.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── graph_cycle_simple.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── graph_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_external.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── graph_fan_metrics.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── graph_immutability.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── impact_path_contract.test.ts (→ ENTRYPOINT) (←0 →4)
    │   ├── impact_path_no_public_api.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── impact_path_ordering_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── impact_path_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── indentation_collapse_flag.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── indentation_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── indentation_focus_stub.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── local_deps_legend.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── local_deps_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── no_test_temp_dirs.test.ts
    │   ├── orphan_filtering_default.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── orphan_filtering_show_orphans.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── orphan_render_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── parser_ast_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── parser_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── parser_dynamic_import.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── parser_parse_error.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── pipeline_e2e_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── policy_collapse_temp.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── preamble_interpretation_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── render_collapse_indicators.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_contract_telemetry_render.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_depth_stub_risk.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_determinism.test.ts (i CONTRACT: input) (→ ENTRYPOINT) (←0 →1)
    │   ├── render_focus_not_found.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_generation_metadata_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── render_header_blocks.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_local_deps_budgeting.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── render_local_deps.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_parseResults_guard_no_focus.test.ts (→ ENTRYPOINT) (←0 →6)
    │   ├── render_smart_collapse.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_tree_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_tree_hub_tag.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── resolver_circular_alias.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_external_default.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_js_extension_fallback.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_package_imports.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_relative.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── resolver_tsconfig_paths.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── scan_contract_anchors.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── scanner_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── scanner_sorting_mocked_fs.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── semantic_profile_v0.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── signals_budgeting.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── signals_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── signals_hubs_summary.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── signals_inline_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── signals_thresholds.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_classification_test_dir_regression.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_hub_agent_guidance_legend.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_hub_legend.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_hub_semantics_legend.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_hub_tag.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── summary_hub_truncation_hint.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── summary_interpretation_rules_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── summary_prod_first.test.ts (→ ENTRYPOINT) (←0 →3)
    │   └── tree_rendering_guard.test.ts
    ├── AGENT_NAVIGATION_DOCTRINE.md (i ORPHAN)
    ├── AGENT_TEXT_STRICTNESS_CANON.md (i ORPHAN)
    ├── AGENT_TRUST_DRIFT_AUDIT.report.md (i ORPHAN)
    ├── ARCHITECTURE_CONTRACT_COVERAGE.md (i ORPHAN)
    ├── ARCHITECTURE.md (i ORPHAN)
    ├── CHANGELOG.md
    ├── CLI_ERROR_UX.Mapper.report.md (i ORPHAN)
    ├── LAYER_STOP_SEMANTICS_CANON.md (i ORPHAN)
    ├── LAYER_VIOLATION_AGENT_AUDIT.report.md (i ORPHAN)
    ├── otchet.md (i ORPHAN)
    ├── package-lock.json
    ├── package.json
    ├── plan 4.md (i ORPHAN)
    ├── PROJECT_ANAMNESIS.report.md (i ORPHAN)
    ├── project-architecture-mapper-0.8.1.tgz (i ORPHAN)
    ├── README.md
    ├── REPLAY_AGENT_USABILITY.report.md (i ORPHAN)
    ├── TEXT_TRUST_MICROFIX.report.md (i ORPHAN)
    ├── tmp_generate_impact_md.js (? DYNAMIC-IMPORT) (i ORPHAN)
    ├── tsconfig.json
    ├── UX_AUDIT.Mapper.report.md (i ORPHAN)
    └── UX_FIXES.Mapper.report.md (i ORPHAN)
```
