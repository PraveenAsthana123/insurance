// AutonomousAgentPage — visualize the §80 autonomous AI decision loop.
//
// Per docs/PENDING_PLAN.md T3.1. Closes the visualization story for the
// rule-based autonomous agent shipped in commit 36b86a2.
//
// Layout:
//   LEFT  · Objective form + Trigger
//   RIGHT · Latest run (4 metric tiles + decision chain + fairness panel)
//   BELOW · Past run history (clickable rows)
//
// Composes with §38.3 (decisions[] is the audit row) + §76 (RAI gate
// visible via fairness_di tile) + §57.7 (rule-based · honest about LLM
// upgrade path).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const ACTION_COLOR = {
  create_campaign: '#1e40af',
  execute_campaign: '#0ea5e9',
  measure: '#9333ea',
  halt_objective_met: '#16a34a',
  halt_budget_exhausted: '#d97706',
  rai_halt: '#dc2626',
  switch_channel: '#f59e0b',
};

export default function AutonomousAgentPage() {
  const [objective, setObjective] = useState({
    description: 'Improve gold-tier engagement uplift',
    target_metric: 'conversion_rate',
    target_value: 0.5,
    max_iterations: 3,
    allowed_channels: ['survey', 'form', 'email'],
    initial_segment: 'gold',
  });
  const [latestRun, setLatestRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fetchJSON = async (path, opts = {}) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' }, ...opts,
    });
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
    return r.json();
  };

  const loadHistory = async () => {
    try {
      const d = await fetchJSON('/api/v1/marketing-campaigns/autonomous/runs?limit=10');
      setHistory(d.items || []);
    } catch (e) { setError(`history: ${e.message}`); }
  };

  useEffect(() => { loadHistory(); }, []);

  const triggerAgent = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetchJSON('/api/v1/marketing-campaigns/autonomous/run', {
        method: 'POST', body: JSON.stringify(objective),
      });
      setLatestRun(r);
      loadHistory();
    } catch (e) {
      setError(`run: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const loadRun = async (run_ref) => {
    try {
      const d = await fetchJSON(`/api/v1/marketing-campaigns/autonomous/runs/${run_ref}`);
      setLatestRun({
        run_ref: d.run_ref,
        iterations_run: d.iterations_run,
        campaigns_created: d.campaigns_created,
        final_outcome_score: d.final_outcome_score,
        fairness_di: d.fairness_di,
        rai_pass: d.rai_pass,
        status: d.status,
        halt_reason: d.halt_reason,
        decisions: d.decisions || [],
      });
    } catch (e) { setError(`run detail: ${e.message}`); }
  };

  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const small = { fontSize: 11, color: '#64748b' };
  const input = { width: '100%', padding: 6, fontSize: 12, marginBottom: 6 };

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>
        🤖 Autonomous AI Agent · Decision Loop
      </h1>
      <div style={small}>
        Rule-based per §57.7 (LLM upgrade path: §91 WebLLM · T4.1) ·
        §76 fairness gate · §38.3 per-decision audit · §80 decision system
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626', marginTop: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12, marginTop: 8 }}>
        {/* ─── LEFT · objective form ─── */}
        <div>
          <div style={card}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Configure Objective</h3>
            <div style={small}>Description</div>
            <textarea value={objective.description}
                      onChange={(e) => setObjective({...objective, description: e.target.value})}
                      style={{...input, minHeight: 50}} />
            <div style={small}>Target metric</div>
            <select value={objective.target_metric}
                    onChange={(e) => setObjective({...objective, target_metric: e.target.value})}
                    style={input}>
              <option value="conversion_rate">conversion_rate</option>
              <option value="response_rate">response_rate</option>
              <option value="engagement_score">engagement_score</option>
            </select>
            <div style={small}>Target value (0.0 - 1.0)</div>
            <input type="number" min="0" max="1" step="0.05" value={objective.target_value}
                   onChange={(e) => setObjective({...objective, target_value: parseFloat(e.target.value)})}
                   style={input} />
            <div style={small}>Max iterations (1-10)</div>
            <input type="number" min="1" max="10" value={objective.max_iterations}
                   onChange={(e) => setObjective({...objective, max_iterations: parseInt(e.target.value, 10)})}
                   style={input} />
            <div style={small}>Initial segment</div>
            <select value={objective.initial_segment || ''}
                    onChange={(e) => setObjective({...objective, initial_segment: e.target.value || null})}
                    style={input}>
              <option value="">All segments</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="standard">Standard</option>
            </select>
            <div style={small}>Allowed channels (comma-separated)</div>
            <input value={objective.allowed_channels.join(', ')}
                   onChange={(e) => setObjective({...objective,
                     allowed_channels: e.target.value.split(',').map(c => c.trim()).filter(Boolean)})}
                   style={input} />
            <button onClick={triggerAgent} disabled={busy}
                    style={{
                      width: '100%', padding: 10, marginTop: 6,
                      background: busy ? '#94a3b8' : '#1e40af',
                      color: '#fff', border: 'none', borderRadius: 4,
                      fontSize: 13, fontWeight: 700,
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}>
              {busy ? '⏳ Agent thinking...' : '▶ Trigger Agent'}
            </button>
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>How the loop works</h3>
            <ol style={{ fontSize: 11, paddingLeft: 18, margin: 0, color: '#475569' }}>
              <li>Create campaign for current channel + segment</li>
              <li>Execute · top-1% gates filter audience</li>
              <li>Auto-open responses (simulates engagement)</li>
              <li>Measure · consent + outcome + cohort distribution</li>
              <li>§76 RAI gate · DI ≥ 0.8 required</li>
              <li>Decide next: halt · switch_channel · continue</li>
            </ol>
          </div>
        </div>

        {/* ─── RIGHT · latest run + decisions chain ─── */}
        <div>
          {!latestRun && (
            <div style={card}>
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                Trigger an agent run from the left · or pick a past run below.
              </div>
            </div>
          )}

          {latestRun && (
            <>
              {/* Metrics tiles */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Tile label="Iterations" value={latestRun.iterations_run} accent="#1e40af" />
                <Tile label="Campaigns" value={latestRun.campaigns_created} accent="#9333ea" />
                <Tile label="Outcome"
                      value={latestRun.final_outcome_score?.toFixed(2) ?? '—'}
                      accent="#0ea5e9" />
                <Tile label="Fairness DI"
                      value={latestRun.fairness_di?.toFixed(2) ?? '—'}
                      accent={latestRun.rai_pass ? '#16a34a' : '#dc2626'} />
              </div>

              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>
                    Run · <code>{latestRun.run_ref}</code>
                  </h3>
                  <div>
                    <span style={{
                      background: latestRun.status === 'complete' ? '#16a34a' : '#d97706',
                      color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      marginRight: 4,
                    }}>{latestRun.status}</span>
                    {latestRun.rai_pass !== null && (
                      <span style={{
                        background: latestRun.rai_pass ? '#16a34a' : '#dc2626',
                        color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      }}>{latestRun.rai_pass ? '§76 RAI ✓' : '§76 RAI ✗'}</span>
                    )}
                  </div>
                </div>
                {latestRun.halt_reason && (
                  <div style={{...small, marginTop: 4}}>
                    Halt reason: <code>{latestRun.halt_reason}</code>
                  </div>
                )}
              </div>

              {/* Decisions chain */}
              <div style={card}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
                  Decisions chain · {latestRun.decisions?.length || 0} entries
                </h3>
                <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                  {(latestRun.decisions || []).map((d, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 8, padding: 8, marginBottom: 4,
                      border: '1px solid #f1f5f9', borderRadius: 4,
                      background: i % 2 ? '#f8fafc' : '#fff',
                    }}>
                      <div style={{
                        flex: '0 0 24px', textAlign: 'center', fontWeight: 700,
                        color: '#64748b', fontSize: 11, paddingTop: 2,
                      }}>
                        {d.iteration}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{
                            background: ACTION_COLOR[d.action] || '#64748b',
                            color: '#fff', padding: '2px 6px', borderRadius: 4,
                            fontSize: 10, fontWeight: 600,
                          }}>{d.action}</span>
                          {d.metric_observed !== null && d.metric_observed !== undefined && (
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              metric={d.metric_observed.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                          {d.reasoning}
                        </div>
                        {d.campaign_id && (
                          <div style={small}>
                            campaign_id=<code>{d.campaign_id}</code> ·{' '}
                            <span style={{ color: '#94a3b8' }}>
                              {new Date(d.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── BELOW · history ─── */}
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
          Run History · {history.length} past runs
        </h3>
        {history.length === 0 ? (
          <div style={small}>No runs yet · trigger one above.</div>
        ) : (
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 6 }}>Run Ref</th>
                <th style={{ padding: 6 }}>Started</th>
                <th style={{ padding: 6 }}>Iters</th>
                <th style={{ padding: 6 }}>Status</th>
                <th style={{ padding: 6 }}>Outcome</th>
                <th style={{ padding: 6 }}>Fairness</th>
                <th style={{ padding: 6 }}>RAI</th>
                <th style={{ padding: 6 }}>Objective</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}
                    onClick={() => loadRun(r.run_ref)}
                    style={{
                      borderTop: '1px solid #f1f5f9', cursor: 'pointer',
                      background: latestRun?.run_ref === r.run_ref ? '#dbeafe' : 'transparent',
                    }}>
                  <td style={{ padding: 6 }}><code>{r.run_ref}</code></td>
                  <td style={{ padding: 6, ...small }}>
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: 6 }}>{r.iterations_run}</td>
                  <td style={{ padding: 6 }}>
                    <span style={{
                      background: r.status === 'complete' ? '#16a34a' : '#d97706',
                      color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10,
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: 6 }}>
                    {r.final_outcome_score?.toFixed(2) ?? '—'}
                  </td>
                  <td style={{ padding: 6 }}>{r.fairness_di?.toFixed(2) ?? '—'}</td>
                  <td style={{ padding: 6 }}>
                    {r.rai_pass === true ? '✓' : r.rai_pass === false ? '✗' : '—'}
                  </td>
                  <td style={{ padding: 6, fontSize: 11, color: '#475569' }}>
                    {r.objective?.slice(0, 60)}{r.objective?.length > 60 ? '…' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent = '#1e40af' }) {
  return (
    <div style={{
      flex: 1, padding: 10, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    </div>
  );
}
