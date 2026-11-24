import { describe, expect, it } from 'vitest';
import { ConfigError, parseConfig } from './config.ts';

describe('parseConfig', () => {
	it('parses a valid env', () => {
		expect(parseConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgres://a:b@h:5432/d' })).toEqual({
			nodeEnv: 'test',
			databaseUrl: 'postgres://a:b@h:5432/d'
		});
	});
	it('defaults NODE_ENV to development', () => {
		expect(parseConfig({ DATABASE_URL: 'postgres://a:b@h/d' }).nodeEnv).toBe('development');
	});
	it('names the missing key in one line', () => {
		expect(() => parseConfig({})).toThrow(ConfigError);
		expect(() => parseConfig({})).toThrow(/^Invalid environment: DATABASE_URL/);
	});
	it('rejects a non-postgres URL', () => {
		expect(() => parseConfig({ DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
	});
});
