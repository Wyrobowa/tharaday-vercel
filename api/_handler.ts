import { getSql, MissingDatabaseUrlError } from './_db';
import { ApiRequest, ApiResponse, sendJson } from './_utils';

export type PostgresError = {
  code?: string;
  message?: string;
};

export function sendDbError(req: ApiRequest, res: ApiResponse, err: unknown) {
  if (err instanceof MissingDatabaseUrlError) {
    return sendJson(req, res, 500, { error: 'missing_database_url' });
  }

  return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
}

export function getSqlOrSendError(req: ApiRequest, res: ApiResponse) {
  try {
    return getSql();
  } catch (err) {
    sendDbError(req, res, err);
    return null;
  }
}

export function getQueryId(req: ApiRequest): string | undefined {
  const idValue = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  return idValue ? String(idValue) : undefined;
}

export function ensureMethod(
  req: ApiRequest,
  res: ApiResponse,
  method: string,
) {
  if (req.method === method) {
    return true;
  }

  sendJson(req, res, 405, { error: 'method_not_allowed' });
  return false;
}
