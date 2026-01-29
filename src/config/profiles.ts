/**
 * Architecture profile definition.
 */

export interface Profile {
    /** Unique identifier (e.g., 'default', 'fsd', 'monorepo') */
    id: string;
    /** Human‑readable display name */
    displayName: string;
    /** Heuristic thresholds */
    thresholds: {
        /** Lines of code marking a "big" module */
        bigLoc: number;
        /** Fan‑in count marking a "god module" */
        godModuleFanIn: number;
        /** Depth of path marking a "deep" module */
        deepPath: number;
        /** Number of exports marking a "barrel hell" module */
        barrelHellExports: number;
    };
    /** Maximum number of signals of each type to show by default */
    signalBudget: {
        structuralRisks: number;
        heuristicHints: number;
        contextSignals: number;
        navigationSignals: number;
    };
    /** Whether to treat the project as a monorepo (cross‑package dependencies become risks) */
    monorepo: boolean;
    /** Whether to enable layer‑aware analysis (future) */
    layerAware: boolean;
    /** Default file extensions to consider (empty = all) */
    extensions: string[];
}

/** Default profile as defined in PRD v0.8 */
export const DEFAULT_PROFILE: Profile = {
    id: 'default',
    displayName: 'Default (structure‑agnostic)',
    thresholds: {
        bigLoc: 300,
        godModuleFanIn: 15,
        deepPath: 3,
        barrelHellExports: 10,
    },
    signalBudget: {
        structuralRisks: 5,
        heuristicHints: 10,
        contextSignals: 5,
        navigationSignals: 5,
    },
    monorepo: false,
    layerAware: false,
    extensions: [],
};

/** Built‑in profiles registry */
export const BUILT_IN_PROFILES: Record<string, Profile> = {
    default: DEFAULT_PROFILE,
    fsd: {
        id: 'fsd',
        displayName: 'Feature‑Sliced Design',
        thresholds: {
            bigLoc: 250,
            godModuleFanIn: 12,
            deepPath: 4,
            barrelHellExports: 8,
        },
        signalBudget: {
            structuralRisks: 5,
            heuristicHints: 8,
            contextSignals: 4,
            navigationSignals: 6,
        },
        monorepo: false,
        layerAware: true,
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    monorepo: {
        id: 'monorepo',
        displayName: 'Monorepo',
        thresholds: DEFAULT_PROFILE.thresholds,
        signalBudget: DEFAULT_PROFILE.signalBudget,
        monorepo: true,
        layerAware: false,
        extensions: [],
    },
};

/**
 * Retrieve a built‑in profile by its identifier.
 * Falls back to the default profile if the identifier is unknown.
 */
export function getBuiltInProfile(id: string): Profile {
    return BUILT_IN_PROFILES[id] ?? DEFAULT_PROFILE;
}