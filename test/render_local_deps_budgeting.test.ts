import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('Local Dependencies budgeting & --full-signals (strict deterministic contract)', () => {
  it('baseline MUST show truncation notice for heavily-imported module and full-signals MUST not, outputs deterministic', async () => {
    // Create a fresh OS-temp repo so tests do not write into repo root
    const repo = createTempRepoDir('local_deps_budget');
    await fs.mkdir(join(repo, 'src'), { recursive: true });

    // Create src/core.ts and many importers so incoming count > LIST_BUDGET (default LIST_BUDGET=3)
    const corePath = join(repo, 'src', 'core.ts');
    await fs.writeFile(corePath, `// core module\n`, 'utf8');

    const importerCount = 8; // deterministic, > LIST_BUDGET
    for (let i = 1; i <= importerCount; i++) {
      const imp = join(repo, 'src', `importer${String(i).padStart(2, '0')}.ts`);
      // Use a deterministic import path that resolves to src/core.ts
      await fs.writeFile(imp, `import './core.ts';\n`, 'utf8');
    }

    // Run pipeline baseline (budgeted) twice to ensure deterministic output
    const base1 = await runPipeline({ rootDir: repo });
    const base2 = await runPipeline({ rootDir: repo });
    expect(base1.markdown).toBe(base2.markdown);

    // Run pipeline full-signals (no truncation) twice
    const full1 = await runPipeline({ rootDir: repo, fullSignals: true });
    const full2 = await runPipeline({ rootDir: repo, fullSignals: true });
    expect(full1.markdown).toBe(full2.markdown);

    // Extract the Local Dependencies (Budgeted) section from baseline markdown
    const sectionHead = '## Local Dependencies (Budgeted)';
    expect(base1.markdown.includes(sectionHead)).toBe(true);
    const start = base1.markdown.indexOf(sectionHead);
    const end = base1.markdown.indexOf('\n## ', start + 1);
    const ldBlock = base1.markdown.slice(start, end === -1 ? base1.markdown.length : end);

    // Find the entry for `src/core.ts` within the Local Dependencies block
    const coreEntryIdx = ldBlock.indexOf('`src/core.ts`');
    expect(coreEntryIdx).toBeGreaterThanOrEqual(0);

    // Look for canonical truncation notice near the core entry
    const lookStart = Math.max(0, coreEntryIdx - 40);
    const lookSlice = ldBlock.slice(lookStart, coreEntryIdx + 800);
    const noticeRe = /Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./;
    expect(noticeRe.test(lookSlice)).toBe(true);

    // Full must not contain the notice
    expect(noticeRe.test(full1.markdown)).toBe(false);

    // Cleanup
    await fs.rm(repo, { recursive: true, force: true });
  });
});
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

describe('Local Dependencies budgeting & --full-signals (L2 contract)', () => {
  it('baseline truncates lists and --full-signals shows full lists with stable prefix', async () => {
    // Use an OS temp dir for the repo so tests do not leave artifacts in-tree
    const repo = createTempRepoDir('temp_local_deps_budget');
    await fs.mkdir(join(repo, 'src'), { recursive: true });

    // Create deterministic fixture: src/core.ts is imported by many files (incoming > LIST_BUDGET)
    const core = join(repo, 'src', 'core.ts');
    await fs.writeFile(core, `// core\n`);

    // Create many importers that import ./core.ts (ensure incoming count > default LIST_BUDGET=3)
    const importerCount = 8; // deterministic and > LIST_BUDGET
    for (let i = 1; i <= importerCount; i++) {
      const imp = join(repo, 'src', `importer${i}.ts`);
      await fs.writeFile(imp, `import './core.ts';\n`);
    }

    // Baseline (budgeted)
    const base = await runPipeline({ rootDir: repo });
    const mdBase = base.markdown;

    // Full signals (no truncation)
    const full = await runPipeline({ rootDir: repo, fullSignals: true });
    const mdFull = full.markdown;

    // Extract Local Dependencies section for src/core.ts incoming line and following notice
    const sectionHead = '## Local Dependencies (Budgeted)';
    expect(mdBase.includes(sectionHead)).toBe(true);

    const sectionStart = mdBase.indexOf(sectionHead);
    const sectionEnd = mdBase.indexOf('\n## ', sectionStart + 1);
    const ldBlock = mdBase.slice(sectionStart, sectionEnd === -1 ? mdBase.length : sectionEnd);

    // Find the entry for `src/core.ts`
    const coreEntryIdx = ldBlock.indexOf('`src/core.ts`');
    expect(coreEntryIdx).toBeGreaterThanOrEqual(0);

    // Look for truncation notice within the Local Dependencies block near the core entry
    const afterCore = ldBlock.slice(coreEntryIdx, coreEntryIdx + 400);
    expect(afterCore).toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

    // Full should not contain the truncation notice
    expect(mdFull).not.toMatch(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./);

    // Determinism: two runs with same flags equal
    const base2 = await runPipeline({ rootDir: repo });
    expect(base.markdown).toBe(base2.markdown);

    // Cleanup
    await fs.rm(repo, { recursive: true, force: true });
  });
});
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runPipeline } from '../src/pipeline/run_pipeline.js';

