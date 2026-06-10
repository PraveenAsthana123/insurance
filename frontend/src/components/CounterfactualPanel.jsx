// CounterfactualPanel · P1 #15 · counterfactual examples per §48.7.
// Wired to /api/v1/ml/shap/{model}/counterfactual.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function CounterfactualPanel({ accent = '#dc2626', modelName = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/ml/shap/${modelName}/counterfactual`);
        if (!r.ok) throw new Error(`${r.status}`);
        if (!cancelled) setData(await r.json());
      } catch (e) { /* fallthrough · panel shows error state */ }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [modelName]);

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading counterfactuals…</em></div>;
  if (!data) return null;

  const examples = data.examples || [];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🔄</span>
        <strong style={{ fontSize: 13, color: accent }}>P1 #15 · Counterfactuals · {modelName}</strong>
        <span style={{
          marginLeft: 'auto', background: data.scaffold ? '#d97706' : '#16a34a',
          color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>{data.scaffold ? 'SCAFFOLD' : 'LIVE'}</span>
      </div>

      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
        Per §48.7 EU AI Act Art. 86 · counterfactuals MUST be minimal · actionable · plausible · NEVER on protected attributes.
      </div>

      {examples.map((ex, i) => (
        <div key={i} style={{
          padding: 8, marginBottom: 6,
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4 }}>
            #{i + 1} · {ex.scenario}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Original</div>
              <pre style={{ margin: 0, padding: 4, background: '#fee2e2', borderRadius: 3, fontSize: 10, color: '#991b1b' }}>
                {JSON.stringify(ex.original_features, null, 2)}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Counterfactual</div>
              <pre style={{ margin: 0, padding: 4, background: '#dcfce7', borderRadius: 3, fontSize: 10, color: '#166534' }}>
                {JSON.stringify(ex.counterfactual, null, 2)}
              </pre>
            </div>
          </div>
          <div style={{ padding: 6, background: '#fff', border: `1px solid ${accent}30`, borderRadius: 3, fontSize: 10, color: '#1e293b' }}>
            <strong>📝 {ex.delta}</strong>
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
            <Badge label="MINIMAL" value={ex.minimal} />
            <Badge label="ACTIONABLE" value={ex.actionable} />
            <Badge label="PLAUSIBLE" value={ex.plausible} />
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/shap/{modelName}/counterfactual · §48.7 EU AI Act Art. 86
      </div>
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
      background: value ? '#dcfce7' : '#fee2e2',
      color: value ? '#166534' : '#991b1b',
    }}>{value ? '✓' : '✗'} {label}</span>
  );
}
