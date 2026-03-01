/**
 * @description Publishers CRUD.
 * @methods GET, POST, PATCH, DELETE
 */
import {
  ApiRequest,
  ApiResponse,
  handleOptions,
  readJsonBody,
  sendJson,
  sendNoContent,
} from './_utils';
import { getQueryId, getSqlOrSendError, sendDbError } from './_handler';

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) {
    return;
  }

  const sql = getSqlOrSendError(req, res);
  if (!sql) {
    return;
  }

  if (req.method === 'GET') {
    try {
      const publishers = await sql`
        SELECT id, name, country
        FROM publishers
        ORDER BY id DESC;
      `;

      return sendJson(req, res, 200, publishers);
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);
      const name = String(body.name ?? '').trim();
      const country = String(body.country ?? '').trim();

      const nameValue = name ? name : null;
      const countryValue = country ? country : null;

      if (!nameValue && !countryValue) {
        return sendJson(req, res, 400, {
          error: 'publishers: at least one field required',
        });
      }

      const rows = await sql`
        INSERT INTO publishers (name, country)
        VALUES (${nameValue}, ${countryValue})
        RETURNING id, name, country;
      `;

      return sendJson(req, res, 201, rows[0]);
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = readJsonBody(req);
      const { id, name, country } = body;

      if (!id) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let placeholderIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${placeholderIndex++}`);
        values.push(name === '' || name === null ? null : name);
      }
      if (country !== undefined) {
        updates.push(`country = $${placeholderIndex++}`);
        values.push(country === '' || country === null ? null : country);
      }

      if (updates.length === 0) {
        return sendJson(req, res, 400, { error: 'No fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE publishers
        SET ${updates.join(', ')}
        WHERE id = $${placeholderIndex}
        RETURNING id, name, country;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'Publisher not found' });
      }

      return sendJson(req, res, 200, rows[0]);
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const idValue = getQueryId(req);

      if (!idValue) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      await sql`DELETE FROM publishers WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
