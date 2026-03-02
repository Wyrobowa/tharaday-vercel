import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_SECONDS_DEFAULT = 60 * 60 * 24 * 7;

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return Buffer.from(padded, 'base64');
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;

  return [
    'scrypt',
    'default',
    'default',
    'default',
    salt,
    derived.toString('hex'),
  ].join('$');
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, , , , salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function createAuthToken(payload: Record<string, unknown>) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error('missing_auth_jwt_secret');
  }

  const ttlRaw = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? TOKEN_TTL_SECONDS_DEFAULT);
  const ttlSeconds = Number.isFinite(ttlRaw) && ttlRaw > 0 ? Math.floor(ttlRaw) : TOKEN_TTL_SECONDS_DEFAULT;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedBody = toBase64Url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;

  const signature = createHmac('sha256', secret).update(data).digest();
  return `${data}.${toBase64Url(signature)}`;
}

export function decodeAuthToken(token: string) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedBody}`;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(data).digest();
  const receivedSignature = fromBase64Url(encodedSignature);

  if (receivedSignature.length !== expectedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedBody).toString('utf8')) as {
      exp?: number;
      [key: string]: unknown;
    };

    if (typeof payload.exp !== 'number') {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
