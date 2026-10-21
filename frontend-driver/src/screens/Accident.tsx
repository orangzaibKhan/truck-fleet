import { useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

export default function Accident({ ctx }: { ctx: AppCtx }) {
  const [severity, setSeverity] = useState<number | null>(null);
  const [hasInjuries, setHasInjuries] = useState(false);
  const [injuredCount, setInjuredCount] = useState('');
  const [otherVehicle, setOtherVehicle] = useState(false);
  const [plate, setPlate] = useState('');
  const [otherDriverName, setOtherDriverName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const truckLabel = ctx.home?.truck?.truckNumber ?? '—';

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/driver/incident', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'accident',
          severity: severity !== null ? ctx.tList('ac_severities')[severity] : undefined,
          hasInjuries,
          injuredCount: hasInjuries && injuredCount ? Number(injuredCount) : undefined,
          otherVehiclePlate: otherVehicle ? plate.trim() || undefined : undefined,
          otherDriverName: otherVehicle ? otherDriverName.trim() || undefined : undefined,
          description: description.trim() || undefined,
        }),
      });
      if (res.ok) {
        if (!ctx.isOnline) ctx.queueOffline();
        else ctx.toast(ctx.t('toast_report_submitted'));
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
      <div className="top-bar" style={{ borderBottomColor: 'var(--red)' }}>
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <h2 style={{ color: 'var(--red)' }}>{ctx.t('ac_title')}</h2>
      </div>
      <div className="screen-body">
        <div className="crit-banner">🚨 {ctx.t('ac_crit')}</div>
        <div className="emg-row">
          <button className="btn btn-danger">{ctx.t('ac_call_emg')}</button>
          <button className="btn btn-outline-danger">{ctx.t('ac_call_sup')}</button>
        </div>
        <div className="card" style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          🚛 {truckLabel} · {ctx.home?.driver.name}
          <br />
          📍 24.7136° N, 46.6753° E
          <br />
          🕐 {new Date().toLocaleString()}
        </div>

        <div className="section-label">{ctx.t('ac_severity')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.tList('ac_severities').map((label, i) => (
            <div key={label} className={`chip ${severity === i ? 'sel' : ''}`} onClick={() => setSeverity(i)}>
              {label}
            </div>
          ))}
        </div>

        <div className="list-item" style={{ border: 'none', paddingTop: 16 }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('ac_injuries')}</div>
          <div className={`toggle-switch ${hasInjuries ? 'on' : ''}`} onClick={() => setHasInjuries((v) => !v)}>
            <div className="knob" />
          </div>
        </div>
        {hasInjuries && (
          <input
            className="input"
            type="number"
            placeholder={ctx.t('ac_num_injured')}
            value={injuredCount}
            onChange={(e) => setInjuredCount(e.target.value)}
          />
        )}

        <div className="list-item" style={{ border: 'none' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ctx.t('ac_other_vehicle')}</div>
          <div className={`toggle-switch ${otherVehicle ? 'on' : ''}`} onClick={() => setOtherVehicle((v) => !v)}>
            <div className="knob" />
          </div>
        </div>
        {otherVehicle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
            <input className="input" placeholder={ctx.t('ac_plate')} value={plate} onChange={(e) => setPlate(e.target.value)} />
            <input
              className="input"
              placeholder={ctx.t('ac_driver_name')}
              value={otherDriverName}
              onChange={(e) => setOtherDriverName(e.target.value)}
            />
          </div>
        )}

        <div className="section-label">{ctx.t('ac_desc')}</div>
        <textarea className="textarea" placeholder={ctx.t('ac_desc_ph')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="section-label">{ctx.t('ac_photos')}</div>
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
        <button className="btn btn-danger" style={{ marginTop: 18 }} disabled={submitting} onClick={submit}>
          {ctx.t('ac_submit')}
        </button>
      </div>
    </>
  );
}
