import { describe, expect, it } from 'vitest';
import { ConfigError, getConfig, parseConfig } from '#lib/server/core/config.ts';

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
	it('accepts the postgresql: scheme', () => {
		expect(parseConfig({ DATABASE_URL: 'postgresql://a:b@h/d' }).databaseUrl).toBe(
			'postgresql://a:b@h/d'
		);
	});
	it('rejects an empty DATABASE_URL', () => {
		expect(() => parseConfig({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
	});
	it('rejects an unknown NODE_ENV', () => {
		expect(() => parseConfig({ NODE_ENV: 'staging', DATABASE_URL: 'postgres://a:b@h/d' })).toThrow(
			/NODE_ENV/
		);
	});
	it('names every bad key once, on a single line', () => {
		let message = '';
		try {
			parseConfig({ NODE_ENV: 'staging' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/^Invalid environment: /);
		expect(message).toContain('NODE_ENV');
		expect(message).toContain('DATABASE_URL');
		expect(message).not.toContain('\n');
		expect(message.match(/DATABASE_URL/g)).toHaveLength(1);
	});
});

describe('getConfig', () => {
	it('returns the same object on repeated calls', () => {
		expect(getConfig()).toBe(getConfig());
	});
});
