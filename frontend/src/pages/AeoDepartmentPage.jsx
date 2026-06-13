// §AEO Layer 10 · Autonomous Enterprise Orchestrator · operator 2026-06-12.
// Main menu = AEO Department · sub menu = 20 sections grouped in 5 mega-zones ·
// content = 10-12 tabs each (per §73 + §149.2 contract).
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';
import ResizableSplitter, { useResizableWidth } from '../components/ResizableSplitter';
import AeoSectionTab from '../components/AeoSectionTab';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const ZONES = [
  { id: 'goals',       label: 'Goals & Objectives',    icon: '🎯', color: '#3b82f6' },
  { id: 'decide',      label: 'Decisions & Actions',   icon: '⚖️', color: '#10b981' },
  { id: 'learn',       label: 'Learn & Optimize',      icon: '🧠', color: '#a855f7' },
  { id: 'govern',      label: 'Coordinate & Govern',   icon: '🛡', color: '#f59e0b' },
  { id: 'health',      label: 'Health & Audit',        icon: '📊', color: '#ec4899' },
];

// 20 sections per operator spec
const SECTIONS = [
  // Goals & Objectives
  { id: 's01',  zone: 'goals',  icon: '🎯',  label: 'Enterprise Goal Registry',         purpose: 'Define objectives',           endpoint: '/api/v1/aeo/goals' },
  { id: 's02',  zone: 'goals',  icon: '🌳',  label: 'Enterprise Objective Engine',      purpose: 'Goals → actions tree',        endpoint: '/api/v1/aeo/objectives' },
  // Decide & Actions
  { id: 's03',  zone: 'decide', icon: '📜',  label: 'Enterprise Policy Engine',         purpose: 'What AI can / cannot do',      endpoint: '/api/v1/aeo/policies' },
  { id: 's04',  zone: 'decide', icon: '🎼',  label: 'Decision Orchestrator',            purpose: 'Trigger → review → execute',   endpoint: '/api/v1/aeo/decisions' },
  { id: 's05',  zone: 'decide', icon: '✋',  label: 'Human Approval Engine',             purpose: 'L1 · L2 · L3 escalation',       endpoint: '/api/v1/aeo/decisions' },
  { id: 's06',  zone: 'decide', icon: '🤖',  label: 'Autonomous Action Engine',          purpose: 'Execute · pause · rollback',    endpoint: '/api/v1/aeo/actions' },
  { id: 's10',  zone: 'decide', icon: '🚧',  label: 'Enterprise Constraint Engine',     purpose: 'Prevent unsafe actions',        endpoint: '/api/v1/aeo/constraints' },
  // Learn & Optimize
  { id: 's07',  zone: 'learn',  icon: '📈',  label: 'Enterprise Learning Engine',        purpose: 'Decisions → outcomes',          endpoint: '/api/v1/aeo/actions' },
  { id: 's08',  zone: 'learn',  icon: '🔁',  label: 'Enterprise Feedback Loop',          purpose: 'Closed-loop optimization',      endpoint: '/api/v1/aeo/actions' },
  { id: 's09',  zone: 'learn',  icon: '⚙️',  label: 'Enterprise Optimization Engine',    purpose: 'Best future-state',            endpoint: '/api/v1/aeo/decisions' },
  { id: 's11',  zone: 'learn',  icon: '🎬',  label: 'Enterprise Scenario Engine',        purpose: 'Wildfire · recession · AI fail',endpoint: '/api/v1/aeo/scenarios' },
  // Govern
  { id: 's12',  zone: 'govern', icon: '🤝',  label: 'Coordination · Executive AI Council',purpose: 'CEO/COO/CFO/CRO/CISO/CHRO AI', endpoint: '/api/v1/aeo/decisions' },
  { id: 's13',  zone: 'govern', icon: '⚖️',  label: 'Governance Engine',                 purpose: 'Resp · Fair · Bias · Audit · Privacy',endpoint: '/api/v1/aeo/policies' },
  { id: 's14',  zone: 'govern', icon: '🛡',  label: 'Enterprise Trust Engine',           purpose: '4-source trust radar',          endpoint: '/api/v1/aeo/trust' },
  { id: 's15',  zone: 'govern', icon: '🧠',  label: 'Enterprise Memory Engine',          purpose: 'Long-term org memory',          endpoint: '/api/v1/aeo/decisions' },
  { id: 's16',  zone: 'govern', icon: '👥',  label: 'Autonomous Workforce Manager',      purpose: 'Humans + agents + bots',        endpoint: '/api/v1/agentic/agents' },
  // Health & Audit
  { id: 's17',  zone: 'health', icon: '❤️',  label: 'Enterprise Health Engine',          purpose: '7-dimension radar',             endpoint: '/api/v1/aeo/health' },
  { id: 's18',  zone: 'health', icon: '📜',  label: 'Enterprise Audit Engine',           purpose: 'Decision · approval · outcome', endpoint: '/api/v1/aeo/actions' },
  { id: 's19',  zone: 'health', icon: '📄',  label: 'Autonomous Enterprise Report',      purpose: 'Auto-generated board pack',     endpoint: '/api/v1/aeo/dashboard' },
  { id: 's20',  zone: 'health', icon: '🎛',  label: 'Enterprise Control Console',         purpose: 'Run sim · execute · rollback',  endpoint: '/api/v1/aeo/dashboard' },
];

