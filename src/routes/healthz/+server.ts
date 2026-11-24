import { checkDb, db } from '#lib/server/core/db.ts';

export async function GET() {
	return (await checkDb(db))
		? Response.json({ status: 'ok' })
		: Response.json({ status: 'error', db: 'down' }, { status: 503 });
}
