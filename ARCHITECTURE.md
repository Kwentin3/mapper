## AI Preamble — How to Use This Map

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


## Entrypoints & Public Surface

### Entrypoints
- `src/cli/main.ts` [PROD] – fan-in is 0, imports others

## Graph Hubs (Fan‑in / Fan‑out)

### Fan‑in Hubs
- `src/pipeline/run_pipeline.ts` [PROD] [HUB] – Fan‑in 23
- `src/utils/determinism.ts` [PROD] [HUB] – Fan‑in 20
- `src/signals/types.ts` [PROD] [HUB] – Fan‑in 18
- (tests: 2 moved to bottom)
- `test/helpers/fixture_builder.ts` [TEST] [HUB] – Fan‑in 22
- `test/helpers/temp_dirs.ts` [TEST] [HUB] – Fan‑in 18

### Fan‑out Hubs
- `src/render/render_architecture_md.ts` [PROD] [HUB] – Fan‑out 11
- `src/pipeline/run_pipeline.ts` [PROD] [HUB] – Fan‑out 8
- `src/render/render_tree.ts` [PROD] [HUB] – Fan‑out 7
- `src/render/index.ts` [PROD] [HUB] – Fan‑out 6
- (tests: 1 moved to bottom)
- `test/helpers/fixture_builder.ts` [TEST] [HUB] – Fan‑out 7


## Local Dependencies (Budgeted)
Списки отсортированы лексикографически по POSIX (repo-relative). Показаны первые N зависимостей; используйте --full-signals для полного списка.

