import { useState } from 'react';
import type { AppCtx } from '../types';

export default function MapScreen({ ctx }: { ctx: AppCtx }) {
  const [filters, setFilters] = useState({ myroute: true, geo: true, all: false });

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
