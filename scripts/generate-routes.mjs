import fs from 'node:fs';
import path from 'node:path';

const apiDir = path.join(process.cwd(), 'api');
const outFile = path.join(process.cwd(), 'public', 'routes.json');
const excluded = new Set(['routes']);

function parseRouteMeta(filePath) {
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

  let description;
  let methods;

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

  return { description, methods };
}

function listRoutes() {
  let entries = [];
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
    .filter(({ name }) => !excluded.has(name))
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

const routes = listRoutes();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ routes }, null, 2) + '\n');
