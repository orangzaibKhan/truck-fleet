import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { buildApp } from '../app';
import { pool } from '../core/db/pool';
import { hashPassword } from '../core/auth/password';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let customerId: string;
let fleetId: string;
let truckId: string;
let ticketId: string;
let driverWithTruckToken: string;
let driverNoTruckToken: string;

describe('driver-workshop routes', () => {
  beforeAll(async () => {
    app = await buildApp();
    const { rows: custRows } = await pool.query<{ id: string }>(
      "INSERT INTO customers (name) VALUES ('Driver Workshop Test Co.') RETURNING id",
    );
    customerId = custRows[0].id;
    const { rows: projRows } = await pool.query<{ id: string }>(
      'INSERT INTO projects (customer_id, name) VALUES ($1, $2) RETURNING id',
      [customerId, 'Test Project'],
    );
    const { rows: fleetRows } = await pool.query<{ id: string }>(
      'INSERT INTO fleets (customer_id, project_id, name) VALUES ($1, $2, $3) RETURNING id',
      [customerId, projRows[0].id, 'Test Fleet'],
    );
    fleetId = fleetRows[0].id;
    const { rows: truckRows } = await pool.query<{ id: string }>(
      'INSERT INTO trucks (customer_id, fleet_id, truck_number, next_service_type, next_service_due) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [customerId, fleetId, 'WS-TEST', 'Oil Change & Filter', '2026-11-01T00:00:00.000Z'],
    );
    truckId = truckRows[0].id;

    const passwordHash = await hashPassword('workshop-test-pass');
    const { rows: driverRows } = await pool.query<{ id: string }>(
      'INSERT INTO drivers (customer_id, fleet_id, name, employee_id, password_hash, truck_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [customerId, fleetId, 'Workshop Test Driver', 'EMP-WS-TEST', passwordHash, truckId],
    );
    const driverWithTruckId = driverRows[0].id;

    const { rows: noTruckDriverRows } = await pool.query<{ id: string }>(
      'INSERT INTO drivers (customer_id, fleet_id, name, employee_id, password_hash, truck_id) VALUES ($1, $2, $3, $4, $5, NULL) RETURNING id',
      [customerId, fleetId, 'No Truck Driver', 'EMP-WS-NOTRUCK', passwordHash],
    );
    void noTruckDriverRows;

    const loginWithTruck = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'EMP-WS-TEST', password: 'workshop-test-pass' },
    });
    driverWithTruckToken = loginWithTruck.json().token;

    const loginNoTruck = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'EMP-WS-NOTRUCK', password: 'workshop-test-pass' },
    });
    driverNoTruckToken = loginNoTruck.json().token;

    const { rows: ticketRows } = await pool.query<{ id: string }>(
      `INSERT INTO workshop_tickets (customer_id, truck_id, issue, status, opened_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [customerId, truckId, 'Hydraulic lift slow response', 'parts', '2026-10-20T00:00:00.000Z'],
    );
    ticketId = ticketRows[0].id;

    await pool.query('INSERT INTO workshop_parts (ticket_id, name, status, eta) VALUES ($1, $2, $3, $4)', [
      ticketId,
      'Hydraulic Pump Seal Kit',
      'intransit',
      '2026-10-24T00:00:00.000Z',
    ]);
    await pool.query('INSERT INTO workshop_parts (ticket_id, name, status, eta) VALUES ($1, $2, $3, $4)', [
      ticketId,
      'Hydraulic Fluid 20L',
      'arrived',
      null,
    ]);

    await pool.query(
      'INSERT INTO workshop_service_history (customer_id, truck_id, service_type, cost, workshop_name, serviced_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, truckId, 'Brake Pad Replacement', 1450, 'Riyadh Truck Workshop', '2026-09-01T00:00:00.000Z'],
    );
    await pool.query(
      'INSERT INTO workshop_service_history (customer_id, truck_id, service_type, cost, workshop_name, serviced_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerId, truckId, 'Oil Change & Filter', 620, 'Riyadh Truck Workshop', '2026-07-01T00:00:00.000Z'],
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM workshop_parts WHERE ticket_id = $1', [ticketId]);
    await pool.query('DELETE FROM workshop_tickets WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM workshop_service_history WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM drivers WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM trucks WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM fleets WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM projects WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await app.close();
  });

  test('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/driver/workshop' });
    expect(res.statusCode).toBe(401);
  });

  test('returns an all-null/empty shape when the driver has no truck assigned', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/driver/workshop',
      headers: { authorization: `Bearer ${driverNoTruckToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ truck: null, nextService: null, ticket: null, history: [] });
  });

  test('returns the truck, next service, open ticket with parts, and history, scoped to this customer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/driver/workshop',
      headers: { authorization: `Bearer ${driverWithTruckToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.truck).toEqual({ id: truckId, truckNumber: 'WS-TEST' });
    expect(body.nextService).toEqual({ type: 'Oil Change & Filter', dueDate: '2026-11-01T00:00:00.000Z' });

    expect(body.ticket.id).toBe(ticketId);
    expect(body.ticket.issue).toBe('Hydraulic lift slow response');
    expect(body.ticket.steps).toEqual(['diagnosis', 'parts', 'repair', 'ready']);
    expect(body.ticket.currentStepIndex).toBe(1);
    expect(body.ticket.parts).toHaveLength(2);
    expect(body.ticket.parts.map((p: { name: string }) => p.name).sort()).toEqual([
      'Hydraulic Fluid 20L',
      'Hydraulic Pump Seal Kit',
    ]);

    expect(body.history).toHaveLength(2);
    expect(body.history[0].serviceType).toBe('Brake Pad Replacement');
    expect(body.history[0].cost).toBe(1450);
    expect(body.history[1].serviceType).toBe('Oil Change & Filter');
  });

  test('a closed ticket for the truck is excluded from the response', async () => {
    const { rows: closedRows } = await pool.query<{ id: string }>(
      `INSERT INTO workshop_tickets (customer_id, truck_id, issue, status, opened_at, closed_at)
       VALUES ($1, $2, $3, 'closed', $4, $5) RETURNING id`,
      [customerId, truckId, 'Old resolved issue', '2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z'],
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/driver/workshop',
      headers: { authorization: `Bearer ${driverWithTruckToken}` },
    });
    expect(res.statusCode).toBe(200);
    // Still returns the one open ticket (status='parts'), not the closed one.
    expect(res.json().ticket.id).toBe(ticketId);

    await pool.query('DELETE FROM workshop_tickets WHERE id = $1', [closedRows[0].id]);
  });
});
