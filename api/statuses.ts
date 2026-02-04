/**
 * @description List statuses.
 * @methods GET
 */
import { getSql, MissingDatabaseUrlError } from './_db';
import { handleOptions, sendJson } from './_utils';

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) {
    return;
  }
  if (req.method !== 'GET') {
    return sendJson(req, res, 405, { error: 'method_not_allowed' });
  }

  try {
    const sql = getSql();
    const statuses = await sql`
      SELECT id, name, is_active
      FROM statuses
      WHERE is_active = true
      ORDER BY name;
    `;

    return sendJson(req, res, 200, statuses);
  } catch (err) {
    if (err instanceof MissingDatabaseUrlError) {
      return sendJson(req, res, 500, { error: 'missing_database_url' });
    }

    return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
  }
}
