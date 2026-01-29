/**
 * Renders the header summary blocks (Entrypoints & Public Surface, Graph Hubs).
 */

import type { SignalsResult, SignalBudgets, SummaryItem } from '../signals/types.js';
import { classifyPathKind, formatTruncationNotice } from './format.js';

/**
 * Render the "Entrypoints & Public Surface" block.
 */
function renderEntrypointsAndPublicApi(
  entrypoints: SummaryItem[],
  publicApi: SummaryItem[],
  entrypointsLimit: number,
  publicApiLimit: number
): string {
  const lines: string[] = [];

  const renderGrouped = (items: SummaryItem[], limit: number, title: string) => {
    if (items.length === 0) return;
    lines.push(title);

    const shown = items.slice(0, limit);

    // Split into PROD / TEST while preserving original relative order
    const prod: SummaryItem[] = [];
    const test: SummaryItem[] = [];
    for (const it of shown) {
      const kind = classifyPathKind(it.file);
      if (kind === 'PROD') prod.push(it);
      else test.push(it);
    }

    // Render PROD first (preserve order)
    for (const it of prod) {
      const kind = classifyPathKind(it.file);
      lines.push(`- \`${it.file}\` [${kind}] – ${it.reason}`);
    }

    // If there are test items, insert deterministic indicator and then render them
    if (test.length > 0) {
      lines.push(`- (tests: ${test.length} moved to bottom)`);
      for (const it of test) {
        const kind = classifyPathKind(it.file);
        lines.push(`- \`${it.file}\` [${kind}] – ${it.reason}`);
      }
    }

    if (items.length > limit) {
      // Use canonical budget truncation notice on its own line.
      lines.push(formatTruncationNotice(items.length - limit));
    }
    lines.push('');
  };

  renderGrouped(entrypoints, entrypointsLimit, '### Entrypoints');
  renderGrouped(publicApi, publicApiLimit, '### Public API');

  return lines.join('\n').trim();
}

/**
 * Render the "Graph Hubs" block (fan‑in and fan‑out).
 */
function renderGraphHubs(
  fanIn: SummaryItem[],
  fanOut: SummaryItem[],
  limit: number
): string {
  const lines: string[] = [];

  const renderGrouped = (items: SummaryItem[], title: string) => {
    if (items.length === 0) return;
    lines.push(title);

    const shown = items.slice(0, limit);

    const prod: SummaryItem[] = [];
    const test: SummaryItem[] = [];
    for (const it of shown) {
      const kind = classifyPathKind(it.file);
      if (kind === 'PROD') prod.push(it);
      else test.push(it);
    }

    for (const it of prod) {
      const kind = classifyPathKind(it.file);
      // In the Graph Hubs block, items are hubs by definition; tag them [HUB]
      lines.push(`- \`${it.file}\` [${kind}] [HUB] – ${it.reason}`);
    }
    if (test.length > 0) {
      lines.push(`- (tests: ${test.length} moved to bottom)`);
      for (const it of test) {
        const kind = classifyPathKind(it.file);
        lines.push(`- \`${it.file}\` [${kind}] [HUB] – ${it.reason}`);
      }
    }

    if (items.length > limit) {
      // Use canonical budget truncation notice on its own line.
      lines.push(formatTruncationNotice(items.length - limit));
    }
    lines.push('');
  };

  renderGrouped(fanIn, '### Fan‑in Hubs');
  renderGrouped(fanOut, '### Fan‑out Hubs');

  return lines.join('\n').trim();
}

/**
 * Render both summary blocks.
 *
 * @param signals The computed signals.
 * @param budgets Signal budget limits.
 * @param fullSignals If true, ignore the top‑N limits and show all items.
 * @returns Markdown string containing the two summary blocks.
 */
export function renderSummary(
  signals: SignalsResult,
  budgets: SignalBudgets,
  fullSignals: boolean
): string {
  const entrypointsBlock = renderEntrypointsAndPublicApi(
    signals.entrypoints,
    signals.publicApi,
    fullSignals ? Infinity : budgets.entrypointsTopN,
    fullSignals ? Infinity : budgets.publicApiTopN
  );

  const hubsBlock = renderGraphHubs(
    signals.hubsFanIn,
    signals.hubsFanOut,
    fullSignals ? Infinity : budgets.hubsTopN
  );

  const blocks = [
    '## Entrypoints & Public Surface',
    entrypointsBlock,
    '## Graph Hubs (Fan‑in / Fan‑out)',
    hubsBlock,
  ].filter((block) => block.trim().length > 0);

  return blocks.join('\n\n') + '\n';
}