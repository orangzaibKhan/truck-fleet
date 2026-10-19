import { useState } from 'react';
import InstallButton from './InstallButton';
import { API_BASE } from './auth';

interface DemoFormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  fleetSize: string;
}

const EMPTY_FORM: DemoFormState = { name: '', email: '', company: '', phone: '', fleetSize: '' };

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [form, setForm] = useState<DemoFormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          phone: form.phone || undefined,
          fleetSize: form.fleetSize || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong - please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Could not reach the server - please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  const field = (key: keyof DemoFormState, placeholder: string, required = true, type = 'text') => (
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      style={{
        width: '100%',
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-2)',
        color: 'var(--text-primary)',
        fontSize: 15,
        marginBottom: 10,
      }}
    />
  );

  return (
    <div>
      {/* Top bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontWeight: 650, fontSize: 18 }}>Fleet Monitor</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <InstallButton className="truck-tab" style={{ background: 'var(--surface-1)' }} />
          <button
            onClick={onSignIn}
            className="truck-tab"
            style={{ background: 'var(--surface-1)' }}
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, lineHeight: 1.2, marginBottom: 16 }}>
          See every truck on one screen.
          <br />
          Catch problems before they cost you.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 32px' }}>
          Know which trucks are working, which are stuck, and which need service - without
          calling every driver or digging through paper logs.
        </p>
      </section>

      {/* Problem/value - plain language, 3 simple points */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { title: 'Stop wasting fuel on idle trucks', body: 'See exactly how much time each truck spends working vs. sitting still, every day.' },
          { title: 'Never miss a service date', body: 'Get warned before maintenance is overdue - not after a truck breaks down on site.' },
          { title: "Know when a truck's signal drops", body: "A truck that stops reporting shows up clearly - it never just silently disappears." },
        ].map((item) => (
          <div key={item.title} className="card" style={{ flex: '1 1 280px' }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>{item.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>{item.body}</p>
          </div>
        ))}
      </section>

      {/* Pricing - simple, plain tiers */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <h2 style={{ fontSize: 22, textAlign: 'center', marginBottom: 24 }}>Simple pricing per truck</h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { name: 'Standard', price: 'Contact us', features: ['Live map & trip tracking', 'Maintenance alerts', 'Up to 10 users'] },
            { name: 'Premium', price: 'Contact us', features: ['Everything in Standard', 'Full reporting', 'Unlimited users'] },
          ].map((tier) => (
            <div key={tier.name} className="card" style={{ flex: '0 1 260px', textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, marginTop: 0 }}>{tier.name}</h3>
              <div style={{ fontSize: 22, fontWeight: 650, marginBottom: 16 }}>{tier.price}</div>
              <ul style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 14, paddingLeft: 20 }}>
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Demo request form */}
      <section style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 64px' }}>
        <div className="card" style={{ padding: 32 }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 18 }}>Thanks - we'll be in touch.</h2>
              <p style={{ color: 'var(--text-muted)' }}>We received your request and will reach out shortly.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, marginTop: 0 }}>Request a demo</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 0, marginBottom: 16 }}>
                Tell us about your fleet and we'll set up a short walkthrough.
              </p>
              <form onSubmit={handleSubmit}>
                {field('name', 'Your name')}
                {field('email', 'Work email', true, 'email')}
                {field('company', 'Company name')}
                {field('phone', 'Phone (optional)', false)}
                {field('fleetSize', 'How many trucks? (optional)', false)}
                {error && <p style={{ color: 'var(--status-critical)', fontSize: 13 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
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
                  {submitting ? 'Sending...' : 'Request a demo'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
