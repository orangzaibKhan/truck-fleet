import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

function fmtTime(s: number): string {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export default function Home({ ctx }: { ctx: AppCtx }) {
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const home = ctx.home;

  useEffect(() => {
    if (!home?.shiftActive || !home.shiftStartedAt) {
      setElapsed(0);
      return;
    }
    const startedMs = new Date(home.shiftStartedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [home?.shiftActive, home?.shiftStartedAt]);

  async function handleShiftButton() {
    if (!home) return;
    if (home.shiftActive) {
      ctx.openHandover();
      return;
    }
    setStarting(true);
    try {
      const res = await apiFetch('/api/driver/shift/start', { method: 'POST' });
      if (res.ok) {
        if (!ctx.isOnline) ctx.queueOffline();
        else ctx.toast(ctx.t('toast_shift_started'));
        await ctx.refreshHome();
      } else {
        const data = await res.json().catch(() => ({}));
        ctx.toast(data.error ?? ctx.t('toast_network_error'));
      }
    } catch {
      ctx.queueOffline();
    } finally {
      setStarting(false);
    }
  }

  if (!home) {
    return (
      <div className="screen-body">
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  const quickActions: { key: string; icon: string; label: string }[] = [
    { key: 'inspection', icon: '📋', label: ctx.t('qa_inspect') },
    { key: 'breakdown', icon: '🔧', label: ctx.t('qa_breakdown') },
    { key: 'map', icon: '🗺️', label: ctx.t('qa_map') },
    { key: 'accident', icon: '🚨', label: ctx.t('qa_accident') },
    { key: 'chat', icon: '💬', label: ctx.t('qa_chat') },
    { key: 'history', icon: '📜', label: ctx.t('qa_history') },
    { key: 'fuel', icon: '⛽', label: ctx.t('qa_fuel') },
    { key: 'leaderboard', icon: '🏆', label: ctx.t('qa_leaderboard') },
    { key: 'workshop', icon: '⚙️', label: ctx.t('qa_workshop') },
  ];

  return (
    <div className="screen-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="greet">
            {ctx.lang === 'ar' ? `مرحبًا، ${home.driver.name}` : `Welcome, ${home.driver.name}`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ctx.t('home_date')}</div>
        </div>
        <div className="avatar">
          {home.driver.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')}
        </div>
      </div>

      <div className="truck-card">
        {home.truck ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{home.truck.truckNumber}</div>
              {home.truck.capacityTons && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⚖️ {home.truck.capacityTons} Tons</div>
              )}
            </div>
            <span className="badge badge-green">{ctx.t('home_available')}</span>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No truck assigned yet.</p>
        )}
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={starting || !home.truck} onClick={handleShiftButton}>
          {home.shiftActive ? ctx.t('home_end_shift') : ctx.t('home_start_shift')}
        </button>
        {home.shiftActive && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            {fmtTime(elapsed)}
          </div>
        )}
      </div>

      <div className="section-label">{ctx.t('home_summary')}</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="v">{home.today.trips}</div>
          <div className="l">{ctx.t('home_trips')}</div>
        </div>
        <div className="stat-card">
          <div className="v">{home.today.distanceKm.toFixed(1)} km</div>
          <div className="l">{ctx.t('home_distance')}</div>
        </div>
        <div className="stat-card">
          <div className="v">{home.safetyScore}%</div>
          <div className="l">{ctx.t('home_score')}</div>
        </div>
      </div>

      <div className="section-label">{ctx.t('home_quick')}</div>
      <div className="quick-grid">
        {quickActions.map((qa) => (
          <div key={qa.key} className="qa-item" onClick={() => ctx.navigate(qa.key as never)}>
            <span className="ic">{qa.icon}</span>
            <span>{qa.label}</span>
          </div>
        ))}
      </div>

      <div className="section-label">{ctx.t('home_recent')}</div>
      <div className="card">
        {home.recentActivity.lastTripCompletedAt ? (
          <div className="list-item">
            <span>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ctx.t('act_trip')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {new Date(home.recentActivity.lastTripCompletedAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : null}
        {home.recentActivity.lastInspection ? (
          <div className="list-item">
            <span>{home.recentActivity.lastInspection.hasFail ? '⚠️' : '📋'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ctx.t('act_insp')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {new Date(home.recentActivity.lastInspection.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : null}
        {!home.recentActivity.lastTripCompletedAt && !home.recentActivity.lastInspection && (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('act_none')}</p>
        )}
      </div>
    </div>
  );
}
