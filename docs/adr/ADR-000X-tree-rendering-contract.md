---
title: ADR-000X — Tree Rendering Contract
status: approved
date: 2026-01-22
---

Problem
-------
Tree indentation bugs were repeatedly introduced because multiple code sites constructed tree prefixes (glyphs) independently. This produced misaligned vertical guides, inconsistent collapse stubs, and made deterministic rendering fragile.

Decision
--------
Introduce a single canonical prefix builder with the signature:

  buildTreePrefix(ancestryIsLast: boolean[], nodeIsLast: boolean): string

All tree rows (files, directories, collapse stubs, focus rows) must obtain their leading prefix from this builder. The builder encodes the rendering contract for ancestor verticals and current-node glyphs.

Contract
--------
- No code outside `buildTreePrefix` may emit the glyphs `│`, `├──`, or `└──`.
- All tree rows (node lines, directory headers, collapse stubs, focus views) must use `buildTreePrefix` to construct their leading prefix.

Rationale
---------
- Determinism: a single source of truth ensures stable, machine‑identical output.
- Truth preservation: layout is consistent across collapse/stub behaviors so structural signals remain visually aligned.
- Testability: a canonical builder simplifies golden testing and enables small guard tests to prevent regressions.

Consequences
------------
- Any future change to tree layout must modify `buildTreePrefix` and update golden tests.
- Guard tests will enforce the contract; developers must adjust the builder rather than sprinkling glyphs around the codebase.
