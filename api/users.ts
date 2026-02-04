/**
 * @description Users CRUD.
 * @methods GET, POST, PATCH, DELETE
 */
import { getSql, MissingDatabaseUrlError } from './_db';
import { handleOptions, readJsonBody, sendJson, sendNoContent } from './_utils';

type PostgresError = { code?: string; message?: string };

// noinspection JSUnusedGlobalSymbols
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
      const users = await sql`
        SELECT
          u.id,
          u.name,
          u.email,
          u.role_id,
          u.status_id,
          r.name AS role,
          s.name AS status
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN statuses s ON s.id = u.status_id
        ORDER BY u.id DESC;
      `;

      return sendJson(req, res, 200, users);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);

      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim();
      const roleIdRaw = body.role_id;
      const statusIdRaw = body.status_id;

      if (roleIdRaw === null || roleIdRaw === undefined || roleIdRaw === '') {
        return sendJson(req, res, 400, { error: 'Users: role_id required' });
      }
      if (statusIdRaw === null || statusIdRaw === undefined || statusIdRaw === '') {
        return sendJson(req, res, 400, { error: 'Users: status_id required' });
      }

      const roleId = Number(roleIdRaw);
      const statusId = Number(statusIdRaw);

      if (!name) {
        return sendJson(req, res, 400, { error: 'Users: name required' });
      }
      if (!email) {
        return sendJson(req, res, 400, { error: 'Users: email required' });
      }
      if (!Number.isFinite(roleId)) {
        return sendJson(req, res, 400, { error: 'Users: role_id must be a number' });
      }
      if (!Number.isFinite(statusId)) {
        return sendJson(req, res, 400, {
          error: 'Users: status_id must be a number',
        });
      }

      const rows = await sql`
        INSERT INTO users (name, email, role_id, status_id)
        VALUES (${name}, ${email}, ${roleId}, ${statusId})
        RETURNING id, name, email, role_id, status_id;
      `;

      const created = rows[0];

      return sendJson(req, res, 201, created);
    } catch (err) {
      const pgErr = err as PostgresError;

      if (pgErr.code === '23505') {
        return sendJson(req, res, 409, {
          error: 'duplicate',
          message: 'User already exists',
        });
      }

      if (pgErr.code === '23503') {
        return sendJson(req, res, 400, {
          error: 'invalid_fkey',
          message: 'Role or status does not exist',
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
      const { id, name, email, role_id, status_id } = body;

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
      if (email !== undefined) {
        updates.push(`email = $${placeholderIndex++}`);
        values.push(email);
      }
      if (role_id !== undefined) {
        if (role_id === '' || role_id === null) {
          return sendJson(req, res, 400, {
            error: 'Users: role_id must be a number',
          });
        }
        const roleIdValue = Number(role_id);
        if (!Number.isFinite(roleIdValue)) {
          return sendJson(req, res, 400, {
            error: 'Users: role_id must be a number',
          });
        }
        updates.push(`role_id = $${placeholderIndex++}`);
        values.push(roleIdValue);
      }
      if (status_id !== undefined) {
        if (status_id === '' || status_id === null) {
          return sendJson(req, res, 400, {
            error: 'Users: status_id must be a number',
          });
        }
        const statusIdValue = Number(status_id);
        if (!Number.isFinite(statusIdValue)) {
          return sendJson(req, res, 400, {
            error: 'Users: status_id must be a number',
          });
        }
        updates.push(`status_id = $${placeholderIndex++}`);
        values.push(statusIdValue);
      }

      if (updates.length === 0) {
        return sendJson(req, res, 400, { error: 'No fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${placeholderIndex}
        RETURNING id, name, email, role_id, status_id;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'User not found' });
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

      await sql`DELETE FROM users WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
