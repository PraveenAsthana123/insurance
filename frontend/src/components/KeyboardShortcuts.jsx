// KeyboardShortcuts · Iter 24 · ?/h opens help overlay · g+n home etc.
// Mount once in layout.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS = [
  { keys: ['?', 'Shift+/'], description: 'Open keyboard shortcuts help' },
  { keys: ['⌘+K', 'Ctrl+K'],  description: 'Global search palette' },
  { keys: ['Esc'],            description: 'Close any overlay' },
  { keys: ['g', 'h'],         description: 'Go to /insurance home' },
  { keys: ['g', 'd'],         description: 'Go to admin · audits' },
  { keys: ['g', 'k'],         description: 'Go to insurance KPIs' },
  { keys: ['t'],              description: 'Toggle theme (☀/🌙)' },
];

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    let timer = null;

    function shouldIgnore(e) {
      // Don't trigger inside form inputs
      const tag = e.target?.tagName;
      const editable = e.target?.isContentEditable;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable;
    }

    function onKey(e) {
      if (shouldIgnore(e)) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setPendingG(false);
        return;
      }
      if (e.key === 't') {
        const btn = document.querySelector('button[aria-label*="mode"]');
        btn?.click();
        return;
      }
      if (e.key === 'g') {
        setPendingG(true);
        clearTimeout(timer);
        timer = setTimeout(() => setPendingG(false), 1200);
        return;
      }
      if (pendingG) {
        clearTimeout(timer);
        setPendingG(false);
        if (e.key === 'h') navigate('/insurance');
        else if (e.key === 'd') navigate('/admin/audits');
        else if (e.key === 'k') navigate('/insurance-kpis');
      }
    }

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, [navigate, pendingG]);

  if (!open) {
    return pendingG ? (
      <div style={{
        position: 'fixed', bottom: 20, left: 20, zIndex: 8000,
        background: '#f8fafc', color: '#1f2937', border: '1px solid #e5e7eb',
        padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      }}>
        g + ? · h=home · d=audits · k=KPIs
      </div>
    ) : null;
  }

  return (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 8, padding: 20,
        width: 480, maxWidth: '90vw',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>⌨</span>
          <strong style={{ fontSize: 14 }}>Keyboard shortcuts</strong>
          <button onClick={() => setOpen(false)}
            aria-label="Close"
            style={{ marginLeft: 'auto', padding: '2px 8px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 3, cursor: 'pointer' }}>
            Close (Esc)
          </button>
        </div>
        <table style={{ width: '100%', fontSize: 12 }}>
          <tbody>
            {SHORTCUTS.map((s, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: 6 }}>
                  {s.keys.map((k, j) => (
                    <kbd key={j} style={{
                      padding: '2px 6px', margin: '0 3px 0 0',
                      background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 3,
                      fontFamily: 'monospace', fontSize: 11,
                    }}>{k}</kbd>
                  ))}
                </td>
                <td style={{ padding: 6, color: '#475569' }}>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
