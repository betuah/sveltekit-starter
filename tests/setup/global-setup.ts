import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadEnv } from 'vite';

// Not importing db.ts: it would read DATABASE_URL, while migrations here target TEST_DATABASE_URL.
export default async function setup() {
	// globalSetup runs before test.env is applied; real env vars (CI) win over .env.
	const url = process.env.TEST_DATABASE_URL ?? loadEnv('test', process.cwd(), '').TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is not set');
	const client = postgres(url, { max: 1 });
	try {
		await migrate(drizzle(client), { migrationsFolder: './drizzle/migrations' });
	} finally {
		await client.end();
	}
}
