import type { FastifyInstance } from 'fastify';
import { pool } from '../core/db/pool';
import { verifyPassword } from '../core/auth/password';
import type { AuthUser } from '../core/auth/jwt-plugin';

interface DriverRow {
  id: string;
  customer_id: string;
  name: string;
  employee_id: string;
  password_hash: string;
  truck_id: string | null;
}

interface TruckRow {
  id: string;
  truck_number: string;
  capacity_tons: number | null;
}

interface ShiftRow {
  id: string;
  driver_id: string;
  truck_id: string;
  started_at: string;
  ended_at: string | null;
  safety_score: number;
}

const PERIOD_WINDOWS: Record<string, string> = {
  today: "date(started_at) = date('now')",
  week: "started_at >= datetime('now', '-7 days')",
  month: "started_at >= datetime('now', '-1 month')",
};

function periodClause(period: string | undefined): string {
  return PERIOD_WINDOWS[period ?? 'today'] ?? PERIOD_WINDOWS.today;
}

async function getActiveShift(driverId: string): Promise<ShiftRow | undefined> {
  const { rows } = await pool.query<ShiftRow>(
    'SELECT id, driver_id, truck_id, started_at, ended_at, safety_score FROM shifts WHERE driver_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [driverId],
  );
  return rows[0];
}

