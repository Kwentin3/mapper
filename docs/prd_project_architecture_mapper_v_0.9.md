# PDR v0.9 — Project Architecture Mapper

> **Purpose:** This document records *design decisions*, *accepted trade-offs*, and *explicitly rejected alternatives* for PRD v0.9.  
> It exists to prevent architectural drift, repeated debates, and accidental erosion of determinism.

## Context & Motivation

Modern codebases — especially SaaS systems, monorepositories, and integration-heavy platforms —
have reached a scale where **manual comprehension is no longer feasible** for either humans
or AI-assisted tooling.

In practice, developers and LLM-based agents face several structural problems:

- Codebases contain **thousands of files**, far exceeding practical context limits
- Architectural intent is implicit, undocumented, or outdated
- Dependency relationships are non-obvious and span multiple layers
- Small changes can have **large, non-local blast radius**
- Traditional tools (AST explorers, diagrams, linters) optimize for humans,
  not for *LLM reasoning constraints*

At the same time, modern workflows increasingly rely on **LLM agents** to:
- modify existing code
- perform refactoring
- reason about architectural impact
- assist in maintenance of unfamiliar systems

These agents require a **compressed, truthful, and deterministic representation**
of the codebase structure — not the code itself.

### Why existing solutions are insufficient

Existing approaches typically fall into one of the following categories:

- **Mind maps / visual diagrams**  
  → human-oriented, lossy, non-deterministic, not machine-consumable

- **Call graphs / data-flow analysis**  
  → too detailed, too expensive, too noisy for high-level reasoning

- **Linters / architectural enforcement tools**  
  → prescriptive, opinionated, often incorrect for legacy systems

- **Runtime or test-based analysis**  
  → environment-dependent, non-deterministic, unavailable early

None of these provide a **stable, LLM-friendly architectural map**
that can be safely used as reasoning context.

### Project Architecture Mapper

Project Architecture Mapper is designed to fill this gap.

It produces a **deterministic, static, graph-based architectural map**
of a codebase that is:

- derived solely from import/export relationships
- stable across machines and runs
- explicit about uncertainty and heuristics
- optimized for consumption by LLM agents
- safe to use as a decision-support artifact

The primary output (`ARCHITECTURE.md`) is **not documentation** in the traditional sense.
It is a **machine-readable mental model** intended to guide:
- navigation
- impact assessment
- safe refactoring
- agent-assisted development

All design decisions in this document flow from this core goal.


---

## 1. Scope & Philosophy

This PDR applies to **Project Architecture Mapper v0.9**.

### Invariants (Non-Negotiable)

* Determinism across OS, machines, and runs
* Static analysis only (no runtime, no execution)
* Graph-first architecture
* Derived views MUST NOT mutate the core graph
* LLM-friendly output with controlled token budgets

**Rationale:**
These invariants protect the tool from becoming:
- a linter
- a runtime analyzer
- a speculative “AI guesser”

---

## 2. Public API Surface Detection

### Decision

Public API Surface Detection is implemented using a **strict priority model**.

### Accepted Sources (in priority order)

1. **`package.json` (Source of Truth)**
   - `exports`
   - `main`, `module`, `bin`

2. **`tsconfig.json` (Monorepo Boundary Hints)**
   - `compilerOptions.paths`
   - `references[]`

3. **Conventional Entrypoints**
   - `src/index.ts`
   - `packages/*/src/index.ts`

### Explicit Rejections

❌ **TypeScript visibility (`export`, `private`)**  
❌ **Runtime module systems (CJS vs ESM detection)**  
❌ **Heuristic-only detection without config anchors**

### Rationale

* `package.json` is the only contractual public boundary
* `tsconfig.paths` reflects *architectural intent* but is not a contract
* Pure heuristics would introduce false positives and non-determinism

---

## 3. Public API Outside Scan Root

### Decision

When `package.json` references paths **outside the scanned graph**:

* The target is **NOT rendered inline**
* It is listed in the summary under a dedicated section
* A deterministic warning is emitted

```markdown
## Public API Surface

### External References (outside scan root)
⚠️ dist/client.js — referenced in package.json, outside scanned tree
```

### Rationale

* Inline rendering would violate tree correctness
* Silently ignoring would mislead agents
* Summary-only preserves truth without corrupting structure

---

## 4. Path Normalization (Cross-Platform Determinism)

### Decision

All paths MUST be normalized to **POSIX format (`/`)** immediately after scanning.

### Applies To

* Graph nodes
* Signals
* Derived views
* Rendered output
* Hashing & determinism checks

### Explicit Rejection

❌ OS-specific path separators (`\\`)

### Rationale

* Windows / Linux parity
* Stable hashes
* Predictable LLM pattern recognition

---

## 5. Impact Zones (Change Impact Classification)

### Decision

Impact Zones use a **hybrid threshold model**:

