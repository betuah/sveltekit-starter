import { describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ checkDb: vi.fn(), getDb: vi.fn() }));
vi.mock('#lib/server/core/db.ts', () => db);

const { GET } = await import('./+server.ts');

describe('GET /healthz', () => {
	it('returns 200 when the database answers', async () => {
		db.checkDb.mockResolvedValueOnce(true);
		const res = await GET();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: 'ok' });
	});
	it('returns 503 when the database is down', async () => {
		db.checkDb.mockResolvedValueOnce(false);
		const res = await GET();
		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ status: 'error', db: 'down' });
	});
	it('returns 503, not 500, when getDb throws', async () => {
		db.getDb.mockImplementationOnce(() => {
			throw new Error('bad config');
		});
		const res = await GET();
		expect(res.status).toBe(503);
	});
});
