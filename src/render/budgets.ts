export type BudgetProfile = 'small' | 'default' | 'large';

export interface ViewBudgets {
  HUBS_TOP_M: number;
  LIST_BUDGET: number;
  DEEP_DIVE_BUDGET: number;
}

export function getViewBudgets(profile: BudgetProfile, fullSignals: boolean): ViewBudgets {
  if (fullSignals) {
    return {
      HUBS_TOP_M: Infinity as unknown as number,
      LIST_BUDGET: Infinity as unknown as number,
      DEEP_DIVE_BUDGET: Infinity as unknown as number,
    };
  }

  switch (profile) {
    case 'small':
      return {
        HUBS_TOP_M: 3,
        LIST_BUDGET: 2,
        DEEP_DIVE_BUDGET: 5,
      };
    case 'large':
      return {
        HUBS_TOP_M: 10,
        LIST_BUDGET: 10,
        DEEP_DIVE_BUDGET: 25,
      };
    case 'default':
    default:
      // Mirror existing defaults in render_architecture_md.ts
      return {
        HUBS_TOP_M: 5,
        LIST_BUDGET: 3,
        DEEP_DIVE_BUDGET: 10,
      };
  }
}
