import * as fs from 'node:fs';
import * as path from 'node:path';

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

const excludedRoutes = new Set(['routes']);

export function listRoutes(): RouteMeta[] {
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
    .filter(({ name }) => !excludedRoutes.has(name))
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
