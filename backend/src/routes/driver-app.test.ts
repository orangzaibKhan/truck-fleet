import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { buildApp } from '../app';
import { pool } from '../core/db/pool';
import { hashPassword } from '../core/auth/password';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let customerId: string;
let truckId: string;
let driverId: string;
let token: string;

describe('driver-app routes', () => {
  beforeAll(async () => {
    app = await buildApp();
    const { rows: custRows } = await pool.query<{ id: string }>(
      "INSERT INTO customers (name) VALUES ('Driver App Test Co.') RETURNING id",
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
    const { rows: truckRows } = await pool.query<{ id: string }>(
      'INSERT INTO trucks (customer_id, fleet_id, truck_number) VALUES ($1, $2, $3) RETURNING id',
      [customerId, fleetRows[0].id, 'DT-TEST'],
    );
    truckId = truckRows[0].id;

    const passwordHash = await hashPassword('driver-app-test-pass');
    const { rows: driverRows } = await pool.query<{ id: string }>(
      'INSERT INTO drivers (customer_id, fleet_id, name, employee_id, password_hash, truck_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [customerId, fleetRows[0].id, 'Test Driver', 'EMP-TEST', passwordHash, truckId],
    );
    driverId = driverRows[0].id;

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'EMP-TEST', password: 'driver-app-test-pass' },
    });
    token = loginRes.json().token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM incident_reports WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM fuel_logs WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM driver_trips WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM inspections WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM shifts WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM drivers WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM trucks WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM fleets WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM projects WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await app.close();
  });

  test('rejects an unknown employee ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'EMP-NOPE', password: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('rejects the wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'EMP-TEST', password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('logs in and matches the employee ID case-insensitively', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/login',
      payload: { employeeId: 'emp-test', password: 'driver-app-test-pass' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().driver.name).toBe('Test Driver');
  });

  test('home requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/driver/home' });
    expect(res.statusCode).toBe(401);
  });

  test('home shows the assigned truck and no active shift initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/driver/home', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.truck.truckNumber).toBe('DT-TEST');
    expect(body.shiftActive).toBe(false);
  });

  test('cannot submit an inspection or start a trip without an active shift', async () => {
    const inspRes = await app.inject({
      method: 'POST',
      url: '/api/driver/inspection',
      headers: { authorization: `Bearer ${token}` },
      payload: { results: new Array(15).fill('pass') },
    });
    expect(inspRes.statusCode).toBe(409);

    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/driver/trip/start',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tripRes.statusCode).toBe(409);
  });

  test('starts a shift, then rejects starting a second one', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/driver/shift/start', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().shift.truck_id).toBe(truckId);

    const secondRes = await app.inject({ method: 'POST', url: '/api/driver/shift/start', headers: { authorization: `Bearer ${token}` } });
    expect(secondRes.statusCode).toBe(409);
  });

  test('submits a passing inspection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/inspection',
      headers: { authorization: `Bearer ${token}` },
      payload: { results: new Array(15).fill('pass') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().hasFail).toBe(false);
  });

  test('rejects an inspection with the wrong number of results', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/inspection',
      headers: { authorization: `Bearer ${token}` },
      payload: { results: ['pass', 'fail'] },
    });
    expect(res.statusCode).toBe(400);
  });

  test('runs a trip through all four stages to completion', async () => {
    const startRes = await app.inject({ method: 'POST', url: '/api/driver/trip/start', headers: { authorization: `Bearer ${token}` } });
    expect(startRes.statusCode).toBe(200);
    const tripId = startRes.json().trip.id;
    expect(startRes.json().trip.stage).toBe('loading');

    const stages = ['traveling', 'dumping', 'returning', 'completed'];
    for (const expected of stages) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/driver/trip/advance',
        headers: { authorization: `Bearer ${token}` },
        payload: { tripId, distanceKm: 3.8 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().stage).toBe(expected);
    }

    const pastEndRes = await app.inject({
      method: 'POST',
      url: '/api/driver/trip/advance',
      headers: { authorization: `Bearer ${token}` },
      payload: { tripId },
    });
    expect(pastEndRes.statusCode).toBe(409);
  });

  test('logs a fuel entry and computes the total cost', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/fuel',
      headers: { authorization: `Bearer ${token}` },
      payload: { liters: 100, pricePerLiter: 2.5, station: 'Station A - Main Depot', paymentMethod: 'Fleet Card' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().totalCost).toBe(250);
  });

  test('logs a breakdown report', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/incident',
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: 'breakdown', issueType: 'Tire', priority: 'High', description: 'Front-left low pressure' },
    });
    expect(res.statusCode).toBe(200);
  });

  test("today's history reflects the completed trip and fuel log", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/driver/history?period=today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.trips).toBe(1);
    expect(body.distanceKm).toBe(3.8);
  });

  test('ends the shift and docks the safety score for the logged incident', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/driver/shift/end',
      headers: { authorization: `Bearer ${token}` },
      payload: { truckCondition: 'clean_ready', fuelLevel: '3_4', notes: 'All good' },
    });
    expect(res.statusCode).toBe(200);
    // 100 - 0 (no failed inspection items) - 15 (one incident report) = 85.
    expect(res.json().safetyScore).toBe(85);

    const secondEndRes = await app.inject({
      method: 'POST',
      url: '/api/driver/shift/end',
      headers: { authorization: `Bearer ${token}` },
      payload: { truckCondition: 'clean_ready', fuelLevel: 'full' },
    });
    expect(secondEndRes.statusCode).toBe(409);
  });

  test('leaderboard ranks this driver using the ended shift score', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/driver/leaderboard?period=week',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const entry = res.json().leaderboard.find((r: { driverId: string }) => r.driverId === driverId);
    expect(entry).toBeDefined();
    expect(entry.score).toBe(85);
    expect(entry.isMe).toBe(true);
  });
});
