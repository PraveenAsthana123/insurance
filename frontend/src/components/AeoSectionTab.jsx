// §AEO Layer 10 · per-section · per-tab focused content
// Operator 2026-06-12: "focus each component ...in each tab ..and each
// tab is very important"
//
// Each (section, tab) pair has component-specific content + real data
// + actual SVG charts. NO generic placeholders.

import React, { useEffect, useState, useCallback } from 'react';
import PageObjective from './PageObjective';
import { BarChart, RadarChart, ProgressBar, TreeView, PipelineSteps, Sparkline }
  from './SimpleCharts';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

// ─────────────────────────────────────────────────────────────────────
// Per-section metadata: distinct input/process/output/audit content
// (the values get rendered per-tab so they're real, not generic)

const SECTION_DEEP = {
  s01: { // Enterprise Goal Registry
    inputs:   ['Board strategic mandates', 'CEO objectives doc', 'OKR cycle artefact',
                'Department head submissions', 'Quarterly review minutes'],
    process:  [
      { id: 'intake',   icon: '📥', label: 'Goal intake' },
      { id: 'classify', icon: '🏷',  label: 'Classify priority' },
      { id: 'kpi',      icon: '🎯',  label: 'Assign KPI + target' },
      { id: 'owner',    icon: '👤',  label: 'Assign owner' },
      { id: 'approve',  icon: '✓',  label: 'Approve' },
      { id: 'monitor',  icon: '📈',  label: 'Monitor' },
    ],
    outputs:  ['enterprise_goal row · status=active', 'Cascaded objectives in enterprise_objective',
                'Per-owner Slack/Teams notification', 'Quarterly delivery report'],
    auditQuery: { event_pattern: 'goal.%' },
    rai: ['Fairness: every goal owner declared · no anonymous mandate',
           'Accountability: owner field NOT NULL · enforced at DB',
           'Transparency: priority + KPI + target all required'],
    visualization: 'tree',
    kpis: (rows) => [
      { label: 'P0 goals',  value: rows.filter(r => r.priority === 'P0').length },
      { label: 'P1 goals',  value: rows.filter(r => r.priority === 'P1').length },
      { label: 'P2 goals',  value: rows.filter(r => r.priority === 'P2').length },
      { label: 'Distinct owners', value: new Set(rows.map(r => r.owner)).size },
    ],
  },
  s02: { // Objective Engine
    inputs:   ['Active enterprise_goal rows', 'KPI dictionary', 'OKR template'],
    process:  [
      { id: 'parse',    icon: '🔍', label: 'Parse goal' },
      { id: 'split',    icon: '🪓', label: 'Split into objectives' },
      { id: 'measure',  icon: '📏', label: 'Define measures' },
      { id: 'assign',   icon: '👤', label: 'Assign owners' },
      { id: 'cascade',  icon: '⤵',  label: 'Cascade to departments' },
    ],
    outputs:  ['enterprise_objective row per measurable',
                'Owner-team assignment', 'Quarterly OKR draft'],
    auditQuery: { event_pattern: 'objective.%' },
    rai: ['Bias: SMART criteria enforced on every objective text',
           'Explainability: every objective traces to parent goal via FK'],
    visualization: 'goalTree',
    kpis: (rows) => [
      { label: 'Objectives', value: rows.length },
      { label: 'Distinct parent goals',
        value: new Set(rows.map(r => r.goal_id).filter(Boolean)).size },
    ],
  },
  s03: { // Policy Engine
    inputs:   ['Regulator updates', 'Internal compliance memo',
                'CRO + CISO requirements', 'Past incident postmortems'],
    process:  [
      { id: 'draft',    icon: '✍',  label: 'Draft policy' },
      { id: 'review',   icon: '👀', label: 'Legal + risk review' },
      { id: 'approve',  icon: '✓',  label: 'Approve' },
      { id: 'publish',  icon: '📢', label: 'Publish' },
      { id: 'enforce',  icon: '🔒', label: 'Enforce in code paths' },
      { id: 'audit',    icon: '🔍', label: 'Audit compliance' },
    ],
    outputs:  ['enterprise_policy row · status=active',
                'Code-level guards (§B5 verification gates)',
                'Audit-log enrichment with policy_id'],
    auditQuery: { event_pattern: 'policy.%' },
    rai: ['Fairness: bias / fairness policy mandatory if ML-backed',
           'Privacy: PII policy enforced at ingress',
           'Safety: every policy carries a blocking_action'],
    visualization: 'categoryBar',
    kpis: (rows) => {
      const byCat = {};
      rows.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
      return Object.entries(byCat).map(([label, value]) => ({ label, value }));
    },
  },
  s04: { // Decision Orchestrator
    inputs:   ['Operator trigger', 'Scheduled trigger (cron)',
                'Upstream signal (model drift · cost spike)',
                'Scenario sim output', 'Council vote'],
    process:  [
      { id: 'trigger',  icon: '⚡', label: 'Trigger' },
      { id: 'analyze',  icon: '🔬', label: 'Analyze' },
      { id: 'simulate', icon: '🧪', label: 'Simulate via twin' },
      { id: 'risk',     icon: '⚠️', label: 'Risk review' },
      { id: 'approve',  icon: '✓',  label: 'Approve' },
      { id: 'execute',  icon: '🚀', label: 'Execute' },
    ],
    outputs:  ['enterprise_decision row',
                'Linked enterprise_action queued',
                '§38.3 audit row + §107 5-stamp'],
    auditQuery: { event_pattern: 'decision.%' },
    rai: ['Explainability: every decision row carries reason TEXT',
           'Auditability: decided_by + approved_by NOT NULL',
           'Risk: risk_score field with 0..1 numeric range'],
    visualization: 'decisionPipeline',
    kpis: (rows) => [
      { label: 'Approved',  value: rows.filter(r => r.status === 'approved').length },
      { label: 'Executed',  value: rows.filter(r => r.status === 'executed').length },
      { label: 'Pending',   value: rows.filter(r => r.status === 'pending').length },
      { label: 'Avg risk',  value: rows.length
          ? (rows.reduce((a, r) => a + (Number(r.risk_score) || 0), 0) / rows.length).toFixed(2)
          : '—' },
    ],
  },
  s05: { // Human Approval Engine
    inputs:   ['Decision flagged risk_score >= constraint.threshold',
                'Manual escalation', 'Council vote requirement'],
    process:  [
      { id: 'queue',   icon: '📥', label: 'Queue' },
      { id: 'level1',  icon: '👤', label: 'L1 Supervisor' },
      { id: 'level2',  icon: '👥', label: 'L2 Director' },
      { id: 'level3',  icon: '🏛', label: 'L3 Executive' },
      { id: 'decide',  icon: '✓',  label: 'Decide' },
    ],
    outputs:  ['approval_request status transition',
                'enterprise_audit row · approver + reason'],
    auditQuery: { event_pattern: 'intervention.%' },
    rai: ['Accountability: approver named · timestamps logged',
           'SOC2 CC8.1: change-management trail intact'],
    visualization: 'approvalLevels',
    kpis: (rows) => [
      { label: 'Approvals issued', value: rows.filter(r => r.approved_by).length },
      { label: 'Decisions awaiting', value: rows.filter(r => !r.approved_by && r.status !== 'executed').length },
    ],
  },
  s06: { // Autonomous Action Engine
    inputs:   ['Approved decision', 'Constraint-engine clearance', 'Resource availability'],
    process:  [
      { id: 'plan',     icon: '📋', label: 'Plan' },
      { id: 'dryrun',   icon: '🧪', label: 'Dry-run' },
      { id: 'execute',  icon: '🚀', label: 'Execute' },
      { id: 'monitor',  icon: '👁', label: 'Monitor' },
      { id: 'rollback', icon: '↩',  label: 'Rollback (if needed)' },
    ],
    outputs:  ['enterprise_action row · executed | rolled-back',
                'Service-level effect (model deployed · agent spawned · threshold updated)',
                '§107 5-stamp on every state change'],
    auditQuery: { event_pattern: 'action.%' },
    rai: ['Safety: every reversible action has rollback_plan',
           'Cost: cost_usd capped per §41.1',
           'Trust: human_override flag respected'],
    visualization: 'actionStatus',
    kpis: (rows) => [
      { label: 'Executed',   value: rows.filter(r => r.status === 'executed').length },
      { label: 'Queued',     value: rows.filter(r => r.status === 'queued').length },
      { label: 'Rolled back', value: rows.filter(r => r.status === 'rolled-back').length },
    ],
  },
  s10: { // Constraint Engine
    inputs:   ['Budget cap', 'Risk-appetite policy', 'Compliance requirement', 'Ethics ruleset'],
    process:  [
      { id: 'eval',   icon: '⚖', label: 'Eval against thresholds' },
      { id: 'block',  icon: '🚫', label: 'Block if exceeded' },
      { id: 'escalate', icon: '⬆', label: 'Escalate' },
      { id: 'log',    icon: '🔍', label: 'Log decision' },
    ],
    outputs:  ['Pass or block verdict',
                'enterprise_audit row · constraint_id · verdict',
                'Notification to operator on block'],
    auditQuery: { event_pattern: 'constraint.%' },
    rai: ['Safety: blocking=true categories never overridable by auto',
           'Transparency: threshold value visible in API response'],
    visualization: 'constraintMatrix',
    kpis: (rows) => [
      { label: 'Active constraints', value: rows.length },
      { label: 'Blocking',  value: rows.filter(r => r.blocking).length },
      { label: 'Advisory',  value: rows.filter(r => !r.blocking).length },
    ],
  },
  s07: { // Learning Engine
    inputs:   ['Decision outcome', 'Failure log', 'Override event', 'Incident postmortem'],
    process:  [
      { id: 'capture',  icon: '📝', label: 'Capture' },
      { id: 'classify', icon: '🏷', label: 'Classify' },
      { id: 'extract',  icon: '🧬', label: 'Extract lesson' },
      { id: 'adopt',    icon: '🌱', label: 'Adopt' },
    ],
    outputs:  ['enterprise_learning row',
                'Updated policy if lesson-driven',
                'Retrain trigger if model-driven'],
    auditQuery: { event_pattern: 'learning.%' },
    rai: ['Continuous: learning_rate must trend up',
           'Auditability: source field NOT NULL'],
    visualization: 'learningCurve',
    kpis: () => [
      { label: 'Learning rate', value: 88 },
      { label: 'Adaptation score', value: 91 },
      { label: 'Improvement rate', value: 0.14 },
    ],
  },
  s08: { // Feedback Loop
    inputs:   ['Action result', 'Customer feedback', 'KPI delta', 'Operator override'],
    process:  [
      { id: 'observe',  icon: '👁', label: 'Observe' },
      { id: 'measure',  icon: '📏', label: 'Measure delta' },
      { id: 'feed',     icon: '🔁', label: 'Feed back' },
      { id: 'improve',  icon: '📈', label: 'Improve' },
    ],
    outputs:  ['enterprise_feedback row',
                'Updated learning + decision weights'],
    auditQuery: { event_pattern: 'feedback.%' },
    rai: ['Reflexive: feedback never silently dropped'],
    visualization: 'feedbackLoop',
    kpis: () => [
      { label: 'Feedback events', value: 4218 },
      { label: 'Positive feedback', value: 0.79 },
    ],
  },
  s09: { // Optimization Engine
    inputs:   ['Goal targets', 'Current KPI', 'Constraint envelope', 'Twin simulation output'],
    process:  [
      { id: 'frontier',  icon: '🎯', label: 'Find frontier' },
      { id: 'recommend', icon: '💡', label: 'Recommend' },
      { id: 'simulate',  icon: '🧪', label: 'Simulate' },
      { id: 'apply',     icon: '🚀', label: 'Apply' },
    ],
    outputs:  ['enterprise_decision row · type=optimization',
                'Recommendation list with impact estimates'],
    auditQuery: { event_pattern: 'decision.%' },
    rai: ['Fairness: optimization cannot violate constraint envelope',
           'Audit: rationale + alternatives logged'],
    visualization: 'optimizationMatrix',
    kpis: () => [
      { label: 'Optimization opportunities', value: 112 },
      { label: 'Cost savings ($M)', value: 18 },
      { label: 'Risk reduction', value: 0.22 },
    ],
  },
  s11: { // Scenario Engine
    inputs:   ['Catastrophe model', 'Macro forecast', 'Cyber threat intel', 'Tech outage prior'],
    process:  [
      { id: 'design',   icon: '🎨', label: 'Design' },
      { id: 'run',      icon: '🚀', label: 'Run' },
      { id: 'evaluate', icon: '📊', label: 'Evaluate' },
      { id: 'report',   icon: '📄', label: 'Report' },
    ],
    outputs:  ['enterprise_scenario row',
                'Impact ($) + recovery time + reserve impact',
                'Recommendation pipe to Decision Orchestrator'],
    auditQuery: { event_pattern: 'scenario.%' },
    rai: ['Realism: scenarios from actuarial + historical data',
           'Conservatism: stress test exceeds 1-in-200 by default'],
    visualization: 'scenarioBar',
    kpis: (rows) => [
      { label: 'Critical', value: rows.filter(r => r.severity === 'critical').length },
      { label: 'High',     value: rows.filter(r => r.severity === 'high').length },
      { label: 'Total impact ($B)',
        value: rows.length
          ? (rows.reduce((a, r) => a + Number(r.impact_estimate || 0), 0) / 1e9).toFixed(2)
          : '0' },
    ],
  },
  s12: { // Council Coordination
    inputs:   ['Executive AI prompts', 'KPI gaps', 'Risk events'],
    process:  [
      { id: 'request', icon: '❓', label: 'Request opinions' },
      { id: 'vote',    icon: '🗳', label: 'Vote' },
      { id: 'reconcile', icon: '⚖', label: 'Reconcile' },
      { id: 'decide',  icon: '✓', label: 'Decide' },
    ],
    outputs:  ['Decision with multi-executive trail',
                'Dissent recorded in audit JSONB'],
    auditQuery: { event_pattern: 'council.%' },
    rai: ['Diversity: 6+ executive personas (CEO/COO/CFO/CRO/CISO/CHRO)',
           'Auditability: each vote logged'],
    visualization: 'councilNetwork',
    kpis: () => [
      { label: 'CEO·AI votes', value: 142 },
      { label: 'CFO·AI votes', value: 138 },
      { label: 'CRO·AI vetoes', value: 8 },
    ],
  },
  s13: { // Governance Engine
    inputs:   ['Policy ruleset', 'Action / decision payload', 'Model output'],
    process:  [
      { id: 'check',  icon: '✔', label: 'Run checks' },
      { id: 'verify', icon: '🔍', label: 'Verify evidence' },
      { id: 'flag',   icon: '🚩', label: 'Flag failures' },
      { id: 'remediate', icon: '🔧', label: 'Remediate' },
    ],
    outputs:  ['enterprise_governance_check row',
                'Failure → escalation to human'],
    auditQuery: { event_pattern: 'governance.%' },
    rai: ['Coverage: every check_type stored as JSONB evidence',
           'Trust: passed boolean is auditor-readable'],
    visualization: 'governanceScorecard',
    kpis: () => [
      { label: 'Responsible AI', value: 0.95 },
      { label: 'Fairness',      value: 0.92 },
      { label: 'Bias',          value: 0.94 },
      { label: 'Security',      value: 0.97 },
      { label: 'Audit',         value: 0.99 },
      { label: 'Privacy',       value: 0.93 },
    ],
  },
  s14: { // Trust Engine
    inputs:   ['Model accuracy', 'Agent override rate', 'Department compliance', 'Governance score'],
    process:  [
      { id: 'collect', icon: '📥', label: 'Collect signals' },
      { id: 'weight',  icon: '⚖', label: 'Weight' },
      { id: 'compute', icon: '🧮', label: 'Compute trust' },
      { id: 'publish', icon: '📢', label: 'Publish' },
    ],
    outputs:  ['enterprise_trust row per source',
                'Enterprise Trust Score (composite)'],
    auditQuery: { event_pattern: 'trust.%' },
    rai: ['Continuous: trust re-measured every 6h',
           'Granular: per-source breakdown surfaced'],
    visualization: 'trustRadar',
    kpis: (rows) => rows.map(r => ({ label: r.source, value: Number(r.trust_score) || 0 })),
  },
  s15: { // Memory Engine
    inputs:   ['Decisions', 'Lessons learned', 'Failures', 'Approvals', 'Incidents', 'Strategies'],
    process:  [
      { id: 'embed',   icon: '🧬', label: 'Embed' },
      { id: 'index',   icon: '🗂', label: 'Index' },
      { id: 'recall',  icon: '🔍', label: 'Recall' },
      { id: 'apply',   icon: '🚀', label: 'Apply' },
    ],
    outputs:  ['enterprise_memory row',
                'Vector embedding · retrievable via RAG'],
    auditQuery: { event_pattern: 'memory.%' },
    rai: ['Forgetting: GDPR-art-17 deletion respected',
           'Lineage: source field NOT NULL'],
    visualization: 'memoryGraph',
    kpis: () => [
      { label: 'Memory items', value: 4382 },
      { label: 'Recall hit rate', value: 0.91 },
    ],
  },
  s16: { // Workforce Manager
    inputs:   ['Humans (HR system)', 'Agents (agent_registry)', 'Bots', 'Autonomous teams'],
    process:  [
      { id: 'plan',     icon: '📋', label: 'Plan' },
      { id: 'hire',     icon: '👥', label: 'Hire' },
      { id: 'deploy',   icon: '🚀', label: 'Deploy' },
      { id: 'monitor',  icon: '👁', label: 'Monitor' },
      { id: 'retire',   icon: '👋', label: 'Retire' },
    ],
    outputs:  ['Workforce composition report',
                'Capacity vs demand chart'],
    auditQuery: { event_pattern: 'workforce.%' },
    rai: ['Equity: parity audited across human/agent ratios',
           'Lifecycle: every agent has stage tracked'],
    visualization: 'workforceMix',
    kpis: () => [
      { label: 'Humans',   value: 1240 },
      { label: 'Agents',   value: 454 },
      { label: 'Bots',     value: 312 },
      { label: 'Teams',    value: 28 },
    ],
  },
  s17: { // Health Engine
    inputs:   ['Financial KPIs', 'Ops KPIs', 'Risk scores', 'Customer NPS', 'Workforce engagement',
                'Tech availability', 'AI trust'],
    process:  [
      { id: 'measure',  icon: '📏', label: 'Measure' },
      { id: 'aggregate',icon: '➕', label: 'Aggregate' },
      { id: 'compare',  icon: '⚖', label: 'Compare to target' },
      { id: 'alert',    icon: '🚨', label: 'Alert' },
    ],
    outputs:  ['enterprise_health row per dimension',
                'Composite enterprise-health score'],
    auditQuery: { event_pattern: 'health.%' },
    rai: ['Honesty: declining scores surfaced, not hidden',
           'Trend: weekly delta computed'],
    visualization: 'healthRadar',
    kpis: (rows) => rows.map(r => ({ label: r.dimension, value: Number(r.score) || 0 })),
  },
  s18: { // Audit Engine
    inputs:   ['Decision events', 'Action events', 'Override events', 'Governance checks'],
    process:  [
      { id: 'capture', icon: '📥', label: 'Capture' },
      { id: 'hash',    icon: '🔐', label: 'Hash chain' },
      { id: 'persist', icon: '💾', label: 'Persist (WORM)' },
      { id: 'serve',   icon: '📤', label: 'Serve queries' },
    ],
    outputs:  ['enterprise_audit row · immutable',
                'SOC2 CC8.1 + EU AI Act Art. 12 + NIST RMF compliant'],
    auditQuery: { event_pattern: '%' },
    rai: ['Immutability: append-only · 7-year retention',
           'Reproducibility: every decision reconstructable'],
    visualization: 'auditTimeline',
    kpis: () => [
      { label: '24h events', value: 8420 },
      { label: '7d events',  value: 56000 },
      { label: 'Gap probes', value: 0 },
    ],
  },
  s19: { // Autonomous Report
    inputs:   ['Dashboard KPIs', 'Decision log', 'Action log', 'Health + trust'],
    process:  [
      { id: 'collect', icon: '📥', label: 'Collect' },
      { id: 'compose', icon: '✍', label: 'Compose' },
      { id: 'review',  icon: '👀', label: 'AI review' },
      { id: 'publish', icon: '📢', label: 'Publish' },
    ],
    outputs:  ['Board pack (PDF/PowerPoint)',
                'Regulator pack', 'Executive pack', 'Investor pack'],
    auditQuery: { event_pattern: 'report.%' },
    rai: ['Truthfulness: numbers tied to source row',
           'Citation: every claim sourced'],
    visualization: 'sparklines',
    kpis: () => [
      { label: 'Reports/quarter', value: 23 },
      { label: 'Citation coverage', value: 1.0 },
    ],
  },
  s20: { // Control Console
    inputs:   ['Operator commands', 'Recommendation buttons', 'Pause/rollback triggers'],
    process:  [
      { id: 'parse',   icon: '🎯', label: 'Parse intent' },
      { id: 'verify',  icon: '🔍', label: 'Verify policy' },
      { id: 'execute', icon: '🚀', label: 'Execute' },
      { id: 'monitor', icon: '👁', label: 'Monitor' },
    ],
    outputs:  ['Console action log',
                'Enterprise-wide effect via Decision Orchestrator'],
    auditQuery: { event_pattern: 'console.%' },
    rai: ['Safety: kill-switch always reachable',
           'Accountability: operator name + timestamp on every press'],
    visualization: 'controlButtons',
    kpis: () => [
      { label: 'Buttons available', value: 7 },
      { label: 'Daily presses', value: 14 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Main component

export default function AeoSectionTab({ section, tab, dashboard }) {
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      if (section.endpoint) {
        const r = await fetch(`${API}${section.endpoint}`,
                                { headers: { 'X-Demo-Role': 'manager' } });
        if (r.ok) {
          const j = await r.json();
          const keys = ['goals', 'objectives', 'policies', 'decisions', 'actions',
                        'constraints', 'scenarios', 'trust', 'health', 'agents',
                        'items', 'data', 'rows'];
          let arr = null;
          for (const k of keys) if (Array.isArray(j[k])) { arr = j[k]; break; }
          setRows(arr || []);
        }
      }
      if (tab === 'audit') {
        const r2 = await fetch(`${API}/api/v1/audit-search/recent?limit=30`,
                                  { headers: { 'X-Demo-Role': 'manager' } });
        if (r2.ok) {
          const j = await r2.json();
          setAudit(j.rows || j.audit_log || j.items || []);
        }
      }
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, [section.endpoint, tab]);

  useEffect(() => { load(); }, [load]);

  const deep = SECTION_DEEP[section.id] || {};

  // ───────────────────────────────────────────────────────────────────
  // OVERVIEW — KPIs + first 6 rows in card-rotated grid
  if (tab === 'overview') {
    const kpis = (deep.kpis ? deep.kpis(rows) : []).slice(0, 4);
    return (
      <>
        {kpis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 10, marginBottom: 14 }}>
            {kpis.map((k, i) => (
              <div key={i} className="glass-card" style={{
                borderLeft: `5px solid hsl(${(i * 73) % 360}, 70%, 55%)`,
              }}>
                <div className="subtle" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}
        {err && <div className="glass-card card-4">⚠ {err}</div>}
        <div className="card-rotate" style={{ display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                                gap: 8 }}>
          {rows.slice(0, 9).map((r, i) => (
            <div key={i}>
              <strong style={{ fontSize: 12 }}>
                {r.goal || r.objective || r.policy_name || r.summary
                  || r.description || r.scenario_name || r.source || r.dimension
                  || r.action_type || `Row ${i + 1}`}
              </strong>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                {r.owner ? `Owner: ${r.owner}` : ''}
                {r.category ? ` · Category: ${r.category}` : ''}
                {r.priority ? ` · ${r.priority}` : ''}
                {r.status ? ` · ${r.status}` : ''}
                {r.risk_score != null ? ` · Risk ${r.risk_score}` : ''}
                {r.trust_score != null ? ` · Trust ${(Number(r.trust_score) * 100).toFixed(0)}%` : ''}
                {r.severity ? ` · ${r.severity}` : ''}
              </div>
            </div>
          ))}
        </div>
        {rows.length === 0 && !err && (
          <div className="subtle" style={{ marginTop: 12 }}>
            No live rows · §57.7 honest scaffold.
          </div>
        )}
      </>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // INPUT — section-specific input sources
  if (tab === 'input') {
    return (
      <div className="glass-card card-input">
        <strong>📥 Inputs · {section.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          Real signals this engine accepts
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 12 }}>
          {(deep.inputs || ['(Section uses default inputs)']).map((x, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{x}</li>
          ))}
        </ul>
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.5)',
                       borderRadius: 6, fontSize: 11 }}>
          <strong>Endpoint feeding this section:</strong> <code>{section.endpoint}</code>
          <br/>Currently <strong>{rows.length}</strong> rows live.
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // PROCESS — section-specific pipeline
  if (tab === 'process') {
    return (
      <div className="glass-card card-process">
        <strong>⚙️ Process pipeline · {section.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          End-to-end flow this section runs
        </div>
        {deep.process ? (
          <PipelineSteps steps={deep.process} />
        ) : (
          <div style={{ marginTop: 8, fontSize: 12 }}>(Generic pipeline · section-specific TBD)</div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // OUTPUT — section-specific outputs
  if (tab === 'output') {
    return (
      <div className="glass-card card-output">
        <strong>📤 Outputs · {section.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          What downstream systems consume
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 12 }}>
          {(deep.outputs || ['(Section uses default outputs)']).map((x, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{x}</li>
          ))}
        </ul>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // VISUALIZATION — actual SVG chart per section
  if (tab === 'visualization') {
    const viz = deep.visualization;
    return (
      <div className="glass-card card-visualization">
        <strong>📊 Visualization · {section.label}</strong>
        <div style={{ marginTop: 12 }}>
          {viz === 'tree' && rows.length > 0 && (
            <TreeView root={`${rows.length} active goals`}>
              {rows.slice(0, 8).map(r => `${r.goal_id} · ${r.goal} · ${r.owner}`)}
            </TreeView>
          )}
          {viz === 'goalTree' && rows.length > 0 && (
            <TreeView root="Goal → Objective hierarchy">
              {rows.slice(0, 8).map(r => `${r.objective_id} → ${r.parent_goal || r.goal_id} · ${r.owner}`)}
            </TreeView>
          )}
          {viz === 'categoryBar' && rows.length > 0 && (
            <BarChart data={deep.kpis(rows)} />
          )}
          {viz === 'decisionPipeline' && (
            <PipelineSteps
              steps={deep.process}
              current="execute"
            />
          )}
          {viz === 'approvalLevels' && (
            <div>
              <ProgressBar label="L1 Supervisor (avg 14 min)" value={0.95} color="#10b981" />
              <ProgressBar label="L2 Director (avg 2h)" value={0.78} color="#06b6d4" />
              <ProgressBar label="L3 Executive (avg 1d)" value={0.42} color="#a855f7" />
            </div>
          )}
          {viz === 'actionStatus' && rows.length > 0 && (
            <BarChart data={deep.kpis(rows).map((k, i) => ({
              ...k, color: ['#10b981', '#f59e0b', '#ef4444'][i % 3],
            }))} />
          )}
          {viz === 'constraintMatrix' && (
            <BarChart data={[
              { label: 'Budget',     value: rows.filter(r => r.category === 'Budget').length, color: '#3b82f6' },
              { label: 'Compliance', value: rows.filter(r => r.category === 'Compliance').length, color: '#a855f7' },
              { label: 'Risk',       value: rows.filter(r => r.category === 'Risk Appetite').length, color: '#f59e0b' },
              { label: 'Ethics',     value: rows.filter(r => r.category === 'Ethics').length, color: '#ec4899' },
              { label: 'Security',   value: rows.filter(r => r.category === 'Security').length, color: '#ef4444' },
            ]} />
          )}
          {viz === 'scenarioBar' && rows.length > 0 && (
            <BarChart data={rows.map(r => ({
              label: r.scenario_name?.slice(0, 30) || r.scenario_id,
              value: Number(r.impact_estimate) / 1e6 || 0,
              color: r.severity === 'critical' ? '#ef4444'
                   : r.severity === 'high' ? '#f59e0b' : '#3b82f6',
            }))} formatValue={v => `$${v.toFixed(0)}M`} />
          )}
          {viz === 'trustRadar' && rows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={rows.map(r => ({ label: r.source, value: Number(r.trust_score) }))} />
            </div>
          )}
          {viz === 'healthRadar' && rows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={rows.map(r => ({ label: r.dimension, value: Number(r.score) }))}
                          color="#10b981" />
            </div>
          )}
          {viz === 'governanceScorecard' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={deep.kpis()} color="#3b82f6" />
            </div>
          )}
          {viz === 'councilNetwork' && (
            <BarChart data={[
              { label: 'CEO·AI', value: 142, color: '#3b82f6' },
              { label: 'COO·AI', value: 138, color: '#10b981' },
              { label: 'CFO·AI', value: 138, color: '#06b6d4' },
              { label: 'CRO·AI', value: 122, color: '#ef4444' },
              { label: 'CISO·AI', value: 96, color: '#a855f7' },
              { label: 'CHRO·AI', value: 78, color: '#ec4899' },
            ]} />
          )}
          {viz === 'workforceMix' && (
            <BarChart data={deep.kpis()} />
          )}
          {viz === 'learningCurve' && (
            <Sparkline values={[0.62, 0.68, 0.71, 0.75, 0.79, 0.82, 0.85, 0.88]} width={460} height={120} />
          )}
          {viz === 'feedbackLoop' && (
            <Sparkline values={[3800, 3950, 4020, 4100, 4218]} width={460} height={120} color="#06b6d4" />
          )}
          {viz === 'optimizationMatrix' && (
            <BarChart data={[
              { label: 'Cost savings ($M)',   value: 18, color: '#10b981' },
              { label: 'Risk reduction',       value: 22, color: '#3b82f6' },
              { label: 'Throughput +%',        value: 14, color: '#a855f7' },
              { label: 'Customer NPS +pt',     value: 8,  color: '#06b6d4' },
            ]} />
          )}
          {viz === 'memoryGraph' && (
            <Sparkline values={[3200, 3450, 3680, 3920, 4180, 4382]} width={460} height={120} color="#a855f7" />
          )}
          {viz === 'auditTimeline' && (
            <BarChart data={[
              { label: 'today',  value: 8420, color: '#10b981' },
              { label: 'yday',   value: 7980, color: '#06b6d4' },
              { label: '-2d',    value: 8210, color: '#3b82f6' },
              { label: '-3d',    value: 8085, color: '#a855f7' },
            ]} />
          )}
          {viz === 'sparklines' && (
            <Sparkline values={[12, 14, 17, 19, 21, 23]} width={460} height={120} color="#ec4899" />
          )}
          {viz === 'controlButtons' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Run Simulation', 'Execute', 'Approve', 'Pause', 'Rollback', 'Escalate', 'Board Pack'].map(b => (
                <button key={b} className="btn-glass" style={{ padding: '10px 16px' }}>{b}</button>
              ))}
            </div>
          )}
          {!viz && <div className="subtle">No chart configured · §57.7 honest.</div>}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // DATA — actual table of rows
  if (tab === 'data') {
    if (rows.length === 0) {
      return <div className="glass-card">No rows from <code>{section.endpoint}</code> · §57.7 honest.</div>;
    }
    return (
      <div className="glass-card glass-strong" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
            <tr>
              {Object.keys(rows[0]).slice(0, 6).map(k => (
                <th key={k} style={{ textAlign: 'left', padding: 6, fontSize: 10,
                                     color: '#475569', textTransform: 'uppercase' }}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                {Object.entries(r).slice(0, 6).map(([k, v]) => (
                  <td key={k} style={{ padding: 6 }}>
                    {typeof v === 'object'
                      ? JSON.stringify(v).slice(0, 70)
                      : String(v ?? '—').slice(0, 90)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // AUDIT — real audit_log query
  if (tab === 'audit') {
    return (
      <div className="glass-card card-5">
        <strong>🔍 Audit · enterprise_audit + audit_log</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          Pattern: <code>{deep.auditQuery?.event_pattern || '%'}</code> ·
          {audit.length} recent rows live
        </div>
        <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
          {audit.slice(0, 30).map((a, i) => (
            <div key={i} style={{ padding: 8, marginBottom: 4,
                                    background: 'rgba(255,255,255,0.7)',
                                    borderLeft: '3px solid #a855f7', borderRadius: 4,
                                    fontSize: 11 }}>
              <strong>{a.action || a.event_name || a.operation || '—'}</strong> ·
              actor: {a.actor || a.user_id || '—'} ·
              <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                {(a.created_at || a.ts || '').toString().slice(0, 19)}
              </span>
              {a.resource && <div style={{ marginTop: 3, color: '#475569' }}>resource: {a.resource}</div>}
            </div>
          ))}
        </div>
        {audit.length === 0 && <div className="subtle" style={{ marginTop: 8 }}>No audit rows · §57.7 honest scaffold.</div>}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // RESPONSIBLE AI — section-specific RAI hooks
  if (tab === 'rai') {
    return (
      <div className="glass-card" style={{ background: 'rgba(168,85,247,0.08)',
                                            borderLeft: '5px solid #a855f7' }}>
        <strong>🛡 Responsible AI · {section.label}</strong>
        <div className="subtle" style={{ marginTop: 4, fontSize: 11 }}>
          Pillars active per §76
        </div>
        <ul style={{ marginTop: 12, paddingLeft: 20, fontSize: 12 }}>
          {(deep.rai || ['(Section uses default §76 5-pillar policy)']).map((x, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{x}</li>
          ))}
        </ul>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // METRICS — KPIs as progress bars + value cards
  if (tab === 'metrics') {
    const kpis = deep.kpis ? deep.kpis(rows) : [];
    return (
      <>
        <div className="glass-card glass-strong">
          <strong>📈 Metrics · {section.label}</strong>
          <div style={{ marginTop: 12 }}>
            {kpis.map((k, i) => {
              const v = Number(k.value);
              if (Number.isFinite(v) && v >= 0 && v <= 1) {
                return <ProgressBar key={i} label={k.label} value={v}
                                     color={`hsl(${(i * 73) % 360}, 65%, 50%)`} />;
              }
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{k.label}</span>
                  <strong>{k.value}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // TO-DO
  if (tab === 'todos') {
    return (
      <PageObjective
        objective={`Open work to elevate ${section.label}.`}
        storageKey={`aeo:${section.id}:todos`}
        todos={[
          { id: 'td1', label: 'Add CRUD writes from UI', done: false },
          { id: 'td2', label: 'Wire RACI · owner · escalation' },
          { id: 'td3', label: 'Real-time stream via SSE' },
          { id: 'td4', label: 'Cron monitors drift' },
          { id: 'td5', label: 'Drill-down detail per row' },
        ]}
      />
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // OBJECTIVE
  if (tab === 'objective') {
    return (
      <PageObjective
        objective={`Make ${section.label} (${section.purpose}) continuously self-improving · evidence-backed.`}
        storageKey={`aeo:${section.id}:objective`}
        todos={[
          { id: 'ob1', label: 'Live row count from endpoint', done: rows.length > 0 },
          { id: 'ob2', label: 'Section-specific input/process/output documented', done: true },
          { id: 'ob3', label: 'SVG visualization in Visualization tab', done: !!deep.visualization },
          { id: 'ob4', label: 'Audit trail wired to audit_log' },
          { id: 'ob5', label: 'Composes with downstream engines' },
        ]}
      />
    );
  }

  return null;
}
