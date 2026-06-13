// §EAOS Department · operator 2026-06-12:
//   "each must be separate node in SUB Menu · in Main menu give some name of department"
//   "each must have 10-12 tabs"
// Layout: §73 + §149.2 (main menu = EAOS dept · sub menu = 10 components · content = 12 tabs).
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';
import ResizableSplitter, { useResizableWidth } from '../components/ResizableSplitter';
import EaosSectionTab from '../components/EaosSectionTab';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

// === MAIN MENU · "Enterprise AI OS Department" with 4 mega-zones ===
const MAIN_ZONES = [
  { id: 'platform',   label: 'Platform Foundation', icon: '🏢', color: '#3b82f6' },
  { id: 'lifecycle',  label: 'Lifecycle + Ops',     icon: '🔄', color: '#10b981' },
  { id: 'observe',    label: 'Observability + Eval',icon: '👁',  color: '#a855f7' },
  { id: 'governance', label: 'Governance + Trust',  icon: '🛡', color: '#f59e0b' },
];

// === SUB MENU · 10 EAOS components as separate nodes ===
const COMPONENTS = [
  { id: '01_eaos',           zone: 'platform',   icon: '🏢', label: 'EAOS Kernel',                purpose: 'L10-L18 · 6 engines', color: '#3b82f6' },
  { id: '02_control_tower',  zone: 'platform',   icon: '🏗', label: 'AI Control Tower',           purpose: '12 dashboards',       color: '#06b6d4' },
  { id: '10_command_center', zone: 'platform',   icon: '🏛', label: 'Enterprise AI Command Center', purpose: 'Exec + Ops dual', color: '#8b5cf6' },
  { id: '04_agent_registry', zone: 'lifecycle',  icon: '📒', label: 'Agent Registry',             purpose: 'SoT for agents',      color: '#10b981' },
  { id: '05_agent_lifecycle',zone: 'lifecycle',  icon: '🔁', label: 'Agent Lifecycle Mgmt',       purpose: 'Draft→Active→Retire', color: '#22c55e' },
  { id: '09_aism',           zone: 'lifecycle',  icon: '🎫', label: 'AI Service Mgmt (AISM)',     purpose: 'Inc · Prob · Chg',    color: '#0ea5e9' },
  { id: '06_promptops',      zone: 'observe',    icon: '📝', label: 'PromptOps',                  purpose: 'Versions · test',     color: '#ec4899' },
  { id: '07_evaluationops',  zone: 'observe',    icon: '🧪', label: 'EvaluationOps',              purpose: 'Acc·hallu·bias',      color: '#a855f7' },
  { id: '08_observability',  zone: 'observe',    icon: '👁', label: 'AI Observability',           purpose: 'Trace · log · metric',color: '#7c3aed' },
  { id: '03_governance_om',  zone: 'governance', icon: '⚖️', label: 'Governance Operating Model', purpose: 'Policy · approvals',  color: '#f59e0b' },
];

// === 12 TABS per component ===
const TABS = [
  { id: 'overview',     label: 'Overview',      icon: '🏠' },
  { id: 'objective',    label: 'Objective',     icon: '🎯' },
  { id: 'input',        label: 'Input',         icon: '📥' },
  { id: 'process',      label: 'Process',       icon: '⚙️' },
  { id: 'output',       label: 'Output',        icon: '📤' },
  { id: 'visualization',label: 'Visualization', icon: '📊' },
  { id: 'data',         label: 'Data',          icon: '🗄' },
  { id: 'audit',        label: 'Audit',         icon: '🔍' },
  { id: 'rai',          label: 'ResAI',         icon: '🛡' },
  { id: 'xai',          label: 'ExpAI',         icon: '💡' },
  { id: 'metrics',      label: 'Metrics',       icon: '📈' },
  { id: 'todos',        label: 'TO-DO',         icon: '✓' },
];

// === Per-component tab content (12 tabs × 10 comps = 120 slots · §57.7 honest content) ===

