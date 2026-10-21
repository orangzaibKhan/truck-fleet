import { useState } from 'react';
import { apiFetch } from '../auth';
import type { AppCtx } from '../types';

type Answer = 'pass' | 'fail' | null;

export default function Inspection({ ctx }: { ctx: AppCtx }) {
  const [answers, setAnswers] = useState<Answer[]>(new Array(15).fill(null));
  const [submitting, setSubmitting] = useState(false);

  const items = ctx.tList('insp_items');
  const groupNames = [ctx.t('insp_g1'), ctx.t('insp_g2'), ctx.t('insp_g3')];
  const groups: [number, number][] = [
    [0, 5],
    [5, 10],
    [10, 15],
  ];

  const answeredCount = answers.filter((a) => a !== null).length;
  const hasFail = answers.includes('fail');
  const allAnswered = answeredCount === 15;

  function setAnswer(i: number, val: Answer) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? val : a)));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/driver/inspection', {
        method: 'POST',
        body: JSON.stringify({ results: answers }),
      });
      if (res.ok) {
        if (!ctx.isOnline) ctx.queueOffline();
        else ctx.toast(ctx.t('toast_insp_submitted'));
        ctx.navigate('home');
        ctx.refreshHome();
      } else {
        const data = await res.json().catch(() => ({}));
        ctx.toast(data.error ?? ctx.t('toast_network_error'));
      }
    } catch {
      ctx.queueOffline();
      ctx.navigate('home');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('home')}>
          ←
        </div>
        <div>
          <h2>{ctx.t('insp_title')}</h2>
          <div className="tb-sub">{ctx.t('insp_sub')}</div>
        </div>
      </div>
      <div className="screen-body">
        <div className="progress-bar">
          <div className="fill" style={{ width: `${(answeredCount / 15) * 100}%` }} />
        </div>
        {hasFail && <div className="crit-banner">⚠️ {ctx.t('insp_crit')}</div>}

        {groups.map(([start, end], gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: gi === 0 ? 0 : 18 }}>
              {groupNames[gi]}
            </div>
            {items.slice(start, end).map((label, idx) => {
              const i = start + idx;
              return (
                <div key={i} className="insp-item">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                  <div className="pf-btns">
                    <div className={`pf-btn pass ${answers[i] === 'pass' ? 'sel' : ''}`} onClick={() => setAnswer(i, 'pass')}>
                      {ctx.t('pass')}
                    </div>
                    <div className={`pf-btn fail ${answers[i] === 'fail' ? 'sel' : ''}`} onClick={() => setAnswer(i, 'fail')}>
                      {ctx.t('fail')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={!allAnswered || submitting} onClick={submit}>
          {ctx.t('insp_submit')}
        </button>
      </div>
    </>
  );
}
