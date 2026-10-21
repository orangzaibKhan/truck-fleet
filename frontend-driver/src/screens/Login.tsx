import { useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

export default function Login({
  ctx,
  onLoggedIn,
}: {
  ctx: AppCtx;
  onLoggedIn: (token: string, driver: { driverId: string; name: string; employeeId: string }) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/driver/login', {
        method: 'POST',
        body: JSON.stringify({ employeeId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ctx.t('toast_login_error'));
        return;
      }
      onLoggedIn(data.token, data.driver);
    } catch {
      setError(ctx.t('toast_network_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">🚛</div>
      <h1>{ctx.t('login_title')}</h1>
      <p>{ctx.t('login_sub')}</p>
      <div className="lang-pill-row">
        <div className={`chip ${ctx.lang === 'en' ? 'sel' : ''}`} onClick={() => ctx.setLang('en')}>
          EN
        </div>
        <div className={`chip ${ctx.lang === 'ar' ? 'sel' : ''}`} onClick={() => ctx.setLang('ar')}>
          AR
        </div>
      </div>
      <form onSubmit={submit}>
        <input
          className="input"
          placeholder={ctx.t('login_id')}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          required
        />
        <input
          className="input"
          type="password"
          placeholder={ctx.t('login_pass')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading && <span className="spinner" />}
          <span style={{ opacity: loading ? 0.5 : 1 }}>{ctx.t('login_btn')}</span>
        </button>
      </form>
    </div>
  );
}
