import { z } from 'zod';

const schema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ })
});

export type Config = { nodeEnv: 'development' | 'test' | 'production'; databaseUrl: string };

export class ConfigError extends Error {}

export function parseConfig(env: Record<string, string | undefined>): Config {
	const result = schema.safeParse(env);
	if (!result.success) {
		// One entry per key, so a key with several issues is named once.
		const byKey = new Map<string, string>();
		for (const i of result.error.issues) {
			const key = String(i.path[0] ?? 'env');
			if (!byKey.has(key)) byKey.set(key, i.message.replace(/\s+/g, ' '));
		}
		const details = [...byKey].map(([key, msg]) => `${key} (${msg})`).join(', ');
		throw new ConfigError(`Invalid environment: ${details}`);
	}
	return { nodeEnv: result.data.NODE_ENV, databaseUrl: result.data.DATABASE_URL };
}

let cached: Config | undefined;

// Lazy so `vite build` needs no secrets; the init hook calls it to fail fast at startup.
export function getConfig(): Config {
	return (cached ??= parseConfig(process.env));
}