const TABS = [
  { id: 'overview',     label: 'Overview',      icon: '🏠' },
  { id: 'objective',    label: 'Objective',     icon: '🎯' },
  { id: 'input',        label: 'Input',         icon: '📥' },
  { id: 'process',      label: 'Process',       icon: '⚙️' },
  { id: 'output',       label: 'Output',        icon: '📤' },
  { id: 'data',         label: 'Data',          icon: '🗄' },
  { id: 'visualization',label: 'Visualization', icon: '📊' },
  { id: 'audit',        label: 'Audit',         icon: '🔍' },
  { id: 'rai',          label: 'ResAI',         icon: '🛡' },
  { id: 'metrics',      label: 'Metrics',       icon: '📈' },
  { id: 'todos',        label: 'TO-DO',         icon: '✓' },
];

function SectionContent({ section, tab, dashboard }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    if (!section.endpoint) return;
    try {
      const r = await fetch(`${API}${section.endpoint}`,
                             { headers: { 'X-Demo-Role': 'manager' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const keys = ['goals', 'objectives', 'policies', 'decisions', 'actions',
                    'constraints', 'scenarios', 'trust', 'health', 'agents',
                    'items', 'data'];
      let arr = null;
      for (const k of keys) if (Array.isArray(j[k])) { arr = j[k]; break; }
      setRows(arr || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, [section.endpoint]);

  useEffect(() => { load(); }, [load]);

  if (tab === 'overview') {
    return (
      <>
        <PageObjective
          objective={`${section.label} · ${section.purpose}. Backed by ${rows.length} live rows from ${section.endpoint}.`}
          storageKey={`aeo:${section.id}`}
          todos={[
            { id: 'oo1', label: `Endpoint returns >= 1 row (currently ${rows.length})` },
            { id: 'oo2', label: 'RACI matrix per row (next iter)' },
            { id: 'oo3', label: 'SLA / SLO documented' },
            { id: 'oo4', label: 'Composes with downstream engines' },
          ]}
        />
        {err && <div className="glass-card card-4">⚠ {err}</div>}
        <div className="card-rotate" style={{ display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                gap: 8 }}>
          {rows.slice(0, 12).map((r, i) => (
            <div key={r.goal_id || r.objective_id || r.policy_id || r.decision_id
                       || r.action_id || r.constraint_id || r.scenario_id
                       || r.trust_id || r.health_id || r.agent_id || i}>
              <strong style={{ fontSize: 12 }}>
                {r.goal || r.objective || r.policy_name || r.summary ||
                 r.description || r.scenario_name || r.source || r.dimension ||
                 r.agent_id || r.agent_name || `Row ${i + 1}`}
              </strong>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                {r.owner || r.action_type || r.category || r.trust_score
                  || r.score || r.threshold || r.priority || r.status || ''}
              </div>
            </div>
          ))}
        </div>
        {rows.length === 0 && !err && (
          <div className="subtle" style={{ marginTop: 10 }}>
            No rows yet · §57.7 honest: endpoint returned empty array.
          </div>
        )}
      </>
    );
  }

  if (tab === 'data') {
    return (
      <div className="glass-card glass-strong" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
            <tr>
              {rows[0] && Object.keys(rows[0]).slice(0, 6).map(k => (
                <th key={k} style={{ textAlign: 'left', padding: 6,
                                     fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                {Object.entries(r).slice(0, 6).map(([k, v]) => (
                  <td key={k} style={{ padding: 6, verticalAlign: 'top' }}>
                    {typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v ?? '—').slice(0, 80)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === 'input') {
    return (
      <div className="glass-card card-input">
        <strong>📥 Input to {section.label}</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Operator query via UI sidebar click</li>
          <li>Upstream signals from Command Center / Digital Twin</li>
          <li>System events from agent_invocation</li>
          <li>Endpoint: <code>{section.endpoint}</code></li>
        </ul>
      </div>
    );
  }
  if (tab === 'process') {
    return (
      <div className="glass-card card-process">
        <strong>⚙️ Process · {section.label}</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Receive trigger from upstream engine</li>
          <li>Validate against Constraint Engine (§AEO-10)</li>
          <li>Apply Policy Engine rules (§AEO-3)</li>
          <li>Risk + Cost + ROI simulation via Digital Twin (L8)</li>
          <li>Decision Orchestrator routes for approval or auto-execute</li>
          <li>Audit row written · §38.3 + §107 timestamps</li>
        </ol>
      </div>
    );
  }
  if (tab === 'output') {
    return (
      <div className="glass-card card-output">
        <strong>📤 Outputs from {section.label}</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Persisted row in {section.endpoint?.split('/').pop()} table</li>
          <li>§38.3 audit row in enterprise_audit</li>
          <li>Trust + Health metrics updated</li>
          <li>Downstream subscribers notified (Command Center · Learning Engine)</li>
        </ul>
      </div>
    );
  }
  if (tab === 'visualization') {
    return (
      <div className="glass-card card-visualization">
        <strong>📊 Visualizations available</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Goal Hierarchy / Objective Tree (when applicable)</li>
          <li>Policy Dependency Graph (next iter)</li>
          <li>Decision Pipeline timeline</li>
          <li>Trust + Health Radar (consumed on Section 14/17)</li>
        </ul>
      </div>
    );
  }
  if (tab === 'audit') {
    return (
      <div className="glass-card card-5">
        <strong>🔍 Audit · enterprise_audit table</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Captures: decision · reason · approval · execution · outcome</li>
          <li>Schema: §38.3 audit row + §107 5-stamp</li>
          <li>Immutable · §47.6 SOC2 CC8.1 compliant</li>
        </ul>
      </div>
    );
  }
  if (tab === 'rai') {
    return (
      <div className="glass-card" style={{ background: 'rgba(168,85,247,0.08)',
                                            borderLeft: '5px solid #a855f7' }}>
        <strong>🛡 Responsible AI hooks</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>§76 5-pillar policy applies</li>
          <li>Fairness gate per §B5 verification</li>
          <li>Privacy: Presidio + custom PII regex</li>
          <li>Human oversight per Section 5 (Human Approval Engine)</li>
        </ul>
      </div>
    );
  }
  if (tab === 'objective') {
    return (
      <PageObjective
        objective={`Make ${section.label} continuously self-improving · close every gap surfaced by the audit.`}
        storageKey={`aeo:${section.id}:obj`}
        todos={[
          { id: 'sd1', label: 'Auto-load row count from endpoint', done: true },
          { id: 'sd2', label: 'Drill into row → detail tab' },
          { id: 'sd3', label: 'Add CRUD writes from UI (next iter)' },
          { id: 'sd4', label: 'Wire to Decision Orchestrator' },
        ]}
      />
    );
  }
  if (tab === 'metrics') {
    return (
      <div className="card-rotate" style={{ display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                              gap: 8 }}>
        <div><strong>Rows live</strong><div>{rows.length}</div></div>
        <div><strong>Endpoint</strong><div style={{ fontSize: 9 }}>{section.endpoint}</div></div>
        <div><strong>Autonomy</strong><div>{((dashboard?.autonomy_score || 0) * 100).toFixed(0)}%</div></div>
        <div><strong>Compliance</strong><div>{((dashboard?.summary?.policy_compliance || 0) * 100).toFixed(1)}%</div></div>
      </div>
    );
  }
  if (tab === 'todos') {
    return (
      <PageObjective
        objective={`Open work to elevate ${section.label}.`}
        storageKey={`aeo:${section.id}:todos`}
        todos={[
          { id: 'tdo1', label: 'Add CRUD writes for human-friendly editing' },
          { id: 'tdo2', label: 'Wire RACI · owner · escalation' },
          { id: 'tdo3', label: 'Real-time stream via SSE' },
          { id: 'tdo4', label: 'Cron monitors drift' },
        ]}
      />
    );
  }
  return null;
}

export default function AeoDepartmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeZone, setActiveZone] = useState('goals');
  const [selectedSection, setSelectedSection] = useState(searchParams.get('s') || 's01');
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'overview');
  const [dashboard, setDashboard] = useState(null);

  const [mainW, setMainW] = useResizableWidth({ storageKey: 'aeo:main', defaultPx: 230, min: 170, max: 320 });
  const [subW,  setSubW]  = useResizableWidth({ storageKey: 'aeo:sub',  defaultPx: 280, min: 220, max: 400 });
  const mainWRef = useRef(mainW); mainWRef.current = mainW;
  const subWRef  = useRef(subW);  subWRef.current  = subW;

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/aeo/dashboard`,
                              { headers: { 'X-Demo-Role': 'manager' } });
      if (r.ok) setDashboard(await r.json());
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    setSearchParams({ s: selectedSection, tab: selectedTab }, { replace: true });
    const sec = SECTIONS.find(s => s.id === selectedSection);
    if (sec) setActiveZone(sec.zone);
  }, [selectedSection, selectedTab, setSearchParams]);

  const visibleSections = SECTIONS.filter(s => s.zone === activeZone);
  const section = SECTIONS.find(s => s.id === selectedSection);

  return (
    <div className="workspace-fixed" style={{
      display: 'flex', height: '100vh', overflow: 'hidden', padding: 0,
    }}>
      {/* MAIN MENU */}
      <aside style={{
        width: mainW, background: 'linear-gradient(180deg, #0f172a, #581c87)',
        color: '#e9d5ff', padding: '16px 0', overflowY: 'auto', flexShrink: 0,
      }}>
        <div style={{ padding: '0 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            🧠 AEO Department
          </div>
          <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>
            Autonomous Enterprise Orchestrator · Layer 10
          </div>
          {dashboard && (
            <div style={{ marginTop: 10, fontSize: 11 }}>
              <span>Autonomy: <strong style={{ color: '#10b981' }}>
                {(dashboard.autonomy_score * 100).toFixed(0)}%
              </strong></span>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 0' }}>
          <div style={{ padding: '0 18px 6px', fontSize: 10, fontWeight: 700,
                        color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mega-zones
          </div>
          {ZONES.map(z => {
            const sectionsInZone = SECTIONS.filter(s => s.zone === z.id);
            return (
              <div key={z.id} onClick={() => {
                  setActiveZone(z.id);
                  const first = sectionsInZone[0];
                  if (first) { setSelectedSection(first.id); setSelectedTab('overview'); }
                }}
                style={{
                  padding: '10px 18px', cursor: 'pointer',
                  borderLeft: `4px solid ${z.color}`,
                  background: activeZone === z.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                <span>{z.icon}</span>
                <span style={{ flex: 1 }}>{z.label}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{sectionsInZone.length}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: '10px 16px', fontSize: 10, color: '#a78bfa',
                      borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={mainWRef} onResize={setMainW} min={170} max={320} />

      {/* SUB MENU · sections of active zone */}
      <aside style={{
        width: subW, background: '#f8fafc', borderRight: '1px solid #e5e7eb',
        padding: '16px 10px', overflowY: 'auto', flexShrink: 0,
      }}>
        <div style={{ padding: '4px 8px 10px', fontSize: 11, fontWeight: 700,
                      color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {ZONES.find(z => z.id === activeZone)?.label || ''}
          <span style={{ marginLeft: 8, color: '#94a3b8', fontWeight: 400 }}>
            {visibleSections.length} sections
          </span>
        </div>
        {visibleSections.map(s => (
          <div key={s.id} onClick={() => { setSelectedSection(s.id); setSelectedTab('overview'); }}
               style={{
                 padding: '10px 12px', margin: '4px 0',
                 background: s.id === selectedSection ? '#fff' : 'rgba(255,255,255,0.6)',
                 border: s.id === selectedSection ? `2px solid ${ZONES.find(z => z.id === s.zone)?.color}` : '1px solid #e5e7eb',
                 borderLeft: `5px solid ${ZONES.find(z => z.id === s.zone)?.color}`,
                 borderRadius: 6, cursor: 'pointer', fontSize: 12,
               }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{s.icon}</span>
              <strong style={{ flex: 1, fontSize: 12 }}>{s.label}</strong>
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, marginLeft: 24 }}>
              {s.purpose}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10, padding: 6, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={subWRef} onResize={setSubW} min={220} max={400} />

      {/* CONTENT · fixed · 11 tab strip */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <h1 className="h-glass">{section?.icon} {section?.label}</h1>
        <div className="subtle" style={{ marginBottom: 14 }}>
          {section?.purpose} · {TABS.length} tabs available · Layer 10 AEO
        </div>

        {dashboard && selectedSection === 's01' && (
          <div className="glass-card glass-strong" style={{ marginBottom: 14,
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 12 }}>
            <div><div className="subtle" style={{ fontSize: 9 }}>AUTONOMY</div>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                   {(dashboard.autonomy_score * 100).toFixed(0)}%
                 </div></div>
            <div><div className="subtle" style={{ fontSize: 9 }}>DECISIONS / DAY</div>
                 <div style={{ fontSize: 20, fontWeight: 700 }}>
                   {(dashboard.summary?.automated_decisions_today / 1e6).toFixed(1)}M
                 </div></div>
            <div><div className="subtle" style={{ fontSize: 9 }}>APPROVALS</div>
                 <div style={{ fontSize: 20, fontWeight: 700 }}>
                   {(dashboard.summary?.human_approvals || 0).toLocaleString()}
                 </div></div>
            <div><div className="subtle" style={{ fontSize: 9 }}>COMPLIANCE</div>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#06b6d4' }}>
                   {((dashboard.summary?.policy_compliance || 0) * 100).toFixed(1)}%
                 </div></div>
            <div><div className="subtle" style={{ fontSize: 9 }}>TRUST</div>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>
                   {((dashboard.summary?.trust_score || 0) * 100).toFixed(0)}%
                 </div></div>
            <div><div className="subtle" style={{ fontSize: 9 }}>LEARNING</div>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#ec4899' }}>
                   {((dashboard.summary?.learning_velocity || 0) * 100).toFixed(0)}%
                 </div></div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14,
                      padding: 6, background: 'rgba(255,255,255,0.6)',
                      borderRadius: 10, backdropFilter: 'blur(10px)',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setSelectedTab(t.id)} style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer', borderRadius: 6,
              background: selectedTab === t.id ? '#a855f7' : 'transparent',
              color: selectedTab === t.id ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AeoSectionTab section={section} tab={selectedTab} dashboard={dashboard} />
      </div>
    </div>
  );
}
