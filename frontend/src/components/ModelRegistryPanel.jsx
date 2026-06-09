// ModelRegistryPanel — shared live-data panel for MLflow model registry.
// Wired to /api/v1/ml/models (honest stub · returns empty if MLflow unavailable).
//
// Injects into ProcessModelsTab + ModelTab. Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md
// P0.3 closure.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function ModelRegistryPanel({ accent = '#0ea5e9', dept, process }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const params = new URLSearchParams();
        if (dept) params.set('dept', dept);
        if (process) params.set('process', process);
        const r = await fetch(`${API_BASE}/api/v1/ml/models?${params.toString()}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(`live model registry wire failed: ${e.message}`);
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

  if (busy) return <div style={card}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading MLflow registry…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>Model registry wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }

  const runtimeAvailable = data?.runtime_available;
  const models = data?.models || [];

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <strong style={{ fontSize: 13, color: accent }}>P0.3 · MLflow model registry</strong>
        <span style={{
          marginLeft: 'auto',
          background: runtimeAvailable ? '#10b981' : '#94a3b8',
          color: '#fff', padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700,
        }}>
          {runtimeAvailable ? 'LIVE' : 'STUB'}
        </span>
      </div>

      {!runtimeAvailable ? (
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <strong>MLflow runtime not available.</strong> Reason: <em>{data?.reason || 'unknown'}</em>
          <br />
          When MLflow is installed and connected (set <code>MLFLOW_TRACKING_URI</code>), this panel
          will show: model name · version · stage · created date · per-model card link.
          <br />
          Status: <strong>honest empty</strong> per §57.7 · NOT fabricated demo data.
        </div>
      ) : models.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          MLflow runtime available · 0 registered models found.
          Run <code>backend/ml/reference/full_lifecycle.py</code> with <code>--mlflow-tracking-uri</code> to populate.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Model</th>
              <th style={{ padding: 4 }}>Version</th>
              <th style={{ padding: 4 }}>Stage</th>
              <th style={{ padding: 4 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {models.slice(0, 10).map((m) => (
              <tr key={m.name + (m.version || '')} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4, fontFamily: 'monospace' }}>{m.name}</td>
                <td style={{ padding: 4 }}>{m.version || '—'}</td>
                <td style={{ padding: 4 }}>
                  <span style={{
                    background: m.stage === 'Production' ? '#dcfce7' : m.stage === 'Staging' ? '#fef3c7' : '#dbeafe',
                    color: m.stage === 'Production' ? '#166534' : m.stage === 'Staging' ? '#92400e' : '#1e40af',
                    padding: '1px 6px', borderRadius: 3,
                    fontSize: 9, fontWeight: 700,
                  }}>
                    {m.stage || 'None'}
                  </span>
                </td>
                <td style={{ padding: 4, color: '#94a3b8', fontSize: 10 }}>{m.created_at || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/models · §38.3 + §74 ML lifecycle · runtime probe per §57.7
      </div>
    </div>
  );
}
