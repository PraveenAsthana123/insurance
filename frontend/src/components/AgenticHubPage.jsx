// AgenticHubPage.jsx · Iter 46 · single consolidated hub for the agentic platform.
// Sub-tabs: All Agents · Skills · Tools · Registry · Search · Intervention ·
// Verification · plus link to per-agent admin (existing AgenticAdminPanel).

import { useState, useEffect, useMemo, useCallback } from 'react';
import AgenticAdminPanel from './AgenticAdminPanel';
import AllAgentsNetworkPanel from './AllAgentsNetworkPanel';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

const HUB_TABS = [
  { key: 'task-tracer',   label: '▶ Run Task (live trace)' },
  { key: 'status',        label: 'Status (live)' },
  { key: 'all-agents',    label: 'All Agents (table)' },
  { key: 'admin',         label: 'Per-Agent Admin (26 tabs)' },
  { key: 'skills',        label: 'Skills' },
  { key: 'tools',         label: 'Tools' },
  { key: 'registry',      label: 'Unified Registry' },
  { key: 'search',        label: 'Cross-Search' },
  { key: 'intervention',  label: 'Intervention (HITL)' },
  { key: 'verification',  label: 'Verification Gates' },
  { key: 'issues',        label: 'Issues & Solutions' },
  { key: 'testing',       label: 'Testing & Pipelines (Iter 47)' },
  { key: 'quality',       label: 'Quality Scorecard (Iter 48)' },
  { key: 'coverage',      label: 'Coverage (Iter 45)' },
];

function Pill({ children, color = '#94a3b8' }) {
  return (
    <span style={{
      padding: '1px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      display: 'inline-block', marginRight: 2,
    }}>{children}</span>
  );
}

