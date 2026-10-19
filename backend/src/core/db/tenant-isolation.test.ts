import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { pool, queryForCustomer } from './pool';

interface CustomerRow {
  id: string;
}
interface TruckRow {
  id: string;
  truck_number: string;
}

let customerA: string;
let customerB: string;
let projectA: string;
let fleetA: string;

describe('tenant isolation (app-level scoping, Review Decisions #3)', () => {
  beforeAll(async () => {
    const [a] = await pool
      .query<CustomerRow>("INSERT INTO customers (name) VALUES ('Customer A') RETURNING id")
      .then((r) => r.rows);
    const [b] = await pool
      .query<CustomerRow>("INSERT INTO customers (name) VALUES ('Customer B') RETURNING id")
      .then((r) => r.rows);
    customerA = a.id;
    customerB = b.id;

    const [proj] = await pool
      .query<{ id: string }>('INSERT INTO projects (customer_id, name) VALUES ($1, $2) RETURNING id', [
        customerA,
        'Project A',
      ])
      .then((r) => r.rows);
    projectA = proj.id;

    const [fleet] = await pool
      .query<{ id: string }>('INSERT INTO fleets (customer_id, project_id, name) VALUES ($1, $2, $3) RETURNING id', [
        customerA,
        projectA,
        'Fleet A',
      ])
      .then((r) => r.rows);
    fleetA = fleet.id;

    await pool.query('INSERT INTO trucks (customer_id, fleet_id, truck_number) VALUES ($1, $2, $3)', [
      customerA,
      fleetA,
      'DT-001',
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM trucks WHERE customer_id IN ($1, $2)', [customerA, customerB]);
    await pool.query('DELETE FROM fleets WHERE customer_id IN ($1, $2)', [customerA, customerB]);
    await pool.query('DELETE FROM projects WHERE customer_id IN ($1, $2)', [customerA, customerB]);
    await pool.query('DELETE FROM customers WHERE id IN ($1, $2)', [customerA, customerB]);
    // Not calling pool.end() here - `pool` is a shared module-level singleton
    // across test files; ending it here would break tests that run after this one.
  });

  test('customer A can see its own truck', async () => {
    const rows = await queryForCustomer<TruckRow>(
      customerA,
      'SELECT id, truck_number FROM trucks WHERE customer_id = $1',
    );
    expect(rows.length).toBe(1);
    expect(rows[0].truck_number).toBe('DT-001');
  });

  test('customer B cannot see customer A\'s truck - cross-tenant reads return empty', async () => {
    const rows = await queryForCustomer<TruckRow>(
      customerB,
      'SELECT id, truck_number FROM trucks WHERE customer_id = $1',
    );
    expect(rows.length).toBe(0);
  });

  test('queryForCustomer refuses to run without a customerId', async () => {
    await expect(queryForCustomer('', 'SELECT id FROM trucks WHERE customer_id = $1')).rejects.toThrow(
      'queryForCustomer requires a customerId',
    );
  });
});