describe('Local Dependencies budgeting & --full-signals (L2 contract)', () => {
  it('baseline truncates lists and --full-signals shows full lists with stable prefix', async () => {
    const temp = join(__dirname, 'temp_local_deps_budget_' + Math.random().toString(36).slice(2));
    const repo = join(temp, 'repo');
    await fs.mkdir(repo, { recursive: true });

    // Create files: A imports B,C,D,E,F (5 outgoing)
    const files = ['A.ts', 'B.ts', 'C.ts', 'D.ts', 'E.ts', 'F.ts'];
    for (const f of files) {
      await fs.writeFile(join(repo, f), `// ${f}\n`);
    }
    // Write imports for A
    const imports = files.slice(1).map(p => `import './${p}';`).join('\n') + '\n';
    await fs.writeFile(join(repo, 'A.ts'), imports);
    // B imports C to add some incoming edges for C
    await fs.writeFile(join(repo, 'B.ts'), `import './C.ts';\n`);

    // Baseline (budgeted)
    const base = await runPipeline({ rootDir: repo });
    const mdBase = base.markdown;

    // Full signals (no truncation)
    const full = await runPipeline({ rootDir: repo, fullSignals: true });
    const mdFull = full.markdown;

    // Extract Local Dependencies section for A.ts outgoing line
    const sectionHead = '## Local Dependencies (Budgeted)';
    expect(mdBase.includes(sectionHead)).toBe(true);

    // Helper to extract outgoing line for a given file from markdown
    function extractOutgoing(md: string, id: string): string | null {
      const lines = md.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === `\`${id}\``) {
          // look ahead for `- `→` line
          for (let j = i + 1; j < i + 6 && j < lines.length; j++) {
            const l = lines[j].trim();
            if (l.startsWith('- `→`')) return l;
          }
        }
      }
      return null;
    }

    const outBase = extractOutgoing(mdBase, 'A.ts');
    const outFull = extractOutgoing(mdFull, 'A.ts');
    expect(outBase).not.toBeNull();
    expect(outFull).not.toBeNull();

    // Baseline should be truncated compared to full. The canonical notice may appear
    // on the following line (we return only the outgoing line above), so check the
    // next line as well for the canonical single-line truncation notice.
    const lines = mdBase.split(/\r?\n/);
    const outgoingIndex = lines.findIndex(l => l.trim() === `\`${'A.ts'}\``);
    let suffixLine = '';
    if (outgoingIndex !== -1) {
      // find the outgoing line and the following few lines
      for (let k = outgoingIndex + 1; k < outgoingIndex + 8 && k < lines.length; k++) {
        if (lines[k].trim().startsWith('- `→`')) {
          // check next line for truncation notice
          suffixLine = (lines[k+1] || '').trim();
          break;
        }
      }
    }

    const hasNotice = /(Truncated by budget; rerun with --full-signals \(\+\d+ more\)\.)/.test(outBase || '') || /(Truncated by budget; rerun with --full-signals \(\+\d+ more\)\.)/.test(suffixLine);
    expect(hasNotice).toBe(true);

    // Full should contain all 5 entries and not contain 'more'
    expect(outFull).not.toMatch(/more\)/);
    // Ensure full contains the five filenames
    for (const f of ['B.ts', 'C.ts', 'D.ts', 'E.ts', 'F.ts']) {
      expect(outFull).toContain(f);
    }

    // Compare prefixes: baseline listed items (first 3) must equal first 3 of full list
    // Extract listed items from the markdown lines (between backticks)
    const listItemsFromLine = (line: string) => {
      // Example line: - `→` `B.ts`, `C.ts`, `D.ts` (… +2 more)
      const m = line.match(/- `→`\s*(.*)$/);
      if (!m) return [];
  // remove suffix like (… +2 more)
  const withoutSuffix = m[1].replace(/Truncated by budget; rerun with --full-signals \(\+\d+ more\)\./, '').trim();
      // split by commas and remove backticks/spaces
      return withoutSuffix.split(',').map(s => s.replace(/`/g, '').trim()).filter(Boolean);
    };

    const baseItems = listItemsFromLine(outBase!);
    const fullItems = listItemsFromLine(outFull!);
    expect(baseItems.length).toBe(3);
    expect(fullItems.length).toBeGreaterThanOrEqual(5);
    expect(baseItems).toEqual(fullItems.slice(0, 3));

    // Cleanup
    await fs.rm(temp, { recursive: true, force: true });
  });
});
