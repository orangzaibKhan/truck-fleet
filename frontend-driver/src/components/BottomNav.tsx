import type { AppCtx, Screen } from '../types';

export default function BottomNav({ ctx, current, unreadChat }: { ctx: AppCtx; current: Screen; unreadChat: boolean }) {
  const items: { key: Screen; icon: string; label: string }[] = [
    { key: 'home', icon: '🏠', label: ctx.t('nav_home') },
    { key: 'trip', icon: '🚛', label: ctx.t('nav_trip') },
    { key: 'map', icon: '🗺️', label: ctx.t('nav_map') },
    { key: 'notifications', icon: '🔔', label: ctx.t('nav_alerts') },
    { key: 'profile', icon: '👤', label: ctx.t('nav_profile') },
  ];
  return (
    <div className="bottom-nav">
      {items.map((it) => (
        <button key={it.key} className={`nav-item ${current === it.key ? 'on' : ''}`} onClick={() => ctx.navigate(it.key)}>
          <span className="ic">{it.icon}</span>
          <span>{it.label}</span>
          {it.key === 'trip' && unreadChat && <span className="nb" />}
        </button>
      ))}
    </div>
  );
}
