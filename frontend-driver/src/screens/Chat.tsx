import { useEffect, useRef, useState } from 'react';
import type { AppCtx } from '../types';

interface Msg {
  from: 'me' | 'them';
  text: string;
  time: string;
}

export default function Chat({ ctx }: { ctx: AppCtx }) {
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'them', text: ctx.lang === 'ar' ? 'صباح الخير، كيف تسير أول حمولة؟' : "Morning, how's the first load going?", time: '7:02 AM' },
    { from: 'me', text: ctx.lang === 'ar' ? 'كل شيء جيد.' : 'All good, heading to the dumping zone now.', time: '7:05 AM' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing]);

  function push(from: 'me' | 'them', text: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { from, text, time }]);
  }

  function simulateReply(text: string) {
    setTyping(true);
    setTimeout(
      () => {
        setTyping(false);
        push('them', text);
      },
      1100 + Math.random() * 600,
    );
  }

  function sendQuickReply(i: number) {
    const mine = [ctx.t('qr1'), ctx.t('qr2'), ctx.t('qr3'), ctx.t('qr4')][i];
    push('me', mine);
    simulateReply([ctx.t('chat_r1'), ctx.t('chat_r4'), ctx.t('chat_r3'), ctx.t('chat_r4')][i]);
  }

  function sendChat() {
    const val = input.trim();
    if (!val) return;
    push('me', val);
    setInput('');
    simulateReply(ctx.t('chat_r1'));
  }

  return (
    <>
      <div className="top-bar">
        <div className="tb-back" onClick={() => ctx.navigate('trip')}>
          ←
        </div>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
          KO
        </div>
        <div>
          <h2 style={{ fontSize: 15 }}>Khalid Al-Otaibi</h2>
          <div className="tb-sub">🟢 {ctx.t('chat_online')}</div>
        </div>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.from}`}>
            <div>
              <div className="bubble">{m.text}</div>
              <div className="msg-time">{m.time}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="msg-row them">
            <div className="bubble typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      <div className="quick-replies">
        {[ctx.t('qr1'), ctx.t('qr2'), ctx.t('qr3'), ctx.t('qr4')].map((label, i) => (
          <div key={label} className="qr-chip" onClick={() => sendQuickReply(i)}>
            {label}
          </div>
        ))}
      </div>
      <div className="chat-input-bar">
        <input
          placeholder={ctx.t('chat_ph')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChat()}
        />
        <button className="send-btn" onClick={sendChat}>
          ➤
        </button>
      </div>
    </>
  );
}
