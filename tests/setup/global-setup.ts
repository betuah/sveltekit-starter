import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadEnv } from 'vite';

// Not importing db.ts: it parses config eagerly, which would need DATABASE_URL here.
export default async function setup() {
	// globalSetup runs before test.env is applied; real env vars (CI) win over .env.
	const url = process.env.TEST_DATABASE_URL ?? loadEnv('test', process.cwd(), '').TEST_DATABASE_URL;
	const client = postgres(url, { max: 1 });
	await migrate(drizzle(client), { migrationsFolder: './drizzle/migrations' });
	await client.end();
}
