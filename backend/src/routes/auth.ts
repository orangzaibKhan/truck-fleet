import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';
import { hashPassword, verifyPassword } from '../core/auth/password';
import type { AuthUser } from '../core/auth/jwt-plugin';

interface UserRow {
  id: string;
  customer_id: string;
  email: string;
  role: AuthUser['role'];
  password_hash: string;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email: string; password: string } }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      reply.code(400).send({ error: 'email and password are required' });
      return;
    }

    // Emails are stored lowercased (see users.ts/seed.ts) - normalize the same
    // way here so login isn't broken by a mobile keyboard's autocapitalize or
    // any other casing difference. Trim stray whitespace for the same reason.
    const normalizedEmail = email.trim().toLowerCase();

    const { rows } = await pool.query<UserRow>(
      'SELECT id, customer_id, email, role, password_hash FROM users WHERE email = $1',
      [normalizedEmail],
    );
    const user = rows[0];

    // Always verify against a hash, even when no user is found, so login
    // doesn't leak "which emails exist" via response-time differences.
    // This is a real bcrypt hash of an arbitrary placeholder - never a match,
    // but valid enough for verifyPassword to run its normal comparison.
    const dummyHash = '$2b$10$2KykmVHafm46URTRKfWCrO5/lqW9MnwylC9ugv2uUUSy4uRQV8ulq';
    const validHash = user?.password_hash ?? dummyHash;
    const passwordOk = await verifyPassword(password, validHash);

    if (!user || !passwordOk) {
      reply.code(401).send({ error: 'Invalid email or password' });
      return;
    }

    const authUser: AuthUser = {
      userId: user.id,
      customerId: user.customer_id,
      email: user.email,
      role: user.role,
    };
    const token = app.jwt.sign(authUser, { expiresIn: '12h' });
    return { token, user: authUser };
  });

  app.get('/api/auth/me', { preHandler: app.authenticate }, async (request) => {
    return { user: request.user };
  });

  app.put<{ Body: { currentPassword: string; newPassword: string } }>(
    '/api/auth/password',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { userId } = request.user as AuthUser;
      const { currentPassword, newPassword } = request.body ?? {};
      if (!currentPassword || !newPassword) {
        reply.code(400).send({ error: 'currentPassword and newPassword are required' });
        return;
      }
      if (newPassword.length < 8) {
        reply.code(400).send({ error: 'newPassword must be at least 8 characters' });
        return;
      }

      const { rows } = await pool.query<UserRow>('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (rows.length === 0 || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
        reply.code(401).send({ error: 'Current password is incorrect' });
        return;
      }

      const newHash = await hashPassword(newPassword);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
      return { ok: true };
    },
  );
}
