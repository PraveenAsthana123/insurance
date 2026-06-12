// §F03 · Feature Flags UI · operator 2026-06-12.
// Consumes existing /api/v1/feature-flags.
import React, { useEffect, useState, useCallback } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/feature-flags`,
                            { headers: { 'X-Demo-Role': 'manager' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setFlags(j.flags || j.items || j.feature_flags || j.data || []);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flag) => {
    const id = flag.flag_id || flag.id || flag.name;
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const newValue = !(flag.enabled || flag.is_enabled || flag.value);
      const r = await fetch(`${API}/api/v1/feature-flags/${id}`, {
        method: 'PATCH',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!r.ok) {
        const r2 = await fetch(`${API}/api/v1/feature-flags/${id}/toggle`, {
          method: 'POST',
          headers: { 'X-Demo-Role': 'manager' },
        });
        if (!r2.ok) throw new Error(`toggle HTTP ${r2.status}`);
      }
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  };

  const visible = flags.filter(f => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (f.flag_id || f.id || f.name || '').toLowerCase().includes(q)
      || (f.description || '').toLowerCase().includes(q);
  });

  const FS = 13;
  return (
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🎛 Feature Flags</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          §F03 · runtime flags · consume `/api/v1/feature-flags` · toggle inline
        </div>
      </header>

      <div style={{ marginBottom: 12 }}>
        <input type="search" placeholder="Filter flags…" value={filter}
               onChange={e => setFilter(e.target.value)}
               style={{ padding: '8px 12px', fontSize: 12,
                        border: '1px solid #cbd5e1', borderRadius: 4, width: 320 }} />
        <span style={{ marginLeft: 12, fontSize: 11, color: '#6b7280' }}>
          {visible.length} of {flags.length}
        </span>
      </div>

      {loading && <div>Loading…</div>}
      {err && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444',
                      color: '#991b1b', padding: 12, borderRadius: 4, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {visible.map((f, i) => {
          const id = f.flag_id || f.id || f.name;
          const enabled = f.enabled || f.is_enabled || f.value;
          const isBusy = busy[id];
          return (
            <div key={id || i} style={{
              background: '#fff', borderLeft: `5px solid ${enabled ? '#10b981' : '#94a3b8'}`,
              border: '1px solid #e5e7eb', borderRadius: 6, padding: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{id}</div>
                {(f.description || f.purpose) && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    {f.description || f.purpose}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                  {f.tenant_id && <span>tenant: {f.tenant_id} · </span>}
                  {f.rollout_pct && <span>rollout: {f.rollout_pct}% · </span>}
                  {f.updated_at && <span>updated: {f.updated_at}</span>}
                </div>
              </div>
              <button onClick={() => toggle(f)} disabled={isBusy} style={{
                background: enabled ? '#10b981' : '#94a3b8',
                color: '#fff', border: 'none',
                padding: '8px 18px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                opacity: isBusy ? 0.5 : 1,
                minWidth: 80,
              }}>
                {isBusy ? '...' : enabled ? '✓ ON' : '○ OFF'}
              </button>
            </div>
          );
        })}
      </div>

      {!loading && !err && visible.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13,
                      background: '#f8fafc', borderRadius: 6 }}>
          No feature flags found
        </div>
      )}
    </div>
  );
}
