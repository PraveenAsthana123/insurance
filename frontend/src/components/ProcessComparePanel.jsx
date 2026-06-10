// ProcessComparePanel · Iter 21 · side-by-side compare of 2 processes.
// Pulls Use Case completeness + ResAI aggregate for each.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const PRESET_PROCESSES = [
  'fraud-ring-detection',
  'underwriting-triage',
  'claim-routing',
  'churn-prediction',
  'first-notice-of-loss',
];

export default function ProcessComparePanel({ accent = '#8b5cf6' }) {
  const [left, setLeft] = useState(PRESET_PROCESSES[0]);
  const [right, setRight] = useState(PRESET_PROCESSES[1]);
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function loadOne(processId, setter) {
    const [uc, resai, reg] = await Promise.all([
      fetch(`${API_BASE}/api/v1/use-cases/${processId}/score`).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/responsible-ai/${processId}/summary/report`).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/regulatory/${processId}`).then(r => r.json()),
    ]);
    setter({ uc, resai, reg, processId });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        await Promise.all([
          loadOne(left, (v) => !cancelled && setLeftData(v)),
          loadOne(right, (v) => !cancelled && setRightData(v)),
        ]);
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [left, right]);

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  function row(label, l, r, fmt = (v) => v) {
    const leftVal = l != null ? fmt(l) : '—';
    const rightVal = r != null ? fmt(r) : '—';
    const num = typeof l === 'number' && typeof r === 'number';
    return (
      <tr style={{ borderTop: '1px solid #f1f5f9' }}>
        <td style={{ padding: 6, color: '#64748b', fontSize: 11 }}>{label}</td>
        <td style={{ padding: 6, fontWeight: num && l > r ? 700 : 400, color: num && l > r ? '#16a34a' : '#1e293b' }}>{leftVal}</td>
        <td style={{ padding: 6, fontWeight: num && r > l ? 700 : 400, color: num && r > l ? '#16a34a' : '#1e293b' }}>{rightVal}</td>
        <td style={{ padding: 6, fontSize: 10, color: num ? (l > r ? '#16a34a' : r > l ? '#dc2626' : '#94a3b8') : '#94a3b8' }}>
          {num ? `${l > r ? '+' : ''}${(l - r).toFixed(3)}` : '—'}
        </td>
      </tr>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>⚖</span>
        <strong style={{ fontSize: 13, color: accent }}>Iter 21 · Process compare</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <ProcessPicker value={left} onChange={setLeft} accent="#3b82f6" />
        <span style={{ alignSelf: 'center', color: '#94a3b8' }}>vs</span>
        <ProcessPicker value={right} onChange={setRight} accent="#dc2626" />
      </div>
      {busy && <em style={{ fontSize: 10, color: '#94a3b8' }}>Loading…</em>}
      {leftData && rightData && (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ color: '#64748b' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>Metric</th>
              <th style={{ padding: 6, textAlign: 'left', color: '#3b82f6' }}>{leftData.processId}</th>
              <th style={{ padding: 6, textAlign: 'left', color: '#dc2626' }}>{rightData.processId}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {row('Use Case completeness',
              leftData.uc?.completeness_score / 17,
              rightData.uc?.completeness_score / 17,
              (v) => `${(v * 100).toFixed(1)}%`)}
            {row('ResAI aggregate',
              leftData.resai?.aggregate_score,
              rightData.resai?.aggregate_score,
              (v) => `${(v * 100).toFixed(1)}%`)}
            {row('ResAI passing',
              leftData.resai?.passing,
              rightData.resai?.passing)}
            {row('ResAI failing',
              leftData.resai?.failing,
              rightData.resai?.failing)}
            {row('Regulatory compliance',
              leftData.reg?.compliance_pct / 100,
              rightData.reg?.compliance_pct / 100,
              (v) => `${(v * 100).toFixed(1)}%`)}
            {row('Libraries active',
              leftData.resai?.libraries_active,
              rightData.resai?.libraries_active)}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · /use-cases + /responsible-ai + /regulatory · Iter 21
      </div>
    </div>
  );
}

function ProcessPicker({ value, onChange, accent }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      flex: 1, padding: 4, fontSize: 11,
      border: `1px solid ${accent}`, borderRadius: 3, color: accent,
    }}>
      {PRESET_PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}
