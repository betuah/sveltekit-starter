import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { getConfig } from '#lib/server/core/config.ts';

// Later plans spread table modules into this object.
export const schema = {};

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
	const client = postgres(url, { connect_timeout: 2 });
	return {
		db: drizzle(client, { schema }),
		close: () => client.end({ timeout: 1 })
	};
}

// shortcut: a timed-out query is not cancelled and keeps its pool slot until the server answers; add cancellation if health probes hit a hung DB often.
export async function checkDb(executor: Executor, timeoutMs = 2000): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			executor.execute(sql`select 1`),
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error('db check timeout')), timeoutMs);
			})
		]);
		return true;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}

let cached: Db | undefined;

export function getDb(): Db {
	return (cached ??= createDb(getConfig().databaseUrl).db);
}
