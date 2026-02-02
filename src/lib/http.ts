function parseAllowedOrigins(value?: string) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedOrigin(req: any) {
  const allowed = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  if (allowed.length === 0) {
    return '*';
  }

  const requestOrigin = req?.headers?.origin;
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowed[0];
}

export function setCors(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req: any, res: any) {
  if (req.method !== 'OPTIONS') {
    return false;
  }
  setCors(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

export function sendJson(req: any, res: any, status: number, data: unknown) {
  setCors(req, res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function sendNoContent(req: any, res: any) {
  setCors(req, res);
  res.statusCode = 204;
  res.end();
}

export function readJsonBody(req: any) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}
