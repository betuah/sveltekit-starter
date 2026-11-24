import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'postgresql',
	out: './drizzle/migrations',
	schema: ['./src/lib/server/core/*.table.ts', './src/lib/server/modules/*/*.table.ts'],
	dbCredentials: { url: process.env.DATABASE_URL! }
});
