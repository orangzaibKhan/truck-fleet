import { useState } from 'react';
import { useInstallPrompt } from '../useInstallPrompt';
import type { AppCtx } from '../types';

export default function InstallPrompt({ ctx }: { ctx: AppCtx }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || dismissed) return null;

  return (
    <div className="install-bar">
      <span style={{ fontSize: 20 }}>🚛</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ctx.t('install_title')}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ctx.t('install_body')}</div>
      </div>
      <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }} onClick={promptInstall}>
        {ctx.t('install_btn')}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer' }}
      >
        {ctx.t('install_dismiss')}
      </button>
    </div>
  );
}
