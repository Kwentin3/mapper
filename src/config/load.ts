import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Profile, DEFAULT_PROFILE, getBuiltInProfile, SemanticProfileV0 } from './profiles';

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
    semanticProfile?: Partial<SemanticProfileV0>;
}

function loadUserConfigFile(filePath: string): UserConfig | null {
    if (!existsSync(filePath)) {
        return null;
    }
    try {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as UserConfig;
    } catch {
        // If the file is malformed, ignore it (fallback to defaults).
        return null;
    }
}

function normalizePosixPatterns(values: string[]): string[] {
    return values
        .map(value => value.replace(/\\/g, '/'))
        .sort((a, b) => a.localeCompare(b));
}

function normalizeAnchors(values: string[]): string[] {
    return [...values].sort((a, b) => a.localeCompare(b));
}

function mergeSemanticProfile(
    base?: SemanticProfileV0,
    override?: Partial<SemanticProfileV0>
): SemanticProfileV0 | undefined {
    if (!base && !override) {
        return undefined;
    }

    const boundary = {
        include: override?.boundary?.include ?? base?.boundary.include ?? [],
        exclude: override?.boundary?.exclude ?? base?.boundary.exclude ?? [],
    };
    const anchors = {
        inbound: override?.anchors?.inbound ?? base?.anchors.inbound ?? [],
        outbound: override?.anchors?.outbound ?? base?.anchors.outbound ?? [],
    };

    return {
        version: 0,
        boundary: {
            include: normalizePosixPatterns(boundary.include),
            exclude: normalizePosixPatterns(boundary.exclude),
        },
        anchors: {
            inbound: normalizeAnchors(anchors.inbound),
            outbound: normalizeAnchors(anchors.outbound),
        },
    };
}

/**
 * Load a user configuration file from the given directory (or current working directory).
 * Returns `null` if no config file is found.
 */
export function loadUserConfig(dir: string = process.cwd()): UserConfig | null {
    for (const filename of CONFIG_FILENAMES) {
        const filePath = join(dir, filename);
        if (existsSync(filePath)) {
            return loadUserConfigFile(filePath);
        }
    }
    return null;
}

export function loadUserConfigFromPath(filePath: string): UserConfig | null {
    return loadUserConfigFile(filePath);
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
        semanticProfile: mergeSemanticProfile(base.semanticProfile, config.semanticProfile),
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
    /** Explicit config file path from CLI `--config` */
    configPath?: string;
    /** Directory to look for config files (defaults to cwd) */
    configDir?: string;
}): Profile {
    const { profile: cliProfile, configPath, configDir = process.cwd() } = options;
    const userConfig = configPath
        ? loadUserConfigFromPath(configPath)
        : loadUserConfig(configDir);

    // 1. Determine base profile
    let base: Profile;
    if (cliProfile) {
        base = getBuiltInProfile(cliProfile);
    } else {
        if (userConfig?.profile) {
            base = getBuiltInProfile(userConfig.profile);
        } else {
            base = DEFAULT_PROFILE;
        }
    }

    // 2. Merge any config file overrides (if a config file exists)
    if (userConfig) {
        return mergeConfigIntoProfile(base, userConfig);
    }

    return base;
}
