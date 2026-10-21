import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './core/auth/jwt-plugin';
import { registerAuthRoutes } from './routes/auth';
import { registerUserRoutes } from './routes/users';
import { registerDriverRoutes } from './routes/drivers';
import { registerFleetShiftRoute } from './routes/fleet-shift';
import { registerDemoRequestRoute } from './routes/demo-requests';
import { registerDriverAppRoutes } from './routes/driver-app';

/** Builds the Fastify app without binding a port - used by server.ts and by tests (via .inject()). */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // CORS_ORIGIN locks this down to the real frontend domain in production
  // (set it in Hostinger's environment variables); unset (dev) reflects any
  // origin, matching pre-deployment behavior. TODOS.md's "lock down CORS"
  // gap, closed now that the real deployment topology (two subdomains) is known.
  const corsOrigin = process.env.CORS_ORIGIN ?? true;
  await app.register(cors, { origin: corsOrigin });
  await app.register(authPlugin);

  // Security review finding: never let a raw error (e.g. a DB constraint name)
  // reach the client. Explicit handlers (like the 23505 case in users.ts) stay
  // untouched; everything else gets a generic message, logged server-side.
  app.setErrorHandler((err, request, reply) => {
    request.log.error(err);
    if (reply.statusCode < 500) {
      reply.send(err);
      return;
    }
    reply.code(500).send({ error: 'Internal server error' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerDriverRoutes(app);
  await registerFleetShiftRoute(app);
  await registerDemoRequestRoute(app);
  await registerDriverAppRoutes(app);

  return app;
}
