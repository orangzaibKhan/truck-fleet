import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';

interface DriverRow {
  id: string;
  name: string;
  created_at: string;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<DriverRow[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadDrivers() {
    const res = await apiFetch('/api/drivers');
    if (res.ok) setDrivers((await res.json()).drivers);
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/drivers', { method: 'POST', body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create driver');
        return;
      }
      setName('');
      await loadDrivers();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Drivers</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        Driver roster for this fleet. The driver-facing mobile app itself is deferred (see TODOS.md) -
        this is an admin-side list only.
      </p>

      {drivers === null ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading drivers...</p>
      ) : drivers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No drivers yet - add one below.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr className="label-sm" style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td style={{ padding: '10px 12px' }}>{d.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
            Driver name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              minHeight: 40,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              padding: '0 10px',
            }}
          />
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
          Add driver
        </button>
        {error && <p style={{ color: 'var(--status-critical)', fontSize: 13, margin: 0 }}>{error}</p>}
      </form>
    </>
  );
}
