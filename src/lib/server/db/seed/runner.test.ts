import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Executor } from '#lib/server/core/db.ts';
import { runSeed } from '#lib/server/db/seed/runner.ts';

const { db, close } = createDb(process.env.TEST_DATABASE_URL!);

beforeAll(async () => {
	await db.execute(sql`create table if not exists seed_probe (k text primary key)`);
});
beforeEach(async () => {
	await db.execute(sql`delete from seed_probe`);
});
afterAll(async () => {
	await db.execute(sql`drop table if exists seed_probe`);
	await close();
});

describe('runSeed', () => {
	it('logs each step before running it, all inside one transaction', async () => {
		const events: string[] = [];
		const executors: Executor[] = [];
		const record = (name: string) => async (tx: Executor) => {
			events.push(`run ${name}`);
			executors.push(tx);
			await tx.execute(sql`insert into seed_probe values (${name}) on conflict do nothing`);
		};
		await runSeed(
			db,
			[
				{ name: 'a', run: record('a') },
				{ name: 'b', run: record('b') }
			],
			(msg) => events.push(msg)
		);
		expect(events).toEqual(['seed: a', 'run a', 'seed: b', 'run b']);
		expect(executors[0]).not.toBe(db);
		expect(executors[0]).toBe(executors[1]);
	});

	it('rolls back everything when a step fails', async () => {
		await expect(
			runSeed(
				db,
				[
					{
						name: 'write',
						run: (tx) =>
							tx.execute(sql`insert into seed_probe values ('rollback-me')`).then(() => {})
					},
					{
						name: 'boom',
						run: () => Promise.reject(new Error('boom'))
					}
				],
				() => {}
			)
		).rejects.toThrow('boom');
		const rows = await db.execute(sql`select k from seed_probe where k = 'rollback-me'`);
		expect(rows.length).toBe(0);
	});

	it('is safe to run twice', async () => {
		const step = {
			name: 'upsert',
			run: (tx: Executor) =>
				tx.execute(sql`insert into seed_probe values ('x') on conflict do nothing`).then(() => {})
		};
		await runSeed(db, [step], () => {});
		await runSeed(db, [step], () => {});
		const rows = await db.execute(sql`select k from seed_probe where k = 'x'`);
		expect(rows.length).toBe(1);
	});
});
