import { ConfigError, getConfig } from '#lib/server/core/config.ts';
import { createDb } from '#lib/server/core/db.ts';
import { runSeed, type SeedStep } from './runner.ts';

// Seeders run in this order; add new ones here.
const steps: SeedStep[] = [];

async function main(): Promise<number> {
	let conn: ReturnType<typeof createDb> | undefined;
	try {
		conn = createDb(getConfig().databaseUrl);
		await runSeed(conn.db, steps);
		return 0;
	} catch (err) {
		console.error(
			err instanceof ConfigError
				? err.message
				: `seed failed: ${err instanceof Error ? err.message : String(err)}`
		);
		return 1;
	} finally {
		// A failing close must not hide the seed result printed above.
		await conn?.close().catch(() => {});
	}
}

process.exit(await main());
