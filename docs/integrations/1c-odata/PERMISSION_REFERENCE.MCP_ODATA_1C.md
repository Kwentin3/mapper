# Permission Reference — MCP oData 1C

Purpose (для инжекта агенту): зафиксировать **permission graph** (разрешённые направления) отдельно от **dependency graph** (что “видно” в монорепо). Помнить про **visibility vs permission**.

## Golden Laws (confirmed)

- Contract-first: кросс-модульные взаимодействия только через контракт; внутренние DTO не протекают через границы. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “2️⃣ Architectural Laws”, п.1; `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “6. Контрактная модель”, “6.1 Принцип”)
- BFF ↔ MCP: **contract-only** (REST/SSE); BFF не знает внутренней структуры MCP. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”, “Границы и запреты”)
- MCP ↔ Adapters: **adapter-only access**; MCP не содержит логики HTTP‑клиента или LLM‑провайдера; side-effects разрешены только в адаптерах/БД‑репозиториях/retention. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”)
- Services MUST NOT import other services. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/agents/agent-manifest.md` — “4.3 Dependency DAG”)
- Runtime vs Bootstrap: no infra logic in runtime; bootstrap ≠ runtime. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “2️⃣ Architectural Laws” (пп.3,5) и “4️⃣ Runtime vs Bootstrap”)
- Discovery никогда не выполняется в пользовательском запросе; Discovery не вызывается LLM напрямую. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “3.1 … Discovery и Runtime”; “7. Инструменты MCP”)
- Запрещено передавать `tenant_id` или `role` от клиента; они определяются server-side. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”; `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “8.1 Auth …”)
- Logging: never log API keys/authorization headers/raw prompts/raw OData payloads/raw EDMX. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/infra-ops/observability/logging.md` — “Safety Rules”)

## Permission Matrix (text rules)

Layers: `WEB` apps/web; `BFF` services/bff-service; `MCP` services/mcp-service; `DISC` services/discovery-service; `CTR` packages/contracts; `DTO` packages/dto; `SDK` packages/mcp-sdk; `SHU` packages/shared-utils; `SCR` scripts/; `OPS` ops/; `DB` db/

Default: any A→B not stated below is `UNKNOWN (STOP_REQUIRE_CONTEXT)`.

### Dependency permission (import/call)

- Service→Service: `BFF→{MCP,DISC}=FORBID`, `MCP→{BFF,DISC}=FORBID`, `DISC→{BFF,MCP}=FORBID`. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/agents/agent-manifest.md` — “4.3 Dependency DAG”)
- Runtime→(SCR/OPS/DB): `BFF→{SCR,OPS,DB}=FORBID`, `MCP→{SCR,OPS,DB}=FORBID`, `DISC→{SCR,OPS,DB}=FORBID`. (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “No infra logic in runtime”, “Bootstrap ≠ runtime”, “Runtime vs Bootstrap”)
- Package→Package (partial; only for element types `contracts/dto/shared-utils/mcp-sdk`):
  - `CTR→CTR=ALLOW`, `CTR→{DTO,SHU,SDK}=FORBID`
  - `DTO→{DTO,CTR}=ALLOW`, `DTO→{SHU,SDK}=FORBID`
  - `SHU→{SHU,CTR}=ALLOW`, `SHU→{DTO,SDK}=FORBID`
  - `SDK→{SDK,CTR,SHU}=ALLOW`, `SDK→DTO=FORBID`
  (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs` — `boundaries/element-types`; note: `boundaries/no-unknown` is `off`, so targets outside these element types are not covered by this partial permission graph.)

### Access permission (API/HTTP/contract)

- `BFF→MCP=ALLOW` but **contract-only** (REST/SSE). (Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”, “BFF ↔ MCP”)

## Boundary Crossing Rules (with evidence)

- `BFF ↔ MCP: contract-only` (and service→service dependency forbidden). Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”; `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/agents/agent-manifest.md` — “4.3 Dependency DAG”.
- `MCP ↔ Adapters: adapter-only access` (MCP has no HTTP‑client / provider logic). Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”.
- `Contract-first` (no internal DTO leakage). Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “2️⃣ Architectural Laws”; `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “6. Контрактная модель”.
- `Runtime vs Bootstrap` (no infra logic in runtime; bootstrap ≠ runtime). Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “2️⃣ Architectural Laws”, “4️⃣ Runtime vs Bootstrap”.
- `Discovery` never in user request; not called by LLM directly. Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “3.1 … Discovery и Runtime”; “7. Инструменты MCP”.
- `tenant_id/role` server-side only; never trust client-provided tenancy fields. Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/project-digest.md` — “3️⃣ High‑Level Architecture”; `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/services/architecture/manifest.md` — “8.1 Auth …”.
- Logging safety (no secrets/raw payloads). Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/infra-ops/observability/logging.md` — “Safety Rules”.
- Partial package permission graph exists for `CTR/DTO/SHU/SDK` only. Level: `LAW`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\.eslintrc.cjs` — `boundaries/element-types`.
- Control-check / smoke / production paths: forbidden direct calls vs must-call paths are fixed in canon doc. Level: `GUIDANCE`. Evidence: `D:\Users\Roman\Desktop\Проекты\MCP oData 1C\docs/agents/factories-routing.md` — “Routing Table”.

## STOP Protocol (HARD/SOFT + questions)

HARD STOP (`STOP_REQUIRE_CONTEXT`) when:
- You are about to create/require any `FORBID` dependency direction above (service→service; runtime→SCR/OPS/DB).
- A cross-boundary change lacks an explicit contract (Contract-first).

SOFT STOP when:
- The intended A→B direction is `UNKNOWN` and the change crosses a boundary; escalate to HARD if it moves side-effects outside “adapters/repositories/retention”.

Permission Questions (ask 3–5):
1) Is this edge **dependency** (import/call) or **access** (API/HTTP/contract)?
2) Which A→B direction is intended, and is it one-way boundary?
3) Where is the contract that authorizes this boundary crossing (contract-only)?
4) Does this introduce side-effects outside adapters/repositories/retention (adapter-only access)?
5) Is this runtime or bootstrap (Bootstrap ≠ runtime)?

## Shared utils hazard (repo-specific)

- Risk: `SHU` is highly visible in a monorepo; without explicit permission, it can become a way to bypass one-way boundary (visibility vs permission).  
Level: `GUIDANCE`. Evidence (risk framing): `d:\Users\Roman\Desktop\Проекты\Маппер кода\docs\AUDIT.EXTERNAL.PROJECT.MCP.ODATA.1C.1.report.md` — section “Shared utils name ⇒ false general-purpose permission”.
- What is allowed inside `SHU` (pure utilities vs boundary-crossing code) is not specified in the cited canon set. `UNKNOWN (STOP_REQUIRE_CONTEXT)`.

## Unknowns / STOP_REQUIRE_CONTEXT

- `WEB→(BFF|MCP|DISC)` access policy beyond the digest map is not explicitly stated in the cited canon set.
- Service→package dependency permissions outside `CTR/DTO/SHU/SDK` are not specified (lint encodes only a partial package permission graph).
- Whether `BFF→DISC` or `MCP→DISC` access is allowed for admin/job flows (while preserving “Discovery never in user request”) is not fully specified.
- Whether `SCR` may depend on runtime services (dependency or contract-only access) is not specified.
