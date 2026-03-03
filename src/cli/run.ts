import { parseArgs } from 'util';
import { runPipeline } from '../pipeline/run_pipeline.js';
import { writeFileSync, existsSync, statSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { isStopError, type StopSignal } from '../stop/stop_signal.js';
import { assertAgentSnapshot, computeArtifactDiff } from '../artifact/diff_artifacts.js';

/**
 * CLI entry point that processes command‑line arguments.
 * Returns an object with the exit code to be used by `process.exit`.
 */
export type CliIO = {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

export async function run(argv: string[], io?: Partial<CliIO>): Promise<{ exitCode: number; stop?: StopSignal }> {
    const log = io?.log ?? console.log;
    const error = io?.error ?? console.error;

    const stopReturn = (stop: StopSignal, exitCode: number) => {
        error(stop.reason);
        return { exitCode, stop };
    };

    const { values, positionals } = parseArgs({
        args: argv,
        options: {
            help: { type: 'boolean', short: 'h' },
            config: { type: 'string' },
            profile: { type: 'string' },
            format: { type: 'string' },
            'strict-flags': { type: 'boolean' },
            diff: { type: 'boolean' },
            focus: { type: 'string' },
            depth: { type: 'string' },
            'full-signals': { type: 'boolean' },
            'show-orphans': { type: 'boolean' },
            'show-temp': { type: 'boolean' },
            'focus-file': { type: 'string' },
            'focus-depth': { type: 'string' },
            budget: { type: 'string' },
            out: { type: 'string' },
            version: { type: 'boolean', short: 'v' },
        },
        strict: false,
        allowUnknown: true,
        allowPositionals: true,
    });

    // Detect unknown short flags (single dash with unknown characters)
    const knownOpts = new Set(['help', 'config', 'profile', 'format', 'strict-flags', 'diff', 'focus', 'focus-file', 'depth', 'full-signals', 'show-orphans', 'show-temp', 'budget', 'out', 'version', 'h', 'v']);

    // allow focus-depth as known
    knownOpts.add('focus-depth');
    const unknownFlags = Object.keys(values).filter(k => !knownOpts.has(k));
    if (values['strict-flags'] === true && unknownFlags.length > 0) {
        const strictUnknown = unknownFlags
            .map(flag => (flag.length === 1 ? `-${flag}` : `--${flag}`))
            .sort()
            .join(', ');
        error(`Error: unknown option(s): ${strictUnknown}. Use --help.`);
        return stopReturn({
            code: 'STOP_UNKNOWN_OPTION',
            reason: `Error: unknown option(s): ${strictUnknown}. Use --help.`,
            blocking: true,
            severity: 'stop',
        }, 1);
    }
    if (unknownFlags.length > 0) {
        // Find the first argument that starts with '-' and is not a known option
        for (const arg of argv) {
            if (arg === '--') break;
            if (arg.startsWith('--')) continue; // ignore long flags
            if (arg.startsWith('-') && arg.length > 1) {
                // check if any char in arg is unknown
                const chars = arg.slice(1);
                if ([...chars].some(ch => unknownFlags.includes(ch))) {
                    error(`Error: Invalid path '${arg}': path must not start with '-'.`);
                    return stopReturn({
                        code: 'STOP_INVALID_PATH',
                        reason: `Error: Invalid path '${arg}': path must not start with '-'.`,
                        blocking: true,
                        severity: 'stop',
                        scope: { kind: 'path', value: arg },
                    }, 1);
                }
            }
        }
    }

    // --help / -h
    if (values.help) {
        printHelp(log);
        return { exitCode: 0 };
    }

    // --version / -v
    if (values.version) {
        log('Project Architecture Mapper v0.8');
        return { exitCode: 0 };
    }

    const isDiffMode = values.diff === true;
    const format = typeof values.format === 'string' ? values.format : (isDiffMode ? 'json' : 'markdown');
    if (format !== 'markdown' && format !== 'json') {
        error(`Error: invalid --format value: ${format}`);
        return stopReturn({
            code: 'STOP_INVALID_FORMAT',
            reason: `Error: invalid --format value: ${format}`,
            blocking: true,
            severity: 'stop',
        }, 1);
    }
    if (isDiffMode && format !== 'json') {
        error('Error: --diff supports only --format json.');
        return stopReturn({
            code: 'STOP_INVALID_FORMAT',
            reason: 'Error: --diff supports only --format json.',
            blocking: true,
            severity: 'stop',
        }, 1);
    }

    if (isDiffMode) {
        if (positionals.length !== 2) {
            error('Error: --diff expects exactly 2 positional arguments: <base.json> <head.json>.');
            return stopReturn({
                code: 'STOP_INVALID_DIFF_USAGE',
                reason: 'Error: --diff expects exactly 2 positional arguments: <base.json> <head.json>.',
                blocking: true,
                severity: 'stop',
            }, 1);
        }

        const baseRaw = positionals[0];
        const headRaw = positionals[1];
        if (baseRaw.startsWith('-') || headRaw.startsWith('-')) {
            const bad = baseRaw.startsWith('-') ? baseRaw : headRaw;
            error(`Error: Invalid path '${bad}': path must not start with '-'.`);
            return stopReturn({
                code: 'STOP_INVALID_PATH',
                reason: `Error: Invalid path '${bad}': path must not start with '-'.`,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'path', value: bad },
            }, 1);
        }

        const basePath = resolve(baseRaw);
        const headPath = resolve(headRaw);
        if (!existsSync(basePath) || !statSync(basePath).isFile()) {
            error(`Error: invalid artifact path: ${baseRaw}`);
            return stopReturn({
                code: 'STOP_INVALID_PATH',
                reason: `Error: invalid artifact path: ${baseRaw}`,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'path', value: baseRaw },
            }, 1);
        }
        if (!existsSync(headPath) || !statSync(headPath).isFile()) {
            error(`Error: invalid artifact path: ${headRaw}`);
            return stopReturn({
                code: 'STOP_INVALID_PATH',
                reason: `Error: invalid artifact path: ${headRaw}`,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'path', value: headRaw },
            }, 1);
        }

        const outFile = typeof values.out === 'string' ? values.out : 'ARCHITECTURE_DIFF.json';
        const outPath = resolve(outFile);
        if (existsSync(outPath) && statSync(outPath).isDirectory()) {
            error('Error: --out must be a file path, not a directory.');
            return stopReturn({
                code: 'STOP_INVALID_OUTPUT_PATH',
                reason: 'Error: --out must be a file path, not a directory.',
                blocking: true,
                severity: 'stop',
                scope: { kind: 'path', value: outFile },
            }, 1);
        }
        const outParent = dirname(outPath);
        if (!existsSync(outParent)) {
            error('Error: output parent directory does not exist.');
            return stopReturn({
                code: 'STOP_INVALID_OUTPUT_PATH',
                reason: 'Error: output parent directory does not exist.',
                blocking: true,
                severity: 'stop',
                scope: { kind: 'path', value: outFile },
            }, 1);
        }

        let baseParsed: unknown;
        let headParsed: unknown;
        try {
            baseParsed = JSON.parse(readFileSync(basePath, 'utf-8'));
        } catch {
            error(`Error: invalid artifact JSON: ${baseRaw}`);
            return stopReturn({
                code: 'STOP_INVALID_ARTIFACT_JSON',
                reason: `Error: invalid artifact JSON: ${baseRaw}`,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'file', value: baseRaw },
            }, 1);
        }
        try {
            headParsed = JSON.parse(readFileSync(headPath, 'utf-8'));
        } catch {
            error(`Error: invalid artifact JSON: ${headRaw}`);
            return stopReturn({
                code: 'STOP_INVALID_ARTIFACT_JSON',
                reason: `Error: invalid artifact JSON: ${headRaw}`,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'file', value: headRaw },
            }, 1);
        }

        try {
            assertAgentSnapshot(baseParsed);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            error(reason);
            return stopReturn({
                code: 'STOP_INVALID_ARTIFACT_SCHEMA',
                reason,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'file', value: baseRaw },
            }, 1);
        }
        try {
            assertAgentSnapshot(headParsed);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            error(reason);
            return stopReturn({
                code: 'STOP_INVALID_ARTIFACT_SCHEMA',
                reason,
                blocking: true,
                severity: 'stop',
                scope: { kind: 'file', value: headRaw },
            }, 1);
        }

        const diff = computeArtifactDiff(baseParsed, headParsed);
        writeFileSync(outPath, JSON.stringify(diff, null, 2) + '\n', 'utf-8');
        log(`✅ Artifact diff written to ${outPath}`);
        return { exitCode: 0 };
    }

    // Determine root directory
    const rawPath = positionals.length > 0 ? positionals[0] : '.';
    // Backwards-compatible shorthand: allow second positional arg as output file
    // only when --out is not provided. If both are provided, treat as conflict.
    if (positionals.length > 1) {
        if (typeof values.out === 'string') {
            error('Error: output path provided both as --out and as a positional argument. Use --out only.');
            return stopReturn({
                code: 'STOP_OUTPUT_PATH_CONFLICT',
                reason: 'Error: output path provided both as --out and as a positional argument. Use --out only.',
                blocking: true,
                severity: 'stop',
            }, 1);
        }
        if (positionals.length > 2) {
            error('Error: too many positional arguments. Usage: [<root>] [<out>]');
            return stopReturn({
                code: 'STOP_TOO_MANY_POSITIONALS',
                reason: 'Error: too many positional arguments. Usage: [<root>] [<out>]',
                blocking: true,
                severity: 'stop',
            }, 1);
        }
        // Treat second positional as --out when not specified
        values.out = positionals[1];
    }
    if (rawPath.startsWith('-')) {
        error(`Error: Invalid path '${rawPath}': path must not start with '-'.`);
        return stopReturn({
            code: 'STOP_INVALID_PATH',
            reason: `Error: Invalid path '${rawPath}': path must not start with '-'.`,
            blocking: true,
            severity: 'stop',
            scope: { kind: 'path', value: rawPath },
        }, 1);
    }
    const resolvedPath = resolve(rawPath);
    if (!existsSync(resolvedPath)) {
        error(`Error: Invalid path '${rawPath}': directory does not exist.`);
        return stopReturn({
            code: 'STOP_INVALID_PATH',
            reason: `Error: Invalid path '${rawPath}': directory does not exist.`,
            blocking: true,
            severity: 'stop',
            scope: { kind: 'path', value: rawPath },
        }, 1);
    }
    if (!statSync(resolvedPath).isDirectory()) {
        error(`Error: Invalid path '${rawPath}': path is not a directory.`);
        return stopReturn({
            code: 'STOP_INVALID_PATH',
            reason: `Error: Invalid path '${rawPath}': path is not a directory.`,
            blocking: true,
            severity: 'stop',
            scope: { kind: 'path', value: rawPath },
        }, 1);
    }
    const rootDir = resolvedPath;

    // Parse numeric depth
    let depth: number | undefined = undefined;
    if (values.depth !== undefined) {
        const parsed = parseInt(values.depth as string, 10);
        if (isNaN(parsed) || parsed < 0) {
            error('Error: --depth must be a non‑negative integer.');
            return stopReturn({
                code: 'STOP_INVALID_DEPTH',
                reason: 'Error: --depth must be a non‑negative integer.',
                blocking: true,
                severity: 'stop',
            }, 1);
        }
        depth = parsed;
    }

    // Parse focus-depth (K hops for task capsule). Default handled later in pipeline when focus-file is present.
    let focusDepth: number | undefined = undefined;
    if (values['focus-depth'] !== undefined) {
        const parsed = parseInt(values['focus-depth'] as string, 10);
        if (isNaN(parsed) || parsed < 0) {
            error('Error: --focus-depth must be a non‑negative integer.');
            return stopReturn({
                code: 'STOP_INVALID_FOCUS_DEPTH',
                reason: 'Error: --focus-depth must be a non‑negative integer.',
                blocking: true,
                severity: 'stop',
            }, 1);
        }
        focusDepth = parsed;
    }

    // Explicit config file path (used only when --config is provided)
    let configPath: string | undefined = undefined;
    if (typeof values.config === 'string') {
        configPath = resolve(values.config);
    }

    const defaultOutFile = format === 'json' ? 'ARCHITECTURE.json' : 'ARCHITECTURE.md';

    try {
        // Validate --out target early to provide deterministic, user-friendly
        // error messages rather than leaking internal IO errors. We validate
        // relative to the resolved `rootDir` so tests and CI remain hermetic
        // and deterministic.
        const outFile = typeof values.out === 'string' ? values.out : defaultOutFile;
        if (typeof outFile === 'string') {
            const candidateOut = resolve(rootDir, outFile);
            if (existsSync(candidateOut) && statSync(candidateOut).isDirectory()) {
                error('Error: --out must be a file path, not a directory.');
                return stopReturn({
                    code: 'STOP_INVALID_OUTPUT_PATH',
                    reason: 'Error: --out must be a file path, not a directory.',
                    blocking: true,
                    severity: 'stop',
                    scope: { kind: 'path', value: outFile },
                }, 1);
            }
            const parent = dirname(candidateOut);
            if (!existsSync(parent)) {
                error('Error: output parent directory does not exist.');
                return stopReturn({
                    code: 'STOP_INVALID_OUTPUT_PATH',
                    reason: 'Error: output parent directory does not exist.',
                    blocking: true,
                    severity: 'stop',
                    scope: { kind: 'path', value: outFile },
                }, 1);
            }
        }

        // Validate --budget if provided
        if (typeof values.budget === 'string') {
            const allowed = new Set(['small', 'default', 'large']);
            if (!allowed.has(values.budget)) {
                error(`Error: invalid --budget value: ${values.budget}`);
                return stopReturn({
                    code: 'STOP_INVALID_BUDGET',
                    reason: `Error: invalid --budget value: ${values.budget}`,
                    blocking: true,
                    severity: 'stop',
                }, 1);
            }
        }

        const result = await runPipeline({
            rootDir,
            configPath,
            profileName: typeof values.profile === 'string' ? values.profile : undefined,
            focus: typeof values.focus === 'string' ? values.focus : undefined,
            focusFile: typeof values['focus-file'] === 'string' ? values['focus-file'] : undefined,
            focusDepth,
            depth,
            fullSignals: values['full-signals'] === true,
            showOrphans: values['show-orphans'] === true,
            showTemp: values['show-temp'] === true,
            outFile: typeof values.out === 'string' ? values.out : undefined,
            budget: typeof values.budget === 'string' ? (values.budget as 'small' | 'default' | 'large') : undefined,
        });

        // Write markdown to file
        const outPath = resolve(rootDir, typeof values.out === 'string' ? values.out : defaultOutFile);
        const content = format === 'json'
            ? JSON.stringify(result.snapshot, null, 2) + '\n'
            : result.markdown;
        writeFileSync(outPath, content, 'utf-8');

        // Print summary
        log(`✅ Architecture map written to ${outPath}`);
        if (result.warnings.length > 0) {
            log(`⚠️  ${result.warnings.length} warning(s):`);
            for (const w of result.warnings.slice(0, 5)) {
                log(`   ${w}`);
            }
            if (result.warnings.length > 5) {
                log(`   … and ${result.warnings.length - 5} more`);
            }
        } else {
            log('✅ No warnings.');
        }

        return { exitCode: 0 };
    } catch (err) {
        // Deterministic user error for missing focus-file
        if (isStopError(err)) {
            // Render exactly the same text as before; object stays internal.
            if (err.stop.code === 'STOP_FOCUS_FILE_NOT_FOUND') {
                error(err.stop.reason);
                return { exitCode: 1, stop: err.stop };
            }
            error('Internal error:', err.stop.reason);
            return { exitCode: 2, stop: err.stop };
        }

        if (err instanceof Error && err.message.startsWith('Error: --focus-file not found: ')) {
            error(err.message);
            return { exitCode: 1 };
        }
        error('Internal error:', err instanceof Error ? err.message : String(err));
        return { exitCode: 2 };
    }
}

