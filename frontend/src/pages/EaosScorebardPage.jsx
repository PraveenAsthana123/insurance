// §EAOS Top-10 · scoreboard UI per operator 2026-06-12 23-level brief.
// Uses §149.2 components (glass cards · color palette · objective+todos).
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const STATUS_STYLE = {
  done:    { color: '#10b981', label: '✅ DONE',    card: 'card-2' },
  mostly:  { color: '#06b6d4', label: '🟢 MOSTLY',  card: 'card-1' },
  partial: { color: '#f59e0b', label: '🟡 PARTIAL', card: 'card-3' },
  missing: { color: '#ef4444', label: '❌ MISSING', card: 'card-4' },
};

export default function EaosScoreboardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/eaos/scoreboard`,
                            { headers: { 'X-Demo-Role': 'manager' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🏢 EAOS Top-10 Scoreboard</h1>
      <div className="subtle" style={{ marginBottom: 16 }}>
        Live presence + completeness per the operator's 10 priority components ·
        auto-refresh 30s
        {lastFetch ? ` · last: ${lastFetch}` : ''}
      </div>

      <PageHeaderFlow active="output" />

      <PageObjective
        objective="Build all 10 EAOS practical components to production grade · drill-link each card to its module · audit cron tracks drift."
        storageKey="eaos-top10"
        todos={[
          { id: 't1', label: 'Score endpoint live (/api/v1/eaos/scoreboard)' },
          { id: 't2', label: '10 components scored honestly (no fabricated done)' },
          { id: 't3', label: 'Closer per partial → mostly upgrade plan' },
          { id: 't4', label: 'Cron */6h audits drift detection' },
        ]}
      />

      {err && (
        <div className="glass-card card-4" style={{ marginBottom: 14 }}>
          ⚠ {err}
        </div>
      )}

      {data && (
        <>
          <div className="glass-card glass-strong" style={{
            marginBottom: 14, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {(data.overall_score * 100).toFixed(1)}%
              </div>
              <div className="subtle">Overall score across 10 components</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {Object.entries(data.summary).filter(([k]) => k !== 'total').map(([k, v]) => {
                const st = STATUS_STYLE[k];
                return (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: st?.color || '#64748b' }}>{v}</div>
                    <div className="subtle" style={{ fontSize: 10, textTransform: 'uppercase' }}>{k}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 12,
          }}>
            {data.components.map(c => {
              const st = STATUS_STYLE[c.status] || STATUS_STYLE.missing;
              const inner = (
                <div className={`glass-card ${st.card}`} style={{ cursor: c.ui_route ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 14 }}>{c.label}</strong>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                    {c.purpose}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10 }}>
                    <div>
                      <div className="subtle" style={{ fontSize: 9 }}>DATA</div>
                      <div style={{ fontWeight: 700 }}>{(c.data_score * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="subtle" style={{ fontSize: 9 }}>API</div>
                      <div style={{ fontWeight: 700 }}>{(c.endpoint_score * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="subtle" style={{ fontSize: 9 }}>UI</div>
                      <div style={{ fontWeight: 700 }}>{(c.ui_score * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div>
                      <div className="subtle" style={{ fontSize: 9 }}>OVERALL</div>
                      <div style={{ fontWeight: 700, color: st.color }}>
                        {(c.overall * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                    {c.table && <span>table: <code>{c.table}</code> · </span>}
                    {c.endpoint && <span><code>{c.endpoint}</code></span>}
                  </div>
                </div>
              );
              return c.ui_route ? (
                <Link key={c.id} to={c.ui_route} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {inner}
                </Link>
              ) : (
                <div key={c.id}>{inner}</div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
