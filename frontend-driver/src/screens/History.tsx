import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx, HistoryData } from '../types';

export default function History({ ctx }: { ctx: AppCtx }) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<HistoryData | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/driver/history?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [period]);

  const bonus = data ? Math.round(data.score * 4.5) : 0;

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('profile')}>
          ←
        </div>
        <h2>{ctx.t('hist_title')}</h2>
      </div>
      <div className="screen-body">
        <div className="seg-tabs">
          {(['today', 'week', 'month'] as const).map((p) => (
            <div key={p} className={`seg-tab ${period === p ? 'sel' : ''}`} onClick={() => setPeriod(p)}>
              {ctx.t(`hist_${p}`)}
            </div>
          ))}
        </div>

        <div className="perf-score-card" style={{ marginTop: 16 }}>
          <div className="score">
            {data?.score ?? 100}
            <span>/100</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ctx.t('hist_perf_label')}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 10 }}>
            💰 {ctx.t('hist_bonus_label')} SAR {bonus}
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 12 }}>
          <div className="stat-card">
            <div className="v">{data?.trips ?? 0}</div>
            <div className="l">{ctx.t('hist_trips')}</div>
          </div>
          <div className="stat-card">
            <div className="v">{(data?.distanceKm ?? 0).toFixed(1)} km</div>
            <div className="l">{ctx.t('hist_dist')}</div>
          </div>
          <div className="stat-card">
            <div className="v">{data?.hoursActive ?? 0}h</div>
            <div className="l">{ctx.t('hist_hours')}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {!data || data.tripList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('hist_no_trips')}</p>
          ) : (
            data.tripList.map((t) => (
              <div key={t.id} className={`trip-hist-item ${openId === t.id ? 'open' : ''}`} onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                <div className="trip-hist-head">
                  <div>
                    <div className="trip-hist-route">{t.distanceKm} km trip</div>
                    <div className="trip-hist-meta">
                      {new Date(t.startedAt).toLocaleTimeString()} – {new Date(t.completedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="badge badge-green">{ctx.t('st_completed')}</span>
                </div>
                <div className="trip-hist-detail">
                  <div className="trip-hist-detail-in">
                    <div className="thd-stat">
                      <div className="v">{t.distanceKm}</div>
                      <div className="l">km</div>
                    </div>
                    <div className="thd-stat">
                      <div className="v">{new Date(t.startedAt).toLocaleDateString()}</div>
                      <div className="l">Date</div>
                    </div>
                    <div className="thd-stat">
                      <div className="v">{new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="l">Done</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
