import { DatabaseSync } from 'node:sqlite';
import { config as loadEnv } from 'dotenv';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Anchored to process.cwd() (the app's own root when run via `node dist/server.js`
// or `bun run src/server.ts` from backend/), not __dirname/import.meta.url depth -
// that broke once esbuild bundled this file from src/core/db/pool.ts into a
// flat dist/server.js (the relative depth to reach .env no longer matched).
// Dev monorepo layout keeps .env one level up (D:\Claude\.env, shared with the
// frontend); a deployed copy is expected to have its own .env in the app root.
const envCandidates = [join(process.cwd(), '.env'), join(process.cwd(), '..', '.env')];
const envPath = envCandidates.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

// SQLite instead of Postgres - Hostinger's shared/Business/Cloud plans don't
// support PostgreSQL (needs a VPS); a single file needs no DB server at all,
// which is what makes this deployable there. node:sqlite (built into Node
// 22+, and into Bun) needs no native compilation, unlike better-sqlite3 -
// confirmed working under both runtimes before choosing this.
const databaseFile = process.env.DATABASE_FILE ?? join(process.cwd(), 'data', 'app.db');
mkdirSync(dirname(databaseFile), { recursive: true });

const db = new DatabaseSync(databaseFile);
// journal_mode=MEMORY - the default rollback-journal mode still creates and
// deletes a sidecar file on disk, which hits a file-locking quirk specific to
// this D:\Claude dev environment (same symptom hit rm/mv/sed all session, and
// WAL mode's sidecar files, earlier). MEMORY keeps the journal off disk
// entirely. Fine for a single-process app at this scale; Hostinger deployment
// should re-check whether WAL (better for concurrent reads) works there instead.
db.exec('PRAGMA journal_mode = MEMORY');
db.exec('PRAGMA foreign_keys = ON');

interface QueryResult<T> {
  rows: T[];
}

/**
 * pg-compatible query shape (`{ rows }`, `$1/$2/...` placeholders) so every
 * route file and test written against the old Postgres pool works unchanged.
 * SQLite's placeholders are positional `?`, in the same left-to-right order
 * our queries already pass params in, so translating `$N` -> `?` is exact -
 * confirmed no query reuses the same `$N` twice.
 */
export const pool = {
  async query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const sqliteText = text.replace(/\$\d+/g, '?');
    // .all() works uniformly for SELECT, plain INSERT/UPDATE/DELETE (returns
    // []), and INSERT...RETURNING (returns the returned rows) - verified
    // directly before relying on it.
    const rows = db.prepare(sqliteText).all(...(params as (string | number | null | bigint)[])) as T[];
    return { rows };
  },
  async end(): Promise<void> {
    db.close();
  },
  /** Runs multi-statement SQL (DDL) in one call - migrate.ts only. db.query().all() handles one statement at a time. */
  async exec(sql: string): Promise<void> {
    db.exec(sql);
  },
};

/**
 * Every tenant-scoped query must go through this helper. App-level filtering
 * (not Postgres RLS) per Review Decisions #3: RLS needs a trustworthy
 * per-request tenant signal, which normally comes from real auth - deferred
 * per Review Decisions #1. The predicate here is identical to what an RLS
 * policy would enforce, so upgrading later is not a rewrite.
 *
 * `text` must reference the tenant filter as `customer_id = $1`; any
 * additional query params start at $2.
 */
export async function queryForCustomer<T = unknown>(
  customerId: string,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!customerId) {
    throw new Error('queryForCustomer requires a customerId - this is the one guard that must never be skipped.');
  }
  const result = await pool.query<T>(text, [customerId, ...params]);
  return result.rows;
}
