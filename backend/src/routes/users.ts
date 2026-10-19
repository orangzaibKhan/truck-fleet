import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';
import { hashPassword } from '../core/auth/password';
import type { AuthUser } from '../core/auth/jwt-plugin';

interface UserRow {
  id: string;
  email: string;
  role: AuthUser['role'];
  created_at: string;
}

const ADMIN_ROLES: AuthUser['role'][] = ['super_admin', 'customer_admin'];
const VALID_ROLES: AuthUser['role'][] = ['super_admin', 'customer_admin', 'fleet_manager', 'viewer'];

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  // Admin-only, tenant-scoped (Review Decisions #3): an admin manages users
  // within their own customer_id, never across tenants.
  app.get('/api/users', { preHandler: app.requireRole(ADMIN_ROLES) }, async (request) => {
    const { customerId } = request.user as AuthUser;
    const { rows } = await pool.query<UserRow>(
      'SELECT id, email, role, created_at FROM users WHERE customer_id = $1 ORDER BY created_at',
      [customerId],
    );
    return { users: rows };
  });

  app.post<{ Body: { email: string; password: string; role: AuthUser['role'] } }>(
    '/api/users',
    { preHandler: app.requireRole(ADMIN_ROLES) },
    async (request, reply) => {
      const { customerId } = request.user as AuthUser;
      const { email, password, role } = request.body ?? {};

      if (!email || !password || !role) {
        reply.code(400).send({ error: 'email, password and role are required' });
        return;
      }
      if (!VALID_ROLES.includes(role)) {
        reply.code(400).send({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
        return;
      }
      // Security review finding: a customer_admin must not be able to mint a
      // super_admin account (self-escalation risk) - only an existing super_admin can.
      const caller = request.user as AuthUser;
      if (role === 'super_admin' && caller.role !== 'super_admin') {
        reply.code(403).send({ error: 'Only a super_admin can create another super_admin' });
        return;
      }
      if (password.length < 8) {
        reply.code(400).send({ error: 'password must be at least 8 characters' });
        return;
      }

      const passwordHash = await hashPassword(password);
      try {
        const { rows } = await pool.query<UserRow>(
          'INSERT INTO users (customer_id, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, role, created_at',
          [customerId, email, role, passwordHash],
        );
        reply.code(201).send({ user: rows[0] });
      } catch (err) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
          reply.code(409).send({ error: 'A user with this email already exists' });
          return;
        }
        throw err;
      }
    },
  );
}
