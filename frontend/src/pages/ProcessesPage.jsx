// §150 Process Resilience · live status of every supervised process.
// Auto-refreshes every 5 seconds. Per §149 (UI consistency · 13px font · light cards).
import React, { useEffect, useState, useCallback } from 'react';

const STATUS_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function ProcessesPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchOnce = useCallback(async () => {
    try {
      const r = await fetch(`${STATUS_BASE}/api/v1/service-health/processes`, {
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setErr(null);
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const t = setInterval(fetchOnce, 5000);
    return () => clearInterval(t);
  }, [fetchOnce]);

  const FS = 13;
  const COLORS = {
    up:        { bg: '#ecfdf5', bd: '#10b981', tx: '#065f46' },
    down:      { bg: '#fef2f2', bd: '#ef4444', tx: '#991b1b' },
    degraded:  { bg: '#fef3c7', bd: '#f59e0b', tx: '#92400e' },
    info:      { bg: '#faf5ff', bd: '#a855f7', tx: '#581c87' },
  };

  return (
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>§150 · Process Resilience</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          Apps must not die. Watchdog restarts dead services every 2 minutes.
          {' · '}Live (auto-refresh 5s){lastFetch ? ` · last: ${lastFetch}` : ''}
        </div>
      </header>

      {loading && <div>Loading…</div>}
      {err && (
        <div style={{ background: COLORS.down.bg, border: `1px solid ${COLORS.down.bd}`, color: COLORS.down.tx, padding: 12, borderRadius: 6, marginBottom: 16 }}>
          Error fetching status: {err}
        </div>
      )}

      {data && (
        <>
          {/* Overall summary */}
          <div style={{
            background: data.summary.overall === 'ok' ? COLORS.up.bg : (data.summary.overall === 'degraded' ? COLORS.degraded.bg : COLORS.down.bg),
            border: `1px solid ${data.summary.overall === 'ok' ? COLORS.up.bd : (data.summary.overall === 'degraded' ? COLORS.degraded.bd : COLORS.down.bd)}`,
            padding: 16, borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {data.summary.alive} / {data.summary.total} services UP
                <span style={{ marginLeft: 12, fontSize: 12, padding: '2px 8px', borderRadius: 4,
                    background: data.summary.overall === 'ok' ? COLORS.up.bd : COLORS.down.bd,
                    color: '#fff' }}>
                  {data.summary.overall.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {data.policy}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
              <div>Last supervisor tick: {data.updated_local || '(never)'}</div>
              <div>Tick count: {data.tick_count} · Cron installed: {data.watchdog_cron_installed ? '✓' : '✗'}</div>
              <div>Supervisor daemon: {data.supervisor_pid_alive ? '✓ running' : '✗ stopped'}</div>
            </div>
          </div>

          {/* Service cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
            {Object.entries(data.services).map(([name, svc]) => (
              <div key={name} style={{
                background: svc.alive ? COLORS.up.bg : COLORS.down.bg,
                borderLeft: `5px solid ${svc.alive ? COLORS.up.bd : COLORS.down.bd}`,
                padding: 14, borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 14 }}>{name}</strong>
                  <span style={{ fontSize: 11, color: svc.alive ? COLORS.up.tx : COLORS.down.tx, fontWeight: 700 }}>
                    {svc.alive ? '✓ UP' : '✗ DOWN'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Port {svc.port}{svc.pid ? ` · pid ${svc.pid}` : ''}
                </div>
                {svc.restart_count > 0 && (
                  <div style={{ fontSize: 11, color: COLORS.degraded.tx, marginTop: 6 }}>
                    Restarts: {svc.restart_count} · backoff: {svc.backoff_seconds}s
                  </div>
                )}
                {svc.health_path && svc.alive && (
                  <a href={`http://localhost:${svc.port}${svc.health_path}`} target="_blank" rel="noreferrer"
                     style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>
                    Health probe →
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Watchdog log tail */}
          {data.watchdog_log_tail?.length > 0 && (
            <div style={{ background: '#f8fafc', color: '#334155', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 11, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#475569' }}>
                Watchdog log tail (last {data.watchdog_log_tail.length} lines):
              </div>
              {data.watchdog_log_tail.map((line, i) => (
                <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #e5e7eb' }}>{line}</div>
              ))}
            </div>
          )}

          {/* §150 mandates */}
          <div style={{
            background: COLORS.info.bg, borderLeft: `5px solid ${COLORS.info.bd}`,
            padding: 14, borderRadius: 6, marginTop: 16, fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, color: COLORS.info.tx, marginBottom: 6 }}>
              ℹ️ §150 · Apps Must Not Die · 10-dim score-card
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Supervisor: <code>scripts/multi_supervisor.py</code> (Python daemon · double-fork detach)</li>
              <li>Watchdog cron: <code>*/2 * * * * scripts/process_watchdog.sh</code></li>
              <li>One-command start: <code>bash scripts/start_all.sh</code></li>
              <li>Status CLI: <code>bash scripts/start_all.sh --status</code></li>
              <li>Endpoint: <code>GET /api/v1/service-health/processes</code></li>
              <li>Postgres: NEVER auto-restart (operator action required per §42)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
