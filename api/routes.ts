import { handleOptions, sendJson } from './_utils';
import { listRoutes } from './index';

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return sendJson(req, res, 405, { error: 'method_not_allowed' });
  }

  return sendJson(req, res, 200, { routes: listRoutes() });
}
