/**
 * Public API of the rendering layer.
 */

export type { RenderOptions, RenderInput, RenderOutput } from './types.js';
export { renderArchitectureMd } from './render_architecture_md.js';
export { AI_PREAMBLE } from './preamble.js';

// The following are exported mainly for testing and advanced integration.
export { renderSummary } from './render_summary.js';
export { renderTree } from './render_tree.js';
export { computeCollapsedPaths } from './smart_collapse.js';