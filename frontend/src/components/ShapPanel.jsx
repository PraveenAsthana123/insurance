// ShapPanel — shared live-data panel for SHAP feature importance (P0.4).
// Wired to /api/v1/ml/shap/{model_name}.
// Closes EU AI Act Art. 86 visibility blocker.
//
// Iteration 2 (P0 #2): now renders recharts horizontal bar chart.
//
// Injects into ProcessAnalysisTab + AnalysisTab + ExpAITab.

import { useEffect, useState } from 'react';
import RechartsBarHorizontal from './charts/RechartsBarHorizontal';

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

      {features.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          <strong>SHAP wire empty.</strong> Reason: <em>{data?.reason || 'unknown'}</em>
        </div>
      ) : (
        <>
          {data?.scaffold && (
            <div style={{
              padding: 4, marginBottom: 6, fontSize: 10,
              background: '#fef3c7', color: '#92400e',
              border: '1px solid #d97706', borderRadius: 3,
            }}>
              ⚠ SCAFFOLD per §57.7 · deterministic seed values · install shap + wire eval harness for real SHAP attributions
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <RechartsBarHorizontal
              data={features.slice(0, 10).map((f) => ({
                name: f.name,
                value: f.importance,
                direction: f.direction,
              }))}
              height={300}
            />
          </div>
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/shap/{modelName} · §48 explainability · EU AI Act Art. 86 · §57.7 scaffold badge when not wired
      </div>
    </div>
  );
}
