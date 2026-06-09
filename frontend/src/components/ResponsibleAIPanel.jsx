// ResponsibleAIPanel · 12-lens Responsible AI per process.
// Wired to /api/v1/responsible-ai/{process_id}/lenses.
//
// Per operator brief 2026-06-09: ResAI tab must expose component per
// AI lens (Input · Process · Output · Recommendation · Score · ExpAI ·
// Portability · Performance · Ethical · Governance · Interpretable ·
// Fairness) · each with Input · Output · Process · Library · Score ·
// Final outcome · Summary report.

import { useEffect, useState } from 'react';
import TimeSeriesLine from './charts/TimeSeriesLine';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const OUTCOME_TONE = {
  pass:     { bg: '#dcfce7', fg: '#166534', border: '#16a34a' },
  partial:  { bg: '#fef3c7', fg: '#92400e', border: '#d97706' },
  fail:     { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626' },
  scaffold: { bg: '#f1f5f9', fg: '#475569', border: '#94a3b8' },
};

export default function ResponsibleAIPanel({ accent = '#dc2626', processId = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLens, setExpandedLens] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const [l, s] = await Promise.all([
          fetch(`${API_BASE}/api/v1/responsible-ai/${processId}/lenses`).then(r => r.json()),
          fetch(`${API_BASE}/api/v1/responsible-ai/${processId}/summary/report`).then(r => r.json()),
        ]);
        if (!cancelled) { setData(l); setSummary(s); }
      } catch (e) { if (!cancelled) setError(`ResAI wire failed: ${e.message}`); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [processId]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={card}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading 12-lens ResAI…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{fontSize: 11, color: '#991b1b'}}><strong>ResAI wire unavailable.</strong> {error}</div>
      </div>
    );
  }

  const lenses = data?.lenses || [];
  const aggScore = summary?.aggregate_score || 0;
  const aggColor = aggScore >= 0.90 ? '#16a34a' : aggScore >= 0.75 ? '#d97706' : '#dc2626';

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🛡</span>
        <strong style={{ fontSize: 13, color: accent }}>Responsible AI · 12 lenses · {processId}</strong>
        <span style={{
          marginLeft: 'auto',
          background: aggColor, color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>
          aggregate {(aggScore * 100).toFixed(1)}%
        </span>
      </div>

      {/* Outcome summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="LENSES" value={summary?.n_lenses || 12} accent={accent} />
        <Tile label="PASS" value={summary?.passing || 0} accent="#16a34a" />
        <Tile label="PARTIAL" value={summary?.partial || 0} accent="#d97706" />
        <Tile label="FAIL" value={summary?.failing || 0} accent="#dc2626" />
        <Tile label="SCAFFOLD" value={summary?.scaffold || 0} accent="#94a3b8" />
      </div>

      {/* 12-lens grid · 4 columns × 3 rows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 8,
      }}>
        {lenses.map((lens) => {
          const tone = OUTCOME_TONE[lens.final_outcome] || OUTCOME_TONE.scaffold;
          const isOpen = expandedLens === lens.id;
          return (
            <div key={lens.id} style={{
              border: `1px solid ${lens.section_color}40`,
              borderRadius: 4,
              padding: 8,
              background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{lens.icon}</span>
                <strong style={{ fontSize: 12, color: lens.section_color, flex: 1 }}>{lens.name}</strong>
                <span style={{
                  background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
                  padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  {lens.final_outcome}
                </span>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                {lens.purpose}
              </div>

              {/* Score bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                  <span>Score</span>
                  <span style={{ fontWeight: 600, color: lens.section_color }}>{(lens.score * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 2 }}>
                  <div style={{
                    height: 6, width: `${lens.score * 100}%`,
                    background: lens.section_color, borderRadius: 2,
                  }} />
                </div>
              </div>

              {/* Library */}
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>
                <strong>📚 Library:</strong> {lens.library}
                <span style={{
                  marginLeft: 6,
                  padding: '0 4px', borderRadius: 2, fontSize: 8, fontWeight: 700,
                  background: lens.library_state?.installed ? '#dcfce7' : '#fee2e2',
                  color: lens.library_state?.installed ? '#166534' : '#991b1b',
                }}>
                  {lens.library_state?.installed ? 'INSTALLED' : 'NOT INSTALLED'}
                </span>
              </div>

              {/* Expand/collapse button */}
              <button
                onClick={() => setExpandedLens(isOpen ? null : lens.id)}
                style={{
                  width: '100%', padding: '3px 6px', fontSize: 10,
                  background: lens.section_color, color: '#fff',
                  border: 'none', borderRadius: 3, cursor: 'pointer',
                }}>
                {isOpen ? '▲ Collapse' : '▼ Details'}
              </button>

              {isOpen && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#0ea5e9' }}>📥 Input:</strong> {lens.input}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#8b5cf6' }}>⚙ Process:</strong> {lens.process}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#10b981' }}>📤 Output:</strong> {lens.output}
                  </div>
                  {/* P0 #8 · 30-day drift time-series */}
                  <LensTimeseries
                    processId={processId}
                    lensId={lens.id}
                    color={lens.section_color}
                  />
                  <div style={{
                    marginTop: 6, padding: 4, background: '#f9fafb', borderRadius: 3,
                    fontSize: 9, fontStyle: 'italic', color: '#64748b',
                  }}>
                    <strong>📊 Summary:</strong> {lens.summary_report}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/responsible-ai/{processId}/lenses · 12-lens structure · §57.7 scaffold when library not installed
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
      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}

// P0 #8 · Per-lens 30-day drift time-series
function LensTimeseries({ processId, lensId, color }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/responsible-ai/${processId}/${lensId}/timeseries?days=30`);
        if (!r.ok) throw new Error(`${r.status}`);
        if (!cancelled) setData(await r.json());
      } catch (e) { if (!cancelled) setError(e.message); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [processId, lensId]);

  if (busy) return <em style={{ fontSize: 9, color: '#94a3b8' }}>loading timeseries…</em>;
  if (error || !data) return null;

  return (
    <div style={{ marginTop: 6, padding: 4, background: '#f9fafb', borderRadius: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
        <strong style={{ color }}>📉 30-day drift</strong>
        <span style={{
          color: data.drift_delta < -0.05 ? '#dc2626' : data.drift_delta > 0.02 ? '#16a34a' : '#475569',
          fontWeight: 700,
        }}>
          Δ {(data.drift_delta * 100).toFixed(1)}%
          {data.drift_alert && ' ⚠ ALERT'}
        </span>
      </div>
      <TimeSeriesLine
        data={data.series}
        color={color}
        baseline={data.baseline_score}
        height={100}
      />
    </div>
  );
}
