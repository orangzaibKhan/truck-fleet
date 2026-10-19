import type { TruckData } from '../types';

const STATUS_LABEL: Record<TruckData['currentStatus'], string> = {
  working: 'Working',
  idle: 'Idle',
  signal_lost: 'Signal lost',
  available: 'Available',
};

export default function Trucks({ trucks }: { trucks: TruckData[] }) {
  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Trucks</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        Fleet & truck management - current status and maintenance for this shift.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr className="label-sm" style={{ textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Truck</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Maintenance</th>
              <th style={{ padding: '10px 12px' }}>Utilization</th>
              <th style={{ padding: '10px 12px' }}>Distance</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((t) => (
              <tr key={t.truckId} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.truckNumber}</td>
                <td style={{ padding: '10px 12px' }}>{STATUS_LABEL[t.currentStatus]}</td>
                <td
                  style={{
                    padding: '10px 12px',
                    color:
                      t.maintenance.status === 'overdue'
                        ? 'var(--status-critical)'
                        : t.maintenance.status === 'due'
                          ? 'var(--status-warning)'
                          : 'var(--status-good)',
                  }}
                >
                  {t.maintenance.status === 'ok'
                    ? '✓ OK'
                    : t.maintenance.status === 'due'
                      ? 'Service due soon'
                      : 'Overdue for service'}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.analysis.utilizationPct.toFixed(0)}%
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.analysis.totalDistanceKm.toFixed(1)} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
