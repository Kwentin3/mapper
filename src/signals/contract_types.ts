export type ContractStatus = 'C+' | 'C?' | 'C0' | 'C~';

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
}

export type ContractSignalMap = Record<string, ContractSignal>;
