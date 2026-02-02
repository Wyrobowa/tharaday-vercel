import { neon } from '@neondatabase/serverless';

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super('missing_database_url');
    this.name = 'MissingDatabaseUrlError';
  }
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new MissingDatabaseUrlError();
  }
  return neon(databaseUrl);
}
