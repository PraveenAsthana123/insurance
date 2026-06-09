// MarketingKPIsPage — Enterprise Marketing Command Center.
//
// Per operator's 200+ KPI framework (2026-06-08).
// 5 tabs: Dashboards · KPIs · AI Agents · Maturity · Scorecard
// All data scaffolded · status flags ('live'/'scaffolded'/'planned') honest per §57.7

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const TABS = [
  { id: 'dashboards', name: '📊 Dashboards',     color: '#1e40af' },
  { id: 'kpis',       name: '🎯 KPIs (85+)',     color: '#9333ea' },
  { id: 'alerts',     name: '🚨 Alerts',         color: '#dc2626' },
  { id: 'latencies',  name: '⏱ E2E Latencies',  color: '#0ea5e9' },
  { id: 'agents',     name: '🤖 AI Agents',      color: '#16a34a' },
  { id: 'maturity',   name: '🪜 Maturity',       color: '#d97706' },
  { id: 'scorecard',  name: '🏆 Scorecard',      color: '#7c3aed' },
];

const STATUS_COLOR = {
  live: '#16a34a',
  scaffolded: '#d97706',
  planned: '#94a3b8',
};

export default function MarketingKPIsPage() {
  const [tab, setTab] = useState('dashboards');
  const [stats, setStats] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [agents, setAgents] = useState([]);
  const [maturity, setMaturity] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [latencies, setLatencies] = useState(null);
  const [windowRuns, setWindowRuns] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState(null);

  const fetchJSON = async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchJSON('/api/v1/marketing-kpis/stats');
        setStats(s);
      } catch (e) { setError(`stats: ${e.message}`); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (tab === 'dashboards' && dashboards.length === 0) {
          const d = await fetchJSON('/api/v1/marketing-kpis/dashboards');
          setDashboards(d.dashboards);
        }
        if (tab === 'kpis') {
          const q = selectedCategory ? `?category=${selectedCategory}` : '';
          const d = await fetchJSON(`/api/v1/marketing-kpis/kpis${q}`);
          setKpis(d.kpis);
        }
        if (tab === 'agents' && agents.length === 0) {
          const d = await fetchJSON('/api/v1/marketing-kpis/ai-agents');
          setAgents(d.agents);
        }
        if (tab === 'maturity' && !maturity) {
          setMaturity(await fetchJSON('/api/v1/marketing-kpis/maturity'));
        }
        if (tab === 'scorecard' && !scorecard) {
          setScorecard(await fetchJSON('/api/v1/marketing-kpis/scorecard'));
        }
        if (tab === 'alerts') {
          setAlerts(await fetchJSON('/api/v1/marketing-kpis/alerts'));
        }
        if (tab === 'latencies') {
          setLatencies(await fetchJSON(
            `/api/v1/marketing-kpis/e2e-latencies?window_runs=${windowRuns}`,
          ));
        }
      } catch (e) { setError(`${tab}: ${e.message}`); }
    })();
  }, [tab, selectedCategory, windowRuns]);

  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const small = { fontSize: 11, color: '#64748b' };

  const StatusBadge = ({ status }) => (
    <span style={{
      background: STATUS_COLOR[status] || '#94a3b8',
      color: '#fff', padding: '2px 6px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    }}>{status}</span>
  );

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>
        🎯 Marketing Command Center
      </h1>
      <div style={small}>
        200+ KPI framework · 15 categories · 6 dashboards · 30+ AI agents · 6-level maturity model
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
          <Tile label="KPIs" value={stats.total_kpis} accent="#1e40af" />
          <Tile label="LIVE"        value={stats.by_status.live}        accent="#16a34a" />
          <Tile label="SCAFFOLDED"  value={stats.by_status.scaffolded}  accent="#d97706" />
          <Tile label="PLANNED"     value={stats.by_status.planned}     accent="#94a3b8" />
          <Tile label="Dashboards"  value={stats.total_dashboards}      accent="#9333ea" />
          <Tile label="Agents"      value={stats.total_ai_agents}       accent="#16a34a" />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    background: tab === t.id ? t.color : '#fff',
                    color: tab === t.id ? '#fff' : '#475569',
                    border: `2px solid ${tab === t.id ? t.color : '#e2e8f0'}`,
                    borderRadius: 4, cursor: 'pointer',
                  }}>{t.name}</button>
        ))}
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626' }}>{error}</div>
      )}

      {tab === 'dashboards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {dashboards.map((d) => (
            <div key={d.id} style={card}>
              <h3 style={{ margin: 0, fontSize: 15 }}>
                {d.name} <small style={{ color: '#64748b', fontSize: 11, fontWeight: 400 }}>
                  · {d.audience}
                </small>
              </h3>
              <div style={{ marginTop: 8 }}>
                {(d.kpi_details || []).map((k) => (
                  <div key={k.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid #f1f5f9',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {k.name || k.id}
                      </div>
                      <div style={small}>{k.formula || '(missing from registry)'}</div>
                    </div>
                    {k.status && <StatusBadge status={k.status} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'kpis' && (
        <>
          <div style={card}>
            <select value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ padding: 6, fontSize: 12, marginRight: 8 }}>
              <option value="">All 15 categories</option>
              {[...new Set(kpis.map((k) => k.category))].sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              {/* fallback list of known categories */}
              {['executive','customer','segmentation','campaign','email','website',
                'social','lead','journey','survey','advertising','loyalty','financial',
                'ai','governance'].map((c) => (
                <option key={`fallback-${c}`} value={c}>{c}</option>
              ))}
            </select>
            <span style={small}>{kpis.length} KPIs shown</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {kpis.map((k) => (
              <div key={k.id} style={{
                padding: 8, background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 4, fontSize: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{k.name}</strong>
                  <StatusBadge status={k.status} />
                </div>
                <div style={small}><code>{k.id}</code> · {k.category}</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  <strong>Formula:</strong> {k.formula}
                </div>
                <div style={{ marginTop: 2, fontSize: 11 }}>
                  <strong>Target:</strong> {k.target_op} {k.target ?? '—'} {k.unit}
                </div>
                <div style={{ marginTop: 2, ...small }}>
                  <strong>Source:</strong> {k.source}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'agents' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>15 AI Agents · current implementation</h3>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 6 }}>Marketing Function</th>
                <th style={{ padding: 6 }}>Agent</th>
                <th style={{ padding: 6 }}>Implementation in this project</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}>{a.function}</td>
                  <td style={{ padding: 6 }}><strong>{a.agent}</strong></td>
                  <td style={{ padding: 6, ...small }}><code>{a.implementation}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'maturity' && maturity && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
            Marketing AI Maturity · this project: <strong>{maturity.this_project_level}</strong>
          </h3>
          <div style={small}>Next step: {maturity.next_step}</div>
          <div style={{ marginTop: 12 }}>
            {maturity.levels.map((l, i) => {
              const isCurrent = l.this_project.includes('partial') || l.this_project.includes('shipped');
              return (
                <div key={i} style={{
                  padding: 10, marginBottom: 6, border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  background: isCurrent ? '#dbeafe' : '#f8fafc',
                  borderColor: isCurrent ? '#1e40af' : '#e2e8f0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{l.level} · {l.stage}</strong>
                    <span style={small}>{l.this_project}</span>
                  </div>
                  <div style={small}>{l.characteristics}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'latencies' && latencies && (
        <div>
          {/* Window selector + summary tiles */}
          <div style={{...card, padding: 10}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Window:</strong>
              {[5, 10, 20, 50].map((n) => (
                <button key={n} onClick={() => setWindowRuns(n)}
                        style={{
                          padding: '4px 10px', fontSize: 12,
                          background: windowRuns === n ? '#0ea5e9' : '#fff',
                          color: windowRuns === n ? '#fff' : '#475569',
                          border: `1px solid ${windowRuns === n ? '#0ea5e9' : '#cbd5e1'}`,
                          borderRadius: 4, cursor: 'pointer',
                        }}>
                  last {n} runs
                </button>
              ))}
              <span style={{ marginLeft: 'auto', ...small }}>
                audit_kind=<code>{latencies.audit_kind}</code>
              </span>
            </div>
          </div>

          {/* Summary tiles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Tile label="RUNS AVAIL"  value={latencies.n_runs_available} accent="#1e40af" />
            <Tile label="STEPS"       value={latencies.n_steps}          accent="#9333ea" />
            {(() => {
              const slowest = (latencies.steps || []).reduce(
                (acc, s) => (s.p95 > (acc?.p95 || 0) ? s : acc),
                null,
              );
              return slowest ? (
                <>
                  <Tile label="SLOWEST STEP"
                        value={`${slowest.step_id}`}
                        accent="#dc2626" />
                  <Tile label="MAX P95 (ms)"
                        value={Math.round(slowest.p95)}
                        accent="#dc2626" />
                </>
              ) : null;
            })()}
            {(() => {
              const totalFails = (latencies.steps || []).reduce(
                (n, s) => n + (s.fail_count || 0), 0);
              return (
                <Tile label="FAIL COUNT"
                      value={totalFails}
                      accent={totalFails > 0 ? '#dc2626' : '#16a34a'} />
              );
            })()}
          </div>

          {/* Per-step histogram table */}
          <div style={card}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
              Per-step latency histograms · p50/p95/p99 over last {windowRuns} runs
            </h3>
            {(!latencies.steps || latencies.steps.length === 0) ? (
              <div style={{ ...small, padding: 12 }}>
                No latency data yet. Trigger the E2E flow audit
                (<code>./scripts/audit_marketing_e2e_flow.py</code>) to populate.
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: 6 }}>Step</th>
                    <th style={{ padding: 6 }}>n</th>
                    <th style={{ padding: 6 }}>avg ms</th>
                    <th style={{ padding: 6 }}>p50</th>
                    <th style={{ padding: 6 }}>p95</th>
                    <th style={{ padding: 6 }}>p99</th>
                    <th style={{ padding: 6 }}>Histogram (p50 · p95 · p99)</th>
                    <th style={{ padding: 6 }}>Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxP99 = Math.max(
                      ...latencies.steps.map((s) => s.p99 || 0), 1,
                    );
                    return latencies.steps.map((s) => {
                      const p50w = (s.p50 / maxP99) * 100;
                      const p95w = (s.p95 / maxP99) * 100;
                      const p99w = (s.p99 / maxP99) * 100;
                      // Color tier by p95
                      const color = s.p95 < 50 ? '#16a34a'
                                  : s.p95 < 200 ? '#d97706'
                                  : '#dc2626';
                      return (
                        <tr key={s.step_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 700 }}>{s.step_id}</td>
                          <td style={{ padding: 6 }}>{s.n}</td>
                          <td style={{ padding: 6 }}>{s.avg_ms?.toFixed(1)}</td>
                          <td style={{ padding: 6 }}>{s.p50?.toFixed(1)}</td>
                          <td style={{ padding: 6, color, fontWeight: 600 }}>{s.p95?.toFixed(1)}</td>
                          <td style={{ padding: 6 }}>{s.p99?.toFixed(1)}</td>
                          <td style={{ padding: 6, position: 'relative', width: '40%' }}>
                            <div style={{
                              position: 'relative', height: 14,
                              background: '#f8fafc', borderRadius: 2,
                            }}>
                              {/* p99 (lightest) */}
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${p99w}%`, background: `${color}30`,
                              }} />
                              {/* p95 (medium) */}
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${p95w}%`, background: `${color}80`,
                              }} />
                              {/* p50 (dark) */}
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${p50w}%`, background: color,
                              }} />
                            </div>
                          </td>
                          <td style={{ padding: 6 }}>
                            {s.fail_count > 0 ? (
                              <span style={{
                                background: '#dc2626', color: '#fff',
                                padding: '2px 8px', borderRadius: 4,
                                fontSize: 10, fontWeight: 700,
                              }}>{s.fail_count}</span>
                            ) : '✓'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            )}
            <div style={{ ...small, marginTop: 8 }}>
              Color tiers · GREEN p95 &lt; 50ms · AMBER 50-200ms · RED &gt; 200ms ·
              §82.7 drift detection threshold
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && alerts && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Tile label="CRITICAL"      value={alerts.summary.critical}      accent="#dc2626" />
            <Tile label="WARNING"       value={alerts.summary.warning}       accent="#d97706" />
            <Tile label="IN COMPLIANCE" value={alerts.summary.in_compliance} accent="#16a34a" />
            <Tile label="NO VALUE"      value={alerts.summary.skipped_no_value}  accent="#94a3b8" />
            <Tile label="NO TARGET"     value={alerts.summary.skipped_no_target} accent="#94a3b8" />
          </div>
          <div style={card}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
              KPI Target-Breach Alerts · T5.10 · sorted by deviation
            </h3>
            {alerts.alerts.length === 0 ? (
              <div style={{ ...small, padding: 12 }}>
                ✓ No KPIs currently breaching their targets.
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: 6 }}>Severity</th>
                    <th style={{ padding: 6 }}>KPI</th>
                    <th style={{ padding: 6 }}>Value</th>
                    <th style={{ padding: 6 }}>Target</th>
                    <th style={{ padding: 6 }}>Deviation</th>
                    <th style={{ padding: 6 }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.alerts.map((a) => (
                    <tr key={a.kpi_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 6 }}>
                        <span style={{
                          background: a.severity === 'critical' ? '#dc2626' : '#d97706',
                          color: '#fff', padding: '2px 8px', borderRadius: 4,
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        }}>
                          {a.severity === 'critical' ? '🔴' : '🟠'} {a.severity}
                        </span>
                      </td>
                      <td style={{ padding: 6 }}>
                        <strong>{a.kpi_name}</strong>
                        <div style={small}><code>{a.kpi_id}</code></div>
                      </td>
                      <td style={{ padding: 6 }}><strong>{a.value}</strong></td>
                      <td style={{ padding: 6 }}>{a.target_op} {a.target}</td>
                      <td style={{ padding: 6, fontWeight: 700,
                                    color: a.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                        {a.deviation_pct}%
                      </td>
                      <td style={{ padding: 6 }}><code>{a.category}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ ...small, marginTop: 8 }}>
              Critical · value ≥50% off target · Warning · &lt; 50% off ·
              Skipped · KPI lacks value or numeric target (§57.7 honest)
            </div>
          </div>
        </div>
      )}

      {tab === 'scorecard' && scorecard && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
            Marketing Command Center Scorecard · weight total {(scorecard.weight_total * 100).toFixed(0)}%
          </h3>
          <div style={small}>{scorecard.note}</div>
          <div style={{ marginTop: 12 }}>
            {scorecard.scorecard.map((s) => (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong>{s.id.replace(/_/g, ' ').toUpperCase()}</strong>
                  <span><strong>{(s.weight * 100).toFixed(0)}%</strong></span>
                </div>
                <div style={{
                  height: 12, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${s.weight * 400}%`,
                    background: '#1e40af',
                  }} />
                </div>
                <div style={{ ...small, marginTop: 2 }}>
                  Categories: {s.categories.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, accent = '#1e40af' }) {
  return (
    <div style={{
      flex: 1, padding: 8, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
    </div>
  );
}
