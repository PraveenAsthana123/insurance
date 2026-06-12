// §EAOS-07 · EvaluationOps · operator 2026-06-12 23-level brief.
// Consolidated view: accuracy · hallucination · bias · toxicity · trust.
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const DIM_COLOR = {
  scalability: '#3b82f6', performance: '#f59e0b', load_testing: '#06b6d4',
  error_handling: '#10b981', resource_memory: '#a855f7', agent_quality: '#ec4899',
  logging: '#10b981', observability: '#06b6d4', tracking: '#3b82f6',
  benchmarking: '#a855f7', scoring_quality: '#10b981',
};

export default function EvalOpsPage() {
  const [scorecard, setScorecard] = useState(null);
  const [gates, setGates] = useState(null);
  const [err, setErr] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    try {
      const h = { 'X-Demo-Role': 'manager' };
      const [r1, r2] = await Promise.all([
        fetch(`${API}/api/v1/test-catalog/top-1pct-report`, { headers: h }),
        fetch(`${API}/api/v1/verification/gates`, { headers: h }),
      ]);
      setScorecard(await r1.json());
      setGates(await r2.json());
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🧪 EvaluationOps</h1>
      <div className="subtle" style={{ marginBottom: 16 }}>
        Accuracy · hallucination · bias · toxicity · trust · all gates
        {lastFetch ? ` · last: ${lastFetch}` : ''}
      </div>

      <PageHeaderFlow active="output" />

      <PageObjective
        objective="One surface for every evaluation signal across model · prompt · agent · RAG. Each row is operator-actionable."
        storageKey="evalops"
        todos={[
          { id: 'e1', label: 'Top-1% scorecard live (11 dimensions)' },
          { id: 'e2', label: '§B5 verification gates listed (9 gates)' },
          { id: 'e3', label: 'Drill-into any gate to run on a specific invocation' },
          { id: 'e4', label: 'RAGAS faithfulness graph (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      {scorecard && (
        <>
          <div className="glass-card glass-strong" style={{
            marginBottom: 14, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                Grade {scorecard.summary?.overall_grade}
              </div>
              <div className="subtle">
                {scorecard.summary?.n_passing_80pct}/{scorecard.summary?.n_dimensions} dimensions passing 80%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700,
                            color: scorecard.summary?.is_top_1_pct ? '#10b981' : '#94a3b8' }}>
                {(scorecard.summary?.average_score * 100).toFixed(1)}%
              </div>
              <div className="subtle">
                {scorecard.summary?.is_top_1_pct ? '✓ TOP-1%' : 'standard'}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top-1% scorecard · 11 dimensions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10, marginBottom: 18,
          }}>
            {(scorecard.scorecard || []).map(r => {
              const colorVar = DIM_COLOR[r.id] || '#64748b';
              return (
                <div key={r.id} className="glass-card" style={{
                  borderLeft: `5px solid ${colorVar}`,
                  background: 'rgba(255,255,255,0.78)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 12 }}>{r.label}</strong>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colorVar }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="subtle" style={{ fontSize: 10, marginTop: 6 }}>
                    {r.pass_gate?.slice(0, 70)}
                  </div>
                </div>
              );
            })}
          </div>

          {gates && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                           textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verification gates · §B5 · {gates.n_gates} gates
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 8,
              }} className="card-rotate">
                {(gates.gates || []).map(g => (
                  <div key={g}>
                    <strong style={{ fontSize: 12 }}>{g}</strong>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>gate</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
                Drill: <Link to="/" style={{ color: '#2563eb' }}>POST /api/v1/verification/run</Link> with an invocation_id to fire all 9 gates and emit trace events.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
