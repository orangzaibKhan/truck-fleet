import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { buildApp } from '../app';
import { pool } from '../core/db/pool';
import { hashPassword } from '../core/auth/password';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let customerId: string;
const email = 'test-auth@example.com';
const password = 'correct-horse-battery';

describe('auth routes', () => {
  beforeAll(async () => {
    app = await buildApp();
    const { rows } = await pool.query<{ id: string }>("INSERT INTO customers (name) VALUES ('Auth Test Co.') RETURNING id");
    customerId = rows[0].id;
    const passwordHash = await hashPassword(password);
    await pool.query('INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
      customerId,
      email,
      'customer_admin',
      passwordHash,
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await app.close();
    // Not calling pool.end() - `pool` is a shared module-level singleton across test files.
  });

  test('rejects a missing/invalid token on a protected route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/fleet-shift' });
    expect(res.statusCode).toBe(401);
  });

  test('rejects an unknown email without revealing it is unknown', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Invalid email or password' });
  });

  test('rejects a wrong password for a real user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('issues a token for correct credentials, usable on a protected route', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);
    const { token, user } = loginRes.json();
    expect(user.email).toBe(email);
    expect(user.role).toBe('customer_admin');

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.email).toBe(email);
  });

  test('a viewer cannot access admin-only user management', async () => {
    const viewerHash = await hashPassword('viewer-pass-123');
    await pool.query('INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
      customerId,
      'viewer-test@example.com',
      'viewer',
      viewerHash,
    ]);
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'viewer-test@example.com', password: 'viewer-pass-123' },
    });
    const { token } = loginRes.json();

    const usersRes = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(usersRes.statusCode).toBe(403);
  });
});
