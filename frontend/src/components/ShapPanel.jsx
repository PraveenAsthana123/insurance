// ShapPanel — shared live-data panel for SHAP feature importance (P0.4).
// Wired to /api/v1/ml/shap/{model_name} (honest stub).
// Closes EU AI Act Art. 86 visibility blocker.
//
// Injects into ProcessAnalysisTab + AnalysisTab + ExpAITab.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function ShapPanel({ accent = '#dc2626', modelName = 'default' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/ml/shap/${encodeURIComponent(modelName)}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(`live SHAP wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [modelName]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={card}><em style={{ fontSize: 11, color: '#94a3b8' }}>Loading SHAP feature importance…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>SHAP wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }

  const runtime = data?.runtime_available;
  const features = data?.features || [];

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <strong style={{ fontSize: 13, color: accent }}>P0.4 · SHAP feature importance (EU AI Act Art. 86)</strong>
        <span style={{
          marginLeft: 'auto',
          background: runtime ? '#10b981' : '#94a3b8',
          color: '#fff', padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700,
        }}>{runtime ? 'LIVE' : 'STUB'}</span>
      </div>

      <div style={{ fontSize: 11, color: '#64748b' }}>
        Model: <code>{modelName}</code>
      </div>

      {!runtime ? (
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          <strong>SHAP runtime not available.</strong> Reason: <em>{data?.reason || 'unknown'}</em>
          <br />
          When SHAP installed (<code>pip install shap</code>) + per-model run wired, this panel
          will show: top-10 features · importance score · positive/negative direction · per-prediction explanation drilldown.
          <br />
          Status: <strong>honest empty</strong> per §57.7. EU AI Act Art. 86 (right to explanation) blocker.
        </div>
      ) : features.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 6 }}>
          SHAP runtime available · <em>{data?.reason}</em>
          <br />
          Wire backend/ml/reference/full_lifecycle.py SHAP capture · then per-model results
          appear here.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11, marginTop: 6 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Feature</th>
              <th style={{ padding: 4 }}>Importance</th>
              <th style={{ padding: 4 }}>Direction</th>
              <th style={{ padding: 4 }}>Bar</th>
            </tr>
          </thead>
          <tbody>
            {features.slice(0, 10).map((f, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4, fontFamily: 'monospace' }}>{f.name}</td>
                <td style={{ padding: 4 }}>{f.importance?.toFixed(3)}</td>
                <td style={{ padding: 4, color: f.direction === 'positive' ? '#16a34a' : '#dc2626' }}>
                  {f.direction === 'positive' ? '▲ positive' : '▼ negative'}
                </td>
                <td style={{ padding: 4, width: '30%' }}>
                  <div style={{
                    height: 8,
                    background: f.direction === 'positive' ? '#dcfce7' : '#fee2e2',
                    border: `1px solid ${f.direction === 'positive' ? '#16a34a' : '#dc2626'}`,
                    width: `${(f.importance || 0) * 200}%`, maxWidth: '100%',
                    borderRadius: 2,
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/shap/{modelName} · §48 explainability · §57.7 honest empty per EU AI Act Art. 86
      </div>
    </div>
  );
}
