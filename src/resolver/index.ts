/**
 * Public API of the resolver module.
 */

export type { ResolvedKind, ResolvedTarget, ResolverOptions, ResolveResult } from './types';
export { loadTsconfigAliases } from './read_tsconfig';
export { loadPackageImports } from './read_package_json';
export { resolveSpecifier } from './resolve_specifier';