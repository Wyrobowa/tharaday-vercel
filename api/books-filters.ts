/**
 * @description List global filter options for books.
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
    const [typesRows, statusesRows, prioritiesRows, authorsRows] =
      await Promise.all([
        sql`
          SELECT name
          FROM tags
          WHERE is_active = true
          ORDER BY name;
        `,
        sql`
          SELECT name
          FROM statuses
          WHERE is_active = true
            AND LOWER(name) <> 'removed'
          ORDER BY name;
        `,
        sql`
          SELECT name
          FROM priorities
          WHERE is_active = true
          ORDER BY name;
        `,
        sql`
          SELECT DISTINCT CONCAT_WS(' ', a.first_name, a.last_name) AS name
          FROM books b
          LEFT JOIN statuses s ON s.id = b.status_id
          JOIN authors a ON a.id = b.author_id
          WHERE (s.name IS NULL OR LOWER(s.name) <> 'removed')
          ORDER BY name;
        `,
      ]);

    const types = typesRows
      .map((row) => String(row.name || '').trim())
      .filter(Boolean);
    const statuses = statusesRows
      .map((row) => String(row.name || '').trim())
      .filter(Boolean);
    const priorities = prioritiesRows
      .map((row) => String(row.name || '').trim())
      .filter(Boolean);
    const authors = authorsRows
      .map((row) => String(row.name || '').trim())
      .filter(Boolean);

    return sendJson(req, res, 200, {
      types,
      statuses,
      priorities,
      authors,
    });
  } catch (err) {
    return sendDbError(req, res, err);
  }
}
