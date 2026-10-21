import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  userId: string;
  customerId: string;
  // Admin users (email/password) and drivers (employee_id/password) share
  // this token shape - exactly one of the two identifies who signed in.
  email?: string;
  employeeId?: string;
  role: 'super_admin' | 'customer_admin' | 'fleet_manager' | 'viewer' | 'driver';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      roles: AuthUser['role'][],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * JWT auth (Review Decisions #1 reopened at user request). Stateless tokens,
 * sent as `Authorization: Bearer <token>`, verified on every protected route.
 */
export default fp(async function authPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to .env - never hardcode it.');
  }

  await app.register(jwt, { secret });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.decorate('requireRole', (roles: AuthUser['role'][]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      if (!roles.includes(request.user.role)) {
        reply.code(403).send({ error: 'Forbidden' });
      }
    };
  });
});
