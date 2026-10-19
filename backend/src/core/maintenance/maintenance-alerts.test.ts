import { describe, expect, test } from 'bun:test';
import {
  computeMaintenanceStatus,
  DUE_AFTER_ENGINE_HOURS,
  OVERDUE_AFTER_ENGINE_HOURS,
} from './maintenance-alerts';

describe('computeMaintenanceStatus', () => {
  test('ok below the due threshold', () => {
    expect(computeMaintenanceStatus(0)).toBe('ok');
    expect(computeMaintenanceStatus(DUE_AFTER_ENGINE_HOURS - 0.01)).toBe('ok');
  });

  test('due at and above the due threshold, below overdue', () => {
    expect(computeMaintenanceStatus(DUE_AFTER_ENGINE_HOURS)).toBe('due');
    expect(computeMaintenanceStatus(OVERDUE_AFTER_ENGINE_HOURS - 0.01)).toBe('due');
  });

  test('overdue at and above the overdue threshold', () => {
    expect(computeMaintenanceStatus(OVERDUE_AFTER_ENGINE_HOURS)).toBe('overdue');
    expect(computeMaintenanceStatus(OVERDUE_AFTER_ENGINE_HOURS + 100)).toBe('overdue');
  });
});
