/**
 * @description Sign up with email and password.
 * @methods POST
 */
import { ApiRequest, ApiResponse, handleOptions, readJsonBody, sendJson } from './_utils';
import { getSqlOrSendError, PostgresError, sendDbError } from './_handler';
import { createAuthToken, hashPassword } from './_auth';

type LookupRow = {
  id: number;
};

async function resolveDefaultRoleId(sql: ReturnType<typeof getSqlOrSendError>) {
  const preferredRoleName = (process.env.SIGNUP_DEFAULT_ROLE_NAME || 'user').trim();

  const preferred = await sql`
    SELECT id
    FROM user_roles
    WHERE is_active = true
      AND lower(name) = lower(${preferredRoleName})
    ORDER BY id
    LIMIT 1;
  `;

  if (preferred.length > 0) {
    return (preferred[0] as LookupRow).id;
  }

  const fallback = await sql`
    SELECT id
    FROM user_roles
    WHERE is_active = true
    ORDER BY id
    LIMIT 1;
  `;

  return fallback.length > 0 ? (fallback[0] as LookupRow).id : null;
}

async function resolveDefaultStatusId(sql: ReturnType<typeof getSqlOrSendError>) {
  const preferredStatusName = (process.env.SIGNUP_DEFAULT_STATUS_NAME || 'active').trim();

  const preferred = await sql`
    SELECT id
    FROM statuses
    WHERE is_active = true
      AND lower(name) = lower(${preferredStatusName})
    ORDER BY id
    LIMIT 1;
  `;

  if (preferred.length > 0) {
    return (preferred[0] as LookupRow).id;
  }

  const fallback = await sql`
    SELECT id
    FROM statuses
    WHERE is_active = true
    ORDER BY id
    LIMIT 1;
  `;

  return fallback.length > 0 ? (fallback[0] as LookupRow).id : null;
}

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, { error: 'method_not_allowed' });
  }

  const sql = getSqlOrSendError(req, res);
  if (!sql) {
    return;
  }

  try {
    const body = readJsonBody(req);
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '').trim();

    if (!name || !email || !password) {
      return sendJson(req, res, 400, { error: 'name_email_password_required' });
    }

    const roleId = await resolveDefaultRoleId(sql);
    const statusId = await resolveDefaultStatusId(sql);

    if (!roleId || !statusId) {
      return sendJson(req, res, 500, {
        error: 'missing_signup_defaults',
        message: 'Missing active default role or status for signup',
      });
    }

    const passwordHash = await hashPassword(password);

    const rows = await sql`
      INSERT INTO users (name, email, role_id, status_id, password_hash, password_updated_at)
      VALUES (${name}, ${email}, ${roleId}, ${statusId}, ${passwordHash}, NOW())
      RETURNING id, name, email, role_id, status_id;
    `;

    const user = rows[0] as {
      id: number;
      name: string;
      email: string;
      role_id: number;
      status_id: number;
    };

    let token = '';
    try {
      token = createAuthToken({
        sub: String(user.id),
        email: user.email,
      });
    } catch (err) {
      if (String((err as Error)?.message) === 'missing_auth_jwt_secret') {
        return sendJson(req, res, 500, { error: 'missing_auth_jwt_secret' });
      }
      throw err;
    }

    return sendJson(req, res, 201, {
      token,
      user,
    });
  } catch (err) {
    const pgErr = err as PostgresError;

    if (pgErr.code === '23505') {
      return sendJson(req, res, 409, {
        error: 'duplicate',
        message: 'User already exists',
      });
    }

    if (pgErr.code === '23503') {
      return sendJson(req, res, 500, {
        error: 'missing_signup_defaults',
        message: 'Role or status lookup failed for signup',
      });
    }

    if (pgErr.code === '42703') {
      return sendJson(req, res, 500, {
        error: 'missing_password_hash_column',
        message: 'Add password_hash column to users table',
      });
    }

    return sendDbError(req, res, err);
  }
}
