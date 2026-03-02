/**
 * @description Log in using email and password.
 * @methods POST
 */
import { ApiRequest, ApiResponse, handleOptions, readJsonBody, sendJson } from './_utils';
import { getSqlOrSendError, PostgresError, sendDbError } from './_handler';
import { createAuthToken, verifyPassword } from './_auth';

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
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return sendJson(req, res, 400, { error: 'email_and_password_required' });
    }

    const rows = await sql`
      SELECT id, name, email, role_id, status_id, password_hash
      FROM users
      WHERE lower(email) = ${email}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return sendJson(req, res, 401, { error: 'invalid_credentials' });
    }

    const user = rows[0] as {
      id: number;
      name: string;
      email: string;
      role_id: number | null;
      status_id: number | null;
      password_hash: string | null;
    };

    if (!user.password_hash) {
      return sendJson(req, res, 401, { error: 'invalid_credentials' });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return sendJson(req, res, 401, { error: 'invalid_credentials' });
    }

    await sql`
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ${user.id};
    `;

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

    return sendJson(req, res, 200, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        status_id: user.status_id,
      },
    });
  } catch (err) {
    const pgErr = err as PostgresError;
    if (pgErr.code === '42703') {
      return sendJson(req, res, 500, {
        error: 'missing_password_hash_column',
        message: 'Add password_hash column to users table',
      });
    }

    return sendDbError(req, res, err);
  }
}
