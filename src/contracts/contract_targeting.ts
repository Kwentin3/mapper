import { isBoundaryPath } from './boundary_targeting';

export type ContractTargeting = {
  isBoundary: boolean;
};

export function getContractTargeting(repoRelPosixPath: string): ContractTargeting {
  return { isBoundary: isBoundaryPath(repoRelPosixPath) };
}

export default getContractTargeting;
