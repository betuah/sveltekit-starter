import { describe, expect, it } from 'vitest';
import { checkDb, createDb } from '#lib/server/core/db.ts';

describe('checkDb', () => {
	it('is true for the test database', async () => {
		const { db, close } = createDb(process.env.TEST_DATABASE_URL!);
		expect(await checkDb(db)).toBe(true);
		await close();
	});
	it('is false within the timeout for an unreachable database', async () => {
		const { db, close } = createDb('postgres://x:y@127.0.0.1:1/none');
		const start = Date.now();
		expect(await checkDb(db, 500)).toBe(false);
		expect(Date.now() - start).toBeLessThan(1500);
		await close();
	});
});
