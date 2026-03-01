/**
 * @description Health check (DB connectivity).
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
    const result = await sql`SELECT 1 AS ok;`;

    return sendJson(req, res, 200, { ok: result[0]?.ok === 1 });
  } catch (err) {
    return sendDbError(req, res, err);
  }
}
