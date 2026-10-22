import { useEffect, useState } from 'react';

type Status = 'idle' | 'recording' | 'saved';

function formatTime(totalSeconds: number) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function VoiceRecorder({ label }: { label: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (status !== 'recording') return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  function startRecording() {
    setSeconds(0);
    setStatus('recording');
  }

  function stopRecording() {
    setStatus('saved');
  }

  function deleteRecording() {
    setStatus('idle');
    setSeconds(0);
  }

  if (status === 'saved') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-full)',
          padding: '8px 14px',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        <span>🎙️ Voice note · {formatTime(seconds)}</span>
        <span
          onClick={deleteRecording}
          style={{ cursor: 'pointer', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: 13, lineHeight: 1 }}
        >
          ✕
        </span>
      </div>
    );
  }

  if (status === 'recording') {
    return (
      <>
        <style>{`
          @keyframes vrWave {
            0%, 100% { transform: scaleY(0.35); }
            50% { transform: scaleY(1); }
          }
          .vr-bar {
            display: inline-block;
            width: 3px;
            border-radius: 2px;
            background: var(--red);
            animation: vrWave 0.9s ease-in-out infinite;
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
          }}
        >
          <div
            onClick={stopRecording}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--red)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ⏹
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20, flex: 1 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="vr-bar"
                style={{ height: 6 + (i % 4) * 4, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', minWidth: 38 }}>
            {formatTime(seconds)}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      onClick={startRecording}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--bg-elevated)',
        border: '1px dashed var(--border-default)',
        borderRadius: 'var(--r-md)',
        padding: '10px 14px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        🎤
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}
