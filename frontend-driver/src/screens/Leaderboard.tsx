import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx, LeaderboardEntry } from '../types';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}

export default function Leaderboard({ ctx }: { ctx: AppCtx }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/driver/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setRows(d.leaderboard ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <div>
          <h2>{ctx.t('lb_title')}</h2>
          <div className="tb-sub">{ctx.t('lb_sub')}</div>
        </div>
      </div>
      <div className="screen-body">
        <div className="seg-tabs">
          {(['week', 'month'] as const).map((p) => (
            <div key={p} className={`seg-tab ${period === p ? 'sel' : ''}`} onClick={() => setPeriod(p)}>
              {ctx.t(`lb_${p}`)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('lb_empty')}</p>}
          {rows.map((r) => {
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
            return (
              <div key={r.driverId} className={`lb-row ${r.isMe ? 'me' : ''}`}>
                <div className="lb-rank">{medal}</div>
                <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
                  {initials(r.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {r.isMe ? `${ctx.t('lb_you')} · ` : ''}
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.truckNumber ?? '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
                    {r.score} <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{ctx.t('lb_pts')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
