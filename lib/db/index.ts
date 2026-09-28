// Bhoomisetu — Database Connection
// SQLite locally, PostgreSQL in production (behind DatabaseAdapter interface)

import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sqliteSchema from './schema';
import * as pgSchema from './schema.pg';
import path from 'path';
import fs from 'fs';

const rawUrl = process.env.DATABASE_URL || '';
export const isPostgres = rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://');

// SQLite connection (default / local fallback)
const DB_PATH = (!isPostgres && rawUrl) ? rawUrl : path.join(process.cwd(), 'data', 'bhoomisetu.db');

let sqliteInstance: Database.Database | null = null;
let pgPoolInstance: Pool | null = null;

if (isPostgres) {
  pgPoolInstance = new Pool({
    connectionString: rawUrl,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
} else {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  sqliteInstance = new Database(DB_PATH);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');
}

// Export raw connections
export const rawDb = sqliteInstance;
export const pgPool = pgPoolInstance;

// Export Drizzle instances
export const db = isPostgres && pgPoolInstance
  ? (drizzlePg(pgPoolInstance, { schema: pgSchema }) as any)
  : (drizzleSqlite(sqliteInstance!, { schema: sqliteSchema }) as any);

export type DbType = typeof db;

export function getDatabase() {
  if (isPostgres && pgPoolInstance) {
    return { type: 'postgres' as const, pool: pgPoolInstance, drizzle: db };
  }
  return { type: 'sqlite' as const, sqlite: sqliteInstance!, drizzle: db };
}
