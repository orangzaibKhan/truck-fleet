import { pool } from './pool';
import { hashPassword } from '../auth/password';

/**
 * One-time bootstrap for the demo customer the friend will log in as, plus
 * the driver-app demo roster. Two independent idempotent steps (not one
 * early return) - the driver roster was added after the customer step had
 * already run in some deployments, so it must be able to backfill on its
 * own without re-running (or needing to delete) the customer/trucks/admin.
 * Exported so server.ts can run it on boot without closing the shared pool.
 */
export async function runSeed(): Promise<void> {
  const { customerId, fleetId, truckIds } = await seedDemoCustomer();
  await seedDemoDrivers(customerId, fleetId, truckIds);
  await seedWorkshopDemoData(customerId, truckIds);
}

async function seedDemoCustomer(): Promise<{ customerId: string; fleetId: string; truckIds: Record<string, string> }> {
  const existing = await pool.query<{ id: string }>("SELECT id FROM customers WHERE name = 'Demo Fleet Co.'");
  if (existing.rows.length > 0) {
    const customerId = existing.rows[0].id;
    const { rows: fleetRows } = await pool.query<{ id: string }>(
      'SELECT id FROM fleets WHERE customer_id = $1 ORDER BY created_at LIMIT 1',
      [customerId],
    );
    const fleetId = fleetRows[0].id;
    const { rows: truckRows } = await pool.query<{ id: string; truck_number: string }>(
      'SELECT id, truck_number FROM trucks WHERE customer_id = $1',
      [customerId],
    );
    const truckIds = Object.fromEntries(truckRows.map((t) => [t.truck_number, t.id]));
    console.log('Demo customer already seeded - skipping. Delete it manually first to reseed.');
    return { customerId, fleetId, truckIds };
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

  const truckIds: Record<string, string> = {};
  for (const truckNumber of ['DT-001', 'DT-002', 'DT-003']) {
    const { rows } = await pool.query<{ id: string }>(
      'INSERT INTO trucks (customer_id, fleet_id, truck_number) VALUES ($1, $2, $3) RETURNING id',
      [customerId, fleetId, truckNumber],
    );
    truckIds[truckNumber] = rows[0].id;
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
  console.log(`Admin login: ${email} / ${password}`);
  console.log('(Password generated for this seed run - change it after first login, or set SEED_ADMIN_PASSWORD next time.)');

  return { customerId, fleetId, truckIds };
}

/**
 * Driver-app demo roster, one driver per seeded truck. Same names as the
 * leaderboard design's sample data, so the driver and admin dashboards
 * reference the same people. EMP-001 (Ahmed) is the one meant to sign into
 * the driver app for a demo; the other two exist so the leaderboard isn't a
 * leaderboard of one. Skips if any driver already has an employee_id for
 * this customer - independent of whether the customer step above ran.
 */
async function seedDemoDrivers(customerId: string, fleetId: string, truckIds: Record<string, string>): Promise<void> {
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM drivers WHERE customer_id = $1 AND employee_id IS NOT NULL',
    [customerId],
  );
  if (existing.rows.length > 0) {
    console.log('Demo drivers already seeded - skipping.');
    return;
  }

  const driverPassword = process.env.SEED_DRIVER_PASSWORD ?? 'Driver-' + Math.random().toString(36).slice(2, 8);
  const driverPasswordHash = await hashPassword(driverPassword);
  const driverRoster = [
    { employeeId: 'EMP-001', name: 'Ahmed Al-Fahad', truck: 'DT-001' },
    { employeeId: 'EMP-002', name: 'Sara Al-Zahrani', truck: 'DT-002' },
    { employeeId: 'EMP-003', name: 'Mohammed Al-Harbi', truck: 'DT-003' },
  ];
  for (const d of driverRoster) {
    await pool.query(
      'INSERT INTO drivers (customer_id, fleet_id, name, employee_id, password_hash, truck_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, fleetId, d.name, d.employeeId, driverPasswordHash, truckIds[d.truck]],
    );
  }

  console.log('Seeded 3 demo drivers.');
  console.log(`Driver login (any of EMP-001 / EMP-002 / EMP-003): ${driverPassword}`);
  console.log('(Password generated for this seed run - change it after first login, or set SEED_DRIVER_PASSWORD next time.)');
}

/**
 * Workshop & Parts demo data for DT-001 (Ahmed's truck) - gives the driver
 * app something real to show on the Workshop tab: a scheduled service, one
 * open ticket mid-pipeline with mixed-status parts, and a couple of closed
 * service-history rows. Skips if workshop_tickets already has rows for this
 * customer - independent of whether the customer/driver seed steps ran.
 */
async function seedWorkshopDemoData(customerId: string, truckIds: Record<string, string>): Promise<void> {
  const existing = await pool.query<{ id: string }>('SELECT id FROM workshop_tickets WHERE customer_id = $1', [
    customerId,
  ]);
  if (existing.rows.length > 0) {
    console.log('Demo workshop data already seeded - skipping.');
    return;
  }

  const truckId = truckIds['DT-001'];
  if (!truckId) {
    console.log('Demo workshop data skipped - DT-001 not found.');
    return;
  }

  const daysFromNow = (n: number): string => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

  await pool.query('UPDATE trucks SET next_service_type = $1, next_service_due = $2 WHERE id = $3', [
    'Oil Change & Filter',
    daysFromNow(3),
    truckId,
  ]);

  const { rows: ticketRows } = await pool.query<{ id: string }>(
    `INSERT INTO workshop_tickets (customer_id, truck_id, issue, status, opened_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [customerId, truckId, 'Hydraulic lift slow response', 'parts', daysFromNow(-2)],
  );
  const ticketId = ticketRows[0].id;

  const parts = [
    { name: 'Hydraulic Pump Seal Kit', status: 'intransit', eta: daysFromNow(1) },
    { name: 'Hydraulic Fluid 20L', status: 'arrived', eta: null },
    { name: 'Filter Cartridge', status: 'ordered', eta: daysFromNow(4) },
  ];
  for (const part of parts) {
    await pool.query('INSERT INTO workshop_parts (ticket_id, name, status, eta) VALUES ($1, $2, $3, $4)', [
      ticketId,
      part.name,
      part.status,
      part.eta,
    ]);
  }

  const history = [
    { serviceType: 'Brake Pad Replacement', cost: 1450, workshopName: 'Riyadh Truck Workshop', servicedAt: daysFromNow(-45) },
    { serviceType: 'Oil Change & Filter', cost: 620, workshopName: 'Riyadh Truck Workshop', servicedAt: daysFromNow(-95) },
    { serviceType: 'Tire Rotation', cost: 800, workshopName: 'Demo Fleet Co. Depot', servicedAt: daysFromNow(-140) },
  ];
  for (const h of history) {
    await pool.query(
      'INSERT INTO workshop_service_history (customer_id, truck_id, service_type, cost, workshop_name, serviced_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, truckId, h.serviceType, h.cost, h.workshopName, h.servicedAt],
    );
  }

  console.log('Seeded workshop demo data for DT-001: 1 open ticket (3 parts), 3 service history rows.');
}

// CLI entrypoint (bun run / node dist/seed.js) - closes the pool after running,
// unlike runSeed() itself, which server.ts calls on boot and must not close.
if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seed.cjs') || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
