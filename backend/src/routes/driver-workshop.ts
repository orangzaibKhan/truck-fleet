import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';
import type { AuthUser } from '../core/auth/jwt-plugin';

interface DriverRow {
  truck_id: string | null;
}

interface TruckRow {
  id: string;
  truck_number: string;
  next_service_type: string | null;
  next_service_due: string | null;
}

interface TicketRow {
  id: string;
  issue: string;
  status: string;
  opened_at: string;
}

interface PartRow {
  id: string;
  name: string;
  status: string;
  eta: string | null;
}

interface HistoryRow {
  id: string;
  service_type: string;
  cost: number;
  workshop_name: string;
  serviced_at: string;
}

const TICKET_STEPS = ['diagnosis', 'parts', 'repair', 'ready'] as const;

export async function registerDriverWorkshopRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/driver/workshop',
    { preHandler: app.requireRole(['driver']) },
    async (request) => {
      const { userId: driverId, customerId } = request.user as AuthUser;

      const { rows: driverRows } = await pool.query<DriverRow>('SELECT truck_id FROM drivers WHERE id = $1', [
        driverId,
      ]);
      const truckId = driverRows[0]?.truck_id;
      if (!truckId) {
        return { truck: null, nextService: null, ticket: null, history: [] };
      }

      const { rows: truckRows } = await pool.query<TruckRow>(
        'SELECT id, truck_number, next_service_type, next_service_due FROM trucks WHERE id = $1 AND customer_id = $2',
        [truckId, customerId],
      );
      const truck = truckRows[0];
      if (!truck) {
        return { truck: null, nextService: null, ticket: null, history: [] };
      }

      const { rows: ticketRows } = await pool.query<TicketRow>(
        `SELECT id, issue, status, opened_at FROM workshop_tickets
         WHERE truck_id = $1 AND customer_id = $2 AND status != 'closed'
         ORDER BY opened_at DESC LIMIT 1`,
        [truckId, customerId],
      );
      const openTicket = ticketRows[0];

      let ticket: {
        id: string;
        issue: string;
        openedAt: string;
        steps: typeof TICKET_STEPS;
        currentStepIndex: number;
        parts: { id: string; name: string; status: string; eta: string | null }[];
      } | null = null;

      if (openTicket) {
        const { rows: partRows } = await pool.query<PartRow>(
          'SELECT id, name, status, eta FROM workshop_parts WHERE ticket_id = $1',
          [openTicket.id],
        );
        ticket = {
          id: openTicket.id,
          issue: openTicket.issue,
          openedAt: openTicket.opened_at,
          steps: TICKET_STEPS,
          currentStepIndex: TICKET_STEPS.indexOf(openTicket.status as (typeof TICKET_STEPS)[number]),
          parts: partRows.map((p) => ({ id: p.id, name: p.name, status: p.status, eta: p.eta })),
        };
      }

      const { rows: historyRows } = await pool.query<HistoryRow>(
        `SELECT id, service_type, cost, workshop_name, serviced_at FROM workshop_service_history
         WHERE truck_id = $1 AND customer_id = $2
         ORDER BY serviced_at DESC LIMIT 10`,
        [truckId, customerId],
      );

      return {
        truck: { id: truck.id, truckNumber: truck.truck_number },
        nextService: truck.next_service_type
          ? { type: truck.next_service_type, dueDate: truck.next_service_due }
          : null,
        ticket,
        history: historyRows.map((h) => ({
          id: h.id,
          serviceType: h.service_type,
          cost: h.cost,
          workshopName: h.workshop_name,
          servicedAt: h.serviced_at,
        })),
      };
    },
  );
}
