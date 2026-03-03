# AUDIT.EXTERNAL.PROJECT.MCP.ODATA.1C.1 — Agent-Side Architecture Audit (External Project)

**Mode:** AUDIT / VERIFY / REPORT  
**No code changes:** enforced for external project workspace (`D:\Users\Roman\Desktop\Проекты\MCP oData 1C`).  
**Audit date:** 2026-02-09  

## Scope and Sources of Truth (Facts Only)

Allowed evidence used in this report:
- Directory structure of `D:\Users\Roman\Desktop\Проекты\MCP oData 1C`
- Configs: `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, eslint configs
- Repository docs (incl. canon index): `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\...`

Not available in this audit:
- Architecture Mapper output for the external project (`ARCHITECTURE.md` artifact is not present at repo root; the Mapper was not run here to avoid generating new files). Therefore: **STOP_REQUIRE_CONTEXT** for any claim that would require the Mapper’s dependency graph / hubs / entrypoints view.

---

## TASK A — First Contact (Project Shape)

Format: **Component / Path / Agent interpretation (what this seems to be)**  
Interpretation is constrained to what names + configs + canon docs explicitly indicate.

| Component | Path | Agent interpretation (what this seems to be) |
|---|---|---|
| Monorepo workspace | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\pnpm-workspace.yaml` | pnpm workspace spanning `packages/*`, `services/*`, `apps/*` |
| TypeScript strict base | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\tsconfig.base.json` | strict TypeScript baseline for workspace (NodeNext module) |
| Root runtime stub | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\src\server.js` and `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\package.json` | minimal Node HTTP server; root scripts delegate to `pnpm -r` (workspace build/test/lint/typecheck) |
| App: Web frontend | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\apps\web` | web UI application (package exists: `@mcp-saas/web`) |
| Package: Contracts | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\contracts` | contract-first types/schemas/events/tools API surface (`@mcp-saas/contracts`) |
| Package: DTO | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\dto` | generated DTO package (`@mcp-saas/dto`) |
| Package: Shared utils | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\shared-utils` | cross-cutting utilities (logger/redaction/errors/trace) plus OData-related helpers by filename (`odata-*`) |
| Package: MCP SDK | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\mcp-sdk` | helpers for MCP tool/event-stream usage (`@mcp-saas/mcp-sdk`) |
| Package: MCP CLI | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\mcp-cli` | CLI surface for MCP (package exists: `@mcp-saas/mcp-cli`) |
| Package: Discovery status | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\discovery-status` | library for discovery state tracking (`@mcp-saas/discovery-status`) |
| Package: Menu packs | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\menu-packs` | menu-pack artifacts/build logic (`@mcp-saas/menu-packs`) |
| Service: BFF | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\bff-service` | “Backend For Frontend” boundary (auth/tenant resolution/SaaS policies + proxying to MCP) per canon digest |
| Service: MCP | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service` | MCP orchestration service boundary (planning/tools/usage/audit/retention) per canon manifest/digest |
| Service: Discovery | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\discovery-service` | discovery pipeline boundary (fetch OData metadata, normalize, persist Schema Catalog) per canon manifest/digest |
| DB migrations | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\db\migrations` | migration artifacts (exact toolchain not inferred without opening migration files) |
| Infra/ops: stage | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\ops\stage` | deploy stack/runbooks for stage (docker-compose and deploy scripts present) |
| Bootstrap + checks + smoke scripts | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\scripts` | infra/bootstrap utilities (db health/migrate/schema check, leak scan, dev bootstrap for 1C OData/LLM) |
| System documentation (canon-indexed) | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs` | domain-structured docs; canon list exists at `docs/_index/canon.md` |
| Docker runtime envelope | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\Dockerfile` and `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docker-compose.yml` | containerized runtime/dev envelope (details not asserted without content review) |
| Env materialization | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.env` and `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.env.example` | environment configuration exists; policy/details live in canon docs under `docs/infra-ops/config-secrets/` |

Core vs transport/adapters vs infra (by path + canon docs):
- **Core runtime services:** `services/mcp-service/`, `services/bff-service/`, `services/discovery-service/` (declared service boundaries in canon docs: `docs/services/architecture/manifest.md`, `docs/services/architecture/project-digest.md`).
- **Contracts/core API surface:** `packages/contracts/` (contract-first declared; also explicitly modeled as “law” in canon docs).
- **Adapters / integrations:** `services/mcp-service/src/integrations/`, `services/discovery-service/src/adapters/`, plus OData helper modules in `packages/shared-utils/src/odata-*.ts` (inferred from folder/file names; runtime policy described in canon digest as “Adapters” layer).
- **Infra/bootstrap/scripts:** `scripts/`, `ops/`, `db/` (canon digest explicitly separates Runtime vs Bootstrap; scripts folder contains db-health/migrate/smoke code by filename).

---

## TASK B — Implicit Layers (Agent Inference)

Format: **Layer ID / Inferred responsibility / Evidence**

| Layer ID | Inferred responsibility | Evidence |
|---|---|---|
| L-WS | Workspace boundary (monorepo) | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\pnpm-workspace.yaml` lists `packages/*`, `services/*`, `apps/*` |
| L-CONTRACTS | Contract-first API surface (schemas, events, tools) | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\contracts\src\tools.ts`, `...\events.ts`, `...\json-schemas.ts`; canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\manifest.md` (“Контракты — закон системы”) |
| L-DTO | Generated DTO layer | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\dto\src\generate.ts` and package naming; canon: `...\docs\services\architecture\manifest.md` (“dto — автоген”) |
| L-SHARED | Cross-cutting shared utilities | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\shared-utils\src\logger.ts`, `...\redaction.ts`, `...\errors.ts`, `...\trace-id.ts` |
| L-SDK | MCP SDK helpers (tool/event-stream wrappers) | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\mcp-sdk\src\event-stream.ts`, `...\tools.ts` |
| L-APP | Frontend web app layer | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\apps\web\package.json` exists (`@mcp-saas/web`) |
| L-SVC-BFF | BFF service boundary | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\bff-service\src\` has domains like `auth/`, `tenancy/`, `routes/`, `sse/`, `views/`; canon: `...\docs\services\architecture\project-digest.md` (“BFF: auth/tenant resolution/SaaS policies + proxy to MCP”) |
| L-SVC-MCP | MCP orchestration boundary | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service\src\` has `planning/`, `tools/`, `usage/`, `policy/`, `integrations/`, `transport/`, `streaming/`; canon: `...\docs\services\architecture\manifest.md` (MCP responsibilities) |
| L-SVC-DISCOVERY | Discovery pipeline boundary | `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\discovery-service\src\adapters\`, `...\repositories\`, `...\telemetry\`; canon: `...\docs\services\architecture\manifest.md` (“Discovery никогда не выполняется в пользовательском запросе”) |
| L-ADAPTERS | Side-effect adapters (1C OData / LLM providers / schema catalog I/O) | Canon digest explicitly names “Adapters” and forbids “MCP contains HTTP client logic”; code hints: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service\src\integrations\1c-odata\` exists; `packages/shared-utils/src/odata-*.ts` exist |
| L-INFRA | Bootstrap/infra logic (db migration/health/smoke, deploy) | Canon digest: “No infra logic in runtime”, “Bootstrap ≠ runtime” in `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md`; folder evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\scripts\`, `...\ops\stage\`, `...\db\migrations\` |
| L-DOCS-CANON | Canonical docs as “permission policy / invariants” (not runtime truth) | Canon list exists: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\_index\canon.md`; “Path = Meaning” rule: `...\docs\README.md` |

