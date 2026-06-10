// ActivityLogPanel · Iter 21 · recent operator UI actions.
// Wired to /api/v1/alerts/activity.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const ACTION_COLOR = {
  hitl_bulk_approve: '#16a34a',
  hitl_bulk_reject:  '#dc2626',
  permalink_share:   '#0ea5e9',
  panel_export:      '#475569',
  inline_edit_save:  '#8b5cf6',
};

export default function ActivityLogPanel({ accent = '#475569', limit = 20 }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  async function load() {
    try {
      setBusy(true);
      const r = await fetch(`${API_BASE}/api/v1/alerts/activity?limit=${limit}`);
      if (r.ok) setData(await r.json());
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [limit]);

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy && !data) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading activity…</em></div>;
  const rows = data?.activity || [];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📜</span>
        <strong style={{ fontSize: 13, color: accent }}>Iter 21 · Activity log · last {rows.length}</strong>
        <button onClick={load} style={{
          marginLeft: 'auto', padding: '2px 8px', fontSize: 10, cursor: 'pointer',
          background: '#fff', color: accent, border: `1px solid ${accent}`, borderRadius: 3,
        }}>↻ refresh</button>
      </div>
      {rows.length === 0 ? (
        <em style={{ fontSize: 10, color: '#94a3b8' }}>No activity yet.</em>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>When</th>
              <th style={{ padding: 4 }}>Actor</th>
              <th style={{ padding: 4 }}>Action</th>
              <th style={{ padding: 4 }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4, fontSize: 9, color: '#64748b' }}>{r.timestamp?.slice(11, 19)}</td>
                <td style={{ padding: 4 }}>{r.actor}</td>
                <td style={{ padding: 4 }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                    background: `${ACTION_COLOR[r.action] || '#475569'}20`,
                    color: ACTION_COLOR[r.action] || '#475569',
                  }}>{r.action}</span>
                </td>
                <td style={{ padding: 4, fontSize: 10 }}>{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/alerts/activity · in-memory · Iter 21
      </div>
    </div>
  );
}

// Helper: any panel can call logActivity(action, target, context)
export async function logActivity(action, target = '', context = {}) {
  try {
    const actor = localStorage.getItem('insur.activeRole') || 'operator';
    await fetch(`${API_BASE}/api/v1/alerts/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, action, target, context }),
    });
  } catch { /* fire-and-forget */ }
}