function printHelp(log: (...args: any[]) => void) {
    log(`
Usage:
  mapper [options] [<path>]
  mapper --diff [--out <file>] <base.json> <head.json>

Generate an Architecture Context Artifact for a path, or diff two JSON artifacts.

Options:
  -h, --help          Show this help message
  -v, --version       Show version
  --config <file>     Use a custom configuration file
  --profile <name>    Use a built‑in profile (default, fsd, monorepo)
  --format <name>     Output format: markdown, json
  --diff              Compare two JSON artifacts and output a JSON diff
  --strict-flags      Fail on unknown flags (agent-safe mode)
  --budget <name>     View budget profile: small, default, large
  --focus <path>      Focus the tree on a specific subdirectory
  --focus-file <path> Focus a single repo-relative file for a deep‑dive (use POSIX / separators)
  --focus-depth <K>   When --focus-file is set, fully expand nodes within K hops (default: 1)
  --depth <number>    Limit tree depth (0 = root only)
  --full-signals      Show all signals, ignoring budget limits
  --show-orphans      Show ORPHAN signals for test/docs/config files
  --show-temp         Render test/temp_* directories normally (do not policy-collapse)
  --out <file>        Output file (default: ARCHITECTURE.md/ARCHITECTURE.json/ARCHITECTURE_DIFF.json)

Contract Telemetry:
    [C+] Contracted boundary (inbound and outbound anchors detected)
    [C?] Partial contract (incomplete boundary definition)
    [C0] Boundary without formal contract
    [C~] Contract status undetermined

Contract Telemetry signals are architectural facts.
Agent interpretation rules are defined in:
    docs/agent-interpretation.md

If no path is provided, the current directory is analyzed.

For more details, see the documentation at https://github.com/Kwentin3/mapper
`.trim());
}
