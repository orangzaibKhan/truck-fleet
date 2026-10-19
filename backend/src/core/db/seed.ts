import { pool } from './pool';
import { hashPassword } from '../auth/password';

/**
 * One-time bootstrap for the demo customer the friend will log in as.
 * Idempotent: safe to re-run (skips if the demo customer already exists).
 * Exported so server.ts can run it on boot without closing the shared pool.
 */
export async function runSeed(): Promise<void> {
  const existing = await pool.query<{ id: string }>("SELECT id FROM customers WHERE name = 'Demo Fleet Co.'");
  if (existing.rows.length > 0) {
    console.log('Demo customer already seeded - skipping. Delete it manually first to reseed.');
    return;
  }

  const { rows: customerRows } = await pool.query<{ id: string }>(
    "INSERT INTO customers (name) VALUES ('Demo Fleet Co.') RETURNING id",
  );
  const customerId = customerRows[0].id;

  const { rows: projectRows } = await pool.query<{ id: string }>(
    'INSERT INTO projects (customer_id, name) VALUES ($1, $2) RETURNING id',
    [customerId, 'Riyadh Site'],
  );
  const projectId = projectRows[0].id;

  const { rows: fleetRows } = await pool.query<{ id: string }>(
    'INSERT INTO fleets (customer_id, project_id, name) VALUES ($1, $2, $3) RETURNING id',
    [customerId, projectId, 'Main Fleet'],
  );
  const fleetId = fleetRows[0].id;

  for (const truckNumber of ['DT-001', 'DT-002', 'DT-003']) {
    await pool.query('INSERT INTO trucks (customer_id, fleet_id, truck_number) VALUES ($1, $2, $3)', [
      customerId,
      fleetId,
      truckNumber,
    ]);
  }

  const email = 'friend@demo.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe-' + Math.random().toString(36).slice(2, 10);
  const passwordHash = await hashPassword(password);
  await pool.query('INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
    customerId,
    email,
    'customer_admin',
    passwordHash,
  ]);

  console.log('Seeded demo customer, 3 trucks, and 1 admin user.');
  console.log(`Login: ${email} / ${password}`);
  console.log('(Password generated for this seed run - change it after first login, or set SEED_ADMIN_PASSWORD next time.)');
}

// CLI entrypoint (bun run / node dist/seed.js) - closes the pool after running,
// unlike runSeed() itself, which server.ts calls on boot and must not close.
if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
