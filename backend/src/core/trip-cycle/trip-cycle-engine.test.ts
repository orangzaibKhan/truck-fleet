import { describe, expect, test } from 'bun:test';
import { analyzeShift } from './trip-cycle-engine';
import type { GpsPing } from '../telemetry/telemetry-source';

const BASE = new Date('2026-01-01T06:00:00Z').getTime();

function ping(minute: number, speedKph: number, odometerKm: number): GpsPing {
  return {
    truckId: 'truck-1',
    lat: 24,
    lng: 46,
    timestamp: new Date(BASE + minute * 60_000).toISOString(),
    engineHours: minute / 60,
    odometerKm,
    speedKph,
  };
}

/**
 * Dense 1-minute pings for one leg - real telemetry arrives every ~20s, so
 * consecutive pings within a leg must stay well under the 180s signal-lost
 * threshold. Only the dedicated gap test should skip minutes on purpose.
 */
function segment(startMinute: number, endMinute: number, speedKph: number, startOdo: number, endOdo: number): GpsPing[] {
  const duration = endMinute - startMinute;
  const pings: GpsPing[] = [];
  for (let m = startMinute; m <= endMinute; m++) {
    const frac = duration === 0 ? 1 : (m - startMinute) / duration;
    pings.push(ping(m, speedKph, startOdo + (endOdo - startOdo) * frac));
  }
  return pings;
}

describe('analyzeShift - scripted scenarios (hand-computed expected values)', () => {
  test('normal day: one completed cycle plus a second, incomplete loading', () => {
    const pings = [
      ...segment(0, 5, 0, 0, 0), // loading (5 min)
      ...segment(5, 15, 40, 0, 10), // loaded travel (10 min, +10km)
      ...segment(15, 20, 0, 10, 10), // dumping (5 min)
      ...segment(20, 30, 40, 10, 20), // empty travel (10 min, +10km)
      ...segment(30, 32, 0, 20, 20), // 2nd loading, shift ends mid-dwell (2 min)
    ];

    const result = analyzeShift(pings);

    expect(result.segments.map((s) => s.stage)).toEqual([
      'loading',
      'loaded_travel',
      'dumping',
      'empty_travel',
      'loading',
    ]);
    expect(result.tripsCount).toBe(1);
    expect(result.avgCycleTimeMinutes).toBe(30); // loading start (t0) to empty_travel end (t30)
    expect(result.workingHours).toBeCloseTo(32 / 60, 5); // 5+10+5+10+2 = 32 min
    expect(result.availableHours).toBeCloseTo(32 / 60, 5); // no idle/gap in this scenario
    expect(result.utilizationPct).toBeCloseTo(100, 2);
    expect(result.totalDistanceKm).toBe(20);
  });

  test('mostly-idle truck: a single dwell past the max-dwell threshold, never completes a cycle', () => {
    const pings = segment(0, 25, 0, 0, 0); // 25 min dwell > 20 min default threshold

    const result = analyzeShift(pings);

    expect(result.segments.map((s) => s.stage)).toEqual(['idle']);
    expect(result.tripsCount).toBe(0);
    expect(result.avgCycleTimeMinutes).toBeNull();
    expect(result.workingHours).toBe(0);
    expect(result.utilizationPct).toBe(0);
  });

  test('mid-shift stoppage: an abnormally long dwell is "idle", not "dumping" - cargo state survives it', () => {
    const pings = [
      ...segment(0, 5, 0, 0, 0), // loading (5 min) -> cargo becomes loaded
      ...segment(5, 15, 40, 0, 10), // loaded travel (10 min)
      ...segment(15, 45, 0, 10, 10), // stoppage, 30 min > 20 min threshold -> idle; cargo NOT flipped
      ...segment(45, 55, 40, 10, 20), // resumes - still loaded, so this must be loaded_travel again
      ...segment(55, 60, 0, 20, 20), // dumping (5 min) -> cargo becomes empty
      ...segment(60, 70, 40, 20, 30), // empty travel (10 min)
    ];

    const result = analyzeShift(pings);

    expect(result.segments.map((s) => s.stage)).toEqual([
      'loading',
      'loaded_travel',
      'idle', // the stoppage - never "breakdown" (no driver app), never "dumping"
      'loaded_travel', // proves cargo state was preserved as "loaded" across the stoppage
      'dumping',
      'empty_travel',
    ]);
    expect(result.tripsCount).toBe(1);
    expect(result.avgCycleTimeMinutes).toBe(70); // loading start (t0) to empty_travel end (t70)
    expect(result.workingHours).toBeCloseTo(40 / 60, 5); // 5+10+10+5+10 = 40 min (30 min idle excluded)
    expect(result.availableHours).toBeCloseTo(70 / 60, 5);
    expect(result.utilizationPct).toBeCloseTo((40 / 70) * 100, 2);
  });

  test('telemetry gap: a dropped-ping gap becomes "signal_lost", cargo state survives it', () => {
    const pings = [
      ...segment(0, 5, 0, 0, 0), // loading (5 min) -> cargo becomes loaded
      ...segment(5, 10, 40, 0, 2), // loaded travel (5 min) - then a deliberate 15-min signal gap
      ...segment(25, 30, 40, 2, 7), // signal regained, still moving, still loaded -> loaded_travel continues
      ...segment(30, 35, 0, 7, 7), // dumping (5 min) -> cargo becomes empty
      ...segment(35, 45, 40, 7, 17), // empty travel (10 min)
    ];

    const result = analyzeShift(pings);

    expect(result.segments.map((s) => s.stage)).toEqual([
      'loading',
      'loaded_travel',
      'signal_lost',
      'loaded_travel',
      'dumping',
      'empty_travel',
    ]);
    expect(result.segments[2].durationMinutes).toBe(15);
    expect(result.tripsCount).toBe(1);
    expect(result.avgCycleTimeMinutes).toBe(45); // loading start (t0) to empty_travel end (t45)
    expect(result.workingHours).toBeCloseTo(30 / 60, 5); // 5+5+5+5+10 = 30 min (15 min signal_lost excluded)
    expect(result.utilizationPct).toBeCloseTo((30 / 45) * 100, 2);
  });

  test('empty ping stream returns a zeroed, non-crashing result', () => {
    const result = analyzeShift([]);
    expect(result.segments).toEqual([]);
    expect(result.tripsCount).toBe(0);
    expect(result.avgCycleTimeMinutes).toBeNull();
    expect(result.utilizationPct).toBe(0);
  });
});