function Section({ title, children, accent = '#3b82f6' }) {
  return (
    <div style={{
      marginTop: 10, padding: 12, background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 6,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: accent, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{title}</div>
      {children}
    </div>
  );
}

const RISK_COLOR = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#991b1b' };

// ─────────────────────────────────────────────────────────────────────
// Skills view

function SkillsView() {
  const [skills, setSkills] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/agentic/skills?limit=500`)
      .then(r => r.json())
      .then(d => setSkills(d.skills || []));
  }, []);

  const filtered = useMemo(() => {
    let rows = skills;
    if (filter !== 'all') rows = rows.filter(r => r.risk_level === filter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.skill_id?.toLowerCase().includes(q) ||
        r.skill_name?.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [skills, filter, search]);

  const byCategory = useMemo(() => {
    const m = {};
    skills.forEach(s => {
      const k = s.skill_category || '(uncategorized)';
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [skills]);

  const isSystem = filtered.filter(s => s.skill_id?.startsWith('sys_'));
  const business = filtered.filter(s => !s.skill_id?.startsWith('sys_'));

  return (
    <Section title={`Skills · ${skills.length} total (${filtered.length} shown)`} accent="#8b5cf6">
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="search skills"
          style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3, width: 240 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
          <option value="all">All risk</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>
          <Pill color="#8b5cf6">Business: {business.length}</Pill>
          <Pill color="#0891b2">System (Iter 45): {isSystem.length}</Pill>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <div>
          <strong style={{ fontSize: 10, color: '#475569' }}>BY CATEGORY</strong>
          <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
            <tbody>
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, n]) =>
                <tr key={cat} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}>{cat}</td>
                  <td style={{ padding: 3, textAlign: 'right' }}><code>{n}</code></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', color: '#475569' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 4 }}>SKILL</th>
                <th style={{ textAlign: 'left', padding: 4 }}>CATEGORY</th>
                <th style={{ textAlign: 'left', padding: 4 }}>RISK</th>
                <th style={{ textAlign: 'left', padding: 4 }}>MODE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(s => (
                <tr key={s.skill_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4 }}>
                    <code style={{ fontSize: 9 }}>{s.skill_id}</code>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{s.skill_name}</div>
                  </td>
                  <td style={{ padding: 4 }}><Pill color="#8b5cf6">{s.skill_category}</Pill></td>
                  <td style={{ padding: 4 }}>
                    <Pill color={RISK_COLOR[s.risk_level] || '#94a3b8'}>{s.risk_level}</Pill>
                  </td>
                  <td style={{ padding: 4, fontSize: 9 }}>{s.execution_mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tools view

function ToolsView() {
  const [tools, setTools] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/v1/agentic/tools?limit=500`).then(r => r.json()).then(d => setTools(d.tools || []));
  }, []);
  const byType = useMemo(() => {
    const m = {};
    tools.forEach(t => { m[t.tool_type] = (m[t.tool_type] || 0) + 1; });
    return m;
  }, [tools]);
  return (
    <Section title={`Tools · ${tools.length}`} accent="#0891b2">
      <div style={{ marginBottom: 8 }}>
        {Object.entries(byType).map(([t, n]) =>
          <Pill key={t} color="#0891b2">{t}: {n}</Pill>
        )}
      </div>
      <table style={{ fontSize: 10, width: '100%' }}>
        <thead style={{ background: '#f1f5f9', color: '#475569' }}>
          <tr>
            <th style={{ textAlign: 'left', padding: 4 }}>TOOL</th>
            <th style={{ textAlign: 'left', padding: 4 }}>TYPE</th>
            <th style={{ textAlign: 'left', padding: 4 }}>SYSTEM</th>
            <th style={{ textAlign: 'left', padding: 4 }}>STATUS</th>
            <th style={{ textAlign: 'left', padding: 4 }}>RISK</th>
          </tr>
        </thead>
        <tbody>
          {tools.map(t => (
            <tr key={t.tool_id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: 4 }}>
                <code style={{ fontSize: 9 }}>{t.tool_id}</code>
                <div style={{ fontSize: 9, color: '#64748b' }}>{t.tool_name}</div>
              </td>
              <td style={{ padding: 4 }}><Pill color="#0891b2">{t.tool_type}</Pill></td>
              <td style={{ padding: 4, fontSize: 9 }}>{t.system_name}</td>
              <td style={{ padding: 4 }}>
                <Pill color={t.status === 'Available' ? '#10b981' : '#94a3b8'}>{t.status}</Pill>
              </td>
              <td style={{ padding: 4 }}>
                <Pill color={RISK_COLOR[t.risk_level] || '#94a3b8'}>{t.risk_level}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Unified Registry · 3-column · agents · skills · tools

function RegistryView() {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/agentic/health`).then(r => r.json()),
      fetch(`${API}/api/v1/agentic-ops/health`).then(r => r.json()),
      fetch(`${API}/api/v1/governance/health`).then(r => r.json()),
      fetch(`${API}/api/v1/ril/health`).then(r => r.json()),
      fetch(`${API}/api/v1/agentic-adapter/coverage`).then(r => r.json()),
    ]).then(([core, ops, gov, ril, cov]) => {
      setCounts({ core, ops, gov, ril, cov });
    });
  }, []);

  return (
    <Section title="Unified Registry · the 30-table catalog" accent="#3b82f6">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <div style={{ padding: 10, background: '#eff6ff', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#1d4ed8' }}>AGENTIC CORE (Iter 37)</strong>
          {counts.core?.counts && Object.entries(counts.core.counts).map(([t, n]) =>
            <div key={t} style={{ fontSize: 10, marginTop: 3 }}>{t}: <code>{n}</code></div>
          )}
        </div>
        <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#15803d' }}>AGENTIC OPS (Iter 38)</strong>
          {counts.ops?.counts && Object.entries(counts.ops.counts).map(([t, n]) =>
            <div key={t} style={{ fontSize: 10, marginTop: 3 }}>{t}: <code>{n}</code></div>
          )}
        </div>
        <div style={{ padding: 10, background: '#faf5ff', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#7e22ce' }}>GOVERNANCE (Iter 39)</strong>
          {counts.gov?.counts && Object.entries(counts.gov.counts).map(([t, n]) =>
            <div key={t} style={{ fontSize: 10, marginTop: 3 }}>{t}: <code>{n}</code></div>
          )}
        </div>
        <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#a16207' }}>RISK/INCIDENT/LEARN (Iter 40)</strong>
          {counts.ril?.counts && Object.entries(counts.ril.counts).map(([t, n]) =>
            <div key={t} style={{ fontSize: 10, marginTop: 3 }}>{t}: <code>{n}</code></div>
          )}
        </div>
      </div>
      {counts.cov && (
        <div style={{ marginTop: 12, padding: 10, background: '#ecfeff', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#0e7490' }}>COVERAGE (Iter 45)</strong>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            <Pill color="#0e7490">Business agents: {counts.cov.agents?.business_agents}</Pill>
            <Pill color="#0891b2">System agents: {counts.cov.agents?.system_agents}</Pill>
            <Pill color="#10b981">Total skills: {counts.cov.skills?.total_active}</Pill>
            <Pill color={counts.cov.coverage_pct >= 95 ? '#10b981' : '#f59e0b'}>
              Coverage: {counts.cov.coverage_pct}%
            </Pill>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Cross-Search

function SearchView() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!q) return;
    setBusy(true);
    try {
      const [agentsR, skillsR, kbR, lessonsR] = await Promise.all([
        fetch(`${API}/api/v1/agentic/agents`).then(r => r.json()),
        fetch(`${API}/api/v1/agentic/skills?limit=500`).then(r => r.json()),
        fetch(`${API}/api/v1/ril/knowledge/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
        fetch(`${API}/api/v1/ril/lessons/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
      ]);
      const ql = q.toLowerCase();
      setResults({
        agents:  (agentsR.agents || []).filter(a =>
          (a.agent_id || '').toLowerCase().includes(ql) ||
          (a.agent_name || '').toLowerCase().includes(ql) ||
          (a.purpose || '').toLowerCase().includes(ql)
        ).slice(0, 30),
        skills:  (skillsR.skills || []).filter(s =>
          (s.skill_id || '').toLowerCase().includes(ql) ||
          (s.skill_name || '').toLowerCase().includes(ql)
        ).slice(0, 30),
        knowledge: kbR.knowledge || [],
        lessons: lessonsR.lessons || [],
      });
    } finally { setBusy(false); }
  }, [q]);

  return (
    <Section title="Cross-Search · agents · skills · knowledge · lessons" accent="#0891b2">
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="search across registry · type and press Enter"
          style={{ padding: '6px 10px', fontSize: 12, width: 320, border: '1px solid #cbd5e1', borderRadius: 3 }} />
        <button onClick={run} disabled={busy || !q}
          style={{ padding: '6px 14px', fontSize: 11, cursor: 'pointer',
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3 }}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          ['Agents',    'agents',    '#3b82f6', 'agent_id'],
          ['Skills',    'skills',    '#8b5cf6', 'skill_id'],
          ['Knowledge', 'knowledge', '#0891b2', 'knowledge_title'],
          ['Lessons',   'lessons',   '#f59e0b', 'lesson_title'],
        ].map(([label, k, color, idField]) => (
          <div key={k} style={{ padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
            <strong style={{ fontSize: 10, color }}>{label.toUpperCase()} ({results[k]?.length || 0})</strong>
            <div style={{ maxHeight: 400, overflowY: 'auto', marginTop: 4 }}>
              {(results[k] || []).map((r, i) => (
                <div key={i} style={{ fontSize: 10, padding: 4, borderBottom: '1px solid #f1f5f9' }}>
                  <code>{r[idField] || r.id}</code>
                  {r._score && <span style={{ color: '#94a3b8' }}> · {r._score.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Intervention (HITL) view

function InterventionView() {
  const [pending, setPending] = useState([]);
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/v1/agentic/invocations?status=PendingApproval&limit=50`)
      .then(r => r.json()).then(d => setPending(d.invocations || []));
    fetch(`${API}/api/v1/approvals`).then(r => r.json())
      .then(d => setApprovals(d.approvals || []));
  }, []);

  return (
    <Section title="Intervention · HITL queue + open approvals" accent="#ef4444">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: 10, background: '#fee2e2', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#991b1b' }}>PENDING INVOCATIONS ({pending.length})</strong>
          {pending.length === 0 && <em style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4 }}>No pending HITL invocations.</em>}
          <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
            <tbody>
              {pending.map(inv => (
                <tr key={inv.invocation_id} style={{ borderTop: '1px solid #fecaca' }}>
                  <td style={{ padding: 3 }}>
                    <code style={{ fontSize: 9 }}>{inv.invocation_id?.slice(0, 20)}</code>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{inv.agent_id} · {inv.input_text?.slice(0, 60)}…</div>
                  </td>
                  <td style={{ padding: 3 }}>
                    <button style={{ fontSize: 9, padding: '2px 6px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>Approve</button>
                    <button style={{ fontSize: 9, padding: '2px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 2, marginLeft: 4, cursor: 'pointer' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 10, background: '#fff3c7', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#a16207' }}>OPEN APPROVALS ({approvals.length})</strong>
          {approvals.length === 0 && <em style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4 }}>No open approvals.</em>}
          <ul style={{ fontSize: 10, marginTop: 4 }}>
            {approvals.slice(0, 20).map(a => (
              <li key={a.id} style={{ marginBottom: 4 }}>
                <code>{a.id}</code> · {a.title} · <Pill color="#a16207">{a.state}</Pill>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Verification Gates dashboard

function VerificationView() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/agentic/invocations/stats`).then(r => r.json()).then(setStats);
  }, []);
  const gates = [
    ['Schema',     'Output matches declared schema',          '#3b82f6'],
    ['Citation',   'Every claim has retrieval evidence',      '#0891b2'],
    ['PII',        'No PII leaks in output',                  '#8b5cf6'],
    ['Bias',       'Fairness check across groups',            '#a16207'],
    ['Cost',       'Tokens × rate ≤ cost_limit',              '#f59e0b'],
    ['Safety',     'Toxicity + injection guardrails',         '#ef4444'],
    ['Confidence', 'Overall confidence ≥ threshold',          '#10b981'],
    ['Rollback',   'Action reversible OR has approval',       '#0e7490'],
    ['Audit row',  'agent_invocation row written',            '#64748b'],
  ];
  return (
    <Section title="Verification · 9 gates run before every response leaves the agent" accent="#10b981">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {gates.map(([gate, desc, color]) => (
          <div key={gate} style={{ padding: 8, background: `${color}15`, borderRadius: 4, border: `1px solid ${color}40` }}>
            <strong style={{ fontSize: 11, color }}>{gate}</strong>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{desc}</div>
          </div>
        ))}
      </div>
      {stats && (
        <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 4 }}>
          <strong style={{ fontSize: 10, color: '#15803d' }}>INVOCATIONS BY STATUS</strong>
          <div style={{ marginTop: 4 }}>
            {Object.entries(stats.by_status || {}).map(([k, v]) =>
              <Pill key={k} color={k === 'Success' ? '#10b981' : k === 'Failed' ? '#ef4444' : '#94a3b8'}>{k}: {v}</Pill>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Coverage view (Iter 45)

function CoverageView() {
  const [cov, setCov] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/agentic-adapter/coverage`).then(r => r.json()).then(setCov);
  }, []);
  if (!cov) return <em>Loading…</em>;
  return (
    <Section title={`Coverage · ${cov.coverage_pct}% of routers agentic-addressable (Iter 45)`} accent="#10b981">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div>
          <strong style={{ fontSize: 10, color: '#475569' }}>COUNTS</strong>
          <ul style={{ fontSize: 11, marginTop: 4 }}>
            <li>Business agents (Iter 37): <code>{cov.agents?.business_agents}</code></li>
            <li>System agents (Iter 45 auto-registered): <code>{cov.agents?.system_agents}</code></li>
            <li>Total active agents: <code>{cov.agents?.total_active}</code></li>
            <li>Non-agentic routers detected: <code>{cov.non_agentic_routers_detected}</code></li>
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: 10, color: '#475569' }}>BY CATEGORY (system agents)</strong>
          <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
            <tbody>
              {(cov.system_agents_by_category || []).map(c => (
                <tr key={c.category} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 3 }}>{c.category}</td>
                  <td style={{ padding: 3, textAlign: 'right' }}><code>{c.n}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Status (live per-agent · what's running · pending · done)

function StatusView() {
  const [data, setData] = useState(null);
  const [auto, setAuto] = useState(true);

  const load = useCallback(async () => {
    const [agents, invStats, qStats, opsHealth] = await Promise.all([
      fetch(`${API}/api/v1/agentic/agents`).then(r => r.json()),
      fetch(`${API}/api/v1/agentic/invocations/stats`).then(r => r.json()),
      fetch(`${API}/api/v1/agentic-ops/queue/stats`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/v1/agentic-ops/health`).then(r => r.json()),
    ]);
    setData({ agents, invStats, qStats, opsHealth });
  }, []);

  useEffect(() => {
    load();
    if (auto) {
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }
  }, [load, auto]);

  if (!data) return <em>Loading…</em>;

  const activeAgents = (data.agents?.agents || []).filter(a => a.status === 'Active').length;
  const topAgents = (data.invStats?.top_agents || []).slice(0, 10);

  return (
    <Section title={`Status · live (refresh ${auto ? 'on · every 5s' : 'off'})`} accent="#10b981">
      <button onClick={() => setAuto(!auto)}
        style={{ marginBottom: 8, padding: '4px 10px', fontSize: 10, cursor: 'pointer',
          background: auto ? '#10b981' : '#94a3b8', color: '#fff',
          border: 'none', borderRadius: 3 }}>
        Auto-refresh: {auto ? 'ON' : 'OFF'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: 10, background: '#dcfce7', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#15803d' }}>ACTIVE AGENTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{activeAgents}</div>
        </div>
        <div style={{ padding: 10, background: '#dbeafe', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#1d4ed8' }}>SUCCESSFUL RUNS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>
            {data.invStats?.by_status?.Success || 0}
          </div>
        </div>
        <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#a16207' }}>PENDING / RUNNING</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#a16207' }}>
            {(data.invStats?.by_status?.Running || 0) + (data.invStats?.by_status?.PendingApproval || 0)}
          </div>
        </div>
        <div style={{ padding: 10, background: '#fee2e2', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#991b1b' }}>FAILED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#991b1b' }}>
            {(data.invStats?.by_status?.Failed || 0) + (data.invStats?.by_status?.PartialFailure || 0)}
          </div>
        </div>
      </div>

      <div style={{ padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <strong style={{ fontSize: 10, color: '#475569' }}>TOP-10 ACTIVE AGENTS · by recent invocations</strong>
        <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
          <thead style={{ color: '#64748b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 3 }}>Agent</th>
              <th style={{ textAlign: 'right', padding: 3 }}>Runs</th>
              <th style={{ textAlign: 'right', padding: 3 }}>Avg ms</th>
              <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {topAgents.length === 0 && (
              <tr><td colSpan="4" style={{ padding: 6, color: '#94a3b8', fontStyle: 'italic' }}>
                No invocations yet · POST /api/v1/agentic/invoke to populate
              </td></tr>
            )}
            {topAgents.map(a => (
              <tr key={a.agent_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 3 }}><code>{a.agent_id}</code></td>
                <td style={{ padding: 3, textAlign: 'right' }}><code>{a.n}</code></td>
                <td style={{ padding: 3, textAlign: 'right' }}><code>{Math.round(a.avg_ms || 0)}</code></td>
                <td style={{ padding: 3 }}><Pill color="#10b981">running</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Issues + Solutions (the brutal-list view)

function IssuesView() {
  const issues = [
    { cat: 'Agent',  issue: 'Wrong agent selected for task',           solution: 'Routing rules + intent classifier · §40 decision gate',     monitoring: '/api/v1/agentic/invocations/stats · status=Failed' },
    { cat: 'Agent',  issue: 'Infinite loop (max_steps exceeded)',      solution: 'max_steps capped at 10 in agent_registry · §47.8',         monitoring: '/api/v1/agentic/invocations · duration_ms > 30000' },
    { cat: 'Agent',  issue: 'Approval bypass on high-risk action',     solution: 'autonomy_level + risk_level CHECK constraints (Iter 42)',  monitoring: 'agent_invocation.status=PendingApproval count' },
    { cat: 'Agent',  issue: 'No HITL escalation when confidence low',  solution: 'requires_human_approval flag + Iter 41 runtime gate',      monitoring: '/api/v1/agentic-ops/feedback?action_required=true' },
    { cat: 'MCP',    issue: 'MCP server auth failure',                 solution: 'OAuth refresh hook + read-only fallback · §76',            monitoring: '/api/v1/agentic-ops/dependencies · status=Failed' },
    { cat: 'MCP',    issue: 'Shared credentials abuse',                solution: 'agent_mcp_mapping per-agent secret · Iter 42+',            monitoring: '/api/v1/outbound-audit?status_lt=400' },
    { cat: 'MCP',    issue: 'MCP rate limit hit',                      solution: 'agent_capacity.target_throughput_rps + back-pressure',     monitoring: '/api/v1/agentic-ops/capacities · current_utilization > 80' },
    { cat: 'MCP',    issue: 'Tool execution timeout',                  solution: 'tool_registry.timeout_seconds + retry_count · §47.7',      monitoring: 'agent_trace_event · status=error · event_name~tool.*' },
    { cat: 'RAG',    issue: 'Stale RAG corpus (no re-index)',          solution: 'knowledge_base review_date + weekly cron',                 monitoring: 'knowledge_base.review_date · MAX older than 30d' },
    { cat: 'RAG',    issue: 'Hallucination · uncited answer',          solution: 'Citation gate · Verification tab item 2 · §48',            monitoring: 'agent_invocation · faithfulness < 0.85 (when wired)' },
    { cat: 'RAG',    issue: 'Vector search returns 0 results',         solution: 'Iter 43 TF-IDF · falls back to ILIKE · scaffold flag',     monitoring: '/api/v1/ril/knowledge/search · count=0 events' },
    { cat: 'RAG',    issue: 'Wrong corpus for query',                  solution: 'agent_skill_mapping.priority + RAG corpus tagging',        monitoring: 'agent_feedback · category=relevance' },
    { cat: 'Cost',   issue: 'Token cost explosion',                    solution: 'agent_registry.cost_limit + Iter 41 LLM client',          monitoring: 'agent_invocation.cost_usd SUM per agent' },
    { cat: 'Drift',  issue: 'Model accuracy drop over time',           solution: 'agent_sla.accuracy_target + weekly eval cron',             monitoring: 'agent_feedback.rating · 7-day moving avg' },
    { cat: 'Audit',  issue: 'Missing audit row for invocation',        solution: 'FK + NOT NULL on invocation_id (Iter 42) · enforced at DB',monitoring: 'COUNT(agent_invocation) vs COUNT(agent_trace_event)' },
  ];
  return (
    <Section title={`Issues + Solutions · agent · MCP · RAG (${issues.length} cataloged)`} accent="#ef4444">
      <table style={{ fontSize: 10, width: '100%' }}>
        <thead style={{ background: '#fee2e2', color: '#991b1b' }}>
          <tr>
            <th style={{ textAlign: 'left', padding: 5 }}>CAT</th>
            <th style={{ textAlign: 'left', padding: 5 }}>ISSUE</th>
            <th style={{ textAlign: 'left', padding: 5 }}>SOLUTION (mitigation)</th>
            <th style={{ textAlign: 'left', padding: 5 }}>MONITORING (live query)</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid #fecaca' }}>
              <td style={{ padding: 5 }}><Pill color={
                row.cat === 'Agent' ? '#3b82f6' :
                row.cat === 'MCP'   ? '#8b5cf6' :
                row.cat === 'RAG'   ? '#0891b2' :
                row.cat === 'Cost'  ? '#f59e0b' :
                row.cat === 'Drift' ? '#a16207' : '#94a3b8'
              }>{row.cat}</Pill></td>
              <td style={{ padding: 5 }}>{row.issue}</td>
              <td style={{ padding: 5, color: '#15803d' }}>{row.solution}</td>
              <td style={{ padding: 5, fontFamily: 'monospace', fontSize: 9, color: '#475569' }}>{row.monitoring}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Testing & Pipelines (Iter 47)

function TestingView() {
  const [stats, setStats] = useState(null);
  const [pipelines, setPipelines] = useState(null);
  const [resp, setResp] = useState([]);
  const [agents, setAgents] = useState([]);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/test-catalog/stats`).then(r => r.json()),
      fetch(`${API}/api/v1/test-catalog/pipelines`).then(r => r.json()),
      fetch(`${API}/api/v1/test-catalog/responsibility-table`).then(r => r.json()),
      fetch(`${API}/api/v1/test-catalog/test-agents`).then(r => r.json()),
      fetch(`${API}/api/v1/test-catalog/top-1pct-plan`).then(r => r.json()),
    ]).then(([s, p, r, a, pl]) => {
      setStats(s); setPipelines(p); setResp(r.rows || []);
      setAgents(a.agents || []); setPlan(pl);
    });
  }, []);

  if (!stats) return <em>Loading…</em>;

  return (
    <>
      <Section title="Testing summary" accent="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div style={{ padding: 10, background: '#dbeafe', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#1d4ed8' }}>TEST AGENTS</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>{stats.n_test_agents}</div>
          </div>
          <div style={{ padding: 10, background: '#faf5ff', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#7e22ce' }}>TEST SKILLS</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7e22ce' }}>{stats.n_test_skills}</div>
          </div>
          <div style={{ padding: 10, background: '#ecfeff', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#0e7490' }}>PIPELINE CATEGORIES</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0e7490' }}>{stats.n_pipeline_categories}</div>
          </div>
          <div style={{ padding: 10, background: '#dcfce7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#15803d' }}>PIPELINES TOTAL</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{stats.n_pipelines_total}</div>
          </div>
        </div>
      </Section>

      <Section title={`Top-1% testing plan · cron daily 04:00 UTC · Ollama-driven`} accent="#10b981">
        {plan && (
          <>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              <strong>Runner:</strong> <code>{plan.runner}</code> ·
              <strong> LLM:</strong> {plan.llm} ·
              <strong> Schedule:</strong> {plan.schedule}
            </div>
            <table style={{ fontSize: 10, width: '100%' }}>
              <thead style={{ background: '#dcfce7', color: '#15803d' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: 4 }}>PHASE</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>AGENTS</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>TOOLS</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>TRIGGER</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>PASS GATE</th>
                </tr>
              </thead>
              <tbody>
                {(plan.phases || []).map(ph => (
                  <tr key={ph.phase} style={{ borderTop: '1px solid #bbf7d0' }}>
                    <td style={{ padding: 4 }}><strong>{ph.phase}. {ph.name}</strong></td>
                    <td style={{ padding: 4, fontSize: 9 }}>{(ph.agents || []).map(a => <code key={a} style={{ display: 'block' }}>{a}</code>)}</td>
                    <td style={{ padding: 4, fontSize: 9 }}>{(ph.tools || []).join(' · ')}</td>
                    <td style={{ padding: 4, fontSize: 9 }}>{ph.trigger}</td>
                    <td style={{ padding: 4, fontSize: 9, color: '#15803d' }}>{ph.pass_gate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Section>

      <Section title={`Pipeline catalog · ${stats.n_pipelines_total} pipelines across ${stats.n_pipeline_categories} categories`} accent="#0891b2">
        {pipelines && Object.entries(pipelines.categories).map(([cat, info]) => (
          <div key={cat} style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
            <strong style={{ fontSize: 11, color: '#0e7490' }}>{cat.toUpperCase()} ({info.count})</strong>
            <ul style={{ fontSize: 10, marginTop: 4 }}>
              {info.entries.map((e, i) => <li key={i}><code style={{ fontSize: 9 }}>{e}</code></li>)}
            </ul>
          </div>
        ))}
      </Section>

      <Section title={`Responsibility table · ${resp.length} processes · who tests what`} accent="#8b5cf6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>PROCESS</th>
              <th style={{ textAlign: 'left', padding: 4 }}>OWNER AGENT</th>
              <th style={{ textAlign: 'left', padding: 4 }}>SUPPORTING SKILLS</th>
              <th style={{ textAlign: 'left', padding: 4 }}>DATA SOURCE</th>
              <th style={{ textAlign: 'left', padding: 4 }}>MODEL</th>
            </tr>
          </thead>
          <tbody>
            {resp.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}><strong>{row.process}</strong></td>
                <td style={{ padding: 4 }}><code style={{ fontSize: 9 }}>{row.owner_agent}</code></td>
                <td style={{ padding: 4, fontSize: 9 }}>{(row.supporting_skills || []).join(' · ')}</td>
                <td style={{ padding: 4, fontSize: 9 }}>{row.data_source}</td>
                <td style={{ padding: 4, fontSize: 9 }}>{row.model_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Live test agents in DB · ${agents.length}`} accent="#10b981">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#dcfce7', color: '#15803d' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>AGENT</th>
              <th style={{ textAlign: 'left', padding: 4 }}>DOMAIN</th>
              <th style={{ textAlign: 'left', padding: 4 }}>RUNTIME</th>
              <th style={{ textAlign: 'left', padding: 4 }}>RISK</th>
              <th style={{ textAlign: 'left', padding: 4 }}>SKILLS</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.agent_id} style={{ borderTop: '1px solid #bbf7d0' }}>
                <td style={{ padding: 4 }}>
                  <code style={{ fontSize: 9 }}>{a.agent_id}</code>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{a.agent_name}</div>
                </td>
                <td style={{ padding: 4, fontSize: 9 }}>{a.business_domain}</td>
                <td style={{ padding: 4, fontSize: 9 }}>{a.runtime_framework}</td>
                <td style={{ padding: 4 }}>
                  <Pill color={RISK_COLOR[a.risk_level] || '#94a3b8'}>{a.risk_level}</Pill>
                </td>
                <td style={{ padding: 4, textAlign: 'center' }}><Pill color="#10b981">{a.n_skills}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Quality Scorecard (Iter 48) · 11 dimensions · benchmarks · top-1% report

function QualityScorecardView() {
  const [data, setData] = useState(null);
  const [dims, setDims] = useState([]);

  const load = useCallback(async () => {
    const [report, dimensions] = await Promise.all([
      fetch(`${API}/api/v1/test-catalog/top-1pct-report`).then(r => r.json()),
      fetch(`${API}/api/v1/test-catalog/quality-dimensions`).then(r => r.json()),
    ]);
    setData(report);
    setDims(dimensions.dimensions || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <em>Loading…</em>;

  const summary = data.summary || {};
  const gradeColor = summary.overall_grade === 'A' ? '#10b981' :
                     summary.overall_grade === 'B' ? '#3b82f6' :
                     summary.overall_grade === 'C' ? '#f59e0b' : '#ef4444';

  return (
    <>
      <Section title="Top-1% Scorecard" accent={gradeColor}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div style={{ padding: 12, background: `${gradeColor}15`, borderRadius: 4, border: `1px solid ${gradeColor}40` }}>
            <div style={{ fontSize: 9, color: gradeColor }}>OVERALL GRADE</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: gradeColor }}>{summary.overall_grade}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>avg {(summary.average_score * 100).toFixed(0)}%</div>
          </div>
          <div style={{ padding: 12, background: '#dbeafe', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#1d4ed8' }}>DIMENSIONS</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#1d4ed8' }}>{summary.n_dimensions}</div>
          </div>
          <div style={{ padding: 12, background: '#dcfce7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#15803d' }}>PASSING (≥80%)</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#15803d' }}>{summary.n_passing_80pct}</div>
          </div>
          <div style={{ padding: 12, background: summary.is_top_1_pct ? '#dcfce7' : '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: summary.is_top_1_pct ? '#15803d' : '#a16207' }}>TOP-1% (≥95%)</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: summary.is_top_1_pct ? '#15803d' : '#a16207' }}>
              {summary.is_top_1_pct ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          As of: {data.as_of}
        </div>
      </Section>

      <Section title="11 Quality Dimensions · live scores" accent="#3b82f6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f1f5f9', color: '#475569' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 5 }}>DIMENSION</th>
              <th style={{ textAlign: 'left', padding: 5 }}>SCORE</th>
              <th style={{ textAlign: 'left', padding: 5 }}>OWNER AGENT</th>
              <th style={{ textAlign: 'left', padding: 5 }}>PIPELINE</th>
              <th style={{ textAlign: 'left', padding: 5 }}>PASS GATE</th>
            </tr>
          </thead>
          <tbody>
            {(data.scorecard || []).map(s => {
              const pct = Math.round(s.score * 100);
              const color = s.score >= 0.9 ? '#10b981' : s.score >= 0.8 ? '#3b82f6' :
                            s.score >= 0.5 ? '#f59e0b' : '#ef4444';
              return (
                <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 5 }}>
                    <strong>{s.label}</strong>
                    {s.scaffold && <Pill color="#94a3b8">SCAFFOLD</Pill>}
                  </td>
                  <td style={{ padding: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 80, height: 8, background: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ width: `${pct}%`, height: 8, background: color, borderRadius: 2 }} />
                      </div>
                      <code style={{ fontSize: 10, color }}>{pct}%</code>
                    </div>
                  </td>
                  <td style={{ padding: 5, fontSize: 9 }}><code>{s.owner_agent}</code></td>
                  <td style={{ padding: 5, fontSize: 9 }}>{s.pipeline}</td>
                  <td style={{ padding: 5, fontSize: 9, color: '#15803d' }}>{s.pass_gate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="Benchmarks per dimension" accent="#8b5cf6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 5 }}>DIMENSION</th>
              <th style={{ textAlign: 'left', padding: 5 }}>BENCHMARK TARGETS</th>
              <th style={{ textAlign: 'left', padding: 5 }}>SCORE FORMULA</th>
              <th style={{ textAlign: 'left', padding: 5 }}>MONITORING</th>
            </tr>
          </thead>
          <tbody>
            {dims.map(d => (
              <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 5 }}><strong>{d.label}</strong></td>
                <td style={{ padding: 5, fontSize: 9 }}>
                  {Object.entries(d.benchmark || {}).map(([k, v]) =>
                    <div key={k}><code>{k}: {v}</code></div>
                  )}
                </td>
                <td style={{ padding: 5, fontSize: 9, fontStyle: 'italic' }}>{d.score_formula}</td>
                <td style={{ padding: 5, fontSize: 9, fontFamily: 'monospace', color: '#64748b' }}>{d.monitoring_query}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LIVE TASK TRACER · 7-stage agentic flow visible per task
// PLAN → REGISTER → SKILL → RESEARCH → ACTION → INTERVENTION → REVIEW

function TaskTracerView() {
  const [agentId, setAgentId] = useState('fraud_scorer');
  const [input, setInput] = useState('Score this claim · large suspicious payout · multiple deductibles');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [trace, setTrace] = useState(null);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/v1/agentic/agents?limit=200`).then(r => r.json())
      .then(d => setAgents(d.agents || []));
  }, []);

  async function runTask() {
    setBusy(true); setResult(null); setTrace(null);
    try {
      const r = await fetch(`${API}/api/v1/agentic/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, input_text: input, trigger_kind: 'ui-tracer' }),
      });
      const d = await r.json();
      setResult(d);
      if (d.invocation_id) {
        const t = await fetch(`${API}/api/v1/agentic/invocations/${d.invocation_id}/trace`)
          .then(r => r.json());
        setTrace(t);
      }
    } catch (e) {
      setResult({ error: e.message });
    } finally { setBusy(false); }
  }

  const selected = agents.find(a => a.agent_id === agentId) || {};
  const stages = [
    { key: 'PLAN',         label: '1. PLAN',         done: !!result, info: result?.plan?.rationale, color: '#3b82f6' },
    { key: 'REGISTER',     label: '2. REGISTER',     done: !!selected.agent_id, info: `agent_registry: ${selected.agent_name || agentId} · owner: ${selected.owner_team || '—'}`, color: '#8b5cf6' },
    { key: 'SKILL',        label: '3. SKILL',        done: !!result, info: result?.skills_used?.join(' · ') || '—', color: '#0891b2' },
    { key: 'RESEARCH',     label: '4. RESEARCH',     done: !!result, info: 'RAG context + MCP query + audit history (per blueprint)', color: '#10b981' },
    { key: 'ACTION',       label: '5. ACTION',       done: !!result, info: `${result?.n_skills_executed || 0} step(s) executed · ${result?.duration_ms || 0}ms`, color: '#f59e0b' },
    { key: 'INTERVENTION', label: '6. INTERVENTION', done: !!result, info: result?.hitl_required ? '⚠ HITL · PendingApproval' : '✓ Auto-approved (autonomy=Automatic)', color: '#ef4444' },
    { key: 'REVIEW',       label: '7. REVIEW',       done: !!trace, info: trace ? `${trace.n_events} trace event(s) · status=${result?.status}` : '—', color: '#15803d' },
  ];

  return (
    <>
      <Section title="Submit a task · see all 7 agentic stages in real time" accent="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 120px', gap: 8, alignItems: 'center' }}>
          <select value={agentId} onChange={e => setAgentId(e.target.value)}
            style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            {agents.slice(0, 100).map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.agent_id} ({a.department_id})</option>
            ))}
          </select>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Task input · what should the agent do?"
            style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }} />
          <button onClick={runTask} disabled={busy}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: '#10b981', color: '#fff', border: 'none', borderRadius: 3 }}>
            {busy ? 'Running…' : '▶ Run task'}
          </button>
        </div>
      </Section>

      <Section title="7-stage agentic flow · LIVE per this task" accent="#10b981">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {stages.map((s, i) => (
            <div key={s.key} style={{
              padding: 10, background: s.done ? `${s.color}22` : '#f8fafc',
              border: `1px solid ${s.done ? s.color : '#e2e8f0'}`,
              borderRadius: 4, minHeight: 90,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
                {busy && i > 0 && !result ? '…' : (s.info || '—')}
              </div>
              {s.done && <div style={{ marginTop: 4, fontSize: 10 }}>✓</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
          Backed by: <code>POST /agentic/invoke</code> · <code>GET /agentic/invocations/{'{id}'}/trace</code> · Iter 41 + Iter 43 runtime
        </div>
      </Section>

      {result && (
        <Section title={`Result · invocation ${result.invocation_id?.slice(0, 30)}…`} accent="#3b82f6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ padding: 8, background: '#eff6ff', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>STATUS</div>
              <div style={{ fontWeight: 800 }}>{result.status}</div>
            </div>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>DURATION</div>
              <div style={{ fontWeight: 800 }}>{result.duration_ms}ms</div>
            </div>
            <div style={{ padding: 8, background: '#faf5ff', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>PROVIDER / MODEL</div>
              <div style={{ fontWeight: 800, fontSize: 11 }}>{result.plan_provider}/{result.plan_model}</div>
            </div>
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>COST · TOKENS</div>
              <div style={{ fontWeight: 800, fontSize: 11 }}>${result.cost_usd?.toFixed(4)} · {result.tokens_in}/{result.tokens_out}</div>
            </div>
          </div>
          {result.scaffold && (
            <div style={{ marginTop: 8, padding: 8, background: '#fef3c7', borderRadius: 4, fontSize: 10 }}>
              ⚠ scaffold · {result.scaffold_reason}
            </div>
          )}
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Raw plan + step results</summary>
            <pre style={{ fontSize: 9, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, marginTop: 4, overflowX: 'auto' }}>
              {JSON.stringify({ plan: result.plan, step_results: result.step_results }, null, 2)}
            </pre>
          </details>
        </Section>
      )}

      {trace && trace.events && (
        <Section title={`Trace events (${trace.n_events}) · OTel-style spans`} accent="#0891b2">
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ background: '#ecfeff', color: '#0e7490' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 4 }}>EVENT</th>
                <th style={{ textAlign: 'left', padding: 4 }}>STATUS</th>
                <th style={{ textAlign: 'left', padding: 4 }}>DURATION</th>
                <th style={{ textAlign: 'left', padding: 4 }}>ATTRIBUTES</th>
              </tr>
            </thead>
            <tbody>
              {trace.events.map(ev => (
                <tr key={ev.event_id} style={{ borderTop: '1px solid #cffafe' }}>
                  <td style={{ padding: 4 }}><code style={{ fontSize: 9 }}>{ev.event_name}</code></td>
                  <td style={{ padding: 4 }}>
                    <Pill color={ev.status === 'ok' ? '#10b981' : ev.status === 'stub' ? '#94a3b8' : '#ef4444'}>{ev.status}</Pill>
                  </td>
                  <td style={{ padding: 4 }}><code>{ev.duration_ms}ms</code></td>
                  <td style={{ padding: 4, fontSize: 9, color: '#64748b' }}>{JSON.stringify(ev.attributes || {}).slice(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="What's happening behind the scenes (the agentic stack)" accent="#8b5cf6">
        <ol style={{ fontSize: 11, lineHeight: 1.7 }}>
          <li><strong>PLAN</strong> · llm_client.plan() · OpenAI → Anthropic → Ollama → stub · returns rationale + step list (Iter 41)</li>
          <li><strong>REGISTER</strong> · agent_registry row enforced by CHECK constraints (Iter 42) · 33 rules block bad values</li>
          <li><strong>SKILL</strong> · agent_skill_mapping resolves allowed skills · FK to skill_registry (Iter 42)</li>
          <li><strong>RESEARCH</strong> · TF-IDF on knowledge_base (Iter 43) · MCP registry lookup · audit history of same correlation_id</li>
          <li><strong>ACTION</strong> · runtime._execute_step() · per-skill via register_tool() · scaffold fallback (Iter 41)</li>
          <li><strong>INTERVENTION</strong> · requires_human_approval OR autonomy_level=Approval Required · status=PendingApproval (Iter 41)</li>
          <li><strong>REVIEW</strong> · agent_invocation row + 1 plan span + N skill spans → trace_id (Iter 43)</li>
        </ol>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Verify any stage: <code>curl /api/v1/agentic/invocations/{'{id}'}/trace</code>
        </div>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// The hub

export default function AgenticHubPage() {
  const [activeTab, setActiveTab] = useState('all-agents');

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ padding: 12, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <strong style={{ fontSize: 14 }}>Agentic Platform Hub</strong>
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 10 }}>
          all 152 agents · 293 skills · 277 endpoints addressable
        </span>
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {HUB_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: activeTab === t.key ? '#3b82f6' : '#fff',
                color: activeTab === t.key ? '#fff' : '#475569',
                border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: 3,
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {activeTab === 'task-tracer'  && <TaskTracerView />}
        {activeTab === 'status'       && <StatusView />}
        {activeTab === 'all-agents'   && <AllAgentsNetworkPanel />}
        {activeTab === 'admin'        && <AgenticAdminPanel />}
        {activeTab === 'skills'       && <SkillsView />}
        {activeTab === 'tools'        && <ToolsView />}
        {activeTab === 'registry'     && <RegistryView />}
        {activeTab === 'search'       && <SearchView />}
        {activeTab === 'intervention' && <InterventionView />}
        {activeTab === 'verification' && <VerificationView />}
        {activeTab === 'issues'       && <IssuesView />}
        {activeTab === 'testing'      && <TestingView />}
        {activeTab === 'quality'      && <QualityScorecardView />}
        {activeTab === 'coverage'     && <CoverageView />}
      </div>
    </div>
  );
}
