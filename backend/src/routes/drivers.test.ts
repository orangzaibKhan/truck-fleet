import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { buildApp } from '../app';
import { pool } from '../core/db/pool';
import { hashPassword } from '../core/auth/password';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let customerId: string;
let token: string;

describe('driver routes', () => {
  beforeAll(async () => {
    app = await buildApp();
    const { rows: custRows } = await pool.query<{ id: string }>(
      "INSERT INTO customers (name) VALUES ('Driver Test Co.') RETURNING id",
    );
    customerId = custRows[0].id;
    const { rows: projRows } = await pool.query<{ id: string }>(
      'INSERT INTO projects (customer_id, name) VALUES ($1, $2) RETURNING id',
      [customerId, 'Test Project'],
    );
    await pool.query('INSERT INTO fleets (customer_id, project_id, name) VALUES ($1, $2, $3)', [
      customerId,
      projRows[0].id,
      'Test Fleet',
    ]);

    const passwordHash = await hashPassword('driver-test-pass');
    await pool.query('INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
      customerId,
      'driver-test@example.com',
      'fleet_manager',
      passwordHash,
    ]);
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'driver-test@example.com', password: 'driver-test-pass' },
    });
    token = loginRes.json().token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM drivers WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM users WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM fleets WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM projects WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await app.close();
  });

  test('starts with an empty driver list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/drivers', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().drivers).toEqual([]);
  });

  test('creates a driver and then lists it', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/drivers',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmed Al-Rashid' },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().driver.name).toBe('Ahmed Al-Rashid');

    const listRes = await app.inject({ method: 'GET', url: '/api/drivers', headers: { authorization: `Bearer ${token}` } });
    expect(listRes.json().drivers).toHaveLength(1);
  });

  test('rejects an empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/drivers',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '  ' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/drivers' });
    expect(res.statusCode).toBe(401);
  });
});

describe('password change', () => {
  let pwApp: FastifyInstance;
  let pwCustomerId: string;
  let pwToken: string;

  beforeAll(async () => {
    pwApp = await buildApp();
    const { rows } = await pool.query<{ id: string }>(
      "INSERT INTO customers (name) VALUES ('Password Test Co.') RETURNING id",
    );
    pwCustomerId = rows[0].id;
    const passwordHash = await hashPassword('original-pass-123');
    await pool.query('INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
      pwCustomerId,
      'pwtest@example.com',
      'viewer',
      passwordHash,
    ]);
    const loginRes = await pwApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'pwtest@example.com', password: 'original-pass-123' },
    });
    pwToken = loginRes.json().token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE customer_id = $1', [pwCustomerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [pwCustomerId]);
    await pwApp.close();
  });

  test('rejects the wrong current password', async () => {
    const res = await pwApp.inject({
      method: 'PUT',
      url: '/api/auth/password',
      headers: { authorization: `Bearer ${pwToken}` },
      payload: { currentPassword: 'wrong', newPassword: 'new-password-123' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('rejects a too-short new password', async () => {
    const res = await pwApp.inject({
      method: 'PUT',
      url: '/api/auth/password',
      headers: { authorization: `Bearer ${pwToken}` },
      payload: { currentPassword: 'original-pass-123', newPassword: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('changes the password and the old one stops working', async () => {
    const changeRes = await pwApp.inject({
      method: 'PUT',
      url: '/api/auth/password',
      headers: { authorization: `Bearer ${pwToken}` },
      payload: { currentPassword: 'original-pass-123', newPassword: 'brand-new-pass-456' },
    });
    expect(changeRes.statusCode).toBe(200);

    const oldLoginRes = await pwApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'pwtest@example.com', password: 'original-pass-123' },
    });
    expect(oldLoginRes.statusCode).toBe(401);

    const newLoginRes = await pwApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'pwtest@example.com', password: 'brand-new-pass-456' },
    });
    expect(newLoginRes.statusCode).toBe(200);
  });
});
