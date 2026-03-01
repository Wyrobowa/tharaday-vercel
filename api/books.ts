/**
 * @description books CRUD.
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
import {
  getQueryId,
  getSqlOrSendError,
  PostgresError,
  sendDbError,
} from './_handler';

type BooksSort =
  | 'newest'
  | 'title_asc'
  | 'title_desc'
  | 'author_asc'
  | 'author_desc';

type CursorPayload = {
  id: number;
  title?: string;
  author_first_name?: string;
  author_last_name?: string;
};

function getQueryParam(req: ApiRequest, key: string) {
  const value = req.query?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getQueryNumber(req: ApiRequest, key: string) {
  const value = getQueryParam(req, key);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeCursor(rawCursor: string | undefined) {
  if (!rawCursor) {
    return null;
  }

  try {
    const json = Buffer.from(rawCursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as CursorPayload;
    return parsed;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: CursorPayload) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function getSortConfig(sort: BooksSort) {
  if (sort === 'title_asc') {
    return {
      orderBy: 'i.title ASC, i.id ASC',
      cursorWhere:
        '(i.title > $%1$d OR (i.title = $%1$d AND i.id > $%2$d))',
    };
  }

  if (sort === 'title_desc') {
    return {
      orderBy: 'i.title DESC, i.id DESC',
      cursorWhere:
        '(i.title < $%1$d OR (i.title = $%1$d AND i.id < $%2$d))',
    };
  }

  if (sort === 'author_asc') {
    return {
      orderBy:
        "COALESCE(a.last_name, '') ASC, COALESCE(a.first_name, '') ASC, i.id ASC",
      cursorWhere:
        "(COALESCE(a.last_name, '') > $%1$d OR (COALESCE(a.last_name, '') = $%1$d AND COALESCE(a.first_name, '') > $%2$d) OR (COALESCE(a.last_name, '') = $%1$d AND COALESCE(a.first_name, '') = $%2$d AND i.id > $%3$d))",
    };
  }

  if (sort === 'author_desc') {
    return {
      orderBy:
        "COALESCE(a.last_name, '') DESC, COALESCE(a.first_name, '') DESC, i.id DESC",
      cursorWhere:
        "(COALESCE(a.last_name, '') < $%1$d OR (COALESCE(a.last_name, '') = $%1$d AND COALESCE(a.first_name, '') < $%2$d) OR (COALESCE(a.last_name, '') = $%1$d AND COALESCE(a.first_name, '') = $%2$d AND i.id < $%3$d))",
    };
  }

  return {
    orderBy: 'i.id DESC',
    cursorWhere: 'i.id < $%1$d',
  };
}

function hasQueryParam(req: ApiRequest, key: string) {
  return getQueryParam(req, key) !== undefined;
}

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
      const hasPagingOrFiltering = [
        'id',
        'limit',
        'cursor',
        'q',
        'type',
        'status',
        'priority',
        'author',
        'sort',
      ].some((key) => hasQueryParam(req, key));

      if (!hasPagingOrFiltering) {
        const books = await sql`
          SELECT
            i.id,
            i.title,
            i.description,
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
      }

      const id = getQueryNumber(req, 'id');
      const q = (getQueryParam(req, 'q') || '').trim();
      const type = (getQueryParam(req, 'type') || '').trim();
      const status = (getQueryParam(req, 'status') || '').trim();
      const priority = (getQueryParam(req, 'priority') || '').trim();
      const author = (getQueryParam(req, 'author') || '').trim();
      const sortQuery = (getQueryParam(req, 'sort') || 'newest').trim();
      const sort: BooksSort = [
        'newest',
        'title_asc',
        'title_desc',
        'author_asc',
        'author_desc',
      ].includes(sortQuery)
        ? (sortQuery as BooksSort)
        : 'newest';

      const limitQuery = getQueryNumber(req, 'limit');
      const limit = Math.max(
        1,
        Math.min(100, limitQuery === null ? 24 : Math.floor(limitQuery)),
      );

      const cursorRaw = getQueryParam(req, 'cursor');
      const cursor = decodeCursor(cursorRaw);
      if (cursorRaw && !cursor) {
        return sendJson(req, res, 400, { error: 'invalid_cursor' });
      }

      const values: unknown[] = [];
      const where: string[] = [];

      if (id !== null) {
        values.push(id);
        where.push(`i.id = $${values.length}`);
      }

      if (q) {
        values.push(`%${q}%`);
        where.push(
          `(i.title ILIKE $${values.length} OR COALESCE(i.description, '') ILIKE $${values.length} OR CONCAT_WS(' ', a.first_name, a.last_name) ILIKE $${values.length} OR COALESCE(pub.name, '') ILIKE $${values.length})`,
        );
      }

      if (type) {
        values.push(type);
        where.push(`it.name = $${values.length}`);
      }
      if (status) {
        values.push(status);
        where.push(`s.name = $${values.length}`);
      }
      if (priority) {
        values.push(priority);
        where.push(`p.name = $${values.length}`);
      }
      if (author) {
        values.push(author);
        where.push(`CONCAT_WS(' ', a.first_name, a.last_name) = $${values.length}`);
      }

      const sortConfig = getSortConfig(sort);
      if (cursor) {
        if (sort === 'newest') {
          values.push(cursor.id);
          where.push(sortConfig.cursorWhere.replace('%1$d', String(values.length)));
        } else if (sort === 'title_asc' || sort === 'title_desc') {
          values.push(cursor.title || '');
          const titleParamIndex = values.length;
          values.push(cursor.id);
          const idParamIndex = values.length;
          where.push(
            sortConfig.cursorWhere
              .replace('%1$d', String(titleParamIndex))
              .replace('%2$d', String(idParamIndex)),
          );
        } else {
          values.push(cursor.author_last_name || '');
          const lastNameParamIndex = values.length;
          values.push(cursor.author_first_name || '');
          const firstNameParamIndex = values.length;
          values.push(cursor.id);
          const idParamIndex = values.length;
          where.push(
            sortConfig.cursorWhere
              .replace('%1$d', String(lastNameParamIndex))
              .replace('%2$d', String(firstNameParamIndex))
              .replace('%3$d', String(idParamIndex)),
          );
        }
      }

      values.push(limit + 1);
      const limitParamIndex = values.length;

      const query = `
        SELECT
          i.id,
          i.title,
          i.description,
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
        ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY ${sortConfig.orderBy}
        LIMIT $${limitParamIndex};
      `;

      const rows = await sql.query(query, values);
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      let nextCursor: string | null = null;
      if (hasMore && items.length > 0) {
        const lastItem = items[items.length - 1] as Record<string, unknown>;
        const cursorPayload: CursorPayload = {
          id: Number(lastItem.id),
        };

        if (sort === 'title_asc' || sort === 'title_desc') {
          cursorPayload.title = String(lastItem.title || '');
        }

        if (sort === 'author_asc' || sort === 'author_desc') {
          cursorPayload.author_first_name = String(lastItem.author_first_name || '');
          cursorPayload.author_last_name = String(lastItem.author_last_name || '');
        }

        nextCursor = encodeCursor(cursorPayload);
      }

      return sendJson(req, res, 200, {
        items,
        hasMore,
        nextCursor,
      });
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = readJsonBody(req);

      const title = String(body.title ?? '').trim();
      const descriptionRaw = body.description;
      const description =
        descriptionRaw === null || descriptionRaw === undefined
          ? null
          : String(descriptionRaw).trim();
      const descriptionValue = description === '' ? null : description;
      const typeId = body.tag_id ? Number(body.tag_id) : null;
      const statusId = body.status_id ? Number(body.status_id) : null;
      const priorityId = body.priority_id ? Number(body.priority_id) : null;
      const authorId = body.author_id ? Number(body.author_id) : null;
      const publisherId = body.publisher_id ? Number(body.publisher_id) : null;
      const pagesValue =
        body.pages === null || body.pages === undefined || body.pages === ''
          ? null
          : Number(body.pages);

      if (!title) {
        return sendJson(req, res, 400, { error: 'books: title required' });
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
        INSERT INTO books (title, description, tag_id, status_id, priority_id, author_id, publisher_id, pages)
        VALUES (${title}, ${descriptionValue}, ${typeId}, ${statusId}, ${priorityId}, ${authorId}, ${publisherId}, ${pagesValue})
        RETURNING id, title, description, tag_id, status_id, priority_id, author_id, publisher_id, pages;
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
      const {
        id,
        title,
        description,
        tag_id,
        status_id,
        priority_id,
        author_id,
        publisher_id,
        pages,
      } = body;

      if (!id) {
        return sendJson(req, res, 400, { error: 'id required' });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let placeholderIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${placeholderIndex++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${placeholderIndex++}`);
        values.push(
          description === '' || description === null ? null : String(description),
        );
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
        RETURNING id, title, description, tag_id, status_id, priority_id, author_id, publisher_id, pages;
      `;

      const rows = await sql.query(query, values);

      if (rows.length === 0) {
        return sendJson(req, res, 404, { error: 'Book not found' });
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

      await sql`DELETE FROM books WHERE id = ${idValue}`;

      return sendNoContent(req, res);
    } catch (err) {
      return sendDbError(req, res, err);
    }
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}
