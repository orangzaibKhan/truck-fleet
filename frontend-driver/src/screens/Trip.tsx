import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

const STAGES = ['loading', 'traveling', 'dumping', 'returning'] as const;
const STAGE_LABEL_KEYS = ['st_loading', 'st_traveling', 'st_dumping', 'st_returning'];
const ACTION_LABEL_KEYS = ['trip_action_loading', 'trip_action_traveling', 'trip_action_dumping', 'trip_action_returning'];

function fmtTime(s: number): string {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export default function Trip({ ctx, unreadChat }: { ctx: AppCtx; unreadChat: boolean }) {
  const [trip, setTrip] = useState<{ id: string; stageIndex: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [recentTrips, setRecentTrips] = useState<{ id: string; startedAt: string; completedAt: string; distanceKm: number }[]>(
    [],
  );

  useEffect(() => {
    if (!trip) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [trip?.id]);

  async function loadHistory() {
    try {
      const res = await apiFetch('/api/driver/history?period=today');
      if (res.ok) {
        const data = await res.json();
        setRecentTrips(data.tripList ?? []);
      }
    } catch {
      /* non-critical for this view */
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function startTrip() {
    setStarting(true);
    try {
      const res = await apiFetch('/api/driver/trip/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTrip({ id: data.trip.id, stageIndex: 0 });
      } else {
        ctx.toast(data.error ?? ctx.t('toast_network_error'));
      }
    } catch {
      ctx.toast(ctx.t('toast_network_error'));
    } finally {
      setStarting(false);
    }
  }

  async function advance() {
    if (!trip) return;
    try {
      const res = await apiFetch('/api/driver/trip/advance', {
        method: 'POST',
        body: JSON.stringify({ tripId: trip.id, distanceKm: 3.8 }),
      });
      const data = await res.json();
      if (res.ok && data.stage === 'completed') {
        ctx.toast(ctx.t('toast_trip_completed'));
        setTrip(null);
        ctx.refreshHome();
        loadHistory();
      } else if (res.ok) {
        setTrip((prev) => (prev ? { ...prev, stageIndex: prev.stageIndex + 1 } : prev));
      } else {
        ctx.toast(data.error ?? ctx.t('toast_network_error'));
      }
    } catch {
      ctx.queueOffline();
    }
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <h2>{ctx.t('trip_title')}</h2>
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <div className="glass-btn" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }} onClick={() => ctx.navigate('chat')}>
            💬
          </div>
          {unreadChat && <span className="nb" style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--bg-surface)' }} />}
        </div>
      </div>
      <div className="screen-body">
        {!trip ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{ctx.t('trip_none_active')}</p>
            <button className="btn btn-primary" disabled={starting} onClick={startTrip}>
              {ctx.t('trip_start')}
            </button>
          </div>
        ) : (
          <>
            <div className="stepper">
              <div className="step-line" />
              {STAGE_LABEL_KEYS.map((key, i) => (
                <div key={key} className={`step ${i < trip.stageIndex ? 'done' : ''} ${i === trip.stageIndex ? 'active' : ''}`}>
                  <div className="dotc">{i < trip.stageIndex ? '✓' : i + 1}</div>
                  <span>{ctx.t(key)}</span>
                </div>
              ))}
            </div>
            <div className="map-placeholder">🗺️ <span style={{ marginLeft: 6 }}>{ctx.t('trip_map_ph')}</span></div>
            <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginBottom: 14 }}>
              {fmtTime(elapsed)}
            </div>
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card">
                <div className="v">3.8 km</div>
                <div className="l">{ctx.t('trip_dist')}</div>
              </div>
              <div className="stat-card">
                <div className="v">30T</div>
                <div className="l">{ctx.t('trip_load')}</div>
              </div>
              <div className="stat-card">
                <div className="v">{STAGES[trip.stageIndex]}</div>
                <div className="l">Stage</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={advance}>
              {ctx.t(ACTION_LABEL_KEYS[trip.stageIndex])}
            </button>
          </>
        )}

        <div className="section-label">{ctx.t('trip_today')}</div>
        <div className="card">
          {recentTrips.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('hist_no_trips')}</p>}
          {recentTrips.map((t) => (
            <div key={t.id} className="list-item">
              <span>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.distanceKm} km</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {new Date(t.startedAt).toLocaleTimeString()} – {new Date(t.completedAt).toLocaleTimeString()}
                </div>
              </div>
              <span className="badge badge-green">{ctx.t('st_completed')}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
