import { useState } from 'react';
import { apiFetch } from '../auth';
import VoiceRecorder from '../components/VoiceRecorder';
import type { AppCtx } from '../types';

export default function Breakdown({ ctx }: { ctx: AppCtx }) {
  const [issueType, setIssueType] = useState<number | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
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
          kind: 'breakdown',
          issueType: issueType !== null ? ctx.tList('bd_types')[issueType] : undefined,
          priority: priority !== null ? ctx.tList('priorities')[priority] : undefined,
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
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <h2>{ctx.t('bd_title')}</h2>
      </div>
      <div className="screen-body">
        <div className="card" style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          🚛 {truckLabel} · {ctx.home?.driver.name}
          <br />
          📍 24.7136° N, 46.6753° E
          <br />
          🕐 {new Date().toLocaleString()}
        </div>
        <div className="section-label">{ctx.t('bd_type')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.tList('bd_types').map((label, i) => (
            <div key={label} className={`chip ${issueType === i ? 'sel' : ''}`} onClick={() => setIssueType(i)}>
              {label}
            </div>
          ))}
        </div>
        <div className="section-label">{ctx.t('bd_priority')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.tList('priorities').map((label, i) => (
            <div key={label} className={`chip ${priority === i ? 'sel' : ''}`} onClick={() => setPriority(i)}>
              {label}
            </div>
          ))}
        </div>
        <div className="section-label">{ctx.t('bd_desc')}</div>
        <textarea className="textarea" placeholder={ctx.t('bd_desc_ph')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="section-label">{ctx.t('bd_photos')}</div>
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
        <div className="section-label">{ctx.t('voice_label')}</div>
        <VoiceRecorder label={ctx.t('voice_label')} />
        <button className="btn btn-danger" style={{ marginTop: 18 }} disabled={submitting} onClick={submit}>
          {ctx.t('bd_submit')}
        </button>
      </div>
    </>
  );
}
