// AI Control Tower · operator 2026-06-12 'did you add AI control tower'.
// §144 Layer-15 aggregator over 12 dashboards. Per §149 · 13px font · light cards.
import React, { useEffect, useState, useCallback } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function ControlTowerPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchOnce = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/eai-os/control-tower`,
                            { headers: { 'X-Demo-Role': 'manager' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
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
    const t = setInterval(fetchOnce, 30_000);
    return () => clearInterval(t);
  }, [fetchOnce]);

  const FS = 13;
  const COLORS = {
    live:   { bg: '#ecfdf5', bd: '#10b981', tx: '#065f46' },
    na:     { bg: '#fef3c7', bd: '#f59e0b', tx: '#92400e' },
    zero:   { bg: '#fef2f2', bd: '#ef4444', tx: '#991b1b' },
    info:   { bg: '#faf5ff', bd: '#a855f7', tx: '#581c87' },
  };

  return (
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🏗 AI Control Tower</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          §144 Layer-15 · 12-dashboard operator surface · auto-refresh 30s
          {lastFetch ? ` · last: ${lastFetch}` : ''}
        </div>
      </header>

      {loading && <div>Loading…</div>}
      {err && (
        <div style={{ background: COLORS.zero.bg, borderLeft: `4px solid ${COLORS.zero.bd}`,
                      color: COLORS.zero.tx, padding: 12, borderRadius: 6, marginBottom: 16 }}>
          Error: {err}
        </div>
      )}

      {data && (
        <>
          <div style={{
            background: data.live_ratio >= 1.0 ? COLORS.live.bg
                       : data.live_ratio >= 0.6 ? COLORS.na.bg : COLORS.zero.bg,
            border: `1px solid ${data.live_ratio >= 1.0 ? COLORS.live.bd
                                 : data.live_ratio >= 0.6 ? COLORS.na.bd : COLORS.zero.bd}`,
            padding: 16, borderRadius: 8, marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {data.n_live} / {data.n_dashboards} dashboards LIVE
                <span style={{ marginLeft: 10, fontSize: 11, color: COLORS.na.tx }}>
                  {data.n_n_a > 0 ? ` · ${data.n_n_a} n/a` : ''}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Layer {data.layer} · {data.label} · ratio {data.live_ratio}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 12 }}>
            {data.dashboards.map((d) => {
              const isLive = typeof d.count === 'number' && d.count > 0;
              const isNa = d.count === 'n_a';
              const colors = isNa ? COLORS.na : isLive ? COLORS.live : COLORS.zero;
              return (
                <a key={d.dashboard_id} href={d.drill_url} target="_blank" rel="noreferrer"
                   style={{
                     background: colors.bg, borderLeft: `5px solid ${colors.bd}`,
                     padding: 14, borderRadius: 6, textDecoration: 'none',
                     color: '#1f2937', display: 'block',
                     boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                   }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 14 }}>{d.label}</strong>
                    <span style={{ fontSize: 16, fontWeight: 700, color: colors.tx }}>
                      {d.count}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                    {d.purpose}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                    table: <code>{d.table}</code>
                  </div>
                </a>
              );
            })}
          </div>

          <div style={{ marginTop: 16, padding: 14,
                        background: COLORS.info.bg, borderLeft: `4px solid ${COLORS.info.bd}`,
                        borderRadius: 6, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: COLORS.info.tx, marginBottom: 4 }}>
              ℹ️ Layer-15 aggregator
            </div>
            §144 EAI-OS Layer-15 surface · click any card to drill to its data ·
            §57.7 honest: count is live from DB · "n/a" means table missing (not zero)
          </div>
        </>
      )}
    </div>
  );
}
