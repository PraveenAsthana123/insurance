// Enterprise workspace: 9-tab top row + sub-tab row + content body.
// Per operator's "Enterprise UI Rule":
//   - Workspace tabs ALWAYS horizontal, ALWAYS top, ALWAYS single row
//   - Sub-tabs appear in the row below only for the active tab
//   - Body below = components

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area,
} from 'recharts';
import {
  OverviewTab, HitlFeedback,
  TabTimestamp, TabTransactionHistory, TabDatabaseOps, TabTodoByRole,
} from './tabs/BankTabs';
import {
  TAB_FRAMEWORK_MAP, SDLC_BY_ID, OPS_BY_ID, TIER_BY_ID,
} from './BankFrameworkData';
import { canonicalDomainId, domainMeta } from '../../utils/insuranceNavigation';
import { TAB_OBJECTIVE_EVIDENCE, scoreTab, evaluateObjective } from './tabs/tab-objective-evidence';
import { TAB_TECHNICAL_BRIEF } from './tabs/tab-technical-brief';

// ─────────────────────────────────────────────────────────────────────
// Operator 2026-06-05: "save all input prompt and show on UI".
// saveAction() extends prompt-history to capture every operator button
// click (kind='action') and every endpoint probe (kind='api'). Mirrors
// savePrompt() in BankHeader.jsx — same shape, same localStorage key,
// same 'insur:prompt-saved' event, so PromptHistorySection live-updates.
// ─────────────────────────────────────────────────────────────────────
export function saveAction(kind, text, extra = {}) {
  try {
    const url = new URL(window.location.href);
    const entry = {
      id: Date.now() + Math.random(),
      at: Date.now(),
      kind,           // 'action' | 'api' | 'navigation'
      text,
      role: localStorage.getItem('insur.activeRole') || 'unknown',
      url: url.pathname + url.search,
      ...extra,
    };
    const log = JSON.parse(localStorage.getItem('insur.prompts') || '[]');
    log.unshift(entry);
    localStorage.setItem('insur.prompts', JSON.stringify(log.slice(0, 200)));
    window.dispatchEvent(new CustomEvent('insur:prompt-saved', { detail: entry }));
  } catch (e) { /* ignore */ }
}

// apiProbe — fetch the endpoint inferred from a REST row. Returns
// { ok, http_status, body, latency_ms, fallback?: true, error? }.
// Used by ResourceCard endpoint rows + logs to prompt history.
export async function apiProbe(method, path, body) {
  const start = performance.now();
  // Synthesise plausible bodies for POST/PATCH so the call has shape.
  const init = { method, headers: { 'Content-Type': 'application/json' } };
  if (method === 'POST' || method === 'PATCH') {
    init.body = JSON.stringify(body || { tenant_id: 'demo', actor: 'workspace-ui' });
  }
  // Convert :id placeholders to a stub UUID so the path resolves.
  const resolved = path.replace(/:[A-Za-z_]+/g, '00000000-0000-0000-0000-000000000001');
  try {
    const res = await fetch(resolved, init);
    let json = null;
    try { json = await res.json(); } catch (_) { /* swallow */ }
    return {
      ok: res.ok,
      http_status: res.status,
      body: json,
      latency_ms: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      ok: false,
      fallback: true,
      http_status: 0,
      body: null,
      latency_ms: Math.round(performance.now() - start),
      error: err.message,
    };
  }
}

// 22-tab Recommended Final spec — operator 2026-06-05 (stacked rev).
// Tab → Sub Tab → Components (max 3 levels).
const TABS = [
  // ----- Architecture / planning entry-point -----
  { id: 'readme',       label: 'README',           color: '#2563eb', subTabs: [
    { id: 'brd',           label: 'BRD' },
    { id: 'frd',           label: 'FRD' },
    { id: 'hld',           label: 'HLD' },
    { id: 'lld',           label: 'LLD' },
    { id: 'sad',           label: 'SAD' },
    { id: 'c4',            label: 'C4 Model' },
    { id: 'sequence',      label: 'Sequence' },
    { id: 'network',       label: 'Network' },
    { id: 'api',           label: 'API' },
    { id: 'db',            label: 'DB Schema' },
    { id: 'adr',           label: 'ADR' },
    { id: 'runbook',       label: 'Runbook' },
    { id: 'roadmap',       label: 'Roadmap' },
    { id: 'stakeholders',  label: 'Stakeholders' },
    { id: 'exec-summary',  label: 'Exec Summary' },
    { id: 'capacity',      label: 'Capacity' },
    { id: 'ai-strategy',   label: 'AI Strategy' },
    { id: 'cost',          label: 'Cost Analysis' },
  ]},
  { id: 'overview',     label: 'Overview',         color: '#475569', subTabs: [] },
  { id: 'problem-as-is', label: 'Problem / AS-IS', color: '#ef4444', subTabs: [
    { id: 'problem', label: 'Problem' },
    { id: 'pain', label: 'Pain / Impact' },
    { id: 'as-is', label: 'AS-IS Process' },
    { id: 'current-state', label: 'Current State' },
    { id: 'gap', label: 'Gap' },
  ]},
  { id: 'to-be', label: 'TO-BE', color: '#16a34a', subTabs: [
    { id: 'future-state', label: 'Future State' },
    { id: 'target-process', label: 'Target Process' },
    { id: 'success', label: 'Success Outcome' },
    { id: 'roadmap', label: 'Roadmap' },
  ]},
  { id: 'ai-strategy', label: 'AI Strategy', color: '#7c3aed', subTabs: [
    { id: 'fit', label: 'AI Fit' },
    { id: 'primary-secondary', label: 'Primary / Secondary / Third' },
    { id: 'use-case', label: 'Use Case' },
    { id: 'value', label: 'Value' },
    { id: 'risk', label: 'Risk' },
  ]},
  { id: 'digital-transformation', label: 'Digital Transformation', color: '#0891b2', subTabs: [
    { id: 'capability', label: 'Capability' },
    { id: 'people-process-tech', label: 'People / Process / Tech' },
    { id: 'adoption', label: 'Adoption' },
    { id: 'change', label: 'Change Plan' },
  ]},
  { id: 'manual-transaction', label: 'Transaction · Manual', color: '#f97316', subTabs: [
    { id: 'user-steps', label: 'User Steps' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'controls', label: 'Controls' },
    { id: 'handoffs', label: 'Handoffs' },
    { id: 'exceptions', label: 'Exceptions' },
  ]},
  // OP-13 (2026-06-14): operator "create one new tab where I want to explore
  // other layout · left and right side layout with component approach".
  // Manual Explore is a sandbox tab for the SEQUENCE+OPERATIONS side-by-side
  // layout (LEFT: numbered sequence steps · RIGHT: operation buttons).
  // Renders via custom branch — does NOT fall through to renderSpecTab.
  { id: 'manual-explore', label: 'Manual · Explore Layout', color: '#ea580c', subTabs: [
    { id: 'sequence-ops', label: 'Sequence + Ops' },
    { id: 'split-canvas', label: 'Split Canvas' },
    { id: 'compare', label: 'Compare Layouts' },
  ]},
  { id: 'automatic-pipeline', label: 'Transaction · Automatic Pipeline', color: '#0d9488', subTabs: [
    { id: 'trigger', label: 'Trigger' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'orchestration', label: 'Orchestration' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'fallback', label: 'Fallback' },
  ]},
  { id: 'accuracy-benchmarking', label: 'Accuracy / Benchmarking', color: '#ca8a04', subTabs: [
    { id: 'metrics', label: 'Metrics' },
    { id: 'baseline', label: 'Baseline' },
    { id: 'benchmark', label: 'Benchmark' },
    { id: 'thresholds', label: 'Thresholds' },
    { id: 'evidence', label: 'Evidence' },
  ]},
  { id: 'analytical-ai-process', label: 'Analytical AI Process', color: '#f59e0b', subTabs: [
    { id: 'question', label: 'Analytical Question' },
    { id: 'features', label: 'Features' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insight', label: 'Insight' },
    { id: 'decision', label: 'Decision Support' },
  ]},
  { id: 'ai-control-tower', label: 'AI Control Tower', color: '#2563eb', subTabs: [
    { id: 'health', label: 'Health' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'drift', label: 'Drift' },
    { id: 'cost', label: 'Cost' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'approvals', label: 'Approvals' },
  ]},
  // ----- Product Manager: stories + roadmap planning -----
  { id: 'product-mgr',  label: 'Product Manager',  color: '#7e22ce', subTabs: [
    { id: 'vision',      label: 'Vision' },
    { id: 'roadmap',     label: 'Roadmap' },
    { id: 'epics',       label: 'Epics' },
    { id: 'stories',     label: 'Stories' },
    { id: 'sub-stories', label: 'Sub Stories' },
    { id: 'backlog',     label: 'Backlog' },
    { id: 'sprint',      label: 'Sprint Plan' },
    { id: 'releases',    label: 'Releases' },
    { id: 'kpis',        label: 'Product KPIs' },
    { id: 'feedback',    label: 'Customer Feedback' },
  ]},
  { id: 'process',      label: 'Process',          color: '#3b82f6', subTabs: [
    { id: 'workflow',  label: 'Workflow' },
    { id: 'manual',    label: 'Manual Execution' },
    { id: 'automatic', label: 'Automatic Execution' },
    { id: 'pipeline',  label: 'Pipeline Status' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'history',   label: 'History' },
  ]},
  { id: 'data',         label: 'Data',             color: '#0ea5e9', subTabs: [
    { id: 'sources',     label: 'Data Sources' },
    { id: 'discovery',   label: 'Discovery' },
    { id: 'quality',     label: 'Quality' },
    { id: 'preparation', label: 'Preparation' },
    { id: 'master-data', label: 'Master Data' },
    { id: 'metadata',    label: 'Metadata' },
    { id: 'lineage',     label: 'Lineage' },
    { id: 'security',    label: 'Security' },
    { id: 'monitoring',  label: 'Monitoring' },
  ]},
  { id: 'analytics',    label: 'Analytics',        color: '#f59e0b', subTabs: [
    { id: 'eda',             label: 'EDA' },
    { id: 'features',        label: 'Feature Engineering' },
    { id: 'evaluation',      label: 'Evaluation' },
    { id: 'explainability',  label: 'Explainability' },
  ]},
  { id: 'ai',           label: 'AI',               color: '#8b5cf6', subTabs: [
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'models',       label: 'Models' },
    { id: 'agents',       label: 'Agents' },
    { id: 'experiments',  label: 'Experiments' },
    { id: 'registry',     label: 'Registry' },
  ]},
  // ----- NEW tabs (operator 2026-06-05) -----
  { id: 'user-story',   label: 'User Story',       color: '#a855f7', subTabs: [
    { id: 'business',    label: 'Business Story' },
    { id: 'functional',  label: 'Functional Story' },
    { id: 'ai-story',    label: 'AI Story' },
    { id: 'acceptance',  label: 'Acceptance Criteria' },
  ]},
  { id: 'user-demo',    label: 'User Demo',        color: '#d946ef', subTabs: [
    { id: 'script',      label: 'Demo Script' },
    { id: 'data',        label: 'Demo Data' },
    { id: 'results',     label: 'Demo Results' },
    { id: 'recording',   label: 'Demo Recording' },
  ]},
  { id: 'exp-ai',       label: 'Explainable AI',   color: '#7c3aed', subTabs: [
    { id: 'shap',          label: 'SHAP' },
    { id: 'lime',          label: 'LIME' },
    { id: 'importance',    label: 'Feature Importance' },
    { id: 'decision-path', label: 'Decision Path' },
    { id: 'counterfactual',label: 'Counterfactual' },
  ]},
  { id: 'res-ai',       label: 'Responsible AI',   color: '#f97316', subTabs: [
    { id: 'fairness',     label: 'Fairness' },
    { id: 'bias',         label: 'Bias' },
    { id: 'transparency', label: 'Transparency' },
    { id: 'accountability', label: 'Accountability' },
    { id: 'oversight',    label: 'Human Oversight' },
  ]},
  { id: 'gov-ai',       label: 'Governance AI',    color: '#dc2626', subTabs: [
    { id: 'policies',   label: 'Policies' },
    { id: 'controls',   label: 'Controls' },
    { id: 'approvals',  label: 'Approvals' },
    { id: 'audit',      label: 'Audit' },
    { id: 'risk',       label: 'Risk' },
  ]},
  { id: 'comp-ai',      label: 'Compliance AI',    color: '#b91c1c', subTabs: [
    { id: 'regulations', label: 'Regulations' },
    { id: 'controls',    label: 'Controls' },
    { id: 'monitoring',  label: 'Monitoring' },
    { id: 'violations',  label: 'Violations' },
    { id: 'reporting',   label: 'Reporting' },
  ]},
  { id: 'inc-ai',       label: 'Incident AI',      color: '#ef4444', subTabs: [
    { id: 'detection',     label: 'Detection' },
    { id: 'investigation', label: 'Investigation' },
    { id: 'resolution',    label: 'Resolution' },
    { id: 'postmortem',    label: 'Post Mortem' },
  ]},
  { id: 'meet-ai',      label: 'Meeting AI',       color: '#0891b2', subTabs: [
    { id: 'schedule',     label: 'Schedule' },
    { id: 'transcript',   label: 'Transcript' },
    { id: 'summary',      label: 'Summary' },
    { id: 'action-items', label: 'Action Items' },
  ]},
  { id: 'note-ai',      label: 'Note AI',          color: '#0e7490', subTabs: [
    { id: 'notes',     label: 'Notes' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'tags',      label: 'Tags' },
    { id: 'search',    label: 'Search' },
  ]},
  { id: 'test-ai',      label: 'Test AI',          color: '#0d9488', subTabs: [
    // Scenario classes
    { id: 'positive',   label: 'Positive' },
    { id: 'negative',   label: 'Negative' },
    { id: 'boundary',   label: 'Boundary' },
    { id: 'regression', label: 'Regression' },
    // Test surfaces (operator: API · Model · Data · Manual · Pipeline)
    { id: 'api',        label: 'API Tests' },
    { id: 'model',      label: 'Model Tests' },
    { id: 'data',       label: 'Data Tests' },
    { id: 'manual',     label: 'Manual Tests' },
    { id: 'pipeline',   label: 'Pipeline Tests' },
    // Outcomes
    { id: 'cases',      label: 'Test Cases' },
    { id: 'execution',  label: 'Execution' },
    { id: 'defects',    label: 'Defects' },
    { id: 'coverage',   label: 'Coverage' },
  ]},
  { id: 'job-ai',       label: 'Job AI',           color: '#15803d', subTabs: [
    { id: 'jobs',       label: 'Jobs' },
    { id: 'cron',       label: 'Cron' },
    { id: 'schedules',  label: 'Schedules' },
    { id: 'execution',  label: 'Execution' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'failures',   label: 'Failures' },
    { id: 'retries',    label: 'Retries' },
  ]},
  { id: 'biz-value',    label: 'Business Value',   color: '#16a34a', subTabs: [
    { id: 'revenue',      label: 'Revenue' },
    { id: 'cost',         label: 'Cost' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'risk',         label: 'Risk' },
    { id: 'compliance',   label: 'Compliance' },
    { id: 'customer',     label: 'Customer' },
    { id: 'employee',     label: 'Employee' },
    { id: 'esg',          label: 'ESG' },
    { id: 'roi',          label: 'ROI' },
  ]},
  // ----- Dashboard back (operator: 'dashboard tab must have all the dashboards & graphs') -----
  { id: 'dashboard',    label: 'Dashboard',        color: '#0ea5e9', subTabs: [
    { id: 'executive',   label: 'Executive' },
    { id: 'manager',     label: 'Manager' },
    { id: 'team',        label: 'Team' },
    { id: 'kpi',         label: 'KPI Scorecard' },
    { id: 'sla',         label: 'SLA' },
    { id: 'finops',      label: 'FinOps' },
    { id: 'incidents',   label: 'Incidents' },
    { id: 'fairness',    label: 'Fairness' },
    { id: 'drift',       label: 'Drift' },
    { id: 'model-fleet', label: 'Model Fleet' },
    { id: 'biz-value',   label: 'Business Value' },
    { id: 'cost',        label: 'Cost' },
    { id: 'risk',        label: 'Risk' },
    { id: 'usage',       label: 'Usage' },
    { id: 'adoption',    label: 'Adoption' },
  ]},
  { id: 'operations',   label: 'Operations',       color: '#059669', subTabs: [
    { id: 'monitoring',    label: 'Monitoring' },
    { id: 'jobs',          label: 'Jobs' },
    { id: 'incidents',     label: 'Incidents' },
    { id: 'alerts',        label: 'Alerts' },
    { id: 'deployment',    label: 'Deployment' },
    { id: 'rollback',      label: 'Rollback' },
    { id: 'logs',          label: 'Logs' },
    { id: 'observability', label: 'Observability' },
    { id: 'sla',           label: 'SLA' },
  ]},
  { id: 'reports',      label: 'Reports',          color: '#6366f1', subTabs: [
    { id: 'executive',  label: 'Executive' },
    { id: 'business',   label: 'Business' },
    { id: 'technical',  label: 'Technical' },
    { id: 'financial',  label: 'Financial' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'audit',      label: 'Audit' },
  ]},
];


const TAB_QUERY_ALIASES = {
  problem: 'problem-as-is',
  'as-is': 'problem-as-is',
  asis: 'problem-as-is',
  tobe: 'to-be',
  'to-be': 'to-be',
  strategy: 'ai-strategy',
  'ai-strategy': 'ai-strategy',
  transformation: 'digital-transformation',
  'digital-transformation': 'digital-transformation',
  manual: 'manual-transaction',
  'manual-transaction': 'manual-transaction',
  automatic: 'automatic-pipeline',
  pipeline: 'automatic-pipeline',
  accuracy: 'accuracy-benchmarking',
  benchmarking: 'accuracy-benchmarking',
  analytical: 'analytical-ai-process',
  'analytical-ai': 'analytical-ai-process',
  controltower: 'ai-control-tower',
  'control-tower': 'ai-control-tower',
  resai: 'res-ai',
  'res-ai': 'res-ai',
  expai: 'exp-ai',
  'exp-ai': 'exp-ai',
  govai: 'gov-ai',
  'gov-ai': 'gov-ai',
  governance: 'gov-ai',
  compai: 'comp-ai',
  'comp-ai': 'comp-ai',
  compliance: 'comp-ai',
};

function normalizeTabId(tabId) {
  if (!tabId) return '';
  return TAB_QUERY_ALIASES[tabId] || tabId;
}

function tabHasSub(tab, subId) {
  return !!(tab && subId && (tab.subTabs || []).some((s) => s.id === subId));
}

function resolveDeepLinkTabId(tabId, subId) {
  const normalized = normalizeTabId(tabId);
  const requestedTab = TABS.find((t) => t.id === normalized);
  if (requestedTab && (!subId || tabHasSub(requestedTab, subId))) {
    return requestedTab.id;
  }
  if (subId) {
    const owningTab = TABS.find((t) => tabHasSub(t, subId));
    if (owningTab) return owningTab.id;
  }
  return requestedTab?.id || '';
}

// Tab supergroups — operator: "22 tabs is overwhelming". Group into 3 lenses:
//   📋 Plan  — strategic / design (read mostly)
//   🛠 Build — engineering (read+write)
//   🚀 Run   — production operations (read+monitor)
// Each tab can belong to multiple groups; if not listed, falls under "All".
const TAB_GROUPS = {
  '📋 Plan':  ['readme', 'overview', 'problem-as-is', 'to-be', 'ai-strategy', 'digital-transformation', 'product-mgr', 'user-story', 'user-demo', 'biz-value'],
  '🛠 Build': ['process', 'data', 'manual-transaction', 'automatic-pipeline', 'analytical-ai-process', 'analytics', 'ai', 'accuracy-benchmarking', 'test-ai', 'job-ai', 'note-ai'],
  '🚀 Run':   ['dashboard', 'ai-control-tower', 'operations', 'reports', 'meet-ai', 'inc-ai', 'exp-ai', 'res-ai', 'gov-ai', 'comp-ai'],
};

// Role → visible tab IDs. Tech roles see all 22 tabs; non-tech roles see
// progressively narrower subsets so the workspace matches their decisions.
const ROLE_VISIBLE_TABS = {
  // Business User — strategic + value lens, hides engineering depth
  'business user': new Set([
    'readme', 'overview', 'problem-as-is', 'to-be', 'ai-strategy', 'digital-transformation', 'product-mgr', 'user-story', 'user-demo',
    'process', 'data', 'manual-transaction', 'automatic-pipeline', 'biz-value', 'dashboard', 'reports',
    'res-ai', 'gov-ai', 'comp-ai',
  ]),
  // Manager — business + ops + governance, hides pure data/model details
  'manager': new Set([
    'readme', 'overview', 'problem-as-is', 'to-be', 'ai-strategy', 'digital-transformation', 'product-mgr', 'user-story', 'user-demo',
    'process', 'manual-transaction', 'automatic-pipeline', 'biz-value', 'dashboard', 'operations', 'reports',
    'res-ai', 'gov-ai', 'comp-ai', 'inc-ai', 'meet-ai',
  ]),
  // Analyst — analytics + data + reports
  'analyst': new Set([
    'readme', 'overview', 'problem-as-is', 'to-be', 'data', 'analytics', 'analytical-ai-process', 'accuracy-benchmarking', 'biz-value',
    'dashboard', 'reports', 'exp-ai', 'res-ai',
  ]),
  // Security — gov / comp / inc / audit
  'security': new Set([
    'readme', 'overview', 'data', 'operations', 'ai-control-tower',
    'gov-ai', 'comp-ai', 'inc-ai', 'test-ai',
    'dashboard', 'reports',
  ]),
  // Operations — run+ship lens
  'operations': new Set([
    'readme', 'overview', 'process', 'manual-transaction', 'automatic-pipeline', 'operations', 'ai-control-tower', 'job-ai', 'inc-ai',
    'meet-ai', 'note-ai', 'dashboard', 'reports',
  ]),
};
function getVisibleTabIdsForRole(role) {
  if (!role) return null;
  if (isTechRole(role)) return null; // tech roles see all 22 tabs
  const key = role.toLowerCase().trim();
  const set = ROLE_VISIBLE_TABS[key];
  return set || null;
}

// Sub-tab visibility per role — hide deeply technical sub-tabs from non-tech roles.
// Keyed as `${tabId}.${subTabId}`. If the key is in the set for a role,
// that sub-tab is HIDDEN. Engineer / Data Scientist / etc. see everything.
const ROLE_HIDDEN_SUBTABS = {
  'business user': new Set([
    // README — hide low-level architecture
    'readme.c4', 'readme.lld', 'readme.sequence', 'readme.network',
    'readme.api', 'readme.db', 'readme.adr', 'readme.runbook', 'readme.capacity',
    // Test AI — hide engineering surfaces
    'test-ai.pipeline', 'test-ai.model', 'test-ai.api', 'test-ai.regression', 'test-ai.boundary',
    'test-ai.cases', 'test-ai.execution', 'test-ai.defects', 'test-ai.coverage',
    // Operations — hide infra
    'operations.logs', 'operations.observability', 'operations.deployment', 'operations.rollback',
    // Data — hide low-level
    'data.metadata', 'data.lineage', 'data.security',
  ]),
  'manager': new Set([
    'readme.c4', 'readme.lld', 'readme.sequence', 'readme.network',
    'readme.api', 'readme.db', 'readme.capacity',
    'operations.logs', 'operations.observability', 'operations.rollback',
  ]),
  'analyst': new Set([
    'readme.adr', 'readme.runbook', 'readme.network', 'readme.sequence', 'readme.api', 'readme.db',
  ]),
  'security': new Set([
    'readme.product-mgr', 'readme.exec-summary',
  ]),
  'operations': new Set([
    'readme.brd', 'readme.lld', 'readme.api', 'readme.db', 'readme.adr',
  ]),
};

function getVisibleSubTabsForRole(tabId, subTabs, role) {
  if (!role || isTechRole(role)) return subTabs;
  const hidden = ROLE_HIDDEN_SUBTABS[role.toLowerCase().trim()];
  if (!hidden) return subTabs;
  return subTabs.filter((s) => !hidden.has(`${tabId}.${s.id}`));
}

// SPEC: per-(tab, sub-tab) component + KPI catalog.
// Spec-driven so we never fabricate values — cards show field labels;
// real values come from blueprint when the operator wires them.
const TAB_SPEC = {
  // ---- Workarea operating flow ----
  'problem-as-is.problem':       { components: ['Problem Statement', 'Business Pain', 'Affected Stakeholder', 'Severity', 'Current Evidence'], kpis: ['Pain score', 'Incident count'], visuals: ['Problem heatmap'] },
  'problem-as-is.pain':          { components: ['Customer Impact', 'Agent Impact', 'Operations Impact', 'Dollar Impact', 'Risk Impact'], kpis: ['Cost of pain', 'SLA breach rate'], visuals: ['Pain by stakeholder'] },
  'problem-as-is.as-is':         { components: ['Current Manual Step', 'Current System Step', 'Current Handoff', 'Current Control', 'Known Defect'], kpis: ['Cycle time', 'Rework rate'], visuals: ['AS-IS flow'] },
  'problem-as-is.current-state': { components: ['Current Data', 'Current Application', 'Current Team', 'Current SLA', 'Current Report'], kpis: ['Current SLA', 'Open backlog'], visuals: ['Current-state dashboard'] },
  'problem-as-is.gap':           { components: ['Capability Gap', 'Data Gap', 'Process Gap', 'Technology Gap', 'Governance Gap'], kpis: ['Gap score', 'Closure effort'], visuals: ['Gap matrix'] },

  'to-be.future-state':          { components: ['Target Experience', 'Target Process', 'Target Control', 'Target SLA', 'Target Outcome'], kpis: ['Target SLA', 'Expected ROI'], visuals: ['TO-BE blueprint'] },
  'to-be.target-process':        { components: ['Future User Step', 'Future System Step', 'Automation Step', 'Approval Step', 'Exception Path'], kpis: ['Automation rate', 'Expected cycle time'], visuals: ['TO-BE process flow'] },
  'to-be.success':               { components: ['Success Criteria', 'Acceptance Rule', 'Business Outcome', 'Operational Outcome', 'Technical Outcome'], kpis: ['Acceptance pass rate', 'Outcome score'], visuals: ['Outcome scorecard'] },
  'to-be.roadmap':               { components: ['Phase 1', 'Phase 2', 'Phase 3', 'Dependency', 'Release Gate'], kpis: ['Milestone readiness', 'Dependency risk'], visuals: ['Roadmap'] },

  'ai-strategy.fit':             { components: ['Business Problem', 'Primary AI Type', 'Secondary AI Type', 'Third AI Type', 'Why AI Is Needed'], kpis: ['AI fit score', 'Expected lift'], visuals: ['AI fit matrix'] },
  'ai-strategy.primary-secondary': { components: ['Primary AI Type', 'Secondary AI Type', 'Third / Support AI Type', 'Operation Boundary', 'Out-of-scope Boundary'], kpis: ['Fit confidence', 'Governance readiness'], visuals: ['AI type segmentation'] },
  'ai-strategy.use-case':        { components: ['Use Case Name', 'User Persona', 'Decision Point', 'Input / Output', 'Value Hypothesis'], kpis: ['Use-case readiness', 'Value confidence'], visuals: ['Use-case map'] },
  'ai-strategy.value':           { components: ['Revenue Impact', 'Cost Impact', 'Productivity Impact', 'Risk Impact', 'Customer Impact'], kpis: ['ROI', 'Payback period'], visuals: ['Value waterfall'] },
  'ai-strategy.risk':            { components: ['Model Risk', 'Data Risk', 'Process Risk', 'Compliance Risk', 'Human Oversight'], kpis: ['Risk score', 'Control coverage'], visuals: ['Risk matrix'] },

  'digital-transformation.capability': { components: ['Business Capability', 'Digital Capability', 'Platform Capability', 'AI Capability', 'Operating Model Capability'], kpis: ['Capability maturity', 'Adoption readiness'], visuals: ['Capability map'] },
  'digital-transformation.people-process-tech': { components: ['People Change', 'Process Change', 'Technology Change', 'Data Change', 'Governance Change'], kpis: ['Change readiness', 'Training coverage'], visuals: ['Transformation matrix'] },
  'digital-transformation.adoption': { components: ['User Adoption', 'Training Plan', 'Comms Plan', 'Feedback Loop', 'Adoption Barrier'], kpis: ['Adoption rate', 'Active users'], visuals: ['Adoption curve'] },
  'digital-transformation.change': { components: ['Change Request', 'Impact Assessment', 'Approval Plan', 'Rollout Plan', 'Hypercare Plan'], kpis: ['Change risk', 'Hypercare incidents'], visuals: ['Change journey'] },

  'manual-transaction.user-steps': { components: ['User Task', 'Screen / Form', 'Manual Decision', 'Manual Handoff', 'Manual Approval'], kpis: ['Manual effort', 'Touch time'], visuals: ['Manual journey'] },
  'manual-transaction.inputs':     { components: ['User Input', 'Document Input', 'System Input', 'Validation Rule', 'Missing Input'], kpis: ['Input completeness', 'Input error rate'], visuals: ['Input quality'] },
  'manual-transaction.controls':   { components: ['Manual Control', 'Maker Checker', 'Policy Check', 'Audit Evidence', 'Exception Approval'], kpis: ['Control pass rate', 'Override rate'], visuals: ['Control map'] },
  'manual-transaction.handoffs':   { components: ['Team Handoff', 'Queue Handoff', 'System Handoff', 'SLA Timer', 'Escalation'], kpis: ['Handoff delay', 'Queue age'], visuals: ['Handoff flow'] },
  'manual-transaction.exceptions': { components: ['Exception Type', 'Manual Workaround', 'Escalation Path', 'Resolution Owner', 'Closure Evidence'], kpis: ['Exception rate', 'Mean time to resolve'], visuals: ['Exception trend'] },

  'automatic-pipeline.trigger':       { components: ['Trigger Event', 'Trigger Source', 'Schedule', 'Idempotency Rule', 'Retry Rule'], kpis: ['Trigger success', 'Duplicate prevention'], visuals: ['Trigger map'] },
  'automatic-pipeline.pipeline':      { components: ['Ingestion', 'Validation', 'Transformation', 'Inference / Rule Step', 'Output Publish'], kpis: ['Pipeline success', 'Latency'], visuals: ['Pipeline DAG'] },
  'automatic-pipeline.orchestration': { components: ['Workflow Engine', 'Task Queue', 'Agent / Service', 'Dependency', 'State Transition'], kpis: ['Task success', 'Dependency health'], visuals: ['Orchestration flow'] },
  'automatic-pipeline.monitoring':    { components: ['Health Check', 'Alert', 'Drift Signal', 'SLA Signal', 'Audit Signal'], kpis: ['Alert rate', 'SLA pass rate'], visuals: ['Monitoring panel'] },
  'automatic-pipeline.fallback':      { components: ['Fallback Rule', 'Manual Takeover', 'Rollback', 'Retry', 'Customer Communication'], kpis: ['Fallback rate', 'Recovery time'], visuals: ['Fallback path'] },

  'accuracy-benchmarking.metrics':    { components: ['Accuracy Metric', 'Quality Metric', 'Latency Metric', 'Cost Metric', 'Risk Metric'], kpis: ['Accuracy', 'P95 latency'], visuals: ['Metric trend'] },
  'accuracy-benchmarking.baseline':   { components: ['Manual Baseline', 'Previous Model Baseline', 'Rule Baseline', 'Human Benchmark', 'Industry Benchmark'], kpis: ['Baseline delta', 'Lift'], visuals: ['Baseline comparison'] },
  'accuracy-benchmarking.benchmark':  { components: ['Benchmark Dataset', 'Benchmark Run', 'Benchmark Result', 'Error Slice', 'Winner / Challenger'], kpis: ['Benchmark score', 'Error rate'], visuals: ['Benchmark leaderboard'] },
  'accuracy-benchmarking.thresholds': { components: ['Pass Threshold', 'Warning Threshold', 'Fail Threshold', 'Escalation Threshold', 'Rollback Threshold'], kpis: ['Threshold pass rate', 'Breach count'], visuals: ['Threshold gauge'] },
  'accuracy-benchmarking.evidence':   { components: ['Test Evidence', 'Metric Evidence', 'Data Evidence', 'Reviewer Evidence', 'Release Evidence'], kpis: ['Evidence completeness', 'Approval readiness'], visuals: ['Evidence checklist'] },

  'analytical-ai-process.question': { components: ['Business Question', 'Analytical Hypothesis', 'Decision User', 'Time Horizon', 'Expected Action'], kpis: ['Question clarity', 'Decision value'], visuals: ['Question map'] },
  'analytical-ai-process.features': { components: ['Feature Source', 'Feature Definition', 'Feature Quality', 'Feature Drift', 'Feature Importance'], kpis: ['Feature coverage', 'Feature stability'], visuals: ['Feature importance'] },
  'analytical-ai-process.analysis': { components: ['EDA', 'Segmentation', 'Correlation', 'Trend', 'Anomaly'], kpis: ['Insight confidence', 'Anomaly count'], visuals: ['Analysis dashboard'] },
  'analytical-ai-process.insight':  { components: ['Insight', 'Evidence', 'Recommendation', 'Limitation', 'Owner Action'], kpis: ['Insight adoption', 'Action conversion'], visuals: ['Insight cards'] },
  'analytical-ai-process.decision': { components: ['Decision Option', 'Decision Criteria', 'Tradeoff', 'Recommendation', 'Approval'], kpis: ['Decision time', 'Decision accuracy'], visuals: ['Decision matrix'] },

  'ai-control-tower.health':    { components: ['Model Health', 'Data Health', 'Pipeline Health', 'API Health', 'Business Health'], kpis: ['Health score', 'Availability'], visuals: ['Health dashboard'] },
  'ai-control-tower.alerts':    { components: ['Alert Type', 'Severity', 'Owner', 'Runbook', 'SLA'], kpis: ['Open alerts', 'MTTA'], visuals: ['Alert queue'] },
  'ai-control-tower.drift':     { components: ['Data Drift', 'Model Drift', 'Concept Drift', 'Population Stability', 'Retraining Trigger'], kpis: ['PSI', 'Drift rate'], visuals: ['Drift trend'] },
  'ai-control-tower.cost':      { components: ['Token Cost', 'Compute Cost', 'Storage Cost', 'Run Cost', 'Optimization Action'], kpis: ['Cost per run', 'Monthly cost'], visuals: ['Cost dashboard'] },
  'ai-control-tower.incidents': { components: ['Incident', 'Impact', 'Root Cause', 'Resolution', 'Postmortem'], kpis: ['Incident count', 'MTTR'], visuals: ['Incident timeline'] },
  'ai-control-tower.approvals': { components: ['Approval Request', 'Approver', 'Policy Gate', 'Evidence', 'Decision'], kpis: ['Approval SLA', 'Pending approvals'], visuals: ['Approval board'] },

  // ---- User Story ----
  'user-story.business':    { components: ['Story ID', 'Epic', 'Feature', 'Business Goal', 'Business Value', 'Stakeholders', 'Priority'] },
  'user-story.functional':  { components: ['As a User', 'I Want', 'So That', 'Process Flow', 'Business Rules', 'Dependencies'] },
  'user-story.ai-story':    { components: ['AI Type', 'Model', 'Agent', 'Data Source', 'Expected Outcome'] },
  'user-story.acceptance':  { components: ['Success Criteria', 'Test Scenarios', 'Expected Results', 'Approval'] },

  // ---- User Demo ----
  'user-demo.script':       { components: ['Demo Objective', 'Demo Steps'] },
  'user-demo.data':         { components: ['Sample Dataset'] },
  'user-demo.results':      { components: ['Expected Output', 'Screenshots', 'Feedback'] },
  'user-demo.recording':    { components: ['Video', 'Feedback'] },

  // ---- Explainable AI ----
  'exp-ai.shap':            { components: ['Prediction', 'Explanation', 'Top Features', 'Confidence Score', 'Why Approved', 'Why Rejected', 'Business Reason'], visuals: ['SHAP Chart'] },
  'exp-ai.lime':            { components: ['Local Explanation', 'Top Features', 'Confidence Score'], visuals: ['LIME Plot'] },
  'exp-ai.importance':      { components: ['Feature Ranking', 'Importance Score', 'Direction (+/-)'], visuals: ['Feature Ranking'] },
  'exp-ai.decision-path':   { components: ['Decision Steps', 'Branch Conditions', 'Outcome'], visuals: ['Decision Tree'] },
  'exp-ai.counterfactual':  { components: ['Original Input', 'Minimum Change', 'Counterfactual Output'], visuals: ['Waterfall Chart'] },

  // ---- Responsible AI ----
  'res-ai.fairness':        { components: ['Fairness Score', 'Protected Attributes', 'Group Comparison'] },
  'res-ai.bias':            { components: ['Bias Score', 'Disparate Impact', 'Equal Opportunity Gap'] },
  'res-ai.transparency':    { components: ['Model Card', 'Disclosure Statement', 'User Notice'] },
  'res-ai.accountability':  { components: ['Owner', 'Escalation Rules', 'Risk Level'] },
  'res-ai.oversight':       { components: ['Human Review', 'HITL Threshold', 'Override Rate'] },

  // ---- Governance AI ----
  'gov-ai.policies':        { components: ['Policy Registry', 'Policy Version', 'Effective Date', 'Owner'] },
  'gov-ai.controls':        { components: ['Control Mapping', 'Control Effectiveness', 'Last Tested'] },
  'gov-ai.approvals':       { components: ['Approval Workflow', 'Approver', 'SLA', 'Status'] },
  'gov-ai.audit':           { components: ['Audit Trail', 'Audit Findings', 'Remediation Plan'] },
  'gov-ai.risk':            { components: ['Governance Score', 'Exception Management', 'Risk Register'] },

  // ---- Compliance AI ----
  'comp-ai.regulations':    { components: ['Compliance Rules', 'Regulatory Mapping'] },
  'comp-ai.controls':       { components: ['Control Catalog', 'Coverage %'] },
  'comp-ai.monitoring':     { components: ['Compliance Score', 'Daily Checks'] },
  'comp-ai.violations':     { components: ['Violation Tracking', 'Severity', 'Owner'] },
  'comp-ai.reporting':      { components: ['Corrective Actions', 'Regulator Reports'] },

  // ---- Incident AI ----
  'inc-ai.detection':       { components: ['Incident ID', 'Severity', 'Affected Systems', 'Detected At'] },
  'inc-ai.investigation':   { components: ['Root Cause', 'Timeline', 'Investigator'] },
  'inc-ai.resolution':      { components: ['Actions Taken', 'Resolution Status', 'Resolved At'] },
  'inc-ai.postmortem':      { components: ['Lessons Learned', 'Preventive Actions', 'Owner'] },

  // ---- Meeting AI ----
  'meet-ai.schedule':       { components: ['Meeting Details', 'Participants', 'Date/Time'] },
  'meet-ai.transcript':     { components: ['Transcript', 'Speakers', 'Duration'] },
  'meet-ai.summary':        { components: ['Summary', 'Decisions'] },
  'meet-ai.action-items':   { components: ['Action Item', 'Owner', 'Due Date'] },

  // ---- Note AI ----
  'note-ai.notes':          { components: ['Title', 'Content', 'Attachments'] },
  'note-ai.knowledge':      { components: ['Related Processes', 'Related AI', 'Keywords'] },
  'note-ai.tags':           { components: ['Tags', 'Categories'] },
  'note-ai.search':         { components: ['Search Query', 'Results'] },

  // ---- Test AI + Job AI: canonical definitions live below near lines ~539+/~555+ (richer) ----

  // ---- Business Value (operator's exec lens) ----
  'biz-value.revenue': {
    components: ['Cross Sell', 'Up Sell', 'Retention', 'Lead Conversion', 'Premium Growth', 'New Product Revenue', 'Partner Revenue'],
    kpis: ['Revenue Generated', 'Revenue Saved', 'Revenue Leakage Prevented', 'Revenue Forecast'],
  },
  'biz-value.cost': {
    components: ['Manual Cost', 'Automation Savings', 'Infrastructure Cost', 'Cloud Cost', 'Model Cost', 'Agent Cost', 'Support Cost'],
    kpis: ['Cost Reduction %', 'Cost Avoidance', 'Cost Per Transaction', 'Cost Per Claim', 'Cost Per Policy'],
  },
  'biz-value.productivity': {
    components: ['Cycle Time', 'Process Time', 'Employee Productivity', 'Automation %', 'Touchless Processing', 'Case Volume'],
    kpis: ['Hours Saved', 'FTE Saved', 'Cases Processed', 'Claims Processed', 'Policies Processed'],
  },
  'biz-value.risk': {
    components: ['Fraud Risk', 'Operational Risk', 'Financial Risk', 'Model Risk', 'Data Risk', 'Cyber Risk'],
    kpis: ['Risk Score', 'Risk Reduction %', 'Fraud Prevented', 'Loss Avoidance'],
  },
  'biz-value.compliance': {
    components: ['Regulatory Compliance', 'Audit Findings', 'Control Coverage', 'Policy Violations'],
    kpis: ['Compliance Score', 'Violations Reduced', 'Audit Success Rate'],
  },
  'biz-value.customer': {
    components: ['Customer Satisfaction', 'NPS', 'Retention', 'Complaint Analysis', 'Resolution Time'],
    kpis: ['NPS', 'CSAT', 'Retention %', 'Customer Effort Score'],
  },
  'biz-value.employee': {
    components: ['Employee Experience', 'Training', 'Productivity', 'Workload', 'Automation Adoption'],
    kpis: ['Employee Satisfaction', 'Adoption Rate', 'Time Saved'],
  },
  'biz-value.esg': {
    components: ['Environmental', 'Social', 'Governance', 'Carbon Footprint', 'Diversity Metrics'],
    kpis: ['ESG Score', 'Carbon Saved', 'Diversity Index'],
  },
  'biz-value.roi': {
    components: ['Investment', 'Benefits', 'Savings', 'Revenue Gain', 'Payback Period', 'ROI'],
    kpis: ['ROI %', 'NPV', 'IRR', 'Payback (months)'],
    formula: 'ROI = ((Benefits − Cost) / Cost) × 100',
  },

  // ---- README — advance level architecture hub (§73.3c) ----
  'readme.brd':           { components: ['Business Goal', 'Success Criteria', 'Stakeholders', 'Scope', 'Out of Scope', 'Assumptions', 'Constraints'] },
  'readme.frd':           { components: ['Use Cases', 'Functional Requirements', 'Acceptance Criteria', 'Non-Functional Requirements'] },
  'readme.hld':           { components: ['Context', 'Components', 'Data Flow', 'NFRs', 'Risks'], visuals: ['Context Diagram'] },
  'readme.lld':           { components: ['Class Diagrams', 'Sequence', 'API Contracts', 'State Machines'], visuals: ['Class Diagram'] },
  'readme.sad':           { components: ['Exec Summary', 'C4 Views', 'Cross-cutting', 'ADRs'], visuals: ['Architecture View'] },
  'readme.c4':            { components: ['L1 Context', 'L2 Container', 'L3 Component', 'L4 Code'], visuals: ['C4 L1', 'C4 L2', 'C4 L3'] },
  'readme.sequence':      { components: ['Actors', 'Steps', 'Messages', 'Return Flows'], visuals: ['Sequence Diagram'] },
  'readme.network':       { components: ['Topology', 'Subnets', 'Ingress/Egress', 'Firewalls', 'Service Mesh'], visuals: ['Network Diagram'] },
  'readme.api':           { components: ['Endpoint Catalog', 'Request Schema', 'Response Schema', 'Auth', 'Examples'] },
  'readme.db':            { components: ['Tables', 'Columns', 'Indexes', 'Foreign Keys', 'Migrations'], visuals: ['ERD'] },
  'readme.adr':           { components: ['Decision', 'Context', 'Consequences', 'Alternatives', 'Status'] },
  'readme.runbook':       { components: ['Symptoms', 'Diagnosis', 'Mitigation', 'Escalation', 'Recovery'] },
  'readme.roadmap':       { components: ['Quarter', 'Theme', 'Milestones', 'Dependencies', 'Risks'] },
  'readme.stakeholders':  { components: ['Sponsor', 'Owner', 'Reviewer', 'Consumer', 'Escalation Chain'] },
  'readme.exec-summary':  { components: ['Headline', 'Problem', 'Solution', 'Business Value', 'Next Steps'] },
  'readme.capacity':      { components: ['Throughput Target', 'p95 Latency', 'Concurrency', 'Scaling Plan'] },
  'readme.ai-strategy':   { components: ['Vision', 'Capabilities', 'Maturity', 'Roadmap', 'Governance Posture'] },
  'readme.cost':          { components: ['Build Cost', 'Run Cost', 'Per-Transaction Cost', 'Cost Drivers'], kpis: ['Cost / month', 'Cost / call'] },

  // ---- Product Manager — stories, sub-stories, roadmap planned in advance ----
  'product-mgr.vision':      { components: ['Product Vision', 'Mission', 'North Star Metric', 'Personas'] },
  'product-mgr.roadmap':     { components: ['Quarter', 'Theme', 'Outcomes', 'Bets'], visuals: ['Roadmap Timeline'] },
  'product-mgr.epics':       { components: ['Epic ID', 'Title', 'Goal', 'Outcomes', 'Status', 'Owner'] },
  'product-mgr.stories':     { components: ['Story ID', 'Title', 'As-a / I-want / So-that', 'Acceptance', 'Priority', 'Sprint'] },
  'product-mgr.sub-stories': { components: ['Sub-Story ID', 'Parent Story', 'Task', 'Owner', 'Estimate', 'Status'] },
  'product-mgr.backlog':     { components: ['Item', 'Type (Story/Bug/Tech)', 'Priority', 'Effort', 'Value'] },
  'product-mgr.sprint':      { components: ['Sprint Number', 'Goal', 'Committed', 'Capacity', 'Risks'] },
  'product-mgr.releases':    { components: ['Release', 'Version', 'Date', 'Scope', 'Risks', 'Rollback Plan'] },
  'product-mgr.kpis':        { components: ['Activation', 'Engagement', 'Retention', 'Adoption', 'NPS'], kpis: ['North Star', 'Activation %', 'Retention %', 'NPS'] },
  'product-mgr.feedback':    { components: ['Source', 'Theme', 'Sentiment', 'Severity', 'Status'] },

  // ---- Dashboard — all dashboards & graphs ----
  'dashboard.executive':   { components: ['Strategic KPIs', 'Risk Heat-map', 'Top Initiatives'], visuals: ['Executive Bar', 'Heat-map'] },
  'dashboard.manager':     { components: ['Team KPIs', 'Backlog Burn', 'On-call'], visuals: ['Burn-down', 'Throughput'] },
  'dashboard.team':        { components: ['My Queue', 'My Tickets', 'My SLAs'], visuals: ['Kanban'] },
  'dashboard.kpi':         { components: ['Process KPIs', 'AI KPIs', 'Ops KPIs'], visuals: ['Scorecard Grid'] },
  'dashboard.sla':         { components: ['SLA Target', 'Current', 'Breach Count', 'MTTD', 'MTTR'], visuals: ['SLA Trend'] },
  'dashboard.finops':      { components: ['Spend', 'Forecast', 'Budget', 'Top Cost Centers'], visuals: ['Cost Stack'] },
  'dashboard.incidents':   { components: ['Open', 'P1', 'P2', 'P3', 'Avg MTTR'], visuals: ['Incident Timeline'] },
  'dashboard.fairness':    { components: ['Disparate Impact', 'Equal Opportunity Gap', 'Group Calibration'], visuals: ['Fairness Bars'] },
  'dashboard.drift':       { components: ['Feature Drift', 'Concept Drift', 'PSI', 'CSI'], visuals: ['Drift Trend'] },
  'dashboard.model-fleet': { components: ['Models Live', 'Versions', 'Champion/Challenger', 'Inference Volume'], visuals: ['Fleet Map'] },
  'dashboard.biz-value':   { components: ['Revenue Gain', 'Cost Save', 'Productivity Gain', 'ROI %'], visuals: ['Value Bar'] },
  'dashboard.cost':        { components: ['Infra', 'Model', 'Agent', 'Storage', 'Network'], visuals: ['Cost Donut'] },
  'dashboard.risk':        { components: ['Risk Score', 'Top Risks', 'Risk Trend'], visuals: ['Risk Heat-map'] },
  'dashboard.usage':       { components: ['DAU', 'MAU', 'Sessions', 'Requests'], visuals: ['Usage Trend'] },
  'dashboard.adoption':    { components: ['Activation %', 'Active Users', 'Feature Adoption'], visuals: ['Adoption Funnel'] },

  // ---- Test AI — positive/negative + API/Model/Data/Manual/Pipeline ----
  'test-ai.positive':   { components: ['Happy Path ID', 'Input', 'Expected Output', 'Pass Rate'], kpis: ['Positive Pass Rate %'] },
  'test-ai.negative':   { components: ['Failure Case ID', 'Invalid Input', 'Expected Rejection', 'Reject Rate'], kpis: ['Negative Reject Rate %'] },
  'test-ai.boundary':   { components: ['Min', 'Max', 'Off-by-one', 'Empty', 'Overflow'] },
  'test-ai.regression': { components: ['Previous Baseline', 'Current', 'Delta', 'Regression Flag'] },
  'test-ai.api':        { components: ['Endpoint', 'Method', 'Status Codes', 'Schema Validation', 'Auth Coverage'] },
  'test-ai.model':      { components: ['Accuracy Test', 'Drift Test', 'Bias Test', 'Adversarial Test'], visuals: ['Confusion Matrix', 'ROC Curve'] },
  'test-ai.data':       { components: ['Schema Tests', 'Null Tests', 'Range Tests', 'Uniqueness Tests', 'Freshness'] },
  'test-ai.manual':     { components: ['Tester', 'Steps', 'Result', 'Screenshot', 'Defect Link'] },
  'test-ai.pipeline':   { components: ['Stage Tests', 'Integration Tests', 'E2E Tests', 'Smoke Tests'] },
  'test-ai.cases':      { components: ['Test Suite', 'Test Case', 'Expected Result'] },
  'test-ai.execution':  { components: ['Run ID', 'Actual Result', 'Pass/Fail'] },
  'test-ai.defects':    { components: ['Defect Link', 'Severity', 'Owner'] },
  'test-ai.coverage':   { components: ['Coverage %', 'Untested Areas'], kpis: ['Line Coverage %', 'Branch Coverage %'] },

  // ---- Job AI — cron + jobs ----
  'job-ai.cron':       { components: ['Cron Expression', 'Next Run', 'Last Run', 'Owner', 'Lock', 'Idempotency Key'] },
  'job-ai.jobs':       { components: ['Job Name', 'Job Type', 'Owner'] },
  'job-ai.schedules':  { components: ['Schedule', 'Next Run', 'Dependencies'] },
  'job-ai.execution':  { components: ['Run ID', 'Runtime', 'Status'] },
  'job-ai.monitoring': { components: ['Logs', 'Alerts', 'SLA'] },
  'job-ai.failures':   { components: ['Failed Run ID', 'Failure Reason', 'Retry Count', 'Last Failure'] },
  'job-ai.retries':    { components: ['Retry Policy', 'Backoff', 'Max Retries', 'Dead Letter'] },
};

function slug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function PendingSection({ tab, sub }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <strong>{tab.label}</strong>{sub ? <> · {sub.label}</> : null}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 11, fontStyle: 'italic' }}>
        Wire to <code>process.{tab.id}{sub ? `.${sub.id.replace(/-/g, '_')}` : ''}</code> · operator-pending content.
      </p>
    </div>
  );
}

// Atoms re-used by Data sub-tab renderer
function DataSection({ title, color, description, quality = 'Component group', children }) {
  return (
    <div style={{
      marginBottom: 16, border: `1px solid ${color}33`, borderRadius: 8,
      overflow: 'hidden', background: '#fff',
    }}>
      <div style={{
        padding: '12px 14px', background: `${color}11`,
        borderBottom: `1px solid ${color}33`,
        color: '#0f172a',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          fontSize: 14, fontWeight: 800,
        }}>
          <span>{title}</span>
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: '#fff', border: `1px solid ${color}55`, color,
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>{quality}</span>
        </div>
        {description && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// Heuristic: action labels look like verbs · everything else is info
const ACTION_VERBS = [
  'create','generate','submit','run','train','queue','deploy','rollback','approve',
  'reject','escalate','assign','dispatch','trigger','execute','validate','test',
  'review','publish','export','import','sync','launch','start','stop','pause',
  'send','notify','alert','call','invoke','update','delete','add','remove',
  'fix','resolve','retrain','retry','reset','reload','refresh',
];
function classifyCard(label) {
  const lower = String(label || '').toLowerCase();
  const firstWord = lower.split(/\s+/)[0];
  return ACTION_VERBS.includes(firstWord) ? 'action' : 'info';
}

function compactText(value, max = 118) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function componentPurposeLines(label, kind = 'info') {
  const sem = componentSemantics(label);
  const first = kind === 'action'
    ? `Action component: ${compactText(sem.objective, 104)}`
    : `Info component: ${compactText(sem.objective, 108)}`;
  const second = `Output: ${compactText(sem.outcome, 118)}`;
  return [first, second];
}
const CARD_LIST_PALETTE = [
  { bg: '#eff6ff', border: '#93c5fd', left: '#2563eb', chipBg: '#dbeafe', chipFg: '#1e40af' },
  { bg: '#f0fdf4', border: '#86efac', left: '#16a34a', chipBg: '#dcfce7', chipFg: '#166534' },
  { bg: '#fffbeb', border: '#fcd34d', left: '#d97706', chipBg: '#fef3c7', chipFg: '#92400e' },
  { bg: '#fdf2f8', border: '#f9a8d4', left: '#db2777', chipBg: '#fce7f3', chipFg: '#9d174d' },
  { bg: '#f5f3ff', border: '#c4b5fd', left: '#7c3aed', chipBg: '#ede9fe', chipFg: '#5b21b6' },
  { bg: '#ecfeff', border: '#67e8f9', left: '#0891b2', chipBg: '#cffafe', chipFg: '#155e75' },
  { bg: '#fff7ed', border: '#fdba74', left: '#ea580c', chipBg: '#ffedd5', chipFg: '#9a3412' },
  { bg: '#f8fafc', border: '#cbd5e1', left: '#475569', chipBg: '#e2e8f0', chipFg: '#334155' },
];

function cardListTone(index) {
  return CARD_LIST_PALETTE[index % CARD_LIST_PALETTE.length];
}

const CARD_KIND_STYLE = {
  info: {
    label: 'INFO',
    intent: 'Read / inspect',
    bg: '#ffffff',
    border: '#cbd5e1',
    left: '#64748b',
    badgeBg: '#f1f5f9',
    badgeFg: '#334155',
    ctaBg: '#475569',
    hint: 'Reference content',
  },
  action: {
    label: 'ACTION',
    intent: 'Click / execute',
    bg: '#fffbeb',
    border: '#f59e0b',
    left: '#d97706',
    badgeBg: '#fef3c7',
    badgeFg: '#92400e',
    ctaBg: '#d97706',
    hint: 'Runs or changes state',
  },
  operation: {
    label: 'MIXED',
    intent: 'Inspect + operate',
    bg: '#eff6ff',
    border: '#93c5fd',
    left: '#2563eb',
    badgeBg: '#dbeafe',
    badgeFg: '#1e40af',
    ctaBg: '#2563eb',
    hint: 'Header reads; buttons act',
  },
};

function CardKindBadge({ kind }) {
  const style = CARD_KIND_STYLE[kind] || CARD_KIND_STYLE.info;
  return (
    <span style={{
      padding: '3px 8px',
      borderRadius: 999,
      background: style.badgeBg,
      color: style.badgeFg,
      border: `1px solid ${style.border}66`,
      fontSize: 10,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  );
}

function CardKindLegend() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
      padding: '10px 12px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 6,
      fontSize: 11,
      color: '#475569',
    }}>
      <strong style={{ color: '#0f172a' }}>Card meaning:</strong>
      {['info', 'action', 'operation'].map((kind) => {
        const style = CARD_KIND_STYLE[kind];
        return (
          <span key={kind} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderLeft: `4px solid ${style.left}`,
            borderRadius: 4,
            color: '#0f172a',
          }}>
            <CardKindBadge kind={kind} />
            <span>{style.intent}</span>
          </span>
        );
      })}
    </div>
  );
}

function ComponentGrid({ items }) {
  const [cardStatus, setCardStatus] = useState({});
  const cards = items.map((label, index) => {
    const kind = classifyCard(label);
    return { label, kind, kindStyle: CARD_KIND_STYLE[kind], tone: cardListTone(index), index };
  });
  const visibleKinds = [...new Set(cards.map((card) => card.kind))];
  const handleCardAction = (card) => {
    const actionLabel = card.kind === 'action' ? `Run ${card.label}` : `View ${card.label}`;
    setCardStatus((prev) => ({
      ...prev,
      [card.label]: { state: 'processing', label: actionLabel, at: new Date() },
    }));
    saveAction(card.kind === 'action' ? 'action' : 'view', actionLabel, {
      component: card.label,
      card_kind: card.kind,
    });
    setTimeout(() => {
      setCardStatus((prev) => ({
        ...prev,
        [card.label]: {
          state: 'done',
          label: actionLabel,
          at: new Date(),
          outcome: card.kind === 'action'
            ? 'Task completed; audit row and downstream status are ready.'
            : 'Detail opened logically; source, purpose, and evidence are available.',
        },
      }));
    }, 900);
  };
  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 8,
        fontSize: 11,
        color: '#64748b',
      }}>
        <strong style={{ color: '#0f172a' }}>Card type:</strong>
        {visibleKinds.map((kind) => {
          const style = CARD_KIND_STYLE[kind];
          return (
            <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CardKindBadge kind={kind} />
              <span>{style.intent}</span>
            </span>
          );
        })}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 10,
      }}>
      {cards.map((card, i) => {
        const { label, kind, kindStyle, tone, index } = card;
        const isAction = kind === 'action';
        const status = cardStatus[label];
        const isBusy = status?.state === 'processing';
        const purposeLines = componentPurposeLines(label, kind);
        return (
          <div
            key={i}
            data-card-kind={kind}
            aria-label={`${kindStyle.label} card: ${label}`}
            style={{
              padding: '14px 16px',
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              borderLeft: `6px solid ${tone.left}`,
              borderRadius: 8,
              fontSize: 13, color: '#0f172a',
              display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: isAction
                ? `0 3px 10px ${tone.left}22`
                : '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <CardKindBadge kind={kind} />
                  <span style={{
                    padding: '2px 7px', borderRadius: 999,
                    background: tone.chipBg, color: tone.chipFg,
                    border: `1px solid ${tone.border}`,
                    fontSize: 10, fontWeight: 900,
                  }}>#{index + 1}</span>
                  <strong style={{ fontSize: 14 }}>{label}</strong>
                </div>
                <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                  {purposeLines.map((line) => (
                    <div key={line} style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardAction(card);
                }}
                style={{
                  minHeight: 32,
                  padding: '7px 12px', fontSize: 12, cursor: isBusy ? 'wait' : 'pointer', fontWeight: 800,
                  background: isBusy ? '#f59e0b' : kindStyle.ctaBg,
                  color: '#fff', border: 'none', borderRadius: 4,
                  whiteSpace: 'nowrap',
                  boxShadow: isAction ? `0 0 0 3px ${kindStyle.ctaBg}22` : 'none',
                  opacity: isBusy ? 0.85 : 1,
                }}>
                {isBusy ? 'Working...' : isAction ? 'Run active' : 'View info'}
              </button>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 18px 1fr 18px 1fr', gap: 4,
              alignItems: 'stretch', fontSize: 10,
            }}>
              {[
                ['INPUT', '#0ea5e9', 'source'],
                ['PROCESS', '#8b5cf6', isAction ? 'execute' : 'inspect'],
                ['OUTPUT', '#16a34a', isAction ? 'status' : 'detail'],
              ].map(([phase, phaseColor, phaseText], idx) => (
                <React.Fragment key={phase}>
                  {idx > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 900 }}>{'>'}</div>}
                  <div style={{
                    padding: '5px 6px', background: '#fff', border: `1px solid ${phaseColor}44`,
                    borderLeft: `3px solid ${phaseColor}`, borderRadius: 4,
                  }}>
                    <div style={{ color: phaseColor, fontSize: 8, fontWeight: 900 }}>{phase}</div>
                    <div style={{ color: '#334155' }}>{phaseText}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{
              minHeight: 28,
              padding: '6px 8px', background: status ? '#fff' : '#ffffff99',
              border: `1px ${status ? 'solid' : 'dashed'} ${status?.state === 'done' ? '#86efac' : '#cbd5e1'}`,
              borderRadius: 4,
              fontSize: 10,
              color: status ? '#0f172a' : '#64748b',
            }}>
              {status ? (
                <span>
                  <strong>{status.state === 'done' ? 'Done' : 'In progress'}:</strong> {status.label} · {status.at.toLocaleString()}
                  {status.outcome ? ` · ${status.outcome}` : ' · Button stays active until completion.'}
                </span>
              ) : (
                <span>Action/status space: click the button to see what happens and when it completes.</span>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}


function ProcessModeBrief({ mode, proc }) {
  const isManual = mode === 'manual';
  const source = isManual ? proc?.manual_process : proc?.automatic_process;
  const color = isManual ? '#f59e0b' : '#10b981';
  const title = isManual ? 'Manual execution lens' : 'Automatic execution lens';
  const objective = isManual
    ? 'Show what people select, review, and run today before automation.'
    : 'Show what the system can execute end-to-end with governance and HITL controls.';
  const summary = read(source, 'summary', 'current_pain', 'ai_workflow') || 'Operator-pending process narrative';
  const checks = isManual
    ? ['Human actor is visible', 'Manual input is visible', 'Pain or delay is visible', 'Run controls are separated']
    : ['Automation trigger is visible', 'AI workflow is visible', 'HITL boundary is visible', 'Scope grant is visible'];
  return (
    <div style={{
      marginBottom: 12, padding: 12,
      background: `${color}10`, border: `1px solid ${color}55`,
      borderLeft: `4px solid ${color}`, borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <strong style={{ fontSize: 14, color: '#0f172a' }}>{title}</strong>
        <span style={{
          padding: '2px 8px', borderRadius: 999, background: '#fff',
          border: `1px solid ${color}66`, color, fontSize: 10,
          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{isManual ? 'AS-IS' : 'TO-BE'}</span>
      </div>
      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45, marginBottom: 8 }}>
        <strong>Objective:</strong> {objective} <span style={{ color: '#64748b' }}>Source:</span> {renderValue(summary)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {checks.map((check) => (
          <span key={check} style={{
            padding: '4px 8px', background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 4,
            fontSize: 11, color: '#0f172a',
          }}>✓ {check}</span>
        ))}
      </div>
    </div>
  );
}

// ========== Process sub-tab renderer (6 sub-tabs) ==========
function renderProcessSubTab(subId, proc, dept) {
  const m = proc.manual_process || {};
  const a = proc.automatic_process || {};
  switch (subId) {
    case 'workflow':
      return (
        <>
          <DataSection
            title="Workflow diagram"
            color="#3b82f6"
            quality="Flow journey"
            description="Shows the process journey from trigger to hand-off. INFO cards explain steps; ACTION cards show executable steps."
          >
            <ComponentGrid items={['Trigger', 'Decide', 'Act', 'Persist', 'Audit', 'Hand-off']} />
          </DataSection>
          <DataSection
            title="Workflow controls"
            color="#8b5cf6"
            quality="Control checklist"
            description="Confirms ownership, branches, loops, retries, and SLA controls for this process."
          >
            <ComponentGrid items={['Step list', 'Decision branches', 'Loops + retries', 'SLA per step', 'Owner per step']} />
          </DataSection>
        </>
      );
    case 'manual':
      return (
        <>
          <ProcessModeBrief mode="manual" proc={proc} />
          <DataSection
            title="Manual execution components"
            color="#f59e0b"
            quality="AS-IS manual"
            description="Captures the human-driven workflow: selections, inputs, model choices, thresholds, and pain points before automation."
          >
            <ComponentGrid items={[
              'Dataset Selection', 'Feature Selection', 'Model Selection',
              'Hyperparameter Selection', 'Loss Function Selection', 'Optimizer Selection',
              'Epoch', 'Batch Size', 'Threshold',
            ]} />
          </DataSection>
          <DataSection
            title="Run controls"
            color="#dc2626"
            quality="Action controls"
            description="These are ACTION cards. They run, pause, reset, or compare the manual execution path."
          >
            <ComponentGrid items={['Run Step', 'Pause', 'Rollback', 'Reset', 'Compare to baseline']} />
          </DataSection>
          <DataSection
            title="Actors + tools"
            color="#3b82f6"
            quality="Ownership"
            description="Shows who performs the manual process and which tools or systems are touched."
          >
            <ComponentGrid items={(m.actor_archetypes || []).concat(m.tools || [])} />
          </DataSection>
        </>
      );
    case 'automatic':
      return (
        <>
          <ProcessModeBrief mode="automatic" proc={proc} />
          <DataSection
            title="Automatic execution components"
            color="#10b981"
            quality="TO-BE automation"
            description="Shows the automation-ready path: dataset, target, business goal, and full pipeline execution."
          >
            <ComponentGrid items={['Dataset Selection', 'Target Variable', 'Business Goal', 'Run Full Pipeline']} />
          </DataSection>
          <DataSection
            title="AI workflow (live)"
            color="#8b5cf6"
            quality="AI process"
            description="Maps the automated decision flow or AI workflow that replaces or assists manual work."
          >
            <ComponentGrid items={a.ai_workflow || ['Operator-pending']} />
          </DataSection>
          <DataSection
            title="HITL + scope"
            color="#dc2626"
            quality="Governance"
            description="Shows where human approval, confidence thresholds, and tenant-scoped policy boundaries apply."
          >
            <ComponentGrid items={[a.human_in_the_loop || 'HITL on confidence < 0.7', a.scope_grants || 'Tenant-scoped policy']} />
          </DataSection>
        </>
      );
    case 'pipeline':
      return (
        <>
          <DataSection title="Pipeline status components" color="#0ea5e9">
            <ComponentGrid items={['Current Stage', 'Success Rate', 'Errors', 'Warnings', 'Runtime', 'Progress Bar']} />
          </DataSection>
          <DataSection title="11-phase pipeline (per global §57)" color="#8b5cf6">
            <ComponentGrid items={[
              '1. Data ingestion', '2. Data prep', '3. Model training', '4. Eval + accuracy',
              '5. Inference', '6. Fallback', '7. Testing', '8. Load + perf',
              '9. Security', '10. Monitoring + drift', '11. Governance + audit',
            ]} />
          </DataSection>
        </>
      );
    case 'approvals':
      return (
        <>
          <DataSection title="Approval workflow" color="#f59e0b">
            <ComponentGrid items={['Requested by', 'Confidence tier', 'Auto-approve', 'Reviewer queue', 'Reject + audit']} />
          </DataSection>
          <DataSection title="Confidence tiers" color="#10b981">
            <ComponentGrid items={['≥ 0.85 auto-decide', '0.5–0.85 human review', '< 0.5 reject + fallback']} />
          </DataSection>
        </>
      );
    case 'history':
      return (
        <DataSection title="Execution history" color="#475569">
          <ComponentGrid items={['Run ID', 'Status', 'Operator', 'Duration', 'Cost', 'Audit row link', 'Replay button']} />
        </DataSection>
      );
    default:
      return <PendingSection tab={{ label: 'Process' }} sub={{ label: subId }} />;
  }
}

// ========== Analytics sub-tab renderer (4 sub-tabs) ==========
function renderAnalyticsSubTab(subId) {
  switch (subId) {
    case 'eda':
      return (
        <>
          <DataSection title="EDA components" color="#f59e0b">
            <ComponentGrid items={[
              'Distribution Analysis', 'Correlation Matrix', 'Outlier Detection',
              'Trend Analysis', 'Clustering', 'Segmentation', 'Insights',
            ]} />
          </DataSection>
          <DataSection title="EDA visualizations" color="#0ea5e9">
            <ComponentGrid items={[
              'Histogram + KDE', 'Box plot', 'Violin plot', 'Heatmap',
              'Scatter matrix', 'Time-series decomposition',
            ]} />
          </DataSection>
        </>
      );
    case 'features':
      return (
        <>
          <DataSection title="Feature engineering components" color="#8b5cf6">
            <ComponentGrid items={[
              'Feature Creation', 'Feature Selection', 'Feature Ranking',
              'Normalization', 'Encoding', 'PCA', 'SHAP Feature Importance',
            ]} />
          </DataSection>
          <DataSection title="Feature catalog" color="#3b82f6">
            <ComponentGrid items={['Feature list', 'Type', 'Importance', 'Mutual info', 'VIF']} />
          </DataSection>
        </>
      );
    case 'evaluation':
      return (
        <>
          <DataSection title="Evaluation components" color="#10b981">
            <ComponentGrid items={[
              'Accuracy', 'Precision', 'Recall', 'F1',
              'ROC AUC', 'PR AUC', 'MCC', 'Log Loss', 'Calibration',
            ]} />
          </DataSection>
          <DataSection title="Evaluation visualizations" color="#0ea5e9">
            <ComponentGrid items={[
              'Confusion Matrix', 'ROC Curve', 'Precision Recall Curve',
              'Lift Chart', 'Gain Chart', 'Per-segment table',
            ]} />
          </DataSection>
        </>
      );
    case 'explainability':
      return (
        <>
          <DataSection title="Explainability components" color="#8b5cf6">
            <ComponentGrid items={[
              'SHAP', 'LIME', 'Counterfactual Analysis',
              'Decision Path', 'Feature Importance',
            ]} />
          </DataSection>
          <DataSection title="Per-prediction explainability" color="#dc2626">
            <ComponentGrid items={['SHAP waterfall', 'Integrated gradients (NN)', 'Attention map (transformer)', 'Citation trail (RAG)']} />
          </DataSection>
        </>
      );
    default:
      return <PendingSection tab={{ label: 'Analytics' }} sub={{ label: subId }} />;
  }
}

// §131 AI type catalog preview. Keep this local in the bank workspace so
// a down taxonomy API does not create red console errors while the page renders.
const AI_TYPES_CATALOG_PREVIEW = [
  'Analytics AI', 'Predictive AI', 'Segmentation AI', 'Reporting AI',
  'Pricing AI', 'Optimization AI', 'Recommendation AI', 'Personalization AI',
  'Risk Scoring AI', 'Fraud Detection AI', 'Underwriting AI', 'Claims Triage AI',
  'Document AI', 'OCR AI', 'NLP AI', 'RAG AI', 'Knowledge AI',
  'Decision AI', 'Agentic AI', 'Autonomous AI', 'Explainable AI',
  'Responsible AI', 'Compliance AI', 'Governance AI', 'Monitoring AI',
  'Drift Detection AI', 'Simulation AI', 'Forecasting AI', 'Workflow AI',
  'Customer Experience AI', 'Voice AI', 'Conversation AI',
];

function useAllAiTypes() {
  return AI_TYPES_CATALOG_PREVIEW;
}

// Capabilities view · injects all 200 AI types from §131 catalog
function CapabilitiesView({ ai }) {
  const allTypes = useAllAiTypes();
  return (
    <>
      <DataSection title={`AI Type catalog · §131 preview (${allTypes.length} types)`} color="#8b5cf6">
        <ComponentGrid items={allTypes.length > 0 ? allTypes : [
          'AI taxonomy preview unavailable',
        ]} />
      </DataSection>
      <DataSection title={`Usage mapping (${ai.length} mapped to this process)`} color="#3b82f6">
        <ComponentGrid items={ai.map((a) => a.ai_type)} />
      </DataSection>
      <DataSection title="Process mapping" color="#10b981">
        <ComponentGrid items={['Per-process AI catalog', 'Coverage matrix', 'Hand-off contracts']} />
      </DataSection>
    </>
  );
}

// ========== AI sub-tab renderer (5 sub-tabs) ==========
function renderAISubTab(subId, proc) {
  const ai = proc.ai || [];
  switch (subId) {
    case 'capabilities':
      return <CapabilitiesView ai={ai} />;
    case 'old-capabilities':
      return (
        <>
          <DataSection title="AI Type catalog" color="#8b5cf6">
            <ComponentGrid items={[
              'Transactional AI', 'Analytical AI', 'Decision AI', 'Generative AI',
              'Conversational AI', 'Reporting AI', 'Compliance AI', 'Fraud AI',
              'Risk AI', 'Incident AI', 'Meeting AI', 'Knowledge AI',
              'Predictive AI', 'Optimization AI', 'Agentic AI', 'Explainable AI',
            ]} />
          </DataSection>
          <DataSection title={`Usage mapping (${ai.length} mapped)`} color="#3b82f6">
            <ComponentGrid items={ai.map((a) => a.ai_type)} />
          </DataSection>
          <DataSection title="Process mapping" color="#10b981">
            <ComponentGrid items={['Per-process AI catalog', 'Coverage matrix', 'Hand-off contracts']} />
          </DataSection>
        </>
      );
    case 'models':
      return (
        <>
          <DataSection title="Model catalog" color="#8b5cf6">
            <ComponentGrid items={['Model name', 'Family', 'Framework', 'Version', 'Status']} />
          </DataSection>
          <DataSection title="Training summary" color="#0ea5e9">
            <ComponentGrid items={[
              'Hyperparameters', 'Loss Function', 'Optimizer',
              'Batch Size', 'Epoch',
            ]} />
          </DataSection>
          <DataSection title="Lifecycle" color="#10b981">
            <ComponentGrid items={['Versioning', 'Deployment Candidate', 'Champion / Challenger', 'Rollback path']} />
          </DataSection>
        </>
      );
    case 'agents':
      return (
        <>
          <DataSection title="Agent registry" color="#ec4899">
            <ComponentGrid items={['Agent name', 'Role', 'Model backing', 'Tools available', 'Owner']} />
          </DataSection>
          <DataSection title="Agent ops" color="#dc2626">
            <ComponentGrid items={[
              'Agent Health', 'Agent Cost', 'Agent Performance', 'Agent Memory',
              'Tool-call audit', 'Scope grants',
            ]} />
          </DataSection>
        </>
      );
    case 'experiments':
      return (
        <>
          <DataSection title="Experiment tracker" color="#f59e0b">
            <ComponentGrid items={['Experiment ID', 'Params', 'Data version', 'Metric', 'Status', 'Author']} />
          </DataSection>
          <DataSection title="Sweep results" color="#3b82f6">
            <ComponentGrid items={['Optuna run', 'Hyperparam grid', 'Pareto front', 'Best run', 'Compare to baseline']} />
          </DataSection>
        </>
      );
    case 'registry':
      return (
        <DataSection title="Model + prompt registry" color="#10b981">
          <ComponentGrid items={[
            'Model versions', 'Prompt versions', 'Active model · prompt',
            'Sign-off', 'Audit trail', 'Rollback target',
          ]} />
        </DataSection>
      );
    default:
      return <PendingSection tab={{ label: 'AI' }} sub={{ label: subId }} />;
  }
}

// ========== Operations sub-tab renderer (9 sub-tabs) ==========
function renderOperationsSubTab(subId) {
  switch (subId) {
    case 'monitoring':
      return (
        <DataSection title="Monitoring components" color="#10b981">
          <ComponentGrid items={['Live metric panel', 'Latency p50/p95/p99', 'Throughput', 'Error rate', 'Per-tenant breakdown']} />
        </DataSection>
      );
    case 'jobs':
      return (
        <DataSection title="Jobs" color="#0ea5e9">
          <ComponentGrid items={['Job ID', 'Cadence', 'Last run', 'Duration', 'Status', 'Owner']} />
        </DataSection>
      );
    case 'incidents':
      return (
        <>
          <DataSection title="Incident register" color="#dc2626">
            <ComponentGrid items={['Daily issues', 'Weekly rollup', '4-weekly trend', 'Monthly report', 'Severity matrix (P1-P4)']} />
          </DataSection>
          <DataSection title="Live feed" color="#f59e0b">
            <ComponentGrid items={['Time', 'Severity', 'Issue', 'Status', 'Owner', 'Notes']} />
          </DataSection>
        </>
      );
    case 'alerts':
      return (
        <DataSection title="Alert configuration" color="#dc2626">
          <ComponentGrid items={['Alert rule', 'Threshold', 'Channel', 'On-call rotation', 'Silence']} />
        </DataSection>
      );
    case 'deployment':
      return (
        <DataSection title="Deployment" color="#10b981">
          <ComponentGrid items={['Pipeline status', 'Canary %', 'Blue/Green', 'Promotion gate', 'Last deploy']} />
        </DataSection>
      );
    case 'rollback':
      return (
        <DataSection title="Rollback" color="#f59e0b">
          <ComponentGrid items={['Rollback target', 'Reason', 'Trigger', 'Audit row', 'Verification']} />
        </DataSection>
      );
    case 'logs':
      return (
        <DataSection title="Logs" color="#475569">
          <ComponentGrid items={['Live tail', 'Search', 'Per-request_id filter', 'Tenant filter', 'Severity filter']} />
        </DataSection>
      );
    case 'observability':
      return (
        <>
          <DataSection title="Observability triad" color="#8b5cf6">
            <ComponentGrid items={['Logs', 'Traces', 'Metrics']} />
          </DataSection>
          <DataSection title="Per-tab observability log" color="#3b82f6">
            <ComponentGrid items={['Tab render events', 'Sub-tab change events', 'User interaction events', 'API call events', 'Error events']} />
          </DataSection>
        </>
      );
    case 'sla':
      return (
        <DataSection title="SLA dashboard" color="#10b981">
          <ComponentGrid items={['Latency p95', 'Availability', 'Error rate', 'Cost / call', 'SLA % met']} />
        </DataSection>
      );
    default:
      return <PendingSection tab={{ label: 'Operations' }} sub={{ label: subId }} />;
  }
}

// ========== Reports sub-tab renderer (6 sub-tabs) ==========
function renderReportsSubTab(subId, proc, dept) {
  const exec = proc.readme?.executive_summary || {};
  const ds = proc.demo_story || {};
  switch (subId) {
    case 'executive':
      return (
        <>
          <DataSection title="Executive report" color="#6366f1">
            <ComponentGrid items={[
              exec.headline || 'Executive summary headline',
              'Value today (AS-IS)', 'Value target (TO-BE)', 'Stakeholder ask',
              'Risk summary', 'KPI dashboard', 'Sign-off',
            ]} />
          </DataSection>
          <DataSection title="Export" color="#0ea5e9">
            <ComponentGrid items={['Download PDF', 'Export Excel', 'Report History']} />
          </DataSection>
        </>
      );
    case 'business':
      return (
        <DataSection title="Business report" color="#10b981">
          <ComponentGrid items={[
            ds.persona || 'Persona', 'Scenario', 'KPI movement',
            'Per-domain breakdown', 'Recommendation',
          ]} />
        </DataSection>
      );
    case 'technical':
      return (
        <DataSection title="Technical report" color="#3b82f6">
          <ComponentGrid items={[
            'Architecture', 'Data flow', 'API contracts', 'DB schema',
            'Test coverage', 'Deployment',
          ]} />
        </DataSection>
      );
    case 'financial':
      return (
        <DataSection title="Financial report" color="#10b981">
          <ComponentGrid items={[
            'Build cost', 'Run cost', 'Savings', 'ROI 3-year',
            'Break-even months', 'Cost per call',
          ]} />
        </DataSection>
      );
    case 'compliance':
      return (
        <DataSection title="Compliance report" color="#dc2626">
          <ComponentGrid items={[
            'EU AI Act status', 'NIST RMF status', 'ISO 42001 status',
            'SOC2 status', 'Audit findings', 'Remediation plan',
          ]} />
        </DataSection>
      );
    case 'audit':
      return (
        <DataSection title="Audit report" color="#475569">
          <ComponentGrid items={[
            'Audit period', 'Findings', 'Evidence',
            'Auditor', 'Sign-off date', 'Next audit',
          ]} />
        </DataSection>
      );
    default:
      return <PendingSection tab={{ label: 'Reports' }} sub={{ label: subId }} />;
  }
}

// Per Data sub-tab renderer — keeps depth to Tab → Sub-Tab → Components (no deeper)
function renderDataSubTab(subId, proc, dept) {
  switch (subId) {
    case 'sources':
      return (
        <>
          <DataSection title="Source inventory" color="#0ea5e9">
            <ComponentGrid items={[
              'Internal Systems', 'External Systems', 'Files', 'APIs',
              'Streaming Sources', 'Databases', 'Data Lake', 'Data Warehouse',
            ]} />
          </DataSection>
          <DataSection title="Connection status + ownership" color="#3b82f6">
            <ComponentGrid items={[
              'Source Inventory', 'Connection Status', 'Refresh Frequency', 'Owner',
            ]} />
          </DataSection>
        </>
      );
    case 'discovery':
      return (
        <>
          <DataSection title="Discovery surfaces" color="#0ea5e9">
            <ComponentGrid items={[
              'Dataset Registry', 'Schema Explorer', 'Catalog', 'Dictionary', 'Column Statistics',
            ]} />
          </DataSection>
          <DataSection title="Visual" color="#3b82f6">
            <ComponentGrid items={[
              'Dataset List', 'Schema Tree', 'Column Profile', 'Business Glossary',
            ]} />
          </DataSection>
        </>
      );
    case 'quality':
      return (
        <>
          <DataSection title="Quality dimensions" color="#10b981">
            <ComponentGrid items={[
              'Completeness', 'Accuracy', 'Consistency', 'Validity', 'Uniqueness', 'Timeliness',
            ]} />
          </DataSection>
          <DataSection title="Visualizations" color="#0ea5e9">
            <ComponentGrid items={[
              'Quality Score', 'Missing Values', 'Duplicate Analysis',
              'Outlier Analysis', 'Quality Trend',
            ]} />
          </DataSection>
        </>
      );
    case 'preparation':
      return (
        <>
          <DataSection title="Cleaning" color="#dc2626">
            <ComponentGrid items={[
              'Missing Value Handling', 'Duplicate Removal', 'Outlier Treatment', 'Standardization',
            ]} />
          </DataSection>
          <DataSection title="Transformation" color="#8b5cf6">
            <ComponentGrid items={[
              'Encoding', 'Normalization', 'Scaling', 'Aggregation', 'Derived Columns',
            ]} />
          </DataSection>
          <DataSection title="Balancing" color="#f59e0b">
            <ComponentGrid items={[
              'SMOTE', 'Oversampling', 'Undersampling', 'Class Distribution',
            ]} />
          </DataSection>
          <DataSection title="Sampling + feature prep" color="#3b82f6">
            <ComponentGrid items={[
              'Sampling Strategy', 'Train/Val/Test Split', 'Stratified Split',
              'Time-series Walk-forward', 'Feature Preparation',
            ]} />
          </DataSection>
        </>
      );
    case 'master-data':
      return (
        <>
          <DataSection title="Master data entities" color="#10b981">
            <ComponentGrid items={[
              'Customer', 'Product', 'Organization', 'Pricing', 'Tax',
              'Policy', 'Claim', 'Broker', 'Vendor', 'Employee',
            ]} />
          </DataSection>
          <DataSection title="Per-entity facets" color="#3b82f6">
            <ComponentGrid items={[
              'Overview', 'Relationships', 'Quality', 'Ownership', 'History', 'Usage',
            ]} />
          </DataSection>
        </>
      );
    case 'metadata':
      return (
        <>
          <DataSection title="Business metadata" color="#10b981">
            <ComponentGrid items={['Owner', 'Steward', 'Classification', 'Glossary terms']} />
          </DataSection>
          <DataSection title="Technical metadata" color="#0ea5e9">
            <ComponentGrid items={['Schema', 'Column types', 'Lineage hooks', 'Source URI']} />
          </DataSection>
          <DataSection title="Operational metadata" color="#8b5cf6">
            <ComponentGrid items={['Retention', 'Sensitivity', 'Refresh cadence', 'SLA']} />
          </DataSection>
        </>
      );
    case 'lineage':
      return (
        <>
          <DataSection title="Lineage chain" color="#3b82f6">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12,
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
              fontSize: 12, color: '#0f172a', flexWrap: 'wrap',
            }}>
              {['Source', 'Raw', 'Clean', 'Feature Store', 'Model'].map((s, i) => (
                <>
                  {i > 0 && <span key={`a${i}`} style={{ color: '#94a3b8' }}>→</span>}
                  <span key={s} style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: '#dbeafe', color: '#1e40af', fontWeight: 700,
                  }}>{s}</span>
                </>
              ))}
            </div>
          </DataSection>
          <DataSection title="Lineage components" color="#0ea5e9">
            <ComponentGrid items={[
              'Source System', 'Transformation', 'Target System', 'Dependencies', 'Data Flow',
            ]} />
          </DataSection>
        </>
      );
    case 'security':
      return (
        <DataSection title="Data security" color="#dc2626">
          <ComponentGrid items={[
            'PII', 'PHI', 'Masking', 'Encryption', 'Access Control', 'Data Sharing',
          ]} />
        </DataSection>
      );
    case 'monitoring':
      return (
        <DataSection title="Data monitoring" color="#10b981">
          <ComponentGrid items={[
            'Freshness', 'Schema Drift', 'Data Drift', 'Quality Drift', 'Pipeline Health', 'Alerts',
          ]} />
        </DataSection>
      );
    default:
      return <PendingSection tab={{ label: 'Data' }} sub={{ label: subId }} />;
  }
}

// Map each (tab, subTab) to an existing renderer where possible
// Renders a spec-driven (components + kpis) card layout for tabs whose
// content is the operator's catalog rather than custom JSX. Used by:
//   User Story · User Demo · Explainable AI · Responsible AI ·
//   Governance AI · Compliance AI · Incident AI · Meeting AI ·
//   Note AI · Test AI · Job AI · Business Value.
// SpecComponentCard — every component is interactive.
// Click the card header to reveal:
//   • What happens on click (the operation contract)
//   • Journey map (where this card sits in the process)
//   • Horizontal flow (Input → Process → Output)
//   • Objective / Goal (why this card exists)
// + 4 standard operations: Run · View · Edit · Validate (each logs to onAction).
// Operator 2026-06-05: "each card must have some information ... click of that
// what going to happen, what is journey map, flow horizontal flow, what is
// objective or goal".
// Classify a component label into an editor input type — drives the Edit
// modal's input element. Mirrors the keyword categories in componentDerivedValue.
function componentEditorType(label) {
  const l = label.toLowerCase();
  if (l.match(/\b(cost|revenue|saving|gain|cash|spend|budget|investment|benefit|premium|roi|npv|loss|fee|price)\b/))
    return { type: 'currency', prefix: '$', suffix: 'K' };
  if (l.match(/\b(score|rate|percent|coverage|accuracy|precision|recall|f1|adoption|retention|csat|nps|disparate|gap)\b/))
    return { type: 'percent', suffix: '%' };
  if (l.match(/\b(time|latency|duration|runtime|cycle|mttd|mttr|sla|response|wait|p50|p95|p99)\b/))
    return { type: 'duration', suffix: 'ms' };
  if (l.match(/\b(case|claim|policy|ticket|count|volume|throughput|requests|jobs|run|test|defect|incident|violation|alert)\b/))
    return { type: 'count' };
  // Status-y labels
  if (l.match(/\b(status|priority|stage|tier|severity|risk)\b/))
    return { type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] };
  return { type: 'text' };
}

// Per-component semantics — what's the objective + outcome of this card?
// Heuristic by keyword in the label. Operator 2026-06-05: "what is objective
// of each component .... what outcome they bring".
function componentSemantics(label) {
  const l = label.toLowerCase();
  // Stories / epics / requirements
  if (l.match(/\b(story|epic|sub.story|backlog|sprint|release|roadmap)\b/))
    return {
      objective: `Capture and track ${label} so engineering work traces back to business intent.`,
      outcome:   `Every commit, drill, and deploy links to a ${label}; planning becomes predictable.`,
    };
  // KPIs / metrics / scores
  if (l.match(/\b(kpi|metric|score|target|threshold|sla|gini|auc|accuracy|precision|recall|f1|cost|revenue|roi|npv|irr|payback|adoption|csat|nps|mttd|mttr)\b/))
    return {
      objective: `Measure ${label} continuously so the process is steered by data, not opinion.`,
      outcome:   `Time-series of ${label} with SLA breach alerts and drill-down to driver rows.`,
    };
  // Tests / cases
  if (l.match(/\b(test|case|drill|positive|negative|boundary|regression|coverage|defect)\b/))
    return {
      objective: `Lock the behavior of this process via ${label}; catch every regression pre-deploy.`,
      outcome:   `Pass/fail trend per ${label}; coverage grows monotonically; flakes investigated.`,
    };
  // Models / agents / AI
  if (l.match(/\b(model|agent|llm|rag|embedding|prompt|version|registry|experiment|champion|challenger)\b/))
    return {
      objective: `Govern ${label} so every deployed AI is versioned, ADR-traceable, and rollback-able.`,
      outcome:   `Per-${label} registry entry with metrics, owner, ADR link, and rollback target.`,
    };
  // Governance / risk / compliance / audit
  if (l.match(/\b(policy|policies|control|risk|compliance|audit|regulation|governance|bias|fairness|privacy|consent|approval|sign|certification)\b/))
    return {
      objective: `Enforce ${label} so AI decisions are policy-bound, scope-grounded, and reversible.`,
      outcome:   `Decision audit row references ${label}; violations surface within minutes.`,
    };
  // Data / schema / lineage
  if (l.match(/\b(data|schema|table|column|index|migration|contract|lineage|quality|freshness|source|master|metadata|sample)\b/))
    return {
      objective: `Make ${label} discoverable, contracted, lineaged, and access-controlled.`,
      outcome:   `Data consumers can answer "where did this come from?" and "is it fresh?" instantly.`,
    };
  // API / endpoint / interface
  if (l.match(/\b(api|endpoint|method|auth|rate|webhook|callback|integration|adapter)\b/))
    return {
      objective: `Expose ${label} with a stable contract, auth, rate limits, and idempotency keys.`,
      outcome:   `Consumers integrate without breaking changes; calls are observable per request_id.`,
    };
  // Docs / runbook / readme
  if (l.match(/\b(brd|frd|hld|lld|sad|adr|runbook|roadmap|readme|exec.summary|stakeholders|capacity|cost.analysis|architecture|c4|sequence|network)\b/))
    return {
      objective: `Document ${label} so the design + decisions survive team turnover and audit.`,
      outcome:   `Any new engineer or auditor can answer "why was this built this way?" in <10 min.`,
    };
  // Operations / monitoring / alerts / logs
  if (l.match(/\b(monitor|monitoring|alert|log|trace|observ|dashboard|deploy|rollback|incident|mttd|mttr|on.call|escalation)\b/))
    return {
      objective: `Surface ${label} in production so on-call can detect, diagnose, and rollback fast.`,
      outcome:   `Mean time to detect/resolve trends down quarter-over-quarter; zero blind spots.`,
    };
  // Visualizations / charts / reports
  if (l.match(/\b(chart|graph|diagram|visual|plot|trend|heatmap|sankey|tree|gantt|matrix|funnel|donut|report|dashboard)\b/))
    return {
      objective: `Render ${label} so non-engineers understand the state in <30 seconds.`,
      outcome:   `Drill-down from any chart click to the row-level audit evidence behind the value.`,
    };
  // Demo / story / walkthrough
  if (l.match(/\b(demo|persona|scenario|walkthrough|pitch|video|screenshot|recording)\b/))
    return {
      objective: `Make ${label} repeatable so stakeholders see a working flow, not a slide deck.`,
      outcome:   `Reproducible demo with archived recording; pre-loaded sample data; pitch ready.`,
    };
  // Workflow / process / steps
  if (l.match(/\b(workflow|process|step|flow|pipeline|stage|task|action|operation|execution)\b/))
    return {
      objective: `Make ${label} inspectable step-by-step with clear ownership and handoffs.`,
      outcome:   `Bottleneck steps surface; automation candidates are obvious from the data.`,
    };
  // Cron / job / schedule
  if (l.match(/\b(cron|job|schedule|retry|backoff|dead.letter|lock|idempotency)\b/))
    return {
      objective: `Schedule + recover ${label} so batch work runs reliably without manual intervention.`,
      outcome:   `Cron expressions registered; failures alerted; retries bounded; dead-letter visible.`,
    };
  // Explainability / SHAP / LIME / counterfactual
  if (l.match(/\b(shap|lime|importance|explanation|counterfactual|attribution|decision.path|feature.rank)\b/))
    return {
      objective: `Surface ${label} so regulators + customers can ask "why did the AI decide this?".`,
      outcome:   `Per-decision explanation cached in audit row; counterfactual generation < 1s.`,
    };
  // Default — generic but specific to the label
  return {
    objective: `Make ${label} observable, operable, and auditable for this process.`,
    outcome:   `Each interaction with ${label} produces a measurable result in the audit trail.`,
  };
}

// Synthesized current value per card so cards look "real" instead of empty.
// Pulls deterministic numbers from a hash of (label, proc.name) — refresh
// gives the same value. Operator §57.7: explicitly marked as derived/synth.
function componentDerivedValue(label, procKey) {
  const l = label.toLowerCase();
  const seed = `${label}|${procKey || ''}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const rand = (n) => {
    const x = Math.sin(h + n) * 10000;
    return x - Math.floor(x);
  };
  // Format by keyword category
  const fmt = (n, opts = {}) => {
    const { prefix = '', suffix = '', precision = 0 } = opts;
    return prefix + n.toFixed(precision) + suffix;
  };
  // Money
  if (l.match(/\b(cost|revenue|saving|gain|cash|spend|budget|investment|benefit|premium|roi|npv|loss|fee|price)\b/)) {
    const v = Math.round(rand(1) * 9000 + 200);
    const delta = (rand(2) - 0.5) * 30;
    return {
      value: fmt(v, { prefix: '$', suffix: 'K' }),
      delta: fmt(delta, { suffix: '%', precision: 1 }),
      up: delta > 0,
    };
  }
  // Percentage / score
  if (l.match(/\b(score|rate|percent|coverage|accuracy|precision|recall|f1|adoption|retention|csat|nps|disparate|gap)\b/)) {
    const v = Math.round((rand(3) * 30 + 65) * 10) / 10;
    const delta = (rand(4) - 0.5) * 8;
    return {
      value: fmt(v, { suffix: '%', precision: 1 }),
      delta: fmt(delta, { suffix: 'pp', precision: 1 }),
      up: delta > 0,
    };
  }
  // Time / latency
  if (l.match(/\b(time|latency|duration|runtime|cycle|mttd|mttr|sla|response|wait|p50|p95|p99)\b/)) {
    const v = Math.round(rand(5) * 800 + 50);
    const delta = (rand(6) - 0.5) * 40;
    return {
      value: fmt(v, { suffix: 'ms' }),
      delta: fmt(delta, { suffix: '%', precision: 1 }),
      up: delta < 0, // lower is better
    };
  }
  // Count / volume
  if (l.match(/\b(case|claim|policy|ticket|count|volume|throughput|requests|jobs|run|test|defect|incident|violation|alert)\b/)) {
    const v = Math.round(rand(7) * 4800 + 120);
    const delta = (rand(8) - 0.5) * 25;
    return {
      value: fmt(v, {}),
      delta: fmt(delta, { suffix: '%', precision: 1 }),
      up: delta > 0,
    };
  }
  // Default — generic count
  const v = Math.round(rand(9) * 95 + 5);
  return { value: fmt(v, {}), delta: '—', up: null };
}

function SpecComponentCard({ label, color, onAction, phase, procKey, index = 0 }) {
  const sem = componentSemantics(label);
  const derived = componentDerivedValue(label, procKey);
  const editor = componentEditorType(label);
  // Persisted edited value per (process, label) — overrides synth display
  const editKey = `insur.edit.${procKey || '_'}.${label}`;
  const [editedValue, setEditedValueRaw] = useState(() => {
    try { return localStorage.getItem(editKey) || null; } catch (e) { return null; }
  });
  const setEditedValue = (v) => {
    try {
      if (v == null || v === '') localStorage.removeItem(editKey);
      else localStorage.setItem(editKey, v);
    } catch (e) { /* swallow */ }
    setEditedValueRaw(v);
  };
  // Display value: edited overrides synth
  const displayValue = editedValue || derived.value;
  const isEdited = !!editedValue;
  // Phase-tinted card background — operator 2026-06-05: "card must have
  // light color on each card ... different color to understand that is card".
  // Card backgrounds tinted by phase so the operator can SEE this is a card,
  // not the surrounding panel. Operator 2026-06-05: "all background white ..
  // then not clear .. which one is card which one is what?".
  const cardKindStyle = CARD_KIND_STYLE.operation;
  const listTone = cardListTone(index);
  const cardBg = listTone.bg;
  const cardBorder = listTone.border;
  const cardLeftBorder = phase ? phase.color : listTone.left;
  const [status, setStatus] = useState({ op: null, state: 'idle' });
  const [open, setOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  // Edit form modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(derived.value);
  // Op execution — hit backend stub; fall back to mock result if unreachable.
  const runOp = async (op, payload) => {
    setOpen(true);
    if (op === 'Edit' && !payload) {
      // Open the edit form modal instead of immediately firing the request
      setEditValue(derived.value);
      setEditOpen(true);
      return;
    }
    setStatus({ op, state: 'running' });
    if (onAction) onAction(`${op} → ${label}`);
    // Operator 2026-06-05: every component op lands in prompt history.
    saveAction('action', `${op} → ${label}`, { phase: phase?.id, procKey, op, component: label });
    const start = performance.now();
    try {
      const res = await fetch(`/api/v1/holy/components/${encodeURIComponent(op.toLowerCase())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: label, op, ...payload }),
      });
      const ok = res.ok;
      let json = null;
      try { json = await res.json(); } catch (_) { /* swallow */ }
      const result = {
        ok,
        latency_ms: Math.round(performance.now() - start),
        http_status: res.status,
        audit_row_id: json?.audit_row_id || `audit-${Date.now().toString(36)}`,
        outcome: json?.outcome || (ok ? 'ok' : 'error'),
        message: json?.message,
        backend: true,
      };
      setLastResult(result);
      setStatus({ op, state: ok ? 'done' : 'error' });
      saveAction('api', `${op} ${ok ? 'OK' : 'ERR'} ${result.http_status} · ${label}`, {
        endpoint: `/api/v1/holy/components/${op.toLowerCase()}`, method: 'POST',
        http_status: result.http_status, latency_ms: result.latency_ms,
        audit_row_id: result.audit_row_id,
      });
    } catch (err) {
      // Backend unreachable — graceful fallback. Per §57.7, mark it as simulated.
      setLastResult({
        ok: false,
        fallback: true,
        latency_ms: Math.round(performance.now() - start),
        http_status: 0,
        audit_row_id: `mock-${Date.now().toString(36)}`,
        outcome: 'simulated',
        message: `Backend unreachable (${err.message}). Showing simulated outcome.`,
        backend: false,
      });
      setStatus({ op, state: 'done' });
      saveAction('api', `${op} SIM (backend offline) · ${label}`, {
        endpoint: `/api/v1/holy/components/${op.toLowerCase()}`, method: 'POST',
        http_status: 0, fallback: true,
      });
    }
  };
  const ops = [
    { id: 'Run',      icon: '▶', what: `Trigger this component end-to-end. Runs the underlying job, agent, or pipeline for "${label}" and writes the result to the audit row.` },
    { id: 'View',     icon: '👁', what: `Open the read-only detail view for "${label}" — show last run, current value, source bindings, recent history.` },
    { id: 'Edit',     icon: '✎', what: `Open the editor for "${label}" — change configuration / threshold / rule. Routes through approval if scope-gated.` },
    { id: 'Validate', icon: '✓', what: `Run validation checks on "${label}" — schema, contracts, drift, fairness, policy compliance. Logs the verdict to the audit trail.` },
  ];
  return (
    <>
    <div
      data-card-kind="operation"
      aria-label={`MIXED operation card: ${label}`}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderLeft: `4px solid ${cardLeftBorder}`,
        borderRadius: 6,
        fontSize: 12, color: '#0f172a',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* "CARD" type indicator — operator: "something card is present for
          message or operation .. that must be clear" */}
      <div style={{
        padding: '6px 10px',
        background: listTone.chipBg,
        borderBottom: `1px solid ${listTone.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <CardKindBadge kind="operation" />
        <span style={{
          padding: '2px 7px', borderRadius: 999, background: '#fff',
          border: `1px solid ${listTone.border}`, color: listTone.chipFg,
          fontSize: 10, fontWeight: 900,
        }}>#{index + 1}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: listTone.chipFg }}>
          Info header + action buttons
        </span>
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 10, fontWeight: 600 }}>
          click header to expand · buttons execute
        </span>
      </div>
      {/* Card header (clickable — toggles expanded panel) */}
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${cardLeftBorder}11`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title={`${open ? 'Collapse' : 'Expand'} — ${label}`}
        style={{
          width: '100%', textAlign: 'left',
          padding: '10px 12px', background: 'transparent',
          border: 'none', borderRadius: 6,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'background 0.12s',
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: 3,
          background: cardLeftBorder, color: '#fff',
          fontSize: 12, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{open ? '−' : '+'}</span>
        <strong style={{ flex: '0 1 auto' }}>{label}</strong>
        {/* Current value — edited (operator-submitted) or synthesized. */}
        <span style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 4,
          fontSize: 12, marginLeft: 10,
        }} title={isEdited
          ? `Operator-edited value · click Edit to change. Click 🗑 in modal to revert to synth.`
          : `Synthesized current value (deterministic mock — see §57.7).`}>
          <strong style={{
            color: isEdited ? '#0891b2' : '#0f172a',
            fontSize: 14,
          }}>{displayValue}</strong>
          {!isEdited && derived.up !== null && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: derived.up ? '#16a34a' : '#dc2626',
            }}>
              {derived.up ? '▲' : '▼'} {derived.delta}
            </span>
          )}
          <span style={{
            fontSize: 8, fontWeight: 700,
            padding: '1px 5px', borderRadius: 2,
            background: isEdited ? '#cffafe' : 'transparent',
            color:      isEdited ? '#0891b2' : '#94a3b8',
            fontStyle: isEdited ? 'normal' : 'italic',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{isEdited ? '✎ edited' : '(synth)'}</span>
        </span>
        <span style={{ flex: 1 }} />
        {phase && (
          <span style={{
            padding: '1px 6px', borderRadius: 3,
            background: phase.color, color: '#fff',
            fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{phase.icon} {phase.label}</span>
        )}
        {status.state !== 'idle' && (
          <span style={{
            padding: '1px 6px', borderRadius: 3,
            background: status.state === 'done' ? '#16a34a' : '#f59e0b',
            color: '#fff', fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {status.state === 'done' ? `✓ ${status.op} done` : `⏱ ${status.op}…`}
          </span>
        )}
        <span style={{
          fontSize: 9, color: '#94a3b8', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          👆 {open ? 'collapse' : 'click for detail'}
        </span>
      </button>
      <div style={{
        margin: '0 12px 10px', padding: '8px 10px',
        background: '#ffffffaa', border: '1px solid #e2e8f0', borderRadius: 4,
        display: 'grid', gap: 6,
      }}>
        <div style={{ display: 'grid', gap: 3 }}>
          {componentPurposeLines(label, 'operation').map((line) => (
            <div key={line} style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 18px 1fr 18px 1fr', gap: 4,
          alignItems: 'stretch', fontSize: 10,
        }}>
          <div style={{ padding: '5px 6px', background: '#fff', border: '1px solid #0ea5e944', borderLeft: '3px solid #0ea5e9', borderRadius: 4 }}>
            <div style={{ color: '#0ea5e9', fontSize: 8, fontWeight: 900 }}>INPUT</div>
            <div style={{ color: '#334155' }}>trigger + payload</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 900 }}>{'>'}</div>
          <div style={{ padding: '5px 6px', background: '#fff', border: '1px solid #8b5cf644', borderLeft: '3px solid #8b5cf6', borderRadius: 4 }}>
            <div style={{ color: '#8b5cf6', fontSize: 8, fontWeight: 900 }}>PROCESS</div>
            <div style={{ color: '#334155' }}>run / view / edit</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 900 }}>{'>'}</div>
          <div style={{ padding: '5px 6px', background: '#fff', border: '1px solid #16a34a44', borderLeft: '3px solid #16a34a', borderRadius: 4 }}>
            <div style={{ color: '#16a34a', fontSize: 8, fontWeight: 900 }}>OUTPUT</div>
            <div style={{ color: '#334155' }}>status + audit</div>
          </div>
        </div>
      </div>
      {/* Operation buttons (always visible) */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap',
        padding: '0 12px 10px',
      }}>
        {ops.map((o) => {
          const isRunning = status.op === o.id && status.state === 'running';
          const isDone = status.op === o.id && status.state === 'done';
          const disabled = status.state === 'running';
          const bg = isRunning ? '#f59e0b' : isDone ? '#16a34a' : '#fff';
          const fg = isRunning || isDone ? '#fff' : CARD_KIND_STYLE.action.ctaBg;
          return (
          <button key={o.id} type="button"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); runOp(o.id); }}
            title={o.what}
            onMouseEnter={(e) => {
              if (disabled || isDone) return;
              e.currentTarget.style.background = CARD_KIND_STYLE.action.ctaBg;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = bg;
              e.currentTarget.style.color = fg;
            }}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 800,
              background: bg, color: fg,
              border: `1.5px solid ${isDone ? '#16a34a' : CARD_KIND_STYLE.action.border}`,
              borderRadius: 4,
              cursor: disabled ? 'wait' : 'pointer',
              boxShadow: isRunning
                ? '0 0 0 3px #f59e0b33'
                : isDone
                  ? '0 0 0 3px #16a34a22'
                  : `0 1px 0 ${color}33, inset 0 -1px 0 ${color}11`,
              transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              opacity: disabled && !isRunning ? 0.55 : 1,
            }}>
            <span style={{ fontSize: 12 }}>{isRunning ? '...' : isDone ? '✓' : o.icon}</span> {isRunning ? `${o.id} active` : o.id}
          </button>
          );
        })}
      </div>
      {(status.state !== 'idle' || lastResult) && (
        <div style={{
          margin: '0 12px 10px', padding: '8px 10px',
          background: status.state === 'running' ? '#fffbeb' : lastResult?.ok ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${status.state === 'running' ? '#fcd34d' : lastResult?.ok ? '#86efac' : '#cbd5e1'}`,
          borderLeft: `4px solid ${status.state === 'running' ? '#f59e0b' : lastResult?.ok ? '#16a34a' : color}`,
          borderRadius: 4,
          fontSize: 11,
          color: '#0f172a',
        }}>
          <strong>{status.state === 'running' ? 'Action running' : 'Action completed'}:</strong>{' '}
          {status.op || lastResult?.outcome} · {new Date().toLocaleString()} ·{' '}
          {status.state === 'running'
            ? 'button remains active and other operations wait until completion.'
            : `outcome saved to history/audit (${lastResult?.audit_row_id || 'local action log'}).`}
        </div>
      )}
      {/* Expanded detail: What happens / Journey / Flow / Objective */}
      {open && (
        <div style={{
          padding: '10px 12px',
          background: `${color}08`,
          borderTop: `1px solid ${color}22`,
          borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        }}>
          {/* Last result panel — shows real backend response or fallback */}
          {lastResult && (
            <div style={{
              marginBottom: 10, padding: '8px 10px',
              background: lastResult.ok ? '#dcfce7' : (lastResult.fallback ? '#fef3c7' : '#fee2e2'),
              border: `1px solid ${lastResult.ok ? '#86efac' : (lastResult.fallback ? '#fcd34d' : '#fca5a5')}`,
              borderRadius: 4,
              fontSize: 11, color: '#0f172a',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: lastResult.ok ? '#16a34a' : (lastResult.fallback ? '#b45309' : '#dc2626'),
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 3,
              }}>
                {lastResult.ok ? '✓ Last result (backend)' :
                 lastResult.fallback ? '⚠ Last result (simulated — backend unreachable)' :
                 '✗ Last result (error)'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10 }}>
                <span><strong>outcome:</strong> {lastResult.outcome}</span>
                <span><strong>latency:</strong> {lastResult.latency_ms}ms</span>
                <span><strong>http:</strong> {lastResult.http_status || '—'}</span>
                <span><strong>audit:</strong> <code style={{ fontFamily: 'monospace' }}>{lastResult.audit_row_id}</code></span>
              </div>
              {lastResult.message && (
                <div style={{ marginTop: 4, fontSize: 10, fontStyle: 'italic' }}>{lastResult.message}</div>
              )}
            </div>
          )}
          {/* 1. What happens on click */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>🖱 What happens on click</div>
            <div style={{
              display: 'grid', gap: 4,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}>
              {ops.map((o, idx) => {
                const tone = cardListTone(idx);
                return (
                <div key={o.id} style={{
                  padding: '6px 8px', background: tone.bg,
                  border: `1px solid ${tone.border}`, borderRadius: 4,
                  fontSize: 11,
                }}>
                  <strong style={{ color }}>{o.icon} {o.id}</strong>
                  <div style={{ color: '#475569', marginTop: 2, fontSize: 10, lineHeight: 1.4 }}>
                    {o.what}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          {/* 2. Journey map */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>🗺 Journey map</div>
            <div style={{
              padding: '8px 10px', background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
              fontSize: 11, color: '#475569',
            }}>
              <strong>{label}</strong> sits inside this tab's process loop.
              It is touched when an operator (or upstream agent) needs to
              read, configure, validate, or trigger the underlying capability.
              Each interaction is recorded in the audit row with request_id +
              tenant_id + actor (per §57.6).
            </div>
          </div>
          {/* 3. Horizontal flow */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>↔ Horizontal flow</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 18px 1fr 18px 1fr',
              gap: 4, alignItems: 'stretch',
              fontSize: 11,
            }}>
              <div style={{
                padding: '6px 8px', background: '#fff',
                border: '1px solid #0ea5e955',
                borderLeft: '3px solid #0ea5e9', borderRadius: 4,
              }}>
                <div style={{ fontSize: 8, color: '#0ea5e9', fontWeight: 700 }}>INPUT</div>
                <div style={{ color: '#0f172a' }}>Trigger · payload · scope grant</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>→</div>
              <div style={{
                padding: '6px 8px', background: '#fff',
                border: '1px solid #8b5cf655',
                borderLeft: '3px solid #8b5cf6', borderRadius: 4,
              }}>
                <div style={{ fontSize: 8, color: '#8b5cf6', fontWeight: 700 }}>PROCESS</div>
                <div style={{ color: '#0f172a' }}>{label} executes its op</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>→</div>
              <div style={{
                padding: '6px 8px', background: '#fff',
                border: '1px solid #16a34a55',
                borderLeft: '3px solid #16a34a', borderRadius: 4,
              }}>
                <div style={{ fontSize: 8, color: '#16a34a', fontWeight: 700 }}>OUTPUT</div>
                <div style={{ color: '#0f172a' }}>Result · audit row · status</div>
              </div>
            </div>
          </div>
          {/* 4. Why present */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>❓ Why this component is present</div>
            <div style={{
              padding: '6px 8px', background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
              fontSize: 11, color: '#0f172a',
            }}>
              <strong>{label}</strong> exists because the tab's mission cannot
              succeed without it. Without {label}, the {phase ? phase.label.toLowerCase() : 'process'} layer
              has a gap that breaks downstream consumers, audit evidence, or
              regulator-readable claims.
            </div>
          </div>
          {/* 5. Objective / Goal */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>🏆 Objective · Goal</div>
            <div style={{
              padding: '6px 8px', background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
              fontSize: 11, color: '#0f172a',
            }}>
              {sem.objective}
            </div>
          </div>
          {/* 6. Outcome — measurable result */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>🎯 Outcome</div>
            <div style={{
              padding: '6px 8px', background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
              fontSize: 11, color: '#0f172a',
            }}>
              {sem.outcome}
            </div>
          </div>
          {/* 6. Visualization · Graph */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>📊 Visualization · Graph</div>
            <div style={{
              padding: 10, background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
              fontSize: 11, color: '#475569', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📈</div>
              <div>Time-series of <strong>{label}</strong> over last 24h</div>
              <div style={{
                fontSize: 9, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace',
              }}>wire → proc.visualization (live data)</div>
            </div>
          </div>
          {/* 7. History — last operations */}
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, color,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>🕒 History</div>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 10, background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 4,
            }}>
              <thead>
                <tr>
                  {['Time', 'Actor', 'Op', 'Status'].map((h) => (
                    <th key={h} style={{
                      padding: '4px 6px', textAlign: 'left',
                      background: '#f8fafc', color: '#475569', fontWeight: 700,
                      borderBottom: '1px solid #e2e8f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{
                    padding: 8, textAlign: 'center',
                    color: '#94a3b8', fontStyle: 'italic',
                  }}>
                    No history yet for <strong>{label}</strong>.
                    History populates after the first Run / View / Edit / Validate click.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    {/* Edit form modal — opens when Edit button clicked, submits a real
        backend op with the new value. Operator: "Edit button can't edit". */}
    {editOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`edit-modal-title-${label.replace(/\s+/g, '-')}`}
        onClick={() => setEditOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(226, 232, 240, 0.78)',
          zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            // Format the new value with the editor's suffix when applicable
            let formatted = String(editValue);
            if (editor.suffix && !formatted.endsWith(editor.suffix)) formatted += editor.suffix;
            if (editor.prefix && !formatted.startsWith(editor.prefix)) formatted = editor.prefix + formatted;
            setEditedValue(formatted);
            setEditOpen(false);
            runOp('Edit', { new_value: formatted });
          }}
          style={{
            width: 'min(480px, 100%)',
            background: '#fff', borderRadius: 8,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px',
            background: cardLeftBorder, color: '#fff',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              opacity: 0.85,
            }}>✎ Edit component ({editor.type})</div>
            <div id={`edit-modal-title-${label.replace(/\s+/g, '-')}`} style={{ fontSize: 18, fontWeight: 800 }}>{label}</div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 6,
            }}>Current value {isEdited ? '(operator-edited)' : '(synth)'}</label>
            <div style={{
              padding: '6px 10px', fontSize: 13, color: '#0f172a',
              background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4,
              marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <strong>{displayValue}</strong>
              {!isEdited && derived.up !== null && (
                <span style={{ fontSize: 11, color: derived.up ? '#16a34a' : '#dc2626' }}>
                  {derived.up ? '▲' : '▼'} {derived.delta}
                </span>
              )}
              {isEdited && (
                <button type="button"
                  onClick={() => { setEditedValue(null); setEditValue(derived.value); }}
                  title="Revert to synth value"
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px', fontSize: 10, fontWeight: 700,
                    background: '#fff', color: '#dc2626',
                    border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer',
                  }}>🗑 Revert</button>
              )}
            </div>
            <label
              htmlFor={`edit-input-${label.replace(/\s+/g, '-')}`}
              style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 6,
              }}>
              New value
              {editor.suffix && <span style={{ color: '#94a3b8', fontWeight: 400 }}> ({editor.suffix})</span>}
              {editor.prefix && <span style={{ color: '#94a3b8', fontWeight: 400 }}> ({editor.prefix})</span>}
            </label>
            {editor.type === 'select' ? (
              <select
                id={`edit-input-${label.replace(/\s+/g, '-')}`}
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: `2px solid ${cardLeftBorder}`,
                  borderRadius: 4, outline: 'none',
                  background: '#fff', color: '#0f172a',
                }}
              >
                {editor.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                id={`edit-input-${label.replace(/\s+/g, '-')}`}
                autoFocus
                type={(editor.type === 'currency' || editor.type === 'percent' || editor.type === 'duration' || editor.type === 'count') ? 'number' : 'text'}
                step={editor.type === 'percent' ? '0.1' : '1'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: `2px solid ${cardLeftBorder}`,
                  borderRadius: 4, outline: 'none',
                }}
              />
            )}
            <div style={{
              marginTop: 8, padding: '6px 10px',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 4,
              fontSize: 10, color: '#92400e',
            }}>
              <strong>Note:</strong> Edit will hit <code>POST /api/v1/holy/components/edit</code> with
              {' '}<code>{`{ component: "${label}", op: "Edit", new_value: <value> }`}</code>.
              {' '}Routes through HITL approval per the governance layer if scope-gated.
              {' '}Value also persists locally so the card shows it immediately.
            </div>
          </div>
          <div style={{
            padding: '10px 16px', borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 8, justifyContent: 'flex-end',
          }}>
            <button type="button"
              onClick={() => setEditOpen(false)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                background: '#fff', color: '#475569',
                border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer',
              }}>Cancel</button>
            <button type="submit"
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                background: cardLeftBorder, color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>Submit Edit</button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}
function SpecKpiTile({ label, color }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#fff',
      border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`,
      borderRadius: 6,
      fontSize: 12, color: '#0f172a',
    }}>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI</div>
      <strong style={{ fontSize: 13 }}>{label}</strong>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>—</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
        Operator-pending measurement
      </div>
    </div>
  );
}
function SpecSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{
        margin: '0 0 8px', fontSize: 13, color,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{title}</h3>
      {children}
    </div>
  );
}
function renderSpecTab(tabId, subId, color, procKey) {
  const spec = TAB_SPEC[`${tabId}.${subId}`];
  if (!spec) {
    return <PendingSection tab={{ id: tabId, label: tabId }} sub={{ id: subId, label: subId }} />;
  }
  return (
    <>
      {spec.formula && (
        <div style={{
          marginBottom: 16, padding: 14,
          background: `${color}11`, border: `1px solid ${color}55`,
          borderLeft: `4px solid ${color}`, borderRadius: 6,
        }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formula</div>
          <code style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>{spec.formula}</code>
        </div>
      )}
      <SpecSection title="Components" color={color}>
        <CardKindLegend />
        {/* Operator 2026-06-05: "one component talk about one thing ... there
            must be theme base component ... one row" + "logical sequence based
            on journey flow" + "input, process, output".
            Single-column stacked cards, numbered to show sequence, each tagged
            with INPUT / PROCESS / OUTPUT based on its position in the journey. */}
        {/* Components flow header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 24px 1fr 24px 1fr',
          gap: 4, alignItems: 'center',
          marginBottom: 10,
          fontSize: 10, fontWeight: 700,
        }}>
          <div style={{ textAlign: 'center', color: '#0ea5e9', padding: '4px 6px', background: '#0ea5e911', borderRadius: 4 }}>📥 INPUT</div>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>→</div>
          <div style={{ textAlign: 'center', color: '#8b5cf6', padding: '4px 6px', background: '#8b5cf611', borderRadius: 4 }}>⚙ PROCESS</div>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>→</div>
          <div style={{ textAlign: 'center', color: '#16a34a', padding: '4px 6px', background: '#16a34a11', borderRadius: 4 }}>📤 OUTPUT</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {spec.components.map((c, i) => {
            const total = spec.components.length;
            const phase = (i < Math.ceil(total / 3))
              ? { label: 'INPUT',   color: '#0ea5e9', icon: '📥' }
              : (i < Math.ceil((2 * total) / 3))
                ? { label: 'PROCESS', color: '#8b5cf6', icon: '⚙' }
                : { label: 'OUTPUT',  color: '#16a34a', icon: '📤' };
            return (
              <div key={c} style={{ position: 'relative' }}>
                {i > 0 && (
                  <div style={{
                    width: 2, height: 14, background: `${color}55`,
                    marginLeft: 22,
                  }} aria-hidden="true" />
                )}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                  <div style={{
                    flex: '0 0 36px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    paddingTop: 12,
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: color, color: '#fff',
                      fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: phase.color,
                      textAlign: 'center', lineHeight: 1.1,
                    }}>{phase.icon}<br />{phase.label}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SpecComponentCard label={c} color={color} phase={phase} procKey={procKey} index={i} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SpecSection>
      {spec.kpis && spec.kpis.length > 0 && (
        <SpecSection title="KPIs" color={color}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8,
          }}>
            {spec.kpis.map((k) => <SpecKpiTile key={k} label={k} color={color} />)}
          </div>
        </SpecSection>
      )}
      {/* FINAL OUTCOME SCORE — aggregates component contributions.
          Operator 2026-06-05: "how would you score them on final outcome". */}
      <SpecSection title="Final outcome score" color={color}>
        <div style={{
          padding: 14, background: '#fff',
          border: `2px solid ${color}`,
          borderRadius: 8,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <div style={{
              padding: '10px 14px', background: color, color: '#fff',
              borderRadius: 6, fontSize: 20, fontWeight: 800,
              minWidth: 70, textAlign: 'center',
            }}>
              {(() => {
                const n = spec.components.length;
                const base = 60;
                const perComp = Math.min(35, n * 4);
                const kpiBonus = (spec.kpis?.length || 0) * 1.2;
                const visualBonus = (spec.visuals?.length || 0) * 1.5;
                return Math.min(99, Math.round(base + perComp + kpiBonus + visualBonus));
              })()}<span style={{ fontSize: 12 }}>/100</span>
            </div>
            <div style={{ flex: 1, fontSize: 12, color: '#0f172a' }}>
              <div style={{
                fontSize: 10, color: '#64748b', textTransform: 'uppercase',
                letterSpacing: '0.05em', fontWeight: 700, marginBottom: 2,
              }}>How the tab scores against its mission</div>
              <div>
                <strong>{spec.components.length}</strong> operation cards ·{' '}
                <strong>{spec.kpis?.length || 0}</strong> KPIs ·{' '}
                <strong>{spec.visuals?.length || 0}</strong> visuals contributing to the tab's final outcome.
              </div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['#', 'Component', 'Phase', 'Objective', 'Outcome', 'Contribution'].map((h) => (
                  <th key={h} style={{
                    padding: '6px 8px', textAlign: 'left',
                    background: '#f8fafc', color: '#475569', fontWeight: 700,
                    borderBottom: `1px solid ${color}33`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.components.map((c, i) => {
                const total = spec.components.length;
                const phase = (i < Math.ceil(total / 3))
                  ? { label: 'INPUT',   color: '#0ea5e9' }
                  : (i < Math.ceil((2 * total) / 3))
                    ? { label: 'PROCESS', color: '#8b5cf6' }
                    : { label: 'OUTPUT',  color: '#16a34a' };
                const sem = componentSemantics(c);
                const contribution = Math.round((1 / total) * 100);
                return (
                  <tr key={c} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 600 }}>{c}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 3,
                        background: phase.color, color: '#fff',
                        fontSize: 9, fontWeight: 700,
                      }}>{phase.label}</span>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#475569', fontSize: 10, lineHeight: 1.4 }}>{sem.objective}</td>
                    <td style={{ padding: '6px 8px', color: '#475569', fontSize: 10, lineHeight: 1.4 }}>{sem.outcome}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '2px 6px', borderRadius: 3,
                        background: `${color}22`, color, fontWeight: 700, fontSize: 10,
                      }}>{contribution}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SpecSection>

      {spec.visuals && spec.visuals.length > 0 && (
        <SpecSection title="Visuals" color={color}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8,
          }}>
            {spec.visuals.map((v, idx) => {
              const tone = cardListTone(idx);
              return (
              <div key={v} style={{
                padding: 14, background: tone.bg,
                border: `1px dashed ${tone.border}`, borderRadius: 6,
                fontSize: 12, color: '#475569', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
                <strong>{v}</strong>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
                  Visualization placeholder — wire to live data
                </div>
              </div>
              );
            })}
          </div>
        </SpecSection>
      )}
    </>
  );
}

// =============================================================
// TAB_CHARTER — per-tab charter (operator 2026-06-05):
//   Every tab must answer:
//     1. What is this tab (information)
//     2. Why this tab exists (rationale)
//     3. What it addresses (problem/scope)
//     4. How (methodology)
//     5. How user should navigate
//     6. Objectives & Goals
//     7. Scope
//     8. Out of scope
// Rendered at the top of every tab body (after the identity banner).
// =============================================================
// ────────────────────────────────────────────────────────────────────
// TAB_PROFILES — per-tab type classification (operator: "where we need
// to mix or we need to specific"). Each profile carries:
//   type:        information | action | visualization | decision | mixed
//   ratio:       info / viz / action percentages (sums to 100, from operator's specs)
//   primary_user: the role most likely to live in this tab
//   intent:      one-line "this tab helps you X by Y" for the Identity banner
//   emphasis:    a section key the TabFrame elevates between Components + Actions
//                (knowledge / kanban / dashboard / decision-support / none)
// ────────────────────────────────────────────────────────────────────
const TAB_PROFILES = {
  'problem-as-is': { type: 'information',  info: 65, viz: 15, action: 20, primary_user: 'Operations Owner', intent: 'Frame the current problem, pain, AS-IS process, and gap before any solution work', emphasis: 'knowledge' },
  'to-be':       { type: 'decision',     info: 45, viz: 20, action: 35, primary_user: 'Product Owner', intent: 'Define the future-state process, target outcome, roadmap, and success gate', emphasis: 'decision-support' },
  'ai-strategy': { type: 'decision',     info: 40, viz: 20, action: 40, primary_user: 'AI Strategy Lead', intent: 'Select the right AI type and validate value, risk, and operating fit', emphasis: 'decision-support' },
  'digital-transformation': { type: 'mixed', info: 35, viz: 25, action: 40, primary_user: 'Transformation Lead', intent: 'Map the people, process, technology, adoption, and change plan', emphasis: 'kanban' },
  'manual-transaction': { type: 'action', info: 35, viz: 15, action: 50, primary_user: 'Operations Team', intent: 'Document the manual user transaction path, controls, handoffs, and exceptions', emphasis: 'kanban' },
  'manual-explore':     { type: 'action', info: 30, viz: 30, action: 40, primary_user: 'UX + Process Designer', intent: 'Explore layout variants (left sequence + right operations) for the manual process before committing to one', emphasis: 'kanban' },
  'automatic-pipeline': { type: 'action', info: 30, viz: 20, action: 50, primary_user: 'IT Delivery Team', intent: 'Define the automatic pipeline trigger, orchestration, monitoring, and fallback', emphasis: 'kanban' },
  'accuracy-benchmarking': { type: 'visualization', info: 30, viz: 50, action: 20, primary_user: 'Model Validator', intent: 'Compare accuracy, benchmarks, thresholds, and release evidence', emphasis: 'dashboard' },
  'analytical-ai-process': { type: 'visualization', info: 35, viz: 45, action: 20, primary_user: 'Analyst', intent: 'Turn analytical questions, features, analysis, and insights into decisions', emphasis: 'dashboard' },
  'ai-control-tower': { type: 'visualization', info: 25, viz: 50, action: 25, primary_user: 'AI Operations Lead', intent: 'Monitor AI health, alerts, drift, cost, incidents, and approvals', emphasis: 'dashboard' },
  // Pure-INFORMATION (60%+ info)
  'readme':       { type: 'information',  info: 70, viz: 15, action: 15, primary_user: 'Architect',         intent: 'Understand the architecture + decisions behind this process',                 emphasis: 'knowledge' },
  'overview':     { type: 'information',  info: 80, viz: 15, action:  5, primary_user: 'Executive',         intent: 'See this process at a glance in 30 seconds',                                  emphasis: 'none' },
  'note-ai':      { type: 'information',  info: 60, viz: 20, action: 20, primary_user: 'Analyst',           intent: 'Capture, organize, and reuse process knowledge',                              emphasis: 'knowledge' },
  'user-story':   { type: 'information',  info: 65, viz: 10, action: 25, primary_user: 'Product Manager',   intent: 'Trace business intent → functional behavior → acceptance criteria',          emphasis: 'knowledge' },
  // Pure-VISUALIZATION (45%+ viz)
  'analytics':    { type: 'visualization', info: 20, viz: 65, action: 15, primary_user: 'Executive',         intent: 'Measure how the process is performing — is it making money?',                 emphasis: 'dashboard' },
  'dashboard':    { type: 'visualization', info: 25, viz: 60, action: 15, primary_user: 'Manager',           intent: 'See your role-scoped KPIs + drill down to row-level evidence',                emphasis: 'dashboard' },
  'biz-value':    { type: 'visualization', info: 25, viz: 55, action: 20, primary_user: 'Executive',         intent: 'Quantify revenue ↑ · cost ↓ · risk ↓ · ROI for this process',                 emphasis: 'dashboard' },
  'exp-ai':       { type: 'visualization', info: 45, viz: 45, action: 10, primary_user: 'Auditor',           intent: 'Explain why the AI decided what it decided — for regulators + users',         emphasis: 'decision-support' },
  // Pure-ACTION (45%+ action)
  'inc-ai':       { type: 'action',        info: 20, viz: 30, action: 50, primary_user: 'Operations',        intent: 'Resolve AI failures fast — triage → fix → prevent recurrence',                emphasis: 'kanban' },
  'meet-ai':      { type: 'action',        info: 30, viz: 20, action: 50, primary_user: 'Manager',           intent: 'Turn discussions into accountable work + audit trail',                        emphasis: 'kanban' },
  'job-ai':       { type: 'action',        info: 25, viz: 25, action: 50, primary_user: 'Operations',        intent: 'Schedule, monitor, recover batch/cron AI workloads',                          emphasis: 'kanban' },
  'test-ai':      { type: 'action',        info: 25, viz: 40, action: 35, primary_user: 'Tester',            intent: 'Prove the AI works before release — drill every surface',                     emphasis: 'kanban' },
  // DECISION-support (medium info + high stakes)
  'gov-ai':       { type: 'decision',      info: 40, viz: 25, action: 35, primary_user: 'CIO',               intent: 'Approve, control, govern every AI in production',                             emphasis: 'decision-support' },
  'comp-ai':      { type: 'decision',      info: 35, viz: 35, action: 30, primary_user: 'Compliance Team',   intent: 'Prove every required control passed for every regulation',                    emphasis: 'decision-support' },
  'res-ai':       { type: 'decision',      info: 40, viz: 35, action: 25, primary_user: 'Risk Team',         intent: 'Just because AI can — should it? Fairness, bias, safety, oversight',          emphasis: 'decision-support' },
  // MIXED (no single dimension > 45%)
  'process':      { type: 'mixed',         info: 30, viz: 25, action: 45, primary_user: 'Process Owner',     intent: 'Inspect manual + automated workflow, approvals, current run state',           emphasis: 'kanban' },
  'data':         { type: 'mixed',         info: 35, viz: 30, action: 35, primary_user: 'Data Owner',        intent: 'Trust the inputs — sources, contracts, quality, lineage, access',             emphasis: 'knowledge' },
  'ai':           { type: 'mixed',         info: 35, viz: 35, action: 30, primary_user: 'AI Engineer',       intent: 'Inventory + govern + run every AI capability in this process',                emphasis: 'decision-support' },
  'operations':   { type: 'mixed',         info: 25, viz: 35, action: 40, primary_user: 'Operations',        intent: 'Day-2 health: monitoring, alerts, deploy, rollback, SLA',                     emphasis: 'kanban' },
  'reports':      { type: 'mixed',         info: 30, viz: 40, action: 30, primary_user: 'Manager',           intent: 'Generate + distribute per-role / per-cadence reports with audit',             emphasis: 'dashboard' },
  'product-mgr':  { type: 'mixed',         info: 35, viz: 25, action: 40, primary_user: 'Product Manager',   intent: 'Plan the roadmap, decompose stories, manage sprint + releases',               emphasis: 'kanban' },
  'user-demo':    { type: 'mixed',         info: 40, viz: 25, action: 35, primary_user: 'Sales Engineer',    intent: 'Run the demo — pre-loaded data, walkthrough, screenshots, recording',         emphasis: 'knowledge' },
};

// Color + icon per type
const TYPE_META = {
  information:   { icon: '📚', color: '#0891b2', label: 'Information' },
  visualization: { icon: '📊', color: '#16a34a', label: 'Visualization' },
  action:        { icon: '⚡', color: '#dc2626', label: 'Action' },
  decision:      { icon: '⚖',  color: '#7c3aed', label: 'Decision' },
  mixed:         { icon: '🧩', color: '#475569', label: 'Mixed' },
};

const TAB_CHARTER = {
  'readme': {
    what: 'The Architecture & Planning hub for this process — BRD, FRD, HLD, LLD, SAD, C4 model, sequence/network/API/DB diagrams, ADRs, runbook, roadmap, stakeholders, exec summary, capacity, AI strategy, cost analysis.',
    why: 'A process can only be safely built, audited, and handed off when every architectural layer is documented and discoverable in one place.',
    addresses: 'Who owns it · what we are building · why we picked this design · what diagrams describe it · what trade-offs were locked in.',
    how: 'Each sub-tab maps 1:1 to a standard SDLC artifact pulled from proc.readme.<key> in the blueprint. Operators populate fields; reviewers cross-reference.',
    navigate: 'Click sub-tabs left→right. Start with BRD (business intent) → FRD (functional requirements) → HLD → LLD → SAD → C4 → diagrams → API/DB → ADR → Runbook → Roadmap → Stakeholders → Exec Summary → Capacity → AI Strategy → Cost.',
    objectives: [
      'One authoritative source for architecture per process',
      'Zero ambiguity about decisions (ADR-traceable)',
      'Quick onboarding: new engineer can navigate in <10 min',
      'Audit-ready evidence per §47 (7-surface design)',
    ],
    scope: 'Design + planning artifacts only. Architectural decisions, contracts, diagrams.',
    out_of_scope: 'Day-to-day operations (→ Operations tab), live KPIs (→ Dashboard tab), executed test runs (→ Test AI tab).',
  },
  'overview': {
    what: 'A quick at-a-glance summary of the process — name, owner, status, top KPIs, problem statement.',
    why: 'Executives and operators need a 30-second answer to "what is this process and where is it today?".',
    addresses: 'What is this process · who owns it · what business value does it deliver · what state is it in right now.',
    how: 'Pulls the headline fields from proc.readme.executive_summary, smart_kpi, and as_is_to_be summary.',
    navigate: 'Read top-to-bottom. The identity banner + AS-IS/TO-BE/ROI ribbon answer everything else.',
    objectives: [
      'Answer "what is this?" in 30 seconds',
      'Surface the headline KPI and ROI',
      'Link out to every detailed tab',
    ],
    scope: 'Single-screen executive snapshot.',
    out_of_scope: 'Detailed analytics, role-specific dashboards, model-level metrics.',
  },
  'product-mgr': {
    what: 'Product Management workspace — vision, roadmap, epics, stories, sub-stories, backlog, sprint plan, releases, KPIs, customer feedback.',
    why: 'Engineering + AI delivery only succeeds when product intent is locked in advance with traceable stories and a roadmap.',
    addresses: 'What are we building this quarter · what stories are blocked · what is in this sprint · how are we measuring product success.',
    how: 'Stories cascade vision → epic → story → sub-story; each carries owner, estimate, status, acceptance criteria. Sprint plan and roadmap show capacity vs commitment.',
    navigate: 'Vision → Roadmap → Epics → Stories → Sub Stories. Then check Backlog, Sprint Plan, Releases, KPIs, Customer Feedback.',
    objectives: [
      'Every commit traces to a story',
      'Roadmap predictable 2–4 quarters out',
      'Customer feedback loops directly into backlog',
    ],
    scope: 'Product strategy, story decomposition, planning, customer feedback.',
    out_of_scope: 'Technical implementation details (→ README), live model metrics (→ AI tab).',
  },
  'process': {
    what: 'The end-to-end process workflow — manual AS-IS, automatic TO-BE, pipeline status, approvals, history.',
    why: 'A process design that cannot be inspected step-by-step cannot be improved or automated safely.',
    addresses: 'How does this process actually run today · how will it run automated · who approves what · where did each instance go.',
    how: 'Manual sub-tab pulls proc.manual_process; Automatic pulls proc.automatic_process; Pipeline shows current run status; Approvals shows HITL queue.',
    navigate: 'Workflow → Manual Execution → Automatic Execution → Pipeline Status → Approvals → History.',
    objectives: [
      'Show manual + automated paths side-by-side',
      'Make HITL approvals discoverable',
      'Provide a complete run history per instance',
    ],
    scope: 'Process flow, execution status, HITL approvals.',
    out_of_scope: 'Underlying data quality (→ Data tab), AI model details (→ AI tab).',
  },
  'data': {
    what: 'Data lifecycle for this process — sources, discovery, quality, preparation, master data, metadata, lineage, security, monitoring.',
    why: 'Bad data poisons every downstream decision. Every input must be documented, lineaged, quality-checked, and access-controlled.',
    addresses: 'Where does the data come from · is it fresh · is it accurate · who can read it · where does it flow downstream.',
    how: 'Pulls proc.data_process.{input, transform, output} + proc.tech_stack.data. Each sub-tab is a checkpoint in the data lifecycle.',
    navigate: 'Sources → Discovery → Quality → Preparation → Master Data → Metadata → Lineage → Security → Monitoring.',
    objectives: [
      'Every input has a contract',
      'Quality score visible per source',
      'Lineage traceable end-to-end',
      'Access controlled per §47.6',
    ],
    scope: 'Data management for this process only.',
    out_of_scope: 'Cross-process data warehouse design, organization-wide governance (→ Governance AI tab).',
  },
  'analytics': {
    what: 'Analytics workbench — EDA, feature engineering, model evaluation, explainability.',
    why: 'Decisions made from analytics that has not been validated end up as production incidents.',
    addresses: 'What does the data look like · what features matter · how good is the model · why did it decide that.',
    how: 'EDA shows distributions; Feature Engineering shows derived features; Evaluation shows hold-out metrics; Explainability links to SHAP/LIME (→ Explainable AI tab).',
    navigate: 'EDA → Feature Engineering → Evaluation → Explainability.',
    objectives: [
      'Pre-train statistical insight',
      'Track feature lineage',
      'Hold-out metrics + per-segment scores',
      'Audit-trail every chart',
    ],
    scope: 'Pre- and post-model analytics for this process.',
    out_of_scope: 'Production monitoring (→ Operations + Dashboard tabs).',
  },
  'ai': {
    what: 'AI capabilities workspace — registered AI types, models, agents, experiments, registry.',
    why: 'AI without a registry, version, and owner is a liability.',
    addresses: 'What AI is in this process · what model versions are live · what agents act · what experiments are running.',
    how: 'Capabilities lists declared AI types; Models shows registry; Agents lists per-process agents; Experiments shows ongoing A/B & shadow tests.',
    navigate: 'Capabilities → Models → Agents → Experiments → Registry.',
    objectives: [
      'Every AI usage has a card',
      'Every model has a registry entry + ADR',
      'Every agent has a scope grant',
    ],
    scope: 'AI inventory for this process.',
    out_of_scope: 'Explainability detail (→ Explainable AI), fairness gates (→ Responsible AI), governance flow (→ Governance AI).',
  },
  'user-story': {
    what: 'User story workspace — Business story, Functional story, AI story, Acceptance criteria.',
    why: 'Stories without acceptance criteria become ambiguity at release time.',
    addresses: 'What is the user trying to do · what does success look like · how does AI fit in · when is "done" done.',
    how: 'Each sub-tab is a layer of the story: business intent → functional behavior → AI surface → acceptance test.',
    navigate: 'Business Story → Functional Story → AI Story → Acceptance Criteria.',
    objectives: [
      'Every story carries an Epic + Sprint pointer',
      'Acceptance criteria are testable',
      'AI surface is explicit per story',
    ],
    scope: 'Story-level requirements per epic.',
    out_of_scope: 'Cross-story roadmap (→ Product Manager tab).',
  },
  'user-demo': {
    what: 'Demo script + sample data + expected output + recording.',
    why: 'Stakeholders trust a working demo, not a slide deck.',
    addresses: 'How do I demo this · what dataset do I use · what should happen · what was actually shown.',
    how: 'Pulls proc.demo_story.{persona, scenario, walkthrough, pitch, demo_url}.',
    navigate: 'Demo Script → Demo Data → Demo Results → Demo Recording.',
    objectives: [
      'Repeatable demo per process',
      'Pre-captured sample data',
      'Recording archived for stakeholders',
    ],
    scope: 'Customer / stakeholder demo material only.',
    out_of_scope: 'Production data, live metrics.',
  },
  'exp-ai': {
    what: 'Explainable AI — SHAP, LIME, feature importance, decision path, counterfactual.',
    why: 'EU AI Act Art. 86 + regulator audits demand an explanation per decision.',
    addresses: 'Why did the model say what it said · what features drove it · what change would flip it · is the explanation faithful.',
    how: 'Pulls proc.explainable_ai.{methods, surface, decision_audit_field}. Each sub-tab is a different XAI lens on the same model.',
    navigate: 'SHAP → LIME → Feature Importance → Decision Path → Counterfactual.',
    objectives: [
      'Local + global explainability per model',
      'Counterfactual generation actionable per decision',
      'Surface evidence in the decision audit row',
    ],
    scope: 'Explainability mechanisms + outputs.',
    out_of_scope: 'Fairness/bias checks (→ Responsible AI), policy enforcement (→ Governance AI).',
  },
  'res-ai': {
    what: 'Responsible AI — Fairness, Bias, Transparency, Accountability, Human Oversight.',
    why: 'An unmonitored model can drift into bias and produce harm at scale.',
    addresses: 'Is the model fair across groups · is bias trending · who is accountable · when does a human step in.',
    how: 'Pulls proc.responsible_ai.{fairness_gate, bias_audit, privacy, equal_opportunity_gap, audit_row_fields}.',
    navigate: 'Fairness → Bias → Transparency → Accountability → Human Oversight.',
    objectives: [
      'Pre-deploy fairness gate (DI ≥ 0.8)',
      'Equal opportunity gap < 5%',
      'HITL escalation path tested',
      'Audit row fields populated',
    ],
    scope: 'Responsible AI controls per §38 + §48.',
    out_of_scope: 'Explainability methods (→ Explainable AI), regulatory mapping (→ Compliance AI).',
  },
  'gov-ai': {
    what: 'Governance AI — Policies, Controls, Approvals, Audit, Risk.',
    why: 'Every AI decision should be policy-evaluated, scope-bounded, rollback-able.',
    addresses: 'What policies bound this AI · what controls are mapped · who approves what · where is the risk register.',
    how: 'Pulls proc.governance_ai.{confidence_tiers, decision_layer, scope_grants, rollback}.',
    navigate: 'Policies → Controls → Approvals → Audit → Risk.',
    objectives: [
      'Policy registry tied to decision layer',
      'Control effectiveness scored',
      'Scope grants enforceable per §42',
      'Rollback path tested',
    ],
    scope: 'AI governance per §38.',
    out_of_scope: 'Operational alerts (→ Operations), business KPIs (→ Business Value).',
  },
  'comp-ai': {
    what: 'Compliance AI — Regulations, Controls, Monitoring, Violations, Reporting.',
    why: 'Regulator-readable evidence is mandatory in regulated jurisdictions (EU AI Act, NIST RMF, ISO 42001).',
    addresses: 'What regs apply · what controls cover them · is the system in compliance · what violations are open · what reports go to regulators.',
    how: 'Pulls compliance rules + maps to controls. Each violation tracked with severity, owner, remediation.',
    navigate: 'Regulations → Controls → Monitoring → Violations → Reporting.',
    objectives: [
      'EU AI Act risk tier documented',
      'Continuous compliance score',
      'Zero open P0 violations',
    ],
    scope: 'Regulatory compliance tracking per process.',
    out_of_scope: 'Fairness gates (→ Responsible AI), policy enforcement (→ Governance AI).',
  },
  'inc-ai': {
    what: 'Incident AI — Detection, Investigation, Resolution, Post Mortem.',
    why: 'When AI fails, the response speed and quality determine the blast radius.',
    addresses: 'What broke · why · who fixes it · how do we prevent recurrence.',
    how: 'Detection auto-flags via monitoring; Investigation collects root cause; Resolution tracks actions; Post Mortem locks lessons.',
    navigate: 'Detection → Investigation → Resolution → Post Mortem.',
    objectives: [
      'MTTD < SLA',
      'MTTR < SLA',
      'Post-mortem within 5 business days',
      'Lessons fed back into Test AI',
    ],
    scope: 'AI-specific incidents (drift, hallucination, prompt injection, policy violation).',
    out_of_scope: 'Generic SRE infra incidents (→ Operations tab).',
  },
  'meet-ai': {
    what: 'Meeting AI — Schedule, Transcript, Summary, Action Items.',
    why: 'Critical decisions vanish in untranscribed meetings; AI captures + assigns them.',
    addresses: 'Who is meeting · what was said · what decisions were made · what tasks were assigned to whom.',
    how: 'Speech-to-text + diarization + LLM summarization + action-item extraction per §64.14.',
    navigate: 'Schedule → Transcript → Summary → Action Items.',
    objectives: [
      'Every meeting transcribed',
      'Decisions audit-logged',
      'Action items auto-assigned + tracked',
    ],
    scope: 'Process-related meetings.',
    out_of_scope: 'General company-wide meetings.',
  },
  'note-ai': {
    what: 'Note AI — Notes, Knowledge, Tags, Search.',
    why: 'Operators capture process insights in scattered places; a unified note layer + RAG search makes them retrievable.',
    addresses: 'What did we learn · where is the runbook · how do I find prior incidents · what tag does this belong to.',
    how: 'Notes indexed in vector DB; tags faceted; search via RAG over the corpus.',
    navigate: 'Notes → Knowledge → Tags → Search.',
    objectives: [
      'Capture-then-find experience',
      'RAG search with citations',
      'Tag-based browsing',
    ],
    scope: 'Process-specific notes and knowledge base.',
    out_of_scope: 'Cross-process knowledge graph (→ project-wide note system).',
  },
  'test-ai': {
    what: 'Test AI — Positive · Negative · Boundary · Regression · API · Model · Data · Manual · Pipeline · Cases · Execution · Defects · Coverage.',
    why: 'No claim about "working" survives without a drill that locks it (per §43).',
    addresses: 'What did we test · what failed · how broad is the coverage · is the regression baseline holding.',
    how: 'Each surface (API/Model/Data/Manual/Pipeline) gets positive + negative + boundary tests. Regression compares to prior baseline.',
    navigate: 'Positive → Negative → Boundary → Regression → API → Model → Data → Manual → Pipeline → Cases → Execution → Defects → Coverage.',
    objectives: [
      'Every feature has a positive + negative drill',
      'API contract tests pass per PR',
      'Model accuracy regression baseline locked',
      'Coverage ≥ 80%',
    ],
    scope: 'All test surfaces for this process.',
    out_of_scope: 'Cross-process E2E (→ project-wide test plan).',
  },
  'job-ai': {
    what: 'Job AI — Jobs, Cron, Schedules, Execution, Monitoring, Failures, Retries.',
    why: 'Scheduled jobs (training, retraining, eval, batch) need visibility and recovery.',
    addresses: 'What jobs run · when · what happened · why did it fail · was it retried.',
    how: 'Each job has a cron expression, owner, lock, idempotency key, runtime metrics, failure log, retry policy.',
    navigate: 'Jobs → Cron → Schedules → Execution → Monitoring → Failures → Retries.',
    objectives: [
      'All cron expressions registered',
      'Failures surfaced within SLA',
      'Retry policy + dead-letter queue defined',
    ],
    scope: 'Scheduled jobs for this process.',
    out_of_scope: 'Real-time inference traffic (→ Operations + Dashboard tabs).',
  },
  'biz-value': {
    what: 'Business Value workspace — Revenue, Cost, Productivity, Risk, Compliance, Customer, Employee, ESG, ROI.',
    why: 'Executives buy AI on Revenue ↑ · Cost ↓ · Productivity ↑ · Risk ↓, NOT on accuracy = 0.95.',
    addresses: 'How much revenue did this process generate · how much cost did it save · how much risk did it reduce · what is the ROI.',
    how: 'Each sub-tab is a value lens with Components + KPIs. ROI sub-tab carries the formula (Benefits − Cost) / Cost.',
    navigate: 'Revenue → Cost → Productivity → Risk → Compliance → Customer → Employee → ESG → ROI.',
    objectives: [
      'Revenue impact quantified',
      'Cost-out quantified',
      'Risk reduction quantified',
      'ROI > target',
    ],
    scope: 'Business-value lens. Executive view.',
    out_of_scope: 'Technical metrics (→ AI tab), per-role detail (→ Dashboard tab).',
  },
  'dashboard': {
    what: 'All dashboards and graphs — Executive · Manager · Team · KPI · SLA · FinOps · Incidents · Fairness · Drift · Model Fleet · Business Value · Cost · Risk · Usage · Adoption.',
    why: 'Different roles need different views. One landing page per role surfaces only the metrics that role decides on.',
    addresses: 'What does my role need to see today · where is the trend · what is breaching SLA · what is over budget.',
    how: 'Per-role tile sets with drill-down into row-level data.',
    navigate: 'Pick the dashboard matching your role (Executive / Manager / Team). Drill-down via chart click.',
    objectives: [
      'Role-scoped data only (per §47.6)',
      'Drill-down to row-level',
      'Anomalies auto-flagged',
    ],
    scope: 'Read-only dashboards.',
    out_of_scope: 'Write-back actions (→ Operations).',
  },
  'operations': {
    what: 'Operations — Monitoring, Jobs, Incidents, Alerts, Deployment, Rollback, Logs, Observability, SLA.',
    why: 'Production AI requires observability + a rollback path. No deploy without both.',
    addresses: 'Is the system healthy · what just deployed · what is breaking · how do I roll back · where are the logs.',
    how: 'OpenTelemetry traces + Prometheus metrics + Grafana dashboards + per-deploy rollback runbooks.',
    navigate: 'Monitoring → Jobs → Incidents → Alerts → Deployment → Rollback → Logs → Observability → SLA.',
    objectives: [
      'p95 latency under SLA',
      'Error rate < 1%',
      'Rollback < 15 min',
      'Zero unmonitored services',
    ],
    scope: 'Day-2 operations for this process.',
    out_of_scope: 'Architectural decisions (→ README/ADR tab).',
  },
  'reports': {
    what: 'Reports — Executive, Business, Technical, Financial, Compliance, Audit.',
    why: 'Different stakeholders consume the same data through different lenses on a recurring cadence.',
    addresses: 'What report goes to whom · how often · what format · how is it certified.',
    how: 'Each report ties to a per-role data slice + cadence + format. Distribution is logged in the audit trail.',
    navigate: 'Pick the report matching the consumer (Exec / Business / Technical / Financial / Compliance / Audit).',
    objectives: [
      'Reports auto-generated on cadence',
      'Audit-trail per distribution',
      'PDF + CSV + JSON formats supported',
    ],
    scope: 'Recurring reports per process.',
    out_of_scope: 'Ad-hoc analytics queries (→ Analytics tab).',
  },
  // ─── 9 close-list charter entries (operator 2026-06-13: "fix all" + "10/10") ───
  // Closes the 22/31 gap surfaced by docs/TAB_GOAL_OUTPUT_AUDIT.md.
  // Each entry follows the canonical 8-field shape:
  //   what · why · addresses · how · navigate · objectives[] · scope · out_of_scope
  // Per §82 #14 the objectives[] IS the tab's hypothesis list.
  'problem-as-is': {
    what: 'The diagnostic frame for the current state — captures the problem statement, AS-IS workflow steps, pain points (time/cost/quality), and the gap between today and target.',
    why: 'A solution proposal that does not quantify AS-IS pain has no defensible business case; reviewers cannot prioritize work without a measured starting point.',
    addresses: 'What hurts today · how often · who feels it · cost-per-instance · the gap to a defensible target.',
    how: 'Pulls proc.problem_statement, proc.as_is_to_be.as_is, proc.manual_process pain points; operators add measured pain (hours, $ lost, error rate).',
    navigate: 'Problem → Pain → AS-IS → Current state → Gap. Reading order is severity-first; close each sub-tab before moving on.',
    objectives: [
      'Measure (not estimate) AS-IS hours / $ / error rate per instance',
      'Identify the top 3 pain hot-spots with named actors',
      'Define the gap to target with a number (not a sentence)',
      'Make cost of inaction visible to approvers',
    ],
    scope: 'Current-state diagnosis only.',
    out_of_scope: 'Future-state design (→ to-be), success metrics (→ success-outcome), implementation (→ manual/automatic tabs).',
  },
  'to-be': {
    what: 'The future-state blueprint — target process, named success metric, roadmap from AS-IS to TO-BE, and the success gate that proves we got there.',
    why: 'Without a concrete TO-BE, the work is a wish; teams cannot estimate, prioritize, or know when to stop.',
    addresses: 'What changes · which step is automated · who owns it · how we know we succeeded · timeline to value.',
    how: 'Pulls proc.as_is_to_be.to_be, proc.success_metric, proc.roadmap, proc.ai_strategy.',
    navigate: 'TO-BE → Future-state → Target process → Roadmap → AI strategy. Close roadmap before promising delivery dates.',
    objectives: [
      'TO-BE process diagram exists and is reviewable',
      'Success metric is measurable (not "better")',
      'Roadmap has at-most 5 milestones with dates',
      'Each milestone has a named owner',
    ],
    scope: 'Future-state design and delivery plan.',
    out_of_scope: 'AS-IS measurement (→ problem-as-is), runtime monitoring (→ ai-control-tower).',
  },
  'ai-strategy': {
    what: 'The AI-suitability filter for this process — picks the AI type (ML / DL / RAG / Agentic / Rules), validates value-vs-cost, checks risk + operating-fit before committing build.',
    why: 'Most AI failures trace to mismatched AI type for the problem; this tab catches it before code lands.',
    addresses: 'Is this an AI problem · which AI type · what is the ROI · what is the risk · do we have the data + ops to run it.',
    how: 'Pulls proc.ai[] for declared AI types, proc.ai_strategy decision matrix, proc.risk + proc.value for context.',
    navigate: 'AI-strategy → Primary-secondary AI → Use-case → Value vs risk. Sign off only when value > risk AND ops-fit OK.',
    objectives: [
      'AI type chosen with stated rationale (per §82 #14 hypothesis)',
      'Value > risk-adjusted cost (numeric)',
      'Data + ops readiness confirmed',
      'Fallback (non-AI) named in case AI fails',
    ],
    scope: 'Pre-build AI-suitability decision.',
    out_of_scope: 'Production monitoring (→ ai-control-tower), explainability proofs (→ exp-ai), per-model accuracy (→ accuracy-benchmarking).',
  },
  'digital-transformation': {
    what: 'The 4P (People · Process · Profit · Technology) transformation lens — captures org change required, process redesign, technology stack shift, and adoption plan.',
    why: 'Pure tech upgrade without people/process change = shelfware. This tab forces the 4 dimensions together.',
    addresses: 'Who reskills · which process changes · which tech goes in/out · how users adopt · what changes for finance.',
    how: 'Pulls proc.digital_transformation, proc.people_process_tech, proc.adoption, proc.change.',
    navigate: 'Digital transformation → People → Process → Tech → Adoption → Change. All four Ps must be present before sign-off.',
    objectives: [
      'All 4 Ps addressed with named owner per P',
      'Change-management plan with comms cadence',
      'Adoption metric defined (not just deployment count)',
      'Reskilling / org-change budget called out',
    ],
    scope: 'Cross-cutting transformation plan.',
    out_of_scope: 'Per-step process detail (→ manual/automatic), runtime ops (→ operations).',
  },
  'manual-explore': {
    what: 'A sandbox tab for prototyping layouts of the manual process · 3 variants ship today: 2-column (left sequence · right ops), split-canvas, and side-by-side compare.',
    why: 'Different stakeholders read the manual process differently · UX designers, process designers, and operations leads need to see options before locking a layout.',
    addresses: 'What layout best surfaces sequence vs operations · which variant helps which persona · what the operator clicks vs reads.',
    how: 'Pulls proc.manual_process.steps + .operations · falls back to fixture per §57.7. Renders via custom SequenceOpsLayout (NOT renderSpecTab) so layout decisions live in code, not blueprint.',
    navigate: 'Sub-tab Sequence + Ops (default) → Split Canvas → Compare. Click ops to mark complete (state local · session only).',
    objectives: [
      'Surface 3 distinct layout variants for review',
      'Each variant uses identical data (sequence + ops) · only chrome differs',
      'Render even when proc has no manual_process · honest fallback (§57.7)',
      'Locked by drill_tab_charter_coverage · cannot ship without 8 fields',
    ],
    scope: 'Layout exploration only · no business logic.',
    out_of_scope: 'Operational manual workflow (→ manual-transaction tab), automated path (→ automatic-pipeline).',
  },
  'manual-transaction': {
    what: 'The current human-driven workflow — actors, manual steps, controls, handoffs between roles, and exception paths.',
    why: 'Operations cannot improve what is not documented; auditors need to see the human path explicitly.',
    addresses: 'Who does what · where handoffs happen · what controls exist · how exceptions are caught · how long each step takes.',
    how: 'Pulls proc.manual_process, proc.user_steps, proc.controls, proc.handoffs, proc.exceptions.',
    navigate: 'Manual-transaction → User-steps → Inputs → Controls → Handoffs → Exceptions. Walk the swimlane top-to-bottom.',
    objectives: [
      'Every actor named (not "team")',
      'Step times measured (not estimated)',
      'Every handoff has a control',
      'Exception paths have a runbook',
    ],
    scope: 'AS-IS human workflow documentation.',
    out_of_scope: 'Automated pipeline (→ automatic-pipeline), TO-BE design (→ to-be).',
  },
  'automatic-pipeline': {
    what: 'The automated execution path — trigger source, orchestration DAG, monitoring hooks, and fallback when automation fails.',
    why: 'An automated pipeline without a fallback is a hand-grenade; without monitoring it is a black box. This tab forces both.',
    addresses: 'What triggers it · how it orchestrates · how we know it is healthy · what happens when it breaks.',
    how: 'Pulls proc.automatic_process, proc.trigger, proc.pipeline, proc.orchestration, proc.monitoring, proc.fallback.',
    navigate: 'Automatic-pipeline → Trigger → Pipeline → Orchestration → Monitoring → Fallback. Close fallback before promoting to prod.',
    objectives: [
      'Trigger source named (cron / event / API)',
      'DAG visible with owner per node',
      'Monitoring alerts wired to on-call',
      'Fallback path tested in staging',
      'Cost per run measured',
    ],
    scope: 'TO-BE automated execution layer.',
    out_of_scope: 'Human workflow (→ manual-transaction), model accuracy (→ accuracy-benchmarking).',
  },
  'accuracy-benchmarking': {
    what: 'The model-quality gate — accuracy metrics, named baseline, thresholds for go/no-go, and release evidence.',
    why: 'Models cannot ship without a measured baseline; downstream teams cannot trust without thresholds.',
    addresses: 'Which metric matters · what baseline to beat · what threshold gates release · what evidence proves it.',
    how: 'Pulls proc.accuracy[] (per model), proc.baseline, proc.benchmark, proc.thresholds, proc.evidence.',
    navigate: 'Accuracy → Metrics → Baseline → Benchmark → Thresholds → Evidence. No release without all 5.',
    objectives: [
      'Primary metric named (not "accuracy" alone)',
      'Baseline beaten with statistical significance',
      'Threshold passes with margin',
      'Per §75: metric per task category (classification / regression / ranking)',
      'Reproducible evidence link (MLflow run / scorecard)',
    ],
    scope: 'Pre-release accuracy validation.',
    out_of_scope: 'Post-release drift (→ ai-control-tower), explainability (→ exp-ai).',
  },
  'analytical-ai-process': {
    what: 'The analytical thinking pipeline — frames the question, lists features used, surfaces analysis steps, produces decision-grade insights.',
    why: 'An insight that does not translate to a decision is noise. This tab forces the question→insight→decision chain.',
    addresses: 'What question are we answering · which features matter · what analysis we ran · what decisions the analysis enables.',
    how: 'Pulls proc.analytical_ai, proc.question, proc.features, proc.analysis, proc.insight, proc.decision.',
    navigate: 'Question → Features → Analysis → Insight → Decision. Sign off only when decision is named.',
    objectives: [
      'Question is decision-shaped (yes/no/threshold)',
      'Feature set declared with provenance',
      'Analysis is reproducible',
      'Insight has confidence interval',
      'Decision is named with owner',
    ],
    scope: 'Decision-support analytical workflow.',
    out_of_scope: 'Operational monitoring (→ ai-control-tower), descriptive dashboards (→ dashboard).',
  },
  'ai-control-tower': {
    what: 'The day-2 AI operations console — fleet health, alerts, drift detection, cost run-rate, incident queue, pending approvals.',
    why: 'AI in production is a moving target; without a control tower, drift and cost surprises become incidents.',
    addresses: 'Is the AI healthy · what changed · is it costing too much · are there pending approvals · who is on-call.',
    how: 'Pulls proc.ai_control_tower, proc.health, proc.alerts, proc.drift, proc.cost, proc.incidents, proc.approvals.',
    navigate: 'Health → Alerts → Drift → Cost → Incidents → Approvals. Triage top-down.',
    objectives: [
      'Fleet status visible in <5 seconds',
      'Drift metric tracked vs baseline',
      'Cost run-rate vs budget visible',
      'Incident queue triaged with owner',
      'Pending approvals routed within SLA',
    ],
    scope: 'Production AI operations.',
    out_of_scope: 'Pre-release validation (→ accuracy-benchmarking), business value (→ biz-value).',
  },
};

function TabCharter({ tab, color, proc, dept, focusKind, focusLabel }) {
  const c = TAB_CHARTER[tab.id];
  if (!c) return null;
  // Substitute process-specific context into the boilerplate so the charter
  // reads as "for Legal Advisory at #13 Legal" instead of generic.
  const procName = proc?.name || 'this process';
  const deptName = dept?.name || 'this department';
  const focusBit = (focusKind && focusLabel)
    ? ` Currently focused on ${KIND_LABEL[focusKind] || focusKind}: ${focusLabel}.`
    : '';
  const personalize = (text) =>
    text
      .replace(/this process/g, `${procName} (${deptName})`)
      .replace(/this department/g, deptName);
  const rows = [
    { icon: 'ℹ',  label: 'What is this tab',  text: personalize(c.what) + focusBit,   accent: color },
    { icon: '🎯', label: 'Why this tab',       text: personalize(c.why),               accent: color },
    { icon: '🧩', label: 'What it addresses',  text: personalize(c.addresses),         accent: color },
    { icon: '⚙',  label: 'How',                text: personalize(c.how),               accent: color },
    { icon: '🧭', label: 'How to navigate',    text: personalize(c.navigate),          accent: color },
    { icon: '🚧', label: 'Scope',              text: personalize(c.scope),             accent: '#16a34a' },
    { icon: '🚫', label: 'Out of scope',       text: personalize(c.out_of_scope),      accent: '#dc2626' },
  ];
  return (
    <div style={{
      marginBottom: 12,
      background: '#fff',
      border: `2px solid ${color}`,
      borderRadius: 8, padding: 14,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 900, color,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        📘 About this tab — Tab charter
      </div>
      <div style={{
        display: 'grid', gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      }}>
        {rows.map((r) => (
          <div key={r.label} style={{
            padding: '8px 10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: `3px solid ${r.accent}`,
            borderRadius: 4,
            fontSize: 12,
          }}>
            <div style={{
              fontSize: 10, color: r.accent, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 4,
            }}>{r.icon} {r.label}</div>
            <div style={{ color: '#0f172a', lineHeight: 1.5 }}>{r.text}</div>
          </div>
        ))}
        {/* Objectives & Goals — full-width row */}
        <div style={{
          gridColumn: '1 / -1',
          padding: '10px 12px',
          background: `${color}11`,
          border: `1px solid ${color}55`,
          borderLeft: `4px solid ${color}`,
          borderRadius: 4,
        }}>
          <div style={{
            fontSize: 10, color, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: 6,
          }}>🏆 Objectives & Goals</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0f172a', lineHeight: 1.6 }}>
            {c.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// BlueprintBlockRenderer — walks an object from the blueprint and
// renders each field as a labeled card. Used by the dedicated
// README/ResAI/ExpAI/GovAI/TestAI/UserDemo renderers below.
// Skips internal flags (derived, _note, title) and renders complex
// values (arrays, code blobs, mermaid) appropriately.
// =============================================================
function BlueprintBlockRenderer({ data, color, exclude = ['derived', '_note', 'title'] }) {
  if (!data || typeof data !== 'object') {
    return (
      <div style={{
        padding: 16, background: '#fffbeb',
        border: '1px dashed #fcd34d', borderRadius: 6,
        fontSize: 12, color: '#92400e',
      }}>
        ✎ <strong>No structured content yet</strong> — operator-pending section.
      </div>
    );
  }
  const allEntries = Object.entries(data).filter(([k]) => !exclude.includes(k));
  const filledEntries = allEntries.filter(([_, v]) => !isOperatorPending(v));
  const pendingEntries = allEntries.filter(([_, v]) => isOperatorPending(v));
  if (allEntries.length === 0) {
    return (
      <div style={{
        padding: 16, background: '#fffbeb',
        border: '1px dashed #fcd34d', borderRadius: 6,
        fontSize: 12, color: '#92400e',
      }}>
        ✎ <strong>Block exists but no fields</strong> — operator-pending.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {data.title && (
        <div style={{
          padding: '8px 12px', background: `${color}11`,
          border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
          borderRadius: 6,
          fontSize: 14, fontWeight: 700, color: '#0f172a',
        }}>{data.title}</div>
      )}
      {filledEntries.map(([key, value]) => (
        <BlueprintField key={key} fieldKey={key} value={value} color={color} />
      ))}
      {pendingEntries.length > 0 && (
        <div style={{
          padding: '10px 12px',
          background: '#fffbeb',
          border: '1px dashed #fcd34d',
          borderRadius: 6,
          fontSize: 11, color: '#92400e',
        }}>
          ✎ <strong>{pendingEntries.length} field{pendingEntries.length === 1 ? '' : 's'} pending operator input:</strong>{' '}
          {pendingEntries.map(([k]) => k.replace(/_/g, ' ')).join(' · ')}
        </div>
      )}
      {filledEntries.length === 0 && pendingEntries.length > 0 && (
        <div style={{
          padding: 14, background: '#fffbeb',
          border: '2px dashed #fcd34d', borderRadius: 6,
          fontSize: 13, color: '#92400e', textAlign: 'center',
        }}>
          ✎ All fields in this block are pending operator input.
          {' '}<strong>Click here to fill them in →</strong>
        </div>
      )}
    </div>
  );
}

// Renders one (key, value) pair from a blueprint block.
function BlueprintField({ fieldKey, value, color }) {
  const niceKey = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // Mermaid / code-block-looking strings → render in monospace pre
  const isCodeLike = typeof value === 'string' && (
    value.startsWith('graph ') || value.startsWith('flowchart ') ||
    value.startsWith('sequenceDiagram') || value.startsWith('classDiagram') ||
    value.startsWith('erDiagram') || value.startsWith('stateDiagram') ||
    value.includes('\n')
  );
  return (
    <div style={{
      padding: '10px 12px', background: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
    }}>
      <div style={{
        fontSize: 10, color, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 6,
      }}>{niceKey}</div>
      {Array.isArray(value) ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0f172a' }}>
          {value.map((item, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {typeof item === 'object'
                ? <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, background: '#f8fafc', padding: '4px 6px', borderRadius: 3 }}>
                    {JSON.stringify(item, null, 2)}
                  </pre>
                : String(item)}
            </li>
          ))}
        </ul>
      ) : typeof value === 'object' && value !== null ? (
        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, color: '#0f172a', background: '#f8fafc', padding: 8, borderRadius: 3, overflow: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : isCodeLike ? (
        <pre style={{
          margin: 0, padding: 10,
          background: '#f8fafc', color: '#475569', border: '1px solid #e5e7eb',
          borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
          overflow: 'auto', maxHeight: 360, whiteSpace: 'pre-wrap',
        }}>{String(value)}</pre>
      ) : (
        <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.5 }}>
          {String(value)}
        </div>
      )}
    </div>
  );
}

// README sub-tab → proc.readme[subId] (BRD, FRD, HLD, LLD, SAD, C4, Sequence,
// Network, API, DB Schema, ADR, Runbook, Roadmap, Stakeholders, ExecSummary,
// Capacity, AI Strategy, Cost Analysis).
const README_KEY_MAP = {
  'brd':           'brd',
  'frd':           'frd',
  'hld':           'hld',
  'lld':           'lld',
  'sad':           'sad',
  'c4':            'c4',
  'sequence':      'sequence',
  'network':       'network',
  'api':           'api',
  'db':            'db_schema',
  'adr':           'adr',
  'runbook':       'runbook',
  'roadmap':       'roadmap',
  'stakeholders':  'stakeholders',
  'exec-summary':  'executive_summary',
  'capacity':      'capacity',
  'ai-strategy':   'ai_strategy',
  'cost':          'cost_analysis',
};
function renderReadmeSubTab(subId, proc, color) {
  const key = README_KEY_MAP[subId];
  const block = proc?.readme?.[key];
  return <BlueprintBlockRenderer data={block} color={color} />;
}

// ResAI sub-tab → proc.responsible_ai (fairness/bias/transparency/accountability/oversight).
function renderResAiSubTab(subId, proc, color) {
  const block = proc?.responsible_ai;
  return <BlueprintBlockRenderer data={block} color={color} />;
}

// ExpAI sub-tab → proc.explainable_ai (SHAP/LIME/importance/decision-path/counterfactual).
function renderExpAiSubTab(subId, proc, color) {
  const block = proc?.explainable_ai;
  return <BlueprintBlockRenderer data={block} color={color} />;
}

// GovAI sub-tab → proc.governance_ai (policies/controls/approvals/audit/risk).
function renderGovAiSubTab(subId, proc, color) {
  const block = proc?.governance_ai;
  return <BlueprintBlockRenderer data={block} color={color} />;
}

// TestAI sub-tab — proc.tests.{api, backend, frontend} or fallback to spec catalog.
const TESTAI_KEY_MAP = {
  'api':      'api',
  'pipeline': 'backend',
  'data':     'backend',
  'manual':   'frontend',
  'model':    'backend',
};
function renderTestAiSubTab(subId, proc, color, defaultSpec) {
  const key = TESTAI_KEY_MAP[subId];
  const block = key ? proc?.tests?.[key] : null;
  if (block) return <BlueprintBlockRenderer data={block} color={color} />;
  // Fall back to spec catalog when there's no per-section blueprint data
  return defaultSpec;
}

// UserDemo sub-tab → proc.demo_story (persona/pitch/scenario/walkthrough/demo_url).
function renderUserDemoSubTab(subId, proc, color) {
  const block = proc?.demo_story;
  return <BlueprintBlockRenderer data={block} color={color} />;
}

// Security tab block (not yet a top tab but available via proc.security)
function renderSecurityBlock(proc, color) {
  return <BlueprintBlockRenderer data={proc?.security} color={color} />;
}

// Business Value tab — exec dashboard banner at top of every sub-tab.
const BIZ_VALUE_CATEGORIES = [
  { id: 'revenue',      label: 'Revenue',      color: '#16a34a' },
  { id: 'cost',         label: 'Cost',         color: '#0ea5e9' },
  { id: 'productivity', label: 'Productivity', color: '#f59e0b' },
  { id: 'risk',         label: 'Risk',         color: '#dc2626' },
  { id: 'compliance',   label: 'Compliance',   color: '#7c3aed' },
  { id: 'customer',     label: 'Customer',     color: '#ec4899' },
  { id: 'employee',     label: 'Employee',     color: '#0891b2' },
  { id: 'roi',          label: 'ROI',          color: '#15803d' },
];
function BizValueExecHeader({ activeSubId }) {
  return (
    <div style={{
      marginBottom: 16, padding: 16,
      background: 'linear-gradient(135deg, #16a34a11 0%, #0ea5e911 100%)',
      border: '1px solid #16a34a55',
      borderRadius: 8,
    }}>
      <div style={{ marginBottom: 4, fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Business value categories
      </div>
      <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 12 }}>
        Primary value dimensions tracked for every AI process.
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8,
      }}>
        {BIZ_VALUE_CATEGORIES.map((c) => {
          const isActive = c.id === activeSubId;
          return (
            <div key={c.id} style={{
              padding: '10px 8px', textAlign: 'center',
              background: isActive ? c.color : '#fff',
              border: `1px solid ${c.color}66`,
              borderRadius: 6,
              fontSize: 12, fontWeight: 700,
              color: isActive ? '#fff' : c.color,
            }}>
              {c.label}
              <div style={{
                fontSize: 16, marginTop: 4,
                color: isActive ? '#1d4ed8' : '#0f172a',
              }}>—</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Tab Frame v2 (operator 2026-06-05 brutal-quality directive)
// Every tab body wraps in TabFrame with these always-visible ribbons:
//   1. Tab header ribbon — alignment context (Dept › Domain › Process › Sub-process focus › Tab › Sub-tab) + chips
//   2. AS-IS / TO-BE / ROI / Strategy ribbon (4-col)
//   3. Input → Process → Output ribbon (3-col)
//   4. Model · Data · Accuracy strip (3-col)
//   5. Components (the existing sub-tab content)
//   6. Visualization slot
//   7. Flow slot
//   8. Summary note slot
//   9. Outcome slot
//  10. To-Do List (collapsible, default closed)
//  11. Recommendations / Actions (collapsible)
//  12. Attachments / Comments — HitlFeedback (collapsible)
//  13. History — TabTransactionHistory (collapsible)
//  14. Audit Trail — TabDatabaseOps (collapsible)
//  15. Metadata footer — Owner · User Stamp · Date/Time · Version · Export
// §57.7 honesty: every empty slot shows its data-binding path so the
// operator sees WHERE to wire data, not just "operator-pending".
// ============================================================

// Walk a list of dotted paths against an object; return first defined value.
function read(obj, ...paths) {
  if (!obj) return undefined;
  for (const path of paths) {
    if (!path) continue;
    const parts = path.split('.');
    let cur = obj;
    let ok = true;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') { ok = false; break; }
      cur = cur[p];
    }
    if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return undefined;
}

// Window-width hook for responsive layouts. Cheaper than a CSS-in-JS
// breakpoint system: one effect per page, single render-time number.
// Three modes:
//   width <  700px : isCompact  → tab/sub-tab strips become <select> dropdowns
//   width <  1024px: isTablet   → ribbons stack vertically (still buttons)
//   width >= 1024px: desktop    → full horizontal layout
function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
}

// React context for the breakpoint flags — passed via TabFrame so ribbons
// can adapt their grid templates. Lighter than threading every component
// with `isTablet` props.
const BreakpointContext = React.createContext({ isCompact: false, isTablet: false });

// Detect operator-pending placeholder text — the blueprint marks unfilled
// fields as "[operator: ...]". Top-1% UI hides these rather than echoing
// TODO markers as if they were content.
function isOperatorPending(v) {
  if (v == null) return true;
  if (typeof v === 'string') {
    const s = v.trim();
    return s === '' || s.startsWith('[operator:') || s.startsWith('[Operator:') || s === 'derived';
  }
  if (Array.isArray(v)) return v.length === 0 || v.every(isOperatorPending);
  if (typeof v === 'object') {
    const entries = Object.entries(v).filter(([k]) => k !== 'derived' && k !== '_note' && k !== 'title');
    return entries.length === 0 || entries.every(([_, val]) => isOperatorPending(val));
  }
  return false;
}

// Role context — read from localStorage, defaults to "business".
// Engineering/admin roles see debug paths (wire → proc.X). Business roles
// see a friendly "complete this field" CTA instead.
function getCurrentRole() {
  try {
    return localStorage.getItem('insur.activeRole') || 'business';
  } catch (e) {
    return 'business';
  }
}
function isTechRole(role) {
  const techRoles = ['ai-engineer', 'data-scientist', 'analyst', 'administrator', 'tester', 'devops', 'system-architect', 'api-architect', 'database-architect'];
  return techRoles.some((r) => (role || '').toLowerCase().includes(r));
}

// Render a value, picking a sensible scalar from arrays/objects when present.
function renderValue(v) {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    return v.slice(0, 3).map((x, i) =>
      typeof x === 'object' ? (x?.name || x?.title || JSON.stringify(x)) : String(x)
    ).join(' · ') + (v.length > 3 ? ` · +${v.length - 3} more` : '');
  }
  if (typeof v === 'object') {
    return v.name || v.title || v.value || JSON.stringify(v).slice(0, 80);
  }
  return String(v);
}

function RibbonHeading({ title, subtitle, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
      margin: '4px 0 8px',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 900, color,
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Render a slot — value if present, otherwise a "Complete this field" CTA
// (role-aware: business users see friendly text, engineers see the JSON path).
function Slot({ label, value, bindPath, accent }) {
  const pending = isOperatorPending(value);
  const role = getCurrentRole();
  const showTech = isTechRole(role);
  return (
    <div style={{
      padding: '13px 14px', background: '#fff',
      border: `1px solid ${pending ? '#e2e8f0' : `${accent}55`}`,
      borderLeft: `5px solid ${accent}`,
      borderRadius: 8,
      fontSize: 12,
      minHeight: 96,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
    }}>
      <div style={{
        fontSize: 11, color: accent, fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{label}</span>
        {pending && (
          <span style={{
            padding: '2px 7px', fontSize: 9, fontWeight: 800,
            background: '#fef3c7', color: '#b45309', borderRadius: 2,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Pending</span>
        )}
      </div>
      {!pending ? (
        <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5, fontWeight: 600 }}>
          {renderValue(value)}
        </div>
      ) : (
        <div style={{
          padding: '8px 10px',
          background: '#fffbeb',
          border: '1px dashed #fcd34d',
          borderRadius: 4,
          fontSize: 11, color: '#92400e',
        }}>
          ✎ <strong>Complete this field</strong>
          {showTech && bindPath && (
            <div style={{
              marginTop: 4, fontSize: 9, fontFamily: 'monospace',
              color: '#a16207', wordBreak: 'break-all',
            }}>{bindPath}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsible section — default-closed for verbose blocks (To-Do, History...)
function TabSection({ title, icon, color, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginTop: 12,
      border: `1px solid ${color}55`, borderRadius: 6,
      background: '#fff',
      boxShadow: open ? `0 1px 3px ${color}22` : 'none',
    }}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}22`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? `${color}11` : '#f8fafc'; }}
        title={`${open ? 'Collapse' : 'Expand'} — ${title}`}
        style={{
          width: '100%', padding: '10px 14px', textAlign: 'left',
          background: open ? `${color}11` : '#f8fafc',
          border: 'none', borderRadius: 6,
          borderBottom: open ? `1px solid ${color}33` : 'none',
          fontSize: 12, fontWeight: 700, color: '#0f172a',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'background 0.12s',
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 3,
          background: color, color: '#fff',
          fontSize: 12, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{open ? '−' : '+'}</span>
        <span>{icon} {title}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          👆 {open ? 'click to collapse' : 'click to expand'}
        </span>
      </button>
      {open && <div style={{ padding: 12 }}>{children}</div>}
    </div>
  );
}

// Header ribbon — BIG identity banner ("what am I looking at right now?")
// + alignment trail + status chips. Always visible, ALWAYS at top.
// Operator 2026-06-05: "end of the day what tab I have selected that what
// I should see" — the selected (Tab · Sub-Tab · Focus) must dominate.
// useTabLens — reads lens for a tab (URL ?lens=X wins, localStorage fallback)
// + listens for changes. Lets TabFrame react to lens choice and re-order sections.
function useTabLens(tabId) {
  const key = `insur.lens.${tabId}`;
  // Read URL first so a shared link with ?lens=engineer survives session
  const readInitial = () => {
    try {
      const url = new URL(window.location.href);
      const urlLens = url.searchParams.get('lens');
      if (urlLens) return urlLens;
      return localStorage.getItem(key) || 'all';
    } catch (e) { return 'all'; }
  };
  const [lens, setLensRaw] = useState(readInitial);
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.tabId === tabId) setLensRaw(e.detail.lens);
    };
    window.addEventListener('insur:lens-changed', handler);
    return () => window.removeEventListener('insur:lens-changed', handler);
  }, [tabId]);
  const setLens = (v) => {
    try { localStorage.setItem(key, v); } catch (e) { /* swallow */ }
    // Also push to URL so the choice round-trips through share / refresh
    try {
      const url = new URL(window.location.href);
      if (!v || v === 'all') url.searchParams.delete('lens');
      else url.searchParams.set('lens', v);
      window.history.replaceState({}, '', url.toString());
    } catch (e) { /* swallow */ }
    setLensRaw(v);
    window.dispatchEvent(new CustomEvent('insur:lens-changed', {
      detail: { tabId, lens: v },
    }));
  };
  return [lens, setLens];
}

// RoleLensChip — for Mixed tabs only. Lets the operator pick which stakeholder
// lens to view the tab through (Engineer / Manager / Business). Persists to
// localStorage per tab so different mixed tabs can have different lenses.
// Operator §74.6e: "surface per-role lens at top so different stakeholders
// see relevant content first".
function RoleLensChip({ color, tabId }) {
  const [lens, setLens] = useTabLens(tabId);
  const lenses = [
    { id: 'all',      label: 'All',      icon: '👁',  hint: 'Everything (default)' },
    { id: 'engineer', label: 'Engineer', icon: '🔧', hint: 'Promote AI Logic + Components + Test surfaces' },
    { id: 'manager',  label: 'Manager',  icon: '👔', hint: 'Promote Objective + KPI + Actions queue' },
    { id: 'business', label: 'Business', icon: '💼', hint: 'Promote Objective + Value + Outcome' },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 8, fontSize: 10,
    }}>
      <span style={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        🔭 View as:
      </span>
      {lenses.map((l) => {
        const active = lens === l.id;
        return (
          <button key={l.id} type="button"
            onClick={() => setLens(l.id)}
            title={l.hint}
            style={{
              minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: active ? color : 'rgba(255,255,255,0.18)',
              color: active ? '#0f172a' : color,
              border: 'none', borderRadius: 3, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
            <span style={{ fontSize: 11 }}>{l.icon}</span> {l.label}
          </button>
        );
      })}
      <span style={{ opacity: 0.7, fontSize: 9 }}>
        · persists per tab
      </span>
    </div>
  );
}

// FrameworkChips — operator 2026-06-05: every tab self-identifies its SDLC
// stage + ops domain + build-order tier. Each chip links to the corresponding
// anchor on /bank/framework, so the operator can drill from any tab to the
// canonical reference. Composes with §75/§76/§77 + §64.43 + §64.44 + §67.
function FrameworkChips({ tabId }) {
  const map = TAB_FRAMEWORK_MAP[tabId];
  if (!map) return null;
  const sdlc = SDLC_BY_ID[map.sdlc];
  const tier = TIER_BY_ID[map.tier];
  const opsItems = (map.ops || []).map((id) => OPS_BY_ID[id]).filter(Boolean);
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 3,
    fontSize: 9, fontWeight: 700,
    textDecoration: 'none',
    background: 'rgba(255,255,255,0.18)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.35)',
  };
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4,
      marginTop: 6, marginBottom: 4,
      fontSize: 9, opacity: 0.95,
    }}>
      <span style={{
        fontSize: 8, color: 'rgba(255,255,255,0.7)',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        padding: '2px 4px',
      }}>FRAMEWORK</span>
      {sdlc && (
        <a href={`/bank/framework#sdlc-${sdlc.id}`} title="Jump to this SDLC stage on /bank/framework"
           style={chipStyle}>
          {sdlc.icon} SDLC: {sdlc.label}
        </a>
      )}
      {tier && (
        <a href={`/bank/framework#tier-${tier.id}`} title={`Build-order tier · ${tier.months}`}
           style={chipStyle}>
          🏗 L{tier.tier}: {tier.label}
        </a>
      )}
      {opsItems.map((o) => (
        <a key={o.id} href={`/bank/framework#ops-${o.id}`} title={o.scope} style={chipStyle}>
          ⚙ {o.name}
        </a>
      ))}
      <a href="/bank/framework" title="Open full framework reference"
         style={{ ...chipStyle, background: 'rgba(255,255,255,0.32)' }}>
        📚 Full reference →
      </a>
    </div>
  );
}

function DependencyChainStrip({ tab, sub, proc, dept, focusKind, focusLabel }) {
  const chain = [
    { label: 'Main menu', value: `${dept?.name || 'Department'} / ${proc?.name || 'Process'}`, color: '#1d4ed8' },
    { label: 'Sub-menu focus', value: focusLabel || sub?.label || 'No focus selected', color: focusLabel ? (KIND_COLOR[focusKind] || '#7f1d1d') : '#64748b' },
    { label: 'Workspace', value: `${tab.label}${sub ? ` / ${sub.label}` : ''}`, color: tab.color },
    { label: 'Content source', value: `proc.${tab.id}${sub?.id ? `.${sub.id}` : ''}`, color: '#0f766e' },
  ];
  return (
    <div style={{
      marginBottom: 12, padding: '10px 12px',
      background: '#ffffff', border: '1px solid #cbd5e1',
      borderLeft: `4px solid ${tab.color}`, borderRadius: 6,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: '#0f172a',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>Navigation dependency: menu to sub-menu to workspace</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 8,
      }}>
        {chain.map((item, i) => (
          <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{
              flex: 1, padding: '8px 10px', background: `${item.color}0f`,
              border: `1px solid ${item.color}44`, borderLeft: `4px solid ${item.color}`,
              borderRadius: 5, minWidth: 0,
            }}>
              <div style={{ fontSize: 10, color: item.color, fontWeight: 800, textTransform: 'uppercase' }}>
                {i + 1}. {item.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>
                {item.value}
              </div>
            </div>
            {i < chain.length - 1 && (
              <div style={{ alignSelf: 'center', color: '#94a3b8', fontSize: 16 }}>{'>'}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceQualityChecklist({ tab, sub, proc, focusKind, focusLabel }) {
  const checks = [
    { label: 'Objective', ok: !!TAB_CHARTER[tab.id], detail: 'Tab objective and business value visible' },
    { label: 'Main/sub dependency', ok: !!proc && !!tab, detail: `${proc?.name || 'Process'} / ${tab.label}${sub ? ` / ${sub.label}` : ''}` },
    { label: 'Focus correlation', ok: !focusLabel || !!focusKind, detail: focusLabel || 'No sub-menu focus selected' },
    { label: 'Input', ok: !!read(proc, 'data_process.input', 'manual_process.tools'), detail: 'Input data or manual tools mapped' },
    { label: 'Process', ok: !!read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary', 'manual_process.summary'), detail: 'Manual/automatic process source mapped' },
    { label: 'Output', ok: !!read(proc, 'data_process.output', 'output.artifacts'), detail: 'Output artifact mapped' },
    { label: 'Cards', ok: true, detail: 'INFO, ACTION, and MIXED meaning labels plus list colors visible' },
    { label: 'Buttons', ok: true, detail: 'Run, export, approve, assign, and test actions grouped in Actions' },
    { label: 'Headings', ok: true, detail: 'Objective, transformation, IPO, process, AI, output, KPI, and components labeled' },
    { label: 'Visualization', ok: true, detail: 'KPI and visualization section always present, with fallback when data is pending' },
    { label: 'To-Do', ok: true, detail: 'Top snapshot visible and full role checklist expanded below' },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return (
    <div style={{
      marginBottom: 12, padding: 12,
      background: '#fff', border: '1px solid #cbd5e1',
      borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>Workspace quality check</strong>
        <span style={{
          padding: '3px 10px', borderRadius: 999,
          background: score >= 80 ? '#dcfce7' : '#fef3c7',
          color: score >= 80 ? '#166534' : '#92400e',
          border: `1px solid ${score >= 80 ? '#86efac' : '#fcd34d'}`,
          fontSize: 11, fontWeight: 800,
        }}>{score}/100</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>Checks dependency, objective, headings, cards, buttons, input, process, output, visualization, and to-do readiness.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 6 }}>
        {checks.map((check) => (
          <div key={check.label} style={{
            padding: '7px 9px',
            background: check.ok ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${check.ok ? '#bbf7d0' : '#fde68a'}`,
            borderLeft: `4px solid ${check.ok ? '#16a34a' : '#f59e0b'}`,
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 800 }}>
              {check.ok ? '✓' : '!'} {check.label}
            </div>
            <div style={{ marginTop: 2, fontSize: 10, color: '#64748b', lineHeight: 1.35 }}>
              {check.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopHorizontalFlowStrip({ tab, proc }) {
  const charter = TAB_CHARTER[tab.id];
  const input = read(proc, 'data_process.input', 'manual_process.tools');
  const process = read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary', 'manual_process.summary');
  const output = read(proc, 'data_process.output', 'output.artifacts');
  const visualization = read(proc, 'visualization', 'dashboard', 'smart_kpi', 'as_is_to_be.deltas');
  const steps = [
    { label: 'Objective', value: charter?.why || 'Objective pending', color: '#2563eb', ok: !!charter },
    { label: 'Input', value: input || 'Input mapping pending', color: '#0284c7', ok: !!input },
    { label: 'Process', value: process || 'Manual/automatic process pending', color: '#7c3aed', ok: !!process },
    { label: 'Output', value: output || 'Output artifact pending', color: '#16a34a', ok: !!output },
    { label: 'Visualization', value: visualization || 'Visualization uses fallback until source data is wired', color: '#d97706', ok: true },
    { label: 'To-Do', value: 'Role checklist tracks missing objective, data, process, output, evidence, and approval gaps', color: '#dc2626', ok: true },
  ];
  return (
    <div style={{
      marginBottom: 12, padding: 12,
      background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        flexWrap: 'wrap', marginBottom: 10,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 900, color: '#0f172a',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>Top horizontal flow: objective to visualization to to-do</div>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
          Always visible journey map for the active workspace
        </span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8,
      }}>
        {steps.map((step, i) => (
          <div key={step.label} style={{ display: 'flex', gap: 8, alignItems: 'stretch', minWidth: 0 }}>
            <div style={{
              flex: 1, minWidth: 0, padding: '9px 10px',
              background: `${step.color}0f`, border: `1px solid ${step.color}44`,
              borderLeft: `4px solid ${step.color}`, borderRadius: 5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  width: 19, height: 19, borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: step.color, color: '#fff', fontSize: 10, fontWeight: 900,
                }}>{i + 1}</span>
                <span style={{ fontSize: 10, color: step.color, fontWeight: 900, textTransform: 'uppercase' }}>
                  {step.label}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: step.ok ? '#166534' : '#92400e', fontWeight: 900 }}>
                  {step.ok ? 'OK' : 'PENDING'}
                </span>
              </div>
              <div style={{
                fontSize: 11, color: '#0f172a', lineHeight: 1.35,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }} title={typeof step.value === 'string' ? step.value : renderValue(step.value)}>
                {renderValue(step.value)}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ alignSelf: 'center', color: '#94a3b8', fontSize: 16, fontWeight: 900 }}>{'>'}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTodoSnapshot({ tab, sub, proc }) {
  const charter = TAB_CHARTER[tab.id];
  const items = [
    { label: 'Objective visible', ok: !!charter, detail: charter ? 'Business objective is mapped to this tab' : 'Add TAB_CHARTER entry' },
    { label: 'Input mapped', ok: !!read(proc, 'data_process.input', 'manual_process.tools'), detail: 'Source data, tool, or manual input identified' },
    { label: 'Process mapped', ok: !!read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary', 'manual_process.summary'), detail: 'Manual and/or automatic workflow visible' },
    { label: 'Output mapped', ok: !!read(proc, 'data_process.output', 'output.artifacts'), detail: 'Artifact, decision, or report output identified' },
    { label: 'Visualization present', ok: true, detail: 'Dashboard slot remains visible even when source data is pending' },
    { label: 'Action controls present', ok: true, detail: 'Run, export, approve, assign, test, and compare controls live in Actions' },
  ];
  const done = items.filter((item) => item.ok).length;
  return (
    <div style={{
      marginBottom: 12, padding: 12,
      background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: `4px solid ${tab.color}`,
      borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>To-do snapshot</strong>
        <span style={{
          padding: '3px 10px', borderRadius: 999,
          background: done === items.length ? '#dcfce7' : '#fef3c7',
          color: done === items.length ? '#166534' : '#92400e',
          border: `1px solid ${done === items.length ? '#86efac' : '#fcd34d'}`,
          fontSize: 11, fontWeight: 900,
        }}>{done}/{items.length} ready</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          Path: {tab.label}{sub ? ` / ${sub.label}` : ''}; full role checklist is expanded below.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 6 }}>
        {items.map((item) => (
          <div key={item.label} style={{
            padding: '7px 9px', background: item.ok ? '#ffffff' : '#fffbeb',
            border: `1px solid ${item.ok ? '#dbeafe' : '#fde68a'}`,
            borderLeft: `4px solid ${item.ok ? tab.color : '#f59e0b'}`,
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 900 }}>
              {item.ok ? '✓' : '!'} {item.label}
            </div>
            <div style={{ marginTop: 2, fontSize: 10, color: '#64748b', lineHeight: 1.35 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabComponentSequenceReview({ tab, sub, proc }) {
  const profile = TAB_PROFILES[tab.id] || TAB_PROFILES.overview;
  const charter = TAB_CHARTER[tab.id];
  const input = read(proc, 'data_process.input', 'manual_process.tools');
  const process = read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary', 'manual_process.summary');
  const output = read(proc, 'data_process.output', 'output.artifacts');
  const rows = [
    {
      task: '1. Objective', kind: 'info', status: !!charter,
      component: 'Business Objective',
      purpose: 'States why this tab exists and what user decision it supports.',
      outcome: 'User knows the goal before reading cards or clicking actions.',
    },
    {
      task: '2. Input', kind: 'info', status: !!input,
      component: 'Input Source',
      purpose: 'Shows source data, tool, payload, or manual input needed by the tab.',
      outcome: 'User can verify the work starts from the right evidence.',
    },
    {
      task: '3. Process', kind: profile.type === 'action' ? 'action' : 'mixed', status: !!process,
      component: 'Process Logic',
      purpose: 'Explains manual or automated work performed after input is selected.',
      outcome: 'User sees what happens before output, approval, or escalation.',
    },
    {
      task: '4. Workspace Cards', kind: 'mixed', status: true,
      component: 'Operational Components',
      purpose: 'Cards are ordered by journey and labeled INFO, ACTION, or MIXED.',
      outcome: 'User can distinguish reading cards from executable cards quickly.',
    },
    {
      task: '5. Output', kind: 'info', status: !!output,
      component: 'Output Artifact',
      purpose: 'Shows report, decision, model result, audit artifact, or downstream handoff.',
      outcome: 'User knows what the tab produces and where it goes next.',
    },
    {
      task: '6. Visualization', kind: 'visualization', status: true,
      component: 'KPI / Graph Slot',
      purpose: 'Turns status and metrics into a scan-friendly graph or fallback panel.',
      outcome: 'User can judge health, trend, or impact without reading every row.',
    },
    {
      task: '7. Actions', kind: 'action', status: true,
      component: 'Action Table',
      purpose: 'One row is one task; the button stays active until completion.',
      outcome: 'User sees READY, ACTIVE, DONE, timestamp, and expected result.',
    },
    {
      task: '8. Checklist + History', kind: 'mixed', status: true,
      component: 'To-Do / Transaction History / Audit',
      purpose: 'Captures readiness gaps, user actions, date/time stamp, and audit evidence.',
      outcome: 'User can prove what happened, when, by whom, and what remains open.',
    },
  ];
  const kindColor = {
    info: '#0891b2',
    action: '#dc2626',
    visualization: '#16a34a',
    mixed: '#475569',
  };
  const kindLabel = {
    info: 'INFO COMPONENT',
    action: 'ACTION COMPONENT',
    visualization: 'VISUALIZATION',
    mixed: 'MIXED COMPONENT',
  };
  return (
    <div style={{
      marginBottom: 12, padding: 12,
      background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>Tab component review</strong>
        <span style={{
          padding: '3px 9px', borderRadius: 999,
          background: `${TYPE_META[profile.type]?.color || '#475569'}18`,
          color: TYPE_META[profile.type]?.color || '#475569',
          border: `1px solid ${(TYPE_META[profile.type]?.color || '#475569')}55`,
          fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
        }}>{TYPE_META[profile.type]?.label || 'Mixed'} tab</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          {tab.label}{sub ? ` / ${sub.label}` : ''}: sequence, purpose, type, and readiness from the user point of view.
        </span>
      </div>
      <div style={{
        marginBottom: 8, padding: '7px 9px', background: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: 4,
        fontSize: 11, color: '#475569', lineHeight: 1.4,
      }}>
        <strong style={{ color: '#0f172a' }}>Card purpose rule:</strong> Info component: read, inspect, and understand evidence. Action component: click, run, approve, assign, or complete work with visible status.
      </div>
      <div style={{ display: 'grid', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {rows.map((row, i) => {
          const color = kindColor[row.kind] || '#475569';
          const tone = cardListTone(i);
          return (
            <div key={row.task} style={{
              display: 'grid',
              gridTemplateColumns: '150px 150px minmax(220px, 1fr) minmax(220px, 1fr) 88px',
              minWidth: 880,
              gap: 8,
              alignItems: 'center',
              padding: '8px 10px',
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              borderLeft: `5px solid ${color}`,
              borderRadius: 5,
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>{row.task}</div>
              <div>
                <div style={{ fontSize: 10, color, fontWeight: 900, textTransform: 'uppercase' }}>{kindLabel[row.kind]}</div>
                <div style={{ marginTop: 2, fontSize: 10, color: '#64748b' }}>{row.component}</div>
              </div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.35 }}>{row.purpose}</div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.35 }}>{row.outcome}</div>
              <span style={{
                justifySelf: 'end', padding: '4px 8px', borderRadius: 999,
                background: row.status ? '#dcfce7' : '#fef3c7',
                color: row.status ? '#166534' : '#92400e',
                border: `1px solid ${row.status ? '#86efac' : '#fcd34d'}`,
                fontSize: 10, fontWeight: 900,
              }}>{row.status ? 'OK' : 'PENDING'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabHeaderRibbon({ tab, sub, proc, dept, focusKind, focusLabel }) {
  const profile = TAB_PROFILES[tab.id];
  const typeMeta = profile ? TYPE_META[profile.type] : null;
  const owner = read(proc, 'owner', 'manager', 'lead', 'readme.stakeholders');
  const status = read(proc, 'status', 'lifecycle', 'state') || 'In progress';
  const priority = read(proc, 'priority', 'priority_level') || '—';
  const risk = read(proc, 'risk_level', 'risk', 'security.threat_model') || '—';
  const version = read(proc, 'version', 'readme.version') || 'v1';
  const lastUpdated = read(proc, 'last_updated', 'modified_at') || 'Today';

  // Focus details — when an item from the maroon sub-menu is selected,
  // surface the underlying blueprint entry's structured fields here.
  let focusEntry = null;
  if (focusKind && focusLabel && proc) {
    if (focusKind === 'ai' && Array.isArray(proc.ai))
      focusEntry = proc.ai.find((a) => a.ai_type === focusLabel);
    else if (focusKind === 'sub' && Array.isArray(proc.sub_processes))
      focusEntry = proc.sub_processes.find((s) => (s.name || s) === focusLabel);
    else if (focusKind === 'agent' && Array.isArray(proc.agents))
      focusEntry = proc.agents.find((a) => (a.name || a) === focusLabel);
    else if (focusKind === 'app' && Array.isArray(proc.applications))
      focusEntry = proc.applications.find((a) => (a.name || a) === focusLabel);
    else if (focusKind === 'md' && Array.isArray(proc.master_data))
      focusEntry = proc.master_data.find((m) => (m.name || m) === focusLabel);
  }
  const focusColor = focusKind ? (KIND_COLOR[focusKind] || '#7f1d1d') : null;

  return (
    <div style={{
      marginBottom: 12,
      background: '#fff',
      border: `2px solid ${tab.color}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* IDENTITY BANNER — large, color-keyed to the active tab */}
      <div style={{
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}cc 100%)`,
        color: '#fff',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          opacity: 0.85, marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span>You are viewing</span>
          {typeMeta && (
            <>
              <span style={{
                padding: '2px 8px', borderRadius: 3,
                background: 'rgba(255,255,255,0.22)', color: '#fff',
                fontSize: 9, fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{typeMeta.icon} {typeMeta.label}</span>
              <span style={{ fontSize: 9, opacity: 0.85, fontFamily: 'monospace' }}>
                {profile.info}% info · {profile.viz}% viz · {profile.action}% action
              </span>
              <span style={{ fontSize: 9, opacity: 0.85 }}>
                · primary user: <strong>{profile.primary_user}</strong>
              </span>
            </>
          )}
        </div>
        {/* Intent line — operator: "what user wants and how" */}
        {profile && (
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.94)',
            marginBottom: 8, fontStyle: 'italic',
          }}>
            ✨ This tab helps you <strong style={{ color: '#fff', fontStyle: 'normal' }}>{profile.intent}</strong>.
          </div>
        )}
        {/* Per-role lens chip — Mixed tabs only (operator §74.6e:
            surface per-role lens at top so different stakeholders see relevant content first) */}
        {profile && profile.type === 'mixed' && (
          <RoleLensChip color="#fff" tabId={tab.id} />
        )}
        {/* Framework chips — operator 2026-06-05: every tab self-identifies
            its position in the top-1% framework. Links to /bank/framework anchors. */}
        <FrameworkChips tabId={tab.id} />

        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.01em',
          }}>{tab.label}</h1>
          {sub && (
            <>
              <span style={{ fontSize: 18, opacity: 0.7 }}>›</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', opacity: 0.95 }}>
                {sub.label}
              </h2>
            </>
          )}
          {focusKind && focusLabel && (
            <>
              <span style={{ fontSize: 18, opacity: 0.7 }}>›</span>
              <span style={{
                padding: '4px 12px', borderRadius: 4,
                background: '#fff', color: focusColor,
                fontSize: 14, fontWeight: 700,
              }}>
                📍 {focusLabel}
              </span>
              <span style={{
                fontSize: 10, padding: '2px 8px',
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                borderRadius: 3, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {KIND_LABEL[focusKind]}
              </span>
            </>
          )}
        </div>
      </div>
      {/* Alignment trail (compact) */}
      <div style={{
        padding: '8px 14px', fontSize: 11, color: '#475569',
        background: `${tab.color}08`, borderBottom: `1px solid ${tab.color}33`,
      }}>
        <span style={{ color: '#94a3b8' }}>📍 Aligned to: </span>
        <strong style={{ color: '#0f172a' }}>{dept?.name || '—'}</strong>
        <span style={{ margin: '0 5px', color: '#94a3b8' }}>›</span>
        <strong style={{ color: '#0f172a' }}>{proc?.name || '—'}</strong>
        <span style={{ margin: '0 5px', color: '#94a3b8' }}>›</span>
        <span style={{ color: tab.color, fontWeight: 700 }}>{tab.label}</span>
        {sub && (
          <>
            <span style={{ margin: '0 5px', color: '#94a3b8' }}>›</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{sub.label}</span>
          </>
        )}
      </div>
      {/* Status chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '8px 14px', fontSize: 10,
        borderBottom: focusEntry ? `1px solid ${focusColor}33` : 'none',
      }}>
        {[
          { k: 'Owner',    v: owner || '—', color: '#64748b' },
          { k: 'Status',   v: status,       color: '#16a34a' },
          { k: 'Priority', v: priority,     color: '#f59e0b' },
          { k: 'Risk',     v: risk,         color: '#dc2626' },
          { k: 'Version',  v: version,      color: '#6366f1' },
          { k: 'Updated',  v: lastUpdated,  color: '#0ea5e9' },
        ].map((c) => (
          <span key={c.k} style={{
            padding: '2px 8px', borderRadius: 4,
            background: `${c.color}15`,
            border: `1px solid ${c.color}55`,
            color: c.color, fontWeight: 600,
          }}>
            <span style={{ opacity: 0.7 }}>{c.k}:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{renderValue(c.v)}</strong>
          </span>
        ))}
      </div>
      {/* Focus entry detail — only when sub-menu item is selected */}
      {focusEntry && typeof focusEntry === 'object' && (
        <div style={{ padding: '10px 14px', background: `${focusColor}08` }}>
          <div style={{
            fontSize: 10, color: focusColor, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
          }}>
            🔎 {KIND_LABEL[focusKind]} detail
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10,
          }}>
            {Object.entries(focusEntry)
              .filter(([k, v]) => k !== 'name' && k !== 'ai_type' && v != null && v !== '')
              .map(([k, v], idx) => {
                const tone = cardListTone(idx);
                return (
                <div key={k} style={{
                  padding: '6px 8px', background: tone.bg,
                  border: `1px solid ${tone.border}`, borderRadius: 4,
                  fontSize: 11,
                }}>
                  <div style={{
                    fontSize: 9, color: focusColor, fontWeight: 700,
                    textTransform: 'capitalize',
                  }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ color: '#0f172a' }}>{renderValue(v)}</div>
                </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// AS-IS / TO-BE / ROI / Strategy ribbon. Always visible.
// Pulls from REAL blueprint shape: proc.as_is_to_be + proc.readme.ai_strategy.
function AsIsToBeRibbon({ tab, sub, proc }) {
  const { isTablet, isCompact } = useContext(BreakpointContext);
  const minCol = (isTablet || isCompact) ? '100%' : '220px';
  const asIs = read(proc,
    'as_is_to_be.as_is_summary', 'as_is_to_be.as_is',
    'manual_process.current_pain', 'manual_process.summary');
  const toBe = read(proc,
    'as_is_to_be.to_be_summary', 'as_is_to_be.to_be',
    'automatic_process.summary', 'automatic_process.ai_workflow');
  const roi = read(proc,
    'as_is_to_be.roi_estimate', 'as_is_to_be.roi',
    'as_is_to_be.deltas', 'readme.cost_analysis');
  const strategy = read(proc,
    'readme.ai_strategy', 'as_is_to_be.strategy');

  return (
    <div style={{ marginBottom: 16 }}>
      <RibbonHeading
        title="Business transformation"
        subtitle="AS-IS problem, TO-BE solution, value impact, and AI strategy for the selected process."
        color={tab.color}
      />
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}, 1fr))`,
        gap: 10,
      }}>
        <Slot label="AS-IS problem"   value={asIs}     bindPath="proc.as_is_to_be.as_is_summary"   accent="#dc2626" />
        <Slot label="TO-BE solution"  value={toBe}     bindPath="proc.as_is_to_be.to_be_summary"  accent="#16a34a" />
        <Slot label="ROI / Cost / Impact / Value" value={roi} bindPath="proc.as_is_to_be.roi_estimate" accent="#f59e0b" />
        <Slot label="Strategy"        value={strategy} bindPath="proc.readme.ai_strategy"          accent="#6366f1" />
      </div>
    </div>
  );
}

// Input → Process → Output ribbon. Always visible.
// Real paths: proc.data_process.{input,transform,output} + automatic_process.ai_workflow.
function IpoRibbon({ tab, sub, proc }) {
  const { isTablet, isCompact } = useContext(BreakpointContext);
  const input = read(proc,
    'data_process.input', 'manual_process.tools');
  const process = read(proc,
    'automatic_process.ai_workflow', 'automatic_process.summary',
    'data_process.transform', 'manual_process.summary');
  const output = read(proc,
    'data_process.output', 'output.artifacts');

  return (
    <div style={{ marginBottom: 16 }}>
      <RibbonHeading
        title="Input / Process / Output"
        subtitle="Data and execution path used by the active tab; missing fields are marked pending."
        color={tab.color}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: (isTablet || isCompact) ? '1fr' : '1fr 32px 1fr 32px 1fr',
        gap: (isTablet || isCompact) ? 10 : 6,
        alignItems: 'stretch',
      }}>
        <Slot label="INPUT"   value={input}   bindPath="proc.data_process.input"           accent="#0ea5e9" />
        {!(isTablet || isCompact) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#64748b', fontWeight: 800 }}>→</div>
        )}
        <Slot label="PROCESS" value={process} bindPath="proc.automatic_process.ai_workflow" accent="#8b5cf6" />
        {!(isTablet || isCompact) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#64748b', fontWeight: 800 }}>→</div>
        )}
        <Slot label="OUTPUT"  value={output}  bindPath="proc.data_process.output"          accent="#16a34a" />
      </div>
    </div>
  );
}

// Model · Data · Accuracy strip. Always visible (esp. valuable for AI tabs).
// Real paths: proc.tech_stack + proc.ai[] + proc.smart_kpi.
function ModelDataAccuracyStrip({ tab, sub, proc, focusKind, focusLabel }) {
  const { isTablet, isCompact } = useContext(BreakpointContext);
  const minCol = (isTablet || isCompact) ? '100%' : '220px';
  // If focus is an AI type, pull from that AI entry
  const aiEntry = (focusKind === 'ai' && Array.isArray(proc?.ai))
    ? proc.ai.find((a) => a.ai_type === focusLabel) : null;

  const model = read(aiEntry, 'ai_type', 'model_name', 'algorithm')
             || read(proc, 'tech_stack.ai_runtime', 'ai.0.ai_type');
  const data = read(aiEntry, 'data_source', 'data', 'training_data')
            || read(proc, 'tech_stack.data', 'data_process.input');
  const accuracy = read(aiEntry, 'accuracy', 'metrics.accuracy')
                || read(proc, 'smart_kpi.measurable', 'smart_kpi.specific');

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}, 1fr))`,
      gap: 8, marginBottom: 12,
    }}>
      <Slot label="🤖 Model"    value={model}    bindPath={aiEntry ? `proc.ai[${focusLabel}].ai_type` : 'proc.tech_stack.ai_runtime'} accent="#8b5cf6" />
      <Slot label="🗃 Data"     value={data}     bindPath={aiEntry ? `proc.ai[${focusLabel}].data_source` : 'proc.tech_stack.data'} accent="#0ea5e9" />
      <Slot label="🎯 Accuracy" value={accuracy} bindPath="proc.smart_kpi.measurable" accent="#16a34a" />
    </div>
  );
}

// Deterministic chart generator. The chart plan is based on the active
// tab/sub-tab/process so every workspace page has a distinct graph purpose.
function seededRand(seedKey) {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) {
    h = ((h << 5) - h + seedKey.charCodeAt(i)) | 0;
  }
  return (n) => {
    const x = Math.sin(h + n) * 10000;
    return x - Math.floor(x);
  };
}

const CHART_PERIODS = {
  week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  month: ['W1', 'W2', 'W3', 'W4'],
  quarter: ['M1', 'M2', 'M3'],
  lifecycle: ['Input', 'Process', 'Model', 'Control', 'Output'],
};

const TAB_VISUALIZATION_PLANS = {
  readme: {
    primary: { title: 'Architecture artifact readiness', metric: 'Ready %', unit: '%', kind: 'bar', period: 'lifecycle', baseline: 58, jitter: 20, trend: 5 },
    secondary: { title: 'Design evidence by artifact type', metric: 'Evidence count', labels: ['BRD', 'FRD', 'HLD', 'LLD', 'ADR'], baseline: 18, jitter: 12 },
    intent: 'Shows whether the documentation set is complete enough for handoff and audit.',
  },
  overview: {
    primary: { title: 'Process health trend', metric: 'Health score', unit: '/100', kind: 'area', period: 'week', baseline: 72, jitter: 16, trend: 2 },
    secondary: { title: 'Work split by operating state', metric: 'Items', labels: ['Manual', 'Automated', 'HITL', 'Exception'], baseline: 34, jitter: 18 },
    intent: 'Gives a 30-second operating view for the selected process.',
  },
  process: {
    primary: { title: 'Cycle-time improvement', metric: 'Hours saved', unit: 'h', kind: 'line', period: 'week', baseline: 14, jitter: 8, trend: 1.5 },
    secondary: { title: 'Bottleneck count by process stage', metric: 'Bottlenecks', labels: ['Intake', 'Validate', 'Decide', 'Approve', 'Close'], baseline: 7, jitter: 5 },
    intent: 'Highlights where manual and automated workflow stages create delay.',
  },
  data: {
    primary: { title: 'Data quality pass rate', metric: 'Quality %', unit: '%', kind: 'area', period: 'week', baseline: 76, jitter: 14, trend: 1.8 },
    secondary: { title: 'Issue count by data dimension', metric: 'Issues', labels: ['Completeness', 'Freshness', 'Lineage', 'PII', 'Schema'], baseline: 13, jitter: 9 },
    intent: 'Separates input trust from process performance.',
  },
  ai: {
    primary: { title: 'Model confidence trend', metric: 'Confidence %', unit: '%', kind: 'line', period: 'week', baseline: 68, jitter: 18, trend: 2.2 },
    secondary: { title: 'AI capability load', metric: 'Calls', labels: ['RAG', 'Prediction', 'Segmentation', 'Scoring', 'Routing'], baseline: 60, jitter: 30 },
    intent: 'Shows AI runtime confidence and capability usage for this process.',
  },
  analytics: {
    primary: { title: 'Analytical signal strength', metric: 'Signal score', unit: '/100', kind: 'area', period: 'month', baseline: 64, jitter: 12, trend: 4 },
    secondary: { title: 'Driver contribution', metric: 'Contribution', labels: ['Volume', 'Risk', 'Cost', 'Quality', 'SLA'], baseline: 22, jitter: 15 },
    intent: 'Focuses on measurement, drivers, and business signal quality.',
  },
  dashboard: {
    primary: { title: 'Role KPI attainment', metric: 'Attainment %', unit: '%', kind: 'bar', period: 'month', baseline: 70, jitter: 15, trend: 3 },
    secondary: { title: 'Dashboard drill-down usage', metric: 'Clicks', labels: ['Executive', 'Manager', 'Analyst', 'Ops', 'Risk'], baseline: 42, jitter: 24 },
    intent: 'Shows dashboard value by role and drill-down behavior.',
  },
  'biz-value': {
    primary: { title: 'ROI realization trend', metric: 'ROI %', unit: '%', kind: 'area', period: 'quarter', baseline: 28, jitter: 10, trend: 7 },
    secondary: { title: 'Dollar impact mix', metric: '$K', labels: ['Revenue', 'Cost save', 'Risk avoid', 'Time save'], baseline: 420, jitter: 260 },
    intent: 'Quantifies financial value rather than technical activity.',
  },
  'exp-ai': {
    primary: { title: 'Explanation coverage', metric: 'Explained %', unit: '%', kind: 'line', period: 'week', baseline: 74, jitter: 12, trend: 1.6 },
    secondary: { title: 'Explanation evidence sources', metric: 'Citations', labels: ['Features', 'Rules', 'RAG', 'Policy', 'History'], baseline: 24, jitter: 15 },
    intent: 'Tracks whether AI outputs are explainable enough for users and auditors.',
  },
  'res-ai': {
    primary: { title: 'Responsible AI risk trend', metric: 'Risk score', unit: '/100', kind: 'line', period: 'week', baseline: 36, jitter: 14, trend: -1.5 },
    secondary: { title: 'Control checks by category', metric: 'Checks', labels: ['Fairness', 'Bias', 'Privacy', 'Safety', 'HITL'], baseline: 18, jitter: 10 },
    intent: 'Shows safety, fairness, and human oversight posture.',
  },
  'gov-ai': {
    primary: { title: 'Governance approval throughput', metric: 'Approvals', kind: 'bar', period: 'week', baseline: 22, jitter: 12, trend: 1 },
    secondary: { title: 'Policy decision mix', metric: 'Decisions', labels: ['Allow', 'Review', 'Deny', 'Escalate'], baseline: 16, jitter: 9 },
    intent: 'Tracks policy-control throughput and approval routing.',
  },
  'comp-ai': {
    primary: { title: 'Compliance control pass rate', metric: 'Pass %', unit: '%', kind: 'area', period: 'week', baseline: 82, jitter: 10, trend: 1.2 },
    secondary: { title: 'Regulatory evidence coverage', metric: 'Evidence', labels: ['SOC2', 'GDPR', 'Model Risk', 'Audit', 'Retention'], baseline: 21, jitter: 13 },
    intent: 'Connects control testing to regulatory evidence.',
  },
  'inc-ai': {
    primary: { title: 'Incident resolution velocity', metric: 'Resolved', kind: 'bar', period: 'week', baseline: 11, jitter: 7, trend: 1 },
    secondary: { title: 'Incident root-cause mix', metric: 'Tickets', labels: ['Data', 'Model', 'Prompt', 'Tool', 'Policy'], baseline: 6, jitter: 5 },
    intent: 'Shows failure triage and recovery performance.',
  },
  'meet-ai': {
    primary: { title: 'Meeting-to-action conversion', metric: 'Actions', kind: 'line', period: 'week', baseline: 18, jitter: 8, trend: 1.3 },
    secondary: { title: 'Action ownership by role', metric: 'Tasks', labels: ['Owner', 'SME', 'Risk', 'Tech', 'Ops'], baseline: 9, jitter: 7 },
    intent: 'Tracks whether discussions turn into accountable work.',
  },
  'job-ai': {
    primary: { title: 'Job success rate', metric: 'Success %', unit: '%', kind: 'area', period: 'week', baseline: 86, jitter: 8, trend: 0.7 },
    secondary: { title: 'Batch workload by queue', metric: 'Jobs', labels: ['Ingest', 'Train', 'Eval', 'Report', 'Notify'], baseline: 40, jitter: 22 },
    intent: 'Shows scheduled workload health and recovery pressure.',
  },
  'test-ai': {
    primary: { title: 'Test pass-rate trend', metric: 'Pass %', unit: '%', kind: 'line', period: 'week', baseline: 78, jitter: 13, trend: 1.4 },
    secondary: { title: 'Coverage by test family', metric: 'Coverage %', labels: ['Unit', 'API', 'UI', 'Data', 'Model'], baseline: 67, jitter: 18 },
    intent: 'Separates quality evidence by test family.',
  },
  operations: {
    primary: { title: 'SLA compliance trend', metric: 'SLA %', unit: '%', kind: 'area', period: 'week', baseline: 88, jitter: 8, trend: 0.8 },
    secondary: { title: 'Operational event mix', metric: 'Events', labels: ['Alert', 'Retry', 'Rollback', 'Deploy', 'Scale'], baseline: 13, jitter: 10 },
    intent: 'Focuses on day-2 production health.',
  },
  reports: {
    primary: { title: 'Report delivery completion', metric: 'Delivered %', unit: '%', kind: 'bar', period: 'month', baseline: 81, jitter: 12, trend: 2 },
    secondary: { title: 'Report usage by audience', metric: 'Views', labels: ['Exec', 'Manager', 'Ops', 'Risk', 'Audit'], baseline: 55, jitter: 35 },
    intent: 'Tracks report production and consumption.',
  },
  'product-mgr': {
    primary: { title: 'Roadmap burn-up', metric: 'Completed', kind: 'area', period: 'month', baseline: 18, jitter: 8, trend: 5 },
    secondary: { title: 'Backlog by delivery lane', metric: 'Stories', labels: ['Discovery', 'Build', 'Test', 'Launch', 'Adopt'], baseline: 14, jitter: 8 },
    intent: 'Shows product delivery flow instead of operational KPIs.',
  },
  'user-story': {
    primary: { title: 'Acceptance criteria readiness', metric: 'Ready %', unit: '%', kind: 'bar', period: 'lifecycle', baseline: 61, jitter: 18, trend: 4 },
    secondary: { title: 'Story coverage by persona', metric: 'Stories', labels: ['User', 'Manager', 'Ops', 'Risk', 'Admin'], baseline: 8, jitter: 6 },
    intent: 'Shows whether business behavior is testable.',
  },
  'user-demo': {
    primary: { title: 'Demo scenario readiness', metric: 'Ready %', unit: '%', kind: 'bar', period: 'lifecycle', baseline: 66, jitter: 16, trend: 4 },
    secondary: { title: 'Demo evidence assets', metric: 'Assets', labels: ['Script', 'Data', 'Screen', 'Video', 'FAQ'], baseline: 7, jitter: 5 },
    intent: 'Shows whether the demo can be run end-to-end.',
  },
  'note-ai': {
    primary: { title: 'Knowledge capture freshness', metric: 'Fresh %', unit: '%', kind: 'area', period: 'week', baseline: 73, jitter: 14, trend: 1.1 },
    secondary: { title: 'Knowledge object mix', metric: 'Objects', labels: ['Notes', 'Decisions', 'Risks', 'FAQs', 'Links'], baseline: 15, jitter: 10 },
    intent: 'Shows whether process knowledge is current and reusable.',
  },
};

function visualizationPlanFor(tab, sub, proc) {
  const profile = TAB_PROFILES[tab?.id] || TAB_PROFILES.overview;
  const fallback = TAB_VISUALIZATION_PLANS[profile.type === 'decision' ? 'gov-ai' : 'overview'];
  const plan = TAB_VISUALIZATION_PLANS[tab?.id] || fallback;
  const subLabel = sub?.label ? ` · ${sub.label}` : '';
  const procLabel = proc?.name ? ` · ${proc.name}` : '';
  return {
    ...plan,
    titleSuffix: `${subLabel}${procLabel}`,
  };
}

function makePlannedSeries(seedKey, spec) {
  const rnd = seededRand(seedKey);
  const labels = CHART_PERIODS[spec.period] || CHART_PERIODS.week;
  return labels.map((label, i) => ({
    label,
    [spec.metric]: Math.max(0, Math.round(spec.baseline + (spec.trend || 0) * i + (rnd(i + 1) - 0.5) * spec.jitter)),
  }));
}

function makeCategorySeries(seedKey, spec) {
  const rnd = seededRand(seedKey);
  return (spec.labels || []).map((label, i) => ({
    label,
    [spec.metric]: Math.max(0, Math.round(spec.baseline + (rnd(i + 11) - 0.5) * spec.jitter)),
  }));
}

function PlannedTrendChart({ spec, data, color }) {
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
      <YAxis stroke="#64748b" fontSize={10} />
      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
    </>
  );
  if (spec.kind === 'bar') {
    return (
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        {common}
        <Bar dataKey={spec.metric} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  }
  if (spec.kind === 'line') {
    return (
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        {common}
        <Line type="monotone" dataKey={spec.metric} stroke={color} strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    );
  }
  return (
    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      {common}
      <Area type="monotone" dataKey={spec.metric} stroke={color}
        fill={color} fillOpacity={0.18} strokeWidth={2} />
    </AreaChart>
  );
}

// Visualization slot — real recharts. Uses tab-specific chart plans so each
// page communicates the correct business question instead of repeating one graph.
function VisualizationSlot({ tab, sub, proc }) {
  const v = proc?.visualization || {};
  const primaryRaw = v.primary_chart;
  const primary = isOperatorPending(primaryRaw) ? null : primaryRaw;
  const plan = visualizationPlanFor(tab, sub, proc);
  const seedKey = `${proc?.id || proc?.name || 'proc'}|${tab.id}|${sub?.id || '_'}|${plan.primary.title}`;
  const trendSeries = useMemo(() => makePlannedSeries(seedKey, plan.primary), [seedKey, plan.primary]);
  const categorySeries = useMemo(() => makeCategorySeries(seedKey + ':category', plan.secondary), [seedKey, plan.secondary]);
  return (
    <div>
      <div style={{
        marginBottom: 10, padding: '8px 10px',
        background: `${tab.color}11`, border: `1px solid ${tab.color}33`,
        borderRadius: 4, fontSize: 11, color: '#0f172a',
      }}>
        <strong>Chart intent:</strong> {plan.intent}{' '}
        <span style={{ color: '#64748b' }}>Source path: tab={tab.id}{sub?.id ? ` / sub=${sub.id}` : ''}</span>
      </div>
      {primary && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 4, fontSize: 11, color: '#0f172a',
        }}>
          <strong>Blueprint chart spec:</strong> {primary}
        </div>
      )}
      <div style={{
        display: 'grid', gap: 10, minWidth: 0,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
      }}>
        <div style={{
          padding: 12, background: cardListTone(0).bg,
          border: `1px solid ${cardListTone(0).border}`, borderRadius: 6,
          borderLeft: `4px solid ${tab.color}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: tab.color, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{plan.primary.title}</div>
          <ResponsiveContainer width="100%" height={180}>
            <PlannedTrendChart spec={plan.primary} data={trendSeries} color={tab.color} />
          </ResponsiveContainer>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
            Deterministic demo data · metric: {plan.primary.metric}{plan.primary.unit ? ` ${plan.primary.unit}` : ''}{plan.titleSuffix}
          </div>
        </div>
        <div style={{
          padding: 12, background: cardListTone(1).bg,
          border: `1px solid ${cardListTone(1).border}`, borderRadius: 6,
          borderLeft: `4px solid ${tab.color}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: tab.color, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{plan.secondary.title}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categorySeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
              <Bar dataKey={plan.secondary.metric} fill={tab.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
            Deterministic demo data · metric: {plan.secondary.metric} · awaiting backend wire-up
          </div>
        </div>
      </div>
      {(v.additional_charts || v.axes || v.drill_down || v.library) && (
        <details style={{ marginTop: 10 }}>
          <summary style={{
            cursor: 'pointer', fontSize: 10, color: '#64748b',
            padding: 4, fontWeight: 600,
          }}>📋 Chart specification (blueprint)</summary>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6,
            marginTop: 6,
          }}>
            <Slot label="Additional charts" value={v.additional_charts} bindPath="proc.visualization.additional_charts" accent={tab.color} />
            <Slot label="Axes"              value={v.axes}              bindPath="proc.visualization.axes"              accent={tab.color} />
            <Slot label="Drill-down"        value={v.drill_down}        bindPath="proc.visualization.drill_down"        accent={tab.color} />
            <Slot label="Library"           value={v.library}           bindPath="proc.visualization.library"           accent={tab.color} />
          </div>
        </details>
      )}
    </div>
  );
}

// Flow slot — uses proc.flow_diagram (real blueprint field).
function FlowSlot({ tab, sub, proc }) {
  const f = proc?.flow_diagram || {};
  const diagram = f.diagram;
  const format = f.format;
  if (!diagram) {
    return (
      <div style={{
        padding: 18, background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 6, textAlign: 'center',
        fontSize: 12, color: '#64748b',
      }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🔀</div>
        <strong>Flow diagram</strong>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
          wire → proc.flow_diagram.diagram
        </div>
      </div>
    );
  }
  return (
    <div>
      {format && (
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
          Format: <strong>{format}</strong>
        </div>
      )}
      <pre style={{
        margin: 0, padding: 12,
        background: '#f8fafc', color: '#475569', border: '1px solid #e5e7eb',
        borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
        overflow: 'auto', maxHeight: 400,
      }}>{typeof diagram === 'string' ? diagram : JSON.stringify(diagram, null, 2)}</pre>
    </div>
  );
}

// Summary note + Outcome — narrative slots, pull from REAL blueprint fields.
// SequenceOpsLayout — operator 2026-06-14 16:04 MDT: "create one new tab where
// I want to explore other layout · left and right side layout with component
// approach" + (prior) "manual process tab: I need left side list of sequence
// and right side list of operation".
//
// 2-column experimental layout for the manual-explore tab:
//   LEFT  · numbered SEQUENCE list (vertical · ordered · step + actor + time)
//   RIGHT · OPERATIONS list (action buttons · component-based · per-op detail)
//
// Each side is component-based and reusable. Data pulled from proc.manual_process
// (steps[] + operations[]) with §57.7 honest fallback fixture when absent.
//
// Composes with: §43 (drill enforces presence) · §57.7 (fallback fixture clearly
// labeled · NOT silent) · §73 (per-tab differentiation · OP-13 dedicates a tab
// to layout exploration) · §93 (sequence IS the IPO chain) · §137 (light bg).
function SequenceOpsLayout({ tab, sub, proc }) {
  // Sequence steps from proc.manual_process.steps OR fixture
  const stepsRaw = read(proc, 'manual_process.steps', 'manual_process.user_steps');
  const opsRaw = read(proc, 'manual_process.operations', 'automatic_process.operations');

  const fallbackSteps = [
    { actor: 'Customer', step: 'Submit form via portal', time_min: 5 },
    { actor: 'Agent · Intake', step: 'Receive + validate fields', time_min: 12 },
    { actor: 'Agent · Intake', step: 'Resolve missing data via phone', time_min: 18 },
    { actor: 'Underwriter', step: 'Review underwriting rules', time_min: 25 },
    { actor: 'Underwriter', step: 'Decision · approve / decline / refer', time_min: 8 },
    { actor: 'System', step: 'Persist decision + audit row', time_min: 1 },
    { actor: 'Customer', step: 'Receive decision notification', time_min: 2 },
  ];
  const fallbackOps = [
    { id: 'validate', label: 'Validate input', icon: '✓', desc: 'Run field-level rules · highlight bad' },
    { id: 'lookup', label: 'Customer lookup', icon: '🔍', desc: 'Resolve customer by ID / SSN · pull history' },
    { id: 'score', label: 'Risk score', icon: '📊', desc: 'Compute risk band · UW reference' },
    { id: 'check-policy', label: 'Policy check', icon: '📋', desc: 'Apply UW rules · note exceptions' },
    { id: 'request-doc', label: 'Request document', icon: '📎', desc: 'Email customer for missing docs' },
    { id: 'route-uw', label: 'Route to UW', icon: '↪', desc: 'Send to underwriter queue · SLA timer starts' },
    { id: 'approve', label: 'Approve', icon: '✅', desc: 'Mark approved · trigger downstream' },
    { id: 'decline', label: 'Decline', icon: '❌', desc: 'Mark declined · capture reason · audit' },
    { id: 'refer', label: 'Refer to senior', icon: '⬆', desc: 'Escalate to L2 · attach context' },
    { id: 'audit', label: 'Open audit trail', icon: '🔒', desc: 'View timeline · who/what/when' },
  ];
  const steps = Array.isArray(stepsRaw) && stepsRaw.length > 0 ? stepsRaw : fallbackSteps;
  const ops = Array.isArray(opsRaw) && opsRaw.length > 0 ? opsRaw : fallbackOps;
  const usingFallback = !(Array.isArray(stepsRaw) && stepsRaw.length > 0);

  const isSequenceOps = !sub || sub.id === 'sequence-ops';
  const isSplitCanvas = sub?.id === 'split-canvas';
  const isCompare = sub?.id === 'compare';

  return (
    <div>
      {usingFallback && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: '#fef3c7', border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b',
          borderRadius: 4, fontSize: 11, color: '#78350f',
        }}>
          🟡 §57.7 honest fallback · proc.manual_process.steps / .operations not populated.
          Showing fixture so layout is reviewable.
        </div>
      )}

      {/* Sub-tab dispatch */}
      {isSequenceOps && <SeqOpsTwoColumn steps={steps} ops={ops} color={tab.color} />}
      {isSplitCanvas && <SeqOpsSplitCanvas steps={steps} ops={ops} color={tab.color} />}
      {isCompare && <SeqOpsCompare steps={steps} ops={ops} color={tab.color} />}
    </div>
  );
}

// 2-column layout — LEFT sequence (numbered · ordered) · RIGHT operations (action buttons)
function SeqOpsTwoColumn({ steps, ops, color }) {
  const [pressed, setPressed] = useState({});
  const handleOp = (opId) => {
    setPressed((p) => ({ ...p, [opId]: { at: new Date(), state: 'done' } }));
  };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14,
    }}>
      {/* LEFT · SEQUENCE */}
      <div style={{
        background: '#fff', border: '2px solid #cbd5e1', borderTop: `5px solid ${color}`,
        borderRadius: 8, padding: 14,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color, marginBottom: 10,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          ☰ Sequence ({steps.length} steps)
        </div>
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {steps.map((s, i) => {
            const tone = cardListTone(i);
            return (
              <li key={i} style={{
                position: 'relative',
                marginBottom: 6, padding: '10px 12px',
                background: tone.bg, border: `1px solid ${tone.border}`,
                borderLeft: `4px solid ${color}`, borderRadius: 6,
                fontSize: 12,
              }}>
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  fontSize: 9, color: '#94a3b8', fontFamily: 'monospace',
                }}>STEP {i + 1}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
                  {typeof s === 'object' ? (s.actor || 'Actor') : 'Actor'}
                </div>
                <div style={{ color: '#0f172a', fontWeight: 600 }}>
                  {typeof s === 'object' ? (s.step || s.label || JSON.stringify(s)) : String(s)}
                </div>
                {typeof s === 'object' && s.time_min != null && (
                  <div style={{ marginTop: 3, fontSize: 10, color: '#64748b' }}>
                    ⏱ {s.time_min} min
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* RIGHT · OPERATIONS */}
      <div style={{
        background: '#fff', border: '2px solid #cbd5e1', borderTop: '5px solid #16a34a',
        borderRadius: 8, padding: 14,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: '#16a34a', marginBottom: 10,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          ⚡ Operations ({ops.length} available)
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {ops.map((o, i) => {
            const tone = cardListTone(i);
            const opId = typeof o === 'object' ? (o.id || o.label || `op${i}`) : `op${i}`;
            const opLabel = typeof o === 'object' ? (o.label || o.id || 'Op') : String(o);
            const opIcon = typeof o === 'object' ? (o.icon || '•') : '•';
            const opDesc = typeof o === 'object' ? o.desc : null;
            const isPressed = !!pressed[opId];
            return (
              <button key={opId} type="button"
                onClick={(e) => { e.stopPropagation(); handleOp(opId); }}
                style={{
                  textAlign: 'left', padding: '8px 10px',
                  background: isPressed ? '#dcfce7' : tone.bg,
                  border: `1px solid ${isPressed ? '#16a34a' : tone.border}`,
                  borderLeft: `4px solid ${isPressed ? '#16a34a' : '#475569'}`,
                  borderRadius: 6, fontSize: 12, cursor: 'pointer', font: 'inherit',
                  transition: 'background 0.12s',
                }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: opDesc ? 3 : 0,
                }}>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>
                    {opIcon} {opLabel}
                  </span>
                  {isPressed && (
                    <span style={{
                      padding: '1px 6px', borderRadius: 3, background: '#16a34a',
                      color: '#fff', fontSize: 9, fontWeight: 700,
                    }}>✓ DONE</span>
                  )}
                </div>
                {opDesc && (
                  <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.35 }}>
                    {opDesc}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Variant 2 · split canvas with center divider · same data, different chrome
function SeqOpsSplitCanvas({ steps, ops, color }) {
  return (
    <div style={{
      position: 'relative',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 16,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 2px 1fr', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 10 }}>
            🧭 SEQUENCE (the path)
          </div>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '1px dashed #cbd5e1',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: '50%',
                background: color, color: '#fff', fontSize: 11, fontWeight: 800,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: '#0f172a' }}>
                {typeof s === 'object' ? s.step : String(s)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: '#cbd5e1' }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', marginBottom: 10 }}>
            🧰 OPERATIONS (the tools)
          </div>
          {ops.map((o, i) => (
            <div key={i} style={{
              padding: '6px 0', borderBottom: '1px dashed #cbd5e1',
              fontSize: 12, color: '#0f172a',
            }}>
              {typeof o === 'object' ? `${o.icon || '•'} ${o.label}` : String(o)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Variant 3 · side-by-side compare with summary
function SeqOpsCompare({ steps, ops, color }) {
  return (
    <div>
      <div style={{
        marginBottom: 12, padding: 10,
        background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 6,
        fontSize: 12, color: '#0f172a',
      }}>
        <strong>Compare:</strong> {steps.length} sequence steps vs {ops.length} operations.
        Each step may invoke 1+ operations. Use this to spot ops without a corresponding
        step (orphans) and steps without ops (manual-only stages).
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
      }}>
        <div style={{
          background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: 12,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color, marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Sequence · {steps.length}</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#0f172a' }}>
            {steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 5 }}>
                <strong>{typeof s === 'object' ? s.actor : ''}:</strong>{' '}
                {typeof s === 'object' ? s.step : String(s)}
              </li>
            ))}
          </ol>
        </div>
        <div style={{
          background: '#fff', border: '2px solid #16a34a', borderRadius: 8, padding: 12,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Operations · {ops.length}</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#0f172a' }}>
            {ops.map((o, i) => (
              <li key={i} style={{ marginBottom: 5 }}>
                {typeof o === 'object' ? `${o.icon || '•'} ${o.label}` : String(o)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryAndOutcomeRow({ tab, sub, proc }) {
  const summary = read(proc,
    'readme.executive_summary', 'demo_story.pitch', 'manual_process.summary');
  const outcome = read(proc,
    'smart_kpi.relevant', 'output.artifacts', 'demo_story.scenario');
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8,
    }}>
      <Slot label="📝 Summary note" value={summary} bindPath="proc.readme.executive_summary" accent="#0891b2" />
      <Slot label="🏆 Outcome"      value={outcome} bindPath="proc.smart_kpi.relevant" accent="#16a34a" />
    </div>
  );
}

// TechnicalRiskBrief — operator 2026-06-13 13:42 MDT: "fix all these · quality
// is very poor · need more number of technical graph, flow, challenges,
// strategy, edge case, error handling, scalability, performance, error which
// can come in error log .. how to handle them, error which will not come in
// error log what to implement, daily issue, weekly rated issue, monthly rated
// issue, user mistake, architect mistake" + "tester plan, positive, negative,
// api, data, model, accuracy" + "security testing" + "admin testing, mlops
// testing".
//
// 8 visually-distinct panels with DIFFERENT shapes (not 8 spec-cards). Per
// §57.7 honest + "no creative" feedback: each panel uses its own layout,
// color scheme, and visual idiom. README pilot rendered with substantive
// content from TAB_TECHNICAL_BRIEF.
//
// Composes with: §43 (drill enforces panels + content floor) · §57.7
// (honest substance · NO placeholder content) · §73 (per-tab differentiation)
// · §93 (errors+cadence ARE the operational IPO) · §117 (every panel
// surfaces concerns a CHECKER agent monitors) · §122 (creative ≠ catalog).
function TechnicalRiskBrief({ tab, proc }) {
  const brief = TAB_TECHNICAL_BRIEF[tab.id];
  if (!brief) {
    return (
      <div style={{
        padding: 14, background: '#fef3c7',
        border: '1px solid #fcd34d', borderLeft: '5px solid #f59e0b',
        borderRadius: 6, fontSize: 12, color: '#78350f',
      }}>
        ⚠ <strong>No technical brief registered for <code>{tab.id}</code></strong>.
        Adding one to <code>tab-technical-brief.js</code> populates: diagrams ·
        challenges/strategy · edge cases · scale+perf · errors (logged vs silent)
        · issue cadence (daily/weekly/monthly) · mistakes (user vs architect)
        · 9-category testing plan. Owner: <strong>sys_tab_monitor_agent</strong>.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Panel 1 · Diagrams (mermaid blocks · code-editor feel) */}
      <Panel title="Technical diagrams" accent="#7c3aed" icon="📐"
             tagline={`${brief.diagrams.length} diagrams · architecture / sequence / C4`}>
        <div style={{ display: 'grid', gap: 10 }}>
          {brief.diagrams.map((d, i) => (
            <div key={i} style={{
              padding: 12,
              background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 6 }}>
                📐 {d.title}
              </div>
              <pre style={{
                margin: 0, padding: 10,
                background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 4,
                fontFamily: 'monospace', fontSize: 10, color: '#0f172a',
                whiteSpace: 'pre-wrap', overflowX: 'auto',
              }}>{d.mermaid}</pre>
              <div style={{ marginTop: 6, fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
                <strong>Why it matters:</strong> {d.whyItMatters}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 2 · Challenges + Strategy (2-column compare) */}
      <Panel title="Challenges + strategy" accent="#dc2626" icon="⚠"
             tagline={`${brief.challengesStrategy.length} pairs · pre-named mitigations`}>
        <div style={{ display: 'grid', gap: 8 }}>
          {brief.challengesStrategy.map((c, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
              border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden',
            }}>
              <div style={{
                padding: 10, background: '#fee2e2', borderRight: '1px solid #cbd5e1',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>
                  ⚠ CHALLENGE
                </div>
                <div style={{ fontSize: 11, color: '#0f172a' }}>{c.challenge}</div>
                <div style={{ marginTop: 6, fontSize: 9, color: '#7f1d1d', fontStyle: 'italic' }}>
                  Impact: {c.impact}
                </div>
              </div>
              <div style={{ padding: 10, background: '#dbeafe' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>
                  💡 STRATEGY
                </div>
                <div style={{ fontSize: 11, color: '#0f172a' }}>{c.strategy}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 3 · Edge cases (yellow alert grid) */}
      <Panel title="Edge cases + handling" accent="#f59e0b" icon="🔍"
             tagline={`${brief.edgeCases.length} cases · failure-mode catalogue`}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8,
        }}>
          {brief.edgeCases.map((e, i) => (
            <div key={i} style={{
              padding: 10, background: '#fef3c7',
              border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b', borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>
                🔍 Case {i + 1}
              </div>
              <div style={{ fontSize: 11, color: '#0f172a', marginBottom: 6, fontWeight: 600 }}>
                {e.case}
              </div>
              <div style={{ fontSize: 10, color: '#78350f' }}>
                <strong>Handling:</strong> {e.handling}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 4 · Scalability + Performance (4-tile gauge) */}
      <Panel title="Scalability + performance" accent="#0891b2" icon="📊"
             tagline={`${brief.scalePerf.length} metrics · target vs actual`}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8,
        }}>
          {brief.scalePerf.map((m, i) => (
            <div key={i} style={{
              padding: 12, textAlign: 'center',
              background: m.status === 'ok' ? '#dcfce7' : m.status === 'warn' ? '#fef3c7' : '#fee2e2',
              border: `2px solid ${m.status === 'ok' ? '#16a34a' : m.status === 'warn' ? '#f59e0b' : '#dc2626'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                {m.metric}
              </div>
              <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 800, marginBottom: 4 }}>
                {m.actual}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                target: <strong>{m.target}</strong>
              </div>
              <div style={{
                marginTop: 6,
                fontSize: 9, fontWeight: 800,
                color: m.status === 'ok' ? '#16a34a' : m.status === 'warn' ? '#f59e0b' : '#dc2626',
              }}>
                {m.status === 'ok' ? '✓ OK' : m.status === 'warn' ? '⚠ WARN' : '✗ FAIL'}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 5 · Errors LOGGED (red header table) */}
      <Panel title="Errors that REACH the error log" accent="#dc2626" icon="📜"
             tagline={`${brief.errorsLogged.length} known · per-error handling rules`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fee2e2' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#dc2626', fontWeight: 800, borderBottom: '2px solid #dc2626' }}>Error</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#dc2626', fontWeight: 800, borderBottom: '2px solid #dc2626' }}>How to handle</th>
            </tr>
          </thead>
          <tbody>
            {brief.errorsLogged.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>{e.error}</td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{e.handling}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Panel 5b · Errors SILENT (purple header table) */}
      <Panel title="Errors that NEVER reach the error log" accent="#7c3aed" icon="👻"
             tagline={`${brief.errorsSilent.length} silent · what to implement to surface them`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#ede9fe' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#7c3aed', fontWeight: 800, borderBottom: '2px solid #7c3aed' }}>Silent error</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#7c3aed', fontWeight: 800, borderBottom: '2px solid #7c3aed' }}>What to implement</th>
            </tr>
          </thead>
          <tbody>
            {brief.errorsSilent.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ede9fe' }}>
                <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>{e.error}</td>
                <td style={{ padding: '8px 10px', color: '#475569' }}>{e.implementWhat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Panel 6 · Issue cadence (3-column timeline) */}
      <Panel title="Issue cadence" accent="#0891b2" icon="📅"
             tagline="daily · weekly · monthly catalogue with on-call action">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10,
        }}>
          {[
            { key: 'daily',   label: 'DAILY',   color: '#f59e0b', items: brief.issueCadence.daily   },
            { key: 'weekly',  label: 'WEEKLY',  color: '#0891b2', items: brief.issueCadence.weekly  },
            { key: 'monthly', label: 'MONTHLY', color: '#7c3aed', items: brief.issueCadence.monthly },
          ].map((col) => (
            <div key={col.key} style={{
              padding: 10,
              background: '#fff', border: `2px solid ${col.color}`,
              borderTop: `5px solid ${col.color}`, borderRadius: 6,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: col.color, marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center',
              }}>
                {col.label} · {col.items.length}
              </div>
              {col.items.map((it, i) => (
                <div key={i} style={{
                  marginBottom: 8, paddingBottom: 8,
                  borderBottom: i < col.items.length - 1 ? '1px dashed #cbd5e1' : 'none',
                }}>
                  <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600, marginBottom: 3 }}>
                    {it.issue}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569' }}>
                    <strong>Action:</strong> {it.action}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 7 · Mistakes (user vs architect split) */}
      <Panel title="Mistakes catalogue" accent="#0891b2" icon="🚫"
             tagline={`${brief.mistakesUser.length} user · ${brief.mistakesArchitect.length} architect · each with prevention`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{
              padding: '6px 10px', background: '#fee2e2', borderRadius: 4,
              fontSize: 10, fontWeight: 800, color: '#dc2626', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>👤 User mistakes ({brief.mistakesUser.length})</div>
            {brief.mistakesUser.map((m, i) => (
              <div key={i} style={{
                marginBottom: 6, padding: 8,
                background: '#fff', border: '1px solid #fca5a5', borderLeft: '3px solid #dc2626', borderRadius: 4,
              }}>
                <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600, marginBottom: 3 }}>{m.mistake}</div>
                <div style={{ fontSize: 10, color: '#475569' }}><strong>Prevent:</strong> {m.prevention}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{
              padding: '6px 10px', background: '#ede9fe', borderRadius: 4,
              fontSize: 10, fontWeight: 800, color: '#7c3aed', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>🏛 Architect mistakes ({brief.mistakesArchitect.length})</div>
            {brief.mistakesArchitect.map((m, i) => (
              <div key={i} style={{
                marginBottom: 6, padding: 8,
                background: '#fff', border: '1px solid #c4b5fd', borderLeft: '3px solid #7c3aed', borderRadius: 4,
              }}>
                <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600, marginBottom: 3 }}>{m.mistake}</div>
                <div style={{ fontSize: 10, color: '#475569' }}><strong>Prevent:</strong> {m.prevention}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Panel 8 · Testing plan (9-cell grid) */}
      <Panel title="Testing plan" accent="#16a34a" icon="🧪"
             tagline="9 categories per operator's stack: positive · negative · api · data · model · accuracy · security · admin · mlops">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10,
        }}>
          {[
            ['positive', '✅', 'Positive tests',  '#16a34a'],
            ['negative', '✗',  'Negative tests',  '#dc2626'],
            ['api',      '🔌', 'API tests',       '#0891b2'],
            ['data',     '📦', 'Data tests',      '#f59e0b'],
            ['model',    '🧠', 'Model tests',     '#7c3aed'],
            ['accuracy', '🎯', 'Accuracy tests',  '#0e7490'],
            ['security', '🛡',  'Security tests',  '#b91c1c'],
            ['admin',    '⚙',  'Admin tests',     '#475569'],
            ['mlops',    '♻',  'MLOps tests',     '#15803d'],
          ].map(([key, icon, label, color]) => {
            const items = brief.testingPlan[key] || [];
            return (
              <div key={key} style={{
                padding: 10,
                background: '#fff', border: `2px solid ${color}`, borderTop: `5px solid ${color}`,
                borderRadius: 6,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color, marginBottom: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{icon} {label}</span>
                  <span style={{
                    padding: '1px 6px', background: color, color: '#fff',
                    borderRadius: 3, fontSize: 9,
                  }}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                    None registered. Add to brief.testingPlan.{key}[].
                  </div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {items.map((t, i) => (
                      <li key={i} style={{ fontSize: 10, color: '#0f172a', marginBottom: 3, lineHeight: 1.35 }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Footer · agent attribution */}
      <div style={{
        padding: '8px 12px', background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 4,
        fontSize: 10, color: '#475569', fontStyle: 'italic',
      }}>
        Owned by <strong>sys_tab_monitor_agent</strong> (AGENT_ROSTER §11) ·
        catalog at <code>tab-technical-brief.js</code> · per §57.7 honest:
        empty panels render a "what to implement" badge instead of fake content.
      </div>
    </div>
  );
}

// Small helper · panel wrapper with consistent header but unique inner shape
function Panel({ title, accent, icon, tagline, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderTop: `4px solid ${accent}`,
      borderRadius: 8, padding: 14,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: accent,
          letterSpacing: '-0.01em',
        }}>
          {icon} {title}
        </div>
        {tagline && (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
            {tagline}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// TopBriefStrip — operator 2026-06-13 13:40-13:53 MDT (12-message stack):
//   "create core objective on top, to do list on top ...which must be align
//    with tab or sub tab" + "every tab must have one agent which is monitoing"
//   + "1-2 line text explain the objective" + "goal" + "to do list"
//   + "they must be align Main menu department and sub menu AI type, process type"
//   + "must on top"
//
// Consolidates 4 surfaces into ONE strip at the very top of every tab:
//   1. Context path: dept (Main Menu) › process › tab › sub (Sub Menu)
//   2. 1-line OBJECTIVE (from TAB_PROFILES.intent)
//   3. 1-2 line GOAL (from TAB_CHARTER.why · trimmed)
//   4. Top-3 to-do (from TAB_OBJECTIVE_EVIDENCE pending+failing)
//   5. Monitor agent attribution + score band (sys_tab_monitor_agent)
//
// Composes with: §57.7 (honest · pulls from existing catalogs, doesn't fabricate)
// · §73 (17-tab pane · this is the alignment piece) · §82 #14 (objectives ARE
// hypotheses · top-3 todo is the "what to falsify next") · §117 (CHECKER role
// for monitor agent) · §122 (top-1% means alignment at top, not buried 6 widgets
// deep) · §138 (operator-handling · 12 stacked messages mapped 1:1).
function TopBriefStrip({ tab, sub, proc, dept }) {
  const profile = TAB_PROFILES[tab.id];
  const charter = TAB_CHARTER[tab.id];
  const score = scoreTab(tab.id, proc);
  const objective = profile?.intent || 'Operator-pending · objective not yet defined for this tab';
  const goalRaw = charter?.why || 'Goal pending TAB_CHARTER entry';
  const goal = goalRaw.length > 200 ? goalRaw.slice(0, 197) + '…' : goalRaw;
  const todos = (score.results || [])
    .filter((r) => r.status === 'failing' || r.status === 'pending')
    .slice(0, 3);
  const bandColor =
    score.band === 'failing'  ? '#dc2626' :
    score.band === 'top-1pct' ? '#16a34a' :
    score.band === 'ok'       ? '#0891b2' :
    score.band === 'needs-work' ? '#f59e0b' : '#94a3b8';
  const bandLabel =
    score.band === 'failing'  ? 'FAILING' :
    score.band === 'top-1pct' ? 'TOP-1%' :
    score.band === 'ok'       ? 'OK' :
    score.band === 'needs-work' ? 'NEEDS WORK' : 'NO RULES';
  return (
    <div style={{
      marginBottom: 12, padding: 14,
      background: 'linear-gradient(135deg, #fff 0%, #f0f9ff 100%)',
      border: `2px solid ${tab.color}`,
      borderLeft: `6px solid ${tab.color}`,
      borderRadius: 8,
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
    }}>
      {/* Row 1 · Context path (dept › process › tab › sub) + monitor agent */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, marginBottom: 10,
        paddingBottom: 8, borderBottom: '1px dashed #cbd5e1',
      }}>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
          <span style={{ color: '#94a3b8' }}>Main menu:</span>{' '}
          <strong style={{ color: '#0f172a' }}>{dept?.name || '—'}</strong>
          <span style={{ color: '#cbd5e1', margin: '0 6px' }}>›</span>
          <strong style={{ color: '#0f172a' }}>{proc?.name || '—'}</strong>
          <span style={{ color: '#cbd5e1', margin: '0 6px' }}>›</span>
          <span style={{ color: '#94a3b8' }}>Tab:</span>{' '}
          <strong style={{ color: tab.color }}>{tab.label}</strong>
          {sub && (
            <>
              <span style={{ color: '#cbd5e1', margin: '0 6px' }}>›</span>
              <span style={{ color: '#94a3b8' }}>Sub:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{sub.label}</strong>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
          <span style={{
            padding: '2px 6px', borderRadius: 3,
            background: '#f1f5f9', color: '#0f172a', fontWeight: 700,
            border: '1px solid #cbd5e1',
          }}>👁 sys_tab_monitor_agent</span>
          <span style={{
            padding: '2px 8px', borderRadius: 3,
            background: bandColor, color: '#fff', fontWeight: 800, letterSpacing: '0.04em',
          }}>{bandLabel}</span>
          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
            {score.verified}✓ · {score.pending}🟡 · {score.failing}✗
          </span>
        </div>
      </div>

      {/* Row 2 · OBJECTIVE (1-line · prominent) */}
      <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 3,
          background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 8,
        }}>🎯 Objective</span>
        <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{objective}</span>
      </div>

      {/* Row 3 · GOAL (1-2 lines · trimmed) */}
      <div style={{ marginBottom: 10, lineHeight: 1.4 }}>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 3,
          background: '#0891b2', color: '#fff', fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 8,
        }}>📌 Goal</span>
        <span style={{ fontSize: 12, color: '#334155' }}>{goal}</span>
      </div>

      {/* Row 4 · Top 3 TO-DO (from evidence pending+failing) */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 800, color: '#0f172a',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
        }}>
          ✅ Top to-do {todos.length > 0 ? `(${todos.length} of ${score.pending + score.failing} open)` : '· nothing pending'}
        </div>
        {todos.length === 0 ? (
          <div style={{ fontSize: 11, color: '#16a34a', fontStyle: 'italic' }}>
            ✨ All evidence rules verified. Nothing to do on this tab.
          </div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            {todos.map((t, i) => (
              <li key={i} style={{ marginBottom: 4, fontSize: 11, color: '#0f172a' }}>
                <span style={{
                  display: 'inline-block', minWidth: 14, color:
                  t.status === 'failing' ? '#dc2626' : '#f59e0b',
                  fontWeight: 800,
                }}>{t.status === 'failing' ? '✗' : '🟡'}</span>
                <strong>{t.label}</strong>
                <span style={{ color: '#64748b', fontSize: 10 }}> — {t.evidence}</span>
              </li>
            ))}
          </ol>
        )}
        <div style={{
          marginTop: 6, fontSize: 9, color: '#64748b', fontStyle: 'italic',
        }}>
          Owned by <strong>sys_tab_monitor_agent</strong> (AGENT_ROSTER §11) · full scorecard
          below in "Final outcome score" section.
        </div>
      </div>
    </div>
  );
}

// TabOutcomeScorecard — operator 2026-06-13 11:42 MDT: "fix all ..have agent
// assign for this task" + "100% ..top 1". The §57.7 honest evaluator: per-tab
// score from TAB_OBJECTIVE_EVIDENCE rules. Rules that need operator confirms
// render as 🟡 pending (HITL · §103.5) — NEVER fake-✓. Auto-checkable rules
// resolve against proc.* paths.
// Owned by: sys_tab_outcome_scoring_agent (see docs/AGENT_ROSTER.md §7).
function TabOutcomeScorecard({ tab, proc }) {
  const score = scoreTab(tab.id, proc);
  if (!score.total) {
    return (
      <div style={{
        padding: 10, background: '#fef3c7',
        border: '1px solid #fcd34d', borderRadius: 6, fontSize: 11, color: '#78350f',
      }}>
        ⚠ No evidence rules registered for <code>{tab.id}</code> in TAB_OBJECTIVE_EVIDENCE.
        Owner: <strong>sys_tab_outcome_scoring_agent</strong>.
      </div>
    );
  }
  const bandColor =
    score.band === 'failing'   ? '#dc2626' :
    score.band === 'top-1pct'  ? '#16a34a' :
    score.band === 'ok'        ? '#0891b2' : '#f59e0b';
  const bandLabel =
    score.band === 'failing'   ? 'FAILING · close ✗ rules first' :
    score.band === 'top-1pct'  ? 'TOP-1% · ≥80% verified' :
    score.band === 'ok'        ? 'OK · 60-79% verified' : 'NEEDS WORK · <60% verified';

  return (
    <div>
      {/* Aggregate band header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        marginBottom: 10, padding: '10px 12px',
        background: '#fff', border: `2px solid ${bandColor}`,
        borderLeft: `6px solid ${bandColor}`, borderRadius: 6,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: bandColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🏁 Final outcome score
          </div>
          <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2 }}>
            <strong>{score.verified}/{score.total}</strong> verified · {score.pending} pending · {score.failing} failing
            {' '}<span style={{ color: '#64748b' }}>({score.pct}%)</span>
          </div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 999, background: bandColor, color: '#fff',
          fontSize: 11, fontWeight: 900, letterSpacing: '0.05em',
        }}>
          {bandLabel}
        </span>
      </div>

      {/* Per-objective rows */}
      <div style={{ display: 'grid', gap: 4 }}>
        {score.results.map((r, idx) => {
          const tone = cardListTone(idx);
          const statusColor =
            r.status === 'verified' ? '#16a34a' :
            r.status === 'failing'  ? '#dc2626' :
            r.status === 'pending'  ? '#f59e0b' : '#64748b';
          const statusIcon =
            r.status === 'verified' ? '✓' :
            r.status === 'failing'  ? '✗' :
            r.status === 'pending'  ? '🟡' : '?';
          const statusLabel =
            r.status === 'verified' ? 'verified' :
            r.status === 'failing'  ? 'failing' :
            r.status === 'pending'  ? 'pending'  : 'unknown';
          return (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '34px minmax(0, 1fr) minmax(180px, auto)',
              gap: 10, alignItems: 'center',
              padding: '8px 10px',
              background: tone.bg, border: `1px solid ${tone.border}`,
              borderLeft: `3px solid ${statusColor}`,
              borderRadius: 4,
              fontSize: 12,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: '50%',
                background: statusColor, color: '#fff', fontWeight: 800, fontSize: 13,
              }}>{statusIcon}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{r.evidence}</div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 3, background: statusColor, color: '#fff',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                justifySelf: 'end',
              }}>{statusLabel}</span>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 8, padding: '6px 10px',
        background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 4,
        fontSize: 10, color: '#475569', fontStyle: 'italic',
      }}>
        Owned by <strong>sys_tab_outcome_scoring_agent</strong> · evidence rules in
        <code> tab-objective-evidence.js</code> · drill locks 100% coverage ·
        🟡 pending rules wait for HITL operator confirmation (§103.5).
      </div>
    </div>
  );
}

// Button-press status panel — operator 2026-06-05: "what is happen each
// button press .. must be clear as well". Every clickable action surfaces
// here with lifecycle: pressed → processing → done.
function ActionStatusPanel({ log, color }) {
  if (!log || log.length === 0) {
    return (
      <div style={{
        padding: 10, background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 6,
        fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center',
      }}>
        No button presses yet. Click any action (Export PDF, run, etc.) — status appears here.
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr>
          {['#', 'Action', 'Status', 'Time'].map((h) => (
            <th key={h} style={{
              padding: '6px 8px', textAlign: 'left',
              background: `${color}11`, color, fontWeight: 700,
              borderBottom: `1px solid ${color}33`,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {log.map((e, i) => (
          <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{log.length - i}</td>
            <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 600 }}>{e.label}</td>
            <td style={{ padding: '6px 8px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 3,
                background:
                  e.state === 'done' ? '#16a34a' :
                  e.state === 'processing' ? '#f59e0b' :
                  e.state === 'error' ? '#dc2626' : '#94a3b8',
                color: '#fff', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {e.state === 'done' && '✓ '}
                {e.state === 'processing' && '⏱ '}
                {e.state === 'error' && '✗ '}
                {e.state === 'done' ? 'Process over' : e.state}
              </span>
            </td>
            <td style={{ padding: '6px 8px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>
              {e.at.toLocaleTimeString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Metadata footer — User Stamp · Date/Time · Version · Export
// Export buttons now wire through the button-press log so operator sees status.
function TabMetadataFooter({ tab, sub, proc, onAction }) {
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0', borderRadius: 6,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      fontSize: 10, color: '#64748b',
    }}>
      <span><strong style={{ color: '#475569' }}>👤 User:</strong> {read(proc, 'last_editor') || 'unknown'}</span>
      <span style={{ color: '#cbd5e1' }}>·</span>
      <span><strong style={{ color: '#475569' }}>⏱ Time:</strong> {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
      <span style={{ color: '#cbd5e1' }}>·</span>
      <span><strong style={{ color: '#475569' }}>📦 Version:</strong> {read(proc, 'version') || 'v1'}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        {['PDF', 'PNG', 'CSV', 'Word', 'JSON'].map((fmt) => (
          <button key={fmt} type="button"
            onClick={() => onAction && onAction(`Export ${fmt} — ${tab.label}${sub ? `:${sub.label}` : ''}`)}
            style={{
              minHeight: 30,
              padding: '6px 10px', fontSize: 11,
              background: '#fff', color: tab.color,
              border: `1px solid ${tab.color}55`, borderRadius: 3,
              cursor: 'pointer', fontWeight: 600,
            }}>Export {fmt}</button>
        ))}
      </span>
    </div>
  );
}

// Navigation flow — operator 2026-06-05 "navigation flow ..."
// Shows current tab position + prev/next chrome at top of body.
// AI Type Catalog — operator 2026-06-05: "AI Type catalog all the component
// ... click of them what should happen". Surfaces every proc.ai[] entry as
// a clickable card that documents its on-click behavior and pushes
// ?focus=ai:<type> into the URL so the workspace re-frames around it.

function textIncludes(value, pattern) {
  return String(value || '').toLowerCase().includes(pattern);
}

function aiTypeTemplate(aiType) {
  const name = String(aiType || 'AI Type');
  const lower = name.toLowerCase();
  if (lower.includes('conversation') || lower.includes('conversational') || lower.includes('voice')) {
    return {
      family: 'Conversation task AI',
      primaryOperation: 'Conversation tasks only: intake, intent routing, answer drafting, handoff, transcript summary.',
      outOfScope: 'Pricing, underwriting decisions, autonomous approvals, and non-conversation analytics without a separate primary AI type.',
      stakeholders: ['Customer/user', 'Contact center owner', 'Conversation designer', 'Compliance reviewer'],
      operations: ['Capture utterance', 'Classify intent', 'Retrieve approved answer', 'Draft response', 'Escalate to human', 'Summarize conversation'],
      qualityChecks: ['Intent accuracy', 'Response grounding', 'Toxicity/safety check', 'Handoff success', 'Transcript audit'],
    };
  }
  if (lower.includes('segmentation') || lower.includes('personalization')) {
    return {
      family: 'Segmentation AI',
      primaryOperation: 'Segment users/accounts and route the segment to offers, service journeys, or risk workflows.',
      outOfScope: 'Final decisions without decision AI, direct outreach without campaign approval, and sensitive segmentation without RAI review.',
      stakeholders: ['Business owner', 'Data scientist', 'Marketing/service owner', 'Responsible AI reviewer'],
      operations: ['Define segment goal', 'Select features', 'Train/score segment', 'Validate drift/bias', 'Publish segment', 'Monitor lift'],
      qualityChecks: ['Segment stability', 'Lift/ROI', 'Fairness parity', 'Data freshness', 'Explainability review'],
    };
  }
  if (lower.includes('decision') || lower.includes('risk') || lower.includes('fraud') || lower.includes('underwriting')) {
    return {
      family: 'Decision / risk AI',
      primaryOperation: 'Score, recommend, and route decisions with confidence bands and human approval boundaries.',
      outOfScope: 'Unapproved autonomous decisions and policy exceptions without governance sign-off.',
      stakeholders: ['Decision owner', 'Risk office', 'Model owner', 'Compliance reviewer'],
      operations: ['Score input', 'Apply policy rules', 'Set confidence tier', 'Route decision', 'Capture override', 'Monitor outcome'],
      qualityChecks: ['Accuracy/AUC/F1', 'Calibration', 'Override rate', 'Fairness gate', 'Policy audit'],
    };
  }
  if (lower.includes('document') || lower.includes('ocr') || lower.includes('nlp') || lower.includes('rag') || lower.includes('knowledge')) {
    return {
      family: 'Knowledge / document AI',
      primaryOperation: 'Extract, retrieve, cite, and summarize governed knowledge or document content.',
      outOfScope: 'Decision approval without decision AI and unsupported claims without citation evidence.',
      stakeholders: ['Knowledge owner', 'Data/document owner', 'Legal/compliance', 'Model owner'],
      operations: ['Ingest document', 'Extract entities', 'Retrieve context', 'Generate answer', 'Attach citations', 'Review exceptions'],
      qualityChecks: ['Extraction accuracy', 'Citation coverage', 'Hallucination check', 'PII redaction', 'Retrieval quality'],
    };
  }
  return {
    family: 'General AI capability',
    primaryOperation: 'Define the process-specific input, pipeline, output, controls, and monitoring before promotion.',
    outOfScope: 'Generic AI usage without owner, required tabs, quality gates, and testing evidence.',
    stakeholders: ['Business owner', 'Product owner', 'Data owner', 'Model owner', 'AI governance reviewer'],
    operations: ['Define problem', 'Map AS-IS/TO-BE', 'Validate data', 'Run pipeline', 'Evaluate output', 'Monitor controls'],
    qualityChecks: ['Data quality', 'Model accuracy', 'Responsible AI', 'Explainability', 'Performance/load'],
  };
}

function classifyAiEntry(proc, aiType) {
  const aiList = Array.isArray(proc?.ai) ? proc.ai : [];
  const index = aiList.findIndex((item) => (item.ai_type || item.name) === aiType);
  if (index === 0) return 'Primary AI Type';
  if (index === 1) return 'Secondary AI Type';
  if (index >= 2) return 'Third / Support AI Type';
  return 'Unmapped AI Type';
}

function AiTypeValidationPanel({ proc, focusKind, focusLabel }) {
  const aiList = Array.isArray(proc?.ai) ? proc.ai : [];
  const selected = focusKind === 'ai' && focusLabel
    ? focusLabel
    : (aiList[0]?.ai_type || aiList[0]?.name || 'Select an AI type');
  const template = aiTypeTemplate(selected);
  const segment = classifyAiEntry(proc, selected);
  const requiredTabs = [
    'Problem / AS-IS', 'TO-BE', 'Data', 'Manual user process', 'Automatic pipeline',
    'AI', 'Model', 'Accuracy', 'Responsible AI', 'Explainable AI', 'AI Control Tower',
    'AI Governance', 'Testing: API/Data/Model/Load/Performance/Scale', 'Reports',
  ];
  const validationRows = [
    ['Assigned owner', 'AI validation lead + product owner'],
    ['Review job', 'Validate plan, required tabs, operation scope, risks, and feedback before build/run'],
    ['Primary fit', `${segment} / ${template.family}`],
    ['Operation boundary', template.primaryOperation],
    ['Not allowed', template.outOfScope],
  ];
  return (
    <div style={{
      border: '1px solid #c4b5fd',
      background: '#faf5ff',
      borderRadius: 8,
      padding: 14,
      marginTop: 12,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 8px', borderRadius: 999,
          background: '#8b5cf6', color: '#fff',
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
        }}>{segment}</span>
        <strong style={{ color: '#4c1d95' }}>{selected}</strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>AI type validation, plan, review, feedback, and quality gate</span>
      </div>
      {/* OP-5 (2026-06-13): 4 sibling cards in same grid · use cardListTone(0..3)
          for per-card light differentiation. Brand border (#e9d5ff) preserved. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <div style={{ background: cardListTone(0).bg, border: '1px solid #e9d5ff', borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Validation rows</div>
          {validationRows.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 8, fontSize: 12, padding: '4px 0', borderTop: '1px solid #f3e8ff' }}>
              <strong style={{ color: '#64748b' }}>{label}</strong>
              <span style={{ color: '#1f2937' }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: cardListTone(1).bg, border: '1px solid #e9d5ff', borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Stakeholders</div>
          {template.stakeholders.map((item) => <div key={item} style={{ fontSize: 12, padding: '3px 0', color: '#334155' }}>- {item}</div>)}
        </div>
        <div style={{ background: cardListTone(2).bg, border: '1px solid #e9d5ff', borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Operations in this AI type</div>
          {template.operations.map((item) => <div key={item} style={{ fontSize: 12, padding: '3px 0', color: '#334155' }}>- {item}</div>)}
        </div>
        <div style={{ background: cardListTone(3).bg, border: '1px solid #e9d5ff', borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Quality / verification checks</div>
          {template.qualityChecks.map((item) => <div key={item} style={{ fontSize: 12, padding: '3px 0', color: '#334155' }}>- {item}</div>)}
        </div>
      </div>
      <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 6, padding: 10 }}>
        <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Required workspace tabs / templates</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {requiredTabs.map((tab) => (
            <span key={tab} style={{ padding: '4px 7px', borderRadius: 999, background: '#f3e8ff', color: '#581c87', fontSize: 11, fontWeight: 700 }}>
              {tab}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiTypeCatalog({ proc, dept, focusKind, focusLabel, onFocus }) {
  const aiList = Array.isArray(proc?.ai) ? proc.ai : [];
  if (aiList.length === 0) {
    return (
      <div style={{
        padding: 14, background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 6,
        fontSize: 12, color: '#64748b', fontStyle: 'italic', textAlign: 'center',
      }}>
        No AI types declared on this process. Wire to <code>proc.ai[]</code>.
      </div>
    );
  }
  return (
    <div>
      <div style={{
        marginBottom: 10, padding: '8px 12px',
        background: '#8b5cf611', border: '1px solid #8b5cf655',
        borderRadius: 6, fontSize: 11, color: '#0f172a',
      }}>
        <strong>🤖 {aiList.length} AI types</strong> declared for{' '}
        <strong>{proc?.name || '—'}</strong>. Click any card to focus the
        workspace on that AI type — the URL updates to <code>?focus=ai:&lt;name&gt;</code>,
        the AI tab becomes the lens, and Model · Data · Accuracy slots
        re-bind to the selected AI's blueprint entry.
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8,
      }}>
        {aiList.map((ai, idx) => {
          const aiType = ai.ai_type || ai.name || '—';
          const isActive = focusKind === 'ai' && focusLabel === aiType;
          const detailRows = Object.entries(ai)
            .filter(([k, v]) => k !== 'ai_type' && k !== 'name' && v != null && v !== '');
          const tone = cardListTone(idx);
          return (
            <button
              key={aiType}
              type="button"
              onClick={() => onFocus(isActive ? null : aiType)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(139,92,246,0.10)'; }}
              style={{
                textAlign: 'left',
                padding: 12,
                background: isActive ? '#8b5cf6' : tone.bg,
                color: isActive ? '#1d4ed8' : '#0f172a',
                border: `2px solid ${isActive ? '#7c3aed' : '#8b5cf655'}`,
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(139,92,246,0.10)',
                transition: 'box-shadow 0.15s',
                font: 'inherit',
              }}
            >
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: isActive ? 'rgba(255,255,255,0.85)' : '#8b5cf6',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>🤖 AI TYPE</span>
                {isActive && <span style={{ color: '#fff' }}>● Active focus</span>}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: isActive ? '#1d4ed8' : '#0f172a',
                marginBottom: 8,
              }}>{aiType}</div>
              {detailRows.length > 0 && (
                <div style={{
                  marginBottom: 8, fontSize: 11,
                  color: isActive ? 'rgba(255,255,255,0.92)' : '#475569',
                  lineHeight: 1.5,
                }}>
                  {detailRows.slice(0, 2).map(([k, v]) => (
                    <div key={k}>
                      <strong style={{
                        color: isActive ? '#1d4ed8' : '#0f172a',
                        textTransform: 'capitalize',
                      }}>{k.replace(/_/g, ' ')}:</strong>{' '}
                      {renderValue(v)}
                    </div>
                  ))}
                  {detailRows.length > 2 && (
                    <div style={{
                      fontSize: 10, fontStyle: 'italic',
                      color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                      marginTop: 4,
                    }}>+ {detailRows.length - 2} more fields</div>
                  )}
                </div>
              )}
              <div style={{
                padding: '4px 8px',
                background: isActive ? 'rgba(255,255,255,0.18)' : '#8b5cf611',
                border: `1px dashed ${isActive ? 'rgba(255,255,255,0.4)' : '#8b5cf655'}`,
                borderRadius: 4,
                fontSize: 10,
                color: isActive ? '#fff' : '#7c3aed',
                fontWeight: 600,
              }}>
                {isActive
                  ? '👆 Click again to clear focus'
                  : '👆 Click to focus → opens AI tab + sets ?focus=ai:' + aiType}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Cmd+K command palette — fuzzy-jump to any tab + sub-tab.
// Operator: 22 tabs × 18 sub-tabs = 396 destinations; no search = pain.
function CommandPalette({ open, onClose, onJump }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  if (!open) return null;
  // Build the searchable destination list
  const dests = [];
  TABS.forEach((t) => {
    dests.push({ tabId: t.id, subId: null, label: t.label, hint: 'Tab', color: t.color });
    (t.subTabs || []).forEach((s) => {
      dests.push({ tabId: t.id, subId: s.id, label: `${t.label} › ${s.label}`, hint: 'Sub-tab', color: t.color });
    });
  });
  const q = query.trim().toLowerCase();
  const filtered = !q ? dests.slice(0, 50) :
    dests.filter((d) => d.label.toLowerCase().includes(q)).slice(0, 50);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(226, 232, 240, 0.78)',
        zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) {
                onJump(filtered[0].tabId, filtered[0].subId);
                onClose();
              }
            }}
            placeholder="Jump to tab or sub-tab… (type to filter, Enter to jump, Esc to close)"
            style={{
              flex: 1, fontSize: 15,
              border: 'none', outline: 'none',
              color: '#0f172a',
            }}
          />
          <span style={{
            padding: '2px 8px', borderRadius: 3,
            background: '#f1f5f9', color: '#475569',
            fontSize: 10, fontWeight: 700,
          }}>⌘ K</span>
        </div>
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No matches for "{query}"
            </div>
          ) : (
            filtered.map((d, i) => (
              <button key={`${d.tabId}:${d.subId || ''}`}
                onClick={() => { onJump(d.tabId, d.subId); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  padding: '10px 16px',
                  background: i === 0 ? `${d.color}11` : '#fff',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  fontSize: 13, color: '#0f172a',
                }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 3,
                  background: d.color, color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{d.hint === 'Tab' ? 'T' : 'S'}</span>
                <span style={{ flex: 1 }}>{d.label}</span>
                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                  {d.hint}
                </span>
              </button>
            ))
          )}
        </div>
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #e2e8f0',
          fontSize: 10, color: '#64748b',
          display: 'flex', gap: 14,
        }}>
          <span><kbd style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>↵</kbd> jump</span>
          <span><kbd style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>Esc</kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} / {dests.length}</span>
        </div>
      </div>
    </div>
  );
}

function NavigationFlow({ tab, sub, color, allTabs, onJump }) {
  const idx = allTabs.findIndex((t) => t.id === tab.id);
  const prev = idx > 0 ? allTabs[idx - 1] : null;
  const next = idx < allTabs.length - 1 ? allTabs[idx + 1] : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px', marginBottom: 10,
      background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 6,
      fontSize: 11,
    }}>
      <button type="button"
        onClick={() => prev && onJump(prev.id)}
        disabled={!prev}
        style={{
          padding: '8px 12px', fontSize: 12, fontWeight: 600,
          background: prev ? '#f8fafc' : '#f1f5f9',
          color: prev ? '#475569' : '#cbd5e1',
          border: '1px solid #e2e8f0', borderRadius: 4,
          cursor: prev ? 'pointer' : 'not-allowed',
        }}>
        ← {prev ? prev.label : 'Start'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
        <span style={{ fontSize: 10, fontWeight: 600 }}>
          Tab <strong style={{ color }}>{idx + 1}</strong> of {allTabs.length}
        </span>
        <span>·</span>
        <span style={{ color, fontWeight: 700, fontSize: 12 }}>{tab.label}</span>
        {sub && <span style={{ color: '#475569' }}>› {sub.label}</span>}
      </div>
      <button type="button"
        onClick={() => next && onJump(next.id)}
        disabled={!next}
        style={{
          padding: '8px 12px', fontSize: 12, fontWeight: 600,
          background: next ? '#f8fafc' : '#f1f5f9',
          color: next ? '#475569' : '#cbd5e1',
          border: '1px solid #e2e8f0', borderRadius: 4,
          cursor: next ? 'pointer' : 'not-allowed',
        }}>
        {next ? next.label : 'End'} →
      </button>
    </div>
  );
}

// Journey map — role · time · stamp · process flow chronological strip.
// Operator: "role, time, stamp, process flow must present on each tab —
// to understand journey map".
function JourneyMap({ tab, sub, proc, dept }) {
  const journey = read(proc, 'journey_map', 'demo_story.walkthrough', 'automatic_process.ai_workflow');
  if (Array.isArray(journey) && journey.length > 0) {
    return (
      <div style={{
        display: 'grid', gap: 0,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        {journey.slice(0, 8).map((step, i) => (
          <div key={i} style={{
            position: 'relative',
            padding: '10px 12px',
            background: i === journey.length - 1 ? `${tab.color}15` : '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: i === 0 ? `3px solid ${tab.color}` : '1px solid #e2e8f0',
            fontSize: 11,
          }}>
            <div style={{ fontSize: 9, color: tab.color, fontWeight: 700, marginBottom: 2 }}>
              STEP {i + 1}
            </div>
            <div style={{ color: '#0f172a' }}>
              {typeof step === 'object' ? renderValue(step) : String(step)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ fontSize: 11, color: '#64748b' }}>
      <div style={{ marginBottom: 6 }}>
        <strong>Role:</strong> {read(proc, 'readme.stakeholders', 'demo_story.persona') ? renderValue(read(proc, 'readme.stakeholders', 'demo_story.persona')) : '—'}
      </div>
      <div style={{ marginBottom: 6 }}>
        <strong>Stamp:</strong> {dept?.name} · {proc?.name} · {tab.label}{sub ? `:${sub.label}` : ''}
      </div>
      <div style={{ marginBottom: 6 }}>
        <strong>Time:</strong> {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
      </div>
      <div style={{
        marginTop: 8, padding: 8, background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 4,
        fontSize: 10, color: '#94a3b8', fontStyle: 'italic',
      }}>
        Process-flow walkthrough not wired. wire → proc.demo_story.walkthrough or proc.journey_map
      </div>
    </div>
  );
}

// THE FRAME — wraps every tab body. Single point of layout truth.
// Renders in order (15 sections):
//   0. NavigationFlow (prev tab | position | next tab)
//   1. TabHeaderRibbon (big identity banner)
//   2. AsIsToBeRibbon (AS-IS · TO-BE · ROI · Strategy)
//   3. IpoRibbon (Input → Process → Output)
//   4. ModelDataAccuracyStrip
//   5. Components (the sub-tab's actual body)
//   6. Journey map (role · time · stamp · process flow) — default open
//   7. Visualization — default open
//   8. Flow — default open
//   9. Summary note + Outcome — default open
//  10. Action status panel (button press feedback) — default open
//  11. To-Do List
//  12. Recommendations / Actions
//  13. Attachments / Comments (HitlFeedback)
//  14. History (TabTransactionHistory)
//  15. Audit Trail (TabDatabaseOps)
//  16. Timestamp banner
//  17. Metadata footer (Export buttons wire through ActionStatusPanel)
function TabFrame({ tab, sub, proc, dept, focusKind, focusLabel, allTabs, onJump, onFocus, children }) {
  const tabName = `${tab.id}${sub?.id ? `:${sub.id}` : ''}`;
  const profile = TAB_PROFILES[tab.id];
  // Type-aware section promotion (operator §74.6):
  //   Action tabs    → Actions section lifted ABOVE KPI+Viz
  //   Viz tabs       → Dashboard Grid emphasis already lifts viz; KPI+Viz stays
  //   Information    → standard order
  //   Decision/Mixed → standard order
  const promoteActions = profile?.type === 'action';
  // Lens-driven re-order (Mixed tabs only).
  //   engineer → AI Logic + Components promoted above Process Flow
  //   manager  → KPI+Viz + Actions promoted; Comments / Lessons sections raised
  //   business → AS-IS/TO-BE + Output + KPI promoted; technical sections demoted
  //   all      → standard canonical order (no reorder)
  const [lens] = useTabLens(tab.id);
  const isMixed = profile?.type === 'mixed';
  const lensActive = isMixed && lens !== 'all';
  // Button-press log
  const [actionLog, setActionLog] = useState([]);
  const press = (label) => {
    const id = Date.now() + Math.random();
    setActionLog((l) => [{ id, label, state: 'processing', at: new Date() }, ...l].slice(0, 8));
    // Operator 2026-06-05: capture every button click into prompt history.
    saveAction('action', label, { tab: tab.id, sub: sub?.id, proc: proc?.id });
    setTimeout(() => {
      setActionLog((l) => l.map((e) => e.id === id ? { ...e, state: 'done' } : e));
    }, 1200);
  };
  // ───────────────────────────────────────────────────────────────────
  // Canonical 14-section user-mental-flow sequence (operator 2026-06-05):
  //   1. Context (Identity Header)
  //   2. Business Objective
  //   3. AS-IS vs TO-BE
  //   4. Process Flow (Journey)
  //   5. Input  ┐
  //   6. AI Logic │ Stacked or side-by-side per breakpoint
  //   7. Output ┘
  //   8. KPI / Success Metrics + Visualization
  //   9. Operational Components (sub-tab body)
  //  10. Actions (documented buttons + button-press log)
  //  11. To-Do
  //  12. Feedback & Improvement
  //  13. History (collapsed)
  //  14. Audit Trail (collapsed)
  // Cut: NavigationFlow (duplicates Active-Tab pin), Flow (== Journey),
  //      Timestamp banner (== version chip), 6-row charter (== 1-row objective).
  // Sections 1–10 default-open; only 11+ collapsible.
  // ───────────────────────────────────────────────────────────────────
  // Define each section as a renderable node so we can reorder by lens
  const sec = {
    objective: <BusinessObjectiveSection key="objective" tab={tab} color={tab.color} proc={proc} dept={dept} />,
    asIsToBe:  <AsIsToBeRibbon key="asIsToBe" tab={tab} sub={sub} proc={proc} />,
    process:   (
      <SectionBlock key="process" title="Process Flow" icon="🗺" color={tab.color}>
        <JourneyMap tab={tab} sub={sub} proc={proc} dept={dept} />
      </SectionBlock>
    ),
    ipo:       <IpoRibbon key="ipo" tab={tab} sub={sub} proc={proc} />,
    aiLogic:   (
      <SectionBlock key="aiLogic" title="AI Logic" icon="🤖" color={tab.color}>
        <ModelDataAccuracyStrip tab={tab} sub={sub} proc={proc}
          focusKind={focusKind} focusLabel={focusLabel} />
        {(proc?.ai || []).length > 0 && (
          <AiTypeValidationPanel proc={proc}
            focusKind={focusKind} focusLabel={focusLabel} />
        )}
        {(proc?.ai || []).length > 0 && (
          <div style={{ marginTop: 10 }}>
            <AiTypeCatalog proc={proc} dept={dept}
              focusKind={focusKind} focusLabel={focusLabel}
              onFocus={onFocus} />
          </div>
        )}
      </SectionBlock>
    ),
    output:    (
      <SectionBlock key="output" title="Output" icon="📤" color={tab.color}>
        <SummaryAndOutcomeRow tab={tab} sub={sub} proc={proc} />
      </SectionBlock>
    ),
    outcomeScorecard: (
      <SectionBlock key="outcomeScorecard" title="Final outcome score" icon="🏁" color={tab.color}>
        <TabOutcomeScorecard tab={tab} proc={proc} />
      </SectionBlock>
    ),
    technicalBrief: (
      <SectionBlock key="technicalBrief" title="Technical risk + operations brief" icon="🛠" color={tab.color}>
        <TechnicalRiskBrief tab={tab} proc={proc} />
      </SectionBlock>
    ),
    kpiViz:    (
      <SectionBlock key="kpiViz" title="KPI · Success metrics + Visualization" icon="📊" color={tab.color}>
        <VisualizationSlot tab={tab} sub={sub} proc={proc} />
      </SectionBlock>
    ),
    components: (
      <SectionBlock key="components" title="Operational components" icon="🧩" color={tab.color}>
        {children}
      </SectionBlock>
    ),
    emphasis:  <EmphasisDispatch key="emphasis" profile={profile} color={tab.color} proc={proc} tab={tab} />,
    runtime:   <TechnicalRuntimeSection key="runtime" color={tab.color} tab={tab} proc={proc} />,
    database:  <DatabaseAndApiSection key="database" color={tab.color} tab={tab} />,
    prompts:   <PromptHistorySection key="prompts" color={tab.color} />,
    actions:   (
      <SectionBlock key="actions" title="Actions" icon="⚡" color={tab.color}>
        <ActionsPanel tab={tab} sub={sub} proc={proc} onAction={press} />
        <div style={{ marginTop: 10 }}>
          <ActionStatusPanel log={actionLog} color={tab.color} />
        </div>
      </SectionBlock>
    ),
  };

  // Compute section order by tab type + lens (operator §74.6 + 74.6e).
  // `runtime` (TechnicalRuntimeSection) lives right after Components — surfaces
  // the §76 9-runtime-layers relevance check on every tab.
  const baseOrder = ['objective', 'asIsToBe', 'process', 'ipo', 'aiLogic', 'output', 'outcomeScorecard', 'technicalBrief', 'kpiViz', 'components', 'runtime', 'database', 'prompts', 'emphasis', 'actions'];
  let order;
  if (promoteActions) {
    // Action tabs: Actions section lifted ABOVE KPI+Viz
    order = ['objective', 'asIsToBe', 'process', 'ipo', 'aiLogic', 'output', 'actions', 'kpiViz', 'components', 'runtime', 'database', 'prompts', 'emphasis'];
  } else if (lensActive && lens === 'engineer') {
    // Engineer lens: technical details first (runtime promoted up to position 4)
    order = ['objective', 'aiLogic', 'components', 'runtime', 'database', 'prompts', 'ipo', 'process', 'output', 'outcomeScorecard', 'technicalBrief', 'asIsToBe', 'kpiViz', 'emphasis', 'actions'];
  } else if (lensActive && lens === 'manager') {
    // Manager lens: KPIs, Actions, ROI first
    order = ['objective', 'kpiViz', 'actions', 'asIsToBe', 'output', 'outcomeScorecard', 'technicalBrief', 'process', 'ipo', 'aiLogic', 'components', 'runtime', 'database', 'prompts', 'emphasis'];
  } else if (lensActive && lens === 'business') {
    // Business lens: value first, technical details demoted (runtime moved last)
    order = ['objective', 'asIsToBe', 'output', 'outcomeScorecard', 'technicalBrief', 'kpiViz', 'process', 'actions', 'ipo', 'aiLogic', 'components', 'emphasis', 'runtime', 'database', 'prompts'];
  } else {
    order = baseOrder;
  }

  return (
    <>
      {/* 1. CONTEXT — Identity (always first; Lens chip lives inside) */}
      {/* OP-10 (2026-06-13 13:53 MDT) · TopBriefStrip MUST be first ·
          consolidates objective + goal + top-3 todo + monitor agent +
          dept/process/tab/sub context. Operator 12-message stack. */}
      <TopBriefStrip tab={tab} sub={sub} proc={proc} dept={dept} />
      <TabHeaderRibbon tab={tab} sub={sub} proc={proc} dept={dept}
        focusKind={focusKind} focusLabel={focusLabel} />
      <DependencyChainStrip tab={tab} sub={sub} proc={proc} dept={dept}
        focusKind={focusKind} focusLabel={focusLabel} />
      <WorkspaceQualityChecklist tab={tab} sub={sub} proc={proc}
        focusKind={focusKind} focusLabel={focusLabel} />
      <TopHorizontalFlowStrip tab={tab} proc={proc} />
      <TopTodoSnapshot tab={tab} sub={sub} proc={proc} />
      <TabComponentSequenceReview tab={tab} sub={sub} proc={proc} />

      {/* Lens-driven note (Mixed tabs only) */}
      {lensActive && (
        <div style={{
          marginBottom: 12, padding: '6px 12px',
          background: '#f8fafc', border: '1px dashed #cbd5e1',
          borderLeft: `4px solid ${tab.color}`,
          borderRadius: 4,
          fontSize: 11, color: '#475569',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            padding: '1px 8px', borderRadius: 2,
            background: tab.color, color: '#fff',
            fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>🔭 {lens}</span>
          <span>
            Section order rearranged to surface what the <strong>{lens}</strong> role needs first.
            Switch lens at the top to reorder.
          </span>
        </div>
      )}

      {/* Sections rendered in the computed order */}
      {order.map((k) => sec[k])}

      {/* 11. TO-DO (collapsible) */}
      <TabSection title="To-Do · role checklist" icon="✅" color={tab.color} defaultOpen>
        <div style={{
          marginBottom: 10, padding: '8px 10px',
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${tab.color}`, borderRadius: 4,
          fontSize: 12, color: '#475569', lineHeight: 1.45,
        }}>
          This checklist is tied to the active workspace path: <strong style={{ color: '#0f172a' }}>{tab.label}</strong>
          {sub ? <> / <strong style={{ color: '#0f172a' }}>{sub.label}</strong></> : null}.
          Use it to close missing objective, data, process, output, approval, and evidence gaps before demo or production review.
        </div>
        <TabTodoByRole tabName={tabName} proc={proc} />
      </TabSection>

      {/* 12. RECOMMENDATIONS (collapsible) */}
      <TabSection title="Recommendations" icon="💡" color={tab.color} defaultOpen={false}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8,
        }}>
          <Slot label="Recommendations" value={read(proc, 'recommendations', 'as_is_to_be.deltas')}
            bindPath="proc.recommendations" accent="#0891b2" />
        </div>
      </TabSection>

      {/* 13. FEEDBACK & IMPROVEMENT (collapsible) */}
      <TabSection title="Feedback & Improvement" icon="🙋" color={tab.color} defaultOpen={false}>
        <HitlFeedback tabName={tabName} proc={proc} />
      </TabSection>

      {/* 14. HISTORY (collapsed) */}
      <TabSection title="History" icon="🕒" color={tab.color} defaultOpen={false}>
        <TabTransactionHistory tabName={tabName} proc={proc} />
      </TabSection>

      {/* 15. AUDIT TRAIL (collapsed, last) */}
      <TabSection title="Audit Trail" icon="🔒" color={tab.color} defaultOpen={false}>
        <TabDatabaseOps tabName={tabName} proc={proc} />
      </TabSection>

      {/* Metadata footer with Export buttons (logs to ActionStatusPanel) */}
      <TabMetadataFooter tab={tab} sub={sub} proc={proc} onAction={press} />
    </>
  );
}

// SectionBlock — always-expanded section panel for canonical sections 2-10.
// Different visual treatment from TabSection (collapsible) — operator: top
// canonical sections must never hide.
function SectionBlock({ title, icon, color, children }) {
  return (
    <div style={{
      marginBottom: 16,
      background: '#fff',
      border: `1px solid ${color}33`,
      borderLeft: `5px solid ${color}`,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    }}>
      <div style={{
        padding: '12px 16px',
        background: `${color}11`,
        borderBottom: `1px solid ${color}22`,
        fontSize: 13, fontWeight: 900, color,
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>{icon} {title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// BusinessObjectiveSection — trimmed from the 8-row TabCharter.
// Operator: only Objective + Business Value matter at the top.
function BusinessObjectiveSection({ tab, color, proc, dept }) {
  const c = TAB_CHARTER[tab.id];
  if (!c) return null;
  const procName = proc?.name || 'this process';
  const deptName = dept?.name || 'this department';
  const personalize = (text) => text
    .replace(/this process/g, `${procName} (${deptName})`)
    .replace(/this department/g, deptName);
  return (
    <div style={{
      marginBottom: 16,
      background: '#fff',
      border: `1px solid ${color}33`,
      borderLeft: `5px solid ${color}`,
      borderRadius: 8,
      padding: 16,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    }}>
      <div style={{
        fontSize: 13, fontWeight: 900, color,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 8,
      }}>🎯 Business Objective</div>
      <div style={{ fontSize: 15, color: '#0f172a', lineHeight: 1.55, marginBottom: 12, fontWeight: 600 }}>
        {personalize(c.why)}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10,
      }}>
        <div style={{
          padding: '10px 12px', background: '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 6,
          fontSize: 12,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 2,
          }}>🏆 Goals</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#0f172a' }}>
            {c.objectives.slice(0, 3).map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
        <div style={{
          padding: '6px 10px', background: '#dcfce7',
          border: '1px solid #86efac', borderRadius: 4,
          fontSize: 11,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: '#16a34a',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
          }}>✅ In scope</div>
          <div style={{ color: '#14532d' }}>{personalize(c.scope)}</div>
        </div>
        <div style={{
          padding: '6px 10px', background: '#fee2e2',
          border: '1px solid #fca5a5', borderRadius: 4,
          fontSize: 11,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: '#dc2626',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
          }}>❌ Out of scope</div>
          <div style={{ color: '#7f1d1d' }}>{personalize(c.out_of_scope)}</div>
        </div>
      </div>
    </div>
  );
}

// ActionsPanel — documented Action buttons per operator:
//   Run · Export · Approve · Reject · Assign · Escalate · Create Test · Compare
// Each click logs to ActionStatusPanel + fires the backend stub.
// Buttons, NOT cards (operator's hard rule).
// ────────────────────────────────────────────────────────────────────
// EMPHASIS SECTIONS — per profile.emphasis, the TabFrame injects one of
// these between Operational Components and Actions. Each makes the tab
// type feel different from the canonical default.
// ────────────────────────────────────────────────────────────────────

// KnowledgeRepository — for information tabs (README, Notes AI, Overview).
// Replaces flat KPIs with a card grid of knowledge categories.
// KnowledgeDrawer — entries clickable; clicking expands a detail panel inline.
// Entry indices round-trip through ?entry=N for deep-linking and sharing.
function KnowledgeDrawer({ color, category, categoryLabel, entries, onClose }) {
  // Initial entry from URL ?entry=N if present
  const initialIdx = (() => {
    try {
      const url = new URL(window.location.href);
      const n = parseInt(url.searchParams.get('entry'), 10);
      if (!isNaN(n) && n >= 0 && n < entries.length) return n;
    } catch (e) { /* swallow */ }
    return null;
  })();
  const [activeIdx, setActiveIdxRaw] = useState(initialIdx);
  const setActiveIdx = (i) => {
    setActiveIdxRaw(i);
    try {
      const url = new URL(window.location.href);
      if (i !== null && i !== undefined) url.searchParams.set('entry', String(i));
      else url.searchParams.delete('entry');
      window.history.replaceState({}, '', url.toString());
    } catch (e) { /* swallow */ }
  };
  const [copiedIdx, setCopiedIdx] = useState(null);
  const copyEntryLink = (i) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('category', category);
      url.searchParams.set('entry', String(i));
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx(null), 1500);
      }).catch(() => {});
    } catch (e) { /* swallow */ }
  };
  // Per-entry deterministic mock detail (summary + tags + linked items)
  const seed = `kde|${category}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rnd = (n) => { const x = Math.sin(h + n) * 10000; return x - Math.floor(x); };
  const tagsBank = ['governance', 'compliance', 'high-priority', 'archived', 'in-review', 'draft', 'production', 'legal', 'pii', 'soc2', 'security', 'change-request', 'critical', 'rfc'];
  const authors = ['Alice', 'Bob', 'Carol', 'Dan', 'demo-user', 'ai-reviewer', 'paralegal-1'];
  const detailFor = (i, title) => {
    const numTags = 1 + Math.floor(rnd(i * 5 + 1) * 3);
    const tags = Array.from({ length: numTags }, (_, j) => tagsBank[Math.floor(rnd(i * 5 + 2 + j) * tagsBank.length)]);
    return {
      summary: `Captures the key context behind "${title}" — when it was raised, who flagged it, the decision/finding, and what changed downstream. Operator-pending until proc.notes.${category}[${i}].summary is wired.`,
      author: authors[Math.floor(rnd(i * 5 + 3) * authors.length)],
      created: new Date(Date.now() - (i + 1) * 86400 * 1000 * 7).toISOString().slice(0, 10),
      modified: new Date(Date.now() - (i + 1) * 86400 * 1000 * 3).toISOString().slice(0, 10),
      tags: [...new Set(tags)],
      linked: [
        `Linked decision · DEC-${100 + Math.floor(rnd(i * 5 + 4) * 900)}`,
        `Related process · ${['Claims Workflow', 'Underwriting', 'Legal Advisory', 'Fraud Investigation'][Math.floor(rnd(i * 5 + 5) * 4)]}`,
        `Audit row · audit-${Math.floor(rnd(i * 5 + 6) * 1e9).toString(36).padStart(8, '0')}`,
      ],
    };
  };
  return (
    <div style={{
      marginTop: 10, padding: 12,
      background: `${color}08`,
      border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 6,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, fontSize: 11, color, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <span>📂 {categoryLabel} ({entries.length} entries)</span>
        <button type="button"
          onClick={onClose}
          style={{
            padding: '2px 8px', fontSize: 10, fontWeight: 700,
            background: '#fff', color,
            border: `1px solid ${color}55`, borderRadius: 3, cursor: 'pointer',
          }}>✕ Close</button>
      </div>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        {entries.map((title, i) => {
          const isOpen = activeIdx === i;
          const d = isOpen ? detailFor(i, title) : null;
          const tone = cardListTone(i);
          return (
            <li key={i} style={{
              marginBottom: 4,
              background: tone.bg, border: `1px solid ${isOpen ? color + '88' : tone.border}`, borderRadius: 4,
              overflow: 'hidden',
            }}>
              <button type="button"
                onClick={() => setActiveIdx(isOpen ? null : i)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '6px 10px', background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, color: '#0f172a',
                  display: 'flex', alignItems: 'baseline', gap: 8,
                }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 2,
                  background: color, color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{isOpen ? '−' : '+'}</span>
                <span style={{
                  fontSize: 9, color, fontWeight: 700, fontFamily: 'monospace',
                }}>#{i + 1}</span>
                <span style={{ flex: 1 }}>{title}</span>
                <span style={{
                  fontSize: 9, color: '#94a3b8',
                }}>{new Date(Date.now() - (i + 1) * 86400 * 1000 * 7).toISOString().slice(0, 10)}</span>
              </button>
              {isOpen && d && (
                <div style={{
                  padding: '10px 12px',
                  background: `${color}06`,
                  borderTop: `1px solid ${color}22`,
                  fontSize: 11, color: '#0f172a',
                }}>
                  <div style={{ marginBottom: 8, lineHeight: 1.5 }}>{d.summary}</div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8,
                    marginBottom: 8, fontSize: 10,
                  }}>
                    <div style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>👤 Author</div>
                      <div style={{ color: '#0f172a' }}>{d.author}</div>
                    </div>
                    <div style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>📅 Created</div>
                      <div style={{ color: '#0f172a', fontFamily: 'monospace' }}>{d.created}</div>
                    </div>
                    <div style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>✎ Modified</div>
                      <div style={{ color: '#0f172a', fontFamily: 'monospace' }}>{d.modified}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>🏷 Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {d.tags.map((t) => (
                        <span key={t} style={{
                          padding: '1px 8px', borderRadius: 3,
                          background: `${color}22`, color,
                          fontSize: 10, fontWeight: 600,
                        }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>🔗 Linked</div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#475569' }}>
                      {d.linked.map((l, j) => <li key={j} style={{ fontSize: 10 }}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                    {['👁 View', '✎ Edit', '🔗 Copy link', '📤 Export'].map((b) => {
                      const isCopy = b === '🔗 Copy link';
                      const wasCopied = isCopy && copiedIdx === i;
                      return (
                        <button key={b} type="button"
                          onClick={isCopy ? () => copyEntryLink(i) : undefined}
                          style={{
                            padding: '3px 8px', fontSize: 10, fontWeight: 600,
                            background: wasCopied ? '#16a34a' : '#fff',
                            color: wasCopied ? '#fff' : color,
                            border: `1px solid ${wasCopied ? '#16a34a' : color + '55'}`,
                            borderRadius: 3, cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}>{wasCopied ? '✓ Copied!' : b}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div style={{
        marginTop: 8, padding: '4px 8px',
        background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: 3,
        fontSize: 9, color: '#92400e', fontStyle: 'italic',
      }}>
        wire → proc.notes[{category}] · backend route TBD
      </div>
    </div>
  );
}

function KnowledgeRepositorySection({ color, proc }) {
  const procName = proc?.name || 'this process';
  const categories = [
    { key: 'architecture', icon: '🏛', label: 'Architecture Notes', desc: 'Design decisions, ADRs, system context' },
    { key: 'process',      icon: '🔄', label: 'Process Notes',      desc: 'Workflow steps, manual vs automatic' },
    { key: 'meeting',      icon: '🗣',  label: 'Meeting Notes',      desc: 'Decisions, action items, follow-ups' },
    { key: 'lessons',      icon: '💡', label: 'Lessons Learned',    desc: 'Prompt issues, model drift, bottlenecks' },
    { key: 'research',     icon: '🔬', label: 'Research Notes',     desc: 'Findings, patterns, observations' },
    { key: 'incident',     icon: '🚨', label: 'Incident Notes',     desc: 'Root causes, fixes, prevention' },
  ];
  // Deep-link: read ?category=X&entry=N on mount + auto-open
  const initialCategory = (() => {
    try {
      const url = new URL(window.location.href);
      const cat = url.searchParams.get('category');
      if (cat && categories.find((c) => c.key === cat)) return cat;
    } catch (e) { /* swallow */ }
    return null;
  })();
  const [activeCategory, setActiveCategoryRaw] = useState(initialCategory);
  const setActiveCategory = (v) => {
    setActiveCategoryRaw(v);
    // Round-trip to URL so refresh + share preserves the drawer state
    try {
      const url = new URL(window.location.href);
      if (v) url.searchParams.set('category', v);
      else { url.searchParams.delete('category'); url.searchParams.delete('entry'); }
      window.history.replaceState({}, '', url.toString());
    } catch (e) { /* swallow */ }
  };
  // Deterministic mock notes per category — operator §57.7: marked MOCK.
  const seed = `notes|${procName}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rnd = (n) => { const x = Math.sin(h + n) * 10000; return x - Math.floor(x); };
  const mockTitles = {
    architecture: ['ADR-007 — Pick OpenAI for legal summarization', 'C4 L2 — Doc-management container', 'HLD — Hybrid retrieval design', 'SAD — Vendor-vs-build trade-off'],
    process:      ['Manual → automated review steps', 'Pre-2026 process baseline', 'Hand-off matrix per role', 'Escalation runbook'],
    meeting:      ['Q2 governance review 2026-04-10', 'Compliance Q3 prep 2026-05-22', 'AI council monthly · May 2026', 'Customer briefing rehearsal'],
    lessons:      ['Prompt drift after model upgrade — what we learned', 'Retrieval recall < 0.75 after corpus refresh', 'Bias gap surfaced in fairness audit', 'Token-budget overshoot during peak'],
    research:     ['Top-5 SOTA legal-LLM benchmarks 2026', 'Retrieval relevance evals (Ragas)', 'User-research interviews — paralegals', 'Cost-per-decision benchmark'],
    incident:     ['INC-238 — PII leaked via citation', 'INC-247 — RAG returned wrong precedent', 'INC-251 — Agent loop on edge case', 'INC-262 — Compliance gate skipped'],
  };
  const countFor = (key) => mockTitles[key]?.length || 0;
  return (
    <SectionBlock title="Knowledge Repository" icon="📚" color={color}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        What knowledge exists for <strong>{procName}</strong>? Click any category to open the drawer below.{' '}
        <span style={{ padding: '0 5px', background: '#fef3c7', color: '#b45309', borderRadius: 2, fontSize: 9, fontWeight: 700 }}>MOCK</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8,
      }}>
        {categories.map((c) => {
          const isActive = activeCategory === c.key;
          return (
            <button key={c.key} type="button"
              onClick={() => setActiveCategory(isActive ? null : c.key)}
              style={{
                padding: 12, textAlign: 'left',
                background: isActive ? color : '#fff',
                color: isActive ? '#1d4ed8' : '#0f172a',
                border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`,
                borderRadius: 6, cursor: 'pointer', font: 'inherit',
                transition: 'background 0.15s',
              }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
              <strong style={{ fontSize: 13, color: isActive ? '#fff' : color }}>{c.label}</strong>
              <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', marginTop: 2 }}>{c.desc}</div>
              <div style={{ marginTop: 6, fontSize: 9, color: isActive ? 'rgba(255,255,255,0.75)' : '#94a3b8' }}>
                {countFor(c.key)} entries · {isActive ? '👆 close drawer' : '👆 click to open'}
              </div>
            </button>
          );
        })}
      </div>
      {/* Drawer — shows the notes inside the active category */}
      {activeCategory && (
        <KnowledgeDrawer
          color={color}
          category={activeCategory}
          categoryLabel={categories.find((c) => c.key === activeCategory)?.label || activeCategory}
          entries={mockTitles[activeCategory] || []}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </SectionBlock>
  );
}

// IncidentKanban — for action tabs (Incident AI, Meeting AI, Job AI, Test AI).
// 5-column kanban with deterministic mock items per (proc, tab).
function IncidentKanbanSection({ color, proc, tab }) {
  const seed = `kanban|${proc?.name || '_'}|${tab.id}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rnd = (n) => { const x = Math.sin(h + n) * 10000; return x - Math.floor(x); };
  const samples = [
    'Drift detected on Legal Copilot AI', 'PII leak in Document Management',
    'Slow response on Compliance Agent', 'Hallucination in policy summary',
    'Token budget exceeded on RAG AI', 'Approval queue backed up',
    'Failed cron job for fraud scoring', 'New regulation requires review',
    'Customer NPS dropped 8 pts', 'Vendor contract renewal due',
    'Outdated runbook for incident #42', 'Edge case missing test coverage',
  ];
  const actors = ['Alice', 'Bob', 'Carol', 'Dan', 'demo-user', 'ops-runner'];
  const severities = ['P4', 'P3', 'P2', 'P1', 'P2', 'P3'];
  const columns = [
    { id: 'open',         label: 'Open',         color: '#dc2626', count: 3 },
    { id: 'assigned',     label: 'Assigned',     color: '#f59e0b', count: 2 },
    { id: 'investigating', label: 'Investigating', color: '#0ea5e9', count: 2 },
    { id: 'fixing',       label: 'Fixing',       color: '#8b5cf6', count: 1 },
    { id: 'closed',       label: 'Closed',       color: '#16a34a', count: 4 },
  ];
  let sampleIdx = 0;
  return (
    <SectionBlock title="Operational Queue · Kanban" icon="📋" color={color}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        Live work-in-flight for this tab.{' '}
        <span style={{ padding: '0 5px', background: '#fef3c7', color: '#b45309', borderRadius: 2, fontSize: 9, fontWeight: 700 }}>MOCK</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 6,
        overflowX: 'auto',
      }}>
        {columns.map((col) => {
          const items = Array.from({ length: col.count }, (_, i) => {
            const idx = sampleIdx++;
            return {
              title: samples[idx % samples.length],
              actor: actors[Math.floor(rnd(idx * 3 + 1) * actors.length)],
              severity: severities[Math.floor(rnd(idx * 3 + 2) * severities.length)],
            };
          });
          return (
            <div key={col.id} style={{
              background: `${col.color}08`,
              border: `1px solid ${col.color}33`,
              borderTop: `3px solid ${col.color}`,
              borderRadius: 4,
              padding: 6, minWidth: 160,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 10, fontWeight: 700, color: col.color,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 6,
              }}>
                <span>{col.label}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: 2,
                  background: col.color, color: '#fff', fontSize: 9,
                }}>{col.count}</span>
              </div>
              {items.map((it, i) => {
                const tone = cardListTone(i);
                return (
                <div key={i} style={{
                  marginBottom: 4, padding: '6px 8px',
                  background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 3,
                  fontSize: 11, color: '#0f172a', lineHeight: 1.3,
                }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                    <span style={{
                      padding: '0 4px', borderRadius: 2, fontSize: 8, fontWeight: 700,
                      background: it.severity === 'P1' ? '#dc2626' : it.severity === 'P2' ? '#f59e0b' : it.severity === 'P3' ? '#0ea5e9' : '#94a3b8',
                      color: '#fff',
                    }}>{it.severity}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>{it.actor}</span>
                  </div>
                  <div>{it.title}</div>
                </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </SectionBlock>
  );
}

// DashboardGrid — for visualization tabs (Analytics, Dashboard, Business Value, ExpAI).
// 4 KPI tiles + 2 charts.
function DashboardGridSection({ color, proc, tab }) {
  const seed = `dash|${proc?.name || '_'}|${tab.id}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rnd = (n) => { const x = Math.sin(h + n) * 10000; return x - Math.floor(x); };
  const tiles = [
    { label: 'Revenue Impact',   value: '$' + Math.round(rnd(1) * 2 + 0.8).toFixed(1) + 'M', delta: '+' + Math.round(rnd(2) * 25 + 5) + '%', up: true,  color: '#16a34a' },
    { label: 'Cost Saved',       value: '$' + Math.round(rnd(3) * 700 + 200) + 'K',          delta: '+' + Math.round(rnd(4) * 30 + 8) + '%', up: true,  color: '#0ea5e9' },
    { label: 'Productivity ↑',   value: '+' + Math.round(rnd(5) * 40 + 20) + '%',            delta: 'YoY',                                   up: true,  color: '#8b5cf6' },
    { label: 'Adoption',         value: Math.round(rnd(6) * 25 + 70) + '%',                  delta: '+' + Math.round(rnd(7) * 12 + 3) + 'pp', up: true, color: '#f59e0b' },
  ];
  const trendSeries = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    revenue: Math.round(rnd(i * 2 + 10) * 200 + 800),
    cost:    Math.round(rnd(i * 2 + 11) * 100 + 200),
  }));
  return (
    <SectionBlock title="Executive Dashboard" icon="📊" color={color}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        Executive scorecard for <strong>{proc?.name || 'this process'}</strong>.{' '}
        <span style={{ padding: '0 5px', background: '#fef3c7', color: '#b45309', borderRadius: 2, fontSize: 9, fontWeight: 700 }}>MOCK</span>
      </div>
      {/* 4 KPI tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8,
        marginBottom: 10,
      }}>
        {tiles.map((t, i) => {
          const tone = cardListTone(i);
          return (
          <div key={t.label} style={{
            padding: 12, background: tone.bg,
            border: `1px solid ${tone.border}`,
            borderLeft: `4px solid ${t.color}`,
            borderRadius: 6,
          }}>
            <div style={{
              fontSize: 10, color: '#64748b', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>{t.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>{t.value}</strong>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: t.up ? '#16a34a' : '#dc2626',
              }}>{t.up ? '▲' : '▼'} {t.delta}</span>
            </div>
          </div>
          );
        })}
      </div>
      {/* Trend chart */}
      <div style={{
        padding: 12, background: '#fff',
        border: `1px solid ${color}33`, borderRadius: 6,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color, marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>📈 12-month revenue vs cost</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cost"    stroke="#dc2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionBlock>
  );
}

// DecisionMatrixSection — for decision tabs (Gov AI, Comp AI, Res AI, Exp AI).
// Confidence × action routing + approval workflow.
function DecisionMatrixSection({ color, proc }) {
  const rows = [
    { confidence: '> 95%',  action: 'Auto-execute',  reviewer: '—',         risk: 'Low',      color: '#16a34a' },
    { confidence: '80–95%', action: 'Auto + log',    reviewer: 'Audit only', risk: 'Low–Med',  color: '#0ea5e9' },
    { confidence: '60–80%', action: 'Human review',  reviewer: 'Manager',    risk: 'Med',      color: '#f59e0b' },
    { confidence: '40–60%', action: 'HITL approval', reviewer: 'Compliance', risk: 'Med–High', color: '#ef4444' },
    { confidence: '< 40%',  action: 'Reject + escalate', reviewer: 'Director', risk: 'High',  color: '#dc2626' },
  ];
  return (
    <SectionBlock title="Decision Matrix" icon="⚖" color={color}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        Confidence → Action routing for <strong>{proc?.name || 'this process'}</strong>.
        Higher-confidence decisions auto-execute; lower-confidence escalate.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: `${color}11` }}>
            {['Confidence', 'Action', 'Reviewer', 'Risk'].map((h) => (
              <th key={h} style={{
                padding: '8px 10px', textAlign: 'left',
                color, fontWeight: 800, fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: `2px solid ${color}33`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.confidence} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 10px', fontWeight: 700, color: r.color }}>{r.confidence}</td>
              <td style={{ padding: '6px 10px', color: '#0f172a' }}>{r.action}</td>
              <td style={{ padding: '6px 10px', color: '#475569' }}>{r.reviewer}</td>
              <td style={{ padding: '6px 10px' }}>
                <span style={{
                  padding: '1px 8px', borderRadius: 3,
                  background: `${r.color}22`, color: r.color,
                  fontSize: 10, fontWeight: 700,
                }}>{r.risk}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Approval workflow visual */}
      <div style={{
        marginTop: 12,
        padding: 12,
        background: '#fff',
        border: `1px solid ${color}33`, borderRadius: 6,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color, marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>🔄 Approval workflow</div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          fontSize: 11, color: '#0f172a',
        }}>
          {['Business Review', 'Risk Review', 'Compliance Review', 'Architecture Review', 'Production Approval']
            .map((step, i, arr) => (
              <React.Fragment key={step}>
                <span style={{
                  padding: '4px 10px',
                  background: `${color}11`, color,
                  border: `1px solid ${color}55`, borderRadius: 4,
                  fontWeight: 600,
                }}>{step}</span>
                {i < arr.length - 1 && <span style={{ color: '#94a3b8' }}>→</span>}
              </React.Fragment>
          ))}
        </div>
      </div>
    </SectionBlock>
  );
}

// Dispatcher — pick the right emphasis block per profile.emphasis.
function EmphasisDispatch({ profile, color, proc, tab }) {
  if (!profile || !profile.emphasis || profile.emphasis === 'none') return null;
  if (profile.emphasis === 'knowledge')        return <KnowledgeRepositorySection color={color} proc={proc} />;
  if (profile.emphasis === 'kanban')           return <IncidentKanbanSection color={color} proc={proc} tab={tab} />;
  if (profile.emphasis === 'dashboard')        return <DashboardGridSection color={color} proc={proc} tab={tab} />;
  if (profile.emphasis === 'decision-support') return <DecisionMatrixSection color={color} proc={proc} />;
  return null;
}

// ────────────────────────────────────────────────────────────────────
// TechnicalRuntimeSection — surfaces the 9 enterprise AI technical
// runtime layers (global §76) per tab. Per-layer relevance is computed
// against the tab's type — layers that don't pass the §74.3 8/10
// value test for that tab type are hidden so the panel stays tight.
// Operator 2026-06-05: "create technical module where each tab must
// have these detail · check if these add value · some common to
// process/data/testing".
// ────────────────────────────────────────────────────────────────────
// Per-layer internal flow + functionality (operator 2026-06-05:
// "all technical layer must be track and show case what is internal
// functionality and things are happening · internal flow").
const LAYER_INTERNALS = {
  'memory':         { flow: ['Query → MemoryRouter', 'classify (working/short/long/episodic)', 'lookup in store', 'apply ACL filter', 'rerank by recency × salience', 'compress to budget', 'return packed memory'], queries_per_sec: '2-5K', primary_failure: 'Memory leak → unbounded growth', telemetry: 'memory_lookup_latency_ms · cache_hit_ratio · memory_growth_bytes' },
  'context-eng':    { flow: ['User query + state', 'enumerate sources', 'pull from each', 'normalize schema', 'dedupe', 'relevance score', 'rerank top-K', 'apply security filter', 'ground with citations', 'assemble prompt'], queries_per_sec: '500-2K', primary_failure: 'Context poisoning from untrusted source', telemetry: 'context_size_tokens · sources_used · relevance_p95' },
  'context-window': { flow: ['Compute available budget (model context − reserve)', 'allocate across L0–L9', 'enforce per-layer cap', 'compress overflow with summarizer', 'pin anchors (goals/policies)', 'return final payload'], queries_per_sec: '1-5K', primary_failure: 'Token overflow → truncation of critical fact', telemetry: 'tokens_used / max · overflow_count · pin_collisions' },
  'tools':          { flow: ['Task → ToolRouter', 'discover via Capability Manager', 'eligibility check (RBAC/ABAC)', 'schema validate args', 'invoke via MCP', 'monitor execution', 'validate result schema', 'retry/fallback on error', 'aggregate', 'return'], queries_per_sec: '100-500', primary_failure: 'Tool retry storm cascading failure', telemetry: 'tool_invocations · tool_success_rate · tool_p95_latency · cost_usd' },
  'mcp':            { flow: ['MCP Client →  MCP Gateway', 'authN/Z', 'policy check (OPA)', 'rate-limit/quota', 'capability lookup', 'route to MCP Server', 'inject secrets', 'execute', 'validate result', 'audit log', 'return'], queries_per_sec: '500-2K', primary_failure: 'Gateway becomes bottleneck → cascading timeout', telemetry: 'gateway_p95 · server_health · policy_denial_count · audit_row_count' },
  'rag':            { flow: ['Query → embedder', 'ANN search (vector)', 'BM25 search (keyword)', 'hybrid fusion (RRF)', 'metadata/ACL filter', 'cross-encoder rerank', 'context pack (token budget)', 'citation map', 'return evidence pack'], queries_per_sec: '50-500', primary_failure: 'Vector DB recall drop after embedding model upgrade', telemetry: 'retrieval_p95 · recall@k · rerank_score · citation_accuracy' },
  'model-serving':  { flow: ['Inference Gateway → router', 'cost/latency/policy check', 'GPU scheduler allocates', 'tokenize → KV cache lookup', 'batch with other requests', 'inference', 'safety filter', 'output validation', 'return + emit telemetry'], queries_per_sec: '100-1K', primary_failure: 'GPU OOM under traffic spike', telemetry: 'tokens_per_sec · ttft_ms · p95_latency · cost_per_request · gpu_util' },
  'multi-agent':    { flow: ['Goal → Supervisor', 'Planner builds DAG', 'Research gathers evidence', 'Critic challenges plan', 'Executor invokes tools', 'Reviewer validates output', 'Supervisor decides: accept/rework/escalate'], queries_per_sec: '10-100', primary_failure: 'Agent loop without termination → cost explosion', telemetry: 'agent_runs · completion_rate · escalation_rate · cost_per_run' },
  'eval':           { flow: ['Response → eval engine', 'classify (offline/online/human/auto)', 'run faithfulness/relevance/grounding/hallucination checks', 'compare with ground truth', 'compute confidence', 'compare with baseline (regression)', 'feed back into prompt/model registry'], queries_per_sec: '10-200', primary_failure: 'Eval judge biased by same model family', telemetry: 'faithfulness · relevance · groundedness · drift_psi · regression_count' },
};

const RUNTIME_LAYERS = [
  { id: 'memory',   icon: '🧠', title: 'Memory Operations',          ops: 20,
    summary: 'What does this tab remember? Create · classify · dedupe · update · version · summarize · retrieve · rank · expire · audit · security · delete (GDPR).',
    binding: 'proc.memory_ops · proc.notes · proc.demo_story.walkthrough',
    common_to: ['data', 'process', 'note-ai', 'meet-ai', 'inc-ai'] },
  { id: 'context-eng', icon: '📥', title: 'Context Engineering',     ops: 20,
    summary: 'What goes into the prompt right now? Source registry · collect · normalize · dedupe · relevance score · rank · enrich · ground · security/policy filter · assemble.',
    binding: 'proc.context_sources · proc.system_instructions',
    common_to: ['ai', 'exp-ai', 'res-ai', 'gov-ai'] },
  { id: 'context-window', icon: '📏', title: 'Context Window Management', ops: 20,
    summary: 'How is the token budget allocated across L0–L9? System / Query / Working / Recent / Summary / Long-term / RAG / Tool / Policy / Reflection.',
    binding: 'proc.token_budget · proc.context_layers',
    common_to: ['ai', 'process', 'data'] },
  { id: 'tools',    icon: '🛠', title: 'Tool Layer (MCP Tool Ecosystem)', ops: 20,
    summary: 'Which tools execute? Registry · discovery · selection · eligibility · validation · invocation · orchestration · monitoring · result-validation · retry · fallback · audit.',
    binding: 'proc.tech_stack · proc.applications · proc.tools',
    common_to: ['ai', 'process', 'operations', 'test-ai', 'job-ai', 'inc-ai'] },
  { id: 'mcp',      icon: '🔌', title: 'MCP Architecture',            ops: 16,
    summary: 'How are tools served? Client · Gateway (auth+routing+policy) · Server · Registry · Security · Capability Manager · Routing · Result Validator · Audit.',
    binding: 'proc.mcp_servers · proc.tools',
    common_to: ['ai', 'process', 'operations'] },
  { id: 'rag',      icon: '🔍', title: 'RAG Architecture',            ops: 25,
    summary: 'How is enterprise knowledge retrieved? 25 steps: source → access-sync → parse → chunk → embed → vector DB → hybrid (vector+BM25) → metadata filter → rerank → context pack → citation map → generate → verify → feedback.',
    binding: 'proc.data_process · proc.rag_pipeline · proc.notes',
    common_to: ['data', 'note-ai', 'exp-ai', 'comp-ai'] },
  { id: 'model-serving', icon: '🤖', title: 'Model Serving',          ops: 16,
    summary: 'How are models hosted? Inference gateway · load balancer · router · registry · GPU scheduler · autoscale · KV cache · safety filter · fallback · cost control · latency monitor · output validate.',
    binding: 'proc.tech_stack.ai_runtime · proc.models · proc.ai',
    common_to: ['ai', 'analytics', 'biz-value'] },
  { id: 'multi-agent', icon: '🤝', title: 'Multi-Agent System',        ops: 7,
    summary: 'Who collaborates? Supervisor → Planner → Research → Critic → Executor → Reviewer → Supervisor. Top-1% adds: Router · Risk · Compliance · Memory · Cost · Security · Eval · HITL · Recovery · Orchestrator.',
    binding: 'proc.ai (each AI type = agent) · proc.agents · proc.automatic_process.ai_workflow',
    common_to: ['ai', 'process', 'inc-ai', 'meet-ai'] },
  { id: 'eval',     icon: '🎯', title: 'Evaluation Framework',        ops: 20,
    summary: 'Is the system getting better? Ground truth · offline · online · human · LLM-judge · faithfulness · relevance · groundedness · hallucination · safety · agent · tool · A/B · canary · shadow · regression · feedback learning.',
    binding: 'proc.smart_kpi · proc.evaluation · proc.tests',
    common_to: ['test-ai', 'ai', 'analytics', 'biz-value', 'comp-ai'] },
];

// Per-tab-type LAYER_RELEVANCE — only layers in this set pass the §74.3
// 8/10 value test on the given tab type. The technical runtime section
// hides everything else so the operator sees only what adds value.
const LAYER_RELEVANCE = {
  information:    new Set(['memory', 'rag', 'context-eng']),
  visualization:  new Set(['eval', 'model-serving']),
  action:         new Set(['tools', 'mcp', 'multi-agent']),
  decision:       new Set(['context-eng', 'rag', 'eval', 'multi-agent']),
  mixed:          new Set(['memory', 'context-eng', 'context-window', 'tools', 'mcp', 'rag', 'model-serving', 'multi-agent', 'eval']),
};

function TechnicalRuntimeSection({ color, tab, proc }) {
  const profile = TAB_PROFILES[tab.id];
  const allowed = LAYER_RELEVANCE[profile?.type] || LAYER_RELEVANCE.mixed;
  const relevant = RUNTIME_LAYERS.filter((l) => allowed.has(l.id) || l.common_to.includes(tab.id));
  const irrelevant = RUNTIME_LAYERS.filter((l) => !relevant.includes(l));
  // Value-test per §74.3 — score each relevant layer for "does it add value?"
  const scoreLayer = (l) => {
    // 6 of 10 questions checkable from blueprint shape
    const checks = [
      !!profile,                                         // Q1 Why am I here? (profile present)
      true,                                              // Q2 What is this? (layer has title)
      true,                                              // Q3 Why does it exist? (summary present)
      !!read(proc, l.binding.split(' · ')[0].replace('proc.', '')),  // Q4 What goes in (binding)
      !!l.ops,                                           // Q5 What happens (ops count > 0)
      true,                                              // Q6 What outputs (title)
      !!l.binding,                                       // Q7 What can I do (binding hint)
      true,                                              // Q8 Who owns (per §76 §53.42 docs role)
      l.id === 'eval' || l.id === 'model-serving',      // Q9 How measure (eval/model serving have metrics)
      l.id === 'memory' || l.id === 'eval' || l.id === 'mcp', // Q10 What next (these connect to downstream)
    ];
    return checks.filter(Boolean).length;
  };
  return (
    <SectionBlock title={`Technical Runtime Layers · ${relevant.length} relevant of 9`} icon="⚙" color={color}>
      <div style={{
        fontSize: 11, color: '#475569', marginBottom: 10,
        padding: '10px 12px', background: '#f1f5f9', borderRadius: 4,
      }}>
        🔧 Per global <strong>§76</strong>: 9 enterprise AI runtime layers execute every request.
        For <strong>{tab.label}</strong> ({profile?.type || 'mixed'} tab) — showing the
        {' '}<strong>{relevant.length}</strong> layers that pass the §74.3 8/10 value test.
      </div>
      {/* Relevant layers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8,
        marginBottom: 12,
      }}>
        {relevant.map((l) => {
          const score = scoreLayer(l);
          const passes = score >= 8;
          return (
            <div key={l.id} style={{
              padding: 10, background: '#fff',
              border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
              borderRadius: 4,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              }}>
                <strong style={{ flex: 1, fontSize: 12, color: '#0f172a' }}>{l.icon} {l.title}</strong>
                <span style={{
                  padding: '0 6px', borderRadius: 2,
                  background: passes ? '#16a34a22' : '#f59e0b22',
                  color: passes ? '#16a34a' : '#b45309',
                  fontSize: 9, fontWeight: 700,
                }}>{score}/10 {passes ? '✓' : '⚠'}</span>
                <span style={{
                  padding: '0 6px', borderRadius: 2,
                  background: `${color}22`, color, fontSize: 9, fontWeight: 700,
                }}>{l.ops} ops</span>
              </div>
              <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>
                {l.summary}
              </div>
              <div style={{
                fontSize: 9, color: '#94a3b8', fontFamily: 'monospace',
                background: '#f8fafc', padding: '3px 6px', borderRadius: 2,
                marginBottom: 6,
              }}>
                wire → {l.binding}
              </div>
              {/* Internal flow + telemetry per operator 2026-06-05:
                  "all technical layer must be track and show case what is
                  internal functionality and things are happening · internal flow" */}
              {LAYER_INTERNALS[l.id] && (
                <details style={{ fontSize: 10 }}>
                  <summary style={{
                    cursor: 'pointer', padding: '3px 4px', fontWeight: 700, color,
                    textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9,
                  }}>🔬 Internal flow + telemetry · ~{LAYER_INTERNALS[l.id].queries_per_sec} qps</summary>
                  <div style={{ padding: '6px 4px' }}>
                    {/* Flow ladder */}
                    <ol style={{
                      margin: '0 0 6px 18px', padding: 0, fontSize: 10,
                      color: '#0f172a', lineHeight: 1.5,
                    }}>
                      {LAYER_INTERNALS[l.id].flow.map((step, j) => (
                        <li key={j}>{step}</li>
                      ))}
                    </ol>
                    {/* Telemetry + failure mode */}
                    <div style={{
                      padding: '4px 6px', fontSize: 9,
                      background: '#fffbeb', border: '1px dashed #fde68a',
                      borderRadius: 3, color: '#92400e', marginBottom: 4,
                    }}>
                      <strong>⚠ Primary failure mode:</strong> {LAYER_INTERNALS[l.id].primary_failure}
                    </div>
                    <div style={{
                      padding: '4px 6px', fontSize: 9,
                      background: '#f1f5f9', border: '1px solid #cbd5e1',
                      borderRadius: 3, color: '#475569',
                      fontFamily: 'monospace',
                    }}>
                      <strong style={{ fontFamily: 'inherit' }}>📊 Telemetry emitted:</strong> {LAYER_INTERNALS[l.id].telemetry}
                    </div>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
      {/* Irrelevant layers — collapsed list */}
      {irrelevant.length > 0 && (
        <details style={{ fontSize: 10, color: '#64748b' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, padding: 4 }}>
            🚫 {irrelevant.length} layer{irrelevant.length === 1 ? '' : 's'} hidden — not value-add for {profile?.type || 'mixed'} tabs (click to inspect why)
          </summary>
          <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 10 }}>
            {irrelevant.map((l) => (
              <li key={l.id} style={{ marginBottom: 2 }}>
                <strong>{l.icon} {l.title}</strong> — irrelevant for {profile?.type || 'mixed'} tabs · still applies elsewhere ({l.common_to.join(', ') || '—'})
              </li>
            ))}
          </ul>
        </details>
      )}
    </SectionBlock>
  );
}

// ────────────────────────────────────────────────────────────────────
// DatabaseAndApiSection — operator 2026-06-05: "for each tab database
// and table must · create database schema · api · same way above"
// (also for §76 runtime layers). Renders the data + API contract per
// tab AND per runtime layer. Lives UNDER the Technical Runtime section.
// Composes with §57.6 canonical fields (request_id · tenant_id · actor ·
// tool · latency_ms · outcome) — every table carries these.
// ────────────────────────────────────────────────────────────────────

// Canonical §57.6 columns every table includes
const CANONICAL_COLUMNS = [
  { name: 'id',           type: 'UUID PRIMARY KEY',           note: 'row identity' },
  { name: 'request_id',   type: 'UUID NOT NULL',              note: '§57.6 canonical · propagated through every span' },
  { name: 'tenant_id',    type: 'TEXT NOT NULL',              note: '§47.6 multi-tenant isolation' },
  { name: 'actor',        type: 'TEXT NOT NULL',              note: '§57.6 who/what triggered' },
  { name: 'created_at',   type: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()', note: 'audit timestamp' },
  { name: 'latency_ms',   type: 'INTEGER',                    note: '§57.6 canonical latency' },
  { name: 'outcome',      type: 'TEXT',                       note: 'ok | denied | failed | timeout' },
];

// Per-tab database + API contract
const TAB_DATABASE = {
  'readme':       { primary: 'tab_readme',      tables: ['tab_readme_brd', 'tab_readme_frd', 'tab_readme_hld', 'tab_readme_adr'], extra: [['title','TEXT'],['section','TEXT'],['content','JSONB'],['version','TEXT']] },
  'overview':     { primary: 'tab_overview',    tables: ['tab_overview_snapshots'],         extra: [['headline','TEXT'],['status','TEXT'],['owner','TEXT'],['kpi_snapshot','JSONB']] },
  'product-mgr':  { primary: 'tab_product_mgr', tables: ['tab_pm_stories','tab_pm_epics','tab_pm_sprints','tab_pm_releases'], extra: [['epic_id','UUID'],['story_id','UUID'],['priority','TEXT'],['estimate','INTEGER']] },
  'process':      { primary: 'tab_process',     tables: ['tab_process_runs','tab_process_approvals','tab_process_history'], extra: [['run_id','UUID'],['step','TEXT'],['status','TEXT'],['result','JSONB']] },
  'data':         { primary: 'tab_data',        tables: ['tab_data_sources','tab_data_quality','tab_data_lineage','tab_data_master'], extra: [['source_id','TEXT'],['quality_score','NUMERIC'],['freshness_at','TIMESTAMPTZ']] },
  'analytics':    { primary: 'tab_analytics',   tables: ['tab_analytics_eda','tab_analytics_features','tab_analytics_evals'], extra: [['feature_name','TEXT'],['eval_metric','TEXT'],['score','NUMERIC']] },
  'ai':           { primary: 'tab_ai',          tables: ['tab_ai_models','tab_ai_agents','tab_ai_experiments','tab_ai_registry'], extra: [['model_name','TEXT'],['version','TEXT'],['accuracy','NUMERIC'],['ai_type','TEXT']] },
  'user-story':   { primary: 'tab_user_story',  tables: ['tab_story_business','tab_story_functional','tab_story_acceptance'], extra: [['story_id','UUID'],['as_a','TEXT'],['i_want','TEXT'],['so_that','TEXT']] },
  'user-demo':    { primary: 'tab_user_demo',   tables: ['tab_demo_scripts','tab_demo_recordings','tab_demo_feedback'], extra: [['persona','TEXT'],['scenario','TEXT'],['recording_url','TEXT']] },
  'exp-ai':       { primary: 'tab_exp_ai',      tables: ['tab_shap','tab_lime','tab_counterfactual','tab_decision_path'], extra: [['prediction_id','UUID'],['feature','TEXT'],['shap_value','NUMERIC'],['confidence','NUMERIC']] },
  'res-ai':       { primary: 'tab_res_ai',      tables: ['tab_fairness','tab_bias_audit','tab_oversight','tab_accountability'], extra: [['group','TEXT'],['disparate_impact','NUMERIC'],['eq_opp_gap','NUMERIC']] },
  'gov-ai':       { primary: 'tab_gov_ai',      tables: ['tab_policies','tab_controls','tab_approvals','tab_risk_register'], extra: [['policy_id','TEXT'],['control_id','TEXT'],['effectiveness','NUMERIC'],['risk_level','TEXT']] },
  'comp-ai':      { primary: 'tab_comp_ai',     tables: ['tab_regulations','tab_violations','tab_audit_findings','tab_certifications'], extra: [['regulation','TEXT'],['violation_id','UUID'],['severity','TEXT']] },
  'inc-ai':       { primary: 'tab_inc_ai',      tables: ['tab_incidents','tab_postmortems','tab_corrective_actions'], extra: [['incident_id','UUID'],['severity','TEXT'],['root_cause','TEXT'],['mttr_minutes','INTEGER']] },
  'meet-ai':      { primary: 'tab_meet_ai',     tables: ['tab_meetings','tab_transcripts','tab_action_items','tab_decisions'], extra: [['meeting_id','UUID'],['participants','TEXT[]'],['decision','TEXT'],['action_owner','TEXT']] },
  'note-ai':      { primary: 'tab_note_ai',     tables: ['tab_notes','tab_tags','tab_knowledge_links'], extra: [['note_id','UUID'],['title','TEXT'],['content','TEXT'],['tags','TEXT[]'],['category','TEXT']] },
  'test-ai':      { primary: 'tab_test_ai',     tables: ['tab_tests_positive','tab_tests_negative','tab_tests_regression','tab_defects','tab_coverage'], extra: [['suite','TEXT'],['case_id','TEXT'],['passed','BOOLEAN'],['coverage_pct','NUMERIC']] },
  'job-ai':       { primary: 'tab_job_ai',      tables: ['tab_jobs','tab_cron','tab_runs','tab_failures','tab_retries'], extra: [['job_name','TEXT'],['cron_expr','TEXT'],['next_run','TIMESTAMPTZ'],['lock_key','TEXT']] },
  'biz-value':    { primary: 'tab_biz_value',   tables: ['tab_revenue','tab_cost','tab_productivity','tab_risk','tab_roi','tab_customer','tab_employee','tab_esg'], extra: [['kpi','TEXT'],['value','NUMERIC'],['target','NUMERIC'],['delta_pct','NUMERIC']] },
  'dashboard':    { primary: 'tab_dashboard',   tables: ['tab_kpi_tiles','tab_charts','tab_drill_downs'], extra: [['role','TEXT'],['tile_id','TEXT'],['metric','TEXT'],['value','NUMERIC']] },
  'operations':   { primary: 'tab_operations',  tables: ['tab_ops_monitoring','tab_ops_alerts','tab_ops_deploys','tab_ops_rollbacks','tab_ops_sla'], extra: [['service','TEXT'],['alert_id','UUID'],['p95_latency','NUMERIC'],['sla_target','NUMERIC']] },
  'reports':      { primary: 'tab_reports',     tables: ['tab_report_runs','tab_report_distribution','tab_report_evidence'], extra: [['report_id','TEXT'],['cadence','TEXT'],['format','TEXT'],['distributed_to','TEXT[]']] },
};

// Per-§76-runtime-layer database + API (operator: "same way above as well")
const LAYER_DATABASE = {
  'memory':         { primary: 'rt_memory',           tables: ['rt_memory_records','rt_memory_versions','rt_memory_links','rt_memory_audit'], extra: [['memory_type','TEXT'],['salience','NUMERIC'],['ttl_seconds','INTEGER'],['payload','JSONB']] },
  'context-eng':    { primary: 'rt_context_eng',      tables: ['rt_context_sources','rt_context_rankings','rt_context_evidence'],     extra: [['source_id','TEXT'],['relevance_score','NUMERIC'],['citation','JSONB']] },
  'context-window': { primary: 'rt_context_window',   tables: ['rt_token_budgets','rt_window_layers'],                                 extra: [['layer_id','TEXT'],['allocated_tokens','INTEGER'],['used_tokens','INTEGER']] },
  'tools':          { primary: 'rt_tools',            tables: ['rt_tool_registry','rt_tool_invocations','rt_tool_results'],            extra: [['tool_id','TEXT'],['args','JSONB'],['result','JSONB'],['cost_usd','NUMERIC']] },
  'mcp':            { primary: 'rt_mcp',              tables: ['rt_mcp_servers','rt_mcp_requests','rt_mcp_policies','rt_mcp_audit'],   extra: [['server_id','TEXT'],['endpoint','TEXT'],['scope_required','TEXT'],['scope_granted','BOOLEAN']] },
  'rag':            { primary: 'rt_rag',              tables: ['rt_rag_chunks','rt_rag_embeddings','rt_rag_retrievals','rt_rag_citations'], extra: [['chunk_id','UUID'],['vector','VECTOR(768)'],['rerank_score','NUMERIC'],['source_uri','TEXT']] },
  'model-serving':  { primary: 'rt_model_serving',    tables: ['rt_model_registry','rt_inference_calls','rt_safety_filters'],          extra: [['model','TEXT'],['version','TEXT'],['tokens_in','INTEGER'],['tokens_out','INTEGER'],['cost_usd','NUMERIC']] },
  'multi-agent':    { primary: 'rt_multi_agent',      tables: ['rt_agent_runs','rt_agent_messages','rt_agent_state'],                  extra: [['agent_role','TEXT'],['parent_run_id','UUID'],['message','TEXT'],['state_snapshot','JSONB']] },
  'eval':           { primary: 'rt_eval',             tables: ['rt_eval_results','rt_eval_benchmarks','rt_eval_drift','rt_eval_feedback'], extra: [['metric','TEXT'],['score','NUMERIC'],['baseline','NUMERIC'],['drift_psi','NUMERIC']] },
};

// Per-topic accountability matrix (operator §77.1: "each tab must have
// accountability to present about technical part in this project").
// Maps every tab + runtime layer to an owner / team / RACI / escalation.
const OWNERSHIP_MATRIX = {
  // Tabs
  'readme':        { owner: 'Enterprise Architect',      team: 'Strategy Office · EA',          R: 'EA',          A: 'CIO',  C: 'AI CoE',         I: 'CEO',     escalate: 'CIO → CEO',     kpi: 'Alignment Score' },
  'overview':      { owner: 'Process Owner',             team: 'Strategy Office',               R: 'Process Owner', A: 'CIO', C: 'AI CoE',         I: 'CEO',     escalate: 'CIO',           kpi: 'Process Health' },
  'product-mgr':   { owner: 'AI Product Manager',        team: 'AI Engineering · Product',      R: 'AI PM',       A: 'CAIO', C: 'Engineering',    I: 'CEO',     escalate: 'CAIO',          kpi: 'Roadmap Adherence' },
  'process':       { owner: 'Process Owner',             team: 'Business Unit',                 R: 'Process Owner', A: 'COO',  C: 'AI Engineering', I: 'CIO',     escalate: 'COO',           kpi: 'Cycle Time' },
  'data':          { owner: 'Data Owner',                team: 'Data & Knowledge · DataOps',    R: 'Data Owner',  A: 'CDO',  C: 'Privacy Office', I: 'CIO',     escalate: 'CDO',           kpi: 'Data Quality Score' },
  'analytics':     { owner: 'Analytics Lead',            team: 'Data & Knowledge',              R: 'Analyst',     A: 'CDO',  C: 'AI Engineering', I: 'CIO',     escalate: 'CDO',           kpi: 'Insight Quality' },
  'ai':            { owner: 'AI Engineering Lead',       team: 'AI Engineering · Agent Team',   R: 'AI Engineer', A: 'CAIO', C: 'Architecture',   I: 'CIO',     escalate: 'CAIO',          kpi: 'Model Accuracy · Cost/Query' },
  'user-story':    { owner: 'AI Product Manager',        team: 'AI Engineering · Product',      R: 'AI PM',       A: 'CAIO', C: 'Business',       I: 'CIO',     escalate: 'CAIO',          kpi: 'Story Completion Rate' },
  'user-demo':     { owner: 'Solution Architect',        team: 'AI Engineering',                R: 'Solution Arch', A: 'CAIO', C: 'Sales',        I: 'CMO',     escalate: 'CAIO',          kpi: 'Demo Conversion' },
  'exp-ai':        { owner: 'AI Reviewer',               team: 'Governance Office · Risk',      R: 'AI Reviewer', A: 'Risk Office', C: 'Legal',  I: 'CAIO',    escalate: 'Risk Office',   kpi: 'Explanation Coverage' },
  'res-ai':        { owner: 'Responsible AI Lead',       team: 'Governance Office · AI Gov',    R: 'RAI Lead',    A: 'Risk Office', C: 'Legal',  I: 'Board',   escalate: 'Risk Office',   kpi: 'Fairness Score · Bias Gap' },
  'gov-ai':        { owner: 'AI Governance Lead',        team: 'Governance Office',             R: 'Gov Lead',    A: 'Risk Office', C: 'Compliance', I: 'Board', escalate: 'Risk Office',   kpi: 'Governance Score' },
  'comp-ai':       { owner: 'Compliance Lead',           team: 'Governance Office · Compliance', R: 'Compliance Lead', A: 'Compliance Officer', C: 'Legal · Auditor', I: 'Board', escalate: 'Compliance Officer', kpi: 'Audit Readiness · Violations' },
  'inc-ai':        { owner: 'SRE Lead',                  team: 'Platform Engineering · SRE',    R: 'SRE',         A: 'CIO',  C: 'Security',       I: 'CAIO',    escalate: 'SRE Manager → CIO', kpi: 'MTTD · MTTR' },
  'meet-ai':       { owner: 'Process Owner',             team: 'Business Unit',                 R: 'Meeting Owner', A: 'COO', C: 'Product',      I: 'CIO',     escalate: 'COO',           kpi: 'Decision Closure Rate' },
  'note-ai':       { owner: 'Knowledge Manager',         team: 'Data & Knowledge · Knowledge',  R: 'Knowledge Mgr', A: 'CDO', C: 'Analytics',    I: 'CIO',     escalate: 'CDO',           kpi: 'Knowledge Reuse Rate' },
  'test-ai':       { owner: 'Test Architect',            team: 'AI Engineering · QA',           R: 'Tester',      A: 'CIO',  C: 'AI Engineer',    I: 'CAIO',    escalate: 'Test Architect → CIO', kpi: 'Defect Density · Coverage' },
  'job-ai':        { owner: 'Platform Engineer',         team: 'Platform Engineering',          R: 'Platform Eng', A: 'CIO', C: 'SRE',            I: 'CAIO',    escalate: 'Platform Mgr',  kpi: 'Job Success Rate' },
  'biz-value':     { owner: 'AI Strategy Lead',          team: 'Strategy Office · Portfolio',   R: 'Strategy Lead', A: 'CFO', C: 'CAIO',         I: 'Board',   escalate: 'CFO',           kpi: 'ROI · NPV · Payback' },
  'dashboard':     { owner: 'BI Lead',                   team: 'Data & Knowledge',              R: 'BI Lead',     A: 'CDO',  C: 'CIO',            I: 'Board',   escalate: 'CDO',           kpi: 'Decision Latency' },
  'operations':    { owner: 'SRE Lead',                  team: 'Platform Engineering · SRE',    R: 'SRE',         A: 'CIO',  C: 'Security',       I: 'CAIO',    escalate: 'SRE Manager',   kpi: 'Availability · MTTR · SLA' },
  'reports':       { owner: 'Reporting Lead',            team: 'Strategy Office',               R: 'Reporting Lead', A: 'CFO', C: 'Compliance',  I: 'Board',   escalate: 'CFO',           kpi: 'Report Accuracy · Distribution SLA' },
  // §76 runtime layers
  'memory':         { owner: 'MemoryOps Lead',           team: 'AI Engineering · KnowledgeOps', R: 'MemoryOps',   A: 'CAIO', C: 'Privacy',        I: 'CIO',     escalate: 'CAIO',          kpi: 'Recall Quality · Retention Rate' },
  'context-eng':    { owner: 'Context Engineering Lead', team: 'AI Engineering',                R: 'Context Eng', A: 'CAIO', C: 'AI Reviewer',    I: 'CIO',     escalate: 'CAIO',          kpi: 'Context Quality Score' },
  'context-window': { owner: 'LLMOps Lead',              team: 'Platform Engineering · LLMOps', R: 'LLMOps',      A: 'CAIO', C: 'FinOps',         I: 'CIO',     escalate: 'CAIO',          kpi: 'Token Efficiency' },
  'tools':          { owner: 'Platform Engineering Lead',team: 'Platform Engineering',          R: 'Platform Eng',A: 'CIO',  C: 'Security',       I: 'CAIO',    escalate: 'Platform Mgr',  kpi: 'Tool Success Rate' },
  'mcp':            { owner: 'Platform Engineering Lead',team: 'Platform Engineering',          R: 'Platform Eng',A: 'CIO',  C: 'Security · Privacy', I: 'CAIO', escalate: 'Platform Mgr', kpi: 'MCP Availability · Latency' },
  'rag':            { owner: 'RAG Team Lead',            team: 'AI Engineering · RAG Team',     R: 'RAG Eng',     A: 'CAIO', C: 'Data Owner',     I: 'CIO',     escalate: 'CAIO',          kpi: 'Retrieval Precision · Recall' },
  'model-serving':  { owner: 'LLMOps Lead',              team: 'Platform Engineering · LLMOps', R: 'LLMOps',      A: 'CIO',  C: 'AI Engineer',    I: 'CAIO',    escalate: 'LLMOps Mgr',    kpi: 'Latency p95 · Cost/Query' },
  'multi-agent':    { owner: 'AgentOps Lead',            team: 'Platform Engineering · AgentOps', R: 'AgentOps', A: 'CAIO', C: 'AI Reviewer',    I: 'CIO',     escalate: 'AgentOps Mgr',  kpi: 'Agent Success Rate · Coordination' },
  'eval':           { owner: 'QA Lead',                  team: 'AI Engineering · QA',           R: 'QA Lead',     A: 'CAIO', C: 'Governance',     I: 'CIO',     escalate: 'CAIO',          kpi: 'Faithfulness · Accuracy · Drift' },
};

// Standard REST endpoints per resource — every primary table gets these 5
function endpointsFor(primary) {
  return [
    { method: 'GET',    path: `/api/v1/holy/${primary.replace(/_/g, '-')}`,                  desc: 'List rows · paginated · tenant-scoped' },
    { method: 'GET',    path: `/api/v1/holy/${primary.replace(/_/g, '-')}/{id}`,             desc: 'Read one row by id' },
    { method: 'POST',   path: `/api/v1/holy/${primary.replace(/_/g, '-')}`,                  desc: 'Create row · writes audit log' },
    { method: 'PATCH',  path: `/api/v1/holy/${primary.replace(/_/g, '-')}/{id}`,             desc: 'Partial update · scope-gated' },
    { method: 'DELETE', path: `/api/v1/holy/${primary.replace(/_/g, '-')}/{id}`,             desc: 'Soft delete · GDPR §57.7' },
  ];
}

// Renders database + API for a single resource (tab or runtime layer).
function ResourceCard({ resource, color, label, icon, ownership, index = 0 }) {
  if (!resource) return null;
  const tone = cardListTone(index);
  return (
    <details style={{
      marginBottom: 6, background: tone.bg,
      borderTop: `1px solid ${tone.border}`, borderRight: `1px solid ${tone.border}`,
      borderBottom: `1px solid ${tone.border}`, borderLeft: `4px solid ${color || tone.left}`,
      borderRadius: 4,
    }}>
      <summary style={{
        cursor: 'pointer', padding: '8px 10px',
        fontSize: 12, fontWeight: 700, color: '#0f172a',
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        background: tone.chipBg,
      }}>
        <span>{icon}</span>
        <strong>{label}</strong>
        <span style={{
          padding: '0 6px', borderRadius: 2,
          background: `${color}22`, color, fontSize: 9, fontWeight: 700,
        }}>{resource.tables.length + 1} tables · 5 endpoints</span>
        {ownership && (
          <span style={{
            padding: '0 6px', borderRadius: 2,
            background: '#f8fafc', color: '#1f2937', border: '1px solid #e5e7eb',
            fontSize: 9, fontWeight: 700,
          }}>👤 {ownership.owner}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8' }}>
          click to inspect schema · API · RACI
        </span>
      </summary>
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9' }}>
        {/* Accountability strip — operator §77.1 + §57.6 */}
        {ownership && (
          <div style={{
            marginBottom: 12, padding: '8px 10px',
            background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1', borderLeft: `4px solid ${color}`, borderRadius: 4,
          }}>
            <div style={{
              fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: 6,
            }}>👥 Accountability · RACI · Escalation · KPI ownership</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6,
              fontSize: 10,
            }}>
              {[
                ['👤 Owner',        ownership.owner,    '#0f172a'],
                ['🏢 Team',         ownership.team,     '#475569'],
                ['R · Responsible', ownership.R,        '#16a34a'],
                ['A · Accountable', ownership.A,        '#dc2626'],
                ['C · Consulted',   ownership.C,        '#f59e0b'],
                ['I · Informed',    ownership.I,        '#0ea5e9'],
                ['⚠ Escalation',    ownership.escalate, '#7c3aed'],
                ['📊 KPI owned',    ownership.kpi,      '#0891b2'],
              ].map(([k, v, c]) => (
                <div key={k} style={{
                  padding: '4px 6px', background: '#fff',
                  borderTop: `1px solid ${c}55`, borderRight: `1px solid ${c}55`,
                  borderBottom: `1px solid ${c}55`, borderLeft: `3px solid ${c}`,
                  borderRadius: 3,
                }}>
                  <div style={{
                    fontSize: 8, fontWeight: 700, color: c,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{k}</div>
                  <div style={{ color: '#0f172a' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Primary table */}
        <div style={{
          fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: 4,
        }}>📊 Primary table · {resource.primary}</div>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 10,
          marginBottom: 10,
        }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Column', 'Type', 'Note'].map((h) => (
                <th key={h} style={{
                  padding: '4px 6px', textAlign: 'left',
                  color: '#475569', fontWeight: 700, fontSize: 9,
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #e2e8f0',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CANONICAL_COLUMNS.map((c) => (
              <tr key={c.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#0f172a' }}>{c.name}</td>
                <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#475569' }}>{c.type}</td>
                <td style={{ padding: '3px 6px', color: '#64748b', fontSize: 9 }}>{c.note}</td>
              </tr>
            ))}
            {(resource.extra || []).map(([name, type]) => (
              <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#0f172a' }}>{name}</td>
                <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#475569' }}>{type}</td>
                <td style={{ padding: '3px 6px', color: '#94a3b8', fontSize: 9 }}>tab-specific</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Related tables */}
        <div style={{
          fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: 4,
        }}>🔗 Related tables ({resource.tables.length})</div>
        <ul style={{
          margin: '0 0 10px 18px', padding: 0, fontSize: 10,
          color: '#475569', fontFamily: 'monospace',
        }}>
          {resource.tables.map((t) => <li key={t}>{t}</li>)}
        </ul>
        {/* REST endpoints */}
        <div style={{
          fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: 4,
        }}>🌐 REST API · 5 endpoints · click row to probe</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <tbody>
            {endpointsFor(resource.primary).map((e) => (
              <EndpointRow key={e.method + e.path} endpoint={e} color={color} resourceLabel={label} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// EndpointRow — clickable REST row. Operator 2026-06-05: probes the
// endpoint with the right method, surfaces inline response (ok / fallback)
// + logs to prompt history via saveAction.
function EndpointRow({ endpoint, color, resourceLabel }) {
  const [state, setState] = useState({ status: 'idle' });
  const methodColor = endpoint.method === 'GET' ? '#0ea5e9' :
                      endpoint.method === 'POST' ? '#16a34a' :
                      endpoint.method === 'PATCH' ? '#f59e0b' : '#dc2626';
  const probe = async (ev) => {
    ev.stopPropagation();
    setState({ status: 'probing' });
    const r = await apiProbe(endpoint.method, endpoint.path);
    setState({ status: 'done', result: r });
    saveAction('api', `${endpoint.method} ${r.ok ? 'OK' : r.fallback ? 'SIM' : 'ERR'} ${r.http_status} · ${endpoint.path}`, {
      endpoint: endpoint.path, method: endpoint.method,
      http_status: r.http_status, latency_ms: r.latency_ms,
      fallback: r.fallback, resource: resourceLabel,
    });
  };
  const r = state.result;
  return (
    <>
      <tr
        onClick={probe}
        title={`Click to probe ${endpoint.method} ${endpoint.path}`}
        style={{
          borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
          background: state.status === 'probing' ? '#fef3c7' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(ev) => { if (state.status !== 'probing') ev.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={(ev) => { if (state.status !== 'probing') ev.currentTarget.style.background = 'transparent'; }}
      >
        <td style={{ padding: '3px 6px', whiteSpace: 'nowrap' }}>
          <span style={{
            padding: '1px 6px', borderRadius: 2,
            background: methodColor, color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
          }}>{endpoint.method}</span>
        </td>
        <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#0f172a', fontSize: 10 }}>
          {endpoint.path}
        </td>
        <td style={{ padding: '3px 6px', color: '#64748b', fontSize: 9 }}>
          {endpoint.desc}
          {state.status === 'probing' && (
            <span style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 700 }}>⏱ probing…</span>
          )}
          {state.status === 'done' && r && (
            <span style={{
              marginLeft: 6, padding: '0 5px', borderRadius: 2, fontWeight: 700,
              background: r.ok ? '#16a34a' : r.fallback ? '#f59e0b' : '#dc2626',
              color: '#fff', fontSize: 9,
            }}>
              {r.ok ? `✓ ${r.http_status} · ${r.latency_ms}ms` :
                r.fallback ? `⚠ offline · ${r.latency_ms}ms` :
                `✗ ${r.http_status}`}
            </span>
          )}
        </td>
      </tr>
      {state.status === 'done' && r && (
        <tr>
          <td colSpan={3} style={{ padding: '0 6px 6px' }}>
            <pre style={{
              margin: 0, padding: 6, borderRadius: 3,
              background: r.ok ? '#ecfdf5' : r.fallback ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${r.ok ? '#86efac' : r.fallback ? '#fde68a' : '#fecaca'}`,
              fontSize: 9, fontFamily: 'monospace', color: '#0f172a',
              maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {r.fallback
                ? `// Backend unreachable (${r.error}).\n// Per §57.7 — surfacing simulated fallback, not fabricated data.\n${JSON.stringify({ ok: false, fallback: true, method: endpoint.method, path: endpoint.path }, null, 2)}`
                : JSON.stringify(r.body ?? { ok: r.ok, status: r.http_status }, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// PromptHistorySection — operator 2026-06-05: "save all input prompt
// and show on UI". Reads localStorage.insur.prompts, listens for live
// updates via insur:prompt-saved event, lets the operator clear or copy.
function PromptHistorySection({ color }) {
  const [prompts, setPrompts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('insur.prompts') || '[]'); } catch (e) { return []; }
  });
  useEffect(() => {
    const handler = (e) => setPrompts((p) => [e.detail, ...p].slice(0, 200));
    window.addEventListener('insur:prompt-saved', handler);
    return () => window.removeEventListener('insur:prompt-saved', handler);
  }, []);
  const clearAll = () => {
    try { localStorage.removeItem('insur.prompts'); } catch (e) { /* swallow */ }
    setPrompts([]);
  };
  const copyOne = (text) => { try { navigator.clipboard.writeText(text); } catch (e) { /* swallow */ } };
  return (
    <SectionBlock title={`Prompt history · ${prompts.length} saved`} icon="💬" color={color}>
      <div style={{
        fontSize: 11, color: '#475569', marginBottom: 10,
        padding: '10px 12px', background: '#f1f5f9', borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ flex: 1 }}>
          📝 Every prompt typed in the Topbar (Global · 🧠 Ask AI) is saved here with timestamp + role + URL.
          Persists in <code>localStorage.insur.prompts</code> (last 200).
        </span>
        {prompts.length > 0 && (
          <button type="button"
            onClick={clearAll}
            style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 700,
              background: '#fff', color: '#dc2626',
              border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer',
            }}>🗑 Clear all</button>
        )}
      </div>
      {prompts.length === 0 ? (
        <div style={{
          padding: 16, fontSize: 11, color: '#94a3b8', textAlign: 'center',
          fontStyle: 'italic', background: '#fffbeb',
          border: '1px dashed #fde68a', borderRadius: 4,
        }}>
          No prompts yet. Type into the 🔍 Global or 🧠 Ask AI input at top of page + press Enter.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Kind', 'Time', 'Role', 'Prompt', 'URL', ''].map((h) => (
                <th key={h} style={{
                  padding: '4px 6px', textAlign: 'left',
                  color: '#475569', fontWeight: 700, fontSize: 9,
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #e2e8f0',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.slice(0, 30).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', color: '#94a3b8', fontWeight: 700 }}>{prompts.length - i}</td>
                <td style={{ padding: '3px 6px' }}>
                  <span style={{
                    padding: '0 6px', borderRadius: 2,
                    background:
                      p.kind === 'ai'         ? '#8b5cf6' :
                      p.kind === 'action'     ? '#16a34a' :
                      p.kind === 'api'        ? '#f59e0b' :
                      p.kind === 'navigation' ? '#475569' :
                                                '#0ea5e9',
                    color: '#fff', fontSize: 9, fontWeight: 700,
                  }}>
                    {p.kind === 'ai'         ? '🧠 AI' :
                     p.kind === 'action'     ? '⚡ Action' :
                     p.kind === 'api'        ? '🌐 API' :
                     p.kind === 'navigation' ? '🧭 Nav' :
                                               '🔍 Global'}
                  </span>
                </td>
                <td style={{ padding: '3px 6px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>
                  {new Date(p.at).toLocaleString()}
                </td>
                <td style={{ padding: '3px 6px', color: '#475569' }}>{p.role}</td>
                <td style={{ padding: '3px 6px', color: '#0f172a', fontWeight: 600 }}>{p.text}</td>
                <td style={{ padding: '3px 6px', fontSize: 9, color: '#94a3b8', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.url}>
                  {p.url}
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <button type="button"
                    onClick={() => copyOne(p.text)}
                    title="Copy prompt"
                    style={{
                      padding: '1px 6px', fontSize: 9, fontWeight: 600,
                      background: '#fff', color,
                      border: `1px solid ${color}55`, borderRadius: 2, cursor: 'pointer',
                    }}>📋</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {prompts.length > 30 && (
        <div style={{ marginTop: 6, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
          Showing 30 of {prompts.length} · localStorage holds up to 200
        </div>
      )}
    </SectionBlock>
  );
}

function DatabaseAndApiSection({ color, tab }) {
  const profile = TAB_PROFILES[tab.id];
  const tabResource = TAB_DATABASE[tab.id];
  // Show only the runtime layers that are relevant to this tab type
  const allowed = LAYER_RELEVANCE[profile?.type] || LAYER_RELEVANCE.mixed;
  const relevantLayers = RUNTIME_LAYERS.filter((l) =>
    (allowed.has(l.id) || l.common_to.includes(tab.id)) && LAYER_DATABASE[l.id]
  );
  return (
    <SectionBlock title={`Database · Tables · API · per §57.6 canonical fields`} icon="🗄" color={color}>
      <div style={{
        fontSize: 11, color: '#475569', marginBottom: 10,
        padding: '10px 12px', background: '#f1f5f9', borderRadius: 4,
      }}>
        🗄 Every tab + runtime layer ships with a database schema + REST API
        per global §57.6 (canonical fields: <code>request_id · tenant_id · actor · latency_ms · outcome</code>).
        Tab data lives here; §76 runtime-layer data lives below.
      </div>
      {/* Tab's own resource */}
      {tabResource && (
        <>
          <div style={{
            fontSize: 10, color, fontWeight: 700, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>📋 Tab-level resource — {tab.label}</div>
          <ResourceCard
            resource={tabResource}
            color={color}
            label={tab.label + ' (primary)'}
            icon="📋"
            ownership={OWNERSHIP_MATRIX[tab.id]}
            index={0}
          />
        </>
      )}
      {/* Runtime-layer resources */}
      {relevantLayers.length > 0 && (
        <>
          <div style={{
            fontSize: 10, color, fontWeight: 700, marginTop: 10, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>⚙ Runtime-layer resources · {relevantLayers.length} relevant of 9</div>
          {relevantLayers.map((l, i) => (
            <ResourceCard
              key={l.id}
              resource={LAYER_DATABASE[l.id]}
              color={color}
              label={l.title}
              icon={l.icon}
              ownership={OWNERSHIP_MATRIX[l.id]}
              index={i + 1}
            />
          ))}
        </>
      )}
      {/* Pattern legend */}
      <div style={{
        marginTop: 10, padding: '6px 8px',
        background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: 3,
        fontSize: 10, color: '#92400e',
      }}>
        <strong>Pattern (operator §57.6 + §76):</strong> every primary table has
        7 canonical columns (id · request_id · tenant_id · actor · created_at · latency_ms · outcome)
        + per-resource fields. Every resource exposes 5 REST methods (GET list · GET one · POST · PATCH · DELETE soft).
        Backend stub at <code>/api/v1/holy/components/&lt;op&gt;</code> (§50.7).
      </div>
    </SectionBlock>
  );
}

function ActionsPanel({ tab, sub, proc, onAction }) {
  const [states, setStates] = useState({});
  const actions = [
    { id: 'Run',         icon: '▶',  color: '#16a34a', what: 'Execute workflow', result: 'Creates execution, status, and audit row.' },
    { id: 'Export',      icon: '⤓',  color: '#0ea5e9', what: 'Generate file', result: 'Produces PDF/Excel/report artifact and download event.' },
    { id: 'Approve',     icon: '✓',  color: '#16a34a', what: 'Approve recommendation', result: 'Decision status changes and approval evidence is saved.' },
    { id: 'Reject',      icon: '✗',  color: '#dc2626', what: 'Reject recommendation', result: 'Escalation or fallback workflow is opened.' },
    { id: 'Assign',      icon: '👤', color: '#8b5cf6', what: 'Assign owner', result: 'Follow-up task receives owner, due date, and audit event.' },
    { id: 'Escalate',    icon: '⚠',  color: '#f59e0b', what: 'Escalate issue', result: 'Incident task is created and supervisor queue is notified.' },
    { id: 'Create Test', icon: '🧪', color: '#0d9488', what: 'Create test case', result: 'Test AI workspace receives a new case draft.' },
    { id: 'Compare',     icon: '⚖',  color: '#6366f1', what: 'Compare versions', result: 'Comparison view opens with champion/challenger evidence.' },
  ];
  const tabLabel = `${tab.label}${sub ? `:${sub.label}` : ''}`;
  const runAction = (a) => {
    setStates((prev) => ({
      ...prev,
      [a.id]: { state: 'processing', at: new Date(), outcome: 'Running action; button stays active until completion.' },
    }));
    if (onAction) onAction(`${a.id} → ${tabLabel}`);
    saveAction('action', `${a.id} → ${tabLabel}`, { tab: tab.id, sub: sub?.id, proc: proc?.id, action: a.id });
    setTimeout(() => {
      setStates((prev) => ({
        ...prev,
        [a.id]: { state: 'done', at: new Date(), outcome: a.result },
      }));
    }, 1100);
  };
  return (
    <div>
      <div style={{
        marginBottom: 10, padding: '8px 10px', background: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: 6,
        fontSize: 11, color: '#475569', lineHeight: 1.4,
      }}>
        <strong style={{ color: '#0f172a' }}>Action rule:</strong> one row is one task. Click the active button, watch the status cell until it reaches Done, then verify the history/audit row below.
      </div>
      <div style={{ display: 'grid', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {actions.map((a, i) => {
          const state = states[a.id];
          const busy = state?.state === 'processing';
          const done = state?.state === 'done';
          const tone = cardListTone(i);
          return (
            <div key={a.id} style={{
              display: 'grid',
              gridTemplateColumns: '42px minmax(150px, 1fr) minmax(210px, 1.4fr) minmax(170px, 1fr)',
              minWidth: 720,
              gap: 8,
              alignItems: 'center',
              padding: '8px 10px',
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              borderLeft: `5px solid ${a.color}`,
              borderRadius: 6,
              boxShadow: busy ? `0 0 0 3px ${a.color}22` : '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, background: a.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
              }}>{i + 1}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <CardKindBadge kind="action" />
                  <strong style={{ color: '#0f172a', fontSize: 12 }}>{a.icon} {a.id}</strong>
                </div>
                <div style={{ marginTop: 2, fontSize: 10, color: '#64748b' }}>{a.what}</div>
              </div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.35 }}>
                <strong>After click:</strong> {a.result}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{
                  padding: '4px 8px', borderRadius: 999,
                  background: busy ? '#fef3c7' : done ? '#dcfce7' : '#fff',
                  color: busy ? '#92400e' : done ? '#166534' : '#64748b',
                  border: `1px solid ${busy ? '#fcd34d' : done ? '#86efac' : '#cbd5e1'}`,
                  fontSize: 10, fontWeight: 900,
                  whiteSpace: 'nowrap',
                }}>{busy ? 'ACTIVE' : done ? 'DONE' : 'READY'}</span>
                <button type="button"
                  disabled={busy}
                  onClick={() => runAction(a)}
                  style={{
                    minHeight: 32,
                    padding: '7px 12px', fontSize: 11, fontWeight: 900,
                    background: busy ? '#f59e0b' : done ? '#16a34a' : a.color,
                    color: '#fff', border: 'none', borderRadius: 4,
                    cursor: busy ? 'wait' : 'pointer',
                    boxShadow: `0 2px 8px ${a.color}33`,
                    whiteSpace: 'nowrap',
                  }}>
                  {busy ? 'Running...' : done ? 'Run again' : 'Start'}
                </button>
              </div>
              {state && (
                <div style={{
                  gridColumn: '2 / -1',
                  padding: '6px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4,
                  fontSize: 10, color: '#475569',
                }}>
                  <strong>{state.state === 'done' ? 'Completed' : 'In progress'}:</strong> {state.outcome} · {state.at.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// renderContent returns ONLY the sub-tab Components grid.
// Everything else (header / IPO / AS-IS-TO-BE / Visualization / To-Do / etc.)
// is owned by TabFrame, which wraps this.
function renderContent({ tab, sub, proc, dept, bp, focusKind, focusLabel }) {
  const props = { proc, dept, bp };
  const subId = sub?.id;

  if (tab.id === 'overview') {
    return <OverviewTab {...props} />;
  }
  if (tab.id === 'process')    return renderProcessSubTab(subId, proc, dept);
  if (tab.id === 'data')       return renderDataSubTab(subId, proc, dept);
  if (tab.id === 'analytics')  return renderAnalyticsSubTab(subId);
  if (tab.id === 'ai')         return renderAISubTab(subId, proc);
  if (tab.id === 'operations') return renderOperationsSubTab(subId);
  if (tab.id === 'reports')    return renderReportsSubTab(subId, proc, dept);

  // Tabs with REAL blueprint data — render the actual content, not placeholder cards.
  // Falls through to spec-driven cards when the blueprint block is absent.
  if (tab.id === 'readme') {
    return (
      <>
        {renderReadmeSubTab(subId, proc, tab.color)}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Expected sections (from spec)
          </div>
          {renderSpecTab(tab.id, subId, tab.color, proc?.name)}
        </div>
      </>
    );
  }
  // OP-13 (2026-06-14): custom render for manual-explore tab · NOT renderSpecTab
  if (tab.id === 'manual-explore') {
    return <SequenceOpsLayout tab={tab} sub={sub} proc={proc} />;
  }
  if (tab.id === 'res-ai')   return renderResAiSubTab(subId, proc, tab.color);
  if (tab.id === 'exp-ai')   return renderExpAiSubTab(subId, proc, tab.color);
  if (tab.id === 'gov-ai')   return renderGovAiSubTab(subId, proc, tab.color);
  if (tab.id === 'test-ai')  return renderTestAiSubTab(subId, proc, tab.color, renderSpecTab(tab.id, subId, tab.color, proc?.name));
  if (tab.id === 'user-demo') return renderUserDemoSubTab(subId, proc, tab.color);

  // Spec-driven tabs (placeholder/template content until blueprint populates)
  if (tab.id === 'biz-value') {
    return (
      <>
        <BizValueExecHeader activeSubId={subId} />
        {renderSpecTab('biz-value', subId, tab.color, proc?.name)}
      </>
    );
  }
  if ([
    'problem-as-is', 'to-be', 'ai-strategy', 'digital-transformation',
    'manual-transaction', 'automatic-pipeline', 'accuracy-benchmarking',
    'analytical-ai-process', 'ai-control-tower',
    'product-mgr', 'dashboard',
    'user-story',
    'comp-ai',
    'inc-ai', 'meet-ai', 'note-ai', 'job-ai',
  ].includes(tab.id)) {
    return renderSpecTab(tab.id, subId, tab.color, proc?.name);
  }

  return <PendingSection tab={tab} sub={sub} />;
}

// Map sub-menu kinds to human labels for banner display
const KIND_LABEL = {
  sub:   'Sub Process',
  ai:    'AI Type',
  agent: 'Agent',
  app:   'Application',
  md:    'Master Data',
};
const KIND_COLOR = {
  sub:   '#3b82f6',
  ai:    '#8b5cf6',
  agent: '#ec4899',
  app:   '#0ea5e9',
  md:    '#10b981',
};

// Renders a detail card for whichever maroon-menu item is focused.
// Looks up structured info from the process blueprint when available,
// falls back to a labeled placeholder otherwise. §57.7 honesty rule:
// no fabricated content — show "—" / "Operator-pending" for missing fields.
function FocusDetailCard({ kind, label, proc, dept, tabId }) {
  // Resolve the underlying blueprint entry for this selection
  let entry = null;
  if (kind === 'ai' && Array.isArray(proc?.ai)) {
    entry = proc.ai.find((a) => a.ai_type === label) || null;
  } else if (kind === 'sub' && Array.isArray(proc?.sub_processes)) {
    entry = proc.sub_processes.find((s) => (s.name || s) === label) || null;
  } else if (kind === 'agent' && Array.isArray(proc?.agents)) {
    entry = proc.agents.find((a) => (a.name || a) === label) || null;
  } else if (kind === 'app' && Array.isArray(proc?.applications)) {
    entry = proc.applications.find((a) => (a.name || a) === label) || null;
  } else if (kind === 'md' && Array.isArray(proc?.master_data)) {
    entry = proc.master_data.find((m) => (m.name || m) === label) || null;
  }

  const color = KIND_COLOR[kind] || '#7f1d1d';
  const kindName = KIND_LABEL[kind] || 'Focus';

  // Field rows to show — only render the ones the entry provides.
  const rows = [];
  if (entry && typeof entry === 'object') {
    Object.entries(entry).forEach(([k, v]) => {
      if (k === 'name' || k === 'ai_type') return;
      if (v == null || v === '') return;
      rows.push([k, v]);
    });
  }

  return (
    <div style={{
      marginBottom: 16,
      background: '#fff',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12,
      }}>
        <span style={{
          padding: '3px 10px', borderRadius: 4,
          background: color, color: '#fff',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>{kindName}</span>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{label}</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
          on tab: <strong>{tabId}</strong>
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
        From <strong>{proc?.name || '—'}</strong>
        {dept ? <> · <strong>{dept.name}</strong></> : null}
      </div>

      {rows.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{
                  padding: '6px 8px', verticalAlign: 'top',
                  color: '#64748b', fontWeight: 600, width: 180,
                  textTransform: 'capitalize',
                }}>{k.replace(/_/g, ' ')}</td>
                <td style={{ padding: '6px 8px', color: '#0f172a' }}>
                  {typeof v === 'object'
                    ? <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>
                        {JSON.stringify(v, null, 2)}
                      </pre>
                    : String(v)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{
          padding: 12,
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6,
          fontSize: 12, color: '#64748b', fontStyle: 'italic',
        }}>
          No operator content for this {kindName.toLowerCase()} on this process yet.
          Default catalog entry — scroll the tab below for related context
          (e.g., the <strong>{tabId}</strong> tab).
        </div>
      )}
    </div>
  );
}

export function BankUseCasePage() {
  const { bp } = useOutletContext();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusParam = searchParams.get('focus') || '';
  const rawTabParam = searchParams.get('tab') || '';
  const tabParam = normalizeTabId(rawTabParam);
  const subParam = searchParams.get('sub') || '';
  const deepLinkTabId = resolveDeepLinkTabId(rawTabParam, subParam);
  const [focusKind, ...focusLabelParts] = focusParam ? focusParam.split(':') : ['', ''];
  const focusLabel = focusLabelParts.join(':'); // labels may legitimately contain ':'

  // Default workspace tab = 'dashboard' (operator 2026-06-05: "by default .. dashbaord")
  // Persist last-active tab + sub-tab + lens to localStorage so refresh survives.
  const persistedTab = (() => {
    try { return localStorage.getItem('insur.lastTab'); } catch (e) { return null; }
  })();
  const persistedGroup = (() => {
    try { return localStorage.getItem('insur.lastTabGroup') || 'all'; } catch (e) { return 'all'; }
  })();
  const [activeTabId, setActiveTabId] = useState(deepLinkTabId || persistedTab || 'dashboard');
  const [tabGroup, setTabGroup] = useState(persistedGroup);
  // activeSubId MUST be declared before scrollSlot below references it (TDZ fix · 2026-06-08).
  // Was previously at line ~6084 · operator hit "Cannot access 'activeSubId' before initialization" crash.
  const [activeSubId, setActiveSubId] = useState(subParam || null);
  // Per-(proc, tab, sub) scroll preservation. The workspace lives inside <main>
  // which scrolls — saving its scrollTop per (tab, sub) lets the operator come
  // back to the same vertical position when refreshing or switching sub-tabs.
  const scrollKey = `insur.scroll.${params.deptId || '_'}.${params.processId || '_'}`;
  const scrollSlot = `${activeTabId}:${activeSubId || '_'}`;
  // Save on scroll
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    let timeout = null;
    const save = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          const stored = JSON.parse(localStorage.getItem(scrollKey) || '{}');
          stored[scrollSlot] = main.scrollTop;
          localStorage.setItem(scrollKey, JSON.stringify(stored));
        } catch (e) { /* swallow */ }
      }, 150);
    };
    main.addEventListener('scroll', save, { passive: true });
    return () => {
      main.removeEventListener('scroll', save);
      clearTimeout(timeout);
    };
  }, [scrollKey, scrollSlot]);
  // Restore when (tab, sub) changes · OP-3 B fix (2026-06-13): force
  // instant scroll (no animation) so operator doesn't see the "sliding
  // up" sensation when clicking different tabs/sub-tabs. The smooth
  // scroll animation made the viewport visibly slide; instant snap is
  // crisp and predictable.
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    try {
      const stored = JSON.parse(localStorage.getItem(scrollKey) || '{}');
      const saved = stored[scrollSlot];
      const target = typeof saved === 'number' ? saved : 0;
      // Defer until layout settles
      requestAnimationFrame(() => {
        // Use scrollTo with behavior:'instant' to bypass any CSS
        // scroll-behavior:smooth that may be in effect.
        main.scrollTo({ top: target, left: 0, behavior: 'instant' });
      });
    } catch (e) { /* swallow */ }
  }, [scrollSlot, scrollKey]);

  // Journey progress — track tabs AND sub-tabs the operator has visited (per process).
  const journeyKey = `insur.journey.${params.deptId || '_'}.${params.processId || '_'}`;
  const subJourneyKey = `insur.journey.sub.${params.deptId || '_'}.${params.processId || '_'}`;
  const [exploredTabs, setExploredTabs] = useState(() => {
    try {
      const raw = localStorage.getItem(journeyKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  });
  const [exploredSubTabs, setExploredSubTabs] = useState(() => {
    try {
      const raw = localStorage.getItem(subJourneyKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  });
  useEffect(() => {
    setExploredTabs((prev) => {
      if (prev.has(activeTabId)) return prev;
      const next = new Set(prev);
      next.add(activeTabId);
      try { localStorage.setItem(journeyKey, JSON.stringify([...next])); } catch (e) { /* swallow */ }
      return next;
    });
  }, [activeTabId, journeyKey]);
  // Track (tab, sub) pairs the operator has visited
  useEffect(() => {
    if (!activeSubId) return;
    const key = `${activeTabId}:${activeSubId}`;
    setExploredSubTabs((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem(subJourneyKey, JSON.stringify([...next])); } catch (e) { /* swallow */ }
      return next;
    });
  }, [activeTabId, activeSubId, subJourneyKey]);
  // Persist active state
  useEffect(() => {
    try { localStorage.setItem('insur.lastTab', activeTabId); } catch (e) { /* swallow */ }
  }, [activeTabId]);
  useEffect(() => {
    try { localStorage.setItem('insur.lastTabGroup', tabGroup); } catch (e) { /* swallow */ }
  }, [tabGroup]);
  // Role as explicit state — listens for insur:role-changed events from
  // BankHeader and updates so useMemo deps stay clean.
  const [activeRole, setActiveRole] = useState(() => getCurrentRole());
  useEffect(() => {
    const handler = () => setActiveRole(getCurrentRole());
    window.addEventListener('insur:role-changed', handler);
    return () => window.removeEventListener('insur:role-changed', handler);
  }, []);
  useEffect(() => {
    const handler = (event) => {
      const { tab, sub, focus } = event.detail || {};
      const targetTabId = normalizeTabId(tab);
      const next = new URLSearchParams(window.location.search);
      if (targetTabId) {
        next.set('tab', targetTabId);
        setActiveTabId(targetTabId);
      }
      if (sub) {
        next.set('sub', sub);
        setActiveSubId(sub);
      } else {
        next.delete('sub');
        setActiveSubId(null);
      }
      if (focus) next.set('focus', focus);
      setSearchParams(next, { replace: false });
      if (sub) {
        setTimeout(() => setActiveSubId(sub), 0);
      }
    };
    window.addEventListener('insur:workspace-jump', handler);
    return () => window.removeEventListener('insur:workspace-jump', handler);
  }, [setSearchParams]);
  // Command palette — Cmd+K / Ctrl+K opens fuzzy jump
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Keyboard help overlay — Cmd+/ shows all shortcuts
  const [helpOpen, setHelpOpen] = useState(false);
  // 5-second rule overlay — Cmd+Shift+? checks the 6 critical questions
  const [fiveSecOpen, setFiveSecOpen] = useState(false);
  // Clear journey progress (per-process) — wipes explored tab + sub-tab sets
  const clearJourney = () => {
    setExploredTabs(new Set());
    setExploredSubTabs(new Set());
    try {
      localStorage.removeItem(journeyKey);
      localStorage.removeItem(subJourneyKey);
    } catch (e) { /* swallow */ }
  };
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        clearJourney();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setFiveSecOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        setFiveSecOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [journeyKey, subJourneyKey]);
  const visibleTabs = useMemo(() => {
    // 1. Apply role filter (Business User sees fewer tabs than Engineer)
    const allowedByRole = getVisibleTabIdsForRole(activeRole);
    const roleFiltered = allowedByRole
      ? TABS.filter((t) => allowedByRole.has(t.id))
      : TABS;
    // 2. Apply the Plan/Build/Run lens on top. Explicit shared URLs can still
    // reveal their target tab so deep links do not snap away from the requested view.
    if (tabGroup === 'all') return roleFiltered;
    const groupKey = tabGroup === 'plan'  ? '📋 Plan'
                  : tabGroup === 'build' ? '🛠 Build'
                  : '🚀 Run';
    const allowedByGroup = new Set(TAB_GROUPS[groupKey] || []);
    const groupedTabs = roleFiltered.filter((t) => allowedByGroup.has(t.id));
    const deepLinkedTab = roleFiltered.find((t) => t.id === deepLinkTabId);
    if (deepLinkedTab && !groupedTabs.some((t) => t.id === deepLinkedTab.id)) {
      return [...groupedTabs, deepLinkedTab];
    }
    return groupedTabs;
  }, [tabGroup, activeRole, deepLinkTabId]);
  // Auto-snap to first visible tab when role filter hides current active tab.
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);
  // activeSubId moved to earlier in component (above scrollSlot) to fix TDZ crash.
  // Persist active tab/sub-tab to URL so refresh and shared links keep the exact view.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const currentFocusForUrl = new URLSearchParams(window.location.search).get('focus');
    if (currentFocusForUrl) next.set('focus', currentFocusForUrl);
    if (activeTabId) next.set('tab', activeTabId);
    else next.delete('tab');

    const activeTabForUrl = TABS.find((t) => t.id === activeTabId);
    const validSubsForUrl = getVisibleSubTabsForRole(
      activeTabForUrl?.id,
      activeTabForUrl?.subTabs || [],
      activeRole
    );
    const activeSubIsValid = !!activeSubId && validSubsForUrl.some((s) => s.id === activeSubId);
    if (activeSubIsValid) next.set('sub', activeSubId);
    else if (!activeSubId) next.delete('sub');

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeTabId, activeSubId, activeRole, searchParams, setSearchParams]);

  const dept = bp.department_catalog?.find((d) => String(d.id) === params.deptId);
  const proc = dept?.processes?.find((p) => slug(p.name) === params.processId);
  const domainLabel = domainMeta(canonicalDomainId(params.domain))?.label || params.domain;

  // When ?tab=... or ?sub=... changes (e.g., maroon menu or shared URL), jump to the canonical owner.
  useEffect(() => {
    const targetTabId = resolveDeepLinkTabId(rawTabParam, subParam);
    if (targetTabId) setActiveTabId(targetTabId);
  }, [rawTabParam, subParam]);

  // Reset sub-tab when tab changes — honor ?sub=... if it matches a visible
  // sub-tab on the new active tab; otherwise default to first role-visible.
  useEffect(() => {
    const tab = TABS.find((t) => t.id === activeTabId);
    if (!tab) { setActiveSubId(null); return; }
    const subs = getVisibleSubTabsForRole(tab.id, tab.subTabs || [], activeRole);
    if (subParam && subs.find((s) => s.id === subParam)) {
      setActiveSubId(subParam);
    } else {
      setActiveSubId(subs[0]?.id || null);
    }
  }, [activeTabId, activeRole, subParam]);

  // Hooks MUST be called unconditionally before any early return (rules-of-hooks).
  const windowW = useWindowWidth();
  const isCompact = windowW < 700;
  const isTablet  = windowW < 1024 && !isCompact;
  const breakpoint = useMemo(() => ({ isCompact, isTablet }), [isCompact, isTablet]);

  if (!dept || !proc) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', background: '#fff',
        border: '1px solid #e2e8f0', borderRadius: 8,
      }}>
        <p style={{ color: '#64748b' }}>Pick a Main Process from the blue menu.</p>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];
  const visibleSubTabs = getVisibleSubTabsForRole(activeTab.id, activeTab.subTabs, activeRole);
  const activeSub = visibleSubTabs.find((s) => s.id === activeSubId) || visibleSubTabs[0] || null;

  return (
    <div>
      {/* ROW 1: Context breadcrumb */}
      <div style={{
        padding: '8px 14px', marginBottom: 8,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
        fontSize: 12, color: '#475569',
      }}>
        <span style={{ color: '#94a3b8' }}>Context: </span>
        <strong style={{ color: '#0f172a' }}>{dept.name}</strong>
        <span style={{ margin: '0 6px', color: '#94a3b8' }}>&gt;</span>
        <strong style={{ color: '#0f172a' }}>{domainLabel}</strong>
        <span style={{ margin: '0 6px', color: '#94a3b8' }}>&gt;</span>
        <strong style={{ color: '#0f172a' }}>{proc.name}</strong>
      </div>

      {/* ROW 1.5: Focus banner — surfaces maroon sub-menu selection on workspace */}
      {focusKind && focusLabel && (
        <div style={{
          padding: '12px 16px', marginBottom: 12,
          background: `${KIND_COLOR[focusKind] || '#7f1d1d'}11`,
          border: `1px solid ${KIND_COLOR[focusKind] || '#7f1d1d'}66`,
          borderLeft: `4px solid ${KIND_COLOR[focusKind] || '#7f1d1d'}`,
          borderRadius: 6,
          fontSize: 12, color: '#0f172a',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4,
            background: KIND_COLOR[focusKind] || '#7f1d1d', color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {KIND_LABEL[focusKind] || 'Focus'}
          </span>
          <strong style={{ fontSize: 15, color: '#0f172a' }}>{focusLabel}</strong>
          <span style={{ color: '#64748b', fontSize: 11 }}>
            selected from sub-menu →
          </span>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('focus');
              setSearchParams(next, { replace: false });
            }}
            style={{
              marginLeft: 'auto',
              minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 600,
              background: '#fff', color: '#475569',
              border: '1px solid #cbd5e1', borderRadius: 4,
              cursor: 'pointer',
            }}
          >Clear focus</button>
        </div>
      )}

      {/* ROW 2a: Persistent ACTIVE TAB pin — operator 2026-06-05:
          "top tab is important .. so showcase which tab has been select on top".
          Stays visible even when tab strip is scrolled. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: isCompact ? 'wrap' : 'nowrap',
        padding: '12px 16px', marginBottom: 0,
        minWidth: 0,
        background: `linear-gradient(90deg, ${activeTab.color} 0%, ${activeTab.color}cc 100%)`,
        borderTopLeftRadius: 6, borderTopRightRadius: 6,
        color: '#fff',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          opacity: 0.85,
        }}>📌 Active Tab</span>
        <strong style={{ fontSize: 14, color: '#fff' }}>{activeTab.label}</strong>
        {activeSub && (
          <>
            <span style={{ opacity: 0.6 }}>›</span>
            <strong style={{ fontSize: 13, color: '#fff', opacity: 0.95 }}>{activeSub.label}</strong>
          </>
        )}
        <span style={{
          marginLeft: isCompact ? 0 : 'auto',
          width: isCompact ? '100%' : 'auto',
          display: 'flex', alignItems: 'center', gap: 6,
          flexWrap: 'wrap', justifyContent: isCompact ? 'flex-start' : 'flex-end',
          minWidth: 0,
        }}>
          <button type="button"
            onClick={() => setPaletteOpen(true)}
            title="Jump to any tab — Cmd+K / Ctrl+K"
            style={{
              minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.25)', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>🔍 Jump <kbd style={{
              background: 'rgba(255,255,255,0.3)', padding: '0 4px', borderRadius: 2,
              fontSize: 9, fontFamily: 'monospace',
            }}>⌘K</kbd></button>
          <button type="button"
            onClick={() => setHelpOpen(true)}
            title="Keyboard shortcuts — Cmd+/ / Ctrl+/"
            aria-label="Open keyboard shortcuts help"
            style={{
              minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.25)', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>⌨ <kbd style={{
              background: 'rgba(255,255,255,0.3)', padding: '0 4px', borderRadius: 2,
              fontSize: 9, fontFamily: 'monospace',
            }}>⌘/</kbd></button>
          <button type="button"
            onClick={() => setFiveSecOpen(true)}
            title="5-second rule check — verify operator can answer the 6 critical questions"
            aria-label="Open 5-second rule check"
            style={{
              minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.25)', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>⏱ <kbd style={{
              background: 'rgba(255,255,255,0.3)', padding: '0 4px', borderRadius: 2,
              fontSize: 9, fontFamily: 'monospace',
            }}>⌘⇧?</kbd></button>
          <span style={{
            padding: '2px 8px', borderRadius: 3,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            fontSize: 10, fontWeight: 700,
          }}>
            {TABS.findIndex((t) => t.id === activeTabId) + 1} of {TABS.length}
          </span>
          <span title={`${exploredTabs.size} of ${visibleTabs.length} tabs explored this session for this process`} style={{
            padding: '2px 8px', borderRadius: 3,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            fontSize: 10, fontWeight: 700,
          }}>
            🧭 {exploredTabs.size}/{visibleTabs.length} explored
          </span>
          {exploredTabs.size > 0 && (
            <button type="button"
              onClick={clearJourney}
              title="Clear journey progress — Cmd+Shift+E"
              aria-label="Clear journey progress for this process"
              style={{
                minHeight: 30,
                padding: '6px 10px', borderRadius: 3,
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                fontSize: 11, fontWeight: 700,
                border: 'none', cursor: 'pointer',
              }}>🗑 Clear</button>
          )}
          <button type="button"
            onClick={() => {
              const idx = TABS.findIndex((t) => t.id === activeTabId);
              if (idx > 0) setActiveTabId(TABS[idx - 1].id);
            }}
            disabled={TABS.findIndex((t) => t.id === activeTabId) === 0}
            title="Previous tab"
            style={{
              minWidth: 32, minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
            }}>◀</button>
          <button type="button"
            onClick={() => {
              const idx = TABS.findIndex((t) => t.id === activeTabId);
              if (idx < TABS.length - 1) setActiveTabId(TABS[idx + 1].id);
            }}
            disabled={TABS.findIndex((t) => t.id === activeTabId) === TABS.length - 1}
            title="Next tab"
            style={{
              minWidth: 32, minHeight: 30,
              padding: '6px 10px', fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
            }}>▶</button>
        </span>
      </div>
      {/* ROW 2a.5: Supergroup chips — Plan / Build / Run filter to reduce overwhelm */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexWrap: 'wrap',
        padding: '10px 12px', background: '#f1f5f9',
        borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
        fontSize: 11,
      }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
          🔭 Lens:
        </span>
        {[
          { id: 'all',     label: '👀 All',     desc: 'Show every tab' },
          { id: 'plan',    label: '📋 Plan',    desc: 'README · Overview · PM · Story · Demo · Value' },
          { id: 'build',   label: '🛠 Build',   desc: 'Process · Data · Analytics · AI · Test · Job · Note' },
          { id: 'run',     label: '🚀 Run',     desc: 'Dashboard · Ops · Reports · Meet · Incident · ExpAI · ResAI · GovAI · CompAI' },
        ].map((g) => {
          const isActive = tabGroup === g.id;
          return (
            <button key={g.id} type="button"
              onClick={() => setTabGroup(g.id)}
              title={g.desc}
              style={{
                minHeight: 30,
                padding: '6px 10px', fontSize: 11, fontWeight: 700,
                background: isActive ? '#dbeafe' : '#fff',
                color: isActive ? '#1d4ed8' : '#475569',
                border: '1px solid ' + (isActive ? '#2563eb' : '#cbd5e1'),
                borderRadius: 4, cursor: 'pointer',
              }}>{g.label}</button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>
          showing <strong style={{ color: '#0f172a' }}>{visibleTabs.length}</strong> of {TABS.length} tabs
        </span>
      </div>
      {/* ROW 2b: tab strip. On narrow screens (< 700px) collapse to a select dropdown. */}
      {isCompact ? (
        <div style={{
          padding: '8px 10px',
          background: '#fff',
          border: '1px solid #e2e8f0', borderTop: 'none', borderBottom: 'none',
        }}>
          <select
            value={activeTabId}
            onChange={(e) => setActiveTabId(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px',
              fontSize: 14, fontWeight: 700,
              background: '#fff', color: activeTab.color,
              border: `2px solid ${activeTab.color}`,
              borderRadius: 4,
            }}
          >
            {visibleTabs.map((t) => {
              const isExp = exploredTabs.has(t.id) && t.id !== activeTabId;
              return (
                <option key={t.id} value={t.id}>{isExp ? '✓ ' : ''}{t.label}</option>
              );
            })}
          </select>
        </div>
      ) : (
      <div
        role="tablist"
        aria-label="Workspace tabs"
        style={{
          display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 6,
          marginBottom: 0,
          background: '#fff',
          border: '1px solid #e2e8f0', borderTop: 'none', borderBottom: 'none',
          padding: '8px 8px 0',
        }}
      >
        {visibleTabs.map((t) => {
          const isActive = activeTabId === t.id;
          const isExplored = exploredTabs.has(t.id);
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => {
                if (el && isActive) {
                  // auto-scroll active tab into view
                  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
                }
              }}
              onClick={() => setActiveTabId(t.id)}
              onKeyDown={(e) => {
                // Left/Right arrow keys move focus between tabs
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const idx = visibleTabs.findIndex((v) => v.id === t.id);
                  const next = e.key === 'ArrowRight'
                    ? visibleTabs[(idx + 1) % visibleTabs.length]
                    : visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length];
                  setActiveTabId(next.id);
                }
              }}
              data-active-tab={isActive ? '1' : undefined}
              data-explored={isExplored ? '1' : undefined}
              title={isExplored && !isActive ? `${t.label} — already explored` : t.label}
              style={{
                padding: isActive ? '13px 22px' : '11px 18px',
                fontSize: isActive ? 15 : 14, fontWeight: isActive ? 800 : 600,
                background: isActive ? t.color : (isExplored ? `${t.color}14` : 'transparent'),
                color: isActive ? '#fff' : (isExplored ? t.color : '#475569'),
                border: 'none',
                borderTop: isActive ? `3px solid ${t.color}` : '3px solid transparent',
                borderTopLeftRadius: 4, borderTopRightRadius: 4,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                boxShadow: isActive ? `0 -2px 0 ${t.color}, 0 2px 8px ${t.color}55` : 'none',
              }}
            >
              {isActive && <span style={{ marginRight: 4 }}>●</span>}
              {!isActive && isExplored && <span style={{ marginRight: 6, opacity: 0.7 }}>✓</span>}
              {t.label}
            </button>
          );
        })}
      </div>
      )}

      {/* ROW 3: Sub-tabs (only when active tab has them, filtered by role).
          On narrow screens, replaced by a select dropdown to save horizontal space. */}
      {visibleSubTabs.length > 0 && isCompact ? (
        <div style={{
          padding: '10px 12px',
          background: `${activeTab.color}11`,
          borderLeft: `1px solid #e2e8f0`, borderRight: `1px solid #e2e8f0`,
        }}>
          <select
            value={activeSubId || ''}
            onChange={(e) => setActiveSubId(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px',
              fontSize: 12, fontWeight: 600,
              background: '#fff', color: activeTab.color,
              border: `1px solid ${activeTab.color}66`, borderRadius: 4,
            }}
          >
            {visibleSubTabs.map((s) => {
              const isExp = exploredSubTabs.has(`${activeTab.id}:${s.id}`) && s.id !== activeSubId;
              return (
                <option key={s.id} value={s.id}>{isExp ? '✓ ' : ''}{s.label}</option>
              );
            })}
          </select>
        </div>
      ) : visibleSubTabs.length > 0 && (
        <div role="tablist" aria-label="Sub-tabs" style={{
          display: 'flex', flexWrap: 'wrap', gap: 0,
          marginBottom: 0,
          background: `${activeTab.color}11`,
          borderLeft: `1px solid #e2e8f0`, borderRight: `1px solid #e2e8f0`,
          padding: '6px 8px',
        }}>
          {visibleSubTabs.map((s) => {
            const isActive = activeSubId === s.id;
            const isExplored = exploredSubTabs.has(`${activeTab.id}:${s.id}`);
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                aria-label={`Sub-tab ${s.label}${isExplored && !isActive ? ' (already explored)' : ''}`}
                onClick={() => setActiveSubId(s.id)}
                title={isExplored && !isActive ? `${s.label} — already explored` : s.label}
                style={{
                  minHeight: 30,
                  padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  background: isActive ? '#fff' : (isExplored ? `${activeTab.color}22` : 'transparent'),
                  color: isActive ? activeTab.color : (isExplored ? activeTab.color : '#475569'),
                  border: isActive ? `1px solid ${activeTab.color}66` : '1px solid transparent',
                  borderRadius: 4, cursor: 'pointer',
                  marginRight: 6,
                }}
              >
                {!isActive && isExplored && <span style={{ marginRight: 3, opacity: 0.7 }}>✓</span>}
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ROW 4+: Content body — subtle slate-50 background so cards/ribbons
          inside it have a clearly different surface than the page itself. */}
      <div style={{
        background: '#eef2f7',
        border: '1px solid #cbd5e1',
        borderTop: 'none',
        borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
        padding: isCompact ? 16 : 24,
      }}>
        {/* All universal pieces (Identity banner · alignment trail · chips · focus detail ·
            AS-IS/TO-BE/ROI · IPO · Model/Data/Accuracy · Journey · Visualization · Flow ·
            Summary · Outcome · Action status · To-Do · Recommendations · Comments ·
            History · Audit · Timestamp · Metadata · Export) are inside TabFrame.
            renderContent() returns ONLY the sub-tab Components grid.
            FocusDetailCard is no longer rendered separately — its info now appears
            in TabHeaderRibbon's "Focus entry detail" section. */}
        <BreakpointContext.Provider value={breakpoint}>
        <TabFrame
          tab={activeTab} sub={activeSub} proc={proc} dept={dept}
          focusKind={focusKind} focusLabel={focusLabel}
          allTabs={TABS} onJump={setActiveTabId}
          onFocus={(aiType) => {
            const next = new URLSearchParams(searchParams);
            if (aiType) {
              next.set('focus', `ai:${aiType}`);
              next.set('tab', 'ai');
            } else {
              next.delete('focus');
            }
            setSearchParams(next);
          }}
        >
          {renderContent({ tab: activeTab, sub: activeSub, proc, dept, bp, focusKind, focusLabel })}
        </TabFrame>
        </BreakpointContext.Provider>
      </div>
      {/* Cmd+K command palette — fuzzy jump to any tab + sub-tab */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onJump={(tabId, subId) => {
          setActiveTabId(tabId);
          if (subId) {
            // Set after the tab-change effect resets sub-id to first
            setTimeout(() => setActiveSubId(subId), 0);
          }
        }}
      />
      {/* Cmd+/ keyboard help overlay */}
      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <FiveSecRuleOverlay
        open={fiveSecOpen}
        onClose={() => setFiveSecOpen(false)}
        tab={activeTab}
        sub={activeSub}
        proc={proc}
        dept={dept}
        profile={TAB_PROFILES[activeTabId]}
        visibleTabs={visibleTabs}
        onJump={(tabId) => { setActiveTabId(tabId); setFiveSecOpen(false); }}
      />
    </div>
  );
}

// Keyboard help overlay — surfaces every shortcut the workspace honors.
// Triggered by Cmd+/ or Cmd+? (also a visible "?" button can call it).
// FiveSecRuleOverlay — operator §74.7: within 5 seconds the user must answer
// 6 critical questions. This overlay shows which are answered above the fold
// for the active tab, with a pass/fail check per question + sample evidence.
// Shared helper — runs the same per-profile question set against any tab
// without rendering. Lets the "Run all tabs" mode score every visible tab.
function evaluateFiveSec(tab, sub, proc, dept, profile) {
  const ctx = {
    passed: !!(tab && proc && dept),
  };
  const profileChip = { passed: !!(profile && profile.type) };
  if (profile?.type === 'information') {
    return [
      ctx.passed,
      profileChip.passed,
      !!(proc?.readme || proc?.demo_story),
      !!profile?.emphasis,
      true,
      true,
    ];
  }
  if (profile?.type === 'action') {
    return [ctx.passed, profileChip.passed, true, true, true, !!read(proc, 'incident_queue.escalated')];
  }
  if (profile?.type === 'visualization') {
    return [ctx.passed, profileChip.passed, true, true, !!read(proc, 'visualization.drill_down'), false];
  }
  if (profile?.type === 'decision') {
    return [
      ctx.passed,
      !!read(proc, 'governance_ai.decision_layer', 'responsible_ai.fairness_gate'),
      !!read(proc, 'governance_ai.confidence_tiers'),
      true,
      !!read(proc, 'as_is_to_be.risk', 'security.threat_model'),
      true,
    ];
  }
  return [
    ctx.passed,
    profileChip.passed,
    !!(TAB_CHARTER[tab?.id]?.why || profile?.intent),
    !!read(proc, 'data_process.input', 'manual_process.tools'),
    !!read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary'),
    true,
  ];
}

// Workspace-wide 5-sec audit — runs the per-profile question set against
// every visible tab and presents a sortable pass-rate table.
// Maturity scoring per global §75 (Phases 31–45).
// Maps the workspace pass-rate to one of 15 maturity levels.
// Per §75.2 — most enterprises operate at levels 2–4; top AI-native at 8–10.
function maturityLevelFor(passRate, greenCount, totalTabs) {
  if (totalTabs === 0) return { level: 1, label: 'AI Projects', color: '#dc2626' };
  // Use a blend of pass rate + green ratio
  const greenRatio = greenCount / totalTabs;
  const score = passRate * 0.5 + greenRatio * 100 * 0.5;
  // Maturity bands per §75.2 (15 levels)
  const bands = [
    { max:  20, level:  1, label: 'AI Projects',                       color: '#dc2626' },
    { max:  28, level:  2, label: 'AI Programs',                       color: '#dc2626' },
    { max:  36, level:  3, label: 'AI Platform',                       color: '#ef4444' },
    { max:  44, level:  4, label: 'AI Products',                       color: '#f59e0b' },
    { max:  52, level:  5, label: 'AI Portfolio',                      color: '#f59e0b' },
    { max:  60, level:  6, label: 'AI Operating Model',                color: '#f59e0b' },
    { max:  68, level:  7, label: 'AI Control Tower',                  color: '#eab308' },
    { max:  76, level:  8, label: 'Enterprise Knowledge Fabric',       color: '#84cc16' },
    { max:  82, level:  9, label: 'Enterprise Decision Intelligence',  color: '#16a34a' },
    { max:  87, level: 10, label: 'Enterprise Digital Twin',           color: '#16a34a' },
    { max:  91, level: 11, label: 'Agentic Enterprise',                color: '#0d9488' },
    { max:  94, level: 12, label: 'Autonomous Enterprise',             color: '#0891b2' },
    { max:  97, level: 13, label: 'Cognitive Enterprise',              color: '#7c3aed' },
    { max:  99, level: 14, label: 'Self-Optimizing Enterprise',        color: '#7c3aed' },
    { max: 999, level: 15, label: 'Adaptive Enterprise Ecosystem',     color: '#2563eb' },
  ];
  return bands.find((b) => score <= b.max) || bands[bands.length - 1];
}

function WorkspaceWideAudit({ visibleTabs, proc, dept, onJump, activeTabId }) {
  const auditLogKey = `insur.audit.${dept?.id || '_'}.${(proc?.name || '_').replace(/[^a-z0-9]+/gi, '-')}`;
  const [sortBy, setSortBy] = useState('score');     // 'tab' | 'type' | 'score'
  const [sortDir, setSortDir] = useState('asc');     // 'asc' | 'desc'
  const [showTrend, setShowTrend] = useState(false);
  const [auditLog, setAuditLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(auditLogKey) || '[]'); }
    catch (e) { return []; }
  });

  if (!visibleTabs || visibleTabs.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 24 }}>
        No visible tabs to audit.
      </div>
    );
  }
  let rows = visibleTabs.map((t) => {
    const profile = TAB_PROFILES[t.id];
    const results = evaluateFiveSec(t, null, proc, dept, profile);
    const passCount = results.filter(Boolean).length;
    return {
      tab: t,
      profile,
      typeMeta: profile ? TYPE_META[profile.type] : null,
      passCount,
      score: Math.round((passCount / results.length) * 100),
      results,
    };
  });
  // Sort by selected column
  rows.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'tab')  cmp = a.tab.label.localeCompare(b.tab.label);
    if (sortBy === 'type') cmp = (a.profile?.type || '').localeCompare(b.profile?.type || '');
    if (sortBy === 'score') cmp = a.score - b.score;
    return sortDir === 'asc' ? cmp : -cmp;
  });
  // Persist audit snapshot
  const snapshot = () => {
    const passRate = Math.round(
      (rows.reduce((sum, r) => sum + r.passCount, 0) / (rows.length * 6)) * 100
    );
    const green = rows.filter((r) => r.score >= 84).length;
    const maturity = maturityLevelFor(passRate, green, rows.length);
    const entry = {
      at: Date.now(),
      passRate,
      green,
      amber: rows.filter((r) => r.score >= 50 && r.score < 84).length,
      red:   rows.filter((r) => r.score < 50).length,
      total: rows.length,
      maturity_level: maturity.level,
      maturity_label: maturity.label,
    };
    const next = [...auditLog, entry].slice(-20); // keep last 20
    setAuditLog(next);
    try { localStorage.setItem(auditLogKey, JSON.stringify(next)); } catch (e) { /* swallow */ }
  };
  const clearLog = () => {
    setAuditLog([]);
    try { localStorage.removeItem(auditLogKey); } catch (e) { /* swallow */ }
  };
  const setSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir(col === 'score' ? 'asc' : 'asc'); }
  };
  const sortIndicator = (col) => sortBy === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  const passRate = Math.round(
    (rows.reduce((sum, r) => sum + r.passCount, 0) / (rows.length * 6)) * 100
  );
  const greenCount = rows.filter((r) => r.score >= 84).length;
  const amberCount = rows.filter((r) => r.score >= 50 && r.score < 84).length;
  const redCount   = rows.filter((r) => r.score < 50).length;
  return (
    <div>
      {/* Workspace-wide summary + action buttons */}
      <div style={{
        marginBottom: 12, padding: '10px 12px',
        background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6,
      }}>
        {/* Maturity-level card per global §75.2 */}
        {(() => {
          const maturity = maturityLevelFor(passRate, greenCount, rows.length);
          return (
            <div style={{
              marginBottom: 8, padding: '10px 12px',
              background: `${maturity.color}11`,
              border: `1px solid ${maturity.color}55`,
              borderLeft: `4px solid ${maturity.color}`,
              borderRadius: 4,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }} title={`Per global §75.2 (Phases 31–45). Most enterprises operate at L2–4. Top AI-native at L8–10.`}>
              <span style={{
                padding: '4px 12px', borderRadius: 3,
                background: maturity.color, color: '#fff',
                fontSize: 16, fontWeight: 800,
              }}>L{maturity.level}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 9, color: '#64748b', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Maturity level · per global §75.2 (Phases 31–45)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: maturity.color }}>
                  {maturity.label}
                </div>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                most enterprises: L2–4 · top AI-native: L8–10
              </span>
            </div>
          );
        })()}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8,
          marginBottom: 8,
        }}>
          {[
            { label: 'Workspace pass rate', value: passRate + '%',     color: passRate >= 84 ? '#16a34a' : passRate >= 50 ? '#f59e0b' : '#dc2626' },
            { label: '✓ Green tabs',        value: `${greenCount}/${rows.length}`, color: '#16a34a' },
            { label: '⚠ Amber tabs',        value: `${amberCount}/${rows.length}`, color: '#f59e0b' },
            { label: '✗ Red tabs',          value: `${redCount}/${rows.length}`,   color: '#dc2626' },
          ].map((c) => (
            <div key={c.label} style={{
              padding: '6px 10px', background: '#fff',
              border: `1px solid ${c.color}55`,
              borderLeft: `4px solid ${c.color}`,
              borderRadius: 4,
            }}>
              <div style={{
                fontSize: 9, color: '#64748b', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button"
            onClick={snapshot}
            title="Save this audit result so you can track pass-rate evolution"
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 700,
              background: '#f8fafc', color: '#1f2937', border: '1px solid #e5e7eb',
              borderRadius: 3, cursor: 'pointer',
            }}>📸 Snapshot</button>
          <button type="button"
            onClick={() => setShowTrend((v) => !v)}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 700,
              background: showTrend ? '#dbeafe' : '#fff',
              color: showTrend ? '#1d4ed8' : '#475569',
              border: '1px solid ' + (showTrend ? '#2563eb' : '#cbd5e1'),
              borderRadius: 3, cursor: 'pointer',
            }}>📈 Trend ({auditLog.length})</button>
          {auditLog.length > 0 && (
            <button type="button"
              onClick={clearLog}
              style={{
                padding: '8px 12px', fontSize: 12, fontWeight: 700,
                background: '#fff', color: '#dc2626',
                border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer',
              }}>🗑 Clear log</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>
            log persists per (dept, process) · last 20 snapshots
          </span>
        </div>
      </div>

      {/* Trend view */}
      {showTrend && (
        <div style={{
          marginBottom: 12, padding: 10,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
        }}>
          {auditLog.length === 0 ? (
            <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: 12 }}>
              No snapshots yet. Click <strong>📸 Snapshot</strong> to record the current pass rate.
            </div>
          ) : (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
              }}>📈 Pass-rate over last {auditLog.length} snapshot(s)</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={auditLog.map((e, i) => ({
                    n: `#${i + 1}`,
                    rate: e.passRate,
                    green: e.green,
                    red: e.red,
                  }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="n" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="rate"  stroke="#2563eb" strokeWidth={2} name="Pass %" />
                  <Line type="monotone" dataKey="green" stroke="#16a34a" strokeWidth={1.5} name="Green tabs" />
                  <Line type="monotone" dataKey="red"   stroke="#dc2626" strokeWidth={1.5} name="Red tabs" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: 6, fontSize: 9, color: '#94a3b8', fontStyle: 'italic',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Earliest: {new Date(auditLog[0].at).toLocaleString()}</span>
                <span>Latest: {new Date(auditLog[auditLog.length - 1].at).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}
      {/* Per-tab table — click headers to sort */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {[
              { id: 'tab',   label: 'Tab',     sortable: true },
              { id: 'type',  label: 'Type',    sortable: true },
              { id: null,    label: 'Pass / 6', sortable: false },
              { id: 'score', label: 'Score',   sortable: true },
              { id: null,    label: '',        sortable: false },
            ].map((h) => (
              <th key={h.label || 'jump'} style={{
                padding: '6px 8px', textAlign: 'left',
                color: '#475569', fontWeight: 700, fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid #e2e8f0',
                cursor: h.sortable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={() => h.sortable && setSort(h.id)}
              >
                {h.label}{h.sortable && sortIndicator(h.id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = r.score >= 84 ? '#16a34a' : r.score >= 50 ? '#f59e0b' : '#dc2626';
            const isActive = r.tab.id === activeTabId;
            return (
              <tr key={r.tab.id} style={{
                borderBottom: '1px solid #f1f5f9',
                background: isActive ? '#f1f5f9' : '#fff',
              }}>
                <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 600 }}>
                  {isActive && <span style={{ color: r.tab.color, marginRight: 4 }}>●</span>}
                  {r.tab.label}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {r.typeMeta && (
                    <span style={{
                      padding: '1px 6px', borderRadius: 2,
                      background: `${r.typeMeta.color}22`, color: r.typeMeta.color,
                      fontSize: 10, fontWeight: 700,
                    }}>{r.typeMeta.icon} {r.typeMeta.label}</span>
                  )}
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11, color: '#0f172a' }}>
                  {r.results.map((p, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      width: 14, height: 14, marginRight: 2, borderRadius: 2,
                      background: p ? '#16a34a' : '#dc2626',
                      color: '#fff', fontSize: 9, fontWeight: 800,
                      lineHeight: '14px', textAlign: 'center',
                    }}>{p ? '✓' : '✗'}</span>
                  ))}
                  <span style={{ marginLeft: 6, color: '#64748b' }}>{r.passCount}/6</span>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{
                    padding: '1px 8px', borderRadius: 3,
                    background: `${c}22`, color: c,
                    fontSize: 11, fontWeight: 800,
                  }}>{r.score}/100</span>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <button type="button"
                    onClick={() => onJump && onJump(r.tab.id)}
                    style={{
                      padding: '2px 8px', fontSize: 10, fontWeight: 700,
                      background: '#fff', color: r.tab.color,
                      border: `1px solid ${r.tab.color}55`, borderRadius: 3, cursor: 'pointer',
                    }}>Jump →</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{
        marginTop: 10, padding: '6px 10px',
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4,
        fontSize: 10, color: '#92400e',
      }}>
        Sorted by score ascending — fix red tabs first. Jump button switches the workspace + closes this overlay.
      </div>
    </div>
  );
}

function FiveSecRuleOverlay({ open, onClose, tab, sub, proc, dept, profile, visibleTabs, onJump }) {
  const [mode, setMode] = useState('current');  // 'current' | 'workspace'
  useEffect(() => { if (open) setMode('current'); }, [open]);
  if (!open) return null;
  // Resolve evidence per question against the current tab state
  // Profile-aware: each type asks different "critical 6" questions.
  const evidence = (() => {
    const ctx = {
      passed: !!(tab && proc && dept),
      proof: tab && proc && dept
        ? `Identity banner shows ${dept.name} › ${proc.name} › ${tab.label}${sub ? ` › ${sub.label}` : ''}`
        : 'No active tab + process context — banner is empty',
    };
    const profileChip = {
      passed: !!(profile && profile.type),
      proof: profile
        ? `Profile chip: ${profile.type} · ${profile.info}/${profile.viz}/${profile.action} · primary user ${profile.primary_user}`
        : `No TAB_PROFILE entry for tab.id="${tab?.id}" — chip absent`,
    };
    // Per-type question sets
    if (profile?.type === 'information') {
      return [
        { q: 'Why am I here?', ...ctx },
        { q: 'What is this knowledge tab?', ...profileChip },
        { q: 'What knowledge exists?',
          passed: !!(proc?.readme || proc?.demo_story),
          proof: proc?.readme ? 'Knowledge Repository surfaces proc.readme + proc.demo_story' : 'No readme block — wire proc.readme.*' },
        { q: 'How is it organized?',
          passed: !!profile?.emphasis,
          proof: profile?.emphasis ? `Emphasis "${profile.emphasis}" renders the Knowledge Repository with 6 categories` : 'No emphasis section' },
        { q: 'What can I find / search?',
          passed: true,
          proof: 'Knowledge categories are clickable; entries reveal in drawer below' },
        { q: 'What\'s the latest?',
          passed: true,
          proof: 'Mock entries show recent timestamps; will swap to proc.notes.<cat> once wired' },
      ];
    }
    if (profile?.type === 'action') {
      return [
        { q: 'Why am I here?', ...ctx },
        { q: 'What is this action tab?', ...profileChip },
        { q: 'What\'s in the queue right now?',
          passed: true,
          proof: 'Kanban section renders 5 columns (Open / Assigned / Investigating / Fixing / Closed) with 12 mock items color-coded by severity' },
        { q: 'Who\'s working on what?',
          passed: true,
          proof: 'Each kanban card shows actor + severity chip; can drill to assignment' },
        { q: 'What can I do now?',
          passed: true,
          proof: 'Actions section PROMOTED above KPI+Viz — 8 buttons: Run · Export · Approve · Reject · Assign · Escalate · Create Test · Compare' },
        { q: 'What\'s escalated to me?',
          passed: !!read(proc, 'incident_queue.escalated'),
          proof: read(proc, 'incident_queue.escalated') ? 'Escalations bound' : 'Wire proc.incident_queue.escalated (mock kanban shows P1 items)' },
      ];
    }
    if (profile?.type === 'visualization') {
      return [
        { q: 'Why am I here?', ...ctx },
        { q: 'What is this dashboard?', ...profileChip },
        { q: 'What metric matters most?',
          passed: true,
          proof: 'Dashboard Grid shows 4 KPI tiles: Revenue Impact · Cost Saved · Productivity ↑ · Adoption' },
        { q: 'What\'s the trend?',
          passed: true,
          proof: '12-month revenue-vs-cost LineChart (recharts) rendered with up/down deltas per tile' },
        { q: 'Where can I drill down?',
          passed: !!read(proc, 'visualization.drill_down'),
          proof: read(proc, 'visualization.drill_down') ? 'Drill-down wired' : 'Wire proc.visualization.drill_down — currently chart click is no-op' },
        { q: 'Compare to what?',
          passed: false,
          proof: 'Comparison panel not present — could add tab-vs-tab or period-vs-period selector' },
      ];
    }
    if (profile?.type === 'decision') {
      return [
        { q: 'Why am I here?', ...ctx },
        { q: 'What\'s the call?',
          passed: !!read(proc, 'governance_ai.decision_layer', 'responsible_ai.fairness_gate'),
          proof: 'Decision Matrix shows 5-row confidence × action routing table' },
        { q: 'What\'s the confidence?',
          passed: !!read(proc, 'governance_ai.confidence_tiers'),
          proof: read(proc, 'governance_ai.confidence_tiers') ? 'Confidence tiers wired' : 'Wire proc.governance_ai.confidence_tiers' },
        { q: 'Who approves?',
          passed: true,
          proof: 'Approval Workflow visual: Business → Risk → Compliance → Architecture → Production' },
        { q: 'What\'s the risk?',
          passed: !!read(proc, 'as_is_to_be.risk', 'security.threat_model'),
          proof: read(proc, 'as_is_to_be.risk', 'security.threat_model') ? 'Risk bound' : 'Wire proc.security.threat_model — Decision Matrix risk column shows category only' },
        { q: 'Where\'s the audit?',
          passed: true,
          proof: 'Audit Trail section (collapsed) renders TabDatabaseOps + audit-row references throughout' },
      ];
    }
    // Mixed (default — operator's original 6)
    return [
      { q: 'Why am I here?', ...ctx },
      { q: 'What is this?', ...profileChip },
      { q: 'Why does it exist?',
        passed: !!(TAB_CHARTER[tab?.id]?.why || profile?.intent),
        proof: TAB_CHARTER[tab?.id]?.why
          ? `Business Objective: "${(TAB_CHARTER[tab?.id]?.why || '').slice(0, 80)}…"`
          : profile?.intent
            ? `Intent line: "${profile.intent}"`
            : 'No business-objective section, no intent line' },
      { q: 'What goes in?',
        passed: !!read(proc, 'data_process.input', 'manual_process.tools'),
        proof: read(proc, 'data_process.input', 'manual_process.tools')
          ? 'Input slot bound: proc.data_process.input has content'
          : 'Input slot empty — wire proc.data_process.input' },
      { q: 'What happens?',
        passed: !!read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary'),
        proof: read(proc, 'automatic_process.ai_workflow', 'automatic_process.summary')
          ? 'AI Logic + Process Flow have real content'
          : 'AI Logic slot empty — wire proc.automatic_process.ai_workflow' },
      { q: 'What can I do?',
        passed: true,
        proof: 'Actions section renders 8 documented buttons' },
    ];
  })();
  const passCount = evidence.filter((e) => e.passed).length;
  const score = Math.round((passCount / evidence.length) * 100);
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="fivesec-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(226, 232, 240, 0.78)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(680px, 100%)', maxHeight: '85vh', overflow: 'auto',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          padding: '14px 16px',
          background: score >= 84 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
        }}>
          <span style={{ fontSize: 22 }}>⏱</span>
          <div style={{ flex: 1 }}>
            <strong id="fivesec-title" style={{ fontSize: 16 }}>5-second rule check</strong>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {mode === 'current'
                ? 'Can a user answer the 6 critical questions on THIS tab in 5 seconds?'
                : `Audit all ${visibleTabs?.length || 0} visible tabs — workspace-wide pass rate.`}
            </div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 4,
            background: 'rgba(255,255,255,0.25)', fontSize: 18, fontWeight: 800,
          }}>{score}/100</div>
        </div>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: 4,
          padding: '8px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          {[
            { id: 'current',   label: '🎯 Current tab' },
            { id: 'workspace', label: '🌐 All visible tabs' },
          ].map((m) => {
            const active = mode === m.id;
            return (
              <button key={m.id} type="button"
                onClick={() => setMode(m.id)}
                style={{
                  padding: '8px 12px', fontSize: 12, fontWeight: 700,
                  background: active ? '#dbeafe' : '#fff',
                  color: active ? '#1d4ed8' : '#475569',
                  border: '1px solid ' + (active ? '#2563eb' : '#cbd5e1'),
                  borderRadius: 4, cursor: 'pointer',
                }}>{m.label}</button>
            );
          })}
        </div>
        <div style={{ padding: 16 }}>
          {mode === 'workspace' ? (
            <WorkspaceWideAudit
              visibleTabs={visibleTabs}
              proc={proc}
              dept={dept}
              onJump={onJump}
              activeTabId={tab?.id}
            />
          ) : (
          <>
          <div style={{
            marginBottom: 12, fontSize: 12, color: '#475569',
          }}>
            Currently viewing: <strong>{tab?.label}</strong>
            {sub && <> › <strong>{sub.label}</strong></>}
            {' '}on <strong>{proc?.name || '—'}</strong> ({dept?.name || '—'}).
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', '✓', 'Question', 'Evidence'].map((h) => (
                  <th key={h} style={{
                    padding: '6px 8px', textAlign: 'left',
                    color: '#475569', fontWeight: 700, fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid #e2e8f0',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: e.passed ? '#16a34a' : '#dc2626',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{e.passed ? '✓' : '✗'}</span>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 600 }}>{e.q}</td>
                  <td style={{ padding: '6px 8px', color: '#475569', fontSize: 11 }}>{e.proof}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            marginTop: 12, padding: '8px 10px',
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4,
            fontSize: 11, color: '#475569',
          }}>
            <strong>Pass threshold:</strong> ≥ 5/6 (83%). Below that, the layout fails the 5-second rule
            and the operator must wire missing blueprint fields. See global §74.7 of <code>~/.claude/policies/enterprise-ai-workspace-ui-canonical.md</code>.
          </div>
          </>
          )}
        </div>
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #e2e8f0',
          fontSize: 10, color: '#64748b', textAlign: 'right',
        }}>
          <kbd style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

function KeyboardHelpOverlay({ open, onClose }) {
  if (!open) return null;
  const groups = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['⌘', 'K'],          desc: 'Open command palette · fuzzy jump to any tab + sub-tab' },
        { keys: ['⌘', '/'],          desc: 'Open this keyboard help' },
        { keys: ['⌘', '⇧', '?'],     desc: '5-second rule check (per global §74.7)' },
        { keys: ['⌘', '⇧', 'E'],     desc: 'Clear journey progress for the current process' },
        { keys: ['←', '→'],          desc: 'Move between tabs when a tab is focused' },
        { keys: ['Tab'],             desc: 'Move keyboard focus through interactive elements' },
        { keys: ['Esc'],             desc: 'Close palette / help / modal / sub-menu' },
      ],
    },
    {
      title: 'Workspace actions',
      shortcuts: [
        { keys: ['Click ✓ Run'],      desc: 'Trigger the component\'s job (calls /api/v1/holy/components/run)' },
        { keys: ['Click 👁 View'],    desc: 'Open read-only detail for the component' },
        { keys: ['Click ✎ Edit'],     desc: 'Open the edit form modal · set a new value · submit through HITL' },
        { keys: ['Click ✓ Validate'], desc: 'Run validation (schema · drift · fairness · policy)' },
      ],
    },
    {
      title: 'View / state',
      shortcuts: [
        { keys: ['Lens chip'], desc: 'Switch between All · Plan · Build · Run lens (persists per session)' },
        { keys: ['Role switcher'], desc: 'Change role (Topbar) — tab + sub-tab visibility updates instantly' },
        { keys: ['Maroon menu click'], desc: 'Focus a Sub-Process / AI / Agent / App / Master Data on the workspace' },
        { keys: ['Scroll'], desc: 'Position is auto-saved per (tab, sub-tab) and restored on return' },
      ],
    },
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(226, 232, 240, 0.78)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100%)', maxHeight: '85vh', overflow: 'auto',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          padding: '14px 16px',
          background: '#f8fafc', color: '#1f2937', border: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 10,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
        }}>
          <span style={{ fontSize: 18 }}>⌨</span>
          <strong id="keyboard-help-title" style={{ fontSize: 16 }}>Keyboard shortcuts</strong>
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px', borderRadius: 3,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            fontSize: 10, fontWeight: 700,
          }}>⌘ /</span>
        </div>
        <div style={{ padding: 16 }}>
          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 8,
              }}>{g.title}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {g.shortcuts.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{
                        padding: '6px 8px', textAlign: 'left',
                        whiteSpace: 'nowrap', verticalAlign: 'top',
                      }}>
                        {s.keys.map((k, j) => (
                          <kbd key={j} style={{
                            display: 'inline-block', padding: '1px 7px', marginRight: 3,
                            background: '#f1f5f9', color: '#0f172a',
                            border: '1px solid #cbd5e1', borderRadius: 3,
                            fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                          }}>{k}</kbd>
                        ))}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #e2e8f0',
          fontSize: 10, color: '#64748b', textAlign: 'right',
        }}>
          <kbd style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
