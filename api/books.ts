/**
 * @description books CRUD.
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
      const books = await sql`
        SELECT
          i.id,
          i.name,
          i.tag_id,
          i.status_id,
          i.priority_id,
          i.author_id,
          i.publisher_id,
          i.pages,
          it.name AS type,
          s.name AS status,
          p.name AS priority,
          a.first_name AS author_first_name,
          a.last_name AS author_last_name,
          a.country AS author_country,
          pub.name AS publisher,
          pub.country AS publisher_country
        FROM books i
        LEFT JOIN tags it ON it.id = i.tag_id
        LEFT JOIN statuses s ON s.id = i.status_id
        LEFT JOIN priorities p ON p.id = i.priority_id
        LEFT JOIN authors a ON a.id = i.author_id
        LEFT JOIN publishers pub ON pub.id = i.publisher_id
        ORDER BY i.id DESC;
      `;

      return sendJson(req, res, 200, books);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);

      const name = String(body.name ?? '').trim();
      const typeId = body.tag_id ? Number(body.tag_id) : null;
      const statusId = body.status_id ? Number(body.status_id) : null;
      const priorityId = body.priority_id ? Number(body.priority_id) : null;
      const authorId = body.author_id ? Number(body.author_id) : null;
      const publisherId = body.publisher_id ? Number(body.publisher_id) : null;
      const pagesValue =
        body.pages === null || body.pages === undefined || body.pages === ''
          ? null
          : Number(body.pages);

      if (!name) {
        return sendJson(req, res, 400, { error: 'books: name required' });
      }
      if (typeId === null) {
        return sendJson(req, res, 400, { error: 'books: tag_id required' });
      }
      if (statusId === null) {
        return sendJson(req, res, 400, { error: 'books: status_id required' });
      }
      if (priorityId === null) {
        return sendJson(req, res, 400, { error: 'books: priority_id required' });
      }
      if (authorId === null) {
        return sendJson(req, res, 400, { error: 'books: author_id required' });
      }
      if (publisherId === null) {
        return sendJson(req, res, 400, { error: 'books: publisher_id required' });
      }
      if (!Number.isFinite(typeId)) {
        return sendJson(req, res, 400, { error: 'books: tag_id must be a number' });
      }
      if (!Number.isFinite(statusId)) {
        return sendJson(req, res, 400, {
          error: 'books: status_id must be a number',
        });
      }
      if (!Number.isFinite(priorityId)) {
        return sendJson(req, res, 400, {
          error: 'books: priority_id must be a number',
        });
      }
      if (!Number.isFinite(authorId)) {
        return sendJson(req, res, 400, {
          error: 'books: author_id must be a number',
        });
      }
      if (!Number.isFinite(publisherId)) {
        return sendJson(req, res, 400, {
          error: 'books: publisher_id must be a number',
        });
      }
      if (pagesValue !== null && !Number.isFinite(pagesValue)) {
        return sendJson(req, res, 400, { error: 'books: pages must be a number' });
      }

      const rows = await sql`
        INSERT INTO books (name, tag_id, status_id, priority_id, author_id, publisher_id, pages)
        VALUES (${name}, ${typeId}, ${statusId}, ${priorityId}, ${authorId}, ${publisherId}, ${pagesValue})
        RETURNING id, name, tag_id, status_id, priority_id, author_id, publisher_id, pages;
      `;

      return sendJson(req, res, 201, rows[0]);
    } catch (err) {
      const pgErr = err as PostgresError;
      if (pgErr.code === '23503') {
        return sendJson(req, res, 400, {
          error: 'invalid_fkey',
          message: 'Tag, status, priority, author, or publisher does not exist',
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
      const { id, name, tag_id, status_id, priority_id, author_id, publisher_id, pages } =
        body;

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
      if (tag_id !== undefined) {
        if (tag_id === '' || tag_id === null) {
          return sendJson(req, res, 400, {
            error: 'books: tag_id must be a number',
          });
        }
        const tagIdValue = Number(tag_id);
        if (!Number.isFinite(tagIdValue)) {
          return sendJson(req, res, 400, {
            error: 'books: tag_id must be a number',
          });
        }
        updates.push(`tag_id = $${placeholderIndex++}`);
        values.push(tagIdValue);
      }
      if (status_id !== undefined) {
        if (status_id === '' || status_id === null) {
          return sendJson(req, res, 400, {
            error: 'books: status_id must be a number',
          });
        }
        const statusIdValue = Number(status_id);
        if (!Number.isFinite(statusIdValue)) {
          return sendJson(req, res, 400, {
            error: 'books: status_id must be a number',
          });
        }
        updates.push(`status_id = $${placeholderIndex++}`);
        values.push(statusIdValue);
      }
      if (priority_id !== undefined) {
        if (priority_id === '' || priority_id === null) {
          return sendJson(req, res, 400, {
            error: 'books: priority_id must be a number',
          });
        }
        const priorityIdValue = Number(priority_id);
        if (!Number.isFinite(priorityIdValue)) {
          return sendJson(req, res, 400, {
            error: 'books: priority_id must be a number',
          });
        }
        updates.push(`priority_id = $${placeholderIndex++}`);
        values.push(priorityIdValue);
      }
      if (author_id !== undefined) {
        if (author_id === '' || author_id === null) {
          return sendJson(req, res, 400, {
            error: 'books: author_id must be a number',
          });
        }
        const authorIdValue = Number(author_id);
        if (!Number.isFinite(authorIdValue)) {
          return sendJson(req, res, 400, {
            error: 'books: author_id must be a number',
          });
        }
        updates.push(`author_id = $${placeholderIndex++}`);
        values.push(authorIdValue);
      }
      if (publisher_id !== undefined) {
        if (publisher_id === '' || publisher_id === null) {
          return sendJson(req, res, 400, {
            error: 'books: publisher_id must be a number',
          });
        }
        const publisherIdValue = Number(publisher_id);
        if (!Number.isFinite(publisherIdValue)) {
          return sendJson(req, res, 400, {
            error: 'books: publisher_id must be a number',
          });
        }
        updates.push(`publisher_id = $${placeholderIndex++}`);
        values.push(publisherIdValue);
      }
      if (pages !== undefined) {
        const pagesNumber =
          pages === '' || pages === null ? null : Number(pages);
        if (pagesNumber !== null && !Number.isFinite(pagesNumber)) {
          return sendJson(req, res, 400, {
            error: 'books: pages must be a number',
          });
        }
        updates.push(`pages = $${placeholderIndex++}`);
        values.push(pagesNumber);
      }

      if (updates.length === 0) {
        return sendJson(req, res, 400, { error: 'No fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE books
        SET ${updates.join(', ')}
        WHERE id = $${placeholderIndex}
        RETURNING id, name, tag_id, status_id, priority_id, author_id, publisher_id, pages;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'Book not found' });
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

      await sql`DELETE FROM books WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendJson(req, res, 500, { error: 'db_error', message: String(err) });
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
