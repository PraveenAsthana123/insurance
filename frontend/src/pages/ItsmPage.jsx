/**
 * §143 · ITSM-grade page · ServiceNow-style 2-pane layout
 *
 * Left:  AI steps stream + incident playbook checklist
 * Right: 5 stacked dashboards
 *   1. Productivity KPI cards (Hours saved · Dollars saved · Net AI returns · Total AI actions)
 *   2. Specialist performance (CSAT · SLA · AHT · MTTR · FCR)
 *   3. AI Asset Security Score (5-dim radar + 7-day trend)
 *   4. By priority donut + By incident type bar
 *   5. Resolution workflow (5-stage) · L1 multi-agent (3-tier)
 */
import { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

const STAGES = [
  { id: 'analyze',      name: 'Analyze and Validate',  status: 'pending' },
  { id: 'deep_research',name: 'Deep Research',         status: 'pending' },
  { id: 'health_check', name: 'ITOM Health Check',     status: 'pending' },
  { id: 'diagnose_act', name: 'Diagnose and Act',      status: 'pending' },
  { id: 'confirm_close',name: 'Confirm and Close',     status: 'pending' },
];

export default function ItsmPage() {
  const [perf, setPerf] = useState(null);
  const [score, setScore] = useState(null);
  const [security, setSecurity] = useState(null);
  const [playbook, setPlaybook] = useState(null);
  const [orch, setOrch] = useState(null);
  const [agentId, setAgentId] = useState('sys_watchdog_pii');
  const [incidents, setIncidents] = useState(null);
  const [l1Issues, setL1Issues] = useState(null);
  const [autofix, setAutofix] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [planForm, setPlanForm] = useState({ issue_pattern: '', consultant_solution: '' });
  const [planResp, setPlanResp] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/itsm/specialist/performance?lookback_hours=24`).then(r => r.json()).then(setPerf);
    fetch(`${API}/api/v1/itsm/score-card`).then(r => r.json()).then(setScore);
    fetch(`${API}/api/v1/itsm/security-score/${agentId}`).then(r => r.json()).then(setSecurity);
    fetch(`${API}/api/v1/itsm/playbook/templates/prompt_injection`).then(r => r.json()).then(d => setPlaybook(d.template));
    fetch(`${API}/api/v1/itsm/l1-orchestration`).then(r => r.json()).then(setOrch);
    fetch(`${API}/api/v1/itsm/incidents?limit=30`).then(r => r.json()).then(setIncidents);
    fetch(`${API}/api/v1/itsm/finetune-planner/l1-issues?top_n=15`).then(r => r.json()).then(setL1Issues);
    fetch(`${API}/api/v1/itsm/agent-autofix/queue`).then(r => r.json()).then(setAutofix);
  }, [agentId]);

  const submitPlan = async () => {
    const r = await fetch(`${API}/api/v1/itsm/finetune-planner/queue-job`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...planForm, target_agent: 'sys_l1_auto_fixer',
        base_model: 'distilbert-base-uncased', method: 'LoRA',
      }),
    });
    setPlanResp(await r.json());
  };

  const applyPattern = (issue) => {
    setActiveTab('finetune');
    setPlanForm({
      issue_pattern: issue.pattern_excerpt,
      consultant_solution: '',
    });
  };

  return (
    <div className="itsm-page" style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
      {/* LEFT PANE · AI steps stream + playbook checklist */}
      <aside style={{
        width: 420, padding: 20, borderRight: '1px solid #e5e7eb',
        overflowY: 'auto', background: '#fafafa',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Review AI value</h2>
        <div style={{
          background: '#ecfdf5', color: '#065f46',
          borderLeft: '5px solid #10b981', borderRadius: 12, padding: 14,
          fontSize: 13, marginBottom: 18,
        }}>
          {perf
            ? `Your AI portfolio: ${perf.queue.n_handled.toLocaleString()} actions in 24h · ${perf.metrics.csat} CSAT · ${perf.metrics.sla_pct}% SLA · MTTR ${perf.metrics.mttr_min} min.`
            : 'Loading specialist performance…'}
        </div>

        <h3 style={{ fontSize: 14, color: '#64748b', margin: '20px 0 8px' }}>AI steps</h3>
        {playbook ? (
          <div>
            <div style={{
              padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2',
              color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12,
            }}>
              <strong>{playbook.severity}</strong> · {playbook.category}<br />
              Assigned: {playbook.assigned_to}
            </div>
            {playbook.steps.map((s, i) => (
              <div key={s.id} style={{
                padding: 10, borderLeft: '3px solid #10b981',
                background: '#fff', marginBottom: 6, fontSize: 13,
              }}>
                <div style={{ fontWeight: 600 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {s.name}
                </div>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, color: '#64748b', fontSize: 12 }}>
                  {s.sub_steps.map((ss, j) => <li key={j}>{ss}</li>)}
                </ul>
              </div>
            ))}
          </div>
        ) : <div style={{ color: '#9ca3af' }}>Loading playbook…</div>}

        <h3 style={{ fontSize: 14, color: '#64748b', margin: '24px 0 8px' }}>
          Resolution Workflow
        </h3>
        {STAGES.map((s, i) => (
          <div key={s.id} style={{
            padding: '8px 12px', borderLeft: `3px solid ${i < 2 ? '#10b981' : '#d1d5db'}`,
            background: '#fff', marginBottom: 6, fontSize: 13,
          }}>
            <span style={{ color: i < 2 ? '#10b981' : '#9ca3af', marginRight: 8 }}>
              {i < 2 ? '✓' : '○'}
            </span>
            {s.name}
          </div>
        ))}
      </aside>

      {/* RIGHT PANE · stacked dashboards */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f3f4f6' }}>
        {/* Top tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          {['overview', 'incidents', 'p1war', 'l2rca', 'l3problem', 'agents', 'finetune', 'autofix', 'orchestration'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '8px 16px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              borderBottom: activeTab === t ? '3px solid #4f46e5' : '3px solid transparent',
              color: activeTab === t ? '#1f2937' : '#6b7280',
            }}>
              {t === 'overview' && 'Overview'}
              {t === 'incidents' && `All Incidents (${incidents?.n_items ?? '…'})`}
              {t === 'p1war' && 'P1 War-Room'}
              {t === 'l2rca' && 'L2 RCA'}
              {t === 'l3problem' && 'L3 Problem Ticket'}
              {t === 'agents' && 'Agent Showcase'}
              {t === 'finetune' && 'L1 Fine-Tune Planner'}
              {t === 'autofix' && `Agent Auto-Fix (${autofix?.n_items ?? '…'})`}
              {t === 'orchestration' && 'Orchestration'}
            </button>
          ))}
        </div>

        {/* ────── TAB: INCIDENTS LIST ────── */}
        {activeTab === 'incidents' && (
          <Section title={`All Incidents · ${incidents?.n_items ?? 0} items · 3 sources`}>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#64748b' }}>
              {incidents?.sources && (
                <span>Sources: {Object.entries(incidents.sources).map(([k, v]) => `${k}(${v})`).join(' · ')}</span>
              )}
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Source</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Severity</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Summary</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents?.items?.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8, color: '#6366f1' }}>{it.source.replace(/_/g, ' ')}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 10 }}>{String(it.incident_id).substring(0, 10)}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 10,
                        background: it.severity?.startsWith('P0') || it.severity?.startsWith('P1') ? '#fef2f2' : '#fef3c7',
                        color: it.severity?.startsWith('P0') || it.severity?.startsWith('P1') ? '#b91c1c' : '#92400e',
                      }}>{it.severity}</span>
                    </td>
                    <td style={{ padding: 8 }}>{it.status}</td>
                    <td style={{ padding: 8, color: '#374151', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.summary?.substring(0, 80) || '(no summary)'}
                    </td>
                    <td style={{ padding: 8, color: '#9ca3af', fontSize: 11 }}>
                      {it.created_at?.substring(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ────── TAB: L1 FINE-TUNE PLANNER ────── */}
        {activeTab === 'finetune' && (
          <>
            <Section title="L1 Fine-Tune Planner · How it works"
                      right={<span style={{ fontSize: 11, color: '#6b7280' }}>§141 LoRA + §143 incident-driven</span>}>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong>Goal:</strong> Take the most-frequent L1 failure patterns from agent_invocation,
                pair each with a consultant-supplied solution (or KB article), and queue a LoRA fine-tune
                on <code>distilbert-base-uncased</code> so an auto-fix agent learns to resolve the pattern.
              </div>
              <ol style={{ fontSize: 12, color: '#4b5563', marginTop: 12, paddingLeft: 20 }}>
                <li>System pulls top-N frequent patterns where failure count ≥ 2 (table below)</li>
                <li>Consultant fills in the proven solution per pattern</li>
                <li>Queue button writes §38.3 audit row + dataset entry</li>
                <li>scripts/finetune/lora_demo.py picks up queued pairs and trains LoRA adapter</li>
                <li>Adapter saved to /mnt/deepa/models/finetuned/&lt;job_id&gt;/</li>
                <li>Auto-fix agent (sys_l1_auto_fixer) is reloaded with the new adapter</li>
              </ol>
            </Section>

            <Section title={`Top-${l1Issues?.n_issues ?? 0} Frequent L1 Patterns · candidates for fine-tune`}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Agent</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Pattern excerpt</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Freq</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Fail</th>
                    <th style={{ padding: 8, textAlign: 'center' }}>Fix difficulty</th>
                    <th style={{ padding: 8, textAlign: 'center' }}>Candidate</th>
                    <th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {l1Issues?.issues?.map((issue, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 8, color: '#6366f1', fontSize: 11 }}>{issue.agent_id}</td>
                      <td style={{ padding: 8, color: '#374151', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {issue.pattern_excerpt || '(empty)'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{issue.frequency}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: issue.failure_count > 0 ? '#b91c1c' : '#9ca3af' }}>
                        {issue.failure_count}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 10,
                          background: issue.fix_difficulty === 'easy' ? '#d1fae5'
                                    : issue.fix_difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                          color: issue.fix_difficulty === 'easy' ? '#065f46'
                              : issue.fix_difficulty === 'medium' ? '#92400e' : '#991b1b',
                        }}>
                          {issue.fix_difficulty}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {issue.candidate_for_finetune ? '✓' : '○'}
                      </td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => applyPattern(issue)} style={{
                          padding: '4px 10px', border: '1px solid #4f46e5', background: 'none',
                          color: '#4f46e5', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                        }}>Plan fix</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Queue a new fine-tune job">
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Issue pattern (from agent_invocation)</label>
                  <textarea value={planForm.issue_pattern}
                    onChange={e => setPlanForm({ ...planForm, issue_pattern: e.target.value })}
                    style={{ width: '100%', minHeight: 50, padding: 8, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }}
                    placeholder="e.g., User reports they forgot their login credentials..." />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Consultant solution (or paste from KB)</label>
                  <textarea value={planForm.consultant_solution}
                    onChange={e => setPlanForm({ ...planForm, consultant_solution: e.target.value })}
                    style={{ width: '100%', minHeight: 80, padding: 8, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }}
                    placeholder="e.g., 1. Verify identity 2. Check account lock 3. Cleared lockout / initiated reset 4. Enforced password policy 5. Synced across systems 6. Triggered MFA revalidation 7. Notified user + logged for audit" />
                </div>
                <button onClick={submitPlan}
                  disabled={!planForm.issue_pattern || !planForm.consultant_solution}
                  style={{
                    padding: '10px 16px', background: '#4f46e5', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', opacity: !planForm.issue_pattern || !planForm.consultant_solution ? 0.4 : 1,
                  }}>
                  Queue LoRA fine-tune job
                </button>
                {planResp && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 6, padding: 10, fontSize: 12 }}>
                    ✓ Queued job <strong>{planResp.job_id}</strong> · save_path: {planResp.save_path}<br />
                    <span style={{ color: '#6b7280' }}>{planResp.next_step}</span>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ────── TAB: AGENT AUTO-FIX ────── */}
        {activeTab === 'autofix' && (
          <Section title={`Agent Auto-Fix queue · ${autofix?.n_items ?? 0} items`}>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
              These agents have open failures in the last 24h. Auto-fix routes them
              via Odysseus §139 (95.86% acc) to the right fixer agent. Confidence
              &lt; 0.6 → HITL queue per §103.5.
            </div>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Agent</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Open</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Last attempt</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {autofix?.items?.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8, color: '#6366f1' }}>{it.agent_id}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{it.open_count}</td>
                    <td style={{ padding: 8, color: '#9ca3af' }}>{it.last_attempt?.substring(0, 19)}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 10,
                        background: it.auto_fix_status === 'active' ? '#d1fae5' : '#fef3c7',
                        color: it.auto_fix_status === 'active' ? '#065f46' : '#92400e',
                      }}>{it.auto_fix_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ────── TAB: ORCHESTRATION ────── */}
        {activeTab === 'orchestration' && (
          <Section title="L1 Multi-Agent Orchestration · NVIDIA reference">
            {orch?.tiers?.map((t, i) => (
              <div key={i} style={{
                padding: 12, marginBottom: 8, background: '#fff', borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t.tier}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(t.agents || t.components || []).map((a, j) => (
                    <span key={j} style={{
                      padding: '3px 8px', background: '#eef2ff', color: '#4338ca',
                      borderRadius: 12, fontSize: 11,
                    }}>{a}</span>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <h4 style={{ fontSize: 12, margin: '0 0 6px' }}>Our equivalent mapping:</h4>
              <ul style={{ fontSize: 11, margin: 0, color: '#4b5563' }}>
                {orch?.our_equivalent && Object.entries(orch.our_equivalent).map(([k, v]) => (
                  <li key={k}><strong>{k}</strong>: {v}</li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {/* ────── TAB: OVERVIEW (original content) ────── */}
        {activeTab === 'overview' && (<>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Hours saved (proxy)" value="3.6M hrs"
                    sub="+10% year to date" color="#10b981" />
          <KpiCard label="Dollars saved (proxy)" value="$250M"
                    sub="of $280M target · +10% vs prior" color="#10b981" />
          <KpiCard label="Net AI returns (proxy)" value="$103M"
                    sub="70% ROI" color="#0ea5e9" />
          <KpiCard label="Total AI actions (real)"
                    value={perf?.queue?.n_handled?.toLocaleString() ?? '—'}
                    sub="from agent_invocation · 24h" color="#6366f1" />
        </div>

        {/* Specialist Performance */}
        <Section title="AI Specialist Performance · live" right={score?.band}>
          {perf && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <Stat label="CSAT"     value={perf.metrics.csat} />
              <Stat label="SLA %"    value={`${perf.metrics.sla_pct}%`} />
              <Stat label="AHT min"  value={perf.metrics.aht_min} />
              <Stat label="MTTR min" value={perf.metrics.mttr_min} />
              <Stat label="FCR %"    value={`${perf.metrics.fcr_pct}%`} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, margin: '0 0 8px', color: '#64748b' }}>By status</h4>
              <div style={{ background: '#fff', borderRadius: 8, padding: 12 }}>
                {perf?.by_priority?.map((p, i) => (
                  <Bar key={i} label={p.status} count={p.count} max={perf?.by_priority?.[0]?.count || 1} color="#8b5cf6" />
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, margin: '0 0 8px', color: '#64748b' }}>By incident type</h4>
              <div style={{ background: '#fff', borderRadius: 8, padding: 12 }}>
                {perf?.by_incident_type?.map((p, i) => (
                  <Bar key={i} label={p.type} count={p.count} max={perf?.by_incident_type?.[0]?.count || 1} color="#f59e0b" />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* AI Asset Security Score · radar simulated as bars */}
        <Section
          title={`AI Asset Security Score · ${agentId}`}
          right={security
            ? <span style={{
                fontSize: 28, fontWeight: 800,
                color: security.ai_asset_security_score >= 60 ? '#10b981' : '#ef4444',
              }}>
                {security.ai_asset_security_score}%
                <span style={{ fontSize: 11, marginLeft: 6 }}>
                  {security.trend_arrow === 'up' ? '↑' : security.trend_arrow === 'down' ? '↓' : '→'}
                </span>
              </span>
            : '…'}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <input type="text" value={agentId} onChange={e => setAgentId(e.target.value)}
                    placeholder="agent_id"
                    style={{ padding: 6, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>
          {security && (
            <div style={{ marginTop: 12 }}>
              {Object.entries(security.dimensions).map(([k, v]) => (
                <Bar key={k} label={k} count={v.score} max={100}
                      color={v.score >= 80 ? '#10b981' : v.score >= 60 ? '#f59e0b' : '#ef4444'} />
              ))}
            </div>
          )}
        </Section>

        {/* L1 Multi-Agent Orchestration */}
        <Section title="L1 Multi-Agent Orchestration · NVIDIA ref">
          {orch?.tiers?.map((t, i) => (
            <div key={i} style={{
              padding: 12, marginBottom: 8, background: '#fff', borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t.tier}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(t.agents || t.components || []).map((a, j) => (
                  <span key={j} style={{
                    padding: '3px 8px', background: '#eef2ff', color: '#4338ca',
                    borderRadius: 12, fontSize: 11,
                  }}>{a}</span>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* Score card */}
        <Section title="§143 Score Card · §122 brutal">
          {score && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>
                {score.score} · {score.band}
              </div>
              <div style={{ marginTop: 12 }}>
                {Object.entries(score.dims).map(([k, v]) => (
                  <Bar key={k} label={k} count={v * 100} max={100}
                        color={v >= 0.9 ? '#10b981' : v >= 0.7 ? '#f59e0b' : '#ef4444'} />
                ))}
              </div>
            </div>
          )}
        </Section>
        </>)}

        {/* ────── TAB: L2 RCA ────── */}
        {activeTab === 'l2rca' && <L2RcaTab />}

        {/* ────── TAB: L3 PROBLEM TICKET ────── */}
        {activeTab === 'l3problem' && <L3ProblemTab />}

        {/* ────── TAB: P1 WAR-ROOM ────── */}
        {activeTab === 'p1war' && <P1WarRoomTab />}

        {/* ────── TAB: AGENT SHOWCASE ────── */}
        {activeTab === 'agents' && <AgentShowcaseTab />}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Agent Showcase Tab · 12 agents · dev/qa/prod environments
   Operator: "all should be done by Agent .. planner, troubleshoot,
   query agent, rca agent, solution agent, fixing issue, moving to
   other system, ci/cd, testing agent · in dev/qa/prod"
*/
function AgentShowcaseTab() {
  const [env, setEnv] = useState('all');
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/itsm/agents/showcase?env=${env}`).then(r => r.json()).then(setData);
  }, [env]);
  return (
    <>
      <Section title="Agent Showcase · all incident handling agents"
                right={
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['all', 'dev', 'qa', 'prod'].map(e => (
                      <button key={e} onClick={() => setEnv(e)} style={{
                        padding: '4px 12px', fontSize: 11, cursor: 'pointer',
                        border: '1px solid #d1d5db', borderRadius: 4,
                        background: env === e ? '#4f46e5' : '#fff',
                        color: env === e ? '#fff' : '#374151',
                      }}>{e}</button>
                    ))}
                  </div>
                }>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 14 }}>
          {data?.n_agents ?? '...'} agents in <strong>{env}</strong> environment ·
          per operator brief: "all should be done by Agent"
        </div>

        {/* Flow sequence */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12,
                       fontSize: 12, color: '#4b5563', marginBottom: 14 }}>
          <strong style={{ fontSize: 13, color: '#1f2937' }}>End-to-end incident resolution flow:</strong>
          <ol style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.5 }}>
            {data?.flow?.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      </Section>

      {/* One row per agent · vertical layout per operator brief */}
      {data?.agents?.map((a, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: '#eef2ff', color: '#4338ca',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{a.id}</div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>{a.role}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                <em>{a.based_on}</em>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {a.envs.map(e => (
                <span key={e} style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: e === 'dev' ? '#dbeafe' : e === 'qa' ? '#fef3c7' : '#d1fae5',
                  color:     e === 'dev' ? '#1e40af' : e === 'qa' ? '#92400e' : '#065f46',
                }}>{e.toUpperCase()}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   P1 War-Room Tab · per operator brief
   P1 = high business impact → all teams initially engage → agent
   identifies which team should OWN it based on symptom keywords.
*/
function P1WarRoomTab() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/itsm/p1-war-room/active`).then(r => r.json()).then(setActive);
  }, []);

  const assign = async (incidentId, team) => {
    await fetch(`${API}/api/v1/itsm/p1-war-room/assign/${incidentId}?team=${team}`, { method: 'POST' });
    fetch(`${API}/api/v1/itsm/p1-war-room/active`).then(r => r.json()).then(setActive);
  };

  return (
    <>
      <Section title="P1 War-Room · how it works"
                right={<span style={{ fontSize: 11, color: '#6b7280' }}>§143 P1 mgmt</span>}>
        <ol style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, paddingLeft: 20 }}>
          <li><strong>P1 detected</strong>: incident with high business impact (revenue/safety/compliance) — auto-flagged by retry_count {'>'} 1 OR severity tag</li>
          <li><strong>All teams join</strong>: Identity · Network · Application · Database · Infrastructure · Security all watch the war-room</li>
          <li><strong>Agent triages</strong>: Odysseus + keyword routing → suggests which TEAM owns the issue based on symptom text</li>
          <li><strong>Team assignment</strong>: chosen team owns the resolution · other teams stand down</li>
          <li><strong>Resolution</strong>: owning team runs §143 Resolution Workflow (Analyze → Deep Research → Health Check → Diagnose → Confirm)</li>
          <li><strong>Post-incident</strong>: routes to L2 RCA workflow → L3 problem if recurring</li>
        </ol>
      </Section>

      <Section title={`Active P1 incidents · ${active?.n_p1 ?? 0} items`}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          Teams evaluated: {active?.teams?.join(' · ')}
        </div>
        {active?.items?.map((it, i) => (
          <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca',
                                  borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <span style={{
                  padding: '2px 8px', background: '#b91c1c', color: '#fff',
                  borderRadius: 12, fontSize: 11, fontWeight: 600,
                }}>P1 · CRITICAL</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>
                  retry: {it.retry_count} · {it.created_at?.substring(0, 16)}
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{it.current_agent}</span>
            </div>
            <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 10 }}>
              {it.text_excerpt}
            </div>
            <div style={{ background: '#fff', borderRadius: 6, padding: 10, fontSize: 12 }}>
              <strong style={{ color: '#4338ca' }}>Agent suggests:</strong>{' '}
              team <strong>{it.suggested_team}</strong> ·{' '}
              owner <code>{it.suggested_owner}</code> ·{' '}
              confidence {(it.ownership_confidence * 100).toFixed(0)}% ·{' '}
              <em>{it.via}</em>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {['Identity-Access', 'Network', 'Application', 'Database', 'Infrastructure', 'Security'].map(team => (
                <button key={team} onClick={() => assign(it.incident_id, team)} style={{
                  padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                  background: team === it.suggested_team ? '#4f46e5' : 'none',
                  color: team === it.suggested_team ? '#fff' : '#4f46e5',
                  border: '1px solid #4f46e5', borderRadius: 4,
                }}>
                  Assign → {team}
                </button>
              ))}
            </div>
          </div>
        ))}
        {(active?.items?.length ?? 0) === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No active P1 incidents. ✓
          </div>
        )}
      </Section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   L3 Problem Ticket Tab · ITIL pattern
   Multiple incidents with same symptom → CONSOLIDATE into ONE problem ticket
   → Problem owner does deep RCA → publishes Known Error → linked incidents close
*/
function L3ProblemTab() {
  const [clusters, setClusters] = useState(null);
  const [problems, setProblems] = useState(null);
  const [createForm, setCreateForm] = useState({
    cluster_signature: '',
    problem_summary: '',
    known_error: '',
    workaround: '',
    permanent_fix: '',
  });
  const [createResp, setCreateResp] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/itsm/l3-problem/clusters?min_users=2`).then(r => r.json()).then(setClusters);
    fetch(`${API}/api/v1/itsm/l3-problem/list?limit=20`).then(r => r.json()).then(setProblems);
  }, [createResp]);

  const consolidate = (cluster) => {
    setCreateForm({
      cluster_signature: cluster.signature,
      problem_summary: `Multiple users affected by: ${cluster.signature.substring(0, 80)}`,
      known_error: '', workaround: '', permanent_fix: '',
    });
  };

  const submit = async () => {
    const r = await fetch(`${API}/api/v1/itsm/l3-problem/consolidate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    setCreateResp(await r.json());
  };

  return (
    <>
      <Section title="L3 Problem Ticket Workflow · ITIL pattern"
                right={<span style={{ fontSize: 11, color: '#6b7280' }}>§143 problem mgmt</span>}>
        <ol style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, paddingLeft: 20 }}>
          <li><strong>Detect cluster</strong>: ≥N users hit the same symptom → system auto-clusters by signature</li>
          <li><strong>Create problem ticket</strong>: one row in problem_record → links to all member incidents</li>
          <li><strong>Problem owner</strong>: senior engineer assigned → does deep RCA across all incidents</li>
          <li><strong>Known Error record</strong>: published to knowledge_base + vector DB</li>
          <li><strong>Workaround</strong>: documented and applied to ALL linked incidents</li>
          <li><strong>Permanent fix</strong>: change request raised · once shipped, problem closes + all linked incidents close</li>
          <li><strong>Train</strong>: known error + fix → LoRA fine-tune so future incidents match faster</li>
        </ol>
      </Section>

      <Section title={`Incident clusters · ${clusters?.n_clusters ?? 0} candidate problems`}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          Patterns where ≥2 users hit similar symptoms in last 7 days · candidates to consolidate
        </div>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>Signature</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Distinct users</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Total incidents</th>
              <th style={{ padding: 6, textAlign: 'left' }}>First seen</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Last seen</th>
              <th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {clusters?.clusters?.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 6, color: '#374151', maxWidth: 320,
                              overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.signature}</td>
                <td style={{ padding: 6, textAlign: 'right', fontWeight: 600,
                              color: c.distinct_users >= 5 ? '#b91c1c' : c.distinct_users >= 3 ? '#92400e' : '#374151' }}>
                  {c.distinct_users}
                </td>
                <td style={{ padding: 6, textAlign: 'right' }}>{c.total_incidents}</td>
                <td style={{ padding: 6, color: '#9ca3af', fontSize: 11 }}>{c.first_seen?.substring(0, 16)}</td>
                <td style={{ padding: 6, color: '#9ca3af', fontSize: 11 }}>{c.last_seen?.substring(0, 16)}</td>
                <td style={{ padding: 6 }}>
                  <button onClick={() => consolidate(c)} style={{
                    padding: '4px 10px', border: '1px solid #4f46e5', background: 'none',
                    color: '#4f46e5', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                  }}>Consolidate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Create / refine problem ticket">
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Cluster signature (auto-filled)" value={createForm.cluster_signature}
                  onChange={v => setCreateForm({ ...createForm, cluster_signature: v })} />
          <Field label="Problem summary" value={createForm.problem_summary}
                  onChange={v => setCreateForm({ ...createForm, problem_summary: v })} />
          <Field label="Known error (what's broken)" value={createForm.known_error}
                  onChange={v => setCreateForm({ ...createForm, known_error: v })} multi />
          <Field label="Workaround (immediate)" value={createForm.workaround}
                  onChange={v => setCreateForm({ ...createForm, workaround: v })} multi />
          <Field label="Permanent fix (CR to ship)" value={createForm.permanent_fix}
                  onChange={v => setCreateForm({ ...createForm, permanent_fix: v })} multi />
          <button onClick={submit}
            disabled={!createForm.problem_summary || !createForm.known_error}
            style={{ padding: '10px 16px', background: '#4f46e5', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', opacity: !createForm.problem_summary ? 0.4 : 1 }}>
            Create problem ticket · link incidents · publish Known Error
          </button>
          {createResp && (
            <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5',
                          borderRadius: 6, padding: 12, fontSize: 12 }}>
              ✓ Problem <strong>{createResp.problem_id}</strong> created<br />
              · Linked incidents: <strong>{createResp.n_linked}</strong><br />
              · Known Error published: <strong>{createResp.known_error_persisted ? 'YES' : 'NO'}</strong><br />
              · Workaround applied to linked incidents: <strong>{createResp.workaround_applied}</strong><br />
              · Vector ingest queued: <strong>{createResp.vector_ingest_queued ? 'YES' : 'NO'}</strong>
            </div>
          )}
        </div>
      </Section>

      <Section title={`Open Problems · ${problems?.n_items ?? 0} items`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>PRB-ID</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Summary</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Linked incidents</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {problems?.items?.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 10 }}>{p.problem_id}</td>
                <td style={{ padding: 6, color: '#374151', maxWidth: 400,
                              overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.summary}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{p.n_linked || '—'}</td>
                <td style={{ padding: 6 }}>{p.status || 'open'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   L2 RCA Tab · per operator brief
   Consultant resolves L2 → uploads RCA + troubleshoot + repro + repeat +
   impact + priority + severity + n_users + occurrence → stored in BOTH
   knowledge DB and incident DB → vector DB ingest + LoRA fine-tune
   ──── Next time same issue: agent collects inputs from user → RAG lookup
   → drafts RCA from learned patterns
*/
function L2RcaTab() {
  const [rcaForm, setRcaForm] = useState({
    incident_id: '',
    rca_summary: '',
    root_cause: '',
    troubleshoot_steps: '',
    reproduce_steps: '',
    repeatability: 'always',
    impact: 'high',
    priority: 'P1',
    severity: 'critical',
    n_users_affected: 1,
    occurrence_count: 1,
    consultant_name: '',
    solution: '',
    simulation_link: '',
  });
  const [rcaResp, setRcaResp] = useState(null);
  const [rcaList, setRcaList] = useState(null);
  const [agentInputResp, setAgentInputResp] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/itsm/l2-rca/list?limit=20`).then(r => r.json()).then(setRcaList);
  }, [rcaResp]);

  const submitRca = async () => {
    const r = await fetch(`${API}/api/v1/itsm/l2-rca/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rcaForm),
    });
    setRcaResp(await r.json());
  };

  const triggerAgentInput = async () => {
    const r = await fetch(`${API}/api/v1/itsm/l2-rca/agent-collect-inputs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_symptom: rcaForm.rca_summary || 'I can\'t log in' }),
    });
    setAgentInputResp(await r.json());
  };

  return (
    <>
      <Section title="L2 RCA Workflow · how it composes"
                right={<span style={{ fontSize: 11, color: '#6b7280' }}>§143 + §141 + §76</span>}>
        <ol style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Consultant resolves L2 issue → fills RCA form below (all required fields)</li>
          <li>System stores DUAL: incident_management table (audit) + knowledge_base table (training data)</li>
          <li>Cron <code>VECTOR-INGEST</code> picks up new KB rows → embeds via bge-m3 → indexes in Qdrant</li>
          <li>Fine-tune queue picks up (symptom → solution) pair → LoRA on distilbert (§141)</li>
          <li>Next time same/similar issue arrives → Odysseus routes → RAG retrieves prior RCA →
              auto-fix agent (or assists L1 consultant) with the full context</li>
          <li>Agent self-queries user for missing inputs (impact · n_users · occurrence) before drafting RCA</li>
        </ol>
      </Section>

      <Section title="Submit RCA · all fields required per operator brief">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Incident ID (or leave blank for new)"
                  value={rcaForm.incident_id}
                  onChange={v => setRcaForm({ ...rcaForm, incident_id: v })} />
          <Field label="Consultant name" value={rcaForm.consultant_name}
                  onChange={v => setRcaForm({ ...rcaForm, consultant_name: v })} />
          <Field label="RCA summary (1 line)" value={rcaForm.rca_summary}
                  onChange={v => setRcaForm({ ...rcaForm, rca_summary: v })} colspan={2} />
          <Field label="Root cause (technical)" value={rcaForm.root_cause}
                  onChange={v => setRcaForm({ ...rcaForm, root_cause: v })} colspan={2} multi />
          <Field label="Troubleshooting steps (numbered)" value={rcaForm.troubleshoot_steps}
                  onChange={v => setRcaForm({ ...rcaForm, troubleshoot_steps: v })} colspan={2} multi />
          <Field label="Reproducibility steps" value={rcaForm.reproduce_steps}
                  onChange={v => setRcaForm({ ...rcaForm, reproduce_steps: v })} colspan={2} multi />
          <Field label="Final solution / fix" value={rcaForm.solution}
                  onChange={v => setRcaForm({ ...rcaForm, solution: v })} colspan={2} multi />
          <Field label="Simulation / repro env link" value={rcaForm.simulation_link}
                  onChange={v => setRcaForm({ ...rcaForm, simulation_link: v })} colspan={2} />
          <Selector label="Repeatability" value={rcaForm.repeatability}
                    options={['always', 'often', 'sometimes', 'rarely']}
                    onChange={v => setRcaForm({ ...rcaForm, repeatability: v })} />
          <Selector label="Impact" value={rcaForm.impact}
                    options={['critical', 'high', 'medium', 'low']}
                    onChange={v => setRcaForm({ ...rcaForm, impact: v })} />
          <Selector label="Priority" value={rcaForm.priority}
                    options={['P0', 'P1', 'P2', 'P3']}
                    onChange={v => setRcaForm({ ...rcaForm, priority: v })} />
          <Selector label="Severity" value={rcaForm.severity}
                    options={['critical', 'major', 'minor', 'cosmetic']}
                    onChange={v => setRcaForm({ ...rcaForm, severity: v })} />
          <Field label="Number of users affected" value={rcaForm.n_users_affected}
                  onChange={v => setRcaForm({ ...rcaForm, n_users_affected: parseInt(v) || 0 })} type="number" />
          <Field label="Occurrence count (so far)" value={rcaForm.occurrence_count}
                  onChange={v => setRcaForm({ ...rcaForm, occurrence_count: parseInt(v) || 0 })} type="number" />
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <button onClick={submitRca}
            disabled={!rcaForm.rca_summary || !rcaForm.root_cause}
            style={{ padding: '10px 16px', background: '#4f46e5', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', opacity: !rcaForm.rca_summary ? 0.4 : 1 }}>
            Submit RCA · store DUAL + vector ingest + queue LoRA
          </button>
          <button onClick={triggerAgentInput} style={{
            padding: '10px 16px', background: 'none', color: '#4f46e5',
            border: '1px solid #4f46e5', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Simulate agent input-collection</button>
        </div>
        {rcaResp && (
          <div style={{ marginTop: 12, background: '#ecfdf5', border: '1px solid #d1fae5',
                        borderRadius: 6, padding: 12, fontSize: 12 }}>
            ✓ RCA <strong>{rcaResp.rca_id}</strong> stored<br />
            · incident_management: <strong>{rcaResp.incident_persisted ? 'YES' : 'NO'}</strong><br />
            · knowledge_base: <strong>{rcaResp.kb_persisted ? 'YES' : 'NO'}</strong><br />
            · vector DB ingest queued: <strong>{rcaResp.vector_ingest_queued ? 'YES' : 'NO'}</strong><br />
            · LoRA fine-tune queued: <strong>{rcaResp.finetune_queued ? 'YES (' + rcaResp.finetune_job_id + ')' : 'NO'}</strong>
          </div>
        )}
        {agentInputResp && (
          <div style={{ marginTop: 12, background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: 6, padding: 12, fontSize: 12 }}>
            <strong>Agent input-collection plan</strong><br />
            For symptom: <em>"{agentInputResp.user_symptom}"</em><br />
            Questions to ask user:
            <ul>
              {agentInputResp.questions?.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
            RAG context found: <strong>{agentInputResp.rag_hits} similar prior RCAs</strong>
          </div>
        )}
      </Section>

      <Section title={`Recent L2 RCAs · ${rcaList?.n_items ?? 0} items`}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>RCA ID</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Summary</th>
              <th style={{ padding: 6, textAlign: 'center' }}>Impact</th>
              <th style={{ padding: 6, textAlign: 'center' }}>Severity</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Users</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Occur</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rcaList?.items?.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 10 }}>{it.rca_id}</td>
                <td style={{ padding: 6, color: '#374151', maxWidth: 320,
                              overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.summary}
                </td>
                <td style={{ padding: 6, textAlign: 'center' }}>{it.impact}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{it.severity}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{it.n_users_affected}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{it.occurrence_count}</td>
                <td style={{ padding: 6, color: '#9ca3af', fontSize: 11 }}>
                  {it.created_at?.substring(0, 16)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function Field({ label, value, onChange, type = 'text', colspan = 1, multi = false }) {
  return (
    <div style={{ gridColumn: `span ${colspan}` }}>
      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>{label}</label>
      {multi ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', minHeight: 60, padding: 6, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }} />
      )}
    </div>
  );
}

function Selector({ label, value, options, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
              style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#10b981', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{title}</h3>
        {right && <div style={{ fontSize: 12, color: '#64748b' }}>{right}</div>}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Bar({ label, count, max, color }) {
  const pct = Math.min(100, Math.round((count / max) * 100));
  return (
    <div style={{ marginBottom: 6, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ color: '#374151' }}>{label}</span>
        <span style={{ color: '#9ca3af' }}>{typeof count === 'number' ? count.toLocaleString() : count}</span>
      </div>
      <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
      </div>
    </div>
  );
}
