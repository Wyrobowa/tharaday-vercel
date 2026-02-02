import { getSql, MissingDatabaseUrlError } from './_db';
import { handleOptions, readJsonBody, sendJson, sendNoContent } from './_utils';

type PostgresError = { code?: string; message?: string };

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) {
    return;
  }

  let sql;
  try {
    sql = getSql();
  } catch (err) {
    if (err instanceof MissingDatabaseUrlError) {
      return sendJson(req, res, 500, { error: 'missing_database_url' });
    }
    return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
  }

  if (req.method === 'GET') {
    try {
      const items = await sql`
        SELECT
          i.id,
          i.name,
          i.type_id,
          i.status_id,
          i.priority_id,
          it.name AS type,
          s.name AS status,
          p.name AS priority
        FROM items i
        LEFT JOIN item_types it ON it.id = i.type_id
        LEFT JOIN statuses s ON s.id = i.status_id
        LEFT JOIN priorities p ON p.id = i.priority_id
        ORDER BY i.id DESC;
      `;

      return sendJson(req, res, 200, items);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);

      const name = String(body.name ?? '').trim();
      const typeId = body.type_id ? Number(body.type_id) : null;
      const statusId = body.status_id ? Number(body.status_id) : null;
      const priorityId = body.priority_id ? Number(body.priority_id) : null;

      if (!name) {
        return sendJson(req, res, 400, { error: 'Items: name required' });
      }
      if (typeId === null) {
        return sendJson(req, res, 400, { error: 'Items: type_id required' });
      }
      if (statusId === null) {
        return sendJson(req, res, 400, { error: 'Items: status_id required' });
      }
      if (priorityId === null) {
        return sendJson(req, res, 400, { error: 'Items: priority_id required' });
      }

      const rows = await sql`
        INSERT INTO items (name, type_id, status_id, priority_id)
        VALUES (${name}, ${typeId}, ${statusId}, ${priorityId})
        RETURNING id, name, type_id, status_id, priority_id;
      `;

      return sendJson(req, res, 201, rows[0]);
    } catch (err) {
      const pgErr = err as PostgresError;
      if (pgErr.code === '23503') {
        return sendJson(req, res, 400, {
          error: 'invalid_fkey',
          message: 'Type or status does not exist',
        });
      }

      return sendJson(req, res, 500, {
        error: 'db_error',
        message: String(pgErr?.message ?? pgErr),
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = readJsonBody(req);
      const { id, name, type_id, status_id, priority_id } = body;

      if (!id) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let placeholderIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${placeholderIndex++}`);
        values.push(name);
      }
      if (type_id !== undefined) {
        updates.push(`type_id = $${placeholderIndex++}`);
        values.push(type_id === '' || type_id === null ? null : Number(type_id));
      }
      if (status_id !== undefined) {
        updates.push(`status_id = $${placeholderIndex++}`);
        values.push(
          status_id === '' || status_id === null ? null : Number(status_id),
        );
      }
      if (priority_id !== undefined) {
        updates.push(`priority_id = $${placeholderIndex++}`);
        values.push(priority_id);
      }

      if (updates.length === 0) {
        return sendJson(req, res, 400, { error: 'No fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE items
        SET ${updates.join(', ')}
        WHERE id = $${placeholderIndex}
        RETURNING id, name, type_id, status_id, priority_id;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'Item not found' });
      }

      return sendJson(req, res, 200, rows[0]);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const idValue = Array.isArray(req.query?.id)
        ? req.query.id[0]
        : req.query?.id;

      if (!idValue) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      await sql`DELETE FROM items WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
