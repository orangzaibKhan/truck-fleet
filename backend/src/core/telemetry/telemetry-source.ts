/**
 * Raw GPS ping. No trip-stage label - per Review Decisions #5, stage
 * inference belongs to M1's trip-cycle logic, not the telemetry source.
 */
export interface GpsPing {
  truckId: string;
  lat: number;
  lng: number;
  /** ISO 8601 */
  timestamp: string;
  engineHours: number;
  odometerKm: number;
  speedKph: number;
}

export interface TelemetrySource {
  /**
   * Streams raw, possibly-ambiguous pings for one truck. A real vendor
   * implementation (Samsara/Geotab/etc.) and the simulator both implement
   * this same interface, so swapping one for the other touches only this
   * seam, not the trip-cycle or dashboard code that consumes it.
   */
  streamPings(truckId: string): AsyncIterable<GpsPing>;
}
