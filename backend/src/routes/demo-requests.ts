import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';

interface DemoRequestBody {
  name: string;
  email: string;
  company: string;
  phone?: string;
  fleetSize?: string;
}

/** Public lead capture - no auth required, this is the landing page's "Request a Demo" form. */
export async function registerDemoRequestRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: DemoRequestBody }>('/api/demo-requests', async (request, reply) => {
    const { name, email, company, phone, fleetSize } = request.body ?? {};
    if (!name || !email || !company) {
      reply.code(400).send({ error: 'name, email and company are required' });
      return;
    }

    await pool.query(
      'INSERT INTO demo_requests (name, email, company, phone, fleet_size) VALUES ($1, $2, $3, $4, $5)',
      [name, email, company, phone ?? null, fleetSize ?? null],
    );
    reply.code(201).send({ ok: true });
  });
}
