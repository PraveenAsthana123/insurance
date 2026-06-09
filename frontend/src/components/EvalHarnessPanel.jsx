// EvalHarnessPanel — shared live-data panel for ML eval results (P0.5).
// Wired to /api/v1/ml/eval/{dept}/{process}.
//
// Injects into ProcessAccuracyTab + AccuracyTab (insurance §73).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function EvalHarnessPanel({ accent = '#f59e0b', dept = 'default', process = 'default' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/ml/eval/${encodeURIComponent(dept)}/${encodeURIComponent(process)}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(`live eval wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dept, process]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={card}><em style={{ fontSize: 11, color: '#94a3b8' }}>Loading eval harness…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>Eval harness wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }

  const runtime = data?.runtime_available;
  const metrics = data?.metrics || {};
  const metricKeys = Object.keys(metrics);

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <strong style={{ fontSize: 13, color: accent }}>P0.5 · Eval harness · {dept}/{process}</strong>
        <span style={{
          marginLeft: 'auto',
          background: runtime ? '#10b981' : '#94a3b8',
          color: '#fff', padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700,
        }}>{runtime ? 'LIVE' : 'STUB'}</span>
      </div>

      {!runtime ? (
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <strong>Eval harness not wired yet.</strong> Reason: <em>{data?.reason}</em>
          <br />
          When wired, this panel will surface per-run metrics:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li><strong>Classification</strong>: accuracy · precision · recall · F1 · ROC AUC</li>
            <li><strong>Regression</strong>: MAE · RMSE · MAPE · R²</li>
            <li><strong>RAG</strong>: faithfulness · context precision · answer relevance · citation accuracy (per §59.4)</li>
            <li><strong>Subject-wise CV</strong>: LOSO · per-subject performance · bottom 10%</li>
          </ul>
          Run <code>backend/ml/reference/full_lifecycle.py --dept {dept} --process {process}</code> to produce eval data.
          Status: <strong>honest empty</strong> per §57.7.
        </div>
      ) : metricKeys.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          No eval runs for {dept}/{process} yet.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Metric</th>
              <th style={{ padding: 4 }}>Value</th>
              <th style={{ padding: 4 }}>Target</th>
              <th style={{ padding: 4 }}>Pass</th>
            </tr>
          </thead>
          <tbody>
            {metricKeys.map((k) => {
              const m = metrics[k];
              const pass = m.pass !== undefined ? m.pass : null;
              return (
                <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, fontFamily: 'monospace' }}>{k}</td>
                  <td style={{ padding: 4 }}>{m.value?.toFixed(3) ?? '—'}</td>
                  <td style={{ padding: 4 }}>{m.target?.toFixed(3) ?? '—'}</td>
                  <td style={{ padding: 4 }}>
                    {pass === true ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ pass</span>
                    : pass === false ? <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ fail</span>
                    : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/eval/{dept}/{process} · §74 lifecycle · §75 metrics · §57.7 honest empty
      </div>
    </div>
  );
}