Implicit layer boundaries that are *explicitly* encoded as “permission-like” rules:
- **Package-to-package dependency permission (partial):** ESLint boundaries rules encode allowed imports between `contracts`, `dto`, `shared-utils`, `mcp-sdk`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs` (`boundaries/elements` + `boundaries/element-types`).

---

## TASK C — Dependency vs Permission (Agent Risk)

### C1) Default confusion points (dependency graph vs permission graph)

These are “agent confusion surfaces” where a naïve agent can treat *visibility* (a module exists, an import edge exists) as *permission* (policy allows it). Language: **dependency graph** is what “imports/calls” show; **permission graph** is what architecture allows.

1) **Monorepo visibility ⇒ false permission**
- Visibility: any workspace package is “there” under `packages/*`, and TypeScript module resolution will allow many imports by path.
- Permission: canon docs enforce boundaries (service roles, contract-first, runtime vs bootstrap).
- Evidence: workspace layout `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\pnpm-workspace.yaml`; canon boundaries: `...\docs\services\architecture\project-digest.md` (“BFF ↔ MCP только через контракт”; “No infra logic in runtime”).

2) **“Shared utils” name ⇒ false general-purpose permission**
- Visibility: `packages/shared-utils` is named “shared”, which suggests “ok to depend on anywhere”.
- Permission: content is mixed: there are generic utilities (logger/redaction) *and* OData modules by filename (`odata-normalizer.ts`, `odata-metadata-probe.ts`, etc.), so “shared” does not imply “layer-neutral”.
- Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\shared-utils\src\odata-normalizer.ts` (and other `odata-*` files).

3) **Existing import edge ⇒ false permission (allowed-by-graph ≠ allowed-by-policy)**
- Even if code currently imports something, canon policy may still consider it a boundary violation.
- Evidence: this risk is explicitly codified as a guardrail in agent canon: dependency DAG for services (“Services MUST NOT import other services”) in `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\agents\agent-manifest.md`.

4) **Scripts/Bootstrap co-located with tests ⇒ prod/test/infra boundary blur**
- Visibility: `scripts/` contains both operational scripts and `*.test.ts` files (e.g. `scripts/db-health.integration.test.ts` by filename).
- Permission: canon digest states “Bootstrap ≠ runtime” and “No infra logic in runtime”; mixing paths can mislead an agent into reusing bootstrap code inside runtime handlers.
- Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md` (Runtime vs Bootstrap), plus presence of `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\scripts\` with bootstrap-named files in `package.json` scripts.

### C2) Potentially risky zones (where “видно ≠ можно” is likely)

Format: **Zone / Risk framing (visibility vs permission) / Evidence**

| Zone | Risk framing (dependency graph vs permission graph) | Evidence |
|---|---|---|
| Core (MCP planning/tools) ↔ Adapters (1C OData/LLM) | Dependency edges likely exist or will be tempting; policy says adapters are isolated modules and MCP should not embed HTTP client/provider logic | Canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md` (“MCP ↔ Adapters ... MCP не содержит логики HTTP‑клиента или LLM‑провайдера”); structure: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service\src\integrations\1c-odata` |
| BFF ↔ MCP | “It’s in the same monorepo” can trick an agent into importing MCP internals into BFF; policy forbids: contract-only interaction | Canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md` (“BFF ↔ MCP ... только через контракт”) |
| Services ↔ Services | Workspace makes it easy to import across services, but agent manifest forbids service-to-service imports | Canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\agents\agent-manifest.md` (“Services MUST NOT import other services”) |
| Runtime ↔ scripts/ops/db | Importing helpers from bootstrap into runtime looks convenient but violates “No infra logic in runtime” | Canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md` (“No infra logic in runtime”, “Bootstrap ≠ runtime”); folders: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\scripts`, `...\ops`, `...\db` |
| Prod ↔ Test | Without Mapper artifact, `[PROD]/[TEST]` classification is unknown from structure alone; risk is mixing `*.test.ts` utilities into runtime | **STOP_REQUIRE_CONTEXT** for “what is test-only” without inspecting patterns/build config; minimal evidence: Vitest includes `**/*.test.ts` from `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\vitest.config.ts` |

---

## TASK D — Layer STOP Simulation (3 typical agent steps, NOT executed)

Protocol: simulate likely STOP triggers per `LAYER_STOP_SEMANTICS_CANON.md` (LS-XX), classify HARD/SOFT, and state required permission context.  
Note: LS-XX canon is generic (“until permission graph exists”); applied here as **agent protocol**, not as a claim about existing enforcement in the external project.

### D1) Step: “переиспользовать helper из adapter в core”

Concrete instantiation (by path names only):
- Adapter-ish area: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service\src\integrations\1c-odata\`
- Core-ish area: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\mcp-service\src\planning\` or `...\tools\`

STOP triggers:
- LS-04 (cross-folder внутри `src/`) → **SOFT STOP**
- LS-05 (cross-folder внутри `src/` with unclear direction) → **SOFT STOP**
- LS-10 (allowed-by-graph ⇒ allowed-by-policy fallacy) → **HARD STOP**

Permission context required:
- One-way boundary rule: is `planning/tools` allowed to import concrete adapter helpers, or must it depend on an adapter interface/factory only? (Minimal Permission Questions: #1, #2, #4, #6 from `LAYER_STOP_SEMANTICS_CANON.md`.)
- Canon alignment check: how does this interact with “MCP ↔ Adapters isolation” law in `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md`?

### D2) Step: “добавить прямой доступ к OData из верхнего слоя”

Concrete instantiation options (both are boundary crossings):
- From BFF surface (routes): `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\services\bff-service\src\routes\` calling 1C OData directly
- From UI (app) calling OData directly (outside MCP/BFF contracts)

STOP triggers:
- LS-10 (dependency edge treated as permission) → **HARD STOP**
- LS-08 (“absence of prohibition” ⇒ “allowed”) → **HARD STOP**

Permission context required:
- Boundary permission: does top layer have permission to talk to 1C OData directly, or must it go through the declared service boundaries?
- Canon evidence exists that the intended permission is “no”: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md` states BFF↔MCP contract-only and names Adapters under MCP, not under BFF/UI. Treat this as policy evidence; runtime truth still requires code-level verification if stakes are high.

