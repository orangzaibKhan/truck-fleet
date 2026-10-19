import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';
import type { AuthUser } from '../core/auth/jwt-plugin';

interface DriverRow {
  id: string;
  name: string;
  created_at: string;
}

const ADMIN_ROLES: AuthUser['role'][] = ['super_admin', 'customer_admin', 'fleet_manager'];

export async function registerDriverRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/drivers', { preHandler: app.authenticate }, async (request) => {
    const { customerId } = request.user as AuthUser;
    const { rows } = await pool.query<DriverRow>(
      'SELECT id, name, created_at FROM drivers WHERE customer_id = $1 ORDER BY created_at',
      [customerId],
    );
    return { drivers: rows };
  });

  app.post<{ Body: { name: string } }>(
    '/api/drivers',
    { preHandler: app.requireRole(ADMIN_ROLES) },
    async (request, reply) => {
      const { customerId } = request.user as AuthUser;
      const { name } = request.body ?? {};
      if (!name || name.trim().length === 0) {
        reply.code(400).send({ error: 'name is required' });
        return;
      }

      // Single-fleet-per-customer prototype: new drivers go to the customer's
      // first fleet. Multi-fleet assignment is out of scope here.
      const { rows: fleetRows } = await pool.query<{ id: string }>(
        'SELECT id FROM fleets WHERE customer_id = $1 ORDER BY created_at LIMIT 1',
        [customerId],
      );
      if (fleetRows.length === 0) {
        reply.code(409).send({ error: 'No fleet exists for this customer yet' });
        return;
      }

      const { rows } = await pool.query<DriverRow>(
        'INSERT INTO drivers (customer_id, fleet_id, name) VALUES ($1, $2, $3) RETURNING id, name, created_at',
        [customerId, fleetRows[0].id, name.trim()],
      );
      reply.code(201).send({ driver: rows[0] });
    },
  );
}
