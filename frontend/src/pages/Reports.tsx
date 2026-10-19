import type { TruckData } from '../types';

export default function Reports({ trucks }: { trucks: TruckData[] }) {
  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Reports</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        Utilization and trip-cycle summary for this simulated shift - computed from real trip-cycle
        detection, not placeholder numbers. Fuel/cost reporting isn't built yet (no real fuel data exists
        in this prototype).
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr className="label-sm" style={{ textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Truck</th>
              <th style={{ padding: '10px 12px' }}>Trips</th>
              <th style={{ padding: '10px 12px' }}>Avg cycle time</th>
              <th style={{ padding: '10px 12px' }}>Working hours</th>
              <th style={{ padding: '10px 12px' }}>Available hours</th>
              <th style={{ padding: '10px 12px' }}>Utilization</th>
              <th style={{ padding: '10px 12px' }}>Distance</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((t) => (
              <tr key={t.truckId} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.truckNumber}</td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{t.analysis.tripsCount}</td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.analysis.avgCycleTimeMinutes != null ? `${t.analysis.avgCycleTimeMinutes.toFixed(0)} min` : '-'}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.analysis.workingHours.toFixed(2)}h
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.analysis.availableHours.toFixed(2)}h
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
