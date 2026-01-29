import os from 'os';
import path from 'path';
import crypto from 'crypto';

export function createTempRepoDir(prefix = 'temp'): string {
  const id = (crypto && (crypto.randomUUID ? crypto.randomUUID() : undefined)) || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const name = `${prefix}_${id}`;
  return path.join(os.tmpdir(), name);
}

export function createUniqueTempSubdir(parentPrefix = 'temp', sub = 'repo') {
  const parent = createTempRepoDir(parentPrefix);
  return path.join(parent, sub);
}
