# PR description — Renderer prefix normalization

Summary
-------

This PR normalizes the Project Tree renderer by introducing a canonical prefix builder and unifying how node lines and collapse/depth stubs are emitted. The changes fix misaligned vertical guides, inconsistent collapse stubs, and remove a compatibility spacer hack. The goal is deterministic, easy-to-reason-about rendering that downstream developers and code agents can rely on.

What changed
-----------
- Introduced `buildTreePrefix(ancestryIsLast: boolean[], nodeIsLast: boolean): string` (in `src/render/render_tree.ts`).
- Refactored tree rendering to use the prefix builder for nodes and stubs.
- Removed legacy spacer hack and normalized glyph usage.
- Added regression tests for indentation, focused stubs and collapse behavior.
- Added `docs/RENDER_CONTRACTS.md` with public contracts, invariants and agent guidance.

Files touched (high level)
- `src/render/render_tree.ts` — canonical prefix builder and refactors.
- `test/*` — added/updated tests covering canonical output.
- `docs/RENDER_CONTRACTS.md` — new developer/agent-facing documentation.
- `CHANGELOG.md` — entry describing the change.

Validation performed
-------------------
- `npm run typecheck` — OK
- `npm run build` — OK
- `npm test` — OK (full test suite green)
- Artifacts generated twice and verified bit-for-bit equality:
  - `out/indentfix/run-1/ARCH.depth2.md` SHA256: D624E21B03D1212308E1A382D4B962D8E622601710603161A2FE75811024F05C
  - `out/indentfix/run-1/ARCH.full.focus.src.md` SHA256: 823728A74E5B1DC155E8A15A7C0E22C0BFCA4A9AC4A3A1258A70C0F7C129B7A8
  - Corresponding files in `run-2` have identical hashes (verifies determinism).

Notes for reviewers
-------------------
- The normalization intentionally changes textual output. This is Option A: canonicalization. If backward compatibility is required, consider adding a `--legacy-glyphs` flag and adding goldens.
- Please verify the new tests and the PR description include the two-run hash check.

Suggested git commands (run locally)
-----------------------------------
```powershell
git checkout -b fix/render-prefix-normalization
git add CHANGELOG.md docs/RENDER_CONTRACTS.md test/  src/render/render_tree.ts
git commit -m "fix(render): normalize tree renderer prefixes; add tests and docs"
git push -u origin fix/render-prefix-normalization
```

If you prefer a patch file instead of pushing directly, run locally:

```powershell
git format-patch -1 HEAD --stdout > render-prefix-normalization.patch
```

Optional CI suggestion
---------------------
- Add a job that runs the renderer twice for a given input and compares SHA256 of the produced artifacts to detect accidental non-deterministic changes.

---

End of PR description.
