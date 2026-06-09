// EvalHarnessPanel — shared live-data panel for ML eval results (P0.5).
// Wired to /api/v1/ml/eval/{dept}/{process}.
//
// Iteration 2-3 (P0 #3 + #4): renders confusion matrix heatmap + ROC curve.
//
// Injects into ProcessAccuracyTab + AccuracyTab (insurance §73).

import { useEffect, useState } from 'react';
import ConfusionMatrixHeatmap from './charts/ConfusionMatrixHeatmap';
import ROCCurve from './charts/ROCCurve';

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
  const cm = data?.confusion_matrix;
  const roc = data?.roc_curve;
  const isScaffold = data?.scaffold === true;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <strong style={{ fontSize: 13, color: accent }}>P0.5 · Eval harness · {dept}/{process}</strong>
        <span style={{
          marginLeft: 'auto',
          background: runtime ? '#10b981' : isScaffold ? '#d97706' : '#94a3b8',
          color: '#fff', padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700,
        }}>{runtime ? 'LIVE' : isScaffold ? 'SCAFFOLD' : 'STUB'}</span>
      </div>

      {isScaffold && (
        <div style={{
          padding: 4, marginBottom: 6, fontSize: 10,
          background: '#fef3c7', color: '#92400e',
          border: '1px solid #d97706', borderRadius: 3,
        }}>
          ⚠ SCAFFOLD per §57.7 · deterministic-seeded metrics · install MLflow + wire full_lifecycle.py for real eval
        </div>
      )}

      {Object.keys(metrics).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
          {['accuracy', 'precision', 'recall', 'f1', 'auc'].map((k) => metrics[k] != null && (
            <div key={k} style={{
              padding: 6, background: '#fff',
              border: '1px solid #3b82f6', borderRadius: 4, textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>
                {(metrics[k] * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>{k}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {cm && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Confusion matrix</div>
            <ConfusionMatrixHeatmap labels={cm.labels} matrix={cm.matrix} cellSize={70} />
          </div>
        )}
        {roc && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>ROC curve</div>
            <ROCCurve points={roc.points} auc={roc.auc} height={200} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/eval/{dept}/{process} · §74 lifecycle · §75 metrics · §57.7 scaffold badge when not wired
      </div>
    </div>
  );
}
