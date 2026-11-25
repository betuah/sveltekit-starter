import type { Db, Executor } from '#lib/server/core/db.ts';

export type SeedStep = { name: string; run(tx: Executor): Promise<void> };

export async function runSeed(
	db: Db,
	steps: SeedStep[],
	log: (msg: string) => void = console.log
): Promise<void> {
	await db.transaction(async (tx) => {
		for (const step of steps) {
			log(`seed: ${step.name}`);
			await step.run(tx);
		}
	});
}
