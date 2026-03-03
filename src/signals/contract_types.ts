export type ContractStatus = 'C+' | 'C?' | 'C0' | 'C~';

import type { AssertionKind } from './types.js';

export interface ContractEvidence {
  boundaryMatch?: {
    includedBy?: string;
    excludedBy?: string;
  };
  anchorsFound: {
    inbound: string[];
    outbound: string[];
  };
  anchorsMissing?: {
    inbound: string[];
    outbound: string[];
  };
  notes?: string[];
}

export interface ContractSignal {
  status: ContractStatus;
  evidence?: ContractEvidence;
  /** Optional: nature of this assertion; when missing, treat as UNKNOWN. */
  assertionKind?: AssertionKind;
}

export type ContractSignalMap = Record<string, ContractSignal>;