`src/pipeline/run_pipeline.ts`
- `←` `src/cli/run.ts`, `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`
Truncated by budget; rerun with --full-signals (+20 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` `src/config/load.ts`, `src/graph/index.ts`, `src/parser/index.ts`
Truncated by budget; rerun with --full-signals (+5 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.

`test/helpers/fixture_builder.ts`
- `←` `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`, `test/contract_prd_truth_preservation_depth.test.ts`
Truncated by budget; rerun with --full-signals (+19 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` `src/graph/types.ts`, `src/parser/types.ts`, `src/render/types.ts`
Truncated by budget; rerun with --full-signals (+4 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.

`src/utils/determinism.ts`
- `←` `src/graph/build_graph.ts`, `src/parser/ast_parser.ts`, `src/parser/regex_fallback.ts`
Truncated by budget; rerun with --full-signals (+17 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` 

`src/signals/types.ts`
- `←` `src/render/render_architecture_md.ts`, `src/render/render_summary.ts`, `src/render/render_tree.ts`
Truncated by budget; rerun with --full-signals (+15 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` 

`test/helpers/temp_dirs.ts`
- `←` `test/budget_profiles_contract.test.ts`, `test/classification_summary_annotation.test.ts`, `test/contract_prd_truth_preservation_depth.test.ts`
Truncated by budget; rerun with --full-signals (+15 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` 

`src/render/render_architecture_md.ts`
- `←` `src/render/index.ts`, `test/contract_signals_sticky_under_inline_budget.test.ts`, `test/contract_telemetry_not_sticky_budget.test.ts`
Truncated by budget; rerun with --full-signals (+8 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` `src/config/profiles.ts`, `src/contracts/contract_targeting.ts`, `src/contracts/scan_contract_anchors.ts`
Truncated by budget; rerun with --full-signals (+8 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.

`src/render/render_tree.ts`
- `←` `src/render/index.ts`, `src/render/render_architecture_md.ts`, `test/depth_collapse_indicators.test.ts`
Truncated by budget; rerun with --full-signals (+7 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` `src/graph/types.ts`, `src/render/smart_collapse.ts`, `src/render/types.ts`
Truncated by budget; rerun with --full-signals (+4 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.

`src/render/index.ts`
- `←` `src/pipeline/run_pipeline.ts`, `test/focus_truncation_notice_contract.test.ts`, `test/graph_immutability.test.ts`
Truncated by budget; rerun with --full-signals (+2 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.
- `→` `src/render/preamble.ts`, `src/render/render_architecture_md.ts`, `src/render/render_summary.ts`
Truncated by budget; rerun with --full-signals (+3 more).
Note: this [HUB] list is truncated by budget; rerun with --full-signals to inspect full blast radius.

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
    │   ├── ARCHITECTURE_MAP.md
    │   ├── CLI.md
    │   ├── DEV_GUIDE.md
    │   ├── PR_DESCRIPTION.md
    │   ├── prd_project_architecture_mapper_v_0.9.md
    │   ├── RENDER_CONTRACTS.md
    │   └── test_policy_manifest.md
    ├── src
    │   ├── cli
    │   │   ├── index.ts (←1 →1)
    │   │   ├── main.ts (→ ENTRYPOINT) (←0 →1)
    │   │   └── run.ts (? GOD-MODULE) (←16 →1)
    │   ├── config
    │   │   ├── load.ts (i CONTRACT: input) (←1 →1)
    │   │   └── profiles.ts (←2 →0)
    │   ├── contracts
    │   │   ├── boundary_targeting.ts (←1 →0)
    │   │   ├── contract_targeting.ts (←3 →1)
    │   │   └── scan_contract_anchors.ts (i CONTRACT: input) (i CONTRACT: output) (←3 →0)
    │   ├── graph
    │   │   ├── build_graph.ts (←8 →2)
    │   │   ├── index.ts (←4 →2)
    │   │   └── types.ts (←14 →2)
    │   ├── parser
    │   │   ├── ast_parser.ts (←4 →2)
    │   │   ├── index.ts (←4 →4)
    │   │   ├── parse_file.ts (←3 →3)
    │   │   ├── regex_fallback.ts (←3 →2)
    │   │   └── types.ts (←14 →0)
    │   ├── pipeline
    │   │   └── run_pipeline.ts [HUB] (? GOD-MODULE) (←23 →8)
    │   ├── render
    │   │   ├── budgets.ts (←1 →0)
    │   │   ├── format.ts (←4 →1)
    │   │   ├── index.ts [HUB] (←5 →6)
    │   │   ├── preamble.ts (←4 →0)
    │   │   ├── render_architecture_md.ts [HUB] (←11 →11)
    │   │   ├── render_summary.ts (←4 →2)
    │   │   ├── render_tree.ts [HUB] (←10 →7)
    │   │   ├── smart_collapse.ts (←3 →2)
    │   │   └── types.ts (←12 →4)
    │   ├── resolver
    │   │   ├── index.ts (←1 →4)
    │   │   ├── read_package_json.ts (i CONTRACT: input) (←2 →0)
    │   │   ├── read_tsconfig.ts (i CONTRACT: input) (←2 →0)
    │   │   ├── resolve_specifier.ts (←9 →4)
    │   │   └── types.ts (←4 →0)
    │   ├── scanner
    │   │   ├── excludes.ts (←2 →1)
    │   │   ├── index.ts (←4 →3)
    │   │   ├── scan.ts (←3 →3)
    │   │   └── types.ts (←9 →0)
    │   ├── signals
    │   │   ├── compute_signals.ts (←7 →6)
    │   │   ├── contracts_signals.ts (←1 →4)
    │   │   ├── filter.ts (←4 →1)
    │   │   ├── index.ts (←4 →4)
    │   │   ├── rank.ts (←3 →2)
    │   │   └── types.ts [HUB] (? GOD-MODULE) (←18 →0)
    │   └── utils
    │       └── determinism.ts [HUB] (? GOD-MODULE) (←20 →0)
    ├── test
    │   ├── helpers
    │   │   ├── fixture_builder.ts [HUB] (? DYNAMIC-IMPORT) (? GOD-MODULE) (←22 →7)
    │   │   └── temp_dirs.ts [HUB] (? GOD-MODULE) (←18 →0)
    │   ├── src
    │   │   └── a.ts
    │   ├── temp_path_validation_0k2qy7v2a4ao
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_15ho30x75xw
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_1fmm5i4ppqt
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_2cm40a3j0vo
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_2cnwmlekd28
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_2ms472d927h
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_3ha2rasmr9u
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_50azwsx686i
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_76ho1q62g9k
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_79op7m3qi4q
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_934shdg75b
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_apuzv5qj4yv
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_c4t1tdszruv
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_cbzryzmvtk
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_ccv79z9uof
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_cr65k2jzc94
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_cy4yl1i0ksq
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_d4tmlbwidgb
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_dm333o0e98h
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_e0cdf78drvk
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_e0p4cwaxapw
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_edcbydk33t5
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_fbtr75adhhk
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_g600e24dgp8
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_gfgpsymjoha
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_gjjbcfc7nub
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_gxyrxgotcmj
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_hzbvbrgq7wa
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_i86erytddk
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_j6y4jrl9q7b
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_kgqgbcuqowd
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_kyyvb1uj89q
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_l8804l5en0p
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_lqv8f20lt2e
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_nuwj3h9b0ha
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_paxrsot2r8
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_qe9c6wasnxj
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_qpjkzrl5d9p
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_qxjhnmmb5t
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_s4n7xxbcad
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_sdu2vua1tp
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_tinqu54bnij
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_u27bqy2p0e
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_uhoekcvng6b
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_uqr9i3owxt9
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_uv2x56ih2v9
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_vhlhaanfoue
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_w1auzge280t
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_x8okuqbjqm
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_xcmdlledtfq
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_y67m5z7mk8k
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_y9j5n6txpz
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_ycy91zrwk3
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_yochhpmmz8e
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_z433uvkyhl8
    │   │   └── … (0 files, 0 subdirs)
    │   ├── temp_path_validation_ze1w0vk9khe
    │   │   └── … (0 files, 0 subdirs)
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
    │   ├── cli_invalid_path_flag.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_noise_control.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_positional_out.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_selfscan_outdir_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_smoke.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_tsconfig_alias_priority.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── cli_utf8_output.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── contract_boundary_targeting.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── contract_prd_truth_preservation_depth.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── contract_signals_sticky_under_inline_budget.test.ts (→ ENTRYPOINT) (←0 →6)
    │   ├── contract_telemetry_not_sticky_budget.test.ts (→ ENTRYPOINT) (←0 →6)
    │   ├── depth_collapse_indicators.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── docs_config_orphan_suppressed.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── entrypoint_inline_signal.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── entrypoint_orphan_suppressed_by_default.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── entrypoint_summary_excludes_tests.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── fixture_builder_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── focus_deep_dive_hub_tag.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_depth_cli_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── focus_file_contract_telemetry.test.ts (i CONTRACT: input) (i CONTRACT: output) (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_file_deep_dive.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_file_not_found_cli_contract.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── focus_task_capsule.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── focus_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── full_signals_changes_output.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── graph_basic.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_cycle_self.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_cycle_simple.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_determinism.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── graph_external.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_fan_metrics.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── graph_immutability.test.ts (→ ENTRYPOINT) (←0 →6)
    │   ├── impact_path_contract.test.ts (→ ENTRYPOINT) (←0 →4)
    │   ├── impact_path_no_public_api.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── impact_path_ordering_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── impact_path_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── indentation_collapse_flag.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── indentation_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── indentation_focus_stub.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── local_deps_legend.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── local_deps_truncation_notice_contract.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── no_test_temp_dirs.test.ts
    │   ├── orphan_filtering_default.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── orphan_filtering_show_orphans.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── orphan_render_determinism.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── parser_ast_basic.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── parser_determinism.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── parser_dynamic_import.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── parser_parse_error.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── pipeline_e2e_basic.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── policy_collapse_temp.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── preamble_interpretation_contract.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── render_collapse_indicators.test.ts (→ ENTRYPOINT) (←0 →4)
    │   ├── render_depth_stub_risk.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── render_determinism.test.ts (i CONTRACT: input) (→ ENTRYPOINT) (←0 →2)
    │   ├── render_focus_not_found.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── render_header_blocks.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── render_local_deps_budgeting.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── render_local_deps.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── render_parseResults_guard_no_focus.test.ts (→ ENTRYPOINT) (←0 →6)
    │   ├── render_smart_collapse.test.ts (→ ENTRYPOINT) (←0 →3)
    │   ├── render_tree_basic.test.ts (→ ENTRYPOINT) (←0 →2)
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
    │   ├── signals_budgeting.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── signals_determinism.test.ts (→ ENTRYPOINT) (←0 →2)
    │   ├── signals_hubs_summary.test.ts (→ ENTRYPOINT) (←0 →1)
    │   ├── signals_inline_basic.test.ts (→ ENTRYPOINT) (←0 →3)
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
    ├── ARCHITECTURE.md (i ORPHAN)
    ├── CHANGELOG.md
    ├── onchet.md (i ORPHAN)
    ├── otchet.md (i ORPHAN)
    ├── package-lock.json
    ├── package.json
    ├── project-architecture-mapper-0.8.1.tgz (i ORPHAN)
    ├── README.md
    ├── tmp_generate_impact_md.js (? DYNAMIC-IMPORT) (i ORPHAN)
    └── tsconfig.json
```
