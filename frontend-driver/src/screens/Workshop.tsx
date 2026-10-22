import { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx, WorkshopData } from '../types';

const MS_PER_DAY = 86400000;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY));
}

function dueBadge(dueDate: string): { cls: string; text: string } {
  const days = daysUntil(dueDate);
  if (days <= 0) {
    const overdue = Math.abs(days);
    return { cls: 'badge-red', text: `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}` };
  }
  if (days <= 7) {
    return { cls: 'badge-amber', text: `Due in ${days} day${days === 1 ? '' : 's'}` };
  }
  return { cls: 'badge-green', text: `Due in ${days} day${days === 1 ? '' : 's'}` };
}

function partBadgeClass(status: string): string | null {
  switch (status) {
    case 'ordered':
      return 'badge-amber';
    case 'intransit':
      return 'badge-blue';
    case 'arrived':
    case 'installed':
      return 'badge-green';
    default:
      return null;
  }
}

export default function Workshop({ ctx }: { ctx: AppCtx }) {
  const [data, setData] = useState<WorkshopData | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/driver/workshop')
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <h2>{ctx.t('ws_title')}</h2>
      </div>
      <div className="screen-body">
        {!data ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : (
          <>
            <div className="section-label">{ctx.t('ws_next_service')}</div>
            <div className="card">
              {data.nextService ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{data.nextService.type}</div>
                  {(() => {
                    const badge = dueBadge(data.nextService.dueDate);
                    return <span className={`badge ${badge.cls}`}>{badge.text}</span>;
                  })()}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('ws_no_service')}</p>
              )}
            </div>

            <div className="section-label">{ctx.t('ws_ticket')}</div>
            <div className="card">
              {data.ticket ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{data.ticket.issue}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                    {ctx.t('ws_opened')} {daysSince(data.ticket.openedAt)} day(s) ago
                  </div>
                  <div className="stepper">
                    <div className="step-line" />
                    {data.ticket.steps.map((step, i) => (
                      <div
                        key={step}
                        className={`step ${i < data.ticket!.currentStepIndex ? 'done' : ''} ${
                          i === data.ticket!.currentStepIndex ? 'active' : ''
                        }`}
                      >
                        <div className="dotc">{i < data.ticket!.currentStepIndex ? '✓' : i + 1}</div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{ctx.t('ws_no_ticket')}</p>
              )}
            </div>

            {data.ticket && (
              <>
                <div className="section-label">{ctx.t('ws_parts')}</div>
                <div className="card">
                  {data.ticket.parts.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>—</p>
                  ) : (
                    data.ticket.parts.map((p) => {
                      const cls = partBadgeClass(p.status);
                      const label = ctx.t(`ws_status_${p.status}`);
                      return (
                        <div key={p.id} className="list-item">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {p.eta ? new Date(p.eta).toLocaleDateString() : '—'}
                            </div>
                          </div>
                          {cls ? (
                            <span className={`badge ${cls}`}>{label}</span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                              {label}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="section-label">{ctx.t('ws_history')}</div>
            <div className="card">
              {data.history.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No service history yet.</p>
              ) : (
                data.history.map((h) => (
                  <div key={h.id} className="list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.serviceType}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {h.workshopName} · {new Date(h.servicedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>SAR {h.cost}</div>
                  </div>
                ))
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 18 }}>{ctx.t('ws_note')}</p>
          </>
        )}
      </div>
    </>
  );
}
