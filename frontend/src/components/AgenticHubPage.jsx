// AgenticHubPage.jsx · Iter 46 · single consolidated hub for the agentic platform.
// Sub-tabs: All Agents · Skills · Tools · Registry · Search · Intervention ·
// Verification · plus link to per-agent admin (existing AgenticAdminPanel).

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SkeletonText, SkeletonCard, SkeletonTable } from './common/Skeleton';
import { useWebVitals } from '../hooks/useWebVitals';
import { useTabSync, publishTab } from '../hooks/useTabSync';
import ErrorBoundary, { installGlobalErrorHandlers } from './common/ErrorBoundary';
import { useClickTracking, useRefreshTracking } from '../hooks/useUserAnalytics';
import { useAuditBoot } from '../hooks/useFrontendAudit';
import { useSSE } from '../hooks/useSSE';
installGlobalErrorHandlers();
import AgenticAdminPanel from './AgenticAdminPanel';
import AllAgentsNetworkPanel from './AllAgentsNetworkPanel';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

const HUB_TABS = [
  { key: 'task-tracer',   label: '▶ Run Task (live trace)' },
  { key: 'production-pipeline', label: '🏭 22-Stage Production Pipeline (Iter 56)' },
  { key: 'challenges', label: '⚠️ Challenges & Plans (Iter 58)' },
  { key: 'status-agents', label: '📊 Status Agents (Iter 59)' },
  { key: 'checklist', label: '☑️ Production Checklist (Iter 60)' },
  { key: 'enterprise', label: '🏛 Enterprise Standard §101 (Iter 61)' },
  { key: 'frontend-gov', label: '🖥 Frontend Governance §102 (Iter 62)' },
  { key: 'live-activity', label: '🔴 Live Activity (per-agent stream)' },
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
  if (!cov) return <SkeletonCard count={2} />;
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

  if (!data) return <SkeletonCard count={2} />;

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

  if (!stats) return <SkeletonCard count={2} />;

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

  if (!data) return <SkeletonCard count={2} />;

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


function ProductionPipelineView() {
  const [input, setInput] = useState('How do I escalate a payment incident? Need runbook.');
  const [severity, setSeverity] = useState('critical');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  async function run() {
    setBusy(true); setResult(null);
    try {
      const r = await fetch(`${API}/api/v1/production-pipeline/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: input, severity }),
      });
      setResult(await r.json());
    } finally { setBusy(false); }
  }
  return (
    <>
      <Section title="22-Stage Production Pipeline · Ollama-only · agentic flow" accent="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="user input"
            style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }} />
          <select value={severity} onChange={e => setSeverity(e.target.value)}
            style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical (HITL)</option>
          </select>
          <button onClick={run} disabled={busy}
            style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer',
              background: '#10b981', color: '#fff', border: 'none', borderRadius: 3 }}>
            {busy ? 'Running…' : '▶ Run pipeline'}
          </button>
        </div>
      </Section>
      {result && (
        <Section title={`Run ${result.run_id} · ${result.overall_status} · confidence ${result.overall_confidence}`} accent="#10b981">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>DURATION</div>
              <div style={{ fontWeight: 800 }}>{result.total_duration_ms}ms</div>
            </div>
            <div style={{ padding: 8, background: '#dbeafe', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>TOKENS</div>
              <div style={{ fontWeight: 800 }}>{result.tokens_in}/{result.tokens_out}</div>
            </div>
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>COST</div>
              <div style={{ fontWeight: 800 }}>${result.cost_usd?.toFixed(4)}</div>
            </div>
            <div style={{ padding: 8, background: '#faf5ff', borderRadius: 4 }}>
              <div style={{ fontSize: 9 }}>OVERALL CONF</div>
              <div style={{ fontWeight: 800 }}>{(result.overall_confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
          <table style={{ fontSize: 10, width: '100%' }}>
            <thead style={{ background: '#f1f5f9', color: '#475569' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 4 }}>#</th>
                <th style={{ textAlign: 'left', padding: 4 }}>STAGE</th>
                <th style={{ textAlign: 'left', padding: 4 }}>STATUS</th>
                <th style={{ textAlign: 'right', padding: 4 }}>MS</th>
                <th style={{ textAlign: 'left', padding: 4 }}>CONF</th>
                <th style={{ textAlign: 'left', padding: 4 }}>SCAFFOLD</th>
              </tr>
            </thead>
            <tbody>
              {result.stages.map(s => {
                const c = s.status === 'ok' ? '#10b981' :
                          s.status === 'failed' ? '#ef4444' :
                          s.status === 'skipped' ? '#94a3b8' : '#f59e0b';
                return (
                  <tr key={s.stage_no} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 4 }}><code>{s.stage_no}</code></td>
                    <td style={{ padding: 4 }}>{s.name}</td>
                    <td style={{ padding: 4 }}><Pill color={c}>{s.status}</Pill></td>
                    <td style={{ padding: 4, textAlign: 'right' }}><code>{s.duration_ms}</code></td>
                    <td style={{ padding: 4 }}>{s.confidence != null ? `${Math.round(s.confidence * 100)}%` : '—'}</td>
                    <td style={{ padding: 4 }}>{s.scaffold && <Pill color="#94a3b8">scaffold</Pill>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {result.final_response && (
            <div style={{ marginTop: 10, padding: 10, background: '#eff6ff', borderRadius: 4 }}>
              <strong style={{ fontSize: 10 }}>FINAL RESPONSE</strong>
              <div style={{ fontSize: 11, marginTop: 4 }}>{result.final_response}</div>
            </div>
          )}
        </Section>
      )}
    </>
  );
}


function ChallengesView() {
  const [data, setData] = useState(null);
  const [cat, setCat] = useState('all');
  useEffect(() => {
    fetch(`${API}/api/v1/challenges-catalog/by-category`).then(r => r.json()).then(setData);
  }, []);
  if (!data) return <em>Loading…</em>;
  const categories = Object.keys(data.categories);
  const SEVERITY_COLOR = { Critical: '#991b1b', High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
  let rows = [];
  for (const c of categories) {
    if (cat !== 'all' && cat !== c) continue;
    for (const item of data.categories[c]) rows.push({ ...item, category: c });
  }
  return (
    <>
      <Section title={`Challenges catalog · 7 categories × 5 = ${data.n_total} rows`} accent="#ef4444">
        <div style={{ marginBottom: 8 }}>
          <select value={cat} onChange={e => setCat(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#fee2e2', color: '#991b1b' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 5 }}>CAT</th>
              <th style={{ textAlign: 'left', padding: 5 }}>ID</th>
              <th style={{ textAlign: 'left', padding: 5 }}>ISSUE</th>
              <th style={{ textAlign: 'left', padding: 5 }}>SEV</th>
              <th style={{ textAlign: 'left', padding: 5 }}>MITIGATION</th>
              <th style={{ textAlign: 'left', padding: 5 }}>OWNER</th>
              <th style={{ textAlign: 'left', padding: 5 }}>CRON</th>
              <th style={{ textAlign: 'left', padding: 5 }}>TOOL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #fecaca' }}>
                <td style={{ padding: 5 }}><Pill color="#ef4444">{r.category}</Pill></td>
                <td style={{ padding: 5 }}><code>{r.id}</code></td>
                <td style={{ padding: 5 }}>{r.issue}</td>
                <td style={{ padding: 5 }}><Pill color={SEVERITY_COLOR[r.severity]}>{r.severity}</Pill></td>
                <td style={{ padding: 5, color: '#15803d', fontSize: 9 }}>{r.mitigation}</td>
                <td style={{ padding: 5, fontSize: 9 }}><code>{r.owner_agent}</code></td>
                <td style={{ padding: 5, fontSize: 9, color: '#64748b' }}>{r.cron}</td>
                <td style={{ padding: 5, fontSize: 9 }}>{r.tool}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Plans · per operator" accent="#3b82f6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 5 }}>PLAN</th>
              <th style={{ textAlign: 'left', padding: 5 }}>WHERE</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.plans).map(([k, v]) => (
              <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 5 }}><strong>{k.replace(/_/g, ' ')}</strong></td>
                <td style={{ padding: 5, fontSize: 9 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Tool catalog · ${data.tools.length} tools`} accent="#8b5cf6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {data.tools.map(t => (
            <div key={t.tool} style={{ padding: 8, background: '#faf5ff', borderRadius: 4 }}>
              <strong style={{ fontSize: 11, color: '#7e22ce' }}>{t.tool}</strong>
              <div style={{ fontSize: 9, color: '#64748b' }}>{t.category}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>{t.purpose}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}


function StatusAgentsView() {
  const [data, setData] = useState(null);
  const [auto, setAuto] = useState(true);
  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/v1/status-agents/all`).then(r => r.json());
    setData(r);
  }, []);
  useEffect(() => {
    load();
    if (auto) {
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }
  }, [load, auto]);
  if (!data) return <em>Loading…</em>;
  return (
    <Section title={`7 Status Aggregator Agents · live · ${auto ? 'refresh 5s' : 'manual'}`} accent="#3b82f6">
      <button onClick={() => setAuto(!auto)}
        style={{ marginBottom: 8, padding: '4px 10px', fontSize: 10, cursor: 'pointer',
          background: auto ? '#10b981' : '#94a3b8', color: '#fff',
          border: 'none', borderRadius: 3 }}>
        Auto-refresh 5s: {auto ? 'ON' : 'OFF'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {data.status_agents.map(sa => (
          <div key={sa.agent_id} style={{
            padding: 12, background: `${sa.color}15`,
            border: `2px solid ${sa.color}`, borderRadius: 4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: sa.color }}>{sa.label}</strong>
              <code style={{ fontSize: 9, color: '#64748b' }}>{sa.agent_id}</code>
            </div>
            <div style={{ fontSize: 11, marginTop: 6, color: '#1e293b' }}>{sa.summary}</div>
            {sa.metrics && Object.keys(sa.metrics).length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', fontSize: 9 }}>metrics</summary>
                <pre style={{ fontSize: 9, marginTop: 4, color: '#475569' }}>
                  {JSON.stringify(sa.metrics, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: '#64748b' }}>
        As of: {data.as_of} · also available via <code>./scripts/insur status-snapshot</code>
      </div>
    </Section>
  );
}


function ChecklistView() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    fetch(`${API}/api/v1/production-checklist/full`).then(r => r.json()).then(setData);
  }, []);
  if (!data) return <em>Loading…</em>;
  const s = data.summary;
  const grade = s.production_ready_pct >= 95 ? 'A' :
                s.production_ready_pct >= 80 ? 'B' :
                s.production_ready_pct >= 60 ? 'C' : 'D';
  const gradeColor = grade === 'A' ? '#10b981' :
                     grade === 'B' ? '#3b82f6' :
                     grade === 'C' ? '#f59e0b' : '#ef4444';
  return (
    <>
      <Section title="Multi-Agent Production Checklist (8 sections · 106 items)" accent={gradeColor}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={{ padding: 12, background: `${gradeColor}15`, borderRadius: 4, border: `1px solid ${gradeColor}40` }}>
            <div style={{ fontSize: 9 }}>PROD-READY GRADE</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: gradeColor }}>{grade}</div>
            <div style={{ fontSize: 10 }}>{s.production_ready_pct}%</div>
          </div>
          <div style={{ padding: 12, background: '#dcfce7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>✅ DONE</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#15803d' }}>{s.done}</div>
            <div style={{ fontSize: 10 }}>{s.done_pct}%</div>
          </div>
          <div style={{ padding: 12, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>⚠️ PARTIAL</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#a16207' }}>{s.partial}</div>
          </div>
          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>❌ MISSING</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#991b1b' }}>{s.missing}</div>
          </div>
          <div style={{ padding: 12, background: '#dbeafe', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>TOTAL</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1d4ed8' }}>{s.total_items}</div>
          </div>
        </div>
      </Section>

      <Section title="Per section · done % bar" accent="#3b82f6">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3, marginBottom: 8 }}>
          <option value="all">All sections</option>
          <option value="missing">Only ❌ missing</option>
          <option value="partial">Only ⚠️ partial</option>
        </select>
        {Object.entries(data.sections).map(([key, items]) => {
          const sCounts = data.summary.by_section[key];
          return (
            <details key={key} open style={{ marginTop: 8, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                {key.replace(/_/g, ' ').toUpperCase()} ·{' '}
                <code>{sCounts.done}/{sCounts.total} done ({sCounts.done_pct}%)</code>
                {sCounts.missing > 0 && <Pill color="#ef4444">{sCounts.missing} missing</Pill>}
                {sCounts.partial > 0 && <Pill color="#f59e0b">{sCounts.partial} partial</Pill>}
              </summary>
              <table style={{ fontSize: 10, width: '100%', marginTop: 6 }}>
                <thead style={{ background: '#f1f5f9', color: '#475569' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 4 }}>ITEM</th>
                    <th style={{ textAlign: 'center', padding: 4 }}>STATUS</th>
                    <th style={{ textAlign: 'left', padding: 4 }}>WHERE</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(it => filter === 'all' ||
                    (filter === 'missing' && it.status === '❌') ||
                    (filter === 'partial' && it.status === '⚠️')
                  ).map((it, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 4 }}>{it.item}</td>
                      <td style={{ padding: 4, textAlign: 'center', fontSize: 14 }}>{it.status}</td>
                      <td style={{ padding: 4, fontSize: 9, color: '#475569' }}>{it.where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
      </Section>
    </>
  );
}


function EnterpriseStandardView() {
  const [cov, setCov] = useState(null);
  const [gate, setGate] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/enterprise-standard/coverage`).then(r => r.json()).then(setCov);
    fetch(`${API}/api/v1/enterprise-standard/production-gate`).then(r => r.json()).then(setGate);
  }, []);
  if (!cov || !gate) return <em>Loading…</em>;
  const STATUS_COLOR = { "✅": '#10b981', "⚠️": '#f59e0b', "❌": '#ef4444', "⏳": '#94a3b8' };
  return (
    <>
      <Section title="🏛 §101 · The 15 Mandatory Policy Areas · LIVE" accent="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          <div style={{ padding: 10, background: '#dcfce7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>POLICY DONE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d' }}>{cov.policy_summary.done}/{cov.policy_summary.total}</div>
          </div>
          <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>PARTIAL</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#a16207' }}>{cov.policy_summary.partial}</div>
          </div>
          <div style={{ padding: 10, background: '#fee2e2', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>MISSING</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#991b1b' }}>{cov.policy_summary.missing}</div>
          </div>
          <div style={{ padding: 10, background: '#dbeafe', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>PROD-READY</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{cov.policy_summary.production_ready_pct}%</div>
          </div>
        </div>
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr><th style={{ textAlign:'left', padding:4 }}>#</th><th style={{ textAlign:'left', padding:4 }}>AREA</th>
                <th style={{ textAlign:'left', padding:4 }}>RULE</th><th style={{ textAlign:'center', padding:4 }}>STATUS</th>
                <th style={{ textAlign:'left', padding:4 }}>WHERE</th></tr>
          </thead>
          <tbody>
            {cov.policy_areas.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding:4 }}><code>{p.id}</code></td>
                <td style={{ padding:4 }}><strong>{p.area}</strong></td>
                <td style={{ padding:4, fontSize: 9 }}>{p.rule}</td>
                <td style={{ padding:4, textAlign:'center', fontSize: 14 }}>{p.status}</td>
                <td style={{ padding:4, fontSize: 9, color:'#475569' }}>{p.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`12-Check Production Gate · ${gate.pass_pct}% ready`} accent={gate.ready_for_prod ? '#10b981' : '#f59e0b'}>
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr><th style={{ textAlign:'left', padding:4 }}>CHECK</th>
                <th style={{ textAlign:'center', padding:4 }}>STATUS</th>
                <th style={{ textAlign:'left', padding:4 }}>DETAIL</th></tr>
          </thead>
          <tbody>
            {gate.checks.map((c, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding:4 }}><strong>{c.check}</strong></td>
                <td style={{ padding:4, textAlign:'center', fontSize: 14 }}>{c.status}</td>
                <td style={{ padding:4, fontSize: 9, color:'#475569' }}>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="12 Mandatory DB Tables · §101.E" accent="#8b5cf6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#faf5ff' }}>
            <tr><th style={{ textAlign:'left', padding:4 }}>TABLE</th>
                <th style={{ textAlign:'center', padding:4 }}>STATUS</th></tr>
          </thead>
          <tbody>
            {cov.mandatory_tables.map(t => (
              <tr key={t.table} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding:4 }}><code>{t.table}</code></td>
                <td style={{ padding:4, textAlign:'center', fontSize: 14 }}>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 6, fontSize: 10 }}>
          {cov.tables_summary.present}/{cov.tables_summary.total} present ({cov.tables_summary.done_pct}%)
        </div>
      </Section>
    </>
  );
}


function FrontendGovernanceView() {
  const [cov, setCov] = useState(null);
  const [leaks, setLeaks] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/frontend-governance/coverage`).then(r => r.json()).then(setCov);
    fetch(`${API}/api/v1/frontend-governance/forbidden-leaks`).then(r => r.json()).then(setLeaks);
  }, []);
  if (!cov || !leaks) return <em>Loading…</em>;
  const s = cov.summary;
  const grade = s.production_ready_pct >= 90 ? 'A' :
                s.production_ready_pct >= 75 ? 'B' :
                s.production_ready_pct >= 60 ? 'C' : 'D';
  const gradeColor = grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444';
  return (
    <>
      <Section title="🖥 §102 Frontend/UI Governance · LIVE" accent={gradeColor}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={{ padding: 10, background: `${gradeColor}15`, borderRadius: 4, border: `1px solid ${gradeColor}40` }}>
            <div style={{ fontSize: 9 }}>FRONTEND GRADE</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: gradeColor }}>{grade}</div>
            <div style={{ fontSize: 10 }}>{s.production_ready_pct}%</div>
          </div>
          <div style={{ padding: 10, background: '#dcfce7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>✅ DONE</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#15803d' }}>{s.done}</div>
          </div>
          <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>⚠️ PARTIAL</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#a16207' }}>{s.partial}</div>
          </div>
          <div style={{ padding: 10, background: '#fee2e2', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>❌ MISSING</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#991b1b' }}>{s.missing}</div>
          </div>
          <div style={{ padding: 10, background: '#dbeafe', borderRadius: 4 }}>
            <div style={{ fontSize: 9 }}>F12 LEAKS</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: leaks.score_pct >= 85 ? '#15803d' : '#a16207' }}>{leaks.score_pct}%</div>
          </div>
        </div>
      </Section>

      <Section title="F12 / DevTools Security Scan" accent="#ef4444">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#fee2e2' }}>
            <tr><th style={{ textAlign:'left', padding:4 }}>CHECK</th>
                <th style={{ textAlign:'center', padding:4 }}>STATUS</th>
                <th style={{ textAlign:'left', padding:4 }}>SAMPLE FILES</th></tr>
          </thead>
          <tbody>
            {leaks.results.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #fecaca' }}>
                <td style={{ padding:4 }}><strong>{r.check}</strong></td>
                <td style={{ padding:4, textAlign:'center' }}>{r.status}</td>
                <td style={{ padding:4, fontSize: 9, color: '#475569' }}>
                  {(r.files || []).slice(0, 3).map((f, j) => <div key={j}><code>{f}</code></div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="12 sections · per-row status" accent="#3b82f6">
        {Object.entries(cov.sections).map(([key, items]) => {
          const sc = cov.summary.by_section[key];
          return (
            <details key={key} open style={{ marginTop: 8, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                {key.replace(/_/g, ' ').toUpperCase()} ·{' '}
                <code>{sc.done}/{sc.total} ({sc.done_pct}%)</code>
                {sc.missing > 0 && <Pill color="#ef4444">{sc.missing} missing</Pill>}
                {sc.partial > 0 && <Pill color="#f59e0b">{sc.partial} partial</Pill>}
              </summary>
              <table style={{ fontSize: 10, width: '100%', marginTop: 4 }}>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding:3, fontSize: 14, width: 24 }}>{it.status}</td>
                      <td style={{ padding:3 }}>{it.item}</td>
                      <td style={{ padding:3, fontSize: 9, color: '#475569' }}>{it.where || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
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
// LIVE ACTIVITY · per-agent · what is each agent doing RIGHT NOW

function LiveActivityView() {
  const [data, setData] = useState({ invocations: [] });
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState('');
  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/v1/agentic/invocations?limit=200`).then(r => r.json());
    setData(r);
  }, []);
  useEffect(() => {
    load();
    if (auto) {
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }
  }, [load, auto]);

  let invs = data.invocations || [];
  if (filter) {
    const q = filter.toLowerCase();
    invs = invs.filter(i =>
      (i.agent_id || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q) ||
      (i.trigger_kind || '').toLowerCase().includes(q)
    );
  }

  // Group by agent_id
  const byAgent = {};
  for (const inv of invs) {
    const k = inv.agent_id || 'unknown';
    byAgent[k] = byAgent[k] || [];
    byAgent[k].push(inv);
  }
  const agents = Object.entries(byAgent)
    .sort((a, b) => b[1].length - a[1].length);

  return (
    <>
      <Section title={`Live per-agent activity · ${invs.length} invocations · ${agents.length} agents active`} accent="#ef4444">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="filter by agent_id / status / trigger"
            style={{ padding: '4px 8px', fontSize: 11, width: 280,
              border: '1px solid #cbd5e1', borderRadius: 3 }} />
          <button onClick={() => setAuto(!auto)}
            style={{ padding: '4px 10px', fontSize: 10, cursor: 'pointer',
              background: auto ? '#10b981' : '#94a3b8', color: '#fff',
              border: 'none', borderRadius: 3 }}>
            Auto-refresh 5s: {auto ? 'ON' : 'OFF'}
          </button>
          <button onClick={load}
            style={{ padding: '4px 10px', fontSize: 10, cursor: 'pointer',
              border: '1px solid #cbd5e1', borderRadius: 3, background: '#fff' }}>↻ Reload</button>
        </div>

        {invs.length === 0 && (
          <div style={{ padding: 20, background: '#fef3c7', borderRadius: 4, fontSize: 11 }}>
            <strong>No invocations yet.</strong>
            <br /><br />
            Either no agent has run yet, OR backend can't connect.
            Run the watchdog cycle to seed:
            <pre style={{ marginTop: 4 }}>python3 scripts/watchdog_agents_loop.py</pre>
            Or wait for cron · runs every 5 min (INSUR-WATCHDOG-AGENTS).
          </div>
        )}

        <div style={{ maxHeight: 700, overflowY: 'auto' }}>
          {agents.map(([agentId, rows]) => {
            const recent = rows.slice(0, 5);
            const lastStatus = recent[0]?.status;
            const color = lastStatus === 'Success' ? '#10b981' :
                          lastStatus === 'Failed' ? '#ef4444' :
                          lastStatus === 'PendingApproval' ? '#f59e0b' : '#94a3b8';
            return (
              <details key={agentId} open style={{ marginBottom: 6, padding: 8,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <code style={{ fontSize: 11, fontWeight: 700 }}>{agentId}</code>
                  <Pill color={color}>{rows.length} invocation{rows.length !== 1 ? 's' : ''}</Pill>
                  <span style={{ fontSize: 10, color: '#64748b' }}>last: {lastStatus}</span>
                </summary>
                <table style={{ fontSize: 10, width: '100%', marginTop: 6 }}>
                  <thead style={{ color: '#64748b' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 3 }}>Time</th>
                      <th style={{ textAlign: 'left', padding: 3 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: 3 }}>Trigger</th>
                      <th style={{ textAlign: 'left', padding: 3 }}>Input (truncated)</th>
                      <th style={{ textAlign: 'left', padding: 3 }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(inv => (
                      <tr key={inv.invocation_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 3, fontSize: 9 }}>{(inv.created_at || '').slice(11, 19)}</td>
                        <td style={{ padding: 3 }}><Pill color={
                          inv.status === 'Success' ? '#10b981' :
                          inv.status === 'PendingApproval' ? '#f59e0b' :
                          inv.status === 'Failed' ? '#ef4444' : '#94a3b8'
                        }>{inv.status}</Pill></td>
                        <td style={{ padding: 3, fontSize: 9 }}>{inv.trigger_kind}</td>
                        <td style={{ padding: 3, fontSize: 9 }}>{(inv.input_text || '').slice(0, 80)}…</td>
                        <td style={{ padding: 3, fontSize: 9 }}>{inv.duration_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="What each watchdog checks · Iter 52" accent="#3b82f6">
        <table style={{ fontSize: 10, width: '100%' }}>
          <thead style={{ background: '#f1f5f9', color: '#475569' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>WATCHDOG</th>
              <th style={{ textAlign: 'left', padding: 4 }}>CATEGORY</th>
              <th style={{ textAlign: 'left', padding: 4 }}>QUESTION ANSWERED</th>
              <th style={{ textAlign: 'left', padding: 4 }}>LIVE QUERY / CHECK</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['sys_watchdog_jobs',     'Jobs',       'Is anything stuck in agent_queue?', 'SELECT queue_status, COUNT(*) FROM agent_queue GROUP BY queue_status'],
              ['sys_watchdog_cron',     'Cron',       'Are scheduled jobs running on time?', 'ls jobs/reports/*/cron.log'],
              ['sys_watchdog_vector',   'Vector DB',  'Are knowledge embeddings up to date?', 'SELECT COUNT(*) FROM knowledge_base'],
              ['sys_watchdog_errors',   'Errors',     'Any errors in the last hour?', 'SELECT COUNT(*) FROM agent_invocation WHERE status IN ... AND created_at > NOW() - INTERVAL 1 hour'],
              ['sys_watchdog_db',       'Database',   'DB connections healthy? Disk OK?', 'SELECT pg_size_pretty(pg_database_size(current_database()))'],
              ['sys_watchdog_api',      'API',        'All routers reachable? p95 within SLA?', 'SELECT COUNT(*) FROM agent_invocation WHERE created_at > NOW() - 5min'],
              ['sys_watchdog_frontend', 'Frontend',   'UI building? Console errors?', 'check frontend/dist/ + vitest run'],
              ['sys_watchdog_logic',    'Code',       'Pending code-gen? Schema drift?', 'mtime of backend/contracts/MANIFEST.json'],
              ['sys_watchdog_status',   'Status',     'Rollup of all 8 above', 'aggregate jobs/reports/watchdog/*.json'],
            ].map(([id, cat, q, sql]) => (
              <tr key={id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}><code style={{ fontSize: 9 }}>{id}</code></td>
                <td style={{ padding: 4 }}><Pill color="#3b82f6">{cat}</Pill></td>
                <td style={{ padding: 4 }}>{q}</td>
                <td style={{ padding: 4, fontFamily: 'monospace', fontSize: 9, color: '#475569' }}>{sql}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
          Cron: every 5 min · <code>INSUR-WATCHDOG-AGENTS</code> · so this stream
          ALWAYS has fresh data even if no one POSTs /invoke.
        </div>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// The hub

export default function AgenticHubPage() {
  useWebVitals();  // §102.7 frontend monitoring
  useTabSync('hub-tab', (msg) => { /* placeholder · tab sync ready */ });
  useClickTracking();   // §102.7.4
  useRefreshTracking(); // §102.7.6
  useAuditBoot();       // §102.11
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
        <ErrorBoundary>
        {activeTab === 'task-tracer'  && <TaskTracerView />}
        {activeTab === 'production-pipeline' && <ProductionPipelineView />}
        {activeTab === 'challenges'         && <ChallengesView />}
        {activeTab === 'status-agents'     && <StatusAgentsView />}
        {activeTab === 'checklist'        && <ChecklistView />}
        {activeTab === 'enterprise'      && <EnterpriseStandardView />}
        {activeTab === 'frontend-gov'   && <FrontendGovernanceView />}
        {activeTab === 'live-activity' && <LiveActivityView />}
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
        </ErrorBoundary>
      </div>
    </div>
  );
}
