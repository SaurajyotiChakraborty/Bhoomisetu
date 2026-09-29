// Bhoomisetu — Universal Database Adapter (§6, §7.1)
// Connects to PostgreSQL (AWS RDS / Docker) when DATABASE_URL is set,
// or SQLite (data/bhoomisetu.db) locally. Zero setup, unified async API.

import { Pool, types } from 'pg';
import type { PoolClient } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const rawUrl = process.env.DATABASE_URL || '';
export const isPostgres = rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://');

const DB_PATH = (!isPostgres && rawUrl) ? rawUrl : path.join(process.cwd(), 'data', 'bhoomisetu.db');

// Set pg parsers so COUNT(*) and NUMERIC return as JavaScript numbers (same as SQLite)
types.setTypeParser(20, (val: string) => parseInt(val, 10));
types.setTypeParser(1700, (val: string) => parseFloat(val));

let sqliteInstance: Database.Database | null = null;
let pgPoolInstance: Pool | null = null;


if (isPostgres) {
  pgPoolInstance = new Pool({
    connectionString: rawUrl,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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

export const rawDb = sqliteInstance;
export const pgPool = pgPoolInstance;

// Helper to convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...'
export function toPgSql(sql: string): string {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

export interface RunResult {
  changes: number;
}

export interface PreparedStatement {
  get: <T = any>(...params: any[]) => Promise<T | undefined>;
  all: <T = any>(...params: any[]) => Promise<T[]>;
  run: (...params: any[]) => Promise<RunResult>;
}

export interface UniversalDb {
  isPostgres: boolean;
  query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  get: <T = any>(sql: string, params?: any[]) => Promise<T | undefined>;
  all: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  run: (sql: string, params?: any[]) => Promise<RunResult>;
  prepare: (sql: string) => PreparedStatement;
  transaction: <T>(fn: () => Promise<T> | T) => Promise<T>;
  pragma: (stmt: string) => void;
  close: () => void;
}

// Universal database client implementation
export const dbClient: UniversalDb = {
  isPostgres,

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if (isPostgres && pgPoolInstance) {
      const pgSql = toPgSql(sql);
      const res = await pgPoolInstance.query(pgSql, params);
      return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
    } else {
      const rows = sqliteInstance!.prepare(sql).all(...params) as T[];
      return { rows, rowCount: rows.length };
    }
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (isPostgres && pgPoolInstance) {
      const pgSql = toPgSql(sql);
      const res = await pgPoolInstance.query(pgSql, params);
      return res.rows[0] as T | undefined;
    } else {
      return sqliteInstance!.prepare(sql).get(...params) as T | undefined;
    }
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isPostgres && pgPoolInstance) {
      const pgSql = toPgSql(sql);
      const res = await pgPoolInstance.query(pgSql, params);
      return res.rows as T[];
    } else {
      return sqliteInstance!.prepare(sql).all(...params) as T[];
    }
  },

  async run(sql: string, params: any[] = []): Promise<RunResult> {
    if (isPostgres && pgPoolInstance) {
      const pgSql = toPgSql(sql);
      const res = await pgPoolInstance.query(pgSql, params);
      return { changes: res.rowCount || 0 };
    } else {
      const res = sqliteInstance!.prepare(sql).run(...params);
      return { changes: res.changes };
    }
  },

  prepare(sql: string): PreparedStatement {
    return {
      get: <T = any>(...params: any[]) => this.get<T>(sql, params),
      all: <T = any>(...params: any[]) => this.all<T>(sql, params),
      run: (...params: any[]) => this.run(sql, params),
    };
  },

  async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
    if (isPostgres && pgPoolInstance) {
      const client = await pgPoolInstance.connect();
      try {
        await client.query('BEGIN');
        const result = await fn();
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      return (sqliteInstance!.transaction(fn as any))();
    }
  },

  pragma(stmt: string): void {
    if (!isPostgres && sqliteInstance) {
      sqliteInstance.pragma(stmt);
    }
  },

  close(): void {
    // Keep connection pool / database instance alive for connection pooling
  },
};

export function getDb(): UniversalDb {
  return dbClient;
}

export default dbClient;
