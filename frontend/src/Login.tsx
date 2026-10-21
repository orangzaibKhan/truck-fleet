import { useState } from 'react';
import { apiFetch, setSession, type AuthUser } from './auth';

export default function Login({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      setSession(data.token, data.user);
      onLoggedIn(data.user);
    } catch {
      setError('Could not reach the backend - is it running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 32 }}>
        <h1 style={{ fontSize: 20, marginTop: 0, marginBottom: 4 }}>Fleet Monitor</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          Sign in to view your fleet.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <label className="label-sm" style={{ display: 'block', margin: '16px 0 4px' }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && (
            <p style={{ color: 'var(--status-critical)', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 24,
              width: '100%',
              minHeight: 44,
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'var(--cat-1-blue)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-2)',
  color: 'var(--text-primary)',
  fontSize: 15,
};
