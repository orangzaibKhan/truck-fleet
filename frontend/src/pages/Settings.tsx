import { useState } from 'react';
import { apiFetch, type AuthUser } from '../auth';

export default function Settings({ user }: { user: AuthUser }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? 'Could not change password', ok: false });
        return;
      }
      setMessage({ text: 'Password changed.', ok: true });
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 40,
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border-hairline)',
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    padding: '0 10px',
  };

  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Settings</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>Your account.</p>

      <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <div className="label-sm">Email</div>
        <div style={{ marginBottom: 12 }}>{user.email}</div>
        <div className="label-sm">Role</div>
        <div>{user.role}</div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Change password</h2>
        <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
          Current password
        </label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 12 }}
        />
        <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
          New password (min 8 chars)
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={fieldStyle}
        />
        {message && (
          <p style={{ color: message.ok ? 'var(--status-good)' : 'var(--status-critical)', fontSize: 13, marginBottom: 0 }}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 16,
            minHeight: 40,
            padding: '0 20px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: 'var(--cat-1-blue)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Update password
        </button>
      </form>
    </>
  );
}
