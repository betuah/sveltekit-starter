import { checkDb, getDb } from '#lib/server/core/db.ts';

export async function GET() {
	return (await checkDb(getDb()))
		? Response.json({ status: 'ok' })
		: Response.json({ status: 'error', db: 'down' }, { status: 503 });
}
