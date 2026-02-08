/* eslint-disable no-console */
'use strict';

const fs = require('fs/promises');
const path = require('path');

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function rmIfExists(p) {
  if (!(await pathExists(p))) return 0;
  await fs.rm(p, { recursive: true, force: true });
  return 1;
}

async function main() {
  const repoRoot = process.cwd();

  // Root-level artifacts (generated outputs)
  const rootEntries = await fs.readdir(repoRoot, { withFileTypes: true });
  const rootFilesToDelete = rootEntries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => {
      if (name === 'ARCHITECTURE.md') return true;
      if (name.startsWith('ARCHITECTURE_') && name.endsWith('.md')) return true;
      if (name.startsWith('ARCHITECTURE_TMP') && name.endsWith('.md')) return true;
      if (name.startsWith('tmp_') && name.endsWith('.md')) return true;
      if (name === '.tmp_cli_help.txt') return true;
      return false;
    })
    .sort();

  // Root directories commonly used for audit outputs
  const rootDirsToDelete = [
    'out',
    'tmp',
    'tmp2',
    path.join('artifacts', 'cli-evidence'),
  ];

  // Test temp dirs created by contract/smoke tests (should not live in repo)
  const testDir = path.join(repoRoot, 'test');
  let testTempDirs = [];
  if (await pathExists(testDir)) {
    const testEntries = await fs.readdir(testDir, { withFileTypes: true });
    testTempDirs = testEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => name.startsWith('temp_') || name.startsWith('tmp_'))
      .sort()
      .map((name) => path.join('test', name));
  }

  let deletedCount = 0;

  for (const p of rootDirsToDelete) deletedCount += await rmIfExists(path.join(repoRoot, p));
  for (const name of rootFilesToDelete) deletedCount += await rmIfExists(path.join(repoRoot, name));
  for (const p of testTempDirs) deletedCount += await rmIfExists(path.join(repoRoot, p));

  console.log(`clean:artifacts removed ${deletedCount} path(s).`);
}

main().catch((err) => {
  console.error('clean:artifacts failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

