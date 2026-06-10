// AlertsBadge · Iter 21 · top-bar notification widget.
// Polls /api/v1/alerts/counts every 30s · shows HITL + drift + comments.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function AlertsBadge({ accent = '#dc2626' }) {
  const [counts, setCounts] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const r = await fetch(`${API_BASE}/api/v1/alerts/counts`);
      if (r.ok) setCounts(await r.json());
    } catch { /* fallthrough */ }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!counts) return null;
  const total = counts.total || 0;
  const hasAlerts = total > 0;

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: '4px 10px', fontSize: 12, cursor: 'pointer', position: 'relative',
        background: hasAlerts ? accent : '#f1f5f9',
        color: hasAlerts ? '#fff' : '#475569',
        border: 'none', borderRadius: 4, fontWeight: 700,
      }}>
        🔔 {total > 0 && total}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          width: 240, padding: 10, background: '#fff',
          border: '1px solid #cbd5e1', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 200,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 6 }}>
            🔔 Alerts ({counts.scaffold && <span style={{ color: '#d97706' }}>scaffold</span>})
          </div>
          <Row icon="👤" label="HITL pending" value={counts.hitl_pending} color="#d97706" />
          <Row icon="📉" label="Drift alerts" value={counts.drift_alerts} color="#dc2626" />
          <Row icon="💬" label="New comments" value={counts.new_comments} color="#3b82f6" />
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 6 }}>
            Auto-refresh every 30s · Iter 21
          </div>
        </div>
      )}
    </span>
  );
}

function Row({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11 }}>
      <span>{icon}</span>
      <span style={{ flex: 1, color: '#475569' }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