### D3) Step: “вынести общий util в shared”

Concrete instantiation (existing shared layer already exists):
- Shared location: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\shared-utils\src\`

STOP triggers:
- LS-06 (“reuse мотив”: общий util для импорта “везде”) → **HARD STOP**
- LS-07 (treating “hub/shared” as permission) → **HARD STOP**
- LS-10 (allowed-by-graph ⇒ allowed-by-policy) → **HARD STOP**

Permission context required:
- Explicit policy for `shared-utils`: what is allowed inside it (pure utilities only vs integration-specific logic), and which layers may depend on it.
- Partial evidence exists as *lint-enforced* permission for some packages: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs` encodes allowed import directions for `contracts/dto/shared-utils/mcp-sdk`, but does not cover services/apps. Missing coverage is a permission gap for an agent (unknown).

---

## TASK E — Architecture Mapper Applicability (Honest, No Implementation Suggestions)

### Where the Mapper helps in this project (given its capabilities)

1) **Dependency graph across a monorepo**
- The workspace spans `apps/*`, `packages/*`, `services/*`; dependency edges are the primary “agent navigation” object that a Mapper can render and focus-dive.
- Evidence of multi-surface codebase: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\pnpm-workspace.yaml`.

2) **Cross-boundary drift detection (as signals/navigation)**
- This repo has explicit boundary laws in canon docs (BFF↔MCP contract-only; Runtime vs Bootstrap; services must not import services). A Mapper’s import graph can highlight where the code violates the declared directionality (as a “risk signal”), even if it cannot assert policy compliance by itself.
- Evidence (policy): `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md`, `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\agents\agent-manifest.md`.

3) **Hubs and blast-radius navigation**
- Given the amount of cross-cutting modules (e.g., `packages/contracts`, `packages/shared-utils`), hub/fan-in/fan-out views would be directly useful for agent navigation.
- Evidence: packages exist and are referenced as foundational in canon manifest: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\manifest.md` (“Фаза 0 — фундамент: contracts, ... shared-utils”).

