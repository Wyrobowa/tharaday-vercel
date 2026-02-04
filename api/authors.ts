/**
 * @description Authors CRUD.
 * @methods GET, POST, PATCH, DELETE
 */
import { getSql, MissingDatabaseUrlError } from './_db';
import { handleOptions, readJsonBody, sendJson, sendNoContent } from './_utils';

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
      const authors = await sql`
        SELECT id, last_name, first_name, country
        FROM authors
        ORDER BY id DESC;
      `;

      return sendJson(req, res, 200, authors);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);
      const lastName = String(body.last_name ?? '').trim();
      const firstName = String(body.first_name ?? '').trim();
      const country = String(body.country ?? '').trim();

      const lastNameValue = lastName ? lastName : null;
      const firstNameValue = firstName ? firstName : null;
      const countryValue = country ? country : null;

      if (!lastNameValue && !firstNameValue && !countryValue) {
        return sendJson(req, res, 400, {
          error: 'authors: at least one field required',
        });
      }

      const rows = await sql`
        INSERT INTO authors (last_name, first_name, country)
        VALUES (${lastNameValue}, ${firstNameValue}, ${countryValue})
        RETURNING id, last_name, first_name, country;
      `;

      return sendJson(req, res, 201, rows[0]);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = readJsonBody(req);
      const { id, last_name, first_name, country } = body;

      if (!id) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let placeholderIndex = 1;

      if (last_name !== undefined) {
        updates.push(`last_name = $${placeholderIndex++}`);
        values.push(last_name === '' || last_name === null ? null : last_name);
      }
      if (first_name !== undefined) {
        updates.push(`first_name = $${placeholderIndex++}`);
        values.push(first_name === '' || first_name === null ? null : first_name);
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
        UPDATE authors
        SET ${updates.join(', ')}
        WHERE id = $${placeholderIndex}
        RETURNING id, last_name, first_name, country;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'Author not found' });
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

      await sql`DELETE FROM authors WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
