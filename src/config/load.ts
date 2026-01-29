import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Profile, DEFAULT_PROFILE, getBuiltInProfile } from './profiles';

/**
 * Configuration file name (without extension) that the tool will look for.
 */
const CONFIG_FILENAMES = [
    '.architecture.json',
    '.pamrc.json',
    'architecture.config.json',
];

/**
 * Shape of a user configuration file.
 */
export interface UserConfig {
    profile?: string;
    thresholds?: Partial<Profile['thresholds']>;
    signalBudget?: Partial<Profile['signalBudget']>;
    monorepo?: boolean;
    layerAware?: boolean;
    extensions?: string[];
}

/**
 * Load a user configuration file from the given directory (or current working directory).
 * Returns `null` if no config file is found.
 */
export function loadUserConfig(dir: string = process.cwd()): UserConfig | null {
    for (const filename of CONFIG_FILENAMES) {
        const filePath = join(dir, filename);
        if (existsSync(filePath)) {
            try {
                const content = readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(content) as UserConfig;
                return parsed;
            } catch {
                // If the file is malformed, ignore it (fallback to default)
                return null;
            }
        }
    }
    return null;
}

/**
 * Merge a user configuration into a base profile.
 */
export function mergeConfigIntoProfile(
    base: Profile,
    config: UserConfig
): Profile {
    return {
        ...base,
        ...(config.profile && { id: config.profile }),
        displayName: `${base.displayName} (custom)`,
        thresholds: {
            ...base.thresholds,
            ...config.thresholds,
        },
        signalBudget: {
            ...base.signalBudget,
            ...config.signalBudget,
        },
        monorepo: config.monorepo ?? base.monorepo,
        layerAware: config.layerAware ?? base.layerAware,
        extensions: config.extensions ?? base.extensions,
    };
}

/**
 * Determine the effective profile to use.
 *
 * Search order:
 * 1. Explicit `--profile` CLI argument (passed via `options.profile`)
 * 2. `profile` field in a local config file
 * 3. Default profile
 *
 * Any other fields from the config file are merged into the selected base profile.
 */
export function loadEffectiveProfile(options: {
    /** Explicit profile ID from CLI `--profile` */
    profile?: string;
    /** Directory to look for config files (defaults to cwd) */
    configDir?: string;
}): Profile {
    const { profile: cliProfile, configDir = process.cwd() } = options;

    // 1. Determine base profile
    let base: Profile;
    if (cliProfile) {
        base = getBuiltInProfile(cliProfile);
    } else {
        const userConfig = loadUserConfig(configDir);
        if (userConfig?.profile) {
            base = getBuiltInProfile(userConfig.profile);
        } else {
            base = DEFAULT_PROFILE;
        }
    }

    // 2. Merge any config file overrides (if a config file exists)
    const userConfig = loadUserConfig(configDir);
    if (userConfig) {
        return mergeConfigIntoProfile(base, userConfig);
    }

    return base;
}