// AgenticAdminPanel.jsx · Iter 37 · comprehensive agentic admin UI.
//
// Operator brief: "each agent must have UI for operation, integration, tracking,
// supervising, delegating, list of operations present on UI".
//
// Layout:
//   ┌─────────┬───────────────────────────────────────────────────────────┐
//   │ Catalog │  When an agent is selected:                                │
//   │  list   │  Tabs: Profile · Operations · Skills · Tools · Tracking · │
//   │         │        Supervisor · Delegation · Scorecard · Approvals    │
//   └─────────┴───────────────────────────────────────────────────────────┘

import { useState, useEffect, useCallback } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

// Tabs grouped into categories for the 2-row nav
const TAB_GROUPS = [
  {
    label: 'Define',
    tabs: [
      { key: 'profile', label: 'Profile' },
      { key: 'ipo', label: 'IPO' },
      { key: 'flowchart', label: 'Flowchart' },        // NEW
      { key: 'skills', label: 'Skills' },
      { key: 'tools', label: 'Tools' },
      { key: 'integration', label: 'Integration' },    // NEW
      { key: 'mcp_rag', label: 'MCP + RAG' },
    ],
  },
  {
    label: 'Run',
    tabs: [
      { key: 'operations', label: 'Operations' },
      { key: 'planner', label: 'Planner' },            // NEW
      { key: 'research', label: 'Research' },          // NEW
      { key: 'review', label: 'Review' },              // NEW
      { key: 'verification', label: 'Verification' },  // NEW
      { key: 'tracking', label: 'Tracking' },
      { key: 'queue', label: 'Queue' },
    ],
  },
  {
    label: 'Operate',
    tabs: [
      { key: 'failures', label: 'Failures' },
      { key: 'feedback', label: 'Feedback' },
      { key: 'incidents', label: 'Incidents' },
      { key: 'sla', label: 'SLA' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'scorecard', label: 'Scorecard' },
    ],
  },
  {
    label: 'Govern',
    tabs: [
      { key: 'dependencies', label: 'Deps' },
      { key: 'team', label: 'Team' },
      { key: 'supervisor', label: 'Supervisor' },
      { key: 'delegation', label: 'Delegation' },
      { key: 'challenges', label: 'Challenges' },
      { key: 'approvals', label: 'Approvals' },
    ],
  },
];

// Flat list for backward compatibility + key lookup
const TABS = TAB_GROUPS.flatMap(g => g.tabs);

const DEPARTMENTS = [
  'all', 'IT Operations', 'Claims', 'Underwriting', 'Billing', 'Customer',
  'Fraud', 'Compliance', 'HR', 'Finance', 'Sales', 'Marketing',
];

const STATUS_COLOR = {
  Active: '#10b981',
  Draft: '#94a3b8',
  Disabled: '#ef4444',
  Retired: '#64748b',
  Success: '#10b981',
  Failed: '#ef4444',
  Running: '#3b82f6',
};

function Pill({ children, color = '#94a3b8' }) {
  return (
    <span style={{
      padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 3,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      display: 'inline-block',
    }}>{children}</span>
  );
}

