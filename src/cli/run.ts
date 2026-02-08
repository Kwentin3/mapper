import { parseArgs } from 'util';
import { runPipeline } from '../pipeline/run_pipeline.js';
import { writeFileSync, existsSync, statSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * CLI entry point that processes command‑line arguments.
 * Returns an object with the exit code to be used by `process.exit`.
 */
export async function run(argv: string[]): Promise<{ exitCode: number }> {
    const { values, positionals } = parseArgs({
        args: argv,
        options: {
            help: { type: 'boolean', short: 'h' },
            config: { type: 'string' },
            profile: { type: 'string' },
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
    const knownOpts = new Set(['help', 'config', 'profile', 'focus', 'focus-file', 'depth', 'full-signals', 'show-orphans', 'show-temp', 'budget', 'out', 'version', 'h', 'v']);

    // allow focus-depth as known
    knownOpts.add('focus-depth');
    const unknownFlags = Object.keys(values).filter(k => !knownOpts.has(k));
    if (unknownFlags.length > 0) {
        // Find the first argument that starts with '-' and is not a known option
        for (const arg of argv) {
            if (arg === '--') break;
            if (arg.startsWith('--')) continue; // ignore long flags
            if (arg.startsWith('-') && arg.length > 1) {
                // check if any char in arg is unknown
                const chars = arg.slice(1);
                if ([...chars].some(ch => unknownFlags.includes(ch))) {
                    console.error(`Error: Invalid path '${arg}': path must not start with '-'.`);
                    return { exitCode: 1 };
                }
            }
        }
    }

    // --help / -h
    if (values.help) {
        printHelp();
        return { exitCode: 0 };
    }

    // --version / -v
    if (values.version) {
        console.log('Project Architecture Mapper v0.8');
        return { exitCode: 0 };
    }

    // Determine root directory
    const rawPath = positionals.length > 0 ? positionals[0] : '.';
    // Backwards-compatible shorthand: allow second positional arg as output file
    // only when --out is not provided. If both are provided, treat as conflict.
    if (positionals.length > 1) {
        if (typeof values.out === 'string') {
            console.error('Error: output path provided both as --out and as a positional argument. Use --out only.');
            return { exitCode: 1 };
        }
        if (positionals.length > 2) {
            console.error('Error: too many positional arguments. Usage: [<root>] [<out>]');
            return { exitCode: 1 };
        }
        // Treat second positional as --out when not specified
        values.out = positionals[1];
    }
    if (rawPath.startsWith('-')) {
        console.error(`Error: Invalid path '${rawPath}': path must not start with '-'.`);
        return { exitCode: 1 };
    }
    const resolvedPath = resolve(rawPath);
    if (!existsSync(resolvedPath)) {
        console.error(`Error: Invalid path '${rawPath}': directory does not exist.`);
        return { exitCode: 1 };
    }
    if (!statSync(resolvedPath).isDirectory()) {
        console.error(`Error: Invalid path '${rawPath}': path is not a directory.`);
        return { exitCode: 1 };
    }
    const rootDir = resolvedPath;

    // Parse numeric depth
    let depth: number | undefined = undefined;
    if (values.depth !== undefined) {
        const parsed = parseInt(values.depth as string, 10);
        if (isNaN(parsed) || parsed < 0) {
            console.error('Error: --depth must be a non‑negative integer.');
            return { exitCode: 1 };
        }
        depth = parsed;
    }

    // Parse focus-depth (K hops for task capsule). Default handled later in pipeline when focus-file is present.
    let focusDepth: number | undefined = undefined;
    if (values['focus-depth'] !== undefined) {
        const parsed = parseInt(values['focus-depth'] as string, 10);
        if (isNaN(parsed) || parsed < 0) {
            console.error('Error: --focus-depth must be a non‑negative integer.');
            return { exitCode: 1 };
        }
        focusDepth = parsed;
    }

    // Determine config directory (if --config points to a file, use its parent directory)
    let configDir: string | undefined = undefined;
    if (typeof values.config === 'string') {
        // Assume it's a file path; use its directory
        configDir = dirname(resolve(values.config));
    }

    try {
        // Validate --out target early to provide deterministic, user-friendly
        // error messages rather than leaking internal IO errors. We validate
        // relative to the resolved `rootDir` so tests and CI remain hermetic
        // and deterministic.
        if (typeof values.out === 'string') {
            const candidateOut = resolve(rootDir, values.out);
            if (existsSync(candidateOut) && statSync(candidateOut).isDirectory()) {
                console.error('Error: --out must be a file path, not a directory.');
                return { exitCode: 1 };
            }
            const parent = dirname(candidateOut);
            if (!existsSync(parent)) {
                console.error('Error: output parent directory does not exist.');
                return { exitCode: 1 };
            }
        }

        // Validate --budget if provided
        if (typeof values.budget === 'string') {
            const allowed = new Set(['small', 'default', 'large']);
            if (!allowed.has(values.budget)) {
                console.error(`Error: invalid --budget value: ${values.budget}`);
                return { exitCode: 1 };
            }
        }

        const result = await runPipeline({
            rootDir,
            configPath: configDir,
            profileName: typeof values.profile === 'string' ? values.profile : undefined,
            focus: typeof values.focus === 'string' ? values.focus : undefined,
            focusFile: typeof values['focus-file'] === 'string' ? values['focus-file'] : undefined,
            focusDepth,
            depth,
            fullSignals: values['full-signals'] === true,
            showOrphans: values['show-orphans'] === true,
            outFile: typeof values.out === 'string' ? values.out : undefined,
            budget: typeof values.budget === 'string' ? (values.budget as 'small' | 'default' | 'large') : undefined,
        });

        // Write markdown to file
        const outPath = resolve(rootDir, typeof values.out === 'string' ? values.out : 'ARCHITECTURE.md');
        writeFileSync(outPath, result.markdown, 'utf-8');

        // Print summary
        console.log(`✅ Architecture map written to ${outPath}`);
        if (result.warnings.length > 0) {
            console.log(`⚠️  ${result.warnings.length} warning(s):`);
            for (const w of result.warnings.slice(0, 5)) {
                console.log(`   ${w}`);
            }
            if (result.warnings.length > 5) {
                console.log(`   … and ${result.warnings.length - 5} more`);
            }
        } else {
            console.log('✅ No warnings.');
        }

        return { exitCode: 0 };
    } catch (err) {
        // Deterministic user error for missing focus-file
        if (err instanceof Error && err.message.startsWith('Error: --focus-file not found: ')) {
            console.error(err.message);
            return { exitCode: 1 };
        }
        console.error('Internal error:', err instanceof Error ? err.message : String(err));
        return { exitCode: 2 };
    }
}

function printHelp() {
    console.log(`
Usage: mapper [options] [<path>]

Generate an Architecture Context Artifact (ARCHITECTURE.md) for the given path.

Options:
  -h, --help          Show this help message
  -v, --version       Show version
  --config <file>     Use a custom configuration file
  --profile <name>    Use a built‑in profile (default, fsd, monorepo)
    --budget <name>     View budget profile: small, default, large
  --focus <path>      Focus the tree on a specific subdirectory
        --focus-file <path> Focus a single repo-relative file for a deep‑dive (use POSIX / separators)
  --focus-depth <K>   When --focus-file is set, fully expand nodes within K hops (default: 1)
  --depth <number>    Limit tree depth (0 = root only)
  --full-signals      Show all signals, ignoring budget limits
  --show-orphans      Show ORPHAN signals for test/docs/config files
    --show-temp         Render test/temp_* directories normally (do not policy-collapse)
  --out <file>        Output file (default: ARCHITECTURE.md)

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
