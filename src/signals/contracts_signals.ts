import type { ParseFileResult } from '../parser/types.js';
import type { Signal } from './types.js';
import { scanContractAnchors } from '../contracts/scan_contract_anchors.js';
import { getContractTargeting } from '../contracts/contract_targeting.js';

export type ContractsSignalsInput = {
  files: string[];
  parseResults: ParseFileResult[];
};

/**
 * Compute contract-derived signals for files.
 * Returns a Map from repo-relative POSIX file path -> Signal[]
 */
export function computeContractSignals(input: ContractsSignalsInput): Map<string, Signal[]> {
  const { files, parseResults } = input;
  const out = new Map<string, Signal[]>();

  // Deterministic order
  const sortedFiles = [...files].sort();

  for (const file of sortedFiles) {
    const pr = parseResults.find(r => r.file === file);
    const src = pr && typeof pr.source === 'string' ? pr.source : undefined;
    const signals: Signal[] = [];

    if (typeof src === 'string') {
      const anchors = scanContractAnchors(src);
      const hasInput = anchors.hasInput;
      const hasOutput = anchors.hasOutput;

      // Always: CONTRACT: input/output emitted as informational (context)
      if (hasInput) {
        signals.push({ kind: 'context', code: 'CONTRACT: input' });
      }
      if (hasOutput) {
        signals.push({ kind: 'context', code: 'CONTRACT: output' });
      }

      // Boundary-only signals
      const targeting = getContractTargeting(file);
      if (targeting.isBoundary) {
        if (hasInput && !hasOutput) {
          signals.push({ kind: 'hint', code: 'INPUT_ONLY_CONTRACT' });
        } else if (!hasInput && hasOutput) {
          signals.push({ kind: 'hint', code: 'OUTPUT_ONLY_CONTRACT' });
        } else if (!hasInput && !hasOutput) {
          // For boundary files with no anchors, emit informational NO_CONTRACT
          signals.push({ kind: 'context', code: 'NO_CONTRACT' });
        }
      }
    }

    // Deduplicate by kind+code deterministically
    const seen = new Set<string>();
    const deduped: Signal[] = [];
    for (const s of signals) {
      const k = `${s.kind}::${s.code}`;
      if (!seen.has(k)) {
        seen.add(k);
        deduped.push(s);
      }
    }

    out.set(file, deduped);
  }

  return out;
}

export default computeContractSignals;