### Where the Mapper does NOT give signals that are important for an agent here

1) **Permission graph is only partially encoded**
- Some package import permissions are encoded in ESLint boundaries, but service/app boundaries are primarily documented (canon) rather than enforced by import tooling visible in this audit.
- Evidence: partial permission encoding in `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs`; policy docs in `...\docs\services\architecture\project-digest.md`.

2) **Runtime vs Bootstrap separation is a semantic/runtime discipline**
- The critical “No infra logic in runtime” and “Bootstrap ≠ runtime” laws are conceptual; import edges alone do not reliably detect a runtime handler that starts doing infra work (it may be a function call pattern, not a direct cross-folder import).
- Evidence: canon: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\project-digest.md`; infra folders exist: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\scripts`, `...\ops`, `...\db`.

3) **Multi-tenancy / RLS / transaction-handle discipline**
- The architecture has critical invariants around tenant context, RLS, and transaction scoping; these are not visible as pure import topology unless the project has dedicated wrappers that the Mapper can “see” as hubs (unknown here without running Mapper + code-level conventions review).
- Evidence (policy): `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\services\architecture\manifest.md` (RLS + transaction discipline) and canon infra env docs referenced in canon list.

4) **External side-effects: network boundaries and redaction**
- OData calls, LLM calls, secrets redaction, and logging policies are behavioral; dependency graph does not prove correct redaction or “no secrets in logs”.
- Evidence (policy): `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\infra-ops\observability\logging.md` (explicitly warns about not logging raw OData payloads/EDMX) and config/secrets canon docs in `docs/_index/canon.md`.

