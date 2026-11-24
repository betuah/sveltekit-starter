import { defineConfig } from '@playwright/test';

// Playwright does not load .env; CI passes real env vars, which win over the file.
try {
	process.loadEnvFile();
} catch {
	// no .env file (CI)
}

export default defineConfig({
	webServer: {
		command: 'bun run build && PORT=4173 bun ./build',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_URL: process.env.DATABASE_URL ?? '',
			ORIGIN: 'http://localhost:4173'
		}
	},
	use: { baseURL: 'http://localhost:4173' },
	testDir: 'e2e'
});
