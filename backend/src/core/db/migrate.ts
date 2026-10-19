import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './pool';

const migrationsDirCandidates = [
  join(process.cwd(), 'db', 'migrations'),
  join(process.cwd(), '..', 'db', 'migrations'),
];
const migrationsDir = migrationsDirCandidates.find((p) => existsSync(p)) ?? migrationsDirCandidates[0];

/** Core logic, exported so server.ts can run it on boot without closing the shared pool. */
export async function runMigrations(): Promise<void> {
  await pool.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))",
  );
  const { rows: applied } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.map((r) => r.filename));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied).`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Applying ${file}...`);
    await pool.exec(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
  }
  console.log('Migrations complete.');
}

// CLI entrypoint (bun run / node dist/migrate.js) - closes the pool after running,
// unlike runMigrations() itself, which server.ts calls on boot and must not close.
if (process.argv[1]?.endsWith('migrate.js') || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
