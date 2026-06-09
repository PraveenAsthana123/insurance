// E2ELatencyPanel — shared live-data panel for T3.4 per-step latency histograms.
// Wired to /api/v1/marketing-kpis/e2e-latencies (T3.4 + T4.3 already shipped).
//
// Injects into ProcessTestingTab + ProcessAccuracyTab + TestsTab.
// Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md backend-wire backlog
// (eval harness · accuracy display).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function E2ELatencyPanel({ accent = '#0ea5e9', windowRuns = 20 }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/marketing-kpis/e2e-latencies?window_runs=${windowRuns}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(`live latency wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [windowRuns]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) {
    return <div style={card}><em style={{ fontSize: 11, color: '#94a3b8' }}>Loading T3.4 latency histograms…</em></div>;
  }
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>E2E latency wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }
  const steps = data?.steps || [];
  const slowest = steps.reduce((acc, s) => (s.p95 > (acc?.p95 || 0) ? s : acc), null);
  const totalFails = steps.reduce((n, s) => n + (s.fail_count || 0), 0);
  const maxP99 = Math.max(...steps.map((s) => s.p99 || 0), 1);

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>⏱</span>
        <strong style={{ fontSize: 13, color: accent }}>T3.4 · Live E2E step latencies (last {windowRuns} runs)</strong>
        <span style={{
          marginLeft: 'auto',
          background: '#10b981', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>LIVE BACKEND</span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="STEPS" value={steps.length} accent={accent} />
        <Tile label="RUNS" value={data?.n_runs_available || 0} accent="#3b82f6" />
        <Tile label="SLOWEST P95" value={slowest ? `${Math.round(slowest.p95)}ms` : '—'} accent="#d97706" />
        <Tile label="FAILS" value={totalFails} accent={totalFails > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {steps.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          No latency data yet. Run <code>scripts/audit_marketing_e2e_flow.py</code> to populate
          the <code>e2e_step_latencies</code> table.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Step</th>
              <th style={{ padding: 4 }}>p50</th>
              <th style={{ padding: 4 }}>p95</th>
              <th style={{ padding: 4 }}>p99</th>
              <th style={{ padding: 4 }}>Bar (p50 · p95 · p99)</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => {
              const tier = s.p95 < 50 ? '#16a34a' : s.p95 < 200 ? '#d97706' : '#dc2626';
              const p50w = (s.p50 / maxP99) * 100;
              const p95w = (s.p95 / maxP99) * 100;
              const p99w = (s.p99 / maxP99) * 100;
              return (
                <tr key={s.step_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, fontWeight: 600 }}>{s.step_id}</td>
                  <td style={{ padding: 4 }}>{s.p50?.toFixed(0)}ms</td>
                  <td style={{ padding: 4, color: tier, fontWeight: 600 }}>{s.p95?.toFixed(0)}ms</td>
                  <td style={{ padding: 4 }}>{s.p99?.toFixed(0)}ms</td>
                  <td style={{ padding: 4, width: '30%' }}>
                    <div style={{ position: 'relative', height: 10, background: '#f8fafc', borderRadius: 2 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p99w}%`, background: `${tier}30` }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p95w}%`, background: `${tier}80` }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p50w}%`, background: tier }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/marketing-kpis/e2e-latencies · T3.4 + T4.3 · §82.7 drift detection · color tiers: green &lt;50ms · amber 50-200ms · red &gt;200ms
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{
      padding: 6, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
