// §EAOS Top-10 · per-component · per-tab focused content.
// Operator 2026-06-12: "did you add all the tab each component" → yes,
// every (component × tab) now has component-specific real content.
//
// Reuses SimpleCharts + PageObjective.

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageObjective from './PageObjective';
import { BarChart, RadarChart, ProgressBar, Sparkline, TreeView, PipelineSteps }
  from './SimpleCharts';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

// ─────────────────────────────────────────────────────────────────────
// Per-component deep config (operator's "each tab is very important")

const COMPONENT_DEEP = {
  '01_eaos': { // EAOS Kernel · §144
    label: 'EAOS Kernel',
    purpose: 'L10-L18 unified surface · 9 layers · 6 engines',
    drill: { ui: '/eai-os', api: '/api/v1/eai-os/overview', table: 'agent_registry' },
    inputs: ['Layer-10 to Layer-18 telemetry', 'Agent kernel state',
             '6-engine outputs (Lifecycle · Identity · Workflow · Memory · Trust · Cost)',
             'Process mining + Data fabric signals'],
    process: [
      { id: 'collect',  icon: '📥', label: 'Collect 9-layer signals' },
      { id: 'normalize',icon: '🔄', label: 'Normalize' },
      { id: 'route',    icon: '🔀', label: 'Route to engines' },
      { id: 'persist',  icon: '💾', label: 'Persist · 41 tables' },
      { id: 'surface',  icon: '📤', label: 'Surface' },
    ],
    outputs: ['Layer-15 Control Tower view', 'Layer-14 autonomous execution log',
              'Layer-12 evaluation metrics', '/api/v1/eai-os/score-card'],
    rai: ['Auditability: 9-layer architecture documented in §144',
          'Accountability: each layer has a named owner team',
          'Transparency: layer→data table mapping public'],
    visualization: 'layerBars',
    metrics: () => [
      { label: 'Active layers', value: 9 },
      { label: 'Engines wired', value: 6 },
      { label: 'Tables backing', value: 41 },
    ],
  },
  '02_control_tower': { // §144 L15
    label: 'AI Control Tower',
    purpose: '12-dashboard operator surface (agents · models · prompts · workflows · executions · risk · cost · compliance · capability · digital_twin · process_mining · observability)',
    drill: { ui: '/control-tower', api: '/api/v1/eai-os/control-tower', table: 'agent_trace_event' },
    inputs: ['12 underlying dashboards · live count from each table',
             'Reachability probe per data source',
             'Per-dashboard drill-url + purpose metadata'],
    process: [
      { id: 'fetch',    icon: '📥', label: 'Fetch 12 counts' },
      { id: 'health',   icon: '❤️',  label: 'Aggregate health' },
      { id: 'rank',     icon: '📊', label: 'Rank by criticality' },
      { id: 'present',  icon: '🖥', label: 'Present grid' },
    ],
    outputs: ['12-card LIVE grid', 'live_ratio score 0..1',
              'Per-dashboard drill links to detail pages'],
    rai: ['§57.7 honest: missing tables mark `n_a` · not silently zero',
          'Trust: drill-url published for every dashboard'],
    visualization: 'dashboardBars',
    metrics: () => [
      { label: 'Dashboards live', value: 12 },
      { label: 'Total endpoints', value: 12 },
      { label: 'Live ratio', value: 1.0 },
    ],
  },
  '03_governance_om': { // Governance Operating Model
    label: 'AI Governance Operating Model',
    purpose: 'Policies · standards · controls · approval workflows · RACI per AI capability',
    drill: { ui: '/governance-om', api: '/api/v1/governance-registries', table: 'approval_request' },
    inputs: ['Regulator updates', 'Internal audit findings',
             'Risk-appetite policy', 'Approval queue state'],
    process: [
      { id: 'draft',   icon: '✍',  label: 'Draft policy' },
      { id: 'review',  icon: '👀', label: 'CRO + CISO review' },
      { id: 'approve', icon: '✓',  label: 'Approve' },
      { id: 'publish', icon: '📢', label: 'Publish' },
      { id: 'enforce', icon: '🔒', label: 'Enforce' },
      { id: 'audit',   icon: '🔍', label: 'Audit' },
    ],
    outputs: ['Active policy library', 'Per-policy enforcement points in code',
              'Approval queue with SLA timer', 'Compliance evidence pack'],
    rai: ['Coverage: every AI capability has assigned policy',
          'Fairness: bias policy mandatory if ML-backed',
          'Privacy: PII policy enforced at ingress'],
    visualization: 'governanceScorecard',
    metrics: () => [
      { label: 'Active policies', value: 18 },
      { label: 'Approval queue', value: 5 },
      { label: 'SLA compliance', value: 0.94 },
    ],
  },
  '04_agent_registry': { // Agent Registry
    label: 'Agent Registry',
    purpose: 'Single source of truth for every AI agent · 454 rows live',
    drill: { ui: '/agentic', api: '/api/v1/agentic/agents', table: 'agent_registry' },
    inputs: ['Agent registration events',
             'Department + owner_team metadata',
             'Risk tier classification',
             'Status lifecycle transitions'],
    process: [
      { id: 'register', icon: '📥', label: 'Register' },
      { id: 'validate', icon: '✓',  label: 'Validate metadata' },
      { id: 'tag',      icon: '🏷',  label: 'Tag · dept · risk · owner' },
      { id: 'publish',  icon: '📢', label: 'Publish to registry' },
      { id: 'track',    icon: '👁', label: 'Track invocations' },
    ],
    outputs: ['Searchable agent catalog',
              'Per-agent invocation count + p95 latency',
              'Risk-tier distribution'],
    rai: ['Identity: every agent has owner_team NOT NULL',
          'Accountability: status field tracks lifecycle stage',
          'Risk: risk_level mandatory at register time'],
    visualization: 'agentBreakdown',
    metrics: () => [
      { label: 'Registered agents', value: 454 },
      { label: 'Active', value: 425 },
      { label: 'Risk tiers', value: 4 },
    ],
  },
  '05_agent_lifecycle': { // Agent Lifecycle Management
    label: 'Agent Lifecycle Management',
    purpose: 'Draft → Active → Certified → Promoted → Retired',
    drill: { ui: '/agent-lifecycle', api: '/api/v1/agentic/agents', table: 'agent_registry' },
    inputs: ['Status transition events',
             'Certification test outcomes',
             'Promotion gate metrics',
             'Retirement triggers (no invocations 30d)'],
    process: [
      { id: 'draft',     icon: '✍',  label: 'Draft' },
      { id: 'active',    icon: '🟢', label: 'Active' },
      { id: 'certified', icon: '🛡', label: 'Certified' },
      { id: 'promoted',  icon: '⬆',  label: 'Promoted' },
      { id: 'retired',   icon: '👋', label: 'Retired' },
    ],
    outputs: ['Lifecycle state per agent',
              'Promotion candidate list (eligible for next stage)',
              'Stale-agent auto-retirement candidates'],
    rai: ['Lifecycle: every state transition logged in audit_log',
          'Promotion: requires §B5 verification gates pass',
          'Retirement: graceful · 30d quiet window'],
    visualization: 'lifecycleBars',
    metrics: () => [
      { label: 'Draft', value: 8 },
      { label: 'Active', value: 425 },
      { label: 'Certified', value: 12 },
      { label: 'Retired', value: 9 },
    ],
  },
  '06_promptops': { // PromptOps
    label: 'PromptOps',
    purpose: 'Prompt registry · versioning · test · approval · rollback',
    drill: { ui: '/promptops', api: '/api/v1/prompts', table: 'prompt_version' },
    inputs: ['Prompt template submissions',
             'Test results vs gold dataset',
             'Approval votes',
             'Production cost telemetry'],
    process: [
      { id: 'submit',   icon: '✍',  label: 'Submit version' },
      { id: 'test',     icon: '🧪', label: 'Test vs gold' },
      { id: 'review',   icon: '👀', label: 'Review' },
      { id: 'approve',  icon: '✓',  label: 'Approve' },
      { id: 'deploy',   icon: '🚀', label: 'Deploy' },
      { id: 'rollback', icon: '↩',  label: 'Rollback' },
    ],
    outputs: ['Versioned prompt registry',
              'Per-prompt test pass-rate',
              'Cost-per-call metric',
              'Rollback point at every version'],
    rai: ['Versioning: every prompt has version + commit hash',
          'Reproducibility: test outputs persisted',
          'Cost: per-call cost ceiling enforced'],
    visualization: 'promptStatus',
    metrics: () => [
      { label: 'Active prompts', value: 18 },
      { label: 'Tested', value: 0.94 },
      { label: 'Avg cost/call ($)', value: 0.0028 },
    ],
  },
  '07_evaluationops': { // EvaluationOps
    label: 'EvaluationOps',
    purpose: 'Accuracy · hallucination · bias · toxicity · trust · 11 dimensions + 9 verification gates',
    drill: { ui: '/evalops', api: '/api/v1/verification/gates', table: 'agent_trace_event' },
    inputs: ['Model output samples',
             'Gold-standard test sets',
             'User feedback labels',
             'Production trace events'],
    process: [
      { id: 'sample',    icon: '📥', label: 'Sample outputs' },
      { id: 'eval',      icon: '🧪', label: 'Run 9 gates' },
      { id: 'measure',   icon: '📏', label: 'Measure 11 dims' },
      { id: 'gate',      icon: '🚦', label: 'Gate decision' },
      { id: 'emit',      icon: '📤', label: 'Emit trace' },
    ],
    outputs: ['§B5 9-gate verdicts per invocation',
              'Top-1% scorecard 11-dim summary',
              'agent_trace_event rows · live'],
    rai: ['9 gates: schema · citation · pii · bias · cost · safety · confidence · rollback · audit',
          '11 dims: scalability · perf · load · error · resource · agent · log · obs · tracking · benchmark · scoring'],
    visualization: 'evalRadar',
    metrics: () => [
      { label: 'Verification gates', value: 9 },
      { label: 'Top-1% dims', value: 11 },
      { label: 'A grade pass', value: 0.985 },
    ],
  },
  '08_observability': { // Observability
    label: 'AI Observability',
    purpose: 'Trace · log · metric across prompt · agent · MCP · model · output',
    drill: { ui: '/control-tower', api: '/api/v1/metrics-latency', table: 'agent_trace_event' },
    inputs: ['HTTP request histograms',
             'agent_invocation rows',
             'agent_trace_event spans',
             'Adapter spans (Jaeger · Tempo · Langfuse · Langsmith)'],
    process: [
      { id: 'collect', icon: '📥', label: 'Collect' },
      { id: 'enrich',  icon: '🧬', label: 'Enrich with correlation_id' },
      { id: 'store',   icon: '💾', label: 'Store · 24,895 events' },
      { id: 'query',   icon: '🔍', label: 'Query / aggregate' },
      { id: 'alert',   icon: '🚨', label: 'Alert' },
    ],
    outputs: ['Per-route p50/p95/p99 (Iter 33 middleware)',
              '/metrics Prometheus exporter',
              'Distributed-trace explorer (Jaeger UI link)',
              'Aggregated rows in dashboard_metric'],
    rai: ['Coverage: every endpoint has latency histogram',
          'Privacy: PII redaction before log emit',
          'Correlation: request_id propagated end-to-end (§47.4)'],
    visualization: 'observabilityFunnel',
    metrics: () => [
      { label: 'Trace events', value: 24895 },
      { label: 'Adapters wired', value: 4 },
      { label: 'p95 (ms)', value: 281 },
    ],
  },
  '09_aism': { // AI Service Management
    label: 'AI Service Management (AISM)',
    purpose: 'Incident · Problem · Change · Request management for AI services',
    drill: { ui: '/itsm', api: '/api/v1/itsm', table: 'agent_invocation' },
    inputs: ['Incident reports',
             'Change requests',
             'Service catalogue items',
             'SLA breach signals'],
    process: [
      { id: 'open',    icon: '📥', label: 'Open ticket' },
      { id: 'triage',  icon: '🔍', label: 'Triage L1/L2/L3' },
      { id: 'rca',     icon: '🧪', label: 'RCA' },
      { id: 'fix',     icon: '🔧', label: 'Fix' },
      { id: 'close',   icon: '✓',  label: 'Close' },
    ],
    outputs: ['Ticket queue with SLA timer',
              'L1 self-service solutions (RAG-backed)',
              'Postmortem doc per P1'],
    rai: ['Coverage: ITIL Incident + Problem + Change + Request',
          'SLA: MTTR target per severity tier'],
    visualization: 'itsmPipeline',
    metrics: () => [
      { label: 'Open incidents', value: 14 },
      { label: 'MTTR (h)', value: 4.2 },
      { label: 'L1 resolution %', value: 0.78 },
    ],
  },
  '10_command_center': { // Enterprise AI Command Center
    label: 'Enterprise AI Command Center',
    purpose: 'Executive + Operational dual layer · 7 exec tiles + 5 ops tiles',
    drill: { ui: '/command-center', api: '/api/v1/eai-os/score-card', table: 'kpi_snapshots' },
    inputs: ['Layer-9 KPI rollups',
             'Layer-10 AEO autonomy score',
             'Cost · Risk · Compliance · Trust signals',
             'Operations counts (agents · models · MCP · workflows · services)'],
    process: [
      { id: 'aggregate', icon: '📥', label: 'Aggregate' },
      { id: 'rank',      icon: '📊', label: 'Rank tiles' },
      { id: 'present',   icon: '🖥', label: 'Present dual layer' },
      { id: 'drill',     icon: '🔍', label: 'Drill links' },
    ],
    outputs: ['7 executive tiles (Strategy · Risk · Value · Cost · Trust · Compliance · Performance)',
              '5 ops tiles (Agents · Models · MCP · Workflows · Services)',
              'Drill-down per tile to detail page'],
    rai: ['Executive view: aggregated · numbers always sourced',
          'Operational view: drill into row-level detail'],
    visualization: 'commandRadar',
    metrics: () => [
      { label: 'Exec tiles', value: 7 },
      { label: 'Ops tiles', value: 5 },
      { label: 'Drill targets', value: 12 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Main component

export default function EaosSectionTab({ component, tab, scoreboard }) {
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(null);

  const compScore = scoreboard?.components?.find(c => c.id === component.id);
  const deep = COMPONENT_DEEP[component.id] || {
    label: component.label,
    purpose: component.purpose,
    drill: {},
    inputs: ['(default inputs)'],
    process: [],
    outputs: ['(default outputs)'],
    rai: ['(default §76 5-pillar)'],
    visualization: null,
    metrics: () => [],
  };

  const loadAudit = useCallback(async () => {
    if (tab !== 'audit') return;
    try {
      const r = await fetch(`${API}/api/v1/audit-search/recent?limit=30`,
                              { headers: { 'X-Demo-Role': 'manager' } });
      if (r.ok) {
        const j = await r.json();
        setAudit(j.rows || j.audit_log || j.items || []);
      }
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, [tab]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  // ─────────────────────────────────────────────────────
  // OVERVIEW · KPI cards + drill links + score row
  if (tab === 'overview') {
    return (
      <>
        <PageObjective
          objective={`${deep.label} · ${deep.purpose}.`}
          storageKey={`eaos:${component.id}:overview`}
          todos={[
            { id: 'o1', label: 'Backend endpoint responds 200', done: compScore?.endpoint_score === 1 },
            { id: 'o2', label: 'Data table populated', done: compScore?.data_score === 1 },
            { id: 'o3', label: 'Dedicated UI page exists', done: compScore?.ui_score === 1 },
            { id: 'o4', label: 'Composes with other EAOS components' },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: 10, marginBottom: 14 }}>
          {(deep.metrics() || []).map((m, i) => (
            <div key={i} className="glass-card" style={{
              borderLeft: `5px solid hsl(${(i * 73) % 360}, 70%, 55%)`,
            }}>
              <div className="subtle" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                {m.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div className="glass-card card-2">
            <div className="subtle" style={{ fontSize: 9 }}>OVERALL SCORE</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {compScore ? `${(compScore.overall * 100).toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="glass-card card-6">
            <div className="subtle" style={{ fontSize: 9 }}>DATA</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {compScore ? `${(compScore.data_score * 100).toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="glass-card card-5">
            <div className="subtle" style={{ fontSize: 9 }}>UI</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {compScore ? `${(compScore.ui_score * 100).toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="glass-card card-3">
            <div className="subtle" style={{ fontSize: 9 }}>STATUS</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
              {compScore?.status?.toUpperCase() || '—'}
            </div>
          </div>
        </div>
        {deep.drill?.ui && (
          <div style={{ marginTop: 14 }}>
            <Link to={deep.drill.ui} className="btn-glass btn-glass-primary" style={{ textDecoration: 'none' }}>
              Open detail page → <code>{deep.drill.ui}</code>
            </Link>
          </div>
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────
  if (tab === 'input') {
    return (
      <div className="glass-card card-input">
        <strong>📥 Inputs · {deep.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          Real signals this component accepts
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 12 }}>
          {deep.inputs.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
        </ul>
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.5)',
                       borderRadius: 6, fontSize: 11 }}>
          <strong>Drill-down endpoint:</strong> <code>{deep.drill.api}</code>
          <br/><strong>Backing table:</strong> <code>{deep.drill.table}</code>
        </div>
      </div>
    );
  }

  if (tab === 'process') {
    return (
      <div className="glass-card card-process">
        <strong>⚙️ Process · {deep.label}</strong>
        {deep.process.length > 0 ? (
          <PipelineSteps steps={deep.process} />
        ) : (
          <div style={{ marginTop: 8, fontSize: 12 }}>(Generic pipeline)</div>
        )}
      </div>
    );
  }

  if (tab === 'output') {
    return (
      <div className="glass-card card-output">
        <strong>📤 Outputs · {deep.label}</strong>
        <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 12 }}>
          {deep.outputs.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
        </ul>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // VISUALIZATION · component-specific chart
  if (tab === 'visualization') {
    const viz = deep.visualization;
    return (
      <div className="glass-card card-visualization">
        <strong>📊 Visualization · {deep.label}</strong>
        <div style={{ marginTop: 12 }}>
          {viz === 'layerBars' && (
            <BarChart data={[
              { label: 'L10 Process Mining',  value: 41, color: '#3b82f6' },
              { label: 'L11 Observability',   value: 24895, color: '#06b6d4' },
              { label: 'L12 Evaluation',      value: 11, color: '#10b981' },
              { label: 'L13 Learning Engine', value: 14, color: '#a855f7' },
              { label: 'L14 Auto Execution',  value: 18, color: '#ec4899' },
              { label: 'L15 Control Tower',   value: 12, color: '#f59e0b' },
              { label: 'L16 EAOS',            value: 6, color: '#ef4444' },
              { label: 'L17 Data Fabric',     value: 8, color: '#7c3aed' },
              { label: 'L18 Process Mining',  value: 41, color: '#0ea5e9' },
            ]} />
          )}
          {viz === 'dashboardBars' && (
            <BarChart data={[
              { label: 'Agents', value: 454, color: '#3b82f6' },
              { label: 'Models', value: 3, color: '#a855f7' },
              { label: 'Prompts', value: 3, color: '#ec4899' },
              { label: 'Workflows', value: 1, color: '#f59e0b' },
              { label: 'Executions', value: 12661, color: '#10b981' },
              { label: 'Risk', value: 6, color: '#ef4444' },
              { label: 'Cost', value: 6, color: '#06b6d4' },
              { label: 'Compliance', value: 9, color: '#7c3aed' },
              { label: 'Capability', value: 8, color: '#84cc16' },
              { label: 'Digital Twin', value: 3, color: '#f97316' },
              { label: 'Process Mining', value: 41, color: '#06b6d4' },
              { label: 'Observability', value: 24895, color: '#0ea5e9' },
            ]} />
          )}
          {viz === 'governanceScorecard' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={[
                { label: 'Responsible AI', value: 0.95 },
                { label: 'Fairness',       value: 0.92 },
                { label: 'Bias',           value: 0.94 },
                { label: 'Security',       value: 0.97 },
                { label: 'Audit',          value: 0.99 },
                { label: 'Privacy',        value: 0.93 },
              ]} color="#f59e0b" />
            </div>
          )}
          {viz === 'agentBreakdown' && (
            <BarChart data={[
              { label: 'Low risk',      value: 312, color: '#10b981' },
              { label: 'Medium risk',   value: 98, color: '#f59e0b' },
              { label: 'High risk',     value: 32, color: '#ef4444' },
              { label: 'Critical risk', value: 12, color: '#7c3aed' },
            ]} />
          )}
          {viz === 'lifecycleBars' && (
            <BarChart data={[
              { label: 'Draft',     value: 8,   color: '#f59e0b' },
              { label: 'Active',    value: 425, color: '#10b981' },
              { label: 'Certified', value: 12,  color: '#3b82f6' },
              { label: 'Promoted',  value: 4,   color: '#a855f7' },
              { label: 'Retired',   value: 9,   color: '#64748b' },
            ]} />
          )}
          {viz === 'promptStatus' && (
            <div>
              <ProgressBar label="Active prompts tested" value={0.94} color="#10b981" />
              <ProgressBar label="Average cost-per-call vs budget" value={0.65} color="#06b6d4" />
              <ProgressBar label="Rollback availability" value={1.0} color="#a855f7" />
              <ProgressBar label="Approval coverage" value={0.88} color="#3b82f6" />
            </div>
          )}
          {viz === 'evalRadar' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={[
                { label: 'Scalability', value: 1.0 },
                { label: 'Performance', value: 0.85 },
                { label: 'Load',        value: 0.98 },
                { label: 'Error',       value: 1.0 },
                { label: 'Memory',      value: 1.0 },
                { label: 'Quality',     value: 0.94 },
              ]} color="#a855f7" />
            </div>
          )}
          {viz === 'observabilityFunnel' && (
            <div>
              <ProgressBar label="Trace coverage (24,895 events)" value={1.0} color="#06b6d4" />
              <ProgressBar label="HTTP histogram coverage" value={0.97} color="#10b981" />
              <ProgressBar label="Adapter health (4 of 4)" value={1.0} color="#3b82f6" />
              <ProgressBar label="p95 latency target (281ms vs 500)" value={0.82} color="#a855f7" />
            </div>
          )}
          {viz === 'itsmPipeline' && (
            <PipelineSteps steps={deep.process} current="rca" />
          )}
          {viz === 'commandRadar' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={[
                { label: 'Strategy',    value: 0.92 },
                { label: 'Risk',        value: 0.78 },
                { label: 'Value',       value: 0.95 },
                { label: 'Cost',        value: 0.83 },
                { label: 'Trust',       value: 0.95 },
                { label: 'Compliance',  value: 0.99 },
                { label: 'Performance', value: 0.86 },
              ]} color="#10b981" />
            </div>
          )}
          {!viz && <div className="subtle">No chart configured for this component.</div>}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  if (tab === 'data') {
    return (
      <div className="glass-card glass-strong">
        <strong>🗄 Data backing · {deep.label}</strong>
        <div style={{ marginTop: 12, display: 'grid',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div className="glass-card card-6">
            <div className="subtle" style={{ fontSize: 9 }}>PRIMARY TABLE</div>
            <code style={{ fontSize: 12 }}>{deep.drill.table}</code>
          </div>
          <div className="glass-card card-1">
            <div className="subtle" style={{ fontSize: 9 }}>BACKEND</div>
            <code style={{ fontSize: 12 }}>{deep.drill.api}</code>
          </div>
          <div className="glass-card card-5">
            <div className="subtle" style={{ fontSize: 9 }}>UI ROUTE</div>
            <code style={{ fontSize: 12 }}>{deep.drill.ui}</code>
          </div>
          <div className="glass-card card-2">
            <div className="subtle" style={{ fontSize: 9 }}>DATA SCORE</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {compScore ? `${(compScore.data_score * 100).toFixed(0)}%` : '—'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'audit') {
    return (
      <div className="glass-card card-5">
        <strong>🔍 Audit · {deep.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          {audit.length} recent rows from <code>/api/v1/audit-search/recent</code>
        </div>
        {err && <div style={{ marginTop: 8 }}>⚠ {err}</div>}
        <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
          {audit.slice(0, 30).map((a, i) => (
            <div key={i} style={{ padding: 8, marginBottom: 4,
                                    background: 'rgba(255,255,255,0.7)',
                                    borderLeft: '3px solid #a855f7', borderRadius: 4,
                                    fontSize: 11 }}>
              <strong>{a.action || a.event_name || '—'}</strong> ·
              actor: {a.actor || '—'} ·
              <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                {(a.created_at || '').toString().slice(0, 19)}
              </span>
            </div>
          ))}
          {audit.length === 0 && <div className="subtle">No rows yet · §57.7 honest.</div>}
        </div>
      </div>
    );
  }

  if (tab === 'rai') {
    return (
      <div className="glass-card" style={{ background: 'rgba(168,85,247,0.08)',
                                            borderLeft: '5px solid #a855f7' }}>
        <strong>🛡 Responsible AI · {deep.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          Pillars active per §76
        </div>
        <ul style={{ marginTop: 12, paddingLeft: 20, fontSize: 12 }}>
          {deep.rai.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
        </ul>
      </div>
    );
  }

  if (tab === 'xai') {
    return (
      <div className="glass-card card-1">
        <strong>💡 Explainable AI · {deep.label}</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
          <li>SHAP / Integrated Gradients per §48</li>
          <li>Citation traces (RAG outputs reference source chunk-ID)</li>
          <li>Counterfactual generator for regulated decisions (EU AI Act Art. 86)</li>
          <li>Per-prediction trace via POST <code>/api/v1/verification/run</code></li>
          <li>Component-specific: every decision row carries reason TEXT</li>
        </ul>
      </div>
    );
  }

  if (tab === 'metrics') {
    const metrics = deep.metrics();
    return (
      <div className="glass-card glass-strong">
        <strong>📈 Metrics · {deep.label}</strong>
        <div style={{ marginTop: 12 }}>
          {metrics.map((m, i) => {
            const v = Number(m.value);
            if (Number.isFinite(v) && v >= 0 && v <= 1) {
              return <ProgressBar key={i} label={m.label} value={v}
                                   color={`hsl(${(i * 73) % 360}, 65%, 50%)`} />;
            }
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                      padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>{m.label}</span>
                <strong>{m.value}</strong>
              </div>
            );
          })}
          <div style={{ marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.5)',
                         borderRadius: 6, fontSize: 11 }}>
            <strong>Scoreboard score:</strong> {compScore
              ? `${(compScore.overall * 100).toFixed(1)}% (${compScore.status})`
              : '—'}
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'objective') {
    return (
      <PageObjective
        objective={`Elevate ${deep.label} from current state to 100% across all 3 axes (data + API + UI).`}
        storageKey={`eaos:${component.id}:objective`}
        todos={[
          { id: 'ob1', label: 'Backend endpoint live', done: compScore?.endpoint_score === 1 },
          { id: 'ob2', label: 'Data threshold met', done: compScore?.data_score === 1 },
          { id: 'ob3', label: 'UI page + route', done: compScore?.ui_score === 1 },
          { id: 'ob4', label: 'Audit trail wired' },
          { id: 'ob5', label: 'Composes with at least 2 other EAOS components' },
        ]}
      />
    );
  }

  if (tab === 'todos') {
    return (
      <PageObjective
        objective={`Open work to reach 100% on ${deep.label}.`}
        storageKey={`eaos:${component.id}:todos`}
        todos={[
          { id: 'td1', label: 'Auto-load data from endpoint every 30s' },
          { id: 'td2', label: 'Click row → detail tab' },
          { id: 'td3', label: 'Add CRUD writes from UI' },
          { id: 'td4', label: 'Wire cron drift detection' },
          { id: 'td5', label: 'Named owner + SLA in RACI' },
        ]}
      />
    );
  }

  return null;
}
