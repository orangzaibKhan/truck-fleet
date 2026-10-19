import type { FastifyInstance } from 'fastify';
import { SimulatedTelemetrySource, type SimulatedShiftConfig } from '../core/telemetry/simulated-telemetry-source';
import { analyzeShift } from '../core/trip-cycle/trip-cycle-engine';
import { computeMaintenanceStatus } from '../core/maintenance/maintenance-alerts';
import type { GpsPing } from '../core/telemetry/telemetry-source';
import { pool } from '../core/db/pool';
import type { AuthUser } from '../core/auth/jwt-plugin';

// Riyadh-area coordinates - matches the source doc's KSA context.
const LOADING_AREA = { lat: 24.7136, lng: 46.6753 };
const DUMP_AREA = { lat: 24.7636, lng: 46.7253 };

interface SimulatedTruck {
  truckId: string;
  truckNumber: string;
  baselineEngineHours: number;
  config: SimulatedShiftConfig;
}

const START_TIME = new Date('2026-01-01T06:00:00Z');

const TRUCKS: SimulatedTruck[] = [
  {
    truckId: 'truck-1',
    truckNumber: 'DT-001',
    baselineEngineHours: 249.6, // crosses the 250h "due" threshold partway through this shift
    config: {
      truckId: 'truck-1',
      startTime: START_TIME,
      pingIntervalSeconds: 30,
      legs: [
        { type: 'dwell', lat: LOADING_AREA.lat, lng: LOADING_AREA.lng, durationMinutes: 5 },
        {
          type: 'travel',
          fromLat: LOADING_AREA.lat,
          fromLng: LOADING_AREA.lng,
          toLat: DUMP_AREA.lat,
          toLng: DUMP_AREA.lng,
          durationMinutes: 10,
          speedKph: 35,
        },
        { type: 'dwell', lat: DUMP_AREA.lat, lng: DUMP_AREA.lng, durationMinutes: 5 },
        {
          type: 'travel',
          fromLat: DUMP_AREA.lat,
          fromLng: DUMP_AREA.lng,
          toLat: LOADING_AREA.lat,
          toLng: LOADING_AREA.lng,
          durationMinutes: 10,
          speedKph: 35,
        },
        { type: 'dwell', lat: LOADING_AREA.lat, lng: LOADING_AREA.lng, durationMinutes: 3 },
      ],
    },
  },
  {
    truckId: 'truck-2',
    truckNumber: 'DT-002',
    baselineEngineHours: 150, // stays well under the "due" threshold - the healthy truck
    config: {
      truckId: 'truck-2',
      startTime: START_TIME,
      pingIntervalSeconds: 30,
      legs: [
        { type: 'dwell', lat: LOADING_AREA.lat, lng: LOADING_AREA.lng, durationMinutes: 5 },
        {
          type: 'travel',
          fromLat: LOADING_AREA.lat,
          fromLng: LOADING_AREA.lng,
          toLat: DUMP_AREA.lat,
          toLng: DUMP_AREA.lng,
          durationMinutes: 10,
          speedKph: 35,
        },
        // A stoppage well past the max-dwell threshold - reads as "idle," never "breakdown" (no driver app, see M3 deferral).
        { type: 'dwell', lat: DUMP_AREA.lat, lng: DUMP_AREA.lng, durationMinutes: 30 },
        {
          type: 'travel',
          fromLat: DUMP_AREA.lat,
          fromLng: DUMP_AREA.lng,
          toLat: LOADING_AREA.lat,
          toLng: LOADING_AREA.lng,
          durationMinutes: 10,
          speedKph: 35,
        },
        { type: 'dwell', lat: LOADING_AREA.lat, lng: LOADING_AREA.lng, durationMinutes: 5 },
      ],
    },
  },
  {
    truckId: 'truck-3',
    truckNumber: 'DT-003',
    baselineEngineHours: 310, // already past the 300h "overdue" threshold before this shift even starts
    config: {
      truckId: 'truck-3',
      startTime: START_TIME,
      pingIntervalSeconds: 30,
      dropGap: { afterPing: 12, forPings: 10 }, // 10 * 30s = 300s > the 180s signal-lost threshold
      legs: [
        { type: 'dwell', lat: LOADING_AREA.lat, lng: LOADING_AREA.lng, durationMinutes: 5 },
        {
          type: 'travel',
          fromLat: LOADING_AREA.lat,
          fromLng: LOADING_AREA.lng,
          toLat: DUMP_AREA.lat,
          toLng: DUMP_AREA.lng,
          durationMinutes: 12,
          speedKph: 30,
        },
        { type: 'dwell', lat: DUMP_AREA.lat, lng: DUMP_AREA.lng, durationMinutes: 5 },
        {
          type: 'travel',
          fromLat: DUMP_AREA.lat,
          fromLng: DUMP_AREA.lng,
          toLat: LOADING_AREA.lat,
          toLng: LOADING_AREA.lng,
          durationMinutes: 10,
          speedKph: 35,
        },
      ],
    },
  },
];

async function collectPings(source: SimulatedTelemetrySource, truckId: string): Promise<GpsPing[]> {
  const pings: GpsPing[] = [];
  for await (const ping of source.streamPings(truckId)) {
    pings.push(ping);
  }
  return pings;
}

/** Maps the last inferred stage to the truck-status vocabulary from the M0 schema. */
function currentStatusFromStage(stage: string | undefined): string {
  switch (stage) {
    case 'loading':
    case 'loaded_travel':
    case 'dumping':
    case 'empty_travel':
      return 'working';
    case 'idle':
      return 'idle';
    case 'signal_lost':
      return 'signal_lost';
    default:
      return 'available';
  }
}

export async function registerFleetShiftRoute(app: FastifyInstance): Promise<void> {
  app.get('/api/fleet-shift', { preHandler: app.authenticate }, async (request) => {
    const { customerId } = request.user as AuthUser;

    // Tenant-scoped via the DB (Review Decisions #3: app-level filtering,
    // same WHERE customer_id = $1 pattern RLS would use later). The simulated
    // telemetry config above is keyed by truck_number, matched against the
    // real DB rows seeded for this customer.
    const { rows: ownedTrucks } = await pool.query<{ truck_number: string }>(
      'SELECT truck_number FROM trucks WHERE customer_id = $1',
      [customerId],
    );
    const ownedNumbers = new Set(ownedTrucks.map((r) => r.truck_number));
    const scopedTrucks = TRUCKS.filter((t) => ownedNumbers.has(t.truckNumber));

    const trucks = await Promise.all(
      scopedTrucks.map(async (truck) => {
        const source = new SimulatedTelemetrySource(truck.config);
        const pings = await collectPings(source, truck.truckId);
        const analysis = analyzeShift(pings);
        const lastPing = pings[pings.length - 1];
        const totalEngineHours = truck.baselineEngineHours + (lastPing?.engineHours ?? 0);

        return {
          truckId: truck.truckId,
          truckNumber: truck.truckNumber,
          pings,
          analysis,
          currentStatus: currentStatusFromStage(analysis.segments[analysis.segments.length - 1]?.stage),
          maintenance: {
            totalEngineHours: Math.round(totalEngineHours * 100) / 100,
            status: computeMaintenanceStatus(totalEngineHours),
          },
        };
      }),
    );

    return { trucks };
  });
}
