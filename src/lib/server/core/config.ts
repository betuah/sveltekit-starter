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
		const details = result.error.issues
			.map((i) => `${String(i.path[0])} (${i.message})`)
			.join(', ');
		throw new ConfigError(`Invalid environment: ${details}`);
	}
	return { nodeEnv: result.data.NODE_ENV, databaseUrl: result.data.DATABASE_URL };
}

export const config: Config = parseConfig(process.env);
