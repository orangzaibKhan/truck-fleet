import type { AppCtx } from '../types';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}

export default function Profile({ ctx }: { ctx: AppCtx }) {
  const name = ctx.home?.driver.name ?? '';

  return (
    <>
      <div className="top-bar">
        <h2>{ctx.t('prof_title')}</h2>
      </div>
      <div className="screen-body">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="avatar" style={{ width: 58, height: 58, fontSize: 20 }}>
            {initials(name)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{name}</div>
            <span className="badge badge-blue">{ctx.t('prof_license')}</span>
          </div>
        </div>

        <div className="section-label">{ctx.t('prof_account')}</div>
        <div className="card">
          <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => ctx.navigate('history')}>
            <span>📜</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('prof_history')}</div>
            <span>›</span>
          </div>
          <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => ctx.navigate('leaderboard')}>
            <span>🏆</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('qa_leaderboard')}</div>
            <span>›</span>
          </div>
        </div>

        <div className="section-label">{ctx.t('prof_prefs')}</div>
        <div className="card">
          <div className="list-item">
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('prof_lang')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div className={`chip ${ctx.lang === 'en' ? 'sel' : ''}`} style={{ padding: '5px 11px', fontSize: 11 }} onClick={() => ctx.setLang('en')}>
                EN
              </div>
              <div className={`chip ${ctx.lang === 'ar' ? 'sel' : ''}`} style={{ padding: '5px 11px', fontSize: 11 }} onClick={() => ctx.setLang('ar')}>
                AR
              </div>
            </div>
          </div>
          <div className="list-item">
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('prof_dark')}</div>
            <div className={`toggle-switch ${ctx.theme === 'dark' ? 'on' : ''}`} onClick={ctx.toggleTheme}>
              <div className="knob" />
            </div>
          </div>
        </div>

        <div className="section-label">{ctx.t('prof_support')}</div>
        <div className="card">
          <div className="list-item">
            <span>❓</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('prof_help')}</div>
            <span>›</span>
          </div>
        </div>

        <button className="btn btn-secondary" style={{ marginTop: 18, color: 'var(--red)' }} onClick={ctx.logout}>
          {ctx.t('prof_logout')}
        </button>
      </div>
    </>
  );
}
