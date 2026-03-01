/**
 * @description List statuses.
 * @methods GET
 */
import { ApiRequest, ApiResponse, handleOptions, sendJson } from './_utils';
import { ensureMethod, getSqlOrSendError, sendDbError } from './_handler';

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) {
    return;
  }
  if (!ensureMethod(req, res, 'GET')) {
    return;
  }

  const sql = getSqlOrSendError(req, res);
  if (!sql) {
    return;
  }

  try {
    const statuses = await sql`
      SELECT id, name, is_active
      FROM statuses
      WHERE is_active = true
      ORDER BY name;
    `;

    return sendJson(req, res, 200, statuses);
  } catch (err) {
    return sendDbError(req, res, err);
  }
}