function Section({ title, children, accent = '#3b82f6' }) {
  return (
    <div style={{
      marginTop: 12, padding: 12, background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 6,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: accent, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{title}</div>
      {children}
    </div>
  );
}

function AgenticAdminPanel() {
  const [agents, setAgents] = useState([]);
  const [dept, setDept] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [skillsRegistry, setSkillsRegistry] = useState([]);
  const [toolsRegistry, setToolsRegistry] = useState([]);
  const [invocations, setInvocations] = useState([]);
  const [stats, setStats] = useState(null);
  const [opsRollup, setOpsRollup] = useState(null);
  const [blueprint, setBlueprint] = useState(null);  // Iter 41 per-agent blueprint
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const refreshCatalog = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`${API}/api/v1/agentic/agents`);
      const d = await r.json();
      setAgents(d.agents || []);
    } catch (e) { setError(`Catalog: ${e.message}`); }
    finally { setBusy(false); }
  }, []);

  const refreshRegistries = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        fetch(`${API}/api/v1/agentic/skills`).then(r => r.json()),
        fetch(`${API}/api/v1/agentic/tools`).then(r => r.json()),
      ]);
      setSkillsRegistry(s.skills || []);
      setToolsRegistry(t.tools || []);
    } catch (e) { /* honest empty */ }
  }, []);

  const loadAgent = useCallback(async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`${API}/api/v1/agentic/agents/${id}`);
      const d = await r.json();
      setSelectedAgent(d.agent || null);
      setSelectedSkills(d.skills || []);
      const inv = await fetch(`${API}/api/v1/agentic/invocations?agent_id=${id}&limit=20`).then(x => x.json());
      setInvocations(inv.invocations || []);
      // Iter 38 ops rollup · 7 surfaces in one fetch
      const ops = await fetch(`${API}/api/v1/agentic-ops/agent/${id}/rollup`).then(x => x.json());
      setOpsRollup(ops || null);
      // Iter 41 per-agent blueprint
      const bp = await fetch(`${API}/api/v1/agentic/agents/${id}/blueprint`).then(x => x.json());
      setBlueprint(bp || null);
    } catch (e) { setError(`Load: ${e.message}`); }
  }, []);

  useEffect(() => { refreshCatalog(); refreshRegistries(); }, [refreshCatalog, refreshRegistries]);
  useEffect(() => { if (selectedId) loadAgent(selectedId); }, [selectedId, loadAgent]);

  async function invokeAgent() {
    if (!selectedId) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`${API}/api/v1/agentic/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedId,
          input_text: 'Operator-triggered run from AgenticAdminPanel',
          trigger_kind: 'ui',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail?.detail || 'invoke failed');
      setToast(`✓ invoked · ${d.invocation_id} (${d.scaffold ? 'SCAFFOLD' : 'live'})`);
      loadAgent(selectedId);
    } catch (e) { setError(`Invoke: ${e.message}`); }
    finally { setBusy(false); setTimeout(() => setToast(null), 4000); }
  }

  function renderProfile() {
    if (!selectedAgent) return <em style={{ fontSize: 11 }}>No agent selected</em>;
    const a = selectedAgent;
    return (
      <Section title="Profile · agent_registry row" accent="#3b82f6">
        <table style={{ fontSize: 11, width: '100%' }}>
          <tbody>
            {[
              ['Agent ID', a.agent_id],
              ['Name', a.agent_name],
              ['Type', a.agent_type],
              ['Department', a.department_id],
              ['Domain', a.business_domain],
              ['Purpose', a.purpose],
              ['Owner Team', a.owner_team],
              ['Status', <Pill color={STATUS_COLOR[a.status] || '#94a3b8'}>{a.status}</Pill>],
              ['Version', a.version],
              ['Autonomy', a.autonomy_level],
              ['Risk', <Pill color={a.risk_level === 'High' ? '#ef4444' : a.risk_level === 'Medium' ? '#f59e0b' : '#10b981'}>{a.risk_level}</Pill>],
              ['Model', a.model_name || '—'],
              ['Runtime', a.runtime_framework],
              ['Max steps', a.max_steps],
              ['Timeout', `${a.timeout_seconds}s`],
              ['Cost limit', `$${a.cost_limit}`],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4, color: '#64748b', width: 120 }}>{k}</td>
                <td style={{ padding: 4 }}>{v ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    );
  }

  function renderOperations() {
    const ops = [
      { label: '▶ Invoke (scaffold)', cb: invokeAgent, color: '#3b82f6' },
      { label: '⏸ Pause', cb: () => setToast('⏸ Pause queued (scaffold)'), color: '#f59e0b' },
      { label: '▶ Resume', cb: () => setToast('▶ Resume queued (scaffold)'), color: '#10b981' },
      { label: '✗ Disable', cb: () => setToast('✗ Disable queued (scaffold)'), color: '#ef4444' },
      { label: '↺ Restart Memory', cb: () => setToast('↺ Memory reset (scaffold)'), color: '#8b5cf6' },
      { label: '⚡ Force Approval Mode', cb: () => setToast('⚡ Forced Approval (scaffold)'), color: '#f97316' },
      { label: '🛡 Lock to Read-only', cb: () => setToast('🛡 Read-only (scaffold)'), color: '#0891b2' },
      { label: '📝 Export Audit', cb: () => setToast('📝 Export queued (scaffold)'), color: '#475569' },
    ];
    return (
      <Section title="Operations · 8 operator controls" accent="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {ops.map(op => (
            <button key={op.label} onClick={op.cb} disabled={busy}
              style={{
                padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: '#fff', color: op.color,
                border: `1px solid ${op.color}55`, borderRadius: 4,
                textAlign: 'left',
              }}>
              {op.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
          Per §57.7 honest: 6 of 8 operations are scaffolded · operator wires real
          implementation (LangGraph hooks · admin DB writes) iteration 38+.
        </div>
      </Section>
    );
  }

  function renderSkills() {
    return (
      <Section title="Skills · mapped to this agent" accent="#8b5cf6">
        {selectedSkills.length === 0 && <em style={{ fontSize: 11 }}>No skills mapped yet.</em>}
        {selectedSkills.length > 0 && (
          <table style={{ fontSize: 11, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 4 }}>Skill</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Mode</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Risk</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {selectedSkills.map(s => (
                <tr key={s.skill_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4 }}>{s.skill_name} <code style={{ fontSize: 9, color: '#94a3b8' }}>{s.skill_id}</code></td>
                  <td style={{ padding: 4 }}>{s.execution_mode}</td>
                  <td style={{ padding: 4 }}>
                    <Pill color={s.skill_risk === 'High' ? '#ef4444' : s.skill_risk === 'Medium' ? '#f59e0b' : '#10b981'}>{s.skill_risk}</Pill>
                  </td>
                  <td style={{ padding: 4 }}>{s.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          {skillsRegistry.length} skills available in registry · use POST /agentic/mappings/agent-skill to attach.
        </div>
      </Section>
    );
  }

  function renderTools() {
    return (
      <Section title="Tools + Integrations" accent="#0891b2">
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
          Tool registry · {toolsRegistry.length} tools registered. Per-agent tool mapping
          lives in agent_tool_mapping (Iter 38 follow-up).
        </div>
        {toolsRegistry.slice(0, 10).map(t => (
          <div key={t.tool_id} style={{
            padding: 6, marginTop: 4, fontSize: 11,
            background: '#f8fafc', borderRadius: 3,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <strong>{t.tool_name}</strong> <code style={{ fontSize: 9, color: '#94a3b8' }}>{t.tool_id}</code>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Pill color="#0891b2">{t.tool_type}</Pill>
              <Pill color={t.risk_level === 'High' ? '#ef4444' : t.risk_level === 'Medium' ? '#f59e0b' : '#10b981'}>{t.risk_level}</Pill>
              <Pill color={STATUS_COLOR[t.status] || '#94a3b8'}>{t.status}</Pill>
            </div>
          </div>
        ))}
      </Section>
    );
  }

  function renderTracking() {
    return (
      <Section title="Tracking · last 20 invocations" accent="#10b981">
        {invocations.length === 0 && <em style={{ fontSize: 11 }}>No invocations yet · click Invoke in Operations tab.</em>}
        {invocations.length > 0 && (
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Trigger</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Duration (ms)</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {invocations.map(inv => (
                <tr key={inv.invocation_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}><code style={{ fontSize: 9 }}>{inv.invocation_id}</code></td>
                  <td style={{ padding: 3 }}><Pill color={STATUS_COLOR[inv.status] || '#94a3b8'}>{inv.status}</Pill></td>
                  <td style={{ padding: 3 }}>{inv.trigger_kind}</td>
                  <td style={{ padding: 3 }}>{inv.duration_ms ?? '—'}</td>
                  <td style={{ padding: 3, color: '#64748b' }}>{(inv.created_at || '').slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderSupervisor() {
    return (
      <Section title="Supervisor Agent · oversight" accent="#f59e0b">
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          <p>Per global §40 governance: every prediction passes through Confidence → Rules → Decision → Audit → Feedback.</p>
          <strong>Supervisor checks for this agent</strong>
          <ul style={{ marginTop: 6, fontSize: 11 }}>
            <li>Risk level vs autonomy: <Pill color="#f59e0b">{selectedAgent?.risk_level || '—'}</Pill> / <Pill color="#3b82f6">{selectedAgent?.autonomy_level || '—'}</Pill></li>
            <li>Max steps: {selectedAgent?.max_steps || '—'}</li>
            <li>Cost cap: ${selectedAgent?.cost_limit || '—'} per run</li>
            <li>Timeout: {selectedAgent?.timeout_seconds || '—'}s</li>
          </ul>
          <div style={{ marginTop: 8, padding: 8, background: '#fef3c7', borderRadius: 4 }}>
            <strong>Scaffold:</strong> Supervisor agent itself is a follow-up iteration. Today's
            guard rails are the registry's autonomy + risk + cost fields enforced at invoke time.
          </div>
        </div>
      </Section>
    );
  }

  function renderDelegation() {
    return (
      <Section title="Delegation · agent linking graph" accent="#8b5cf6">
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          <p>Agent-to-agent delegation: this agent can call other agents.</p>
          <div style={{
            padding: 10, marginTop: 6,
            background: '#f8fafc', borderRadius: 4,
            fontFamily: 'monospace', fontSize: 11,
          }}>
            {selectedAgent?.agent_id || '(no agent)'}
            <div style={{ marginLeft: 16, marginTop: 4, color: '#94a3b8' }}>
              ↳ (link table agent_dependency · Iter 38 follow-up)
            </div>
          </div>
          <p style={{ marginTop: 8, color: '#64748b' }}>
            Per §57.7: agent_dependency table arrives in Iter 38 · operator can already
            mark dependencies via free-text in purpose field today.
          </p>
        </div>
      </Section>
    );
  }

  function renderScorecard() {
    const n = invocations.length;
    const n_success = invocations.filter(i => i.status === 'Success').length;
    const successPct = n ? Math.round(100 * n_success / n) : 0;
    return (
      <Section title="Scorecard · per-agent quality" accent="#10b981">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>SUCCESS RATE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: successPct >= 95 ? '#10b981' : '#f59e0b' }}>
              {successPct}%
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>target ≥ 95%</div>
          </div>
          <div style={{ padding: 8, background: '#eff6ff', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>RUN COUNT</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{n}</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>last 20 shown</div>
          </div>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>OVERRIDE RATE</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {n ? Math.round(100 * invocations.filter(i => i.human_override).length / n) : 0}%
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>target &lt; 10%</div>
          </div>
        </div>
      </Section>
    );
  }

  function renderFeedback() {
    const fbList = opsRollup?.feedback || [];
    return (
      <Section title="Feedback · last 10 (Iter 38 · agent_feedback)" accent="#0891b2">
        {fbList.length === 0 && <em style={{ fontSize: 11 }}>No feedback yet · POST /agentic-ops/feedback.</em>}
        {fbList.length > 0 && (
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Rating</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Severity</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Category</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Action?</th>
              </tr>
            </thead>
            <tbody>
              {fbList.map(f => (
                <tr key={f.feedback_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}>{f.feedback_type}</td>
                  <td style={{ padding: 3 }}>{f.rating ?? '—'}</td>
                  <td style={{ padding: 3 }}>
                    <Pill color={f.severity === 'Critical' ? '#ef4444' : f.severity === 'High' ? '#f97316' : '#10b981'}>{f.severity}</Pill>
                  </td>
                  <td style={{ padding: 3, fontSize: 9 }}>{f.category || '—'}</td>
                  <td style={{ padding: 3 }}>{f.action_required ? '⚠' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderIncidents() {
    const list = opsRollup?.incidents || [];
    return (
      <Section title="Incidents · last 10 (Iter 38 · agent_incident)" accent="#ef4444">
        {list.length === 0 && <em style={{ fontSize: 11 }}>No incidents recorded.</em>}
        {list.length > 0 && (
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Severity</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Title</th>
              </tr>
            </thead>
            <tbody>
              {list.map(i => (
                <tr key={i.incident_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}><code style={{ fontSize: 9 }}>{i.incident_id}</code></td>
                  <td style={{ padding: 3 }}>
                    <Pill color={i.severity === 'P1' ? '#ef4444' : i.severity === 'P2' ? '#f97316' : '#f59e0b'}>{i.severity}</Pill>
                  </td>
                  <td style={{ padding: 3 }}>{i.incident_type}</td>
                  <td style={{ padding: 3 }}>{i.status}</td>
                  <td style={{ padding: 3, fontSize: 9 }}>{i.title?.slice(0, 50)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderDependencies() {
    const list = opsRollup?.dependencies || [];
    return (
      <Section title="Dependencies · what this agent needs" accent="#8b5cf6">
        {list.length === 0 && <em style={{ fontSize: 11 }}>No dependencies registered · POST /agentic-ops/dependencies.</em>}
        {list.length > 0 && (
          <table style={{ fontSize: 11, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Criticality</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Fallback</th>
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.dependency_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}><code style={{ fontSize: 9 }}>{d.dependency_type}</code></td>
                  <td style={{ padding: 3 }}>{d.dependency_name}</td>
                  <td style={{ padding: 3 }}>
                    <Pill color={d.criticality === 'Critical' ? '#ef4444' : d.criticality === 'High' ? '#f97316' : '#10b981'}>{d.criticality}</Pill>
                  </td>
                  <td style={{ padding: 3 }}>
                    <Pill color={STATUS_COLOR[d.status] || (d.status === 'Healthy' ? '#10b981' : '#ef4444')}>{d.status}</Pill>
                  </td>
                  <td style={{ padding: 3, fontSize: 9 }}>{d.fallback_dependency || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderTeam() {
    const t = opsRollup?.team;
    return (
      <Section title="Team · ownership + escalation (Iter 38 · agent_team)" accent="#3b82f6">
        {!t && <em style={{ fontSize: 11 }}>No team assigned · POST /agentic-ops/teams.</em>}
        {t && (
          <table style={{ fontSize: 11, width: '100%' }}>
            <tbody>
              {[
                ['Business Owner', t.business_owner],
                ['Technical Owner', t.technical_owner],
                ['Support Team', t.support_team],
                ['Platform Team', t.platform_team],
                ['Security Owner', t.security_owner],
                ['Compliance Owner', t.compliance_owner],
                ['Incident Manager', t.incident_manager],
                ['Release Manager', t.release_manager],
                ['Escalation Group', t.escalation_group],
                ['Support Model', t.support_model],
                ['Support Hours', t.support_hours],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, color: '#64748b', width: 160 }}>{k}</td>
                  <td style={{ padding: 4 }}>{v || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderSLA() {
    const s = opsRollup?.sla;
    return (
      <Section title="SLA · commitments (Iter 38 · agent_sla)" accent="#10b981">
        {!s && <em style={{ fontSize: 11 }}>No SLA defined · POST /agentic-ops/slas.</em>}
        {s && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { k: 'Tier', v: s.sla_tier, accent: '#3b82f6' },
              { k: 'Availability', v: `${s.availability_target}%`, accent: '#10b981' },
              { k: 'Latency', v: `${s.latency_target_ms}ms`, accent: '#f59e0b' },
              { k: 'Accuracy', v: `${s.accuracy_target}%`, accent: '#8b5cf6' },
              { k: 'Success Rate', v: `${s.success_rate_target}%`, accent: '#10b981' },
              { k: 'MTTR', v: `${s.mttr_target_minutes}m`, accent: '#0891b2' },
              { k: 'MTTA', v: `${s.mtta_target_minutes}m`, accent: '#0891b2' },
              { k: 'Cost/run', v: `$${s.max_cost_per_run}`, accent: '#f97316' },
              { k: 'Incidents/mo', v: s.max_incidents_per_month, accent: '#ef4444' },
            ].map(({ k, v, accent }) => (
              <div key={k} style={{ padding: 8, background: `${accent}10`, borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: '#64748b' }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    );
  }

  function renderCapacity() {
    const c = opsRollup?.capacity;
    return (
      <Section title="Capacity · concurrency + autoscale (Iter 38 · agent_capacity)" accent="#f97316">
        {!c && <em style={{ fontSize: 11 }}>No capacity defined · POST /agentic-ops/capacities.</em>}
        {c && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#475569' }}>Concurrency</div>
              <ul style={{ marginTop: 4 }}>
                <li>Max concurrent: {c.max_concurrent_requests}</li>
                <li>Max queue depth: {c.max_queue_depth}</li>
                <li>Target RPS: {c.target_throughput_rps}</li>
                <li>Target latency: {c.target_latency_ms}ms</li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#475569' }}>Resources</div>
              <ul style={{ marginTop: 4 }}>
                <li>CPU: {c.max_cpu_cores} cores</li>
                <li>Memory: {c.max_memory_mb}MB</li>
                <li>GPU: {c.max_gpu_memory_mb}MB</li>
                <li>Tokens/req: {c.max_tokens_per_request}</li>
              </ul>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontWeight: 700, color: '#475569' }}>Autoscale</div>
              <p style={{ marginTop: 4 }}>
                {c.autoscale_min_instances}–{c.autoscale_max_instances} instances ·
                trigger: <code>{c.autoscale_trigger}</code> ·
                utilization now: <strong>{c.current_utilization}%</strong>
              </p>
            </div>
          </div>
        )}
      </Section>
    );
  }

  function renderQueue() {
    const list = opsRollup?.queue || [];
    return (
      <Section title="Queue · pending + running jobs (Iter 38 · agent_queue)" accent="#0891b2">
        {list.length === 0 && <em style={{ fontSize: 11 }}>No jobs queued · POST /agentic-ops/queue/enqueue.</em>}
        {list.length > 0 && (
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>Job</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Priority</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Retries</th>
              </tr>
            </thead>
            <tbody>
              {list.map(q => (
                <tr key={q.queue_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}><code style={{ fontSize: 9 }}>{q.job_id}</code></td>
                  <td style={{ padding: 3 }}>{q.job_type}</td>
                  <td style={{ padding: 3 }}><Pill color="#0891b2">P{q.priority}</Pill></td>
                  <td style={{ padding: 3 }}>
                    <Pill color={
                      q.queue_status === 'Completed' ? '#10b981' :
                        q.queue_status === 'Failed' ? '#ef4444' :
                        q.queue_status === 'Running' ? '#3b82f6' : '#94a3b8'
                    }>{q.queue_status}</Pill>
                  </td>
                  <td style={{ padding: 3 }}>{q.retry_count}/{q.max_retries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderApprovals() {
    return (
      <Section title="Approvals · pending human gates" accent="#ef4444">
        <em style={{ fontSize: 11 }}>None pending for this agent.</em>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          High-risk skill invocations queue here when execution_mode = 'Approval Required'.
          Operator approves via /api/v1/approvals/* (Iter 31).
        </div>
      </Section>
    );
  }

  function renderIPO() {
    // Iter 41 · use blueprint's per-agent IPO when available
    if (blueprint?.inputs) {
      return (
        <Section title="IPO · agent-specific input/process/output" accent="#0891b2">
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            {blueprint.process_summary}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
            <div style={{ padding: 10, background: '#eff6ff', borderRadius: 4 }}>
              <strong style={{ fontSize: 10, color: '#1d4ed8' }}>INPUT ({blueprint.inputs.length})</strong>
              <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
                <tbody>
                  {blueprint.inputs.map(i => (
                    <tr key={i.name} style={{ borderTop: '1px solid #dbeafe' }}>
                      <td style={{ padding: 2 }}><code style={{ fontSize: 9 }}>{i.name}</code></td>
                      <td style={{ padding: 2 }}><Pill color="#3b82f6">{i.type}</Pill></td>
                      <td style={{ padding: 2, fontSize: 9, color: '#64748b' }}>← {i.from}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 4 }}>
              <strong style={{ fontSize: 10, color: '#15803d' }}>PROCESS ({blueprint.steps.length} steps)</strong>
              <ol style={{ marginTop: 4, paddingLeft: 18, fontSize: 10 }}>
                {blueprint.steps.map((s, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{s}</li>
                ))}
              </ol>
            </div>
            <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
              <strong style={{ fontSize: 10, color: '#a16207' }}>OUTPUT ({blueprint.outputs.length})</strong>
              <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
                <tbody>
                  {blueprint.outputs.map(o => (
                    <tr key={o.name} style={{ borderTop: '1px solid #fde68a' }}>
                      <td style={{ padding: 2 }}><code style={{ fontSize: 9 }}>{o.name}</code></td>
                      <td style={{ padding: 2 }}><Pill color="#a16207">{o.type}</Pill></td>
                      <td style={{ padding: 2, fontSize: 9, color: '#64748b' }}>→ {o.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      );
    }
    return (
      <Section title="IPO · Input · Process · Output" accent="#0891b2">
        <em style={{ fontSize: 11 }}>Loading blueprint…</em>
      </Section>
    );
  }

  function renderMcpRag() {
    // Iter 41 · use blueprint's per-agent MCP + RAG when available
    if (blueprint?.mcp_servers) {
      return (
        <Section title={`MCP + RAG · ${blueprint.agent_id}`} accent="#8b5cf6">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <strong style={{ fontSize: 10, color: '#7e22ce' }}>MCP SERVERS ({blueprint.mcp_servers.length})</strong>
              <ul style={{ fontSize: 11, marginTop: 4 }}>
                {blueprint.mcp_servers.map(m => (
                  <li key={m}><code style={{ fontSize: 10, background: '#f3e8ff', padding: '1px 4px', borderRadius: 2 }}>{m}</code></li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: 10, color: '#0e7490' }}>RAG CORPORA ({blueprint.rag_corpora.length})</strong>
              <ul style={{ fontSize: 11, marginTop: 4 }}>
                {blueprint.rag_corpora.map(c => (
                  <li key={c}><code style={{ fontSize: 10, background: '#ecfeff', padding: '1px 4px', borderRadius: 2 }}>{c}</code></li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ marginTop: 10, padding: 8, background: '#faf5ff', borderRadius: 4 }}>
            <strong style={{ fontSize: 10, color: '#7e22ce' }}>TOOLS · {blueprint.tools_mapped?.length || 0} mapped + {blueprint.tools_template?.length || 0} from dept template</strong>
            <div style={{ marginTop: 4, fontSize: 10 }}>
              {(blueprint.tools_mapped || []).concat(blueprint.tools_template || []).map((t, i) => (
                <code key={`${t}-${i}`} style={{ display: 'inline-block', margin: '2px 4px 2px 0',
                  fontSize: 9, padding: '1px 4px', background: '#fff', borderRadius: 2 }}>{t}</code>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
            Per §57.7 scaffold · live mcp_server_registry + agent_mcp_mapping = Iter 42+.
          </div>
        </Section>
      );
    }
    return (
      <Section title="MCP + RAG · external integrations" accent="#8b5cf6">
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          <strong>MCP servers</strong> (mcp_server_registry · Iter 38 follow-up):
        </div>
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 3 }}>MCP Server</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Allowed Tools</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Auth</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['github-mcp', 'create-issue · read-repo · list-prs', 'OAuth (user)'],
              ['slack-mcp', 'send-message · search-channel', 'Bot token'],
              ['jira-mcp', 'create-ticket · update · search', 'API key'],
              ['servicenow-mcp', 'create-incident · update-state', 'OAuth'],
              ['azure-monitor-mcp', 'query-metric · alert-rules', 'Managed identity'],
            ].map(([s, t, a]) => (
              <tr key={s} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 3 }}><code>{s}</code></td>
                <td style={{ padding: 3, fontSize: 9 }}>{t}</td>
                <td style={{ padding: 3, fontSize: 9 }}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 11, marginTop: 12, marginBottom: 8 }}>
          <strong>RAG operations</strong> available to this agent:
        </div>
        <ul style={{ fontSize: 10 }}>
          <li><code>retrieve(query, top_k=5)</code> · vector search across corpus</li>
          <li><code>cite(answer, chunks)</code> · attach citations to output</li>
          <li><code>guardrail(retrieved)</code> · PII redact + tenant scope</li>
          <li><code>compress(chunks)</code> · token-budget aware merge</li>
        </ul>

        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Per §57.7 scaffold · MCP gateway + RAG corpus wiring lands in Iter 38+.
        </div>
      </Section>
    );
  }

  function renderFailures() {
    const failures = invocations.filter(i => i.status === 'Failed');
    return (
      <Section title="Failures · last-N + remediation" accent="#ef4444">
        {failures.length === 0 && (
          <em style={{ fontSize: 11 }}>No failures recorded · either scaffold mode or healthy.</em>
        )}
        {failures.length > 0 && (
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ color: '#64748b' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 3 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Error</th>
                <th style={{ textAlign: 'left', padding: 3 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {failures.map(f => (
                <tr key={f.invocation_id}>
                  <td style={{ padding: 3 }}><code>{f.invocation_id}</code></td>
                  <td style={{ padding: 3, color: '#991b1b' }}>{f.error_text?.slice(0, 60) || '—'}</td>
                  <td style={{ padding: 3 }}>
                    <button style={{ padding: '2px 6px', fontSize: 9, cursor: 'pointer' }}>↻ Retry</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    );
  }

  function renderChallenges() {
    const list = [
      { challenge: 'Wrong agent selected for task', solution: 'Routing rules + intent classifier (Iter 38)' },
      { challenge: 'Tool timeout', solution: 'Retry with backoff + circuit breaker' },
      { challenge: 'MCP auth failure', solution: 'OAuth refresh + read-only fallback' },
      { challenge: 'Hallucination in RAG answer', solution: 'Citation required + faithfulness gate' },
      { challenge: 'Memory loss across steps', solution: 'agent_memory store with TTL' },
      { challenge: 'Cost explosion', solution: 'cost_limit per run + kill switch' },
      { challenge: 'Infinite loop', solution: 'max_steps cap (currently ' + (selectedAgent?.max_steps || 10) + ')' },
      { challenge: 'Prompt injection', solution: 'Input sanitization + guardrails layer' },
      { challenge: 'Unauthorized tool call', solution: 'agent_tool_mapping allowlist' },
      { challenge: 'Stale data in RAG', solution: 'Re-index cron + TTL on chunks' },
    ];
    return (
      <Section title="Challenges + Solutions · runbook" accent="#f59e0b">
        <table style={{ fontSize: 11, width: '100%' }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>Challenge</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Solution</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}>{r.challenge}</td>
                <td style={{ padding: 4, color: '#64748b' }}>{r.solution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // NEW · 6 additional tabs per operator request
  // Flowchart · Integration · Planner · Research · Review · Verification

  function renderFlowchart() {
    const id = selectedAgent?.agent_id || 'agent';
    // Iter 41 · use blueprint's flowchart when available
    if (blueprint?.flowchart_ascii) {
      return (
        <Section title={`Flowchart · ${id}`} accent="#3b82f6">
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            {blueprint.process_summary}
          </div>
          <pre style={{
            fontSize: 11, lineHeight: 1.6, background: '#0f172a', color: '#e2e8f0',
            padding: 12, borderRadius: 4, overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>{blueprint.flowchart_ascii}</pre>
        </Section>
      );
    }
    return (
      <Section title="Flowchart · execution graph" accent="#3b82f6">
        <pre style={{
          fontSize: 10, lineHeight: 1.4, background: '#0f172a', color: '#e2e8f0',
          padding: 12, borderRadius: 4, overflowX: 'auto',
        }}>{`        ┌──────────────────┐
        │   User / Event   │
        │   (input_text)   │
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │     ${id.slice(0, 12).padEnd(12)} │  ← this agent
        │   (autonomy=${(selectedAgent?.autonomy_level || 'Approval').slice(0,9).padEnd(9)})│
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │     PLANNER      │ → decomposes input into skill list
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │  Skill picker    │ (${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''} mapped)
        │  ${selectedSkills.slice(0,3).map(s => '• ' + s.skill_id).join('\\n  ') || '  (no skills mapped)'}
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │  RESEARCH layer  │ ← RAG retrieval + MCP query
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │  Tool execution  │ ← guardrail gate
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │     REVIEW       │ ← reviewer agent / self-critique
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │  VERIFICATION    │ ← gold-set eval / safety / fairness
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │   audit_row      │ ← agent_invocation
        │   + response     │
        └──────────────────┘`}</pre>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Per §57.7 honest · this is the contracted flow · the runtime
          executes PLANNER → SKILL → RESEARCH → TOOL → REVIEW → VERIFY → AUDIT
          in that order. Each stage has its own tab below.
        </div>
      </Section>
    );
  }

  function renderIntegration() {
    const integrations = [
      { type: 'MCP server', name: 'github-mcp', purpose: 'Code search · PR creation', auth: 'OAuth (user)' },
      { type: 'MCP server', name: 'slack-mcp', purpose: 'Notification · channel search', auth: 'Bot token' },
      { type: 'MCP server', name: 'jira-mcp', purpose: 'Ticket CRUD', auth: 'API key' },
      { type: 'API tool', name: 'catalog_query', purpose: 'Read PostgreSQL catalog', auth: 'service account' },
      { type: 'API tool', name: 'log_search', purpose: 'Read ELK logs', auth: 'service account' },
      { type: 'MCP server', name: 'azure-monitor-mcp', purpose: 'Query metrics + alerts', auth: 'Managed identity' },
      { type: 'Webhook', name: 'incident-webhook', purpose: 'Push event to monitoring', auth: 'HMAC' },
    ];
    return (
      <Section title="Integration · external systems this agent talks to" accent="#0891b2">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 3 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Name</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Purpose</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Auth</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map(int => (
              <tr key={int.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 3 }}><Pill color="#0891b2">{int.type}</Pill></td>
                <td style={{ padding: 3 }}><code style={{ fontSize: 9 }}>{int.name}</code></td>
                <td style={{ padding: 3 }}>{int.purpose}</td>
                <td style={{ padding: 3, fontSize: 9 }}>{int.auth}</td>
                <td style={{ padding: 3 }}>
                  <Pill color="#10b981">connected</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            INTEGRATION FLOW
          </div>
          <pre style={{ margin: 0, fontSize: 9, color: '#475569' }}>{`Agent
  ├─→ MCP gateway → [github · slack · jira · azure-monitor]
  ├─→ Tool registry → [catalog · logs · metrics]
  └─→ Webhook bus → [incident-management · audit-trail]`}</pre>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
          Per §57.7 scaffold · live integrations require mcp_server_registry
          + agent_mcp_mapping tables (Iter 41+).
        </div>
      </Section>
    );
  }

  function renderPlanner() {
    const recentInvs = invocations.slice(0, 3);
    return (
      <Section title="Planner · decomposes goals into skill sequences" accent="#8b5cf6">
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          The planner reads <code>input_text</code> + the agent's available skills,
          then emits an ordered plan of skill invocations.
        </div>
        <div style={{
          padding: 10, background: '#faf5ff', borderRadius: 4,
          border: '1px solid #c4b5fd',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', marginBottom: 4 }}>
            PLANNER CONTRACT
          </div>
          <pre style={{ margin: 0, fontSize: 10, color: '#475569' }}>{`Input:  { input_text, agent_id, allowed_skills[], context }
Output: { plan: [{ skill_id, args, depends_on }], rationale }
Guards: max_steps=${selectedAgent?.max_steps || 10} · timeout=${selectedAgent?.timeout_seconds || 60}s`}</pre>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: '#475569' }}>
          Recent plans (from agent_invocation.plan_text)
        </div>
        {recentInvs.length === 0 && (
          <em style={{ fontSize: 11, color: '#94a3b8' }}>No invocations yet · invoke the agent from Operations tab.</em>
        )}
        {recentInvs.map(inv => (
          <div key={inv.invocation_id} style={{
            marginTop: 6, padding: 8, background: '#f8fafc', borderRadius: 3,
          }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>
              <code>{inv.invocation_id}</code> · {(inv.created_at || '').slice(0, 19)}
            </div>
            <pre style={{ margin: '4px 0 0', fontSize: 10, whiteSpace: 'pre-wrap' }}>
              {inv.plan_text || '(no plan)'}
            </pre>
          </div>
        ))}
      </Section>
    );
  }

  function renderResearch() {
    return (
      <Section title="Research · RAG + MCP retrieval phase" accent="#0891b2">
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          Before tool execution, the agent retrieves context from:
        </div>
        <table style={{ fontSize: 11, width: '100%' }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>Source</th>
              <th style={{ textAlign: 'left', padding: 4 }}>What it provides</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Used by</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Vector store (Qdrant)', 'Top-k chunks from knowledge_base', 'Planner + tool args'],
              ['Knowledge base', 'Policies · runbooks · lessons learned', 'Decision context'],
              ['MCP servers', 'Real-time external data (Jira · GitHub)', 'Tool calls'],
              ['Audit history', 'Previous invocations for same correlation_id', 'Continuity'],
              ['Agent memory', 'Working state across multi-step flows', 'Session continuity'],
            ].map(([src, what, used]) => (
              <tr key={src} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}><code style={{ fontSize: 9 }}>{src}</code></td>
                <td style={{ padding: 4, fontSize: 10 }}>{what}</td>
                <td style={{ padding: 4, fontSize: 10 }}>{used}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          marginTop: 12, padding: 10, background: '#ecfeff', borderRadius: 4,
          border: '1px solid #67e8f9',
        }}>
          <strong style={{ fontSize: 10, color: '#0e7490' }}>RESEARCH OUTPUT</strong>
          <pre style={{ margin: '4px 0 0', fontSize: 10 }}>{`{
  "chunks": [{ id, score, source, content[:200] }],
  "citations": [{ chunk_id, span }],
  "guardrail_trace": [{ filter, fired, reason }],
  "n_tokens_retrieved": 4521
}`}</pre>
        </div>
      </Section>
    );
  }

  function renderReview() {
    const recentInvs = invocations.slice(0, 5);
    const success = recentInvs.filter(i => i.status === 'Success').length;
    const successPct = recentInvs.length ? Math.round(100 * success / recentInvs.length) : 0;
    return (
      <Section title="Review · self-critique + reviewer-agent verdicts" accent="#f59e0b">
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          After execution, every output passes through a reviewer phase:
        </div>
        <ul style={{ fontSize: 11, lineHeight: 1.7 }}>
          <li>✓ <strong>Self-critique</strong> · the agent re-reads its own output</li>
          <li>✓ <strong>Reviewer agent</strong> · a separate agent scores the output (1-5)</li>
          <li>✓ <strong>Citation check</strong> · every claim has retrieval evidence</li>
          <li>✓ <strong>Tone + brand voice gate</strong> · if customer-facing</li>
          <li>✓ <strong>HITL escalation</strong> · if score &lt; 3 OR risk = High</li>
        </ul>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>REVIEW PASS RATE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{successPct}%</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>(success / recent {recentInvs.length})</div>
          </div>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>OVERRIDE RATE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>
              {recentInvs.length ? Math.round(100 * recentInvs.filter(i => i.human_override).length / recentInvs.length) : 0}%
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>target &lt; 10%</div>
          </div>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#64748b' }}>HITL ESCALATIONS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>
              {recentInvs.filter(i => i.status === 'Failed').length}
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>(failed → human)</div>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Per §40 governance · the reviewer is required for risk_level = High agents.
        </div>
      </Section>
    );
  }

  function renderVerification() {
    return (
      <Section title="Verification · final gates before response" accent="#10b981">
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          The verification phase runs deterministic checks before the agent's
          output reaches the caller:
        </div>
        <table style={{ fontSize: 11, width: '100%' }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>Gate</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Check</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Failure action</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Schema',         'output matches declared output_schema',           'reject + re-plan'],
              ['Citation',       'every fact has retrieval evidence',               'flag for review'],
              ['PII',            'no PII leaks in output',                          'redact + log'],
              ['Bias',           'fairness check across protected groups',          'audit + alert'],
              ['Cost',           'tokens × rate ≤ cost_limit',                      'truncate + log'],
              ['Safety',         'output passes guardrail filters (toxicity · injection)', 'block + escalate'],
              ['Confidence',     'overall confidence ≥ threshold',                  'HITL gate'],
              ['Rollback',       'action is reversible OR has approval',            'block if not'],
              ['Audit row',      'agent_invocation row written',                    'fail if missing'],
            ].map(([gate, check, fail]) => (
              <tr key={gate} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}><Pill color="#10b981">{gate}</Pill></td>
                <td style={{ padding: 4, fontSize: 10 }}>{check}</td>
                <td style={{ padding: 4, fontSize: 10, color: '#64748b' }}>{fail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          marginTop: 12, padding: 10, background: '#f0fdf4', borderRadius: 4,
          border: '1px solid #86efac',
        }}>
          <strong style={{ fontSize: 10, color: '#15803d' }}>VERIFIED RESPONSE PAYLOAD</strong>
          <pre style={{ margin: '4px 0 0', fontSize: 10 }}>{`{
  "output": "...",
  "confidence": 0.91,
  "verifications": {
    "schema": "pass", "citation": "pass", "pii": "pass",
    "bias": "pass", "cost": "pass", "safety": "pass",
    "rollback": "applicable", "audit_row": "INV-..."
  },
  "audit_row": { invocation_id, plan, tools_used, cost_usd }
}`}</pre>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Per §38.3 + §40 + §48 · this is the final layer before user sees response.
          For risk_level = High ({selectedAgent?.risk_level || '—'}), Confidence + Rollback gates
          require human approval.
        </div>
      </Section>
    );
  }

  const renderers = {
    profile: renderProfile, operations: renderOperations, ipo: renderIPO,
    skills: renderSkills, tools: renderTools, mcp_rag: renderMcpRag,
    tracking: renderTracking, failures: renderFailures, challenges: renderChallenges,
    supervisor: renderSupervisor, delegation: renderDelegation,
    scorecard: renderScorecard, approvals: renderApprovals,
    // Iter 38 ops layer
    feedback: renderFeedback, incidents: renderIncidents,
    dependencies: renderDependencies, team: renderTeam,
    sla: renderSLA, capacity: renderCapacity, queue: renderQueue,
    // NEW · Iter 41 operator-requested surfaces
    flowchart: renderFlowchart, integration: renderIntegration,
    planner: renderPlanner, research: renderResearch,
    review: renderReview, verification: renderVerification,
  };

  // Apply dept filter
  const filteredAgents = dept === 'all'
    ? agents
    : agents.filter(a => (a.department_id || '').toLowerCase().includes(dept.toLowerCase()));

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12,
      padding: 12, background: '#f8fafc', minHeight: '100vh',
    }}>
      {/* Catalog */}
      <div style={{
        background: '#fff', padding: 10, borderRadius: 6,
        border: '1px solid #e2e8f0', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 12 }}>Agent Catalog</strong>
          <button onClick={refreshCatalog} style={{
            padding: '2px 8px', fontSize: 9, cursor: 'pointer',
            border: '1px solid #cbd5e1', borderRadius: 3,
          }}>↻</button>
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)}
          style={{
            marginTop: 6, padding: '4px 6px', fontSize: 11, width: '100%',
            border: '1px solid #cbd5e1', borderRadius: 3, background: '#fff',
          }}>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>
          ))}
        </select>
        <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
          {filteredAgents.length}/{agents.length} agents · {skillsRegistry.length} skills · {toolsRegistry.length} tools
        </div>
        {agents.length === 0 && (
          <div style={{ marginTop: 12, padding: 10, fontSize: 11, background: '#fef3c7', borderRadius: 4 }}>
            Empty catalog · register an agent:
            <pre style={{ marginTop: 4, fontSize: 9 }}>POST /api/v1/agentic/agents</pre>
          </div>
        )}
        {filteredAgents.map(a => (
          <div key={a.agent_id} onClick={() => setSelectedId(a.agent_id)}
            style={{
              marginTop: 6, padding: 8, cursor: 'pointer',
              background: selectedId === a.agent_id ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${selectedId === a.agent_id ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: 4,
            }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{a.agent_name}</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>{a.agent_id}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Pill color={STATUS_COLOR[a.status] || '#94a3b8'}>{a.status}</Pill>
              <Pill color={a.risk_level === 'High' ? '#ef4444' : a.risk_level === 'Medium' ? '#f59e0b' : '#10b981'}>{a.risk_level}</Pill>
            </div>
          </div>
        ))}
      </div>

      {/* Detail pane */}
      <div>
        {!selectedId && (
          <div style={{
            padding: 30, background: '#fff', borderRadius: 6,
            border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b',
          }}>
            <strong style={{ fontSize: 14 }}>Agentic Admin</strong>
            <p style={{ marginTop: 8, fontSize: 12 }}>
              Select an agent from the catalog to manage operations, skills, tools, tracking,
              supervisor, delegation, scorecard, and approvals.
            </p>
            <p style={{ marginTop: 12, fontSize: 11 }}>
              Empty catalog? Register first agent:<br />
              <code style={{ background: '#f1f5f9', padding: 2 }}>
                curl -X POST {API}/api/v1/agentic/agents -d {`'{"agent_id":"incident_triage_agent","agent_name":"Incident Triage"}'`}
              </code>
            </p>
          </div>
        )}
        {selectedId && (
          <>
            <div style={{
              padding: 10, background: '#fff', borderRadius: 6,
              border: '1px solid #e2e8f0',
            }}>
              <strong style={{ fontSize: 14 }}>{selectedAgent?.agent_name || selectedId}</strong>
              <span style={{ fontSize: 10, color: '#64748b', marginLeft: 8 }}>
                {selectedAgent?.department_id} · {selectedAgent?.business_domain}
              </span>
              {/* Grouped tab nav · 4 categories */}
              {TAB_GROUPS.map(group => (
                <div key={group.label} style={{ marginTop: 8 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                  }}>{group.label}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {group.tabs.map(t => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{
                          padding: '3px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                          background: activeTab === t.key ? '#3b82f6' : '#fff',
                          color: activeTab === t.key ? '#fff' : '#475569',
                          border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#cbd5e1'}`,
                          borderRadius: 3,
                        }}>{t.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: 8, padding: 8, fontSize: 11, background: '#fee2e2', color: '#991b1b', borderRadius: 4 }}>
                {error}
              </div>
            )}
            {renderers[activeTab]?.()}
          </>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, padding: 12,
          background: '#1e293b', color: '#fff', fontSize: 12, borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
        }}>{toast}</div>
      )}
    </div>
  );
}

export default AgenticAdminPanel;
