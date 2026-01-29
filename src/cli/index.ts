import { run } from './run.js';

/**
 * CLI entry point (used by the binary).
 */
export async function main() {
    try {
        const result = await run(process.argv.slice(2));
        process.exit(result.exitCode);
    } catch (err) {
        console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
        process.exit(2);
    }
}

// If this file is executed directly (as a script), run the CLI.
if (require.main === module) {
    main().catch((err) => {
        console.error('Fatal error:', err instanceof Error ? err.message : String(err));
        process.exit(2);
    });
}