import { useState } from 'react';
import { useInstallPrompt } from './useInstallPrompt';

/**
 * Always visible - relying only on the browser's native beforeinstallprompt
 * event is too fragile to be the entire feature (Safari/iOS never fires it
 * at all, and it failed in the embedded preview tool during testing here).
 * Falls back to plain instructions when no native prompt was captured.
 */
export default function InstallButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [showFallback, setShowFallback] = useState(false);

  async function handleClick() {
    if (canInstall) {
      await promptInstall();
    } else {
      setShowFallback((v) => !v);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={handleClick} className={className} style={style}>
        Install app
      </button>
      {showFallback && !canInstall && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 220,
            maxWidth: 'calc(100vw - 32px)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            zIndex: 10,
          }}
        >
          Your browser hasn't offered an install prompt yet. Look for an install icon in the
          address bar, or open the browser menu and choose "Install app" / "Add to Home Screen."
        </div>
      )}
    </div>
  );
}