```text
HIGH = max(absolute threshold, relative percentile)
```

### Classification Priority (First Match Wins)

1. **HIGH**
   - Has `(!)` structural risks, OR
   - fan-in ≥ max(10, P90), OR
   - ENTRYPOINT, OR
   - PUBLIC-API

2. **CANDIDATE**
   - Has `(?)` hints
   - fan-in < 5

3. **LOW**
   - fan-in ≤ 1
   - fan-out ≤ 3
   - NOT ENTRYPOINT
   - NOT PUBLIC-API

4. **MEDIUM** (default)

### Explicit Rejections

❌ Pure relative ranking (top-X only)  
❌ Manual annotations  
❌ Runtime behavior inference

### Rationale

* Absolute thresholds provide semantic stability
* Relative percentiles adapt to project scale
* Hybrid avoids false positives in both small and large repos

---

## 6. Test Linkage Context

### Decision

Test linkage is **import-graph based only**.

### What It Is

* Mapping: `test file → imported module`
* Deterministic
* Static

### What It Is NOT

❌ Code coverage
❌ Branch/line metrics
❌ Runtime execution

### Naming Decision

We explicitly use **“Test Linkage”**, not “Coverage”.

### Rationale

* Prevents false confidence
* Keeps guarantees honest for LLMs
* Works without instrumentation

---

## 7. Signal Catalog Extensions (v0.9)

### Navigation Signals

* `(→ PUBLIC-API)` — confirmed public surface

### Context Signals

* `(i PUBLIC-CANDIDATE)` — barrel heuristic
* `(i TEST-LINKED: N)` — linked by N tests
* `(i UNTESTED)` — no test linkage

### Explicit Rejections

❌ Inline Impact Zone signals by default

### Rationale

* Navigation signals guide traversal
* Context signals inform risk
* Inline overload is avoided unless explicitly requested

---

## 8. Signal Precedence & Ordering

### Stable Render Order

1. `(!)` Structural Risks
2. `(?)` Heuristic Hints
3. `(i)` Context Signals
4. `(→)` Navigation Signals

Alphabetical within each group.

### Rationale

* Preserves visual scan patterns
* Matches PRD v0.8.2 mental model
* Prevents reordering regressions

---

## 9. Architectural Signal Layers

- Signals are grouped into layers to keep meaning stable and deterministic.
- This is a conceptual grouping, not a new pipeline or rendering mechanism.
- Layer 1: Dependency/HUB structure (imports, fan-in/out) from static graph only.
- Layer 2: Boundary telemetry.
   - Surface/navigation: public API surface, entrypoints, test linkage.
   - Contract telemetry: [C+] [C?] [C0] [C~], anchor-based I/O boundaries.
- Layer 3: Heuristics & hints (candidates, risks) from static anchors/graph/file structure only.
- UNKNOWN is the safe default; prefer `[C~]` over false `[C+]` certainty.
- Layers do not enforce policy; they only annotate evidence for agents.
- No runtime or behavioral inference is permitted in any layer.
- Layer-crossing rules are planned (see v0.9.2+), not enforced today.

## 10. Adaptive Token Budgeting

### Decision

When estimated output exceeds token budget:

1. Hide `(i)` context signals for MEDIUM zones
2. Collapse MEDIUM zones into counts
3. Preserve:
   - `(!)` risks
   - PUBLIC-API
   - ENTRYPOINT
   - HIGH impact zones

### Explicit Rejection

❌ Dropping structural risks to save tokens

### Rationale

* Safety signals are non-negotiable
* Context is expendable
* Optimized for GLM-4.7 and similar models

---

## 11. Domain-Specific Signals (1C / OData)

### Decision

Domain-specific signals (e.g. `(i SCHEMA-DEPENDENT)`) are **NOT part of core**.

### Status

* Reserved for **profiles / plugins**
Profiles are semantic adapters for signal labeling; they do not validate or enforce architecture.

### Rationale

* Keeps core mapper domain-agnostic
* Enables deep SaaS-specific extensions
* Prevents vendor lock-in

---

## 12. Layer Violation Detection

### Decision

Layer violation detection is moved **earlier** in roadmap.

### Placement

* v0.9.2 — basic directional rules
* v1.0 — full profile-based semantics

### Rationale

* Layer breaches are structural risks
* Must surface before advanced heuristics

---

## 13. Task Capsule Mode (Deferred)

### Decision

`--as-task-capsule` is **explicitly deferred to v1.0**.

### Rationale

* Requires strong trust in impact classification
* Blends analysis with enforcement
* Needs stable agent protocol first

---

## 14. Summary

This PDR ensures that:

* Every heuristic is justified
* Every omission is intentional
* Determinism is preserved
* LLM agents receive honest, bounded guidance

> **If a future change violates this PDR, it MUST include an explicit amendment.**

