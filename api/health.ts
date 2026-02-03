/**
 * @description Health check (DB connectivity).
 * @methods GET
 */
import { getSql, MissingDatabaseUrlError } from './_db';
import { handleOptions, sendJson } from './_utils';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) {
    return;
  }
  if (req.method !== 'GET') {
    return sendJson(req, res, 405, { error: 'method_not_allowed' });
  }

  try {
    const sql = getSql();
    const result = await sql`SELECT 1 AS ok;`;

    return sendJson(req, res, 200, { ok: result[0]?.ok === 1 });
  } catch (err) {
    if (err instanceof MissingDatabaseUrlError) {
      return sendJson(req, res, 500, { error: 'missing_database_url' });
    }

    return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
  }
}
