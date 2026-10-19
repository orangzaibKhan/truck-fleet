import { useEffect, useState } from 'react';
import { apiFetch, type AuthUser } from '../auth';

interface UserRow {
  id: string;
  email: string;
  role: AuthUser['role'];
  created_at: string;
}

const ROLES: AuthUser['role'][] = ['customer_admin', 'fleet_manager', 'viewer'];

const fieldStyle: React.CSSProperties = {
  minHeight: 40,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-2)',
  color: 'var(--text-primary)',
  padding: '0 10px',
};

export default function Admin({ currentUser }: { currentUser: AuthUser }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AuthUser['role']>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    const res = await apiFetch('/api/users');
    if (res.ok) setUsers((await res.json()).users);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ email, password, role }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create user');
        return;
      }
      setEmail('');
      setPassword('');
      setRole('viewer');
      await loadUsers();
    } finally {
      setSubmitting(false);
    }
  }

  const canCreateAdmins = currentUser.role === 'super_admin' || currentUser.role === 'customer_admin';

  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Admin - Users</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        Manage users for your organization.
      </p>

      {users === null ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr className="label-sm" style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Email</th>
                <th style={{ padding: '10px 12px' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td style={{ padding: '10px 12px' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canCreateAdmins && (
        <form onSubmit={handleCreate} className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
              Email
            </label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
              Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
              Role
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value as AuthUser['role'])} style={fieldStyle}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
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
            Add user
          </button>
          {error && <p style={{ color: 'var(--status-critical)', fontSize: 13, margin: 0, flexBasis: '100%' }}>{error}</p>}
        </form>
      )}
    </>
  );
}
