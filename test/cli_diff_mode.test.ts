import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { run } from '../src/cli/run.js';
import { createTempRepoDir } from './helpers/temp_dirs.js';

async function writeRepo(rootDir: string, files: Array<{ path: string; content: string }>): Promise<void> {
  await fs.mkdir(rootDir, { recursive: true });
  await fs.writeFile(join(rootDir, 'package.json'), JSON.stringify({ name: 'tmp', version: '1.0.0' }, null, 2), 'utf-8');
  for (const file of files) {
    const absolute = join(rootDir, file.path);
    await fs.mkdir(dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, file.content, 'utf-8');
  }
}

describe('CLI --diff mode', () => {
  let baseRepoDir: string;
  let headRepoDir: string;
  let artifactDir: string;
  let originalCwd: string;
  let defaultOutDir: string | undefined;

  beforeEach(async () => {
    baseRepoDir = createTempRepoDir('temp_cli_diff_base_repo');
    headRepoDir = createTempRepoDir('temp_cli_diff_head_repo');
    artifactDir = createTempRepoDir('temp_cli_diff_artifacts');
    originalCwd = process.cwd();

    await writeRepo(baseRepoDir, [
      { path: 'src/a.ts', content: 'export const A = 1;\n' },
      { path: 'src/b.ts', content: "import { A } from './a.js';\nexport const B = A;\n" },
    ]);
    await writeRepo(headRepoDir, [
      { path: 'src/a.ts', content: 'export const A = 1;\n' },
      { path: 'src/b.ts', content: "import { A } from './a.js';\nexport const B = A;\n" },
      { path: 'src/c.ts', content: "import { A } from './a.js';\nexport const C = A + 1;\n" },
    ]);

    await fs.mkdir(artifactDir, { recursive: true });
    const baseOut = join(artifactDir, 'BASE.json');
    const headOut = join(artifactDir, 'HEAD.json');
    const baseResult = await run(['--format', 'json', '--out', baseOut, baseRepoDir]);
    const headResult = await run(['--format', 'json', '--out', headOut, headRepoDir]);
    expect(baseResult.exitCode).toBe(0);
    expect(headResult.exitCode).toBe(0);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    await fs.rm(baseRepoDir, { recursive: true, force: true });
    await fs.rm(headRepoDir, { recursive: true, force: true });
    await fs.rm(artifactDir, { recursive: true, force: true });
    if (defaultOutDir) {
      await fs.rm(defaultOutDir, { recursive: true, force: true });
      defaultOutDir = undefined;
    }
  });

  it('compares two artifacts and writes a schema-versioned diff', async () => {
    const baseOut = join(artifactDir, 'BASE.json');
    const headOut = join(artifactDir, 'HEAD.json');
    const diffOut = join(artifactDir, 'DIFF.json');

    const result = await run(['--diff', '--out', diffOut, baseOut, headOut]);
    expect(result.exitCode).toBe(0);

    const content = await fs.readFile(diffOut, 'utf-8');
    const parsed = JSON.parse(content) as any;
    expect(parsed.schemaVersion).toBe('mapper.diff.v1');
    expect(parsed.delta.fileCount).toBe(1);
    expect(parsed.changes.filesAdded).toContain('src/c.ts');
    expect(parsed.changes.edgesAdded).toContain('src/c.ts->src/a.ts');
  });

  it('uses ARCHITECTURE_DIFF.json by default', async () => {
    const baseOut = join(artifactDir, 'BASE.json');
    const headOut = join(artifactDir, 'HEAD.json');
    defaultOutDir = createTempRepoDir('temp_cli_diff_default_out');
    await fs.mkdir(defaultOutDir, { recursive: true });

    process.chdir(defaultOutDir);
    const result = await run(['--diff', baseOut, headOut]);
    expect(result.exitCode).toBe(0);

    const defaultOut = join(defaultOutDir, 'ARCHITECTURE_DIFF.json');
    const exists = await fs.access(defaultOut).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('fails when diff positional contract is violated', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await run(['--diff', 'ONLY_ONE.json']);
    expect(result.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe('Error: --diff expects exactly 2 positional arguments: <base.json> <head.json>.');
  });

  it('fails when artifact schemaVersion is unsupported', async () => {
    const badOut = join(artifactDir, 'BAD.json');
    const headOut = join(artifactDir, 'HEAD.json');
    await fs.writeFile(badOut, JSON.stringify({ schemaVersion: 'bad.schema.v1' }, null, 2), 'utf-8');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await run(['--diff', badOut, headOut]);
    expect(result.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe('Error: unsupported artifact schemaVersion: bad.schema.v1.');
  });
});
