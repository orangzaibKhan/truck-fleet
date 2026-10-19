/**
 * Maintenance-due alerts wired to simulated engine-hours, per the design
 * doc's M0/M1 success criteria. `totalEngineHours` is the truck's
 * accumulated engine hours BEFORE this shift (a seeded baseline) plus the
 * hours this shift itself adds (from the trip-cycle analysis).
 */
export type MaintenanceStatus = 'ok' | 'due' | 'overdue';

export const DUE_AFTER_ENGINE_HOURS = 250;
export const OVERDUE_AFTER_ENGINE_HOURS = 300;

export function computeMaintenanceStatus(totalEngineHours: number): MaintenanceStatus {
  if (totalEngineHours >= OVERDUE_AFTER_ENGINE_HOURS) return 'overdue';
  if (totalEngineHours >= DUE_AFTER_ENGINE_HOURS) return 'due';
  return 'ok';
}
