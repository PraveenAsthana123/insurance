// CohortFairnessPanel · P1 #13 · per-cohort fairness breakdown per §76.6.
// Wired to /api/v1/ml/fairness/{model}/cohorts.

import { useEffect, useState } from 'react';
import RechartsBarHorizontal from './charts/RechartsBarHorizontal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function CohortFairnessPanel({ accent = '#16a34a', modelName = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/ml/fairness/${modelName}/cohorts`);
        if (!r.ok) throw new Error(`${r.status}`);
        if (!cancelled) setData(await r.json());
      } catch (e) { /* fallthrough */ }
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

  if (busy) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading cohort fairness…</em></div>;
  if (!data) return null;

  const cohorts = data.cohorts || [];
  const violations = data.violations || [];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🤝</span>
        <strong style={{ fontSize: 13, color: accent }}>P1 #13 · Per-cohort fairness · {modelName}</strong>
        <span style={{
          marginLeft: 'auto',
          background: data.overall_pass ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>{data.overall_pass ? '✓ ALL PASS' : `✗ ${violations.length} VIOLATIONS`}</span>
      </div>

      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
        Per §76.6 · Disparate Impact ≥ 0.8 · Equal Opportunity gap &lt; 5% per cohort.
      </div>

      {violations.length > 0 && (
        <div style={{
          padding: 6, marginBottom: 8, background: '#fee2e2', color: '#991b1b',
          border: '1px solid #dc2626', borderRadius: 3, fontSize: 10,
        }}>
          <strong>⚠ Violations:</strong> {violations.join(' · ')}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>
          Disparate Impact per cohort (threshold: 0.8)
        </div>
        <RechartsBarHorizontal
          data={cohorts.map((c) => ({
            name: c.cohort,
            value: c.disparate_impact,
            color: c.pass ? '#16a34a' : '#dc2626',
          }))}
          height={Math.max(160, cohorts.length * 28)}
        />
      </div>

      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: 4 }}>Cohort</th>
            <th style={{ padding: 4 }}>n</th>
            <th style={{ padding: 4 }}>DI</th>
            <th style={{ padding: 4 }}>EO gap</th>
            <th style={{ padding: 4 }}>Pass</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: 4, fontFamily: 'monospace' }}>{c.cohort}</td>
              <td style={{ padding: 4 }}>{c.n_samples}</td>
              <td style={{ padding: 4, color: c.disparate_impact >= 0.8 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {c.disparate_impact}
              </td>
              <td style={{ padding: 4, color: c.equal_opportunity_gap < 0.05 ? '#16a34a' : '#dc2626' }}>
                {(c.equal_opportunity_gap * 100).toFixed(1)}%
              </td>
              <td style={{ padding: 4 }}>
                {c.pass
                  ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                  : <span style={{ color: '#dc2626', fontWeight: 700 }}>✗</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/fairness/{modelName}/cohorts · §76.6 fairness pillar
      </div>
    </div>
  );
}
