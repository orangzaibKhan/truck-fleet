import type { GpsPing, TelemetrySource } from './telemetry-source';

interface DwellLeg {
  type: 'dwell';
  lat: number;
  lng: number;
  durationMinutes: number;
}

interface TravelLeg {
  type: 'travel';
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  durationMinutes: number;
  speedKph: number;
}

export type ShiftLeg = DwellLeg | TravelLeg;

export interface SimulatedShiftConfig {
  truckId: string;
  startTime: Date;
  /** Ordered legs for the whole simulated shift, e.g. dwell (loading) -> travel -> dwell (dumping) -> travel. */
  legs: ShiftLeg[];
  /** Simulated seconds between pings. */
  pingIntervalSeconds?: number;
  /**
   * Injects a dropped-ping gap ("signal lost" per Review Decisions #5):
   * no pings are emitted for this many consecutive pings, starting after
   * `afterPing` pings have already been emitted. Simulated time and
   * engine-hours still advance through the gap - a real truck doesn't
   * pause just because its GPS stopped reporting.
   */
  dropGap?: { afterPing: number; forPings: number };
}

const GPS_JITTER_DEGREES = 0.00005; // a few meters - deliberate ambiguity near stage boundaries, per Review Decisions #5

function jitter(value: number): number {
  return value + (Math.random() - 0.5) * 2 * GPS_JITTER_DEGREES;
}

function lerp(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction;
}

/**
 * Emits raw, ambiguous pings for a simulated shift - deliberately NOT
 * pre-labeled trip stages (Review Decisions #5). M1's trip-cycle logic must
 * infer loading/travel/dumping/idle from this stream, the same way it would
 * have to from a real vendor's feed.
 */
export class SimulatedTelemetrySource implements TelemetrySource {
  constructor(private readonly config: SimulatedShiftConfig) {}

  async *streamPings(truckId: string): AsyncIterable<GpsPing> {
    if (truckId !== this.config.truckId) {
      return;
    }
    const intervalSeconds = this.config.pingIntervalSeconds ?? 20;
    let pingIndex = 0;
    let elapsedSeconds = 0;
    let engineHours = 0;
    const odometerKm = { value: 0 };

    for (const leg of this.config.legs) {
      const pingCount = Math.max(1, Math.round((leg.durationMinutes * 60) / intervalSeconds));
      for (let i = 0; i < pingCount; i++) {
        const fraction = pingCount === 1 ? 1 : i / (pingCount - 1);
        const { lat, lng, speedKph } = this.positionAt(leg, fraction, intervalSeconds, odometerKm);

        const inDropGap =
          this.config.dropGap !== undefined &&
          pingIndex >= this.config.dropGap.afterPing &&
          pingIndex < this.config.dropGap.afterPing + this.config.dropGap.forPings;

        pingIndex++;
        elapsedSeconds += intervalSeconds;
        engineHours += intervalSeconds / 3600;

        if (inDropGap) {
          // Signal lost: time/engine-hours/odometer still advance; no ping emitted.
          continue;
        }

        yield {
          truckId,
          lat: jitter(lat),
          lng: jitter(lng),
          timestamp: new Date(this.config.startTime.getTime() + elapsedSeconds * 1000).toISOString(),
          engineHours: Math.round(engineHours * 100) / 100,
          odometerKm: Math.round(odometerKm.value * 100) / 100,
          speedKph,
        };
      }
    }
  }

  private positionAt(
    leg: ShiftLeg,
    fraction: number,
    intervalSeconds: number,
    odometerKm: { value: number },
  ): { lat: number; lng: number; speedKph: number } {
    if (leg.type === 'dwell') {
      return { lat: leg.lat, lng: leg.lng, speedKph: 0 };
    }
    odometerKm.value += (leg.speedKph * intervalSeconds) / 3600;
    return {
      lat: lerp(leg.fromLat, leg.toLat, fraction),
      lng: lerp(leg.fromLng, leg.toLng, fraction),
      speedKph: leg.speedKph,
    };
  }
}
