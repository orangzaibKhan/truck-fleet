import { useMemo, useState } from 'react';
import FleetMap, { type MapTruck } from '../FleetMap';
import type { TripStage, TruckData } from '../types';

// Colors per the dataviz skill's validated palette: the 4 real trip-cycle
// stages get fixed categorical slots 1-4; idle is muted ink (not a category -
// "nothing happening"); signal_lost is the reserved status-warning color,
// paired with an icon+label (never color alone), matching the map treatment.
const STAGE_COLOR: Record<TripStage, string> = {
  loading: 'var(--cat-1-blue)',
  loaded_travel: 'var(--cat-2-orange)',
  dumping: 'var(--cat-3-aqua)',
  empty_travel: 'var(--cat-4-yellow)',
  idle: 'var(--text-muted)',
  signal_lost: 'var(--status-warning)',
};

// Plain-language labels for a first-time, non-technical viewer.
const STAGE_LABEL: Record<TripStage, string> = {
  loading: 'Loading',
  loaded_travel: 'Driving (loaded)',
  dumping: 'Dumping',
  empty_travel: 'Driving (empty)',
  idle: 'Idle',
  signal_lost: 'Signal lost',
};

function minuteOf(ts: string, shiftStartMs: number): number {
  return (new Date(ts).getTime() - shiftStartMs) / 60000;
}

/** Position and status of one truck at a given scrub minute (instant-generation + playback, per the design review). */
function truckStateAt(truck: TruckData, scrubMinute: number): MapTruck {
  const shiftStartMs = new Date(truck.pings[0]?.timestamp ?? Date.now()).getTime();
  const relPings = truck.pings.map((p) => ({ ...p, minute: minuteOf(p.timestamp, shiftStartMs) }));

  let current = relPings[0];
  for (const p of relPings) {
    if (p.minute <= scrubMinute) current = p;
    else break;
  }

  const segment = truck.analysis.segments.find((s) => {
    const start = minuteOf(s.startTime, shiftStartMs);
    const end = minuteOf(s.endTime, shiftStartMs);
    return scrubMinute >= start && scrubMinute <= end;
  });

  const status: MapTruck['status'] =
    segment?.stage === 'signal_lost'
      ? 'signal_lost'
      : segment?.stage === 'idle'
        ? 'idle'
        : segment
          ? 'working'
          : 'available';

  return {
    truckId: truck.truckId,
    truckNumber: truck.truckNumber,
    lat: current?.lat ?? 24.7136,
    lng: current?.lng ?? 46.6753,
    status,
    signalLostMinutesAgo:
      segment?.stage === 'signal_lost' ? scrubMinute - minuteOf(segment.startTime, shiftStartMs) : undefined,
  };
}

function shiftDurationMinutes(truck: TruckData): number {
  if (truck.pings.length < 2) return 0;
  const start = new Date(truck.pings[0].timestamp).getTime();
  const end = new Date(truck.pings[truck.pings.length - 1].timestamp).getTime();
  return (end - start) / 60000;
}

export default function Dashboard({ trucks }: { trucks: TruckData[] }) {
  const [scrubMinute, setScrubMinute] = useState(0);
  const [selectedTruckId, setSelectedTruckId] = useState<string>(trucks[0]?.truckId ?? '');

  const maxMinute = useMemo(() => Math.max(...trucks.map(shiftDurationMinutes)), [trucks]);

  const mapTrucks = trucks.map((t) => truckStateAt(t, scrubMinute));
  const statusCounts = mapTrucks.reduce(
    (acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const selectedTruck = trucks.find((t) => t.truckId === selectedTruckId) ?? trucks[0];
  const maintenanceAlerts = trucks.filter((t) => t.maintenance.status !== 'ok');

  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        3 trucks, Riyadh area (simulated data). Drag the slider below to see what each truck did during a shift.
      </p>

      {/* 1. Fleet status summary - first in the hierarchy, per the design review */}
      <section className="status-grid">
        {(['working', 'idle', 'signal_lost', 'available'] as const).map((status) => (
          <div key={status} className="status-card">
            <div className="value">{statusCounts[status] ?? 0}</div>
            <div className="label-sm" style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</div>
          </div>
        ))}
      </section>

      {/* Playback control - instant generation + scrub, per the design review (not real-time streaming) */}
      <section style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Playback: minute {Math.round(scrubMinute)} of {Math.round(maxMinute)}
        </label>
        <input
          type="range"
          min={0}
          max={maxMinute}
          step={0.5}
          value={scrubMinute}
          onChange={(e) => setScrubMinute(Number(e.target.value))}
          className="scrub-input"
        />
      </section>

      {/* 2. Map */}
      <section className="map-section">
        <FleetMap trucks={mapTrucks} center={[24.7386, 46.7003]} />
      </section>

      {/* Truck selector */}
      <section className="truck-tabs">
        {trucks.map((t) => (
          <button
            key={t.truckId}
            onClick={() => setSelectedTruckId(t.truckId)}
            className="truck-tab"
            style={{ background: t.truckId === selectedTruckId ? 'var(--cat-1-blue)' : 'var(--surface-1)' }}
          >
            {t.truckNumber}
          </button>
        ))}
      </section>

      {/* 3. Selected truck: trip-cycle timeline + utilization numbers */}
      {selectedTruck && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15 }}>{selectedTruck.truckNumber} - Trip Cycle</h2>
          <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            {selectedTruck.analysis.segments.map((seg, i) => (
              <div
                key={i}
                title={`${seg.stage} (${seg.durationMinutes.toFixed(1)} min)`}
                style={{ flexGrow: seg.durationMinutes, background: STAGE_COLOR[seg.stage], opacity: 0.9 }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            {Object.entries(STAGE_COLOR).map(([stage, color]) => (
              <span key={stage}>
                <span
                  style={{ display: 'inline-block', width: 10, height: 10, background: color, marginRight: 4, borderRadius: 2 }}
                />
                {STAGE_LABEL[stage as TripStage]}
              </span>
            ))}
          </div>

          <div className="stats-row">
            <Stat label="Utilization" value={`${selectedTruck.analysis.utilizationPct.toFixed(0)}%`} />
            <Stat label="Trips" value={String(selectedTruck.analysis.tripsCount)} />
            <Stat
              label="Avg trip time"
              value={
                selectedTruck.analysis.avgCycleTimeMinutes != null
                  ? `${selectedTruck.analysis.avgCycleTimeMinutes.toFixed(0)} min`
                  : '-'
              }
            />
            <Stat label="Distance" value={`${selectedTruck.analysis.totalDistanceKm.toFixed(1)} km`} />
          </div>
        </section>
      )}

      {/* 4. Maintenance alerts - empty state is a feature, per the design review.
          Status color always paired with an icon + label, never color alone. */}
      <section>
        <h2 style={{ fontSize: 15 }}>Maintenance Alerts</h2>
        {maintenanceAlerts.length === 0 ? (
          <p style={{ color: 'var(--status-good)' }}>&#10003; No maintenance issues right now.</p>
        ) : (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {maintenanceAlerts.map((t) => (
              <li
                key={t.truckId}
                style={{ color: t.maintenance.status === 'overdue' ? 'var(--status-critical)' : 'var(--status-warning)', marginBottom: 4 }}
              >
                {t.maintenance.status === 'overdue' ? '⛔' : '⚠️'} {t.truckNumber}:{' '}
                {t.maintenance.status === 'overdue' ? 'overdue for service' : 'service due soon'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="label-sm">{label}</div>
    </div>
  );
}
