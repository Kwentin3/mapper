// Determines whether a repo-relative POSIX path is considered a boundary for contract telemetry.
// Rules are intentionally narrow and deterministic.

export function isBoundaryPath(repoRelPosixPath: string): boolean {
  if (!repoRelPosixPath) return false;
  // Normalize to POSIX separators and remove leading ./
  const p = repoRelPosixPath.replace(/\\/g, '/').replace(/^\.\//, '');

  // Exact known entrypoint filenames under src
  const entrypoints = new Set(['src/main.ts', 'src/index.ts', 'src/server.ts', 'src/app.ts']);
  if (entrypoints.has(p)) return true;

  // Direct src boundary folders
  if (p.startsWith('src/api/')) return true;
  if (p.startsWith('src/routes/')) return true;
  if (p.startsWith('src/controllers/')) return true;
  if (p.startsWith('src/handlers/')) return true;

  // Services packages that include boundary folders under their own src
  if (p.startsWith('services/')) {
    if (p.includes('/src/api/')) return true;
    if (p.includes('/src/routes/')) return true;
    if (p.includes('/src/controllers/')) return true;
    if (p.includes('/src/handlers/')) return true;
  }

  return false;
}

export default isBoundaryPath;