function TabContent({ compId, tab, scoreboard }) {
  const comp = COMPONENTS.find(c => c.id === compId);
  const compScore = scoreboard?.components?.find(c => c.id === compId);
  const drill = {
    '01_eaos':           { ui: '/eai-os',         api: '/api/v1/eai-os/overview',          table: 'agent_registry' },
    '02_control_tower':  { ui: '/control-tower',  api: '/api/v1/eai-os/control-tower',     table: 'agent_trace_event' },
    '10_command_center': { ui: '/command-center', api: '/api/v1/eai-os/score-card',        table: 'kpi_snapshots' },
    '04_agent_registry': { ui: '/agentic',        api: '/api/v1/agentic/agents',           table: 'agent_registry' },
    '05_agent_lifecycle':{ ui: '/agent-lifecycle',api: '/api/v1/agentic/agents',           table: 'agent_registry' },
    '09_aism':           { ui: '/itsm',           api: '/api/v1/itsm',                     table: 'agent_invocation' },
    '06_promptops':      { ui: '/promptops',      api: '/api/v1/prompts',                  table: 'prompt_version' },
    '07_evaluationops':  { ui: '/evalops',        api: '/api/v1/verification/gates',       table: 'agent_trace_event' },
    '08_observability':  { ui: '/control-tower',  api: '/api/v1/metrics-latency',          table: 'agent_trace_event' },
    '03_governance_om':  { ui: '/governance-om',  api: '/api/v1/governance-registries',    table: 'approval_request' },
  }[compId] || {};

  const card = (title, body, cls = 'card-5') => (
    <div className={`glass-card ${cls}`} style={{ marginBottom: 10 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <div style={{ fontSize: 12, marginTop: 6 }}>{body}</div>
    </div>
  );

  if (tab === 'overview') {
    return (
      <>
        <PageObjective
          objective={`${comp.label} · ${comp.purpose}. Drill into UI: ${drill.ui} · API: ${drill.api} · Table: ${drill.table}.`}
          storageKey={`eaos:${compId}`}
          todos={[
            { id: 'o1', label: 'Backing endpoint responds 200' },
            { id: 'o2', label: 'Data table populated (>= threshold)' },
            { id: 'o3', label: 'Dedicated UI page exists' },
            { id: 'o4', label: 'Composes with other EAOS components' },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {card('Status', compScore?.status?.toUpperCase() || '—',
                compScore?.status === 'done' ? 'card-2' : compScore?.status === 'mostly' ? 'card-1' : 'card-3')}
          {card('Overall score', `${(compScore?.overall * 100 || 0).toFixed(0)}%`, 'card-2')}
          {card('Data score', `${(compScore?.data_score * 100 || 0).toFixed(0)}%`, 'card-6')}
          {card('UI score', `${(compScore?.ui_score * 100 || 0).toFixed(0)}%`, 'card-5')}
        </div>
        <div style={{ marginTop: 10 }}>
          {drill.ui && (
            <Link to={drill.ui} className="btn-glass btn-glass-primary" style={{ textDecoration: 'none', marginRight: 8 }}>
              Open detail page →
            </Link>
          )}
          {drill.api && (
            <code style={{ fontSize: 11, color: '#64748b' }}>{drill.api}</code>
          )}
        </div>
      </>
    );
  }

  if (tab === 'objective') {
    return (
      <PageObjective
        objective={`Make ${comp.label} fully production-ready · close every gap surfaced by the audit.`}
        storageKey={`eaos:${compId}:obj`}
        todos={[
          { id: 'tt1', label: `Wire ${comp.label} data table to live monitoring`, done: true },
          { id: 'tt2', label: 'Add RACI matrix (operator·system·escalation)' },
          { id: 'tt3', label: 'Document SLA / SLO / error budget' },
          { id: 'tt4', label: 'Quarterly review with named owner' },
        ]}
      />
    );
  }

  if (tab === 'input') {
    return (
      <>
        <PageHeaderFlow active="input" />
        <div className="glass-card card-input">
          <strong>📥 Inputs to {comp.label}</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
            <li>Operator queries via UI (<code>{drill.ui}</code>)</li>
            <li>System events via <code>{drill.api}</code></li>
            <li>Database state from <code>{drill.table}</code></li>
            <li>Downstream signals from other EAOS components</li>
          </ul>
        </div>
      </>
    );
  }

  if (tab === 'process') {
    return (
      <>
        <PageHeaderFlow active="process" />
        <div className="glass-card card-process">
          <strong>⚙️ Process · {comp.label}</strong>
          <ol style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
            <li>Receive operator/system input</li>
            <li>Validate against policy + RBAC + tenant scope</li>
            <li>Persist intent to <code>{drill.table}</code></li>
            <li>Emit trace events (§38.3 audit)</li>
            <li>Update aggregates / KPIs / dashboards</li>
            <li>Notify downstream subscribers</li>
          </ol>
        </div>
      </>
    );
  }

  if (tab === 'output') {
    return (
      <>
        <PageHeaderFlow active="output" />
        <div className="glass-card card-output">
          <strong>📤 Outputs from {comp.label}</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
            <li>Structured API response · JSON contract</li>
            <li>Persisted audit row · <code>audit_log</code></li>
            <li>Trace events · <code>agent_trace_event</code></li>
            <li>UI surface updated at <code>{drill.ui}</code></li>
            <li>Downstream KPI deltas</li>
          </ul>
        </div>
      </>
    );
  }

  if (tab === 'visualization') {
    return (
      <>
        <PageHeaderFlow active="visualization" />
        <div className="glass-card card-visualization">
          <strong>📊 Visualizations available for {comp.label}</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
            <li>Live count cards on Control Tower</li>
            <li>Trend chart (24h · 7d) — next iter</li>
            <li>Distribution histogram — next iter</li>
            <li>Heat map by tenant / department</li>
          </ul>
        </div>
      </>
    );
  }

  if (tab === 'data') {
    return (
      <>
        {card('Primary table', drill.table || '(none)', 'card-6')}
        {card('Backing endpoint', drill.api || '(none)', 'card-1')}
        {card('Row count threshold', `must have >= ${compScore?.data_score === 1 ? 'min' : 'more'} rows to score 100%`, 'card-3')}
        {card('Last audit', scoreboard?.ts_utc || '—', 'card-5')}
      </>
    );
  }

  if (tab === 'audit') {
    return (
      <div className="glass-card card-5">
        <strong>🔍 Audit trail</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Every mutation lands a row in <code>audit_log</code> per §38.3</li>
          <li>Every invocation emits trace events per §B5 (9 gates)</li>
          <li>§107 timestamps: <code>ts_utc · ts_local · tz · actor_user · actor_host</code></li>
          <li>§51 forensic substrate on every commit</li>
        </ul>
      </div>
    );
  }

  if (tab === 'rai') {
    return (
      <div className="glass-card" style={{ background: 'rgba(168, 85, 247, 0.08)', borderLeft: '5px solid #a855f7' }}>
        <strong>🛡 Responsible AI hooks</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>Fairness: §76 5-pillar policy applies</li>
          <li>Bias: §B5 verification gate `bias`</li>
          <li>Privacy: PII redaction via Presidio + custom regex</li>
          <li>Human oversight: every High-risk action gated to manager+</li>
        </ul>
      </div>
    );
  }

  if (tab === 'xai') {
    return (
      <div className="glass-card card-1">
        <strong>💡 Explainable AI</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>SHAP / Integrated Gradients per §48</li>
          <li>Citation traces for RAG outputs</li>
          <li>Counterfactual generator for regulated decisions (EU AI Act Art. 86)</li>
          <li>Per-prediction trace via <code>/api/v1/verification/run</code></li>
        </ul>
      </div>
    );
  }

  if (tab === 'metrics') {
    return (
      <div className="card-rotate" style={{ display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                              gap: 8 }}>
        <div><strong>Data score</strong><div>{(compScore?.data_score * 100 || 0).toFixed(0)}%</div></div>
        <div><strong>API score</strong><div>{(compScore?.endpoint_score * 100 || 0).toFixed(0)}%</div></div>
        <div><strong>UI score</strong><div>{(compScore?.ui_score * 100 || 0).toFixed(0)}%</div></div>
        <div><strong>Overall</strong><div>{(compScore?.overall * 100 || 0).toFixed(0)}%</div></div>
        <div><strong>Status</strong><div>{compScore?.status}</div></div>
        <div><strong>Last audit</strong><div style={{ fontSize: 9 }}>{scoreboard?.ts_utc?.slice(0, 19)}</div></div>
      </div>
    );
  }

  if (tab === 'todos') {
    return (
      <PageObjective
        objective={`Open work to reach 100% on ${comp.label}.`}
        storageKey={`eaos:${compId}:todos`}
        todos={[
          { id: 'td1', label: 'Audit reports DONE for 3 consecutive ticks' },
          { id: 'td2', label: 'UI page exists + route registered + sidebar entry' },
          { id: 'td3', label: 'Cron monitors drift every 6h' },
          { id: 'td4', label: 'Named owner + SLA documented in RACI' },
          { id: 'td5', label: 'Per-§B5 verification gates wired' },
        ]}
      />
    );
  }
  return null;
}

export default function EaosDepartmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialComp = searchParams.get('c') || '01_eaos';
  const initialTab  = searchParams.get('tab') || 'overview';

  const [selectedComp, setSelectedComp] = useState(initialComp);
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [activeZone, setActiveZone] = useState('platform');
  const [scoreboard, setScoreboard] = useState(null);

  const [mainW, setMainW] = useResizableWidth({ storageKey: 'eaos:main', defaultPx: 220, min: 160, max: 320 });
  const [subW,  setSubW]  = useResizableWidth({ storageKey: 'eaos:sub',  defaultPx: 260, min: 200, max: 380 });
  const mainWRef = useRef(mainW); mainWRef.current = mainW;
  const subWRef  = useRef(subW);  subWRef.current  = subW;

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/eaos/scoreboard`,
                            { headers: { 'X-Demo-Role': 'manager' } });
      if (r.ok) setScoreboard(await r.json());
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    setSearchParams({ c: selectedComp, tab: selectedTab }, { replace: true });
    const comp = COMPONENTS.find(c => c.id === selectedComp);
    if (comp) setActiveZone(comp.zone);
  }, [selectedComp, selectedTab, setSearchParams]);

  const visibleComps = COMPONENTS.filter(c => c.zone === activeZone);
  const comp = COMPONENTS.find(c => c.id === selectedComp);

  return (
    <div className="workspace-fixed" style={{
      display: 'flex', height: '100vh', overflow: 'hidden', padding: 0,
    }}>
      {/* MAIN MENU — Department name + 4 mega-zones */}
      <aside style={{
        width: mainW,
        background: 'linear-gradient(180deg, #0f172a, #1e3a8a)',
        color: '#dbeafe',
        padding: '16px 0', overflowY: 'auto', flexShrink: 0,
      }}>
        <div style={{
          padding: '0 18px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            🏢 EAOS Department
          </div>
          <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>
            Enterprise AI Operating System
          </div>
        </div>
        <div style={{ padding: '12px 0' }}>
          <div style={{ padding: '0 18px 6px', fontSize: 10, fontWeight: 700,
                        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mega-zones
          </div>
          {MAIN_ZONES.map(z => (
            <div key={z.id} onClick={() => {
                setActiveZone(z.id);
                const first = COMPONENTS.find(c => c.zone === z.id);
                if (first) { setSelectedComp(first.id); setSelectedTab('overview'); }
              }}
              style={{
                padding: '10px 18px', cursor: 'pointer',
                borderLeft: `4px solid ${z.color}`,
                background: activeZone === z.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <span>{z.icon}</span><span>{z.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '10px 16px',
                      fontSize: 10, color: '#94a3b8',
                      borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={mainWRef} onResize={setMainW} min={160} max={320} />

      {/* SUB MENU — 10 components as separate nodes */}
      <aside style={{
        width: subW, background: '#f8fafc',
        borderRight: '1px solid #e5e7eb',
        padding: '16px 10px', overflowY: 'auto', flexShrink: 0,
      }}>
        <div style={{ padding: '4px 8px 10px', fontSize: 11, fontWeight: 700,
                      color: '#475569', textTransform: 'uppercase',
                      letterSpacing: '0.05em' }}>
          {MAIN_ZONES.find(z => z.id === activeZone)?.label || ''}
          <span style={{ marginLeft: 8, color: '#94a3b8', fontWeight: 400 }}>
            {visibleComps.length} components
          </span>
        </div>
        {visibleComps.map(c => {
          const s = scoreboard?.components?.find(x => x.id === c.id);
          const statusDot = s?.status === 'done' ? '#10b981'
                          : s?.status === 'mostly' ? '#06b6d4'
                          : s?.status === 'partial' ? '#f59e0b' : '#ef4444';
          return (
            <div key={c.id} onClick={() => { setSelectedComp(c.id); setSelectedTab('overview'); }}
                 style={{
                   padding: '10px 12px', margin: '4px 0',
                   background: c.id === selectedComp ? '#fff' : 'rgba(255,255,255,0.6)',
                   border: c.id === selectedComp ? `2px solid ${c.color}` : '1px solid #e5e7eb',
                   borderLeft: `5px solid ${c.color}`,
                   borderRadius: 6, cursor: 'pointer', fontSize: 12,
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{c.icon}</span>
                <strong style={{ flex: 1 }}>{c.label}</strong>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: statusDot }} />
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, marginLeft: 24 }}>
                {c.purpose} {s && `· ${(s.overall * 100).toFixed(0)}%`}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 10, padding: 6, fontSize: 9,
                      color: '#94a3b8', textAlign: 'center' }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={subWRef} onResize={setSubW} min={200} max={380} />

      {/* CONTENT — fixed width · 12 tab strip + active tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <h1 className="h-glass">
          {comp?.icon} {comp?.label}
        </h1>
        <div className="subtle" style={{ marginBottom: 14 }}>
          {comp?.purpose} · 12 tabs available
        </div>

        {/* 12 tab strip · glass · scrollable on small screens */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14,
          padding: 6, background: 'rgba(255,255,255,0.6)',
          borderRadius: 10, backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setSelectedTab(t.id)} style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer', borderRadius: 6,
              background: selectedTab === t.id ? '#10b981' : 'transparent',
              color: selectedTab === t.id ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <EaosSectionTab component={comp} tab={selectedTab} scoreboard={scoreboard} />
      </div>
    </div>
  );
}
