import type { AppCtx } from '../types';

export default function Notifications({ ctx }: { ctx: AppCtx }) {
  const home = ctx.home;
  const today: { icon: string; title: string; body: string }[] = [];
  const earlier: { icon: string; title: string; body: string }[] = [];

  if (home?.recentActivity.lastInspection) {
    const insp = home.recentActivity.lastInspection;
    const entry = {
      icon: insp.hasFail ? '⚠️' : '✅',
      title: insp.hasFail ? ctx.t('insp_crit') : 'Inspection Approved',
      body: new Date(insp.createdAt).toLocaleString(),
    };
    (isToday(insp.createdAt) ? today : earlier).push(entry);
  }
  if (home?.recentActivity.lastTripCompletedAt) {
    const entry = { icon: '🚛', title: ctx.t('act_trip'), body: new Date(home.recentActivity.lastTripCompletedAt).toLocaleString() };
    (isToday(home.recentActivity.lastTripCompletedAt) ? today : earlier).push(entry);
  }
  today.push({ icon: '🔧', title: ctx.t('alert1_t'), body: ctx.t('alert1_b') });

  function isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
  }

  return (
    <>
      <div className="top-bar">
        <h2>{ctx.t('not_title')}</h2>
      </div>
      <div className="screen-body">
        <div className="section-label">{ctx.t('not_today')}</div>
        <div className="card">
          {today.map((n, i) => (
            <div key={i} className="list-item">
              <span>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{n.body}</div>
              </div>
            </div>
          ))}
        </div>
        {earlier.length > 0 && (
          <>
            <div className="section-label">{ctx.t('not_earlier')}</div>
            <div className="card">
              {earlier.map((n, i) => (
                <div key={i} className="list-item">
                  <span>{n.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