### Blind spots that are specific to MCP/OData/1C context (agent-facing)

1) **“Adapters” are a semantic layer, not just a folder**
- The canon digest draws a strict “MCP ↔ Adapters” boundary. In code, adapter-ness can leak into shared libs (`packages/shared-utils` contains OData modules by filename), which can blur layer boundaries for an agent relying on paths only.
- Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\packages\shared-utils\src\odata-normalizer.ts`; canon boundary: `...\docs\services\architecture\project-digest.md`.

2) **Factory-first routing expectations are not representable as import rules**
- The doc `docs/agents/factories-routing.md` defines “MUST CALL” helper paths and forbids “direct fetch” patterns for checks; this is about call-path discipline, not just dependency edges.
- Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\agents\factories-routing.md` (routing table; “FORBIDDEN direct fetch”).

3) **Docs are canon-indexed, but tooling may not know that**
- For agent work, canon docs define laws. A Mapper artifact doesn’t inherently distinguish “canon” from “reports/supporting” unless explicitly wired. In this repo the distinction is explicit in docs index, but not guaranteed to be reflected in code topology.
- Evidence: canon list `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\_index\canon.md`; docs policy `...\docs\README.md`.

---

## Summary (Facts + Constrained Observations)

- The external repo is a pnpm/TypeScript strict monorepo with three primary service boundaries (`bff-service`, `mcp-service`, `discovery-service`), foundational packages (`contracts`, `dto`, `shared-utils`, `mcp-sdk`), and an app (`apps/web`). Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\pnpm-workspace.yaml`, `...\tsconfig.base.json`, and presence of folders under `apps/`, `packages/`, `services/`.
- Service-level architecture and key “laws” are explicitly documented as canon (contract-first, BFF↔MCP boundary, adapters isolation, runtime vs bootstrap separation, multi-1C invariants). Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs\_index\canon.md`, `...\docs\services\architecture\manifest.md`, `...\docs\services\architecture\project-digest.md`, `...\docs\agents\agent-manifest.md`.
- A partial **permission graph** is encoded for package imports via ESLint boundaries (contracts/dto/shared-utils/mcp-sdk). Service/app permissions are primarily policy-doc-driven in the observed evidence set. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs`.
- Architecture Mapper can be applicable as a dependency navigation tool for this monorepo, but without an existing Mapper artifact for this repo, any statement that needs dependency/hub/entrypoint facts is **STOP_REQUIRE_CONTEXT** in this audit.

