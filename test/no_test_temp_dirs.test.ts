import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import path from 'path';

// This contract test checks for *leftover* test temp directories under the
// repo root (i.e., artifacts from prior runs). It intentionally ignores temp
// directories created during the current test run by only flagging directories
// with mtime older than the threshold.
describe('no leftover test temp dirs under repo root', () => {
  it('finds no stale test/temp_* directories or top-level out/tmp/tmp2 left from previous runs', () => {
    const repoRoot = path.resolve('.');
    const testDir = path.join(repoRoot, 'test');
    const now = Date.now();
    const staleThresholdMs = 60 * 1000; // 60 seconds

    let entries: string[] = [];
    try {
      entries = readdirSync(testDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(d => d.name);
    } catch (e) {
      // No test dir? then nothing to check
      entries = [];
    }

    const staleTempDirs = entries.filter(name => {
      // Legacy: older test runs may have left these behind in the repo. The scanner
      // excludes them from maps, and current tests no longer create them under `test/`.
      if (!(name.startsWith('temp_') || name.startsWith('temp') || name.startsWith('tmp_'))) return false;
      if (name.startsWith('temp_path_validation_')) return false;
      try {
        const st = statSync(path.join(testDir, name));
        return (now - st.mtimeMs) > staleThresholdMs;
      } catch (e) {
        return false;
      }
    });

    expect(staleTempDirs.length).toBe(0);

    // Also ensure no top-level leftover audit dirs older than threshold exist.
    // Note: `out/` is a normal user-facing output directory for this project; its
    // existence alone is not a reliable signal of stale test artifacts.
    const top = readdirSync(repoRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(d => d.name);
    const candidates = ['tmp', 'tmp2', path.join('artifacts', 'cli-evidence')];
    const staleTop = candidates.filter(c => {
      const p = path.join(repoRoot, c);
      try {
        const st = statSync(p);
        return (now - st.mtimeMs) > staleThresholdMs;
      } catch (e) {
        return false;
      }
    });
    expect(staleTop.length).toBe(0);
  });
});
