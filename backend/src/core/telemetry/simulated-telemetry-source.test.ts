import { describe, expect, test } from 'bun:test';
import { SimulatedTelemetrySource } from './simulated-telemetry-source';

describe('SimulatedTelemetrySource', () => {
  test('emits raw pings for a dwell-travel-dwell shift without pre-labeled stages', async () => {
    const source = new SimulatedTelemetrySource({
      truckId: 'truck-1',
      startTime: new Date('2026-01-01T06:00:00Z'),
      pingIntervalSeconds: 60,
      legs: [
        { type: 'dwell', lat: 24.0, lng: 46.0, durationMinutes: 5 },
        { type: 'travel', fromLat: 24.0, fromLng: 46.0, toLat: 24.1, toLng: 46.1, durationMinutes: 10, speedKph: 40 },
        { type: 'dwell', lat: 24.1, lng: 46.1, durationMinutes: 5 },
      ],
    });

    const pings = [];
    for await (const ping of source.streamPings('truck-1')) {
      pings.push(ping);
    }

    expect(pings.length).toBeGreaterThan(0);
    // No trip-stage field exists on the ping shape - stage inference is M1's job, not the simulator's.
    expect(Object.keys(pings[0]).sort()).toEqual(
      ['engineHours', 'lat', 'lng', 'odometerKm', 'speedKph', 'timestamp', 'truckId'].sort(),
    );
    // Dwell legs: near-zero speed. Travel legs: nonzero speed.
    expect(pings[0].speedKph).toBe(0);
    expect(pings[pings.length - 1].speedKph).toBe(0);
    const travelPing = pings.find((p) => p.speedKph > 0);
    expect(travelPing).toBeDefined();
  });

  test('a dropped-ping gap ("signal lost") produces no pings during the gap but time keeps advancing', async () => {
    const source = new SimulatedTelemetrySource({
      truckId: 'truck-1',
      startTime: new Date('2026-01-01T06:00:00Z'),
      pingIntervalSeconds: 60,
      dropGap: { afterPing: 2, forPings: 3 },
      legs: [{ type: 'dwell', lat: 24.0, lng: 46.0, durationMinutes: 10 }],
    });

    const pings = [];
    for await (const ping of source.streamPings('truck-1')) {
      pings.push(ping);
    }

    // 10 pings would normally be emitted (10 min / 60s); 3 are dropped.
    expect(pings.length).toBe(7);
    // Engine hours still advance across the gap - the 3rd emitted ping (index 2)
    // is actually the 6th simulated minute (pings 1,2 then gap 3,4,5 then ping 6).
    const engineHoursGap = pings[2].engineHours - pings[1].engineHours;
    expect(engineHoursGap).toBeGreaterThan(1 / 60); // more than one interval's worth of hours
  });

  test('ignores streamPings calls for a different truckId', async () => {
    const source = new SimulatedTelemetrySource({
      truckId: 'truck-1',
      startTime: new Date('2026-01-01T06:00:00Z'),
      legs: [{ type: 'dwell', lat: 24.0, lng: 46.0, durationMinutes: 5 }],
    });

    const pings = [];
    for await (const ping of source.streamPings('truck-2')) {
      pings.push(ping);
    }

    expect(pings.length).toBe(0);
  });
});
