// Toast · Iter 23 · global toast notification system.
// Mount <ToastHost/> once in layout · call toast(msg, kind, ms) anywhere.

import { useEffect, useState } from 'react';

let _push = null;
let _next = 1;

export function toast(message, kind = 'info', ms = 4000) {
  if (_push) {
    _push({ id: _next++, message, kind, ms });
  }
}

export function toastSuccess(m, ms) { toast(m, 'success', ms); }
export function toastError(m, ms) { toast(m, 'error', ms); }
export function toastWarn(m, ms) { toast(m, 'warn', ms); }

const TONE = {
  info:    { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6', icon: 'ℹ' },
  success: { bg: '#dcfce7', fg: '#166534', border: '#16a34a', icon: '✓' },
  error:   { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626', icon: '✗' },
  warn:    { bg: '#fef3c7', fg: '#92400e', border: '#d97706', icon: '⚠' },
};

export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    _push = (t) => {
      setItems((cur) => [...cur, t]);
      if (t.ms > 0) {
        setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), t.ms);
      }
    };
    return () => { _push = null; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed', top: 60, right: 16,
        display: 'flex', flexDirection: 'column', gap: 6,
        zIndex: 9000, pointerEvents: 'none',
      }}>
      {items.map((t) => {
        const tone = TONE[t.kind] || TONE.info;
        return (
          <div key={t.id} role="status" style={{
            background: tone.bg,
            color: tone.fg,
            border: `1px solid ${tone.border}`,
            borderLeft: `4px solid ${tone.border}`,
            padding: '8px 12px', borderRadius: 4,
            fontSize: 12, fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 240, maxWidth: 360,
            pointerEvents: 'auto',
          }}>
            <span aria-hidden="true">{tone.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: tone.fg, fontSize: 14, padding: 0, lineHeight: 1,
              }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