export async function registerDriverAppRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { employeeId: string; password: string } }>('/api/driver/login', async (request, reply) => {
    const { employeeId, password } = request.body ?? {};
    if (!employeeId || !password) {
      reply.code(400).send({ error: 'employeeId and password are required' });
      return;
    }
    const normalizedId = employeeId.trim().toLowerCase();

    const { rows } = await pool.query<DriverRow>(
      'SELECT id, customer_id, name, employee_id, password_hash, truck_id FROM drivers WHERE lower(employee_id) = $1',
      [normalizedId],
    );
    const driver = rows[0];

    // Same timing-safe-dummy-hash pattern as auth.ts's admin login.
    const dummyHash = '$2b$10$2KykmVHafm46URTRKfWCrO5/lqW9MnwylC9ugv2uUUSy4uRQV8ulq';
    const passwordOk = await verifyPassword(password, driver?.password_hash || dummyHash);
    if (!driver || !passwordOk) {
      reply.code(401).send({ error: 'Invalid employee ID or password' });
      return;
    }

    const authUser: AuthUser = {
      userId: driver.id,
      customerId: driver.customer_id,
      employeeId: driver.employee_id,
      role: 'driver',
    };
    const token = app.jwt.sign(authUser, { expiresIn: '12h' });
    return { token, driver: { driverId: driver.id, name: driver.name, employeeId: driver.employee_id } };
  });

  app.get(
    '/api/driver/home',
    { preHandler: app.requireRole(['driver']) },
    async (request, reply) => {
      const { userId: driverId, customerId } = request.user as AuthUser;

      const { rows: driverRows } = await pool.query<DriverRow>('SELECT * FROM drivers WHERE id = $1', [driverId]);
      const driver = driverRows[0];
      if (!driver) {
        reply.code(404).send({ error: 'Driver not found' });
        return;
      }

      let truck: TruckRow | undefined;
      if (driver.truck_id) {
        const { rows } = await pool.query<TruckRow>(
          'SELECT id, truck_number, capacity_tons FROM trucks WHERE id = $1 AND customer_id = $2',
          [driver.truck_id, customerId],
        );
        truck = rows[0];
      }

      const activeShift = await getActiveShift(driverId);

      const { rows: tripStatRows } = await pool.query<{ trips: number; distance: number }>(
        `SELECT COUNT(*) AS trips, COALESCE(SUM(distance_km), 0) AS distance FROM driver_trips
         WHERE driver_id = $1 AND stage = 'completed' AND date(completed_at) = date('now')`,
        [driverId],
      );
      const todayStats = tripStatRows[0] ?? { trips: 0, distance: 0 };

      const { rows: recentInspections } = await pool.query<{ created_at: string; has_fail: number }>(
        'SELECT created_at, has_fail FROM inspections WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 1',
        [driverId],
      );
      const { rows: recentTrips } = await pool.query<{ completed_at: string }>(
        "SELECT completed_at FROM driver_trips WHERE driver_id = $1 AND stage = 'completed' ORDER BY completed_at DESC LIMIT 1",
        [driverId],
      );

      return {
        driver: { id: driver.id, name: driver.name, employeeId: driver.employee_id },
        truck: truck ? { id: truck.id, truckNumber: truck.truck_number, capacityTons: truck.capacity_tons } : null,
        shiftActive: !!activeShift,
        shiftId: activeShift?.id ?? null,
        shiftStartedAt: activeShift?.started_at ?? null,
        safetyScore: activeShift?.safety_score ?? 100,
        today: { trips: Number(todayStats.trips), distanceKm: Number(todayStats.distance) },
        recentActivity: {
          lastTripCompletedAt: recentTrips[0]?.completed_at ?? null,
          lastInspection: recentInspections[0]
            ? { createdAt: recentInspections[0].created_at, hasFail: !!recentInspections[0].has_fail }
            : null,
        },
      };
    },
  );

  app.post(
    '/api/driver/shift/start',
    { preHandler: app.requireRole(['driver']) },
    async (request, reply) => {
      const { userId: driverId, customerId } = request.user as AuthUser;
      const existing = await getActiveShift(driverId);
      if (existing) {
        reply.code(409).send({ error: 'A shift is already active' });
        return;
      }
      const { rows: driverRows } = await pool.query<DriverRow>('SELECT truck_id FROM drivers WHERE id = $1', [
        driverId,
      ]);
      const truckId = driverRows[0]?.truck_id;
      if (!truckId) {
        reply.code(409).send({ error: 'No truck assigned to this driver' });
        return;
      }
      const { rows } = await pool.query<ShiftRow>(
        'INSERT INTO shifts (customer_id, driver_id, truck_id) VALUES ($1, $2, $3) RETURNING id, driver_id, truck_id, started_at, ended_at, safety_score',
        [customerId, driverId, truckId],
      );
      return { shift: rows[0] };
    },
  );

  app.post<{
    Body: { truckCondition: string; fuelLevel: string; notes?: string };
  }>('/api/driver/shift/end', { preHandler: app.requireRole(['driver']) }, async (request, reply) => {
    const { userId: driverId } = request.user as AuthUser;
    const { truckCondition, fuelLevel, notes } = request.body ?? {};
    if (!truckCondition || !fuelLevel) {
      reply.code(400).send({ error: 'truckCondition and fuelLevel are required' });
      return;
    }
    const activeShift = await getActiveShift(driverId);
    if (!activeShift) {
      reply.code(409).send({ error: 'No active shift to end' });
      return;
    }

    // Simple prototype-grade score: start at 100, dock points for failed
    // inspection items and any incident reports logged during this shift.
    const { rows: failRows } = await pool.query<{ has_fail: number }>(
      'SELECT has_fail FROM inspections WHERE shift_id = $1',
      [activeShift.id],
    );
    const failCount = failRows.filter((r) => r.has_fail).length;
    const { rows: incidentRows } = await pool.query<{ id: string }>(
      "SELECT id FROM incident_reports WHERE driver_id = $1 AND created_at >= $2",
      [driverId, activeShift.started_at],
    );
    const score = Math.max(0, 100 - failCount * 10 - incidentRows.length * 15);

    await pool.query(
      `UPDATE shifts SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), truck_condition = $1, fuel_level = $2, handover_notes = $3, safety_score = $4 WHERE id = $5`,
      [truckCondition, fuelLevel, notes ?? null, score, activeShift.id],
    );
    return { ok: true, safetyScore: score };
  });

  app.post(
    '/api/driver/inspection',
    { preHandler: app.requireRole(['driver']) },
    async (request, reply) => {
      const { userId: driverId, customerId } = request.user as AuthUser;
      const { results } = (request.body ?? {}) as { results?: ('pass' | 'fail')[] };
      if (!Array.isArray(results) || results.length !== 15) {
        reply.code(400).send({ error: 'results must be an array of 15 pass/fail values' });
        return;
      }
      const activeShift = await getActiveShift(driverId);
      if (!activeShift) {
        reply.code(409).send({ error: 'An active shift is required to submit an inspection' });
        return;
      }
      const hasFail = results.includes('fail');
      await pool.query(
        'INSERT INTO inspections (customer_id, driver_id, shift_id, results, has_fail) VALUES ($1, $2, $3, $4, $5)',
        [customerId, driverId, activeShift.id, JSON.stringify(results), hasFail ? 1 : 0],
      );
      return { ok: true, hasFail };
    },
  );

  app.post(
    '/api/driver/trip/start',
    { preHandler: app.requireRole(['driver']) },
    async (request, reply) => {
      const { userId: driverId, customerId } = request.user as AuthUser;
      const activeShift = await getActiveShift(driverId);
      if (!activeShift) {
        reply.code(409).send({ error: 'An active shift is required to start a trip' });
        return;
      }
      const { rows } = await pool.query<{ id: string; stage: string; started_at: string }>(
        'INSERT INTO driver_trips (customer_id, driver_id, shift_id) VALUES ($1, $2, $3) RETURNING id, stage, started_at',
        [customerId, driverId, activeShift.id],
      );
      return { trip: rows[0] };
    },
  );

  const STAGE_ORDER = ['loading', 'traveling', 'dumping', 'returning', 'completed'];
  app.post<{ Body: { tripId: string; distanceKm?: number } }>(
    '/api/driver/trip/advance',
    { preHandler: app.requireRole(['driver']) },
    async (request, reply) => {
      const { userId: driverId } = request.user as AuthUser;
      const { tripId, distanceKm } = request.body ?? {};
      if (!tripId) {
        reply.code(400).send({ error: 'tripId is required' });
        return;
      }
      const { rows } = await pool.query<{ id: string; stage: string }>(
        'SELECT id, stage FROM driver_trips WHERE id = $1 AND driver_id = $2',
        [tripId, driverId],
      );
      const trip = rows[0];
      if (!trip) {
        reply.code(404).send({ error: 'Trip not found' });
        return;
      }
      const currentIndex = STAGE_ORDER.indexOf(trip.stage);
      if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
        reply.code(409).send({ error: 'Trip is already completed' });
        return;
      }
      const nextStage = STAGE_ORDER[currentIndex + 1];
      if (nextStage === 'completed') {
        await pool.query(
          `UPDATE driver_trips SET stage = $1, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), distance_km = $2 WHERE id = $3`,
          [nextStage, distanceKm ?? 3.8, tripId],
        );
      } else {
        await pool.query('UPDATE driver_trips SET stage = $1 WHERE id = $2', [nextStage, tripId]);
      }
      return { stage: nextStage };
    },
  );

  app.post<{
    Body: { liters: number; pricePerLiter: number; station: string; paymentMethod: string };
  }>('/api/driver/fuel', { preHandler: app.requireRole(['driver']) }, async (request, reply) => {
    const { userId: driverId, customerId } = request.user as AuthUser;
    const { liters, pricePerLiter, station, paymentMethod } = request.body ?? {};
    if (!liters || !pricePerLiter || !station || !paymentMethod) {
      reply.code(400).send({ error: 'liters, pricePerLiter, station and paymentMethod are required' });
      return;
    }
    const { rows: driverRows } = await pool.query<DriverRow>('SELECT truck_id FROM drivers WHERE id = $1', [
      driverId,
    ]);
    const truckId = driverRows[0]?.truck_id;
    if (!truckId) {
      reply.code(409).send({ error: 'No truck assigned to this driver' });
      return;
    }
    const totalCost = Math.round(liters * pricePerLiter * 100) / 100;
    await pool.query(
      'INSERT INTO fuel_logs (customer_id, driver_id, truck_id, liters, price_per_liter, total_cost, station, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [customerId, driverId, truckId, liters, pricePerLiter, totalCost, station, paymentMethod],
    );
    return { ok: true, totalCost };
  });

  app.post<{
    Body: {
      kind: 'breakdown' | 'accident';
      issueType?: string;
      priority?: string;
      severity?: string;
      hasInjuries?: boolean;
      injuredCount?: number;
      otherVehiclePlate?: string;
      otherDriverName?: string;
      description?: string;
    };
  }>('/api/driver/incident', { preHandler: app.requireRole(['driver']) }, async (request, reply) => {
    const { userId: driverId, customerId } = request.user as AuthUser;
    const body = request.body ?? ({} as Record<string, unknown>);
    if (body.kind !== 'breakdown' && body.kind !== 'accident') {
      reply.code(400).send({ error: "kind must be 'breakdown' or 'accident'" });
      return;
    }
    const { rows: driverRows } = await pool.query<DriverRow>('SELECT truck_id FROM drivers WHERE id = $1', [
      driverId,
    ]);
    const truckId = driverRows[0]?.truck_id;
    if (!truckId) {
      reply.code(409).send({ error: 'No truck assigned to this driver' });
      return;
    }
    await pool.query(
      `INSERT INTO incident_reports
       (customer_id, driver_id, truck_id, kind, issue_type, priority, severity, has_injuries, injured_count, other_vehicle_plate, other_driver_name, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        customerId,
        driverId,
        truckId,
        body.kind,
        body.issueType ?? null,
        body.priority ?? null,
        body.severity ?? null,
        body.hasInjuries ? 1 : 0,
        body.injuredCount ?? null,
        body.otherVehiclePlate ?? null,
        body.otherDriverName ?? null,
        body.description ?? null,
      ],
    );
    return { ok: true };
  });

  app.get<{ Querystring: { period?: string } }>(
    '/api/driver/history',
    { preHandler: app.requireRole(['driver']) },
    async (request) => {
      const { userId: driverId } = request.user as AuthUser;
      const period = request.query?.period ?? 'today';
      const clause = periodClause(period);

      const { rows: shiftRows } = await pool.query<{ score: number; hours: number }>(
        `SELECT AVG(safety_score) AS score, COALESCE(SUM((julianday(COALESCE(ended_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))) - julianday(started_at)) * 24), 0) AS hours
         FROM shifts WHERE driver_id = $1 AND ${clause}`,
        [driverId],
      );
      const { rows: tripRows } = await pool.query<{ trips: number; distance: number }>(
        `SELECT COUNT(*) AS trips, COALESCE(SUM(distance_km), 0) AS distance FROM driver_trips
         WHERE driver_id = $1 AND stage = 'completed' AND ${clause.replace('started_at', 'completed_at')}`,
        [driverId],
      );
      const { rows: tripList } = await pool.query<{
        id: string;
        started_at: string;
        completed_at: string;
        distance_km: number;
      }>(
        `SELECT id, started_at, completed_at, distance_km FROM driver_trips
         WHERE driver_id = $1 AND stage = 'completed' AND ${clause.replace('started_at', 'completed_at')}
         ORDER BY completed_at DESC LIMIT 20`,
        [driverId],
      );

      return {
        score: Math.round(shiftRows[0]?.score ?? 100),
        hoursActive: Math.round((shiftRows[0]?.hours ?? 0) * 10) / 10,
        trips: Number(tripRows[0]?.trips ?? 0),
        distanceKm: Number(tripRows[0]?.distance ?? 0),
        tripList: tripList.map((t) => ({
          id: t.id,
          startedAt: t.started_at,
          completedAt: t.completed_at,
          distanceKm: t.distance_km,
        })),
      };
    },
  );

  app.get<{ Querystring: { period?: string } }>(
    '/api/driver/leaderboard',
    { preHandler: app.requireRole(['driver']) },
    async (request) => {
      const { customerId, userId: driverId } = request.user as AuthUser;
      const period = request.query?.period ?? 'week';
      const clause = periodClause(period);

      const { rows } = await pool.query<{ id: string; name: string; truck_number: string | null; score: number }>(
        `SELECT d.id, d.name, t.truck_number, AVG(s.safety_score) AS score
         FROM drivers d
         JOIN shifts s ON s.driver_id = d.id AND ${clause}
         LEFT JOIN trucks t ON t.id = d.truck_id
         WHERE d.customer_id = $1
         GROUP BY d.id
         ORDER BY score DESC`,
        [customerId],
      );

      return {
        leaderboard: rows.map((r, i) => ({
          rank: i + 1,
          driverId: r.id,
          name: r.name,
          truckNumber: r.truck_number,
          score: Math.round(r.score),
          isMe: r.id === driverId,
        })),
      };
    },
  );
}
