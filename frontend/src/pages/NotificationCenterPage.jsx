// §F02 · Notification Center · operator 2026-06-12.
// Consumes existing /api/v1/notifications.
import React, { useEffect, useState, useCallback } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastFetch, setLastFetch] = useState(null);

  const fetchOnce = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/notifications?limit=200`,
                            { headers: { 'X-Demo-Role': 'manager' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setNotifications(j.notifications || j.items || j.data || []);
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const t = setInterval(fetchOnce, 15_000);
    return () => clearInterval(t);
  }, [fetchOnce]);

  const filtered = filter === 'all' ? notifications
    : notifications.filter(n => (n.severity || n.level || n.type || '').toLowerCase() === filter);

  const severityColor = (s) => {
    const sev = (s || '').toLowerCase();
    if (sev.includes('critical') || sev.includes('error') || sev === 'high') return '#ef4444';
    if (sev.includes('warn') || sev === 'medium') return '#f59e0b';
    if (sev.includes('info') || sev === 'low') return '#3b82f6';
    return '#94a3b8';
  };

  const FS = 13;
  return (
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🔔 Notification Center</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          §F02 · consolidated alerts + system events · auto-refresh 15s
          {lastFetch ? ` · last: ${lastFetch}` : ''}
        </div>
      </header>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['all', 'critical', 'error', 'warning', 'info'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? '#10b981' : '#fff',
            color: filter === f ? '#fff' : '#1f2937',
            border: '1px solid #cbd5e1',
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
          {filtered.length} of {notifications.length}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {err && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444',
                      color: '#991b1b', padding: 12, borderRadius: 4, marginBottom: 12 }}>
          {err}
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13,
                      background: '#f8fafc', borderRadius: 6 }}>
          ✓ No notifications matching <code>{filter}</code>
        </div>
      )}

      {filtered.map((n, i) => {
        const sev = n.severity || n.level || n.type || 'info';
        const color = severityColor(sev);
        return (
          <div key={n.id || n.notification_id || i} style={{
            background: '#fff', borderLeft: `5px solid ${color}`,
            border: '1px solid #e5e7eb', borderRadius: 6,
            padding: 12, marginBottom: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 13 }}>
                {n.title || n.subject || n.summary || n.message?.slice(0, 60) || '(untitled)'}
              </strong>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>
                {sev.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6, whiteSpace: 'pre-wrap' }}>
              {n.message || n.body || n.content || n.description || ''}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
              {n.created_at || n.timestamp || n.ts || ''} ·
              channel: {n.channel || n.kind || 'system'} ·
              actor: {n.actor || n.source || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
