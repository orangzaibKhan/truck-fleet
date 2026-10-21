import { useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

export default function HandoverModal({ ctx, open, onClose }: { ctx: AppCtx; open: boolean; onClose: () => void }) {
  const [condition, setCondition] = useState<number | null>(null);
  const [fuelLevel, setFuelLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const conditionValues = ['clean_ready', 'needs_cleaning', 'minor_damage'];
  const fuelValues = ['full', '3_4', '1_2', '1_4', 'low'];

  async function confirm() {
    if (condition === null || fuelLevel === null) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/driver/shift/end', {
        method: 'POST',
        body: JSON.stringify({
          truckCondition: conditionValues[condition],
          fuelLevel: fuelValues[fuelLevel],
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        if (!ctx.isOnline) ctx.queueOffline();
        else ctx.toast(ctx.t('toast_shift_ended'));
      } else if (!ctx.isOnline) {
        ctx.queueOffline();
      } else {
        ctx.toast(ctx.t('toast_network_error'));
      }
    } catch {
      if (!ctx.isOnline) ctx.queueOffline();
      else ctx.toast(ctx.t('toast_network_error'));
    } finally {
      setSubmitting(false);
      setCondition(null);
      setFuelLevel(null);
      setNotes('');
      onClose();
      ctx.refreshHome();
    }
  }

  return (
    <div className={`modal-overlay ${open ? 'show' : ''}`}>
      <div className="modal-card">
        <div className="modal-handle" />
        <h2>{ctx.t('handover_title')}</h2>
        <span className="tb-sub">{ctx.t('handover_sub')}</span>

        <div className="section-label">{ctx.t('handover_truck_condition')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {ctx.tList('handover_conditions').map((c, i) => (
            <div key={c} className={`chip ${condition === i ? 'sel' : ''}`} onClick={() => setCondition(i)}>
              {c}
            </div>
          ))}
        </div>

        <div className="section-label">{ctx.t('handover_fuel_level')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {ctx.tList('handover_fuel_levels').map((f, i) => (
            <div key={f} className={`chip ${fuelLevel === i ? 'sel' : ''}`} onClick={() => setFuelLevel(i)}>
              {f}
            </div>
          ))}
        </div>

        <div className="section-label">{ctx.t('handover_notes')}</div>
        <textarea
          className="textarea"
          placeholder={ctx.t('handover_notes_ph')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {ctx.t('handover_cancel')}
          </button>
          <button className="btn btn-primary" disabled={condition === null || fuelLevel === null || submitting} onClick={confirm}>
            {ctx.t('handover_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
