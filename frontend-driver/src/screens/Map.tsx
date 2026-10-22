import { useState } from 'react';
import type { AppCtx } from '../types';

const HAZARDS = [
  {
    icon: '🌧️',
    title: 'Heavy Rain',
    location: 'Route 40, near Exit 12',
    note: 'Reduce speed, low visibility',
    color: 'var(--accent)',
    pin: { top: '27%', left: '38%' },
  },
  {
    icon: '🚧',
    title: 'Road Closure',
    location: 'King Fahd Rd, Section 4',
    note: 'Detour via Al Olaya St',
    color: 'var(--orange)',
    pin: { top: '52%', left: '62%' },
  },
  {
    icon: '🌪️',
    title: 'Sandstorm Warning',
    location: 'Dammam Exit, Eastbound',
    note: 'Visibility below 200m',
    color: 'var(--red)',
    pin: { top: '68%', left: '28%' },
  },
];

export default function MapScreen({ ctx }: { ctx: AppCtx }) {
  const [filters, setFilters] = useState({ myroute: true, geo: true, all: false });
  const [hazardsOpen, setHazardsOpen] = useState(false);

  function toggle(key: keyof typeof filters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="map-full">
      <div className="map-top-bar">
        <div className="glass-btn" onClick={() => ctx.navigate('trip')}>
          ←
        </div>
        <div className="glass-btn">🎯</div>
      </div>
      <div className="map-filters">
        <div className={`chip ${filters.myroute ? 'sel' : ''}`} style={{ fontSize: 11, padding: '6px 11px' }} onClick={() => toggle('myroute')}>
          {ctx.t('map_f_route')}
        </div>
        <div className={`chip ${filters.geo ? 'sel' : ''}`} style={{ fontSize: 11, padding: '6px 11px' }} onClick={() => toggle('geo')}>
          {ctx.t('map_f_geo')}
        </div>
        <div className={`chip ${filters.all ? 'sel' : ''}`} style={{ fontSize: 11, padding: '6px 11px' }} onClick={() => toggle('all')}>
          {ctx.t('map_f_all')}
        </div>
      </div>
      <div className="speed-badge">
        <div className="v">42</div>
        <div className="l">KM/H</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 110,
          right: 12,
          zIndex: 20,
          background: 'rgba(26,35,50,.9)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-md)',
          backdropFilter: 'blur(8px)',
          padding: '6px 11px',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        ⛅ 34°C · Riyadh
      </div>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: filters.myroute ? 1 : 0.08 }}>
        <path d="M 60 560 Q 150 400 190 300 T 280 150" stroke="#F59E0B" strokeWidth={3} strokeDasharray="7,7" fill="none" />
      </svg>
      <div className="truck-marker" />
      {filters.geo && (
        <>
          <div className="geofence-pin" style={{ top: '72%', left: '14%' }}>🟢</div>
          <div className="geofence-pin" style={{ top: '16%', left: '72%' }}>🔴</div>
          <div className="geofence-pin" style={{ top: '40%', left: '20%' }}>🔵</div>
        </>
      )}
      {filters.all && (
        <>
          <div className="geofence-pin" style={{ top: '30%', left: '60%', fontSize: 16 }}>🚛</div>
          <div className="geofence-pin" style={{ top: '55%', left: '75%', fontSize: 16 }}>🚛</div>
        </>
      )}
      {HAZARDS.map((hazard) => (
        <div
          key={hazard.title}
          className="geofence-pin"
          style={{ top: hazard.pin.top, left: hazard.pin.left, fontSize: 18 }}
        >
          ⚠️
        </div>
      ))}
      <div
        onClick={() => setHazardsOpen((v) => !v)}
        style={{
          position: 'absolute',
          bottom: 148,
          right: 12,
          zIndex: 25,
          background: 'var(--orange)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          padding: '9px 14px',
          borderRadius: 'var(--r-full)',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,.35)',
        }}
      >
        ⚠️ {HAZARDS.length} Hazards
      </div>
      {hazardsOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 128,
            left: 12,
            right: 12,
            zIndex: 23,
            maxHeight: '38vh',
            overflowY: 'auto',
            background: 'rgba(18,24,33,.97)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-lg)',
            backdropFilter: 'blur(12px)',
            padding: '12px 14px 14px',
          }}
        >
          <div className="section-label" style={{ margin: '0 0 10px' }}>
            {ctx.t('map_hazards_title')}
          </div>
          {HAZARDS.map((hazard) => (
            <div
              key={hazard.title}
              className="card"
              style={{
                borderLeft: `3px solid ${hazard.color}`,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                marginBottom: 8,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 18, flexShrink: 0 }}>{hazard.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{hazard.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{hazard.location}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{hazard.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="map-bottom-sheet">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="v">3.8 km</div>
            <div className="l">{ctx.t('map_dist')}</div>
          </div>
          <div className="stat-card">
            <div className="v">6 min</div>
            <div className="l">{ctx.t('map_eta')}</div>
          </div>
          <div className="stat-card">
            <div className="v">38 km/h</div>
            <div className="l">{ctx.t('map_avg')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
