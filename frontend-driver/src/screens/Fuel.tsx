import { useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

export default function Fuel({ ctx }: { ctx: AppCtx }) {
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('2.18');
  const [station, setStation] = useState<number | null>(null);
  const [payment, setPayment] = useState<number | null>(null);
  const [photos, setPhotos] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const total = (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);
  const truckLabel = ctx.home?.truck?.truckNumber ?? '—';

  async function submit() {
    if (!liters || !pricePerLiter || station === null || payment === null) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/driver/fuel', {
        method: 'POST',
        body: JSON.stringify({
          liters: parseFloat(liters),
          pricePerLiter: parseFloat(pricePerLiter),
          station: ctx.tList('fuel_stations')[station],
          paymentMethod: ctx.tList('fuel_payments')[payment],
        }),
      });
      if (res.ok) {
        if (!ctx.isOnline) ctx.queueOffline();
        else ctx.toast(ctx.t('toast_fuel_submitted'));
      } else if (!ctx.isOnline) {
        ctx.queueOffline();
      } else {
        ctx.toast(ctx.t('toast_network_error'));
      }
    } catch {
      ctx.queueOffline();
    } finally {
      setSubmitting(false);
      ctx.navigate('home');
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <div>
          <h2>{ctx.t('fuel_title')}</h2>
          <div className="tb-sub">{ctx.t('fuel_sub')}</div>
        </div>
      </div>
      <div className="screen-body">
        <div className="card" style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          🚛 {truckLabel} · {ctx.home?.driver.name}
        </div>
        <div className="section-label">{ctx.t('fuel_liters')}</div>
        <input className="input" type="number" placeholder={ctx.t('fuel_liters_ph')} value={liters} onChange={(e) => setLiters(e.target.value)} />
        <div className="section-label">{ctx.t('fuel_price')}</div>
        <input className="input" type="number" step="0.01" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} />
        <div className="stat-card" style={{ marginTop: 4, marginBottom: 14, textAlign: 'center' }}>
          <div className="v">SAR {total.toFixed(2)}</div>
          <div className="l">{ctx.t('fuel_total')}</div>
        </div>
        <div className="section-label">{ctx.t('fuel_station')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.tList('fuel_stations').map((label, i) => (
            <div key={label} className={`chip ${station === i ? 'sel' : ''}`} onClick={() => setStation(i)}>
              {label}
            </div>
          ))}
        </div>
        <div className="section-label">{ctx.t('fuel_payment')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.tList('fuel_payments').map((label, i) => (
            <div key={label} className={`chip ${payment === i ? 'sel' : ''}`} onClick={() => setPayment(i)}>
              {label}
            </div>
          ))}
        </div>
        <div className="section-label">{ctx.t('fuel_receipt')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: photos }).map((_, i) => (
            <div
              key={i}
              style={{ width: 60, height: 60, borderRadius: 12, background: 'linear-gradient(135deg,#1a2332,#2d3b4e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
            >
              📷
            </div>
          ))}
          <div
            onClick={() => setPhotos((p) => p + 1)}
            style={{ width: 60, height: 60, border: '1.5px dashed var(--border-default)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 20 }}
          >
            +
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 18 }}
          disabled={submitting || !liters || station === null || payment === null}
          onClick={submit}
        >
          {ctx.t('fuel_submit')}
        </button>
      </div>
    </>
  );
}
