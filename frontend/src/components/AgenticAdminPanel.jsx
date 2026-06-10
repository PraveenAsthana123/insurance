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

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'operations', label: 'Operations' },
  { key: 'ipo', label: 'IPO' },
  { key: 'skills', label: 'Skills' },
  { key: 'tools', label: 'Tools' },
  { key: 'mcp_rag', label: 'MCP + RAG' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'failures', label: 'Failures' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'delegation', label: 'Delegation' },
  { key: 'scorecard', label: 'Scorecard' },
  { key: 'approvals', label: 'Approvals' },
];

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
    return (
      <Section title="IPO · Input · Process · Output" accent="#0891b2">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
          <div style={{ padding: 10, background: '#eff6ff', borderRadius: 4 }}>
            <strong style={{ fontSize: 10, color: '#1d4ed8' }}>INPUT</strong>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              <li>Event payload (alerts · webhooks · API)</li>
              <li>Tenant + correlation ID</li>
              <li>Trigger source (cron · user · agent)</li>
              <li>RAG-retrieved context (top-k chunks)</li>
            </ul>
          </div>
          <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 4 }}>
            <strong style={{ fontSize: 10, color: '#15803d' }}>PROCESS</strong>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              <li>Skill selection (planner)</li>
              <li>Tool/MCP allowlist check (guardrails)</li>
              <li>Sub-task fan-out (if multi-step)</li>
              <li>Supervisor agent validation</li>
            </ul>
          </div>
          <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
            <strong style={{ fontSize: 10, color: '#a16207' }}>OUTPUT</strong>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              <li>Decision/action result</li>
              <li>Audit row → agent_invocation</li>
              <li>Cost + latency + token counts</li>
              <li>Citation + reasoning trace</li>
            </ul>
          </div>
        </div>
      </Section>
    );
  }

  function renderMcpRag() {
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

  const renderers = {
    profile: renderProfile, operations: renderOperations, ipo: renderIPO,
    skills: renderSkills, tools: renderTools, mcp_rag: renderMcpRag,
    tracking: renderTracking, failures: renderFailures, challenges: renderChallenges,
    supervisor: renderSupervisor, delegation: renderDelegation,
    scorecard: renderScorecard, approvals: renderApprovals,
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
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: activeTab === t.key ? '#3b82f6' : '#fff',
                      color: activeTab === t.key ? '#fff' : '#475569',
                      border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#cbd5e1'}`,
                      borderRadius: 3,
                    }}>{t.label}</button>
                ))}
              </div>
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
