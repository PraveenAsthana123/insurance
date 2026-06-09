// AutomaticPipelinePanel · §93 Automatic mode · pipeline DAG · 10 phases.
// Wired to /api/v1/pipeline/automatic/* (backend shipped in d19e450e).

import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function AutomaticPipelinePanel({ accent = '#10b981', processId = 'demo-process' }) {
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const runPipeline = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/v1/pipeline/automatic/run`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({process_id: processId}),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setRun(await r.json());
    } catch (e) {
      setError(`pipeline run failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  const overall = run?.overall_quality_score;
  const overallColor = overall >= 0.85 ? '#16a34a' : overall >= 0.70 ? '#d97706' : '#dc2626';

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🚀</span>
        <strong style={{ fontSize: 13, color: accent }}>§93 · Automatic Pipeline</strong>
        <span style={{
          marginLeft: 'auto', background: '#10b981', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>10 PHASES</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <button onClick={runPipeline} disabled={busy} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
          background: busy ? '#94a3b8' : accent, color: '#fff', border: 'none', borderRadius: 4,
        }}>
          {busy ? '⏳ running…' : '▶ Run pipeline'}
        </button>
        {processId && <span style={{fontSize: 11, color: '#64748b'}}>process: <code>{processId}</code></span>}
        {run && (
          <span style={{marginLeft: 'auto', fontSize: 12, color: overallColor, fontWeight: 700}}>
            overall quality: {(overall * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {!run ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          Click "Run pipeline" to execute the 10 canonical §93 phases:
          data_load · data_quality · data_split · feature_engineering ·
          model_selection · model_training · model_evaluation ·
          error_analysis · visualization · reporting.
          <br />
          Each phase produces an output · quality_score · completed flag · report.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>#</th>
              <th style={{ padding: 4 }}>Phase</th>
              <th style={{ padding: 4 }}>Quality</th>
              <th style={{ padding: 4 }}>Bar</th>
              <th style={{ padding: 4 }}>Status</th>
              <th style={{ padding: 4 }}>Report</th>
            </tr>
          </thead>
          <tbody>
            {(run.phases || []).map((p, i) => {
              const q = p.quality_score || 0;
              const color = q >= 0.85 ? '#16a34a' : q >= 0.70 ? '#d97706' : '#dc2626';
              return (
                <tr key={p.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: 4, fontFamily: 'monospace' }}>{p.name}</td>
                  <td style={{ padding: 4, color, fontWeight: 600 }}>{(q * 100).toFixed(1)}%</td>
                  <td style={{ padding: 4, width: '25%' }}>
                    <div style={{ height: 8, background: '#f8fafc', borderRadius: 2 }}>
                      <div style={{
                        height: 8, width: `${q * 100}%`,
                        background: color, borderRadius: 2,
                      }} />
                    </div>
                  </td>
                  <td style={{ padding: 4 }}>
                    {p.completed ? <span style={{color: '#16a34a'}}>✓ done</span> : '⏳'}
                  </td>
                  <td style={{ padding: 4, fontSize: 10, color: '#64748b' }}>
                    {p.report?.summary || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · POST /api/v1/pipeline/automatic/run · §93 process-component-ipo-pattern · 10 canonical phases
      </div>
    </div>
  );
}
