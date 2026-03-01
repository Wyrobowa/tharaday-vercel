type HeaderValue = string | number | readonly string[];

export type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  setHeader(name: string, value: HeaderValue): void;
  statusCode: number;
  end(chunk?: string): void;
};

function parseAllowedOrigins(value?: string) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedOrigin(req: ApiRequest) {
  const allowed = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  if (allowed.length === 0) {
    return '*';
  }

  const requestOrigin = req.headers?.origin;
  const normalizedOrigin = Array.isArray(requestOrigin)
    ? requestOrigin[0]
    : requestOrigin;

  if (normalizedOrigin && allowed.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return allowed[0];
}

export function setCors(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'OPTIONS') {
    return false;
  }
  setCors(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

export function sendJson(
  req: ApiRequest,
  res: ApiResponse,
  status: number,
  data: unknown,
) {
  setCors(req, res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function sendNoContent(req: ApiRequest, res: ApiResponse) {
  setCors(req, res);
  res.statusCode = 204;
  res.end();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readJsonBody(req: ApiRequest): Record<string, unknown> {
  if (isRecord(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}
