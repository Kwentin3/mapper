/**
 * Signal types for architecture analysis.
 */

import type { ContractSignalMap } from './contract_types.js';

export type SignalKind = 'risk' | 'hint' | 'nav' | 'context';

export interface Signal {
  kind: SignalKind;
  code: string;
}

export interface FileSignals {
  file: string;
  inline: Signal[];
}

export interface SummaryItem {
  file: string;
  reason: string;
  score: number;
}

export interface SignalsResult {
  files: FileSignals[];
  entrypoints: SummaryItem[];
  publicApi: SummaryItem[];
  hubsFanIn: SummaryItem[];
  hubsFanOut: SummaryItem[];
  warnings: string[];
  contractSignals: ContractSignalMap;
}

export interface SignalBudgets {
  entrypointsTopN: number;
  publicApiTopN: number;
  hubsTopN: number;
  inlinePerFileMax: number;
}
