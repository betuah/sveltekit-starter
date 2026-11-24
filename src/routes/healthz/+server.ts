import { checkDb, getDb } from '#lib/server/core/db.ts';

export async function GET() {
	let ok = false;
	try {
		ok = await checkDb(getDb());
	} catch {
		// getDb() can throw on bad config; health must still answer with 503, not 500.
	}
	return ok
		? Response.json({ status: 'ok' })
		: Response.json({ status: 'error', db: 'down' }, { status: 503 });
}
