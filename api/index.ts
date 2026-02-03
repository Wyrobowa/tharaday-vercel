import * as fs from 'node:fs';
import * as path from 'node:path';

import { handleOptions, setCors } from './_utils';

type RouteMeta = {
  path: string;
  description: string;
  methods: string[];
};

type ParsedMeta = {
  description?: string;
  methods?: string[];
};

function parseRouteMeta(filePath: string): ParsedMeta {
  let contents = '';
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {};
  }

  const jsdocMatch = contents.match(/\/\*\*([\s\S]*?)\*\//);
  if (!jsdocMatch) {
    return {};
  }

  const jsdoc = jsdocMatch[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  let description: string | undefined;
  let methods: string[] | undefined;

  for (const line of jsdoc) {
    const descMatch = line.match(/^@(description|desc)\s+(.+)$/i);
    if (descMatch) {
      description = descMatch[2].trim();
      continue;
    }

    const methodsMatch = line.match(/^@methods?\s+(.+)$/i);
    if (methodsMatch) {
      methods = methodsMatch[1]
        .split(/[,\s]+/)
        .map((method) => method.trim().toUpperCase())
        .filter(Boolean);
    }
  }

  return {
    description,
    methods,
  };
}

function listRoutes(): RouteMeta[] {
  const apiDir = path.join(process.cwd(), 'api');
  let entries: string[];

  try {
    entries = fs.readdirSync(apiDir);
  } catch {
    entries = [];
  }

  const files = entries.filter((file) => {
    const lower = file.toLowerCase();
    return (
      (lower.endsWith('.ts') || lower.endsWith('.js')) &&
      !lower.startsWith('_') &&
      !lower.startsWith('index.')
    );
  });

  return files
    .map((file) => ({
      file,
      name: file.replace(/\.(ts|js)$/i, ''),
      meta: parseRouteMeta(path.join(apiDir, file)),
    }))
    .map(({ name, meta }) => {
      const routePath = `/api/${name}`;
      return {
        path: routePath,
        description: meta.description ?? 'No description yet.',
        methods: meta.methods && meta.methods.length > 0 ? meta.methods : ['GET'],
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function renderHtml(routes: RouteMeta[]) {
  const listItems = routes
    .map((route) => {
      const methods = route.methods.join(', ');
      return `<li><strong>${methods}</strong> <a href="${route.path}">${route.path}</a> — ${route.description}</li>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tharaday API</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        background: #f7f7fb;
        color: #1c1c1c;
      }
      .wrap {
        max-width: 820px;
        margin: 40px auto;
        padding: 24px;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 24px;
      }
      p {
        margin: 0 0 16px 0;
        color: #475569;
      }
      ul {
        padding-left: 18px;
        margin: 0;
      }
      li {
        margin: 6px 0;
      }
      a {
        color: #2563eb;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .status {
        display: inline-block;
        margin-top: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #1e293b;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Tharaday API</h1>
        <p>Backend for the Tharaday webapp. Use the endpoints below.</p>
        <div class="status">Try: <a href="/api/health">/api/health</a></div>
        <h2>Endpoints</h2>
        <ul>${listItems}</ul>
      </div>
    </div>
  </body>
</html>`;
}

// noinspection JSUnusedGlobalSymbols
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    setCors(req, res);
    res.statusCode = 405;
    res.end('method_not_allowed');
    return;
  }

  const routes = listRoutes();
  const html = renderHtml(routes);

  setCors(req, res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}
