# Per-Department Admin & Manager Hubs — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Admin and Manager hubs for every BEV department — routes, sidebar sub-links, stubbed pages/tabs, and data files — so Phase 2+ can fill the tabs without touching the shells.

**Architecture:** Data-driven React app. Phase 1 adds three new departments (Contact Center, Marketing, Telehealth) to `departments.js`, creates four new data files (`roles.js`, `reports.js`, `aiUseCases.js`, `dataFlow.js`), adds three pages (`AdminPage`, `ManagerPage`, `DataFlowPage`) with 17 tab stub components, wires new routes, and injects ⚙️ Admin + 📊 Manager sub-links into the existing sidebar. All tab panels are stubs rendering "Coming in Phase 2–5".

**Tech Stack:** React 18 · Vite 4 · react-router-dom 7 · recharts · native CSS variables. No new runtime dependencies for Phase 1 scaffolding. Playwright installed once as a dev-only smoke-test runner.

**Spec:** `docs/superpowers/specs/2026-04-19-dept-admin-manager-hubs-design.md` (commit `4559c72`).

---

## File Structure — what this plan touches

**Create (new):**
```
frontend/src/data/roles.js                             # 4 roles × 14 depts (3 seeded)
frontend/src/data/reports.js                           # 23 report types tagged by role
frontend/src/data/aiUseCases.js                        # 16 categories + ~20 seed entries
frontend/src/data/dataFlow.js                          # ~20 cross-dept edges
frontend/src/pages/AdminPage.jsx                       # 10-tab admin hub per dept
frontend/src/pages/ManagerPage.jsx                     # 7-tab manager hub per dept
frontend/src/pages/DataFlowPage.jsx                    # global cross-dept flow stub
frontend/src/components/admin-tabs/UsersRolesTab.jsx           # stub
frontend/src/components/admin-tabs/PermissionsTab.jsx          # stub
frontend/src/components/admin-tabs/IntegrationsTab.jsx         # stub
frontend/src/components/admin-tabs/MCPServersTab.jsx           # stub
frontend/src/components/admin-tabs/ModelRegistryTab.jsx        # stub
frontend/src/components/admin-tabs/AIUseCasesTab.jsx           # stub
frontend/src/components/admin-tabs/WorkflowsTab.jsx            # stub
frontend/src/components/admin-tabs/ScheduledJobsTab.jsx        # stub
frontend/src/components/admin-tabs/AuditLogTab.jsx             # stub
frontend/src/components/admin-tabs/SettingsTab.jsx             # stub
frontend/src/components/manager-tabs/KPIDashboardTab.jsx       # stub
frontend/src/components/manager-tabs/StatusHealthTab.jsx       # stub
frontend/src/components/manager-tabs/ReportsTab.jsx            # stub
frontend/src/components/manager-tabs/MonitoringAlertsTab.jsx   # stub
frontend/src/components/manager-tabs/TeamPerformanceTab.jsx    # stub
frontend/src/components/manager-tabs/DataFlowTab.jsx           # stub
frontend/src/components/manager-tabs/RolesResponsibilitiesTab.jsx  # stub
frontend/src/components/common/TabStub.jsx             # shared "Coming soon" renderer
frontend/e2e/admin-manager-hubs.spec.js                # Playwright smoke test
frontend/playwright.config.js                          # Playwright config
```

**Modify (existing):**
```
frontend/src/data/departments.js      # append Contact Center, Marketing, Telehealth
frontend/src/App.jsx                  # register 3 new routes
frontend/src/components/Sidebar.jsx   # inject Admin + Manager sub-links per dept
frontend/src/styles/sidebar.css       # style the two new sub-link variants
frontend/package.json                 # add @playwright/test devDep + scripts
```

**Decomposition rationale:** One file per tab stub (not a single factory) matches the spec and lets Phase 2 fill each tab without touching siblings. Data files split by concept (roles, reports, use cases, flow) so Phase-2 changes are isolated. Admin/Manager pages are thin shells that only do tab routing — they should not know about tab internals.

---

## Tasks

### Task 1: Add 3 new departments to `departments.js`

**Files:**
- Modify: `frontend/src/data/departments.js` (append to existing array, near end before closing `];`)

- [ ] **Step 1: Read existing file**

Run: `Read frontend/src/data/departments.js` to locate the closing `];` of the `departments` array and confirm style of existing entries.

- [ ] **Step 2: Append Contact Center entry**

Insert this entry before the final `];` in `frontend/src/data/departments.js`:

```js
  {
    id: 'contact-center',
    name: 'Contact Center',
    icon: '☎️',
    route: '/contact-center',
    color: '#0ea5e9',
    description: 'Voice AI, agent assist, queue management, quality monitoring',
    processCount: 6,
    aiTypes: ['Voice AI', 'NLP', 'RAG', 'n8n'],
    kaggleDataset: 'contact-center-analytics',
    roi: '20–30% AHT reduction',
  },
```

- [ ] **Step 3: Append Marketing entry**

Immediately after the Contact Center entry:

```js
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📣',
    route: '/marketing',
    color: '#f97316',
    description: 'AI-native campaigns, generative ads/landing/email, SEO content, funnel optimization, attribution',
    processCount: 8,
    aiTypes: ['ML', 'NLP', 'RAG', 'GenAI', 'n8n', 'RPA'],
    kaggleDataset: 'marketing-campaigns',
    roi: '25–35% campaign ROI uplift',
  },
```

- [ ] **Step 4: Append Telehealth entry**

Immediately after the Marketing entry:

```js
  {
    id: 'telehealth',
    name: 'Telehealth',
    icon: '🩺',
    route: '/telehealth',
    color: '#22c55e',
    description: 'Virtual care, remote diagnostics, patient AI triage, clinician workflow automation',
    processCount: 6,
    aiTypes: ['NLP', 'CV', 'RAG', 'ML', 'n8n'],
    kaggleDataset: 'telehealth-analytics',
    roi: '30–40% triage time reduction',
  },
```

- [ ] **Step 5: Verify the array parses**

Run: `cd frontend && node -e "import('./src/data/departments.js').then(m => console.log('depts:', m.departments.length))"`
Expected: `depts: 14`

- [ ] **Step 6: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/data/departments.js
git commit -m "feat(data): add Contact Center, Marketing, Telehealth departments

Brings total to 14 departments. Each includes icon, route, color,
description, process count, aiTypes tags, Kaggle dataset slug, ROI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create `data/roles.js` — 4 roles × 14 depts (3 seeded)

**Files:**
- Create: `frontend/src/data/roles.js`

- [ ] **Step 1: Write the full data file**

Create `frontend/src/data/roles.js` with this exact content:

```js
// roles.js — Four canonical roles, with per-department responsibilities.
// Phase 1 seeds 3 depts fully (sales, marketing, contact-center).
// Remaining 11 depts use empty objects; UI renders fallback.

export const ROLE_IDS = ['manager', 'team-member', 'compliance', 'reporting-monitoring'];

export const ROLE_LABELS = {
  manager: 'Manager',
  'team-member': 'Team Member',
  compliance: 'Compliance',
  'reporting-monitoring': 'Reporting & Monitoring',
};

export const ROLE_ICONS = {
  manager: '👔',
  'team-member': '🧑‍💻',
  compliance: '🛡️',
  'reporting-monitoring': '📡',
};

// reports array uses IDs from reports.js
export const rolesByDept = {
  sales: {
    manager: {
      title: 'Sales Manager',
      responsibilities: [
        'Set quarterly revenue targets and territory plans',
        'Approve forecast models and pricing strategy changes',
        'Review pipeline health and team scorecards weekly',
        'Own SLA and ROI outcomes for the Sales function',
      ],
      kpis: ['Revenue $', 'Forecast accuracy %', 'Deal cycle days', 'Win rate %'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'roi-tracker', 'pipeline-health'],
    },
    'team-member': {
      title: 'Sales Analyst',
      responsibilities: [
        'Maintain CRM hygiene and opportunity stages',
        'Run daily pipeline reports and flag at-risk deals',
        'Execute lead-scoring tasks assigned by Manager',
      ],
      kpis: ['Tasks completed', 'Data quality %', 'Forecasts submitted on time'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Sales Compliance Officer',
      responsibilities: [
        'Audit discount approvals and deal-desk exceptions',
        'Track PII access in CRM',
        'Validate model fairness for lead scoring',
      ],
      kpis: ['Violation rate', 'Audit findings closed', 'PII access alerts'],
      reports: ['audit-trail', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Sales Ops Monitor',
      responsibilities: [
        'Watch forecasting model drift and data pipeline health',
        'Respond to anomaly alerts in sales telemetry',
        'Maintain scheduled job calendar for daily/weekly reports',
      ],
      kpis: ['System uptime %', 'Drift incidents', 'Jobs failed/recovered'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
  },
  marketing: {
    manager: {
      title: 'Marketing Manager',
      responsibilities: [
        'Own campaign calendar and channel budget allocation',
        'Approve generative creative and landing-page variants',
        'Review attribution and funnel conversion weekly',
      ],
      kpis: ['Campaign ROI %', 'CAC', 'Conversion rate %', 'Funnel drop-off %'],
      reports: ['exec-kpi', 'mbr', 'roi-tracker', 'pipeline-health'],
    },
    'team-member': {
      title: 'Marketing Specialist',
      responsibilities: [
        'Execute AI-assisted content generation (ads, emails, SEO)',
        'A/B test variants and report winners',
        'Maintain audience segments and CRM journeys',
      ],
      kpis: ['Content shipped', 'Variants tested', 'Engagement rate'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Marketing Compliance Officer',
      responsibilities: [
        'Ensure generative content meets brand and legal standards',
        'Audit consent records (CAN-SPAM, GDPR, CCPA)',
        'Validate model fairness for audience targeting',
      ],
      kpis: ['Consent violations', 'Brand compliance %', 'Audit findings closed'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Marketing Analytics Ops',
      responsibilities: [
        'Monitor attribution model drift and feed freshness',
        'Watch funnel anomalies and alert creative team',
        'Operate scheduled campaign performance reports',
      ],
      kpis: ['Data freshness', 'Anomalies flagged', 'Scheduled job success %'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
  },
  'contact-center': {
    manager: {
      title: 'Contact Center Manager',
      responsibilities: [
        'Plan workforce schedules and SLA targets',
        'Review AI agent handoff quality and CSAT trends',
        'Approve voice-AI prompt changes and model versions',
      ],
      kpis: ['AHT', 'CSAT', 'First-contact resolution %', 'Agent utilization %'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'sla-summary', 'roi-tracker'],
    },
    'team-member': {
      title: 'Customer Service Agent',
      responsibilities: [
        'Handle customer contacts with AI whisper coaching',
        'Escalate complex cases per playbook',
        'Log call dispositions and feedback',
      ],
      kpis: ['Calls handled', 'CSAT per agent', 'Adherence %'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard', 'assigned-incidents'],
    },
    compliance: {
      title: 'Contact Center Compliance Officer',
      responsibilities: [
        'Audit call recordings for PII handling and script adherence',
        'Review AI agent responses for regulatory compliance',
        'Track complaint resolution SLAs',
      ],
      kpis: ['PII incidents', 'Script compliance %', 'Regulatory findings'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Contact Center Ops Monitor',
      responsibilities: [
        'Watch queue health, IVR drop-off, voice-AI latency',
        'Alert on anomalies (surge, outage, drift)',
        'Operate shift-level ops dashboards',
      ],
      kpis: ['Queue wait', 'Voice-AI latency', 'Uptime %'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs', 'api-latency'],
    },
  },
  // Remaining 11 depts use empty objects; UI renders "Data not yet populated" fallback.
  'supply-chain': {},
  logistics: {},
  manufacturing: {},
  maintenance: {},
  retail: {},
  customer: {},
  telehealth: {},
  'demand-forecasting': {},
  finance: {},
  quality: {},
  hr: {},
};

export function getRolesForDept(deptId) {
  return rolesByDept[deptId] || {};
}
```

- [ ] **Step 2: Verify the module parses**

Run: `cd frontend && node -e "import('./src/data/roles.js').then(m => { console.log('ROLE_IDS:', m.ROLE_IDS); console.log('seeded depts:', Object.keys(m.rolesByDept).filter(k => Object.keys(m.rolesByDept[k]).length > 0)); })"`
Expected:
```
ROLE_IDS: [ 'manager', 'team-member', 'compliance', 'reporting-monitoring' ]
seeded depts: [ 'sales', 'marketing', 'contact-center' ]
```

- [ ] **Step 3: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/data/roles.js
git commit -m "feat(data): add roles.js with 4 canonical roles × 14 depts

Seeds sales, marketing, contact-center fully. Other 11 depts use
empty objects; Phase 2 UI will render 'Data not yet populated'
fallback for unseeded depts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create `data/reports.js` — 23 report types tagged by role

**Files:**
- Create: `frontend/src/data/reports.js`

- [ ] **Step 1: Write the full data file**

Create `frontend/src/data/reports.js` with this exact content:

```js
// reports.js — 23 report types. Tagged by role; rendered via common ReportCard (Phase 2).

export const REPORT_CATEGORIES = ['dashboard', 'report', 'scorecard', 'compliance', 'monitoring', 'operational', 'audit', 'ai-governance'];

export const reportTypes = [
  // Manager (7)
  { id: 'exec-kpi',             name: 'Executive KPI Dashboard',     role: 'manager',              category: 'dashboard'   },
  { id: 'mbr',                  name: 'Monthly Business Review',      role: 'manager',              category: 'report'      },
  { id: 'team-scorecard',       name: 'Team Performance Scorecard',   role: 'manager',              category: 'scorecard'   },
  { id: 'budget-vs-actuals',    name: 'Budget vs Actuals',            role: 'manager',              category: 'report'      },
  { id: 'sla-summary',          name: 'SLA Compliance Summary',       role: 'manager',              category: 'compliance'  },
  { id: 'roi-tracker',          name: 'ROI Tracker',                  role: 'manager',              category: 'dashboard'   },
  { id: 'pipeline-health',      name: 'Pipeline Health',              role: 'manager',              category: 'monitoring'  },

  // Team Member (4)
  { id: 'my-tasks',             name: 'My Tasks / Work Queue',        role: 'team-member',          category: 'operational' },
  { id: 'daily-productivity',   name: 'Daily Productivity',           role: 'team-member',          category: 'operational' },
  { id: 'personal-scorecard',   name: 'Personal Scorecard',           role: 'team-member',          category: 'scorecard'   },
  { id: 'assigned-incidents',   name: 'Assigned Incidents',           role: 'team-member',          category: 'monitoring'  },

  // Compliance (6)
  { id: 'audit-trail',          name: 'Audit Trail',                  role: 'compliance',           category: 'audit'          },
  { id: 'regulatory-checklist', name: 'Regulatory Compliance',        role: 'compliance',           category: 'compliance'     },
  { id: 'policy-violations',    name: 'Policy Violations',            role: 'compliance',           category: 'audit'          },
  { id: 'model-fairness',       name: 'Model Fairness & Bias',        role: 'compliance',           category: 'ai-governance'  },
  { id: 'pii-access',           name: 'PII Access Log',               role: 'compliance',           category: 'audit'          },
  { id: 'change-mgmt',          name: 'Change Management Log',        role: 'compliance',           category: 'audit'          },

  // Reporting & Monitoring (6)
  { id: 'system-health',        name: 'System Health Dashboard',      role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'model-drift',          name: 'Model Drift & Accuracy',       role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'pipeline-status',      name: 'Data Pipeline Status',         role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'anomaly-detection',    name: 'Anomaly Detection',            role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'scheduled-jobs',       name: 'Scheduled Job Status',         role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'api-latency',          name: 'API Usage & Latency',          role: 'reporting-monitoring', category: 'monitoring' },
];

export function getReportsByRole(roleId) {
  return reportTypes.filter((r) => r.role === roleId);
}

export function getReportById(id) {
  return reportTypes.find((r) => r.id === id);
}
```

- [ ] **Step 2: Verify 23 report types**

Run: `cd frontend && node -e "import('./src/data/reports.js').then(m => { console.log('total:', m.reportTypes.length); ['manager','team-member','compliance','reporting-monitoring'].forEach(r => console.log(r + ':', m.getReportsByRole(r).length)); })"`
Expected:
```
total: 23
manager: 7
team-member: 4
compliance: 6
reporting-monitoring: 6
```

- [ ] **Step 3: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/data/reports.js
git commit -m "feat(data): add reports.js — 23 report types tagged by role

Catalogs: 7 manager, 4 team-member, 6 compliance, 6 reporting.
Helpers getReportsByRole / getReportById. Phase 2 renders with
common ReportCard template.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Create `data/aiUseCases.js` — 16 categories + ~20 seed entries

**Files:**
- Create: `frontend/src/data/aiUseCases.js`

- [ ] **Step 1: Write the full data file**

Create `frontend/src/data/aiUseCases.js` with this exact content:

```js
// aiUseCases.js — 16 categories. ~20 seed entries spanning sales, marketing, contact-center.
// Phase 2 expands to ~100 entries covering all 14 depts.

export const USE_CASE_CATEGORIES = [
  'RPA',
  'n8n',
  'Voice AI',
  'CRM',
  'Campaign',
  'Email Marketing',
  'Digital Marketing',
  'Vendor Mgmt',
  'Contact Center Mgmt',
  'Recommendation',
  'Anomaly Detection',
  'Fraud Detection',
  'AI Agent',
  'Generative Marketing',
  'SEO Content',
  'Funnel Optimization',
];

export const aiUseCases = [
  // Sales
  {
    id: 'sales-voice-coach',
    dept: 'sales',
    category: 'Voice AI',
    name: 'Real-time agent coaching',
    description: 'Live transcript + whisper suggestions during sales calls.',
    inputs: ['call audio stream', 'CRM contact record', 'product catalog'],
    outputs: ['suggested talk-tracks', 'objection handlers', 'call summary'],
    model: 'Whisper + GPT-4o',
    trigger: 'call-start event',
    owner: 'manager',
    businessImpact: '+12% conversion',
    status: 'live',
  },
  {
    id: 'sales-lead-scoring',
    dept: 'sales',
    category: 'CRM',
    name: 'AI lead scoring',
    description: 'Prioritizes inbound leads using historical win data and firmographics.',
    inputs: ['CRM lead record', 'marketing engagement', 'firmographic enrichment'],
    outputs: ['lead score 0-100', 'next-best-action'],
    model: 'XGBoost + SHAP',
    trigger: 'lead created',
    owner: 'team-member',
    businessImpact: '+18% SQL→opportunity rate',
    status: 'live',
  },
  {
    id: 'sales-anomaly-pipeline',
    dept: 'sales',
    category: 'Anomaly Detection',
    name: 'Pipeline anomaly alerts',
    description: 'Flags sudden pipeline drops or stalled-deal spikes.',
    inputs: ['stage transitions', 'deal values', 'activity counts'],
    outputs: ['anomaly score', 'alert routing'],
    model: 'Isolation Forest',
    trigger: 'hourly batch',
    owner: 'reporting-monitoring',
    businessImpact: 'Detect churn risk 3–5 days earlier',
    status: 'live',
  },
  {
    id: 'sales-forecast-rpa',
    dept: 'sales',
    category: 'RPA',
    name: 'Weekly forecast PDF gen',
    description: 'Extracts forecast data from BI and emails stakeholders.',
    inputs: ['BI dashboard', 'mailing list'],
    outputs: ['forecast PDF', 'sent email record'],
    model: 'UiPath workflow',
    trigger: 'Monday 07:00',
    owner: 'team-member',
    businessImpact: '6 hrs/wk saved',
    status: 'live',
  },

  // Marketing
  {
    id: 'mkt-gen-landing',
    dept: 'marketing',
    category: 'Generative Marketing',
    name: 'Generative landing pages',
    description: 'AI creates, tests, and iterates landing-page variants.',
    inputs: ['campaign brief', 'brand kit', 'historical performance'],
    outputs: ['HTML landing variants', 'A/B test plan'],
    model: 'Claude + design tool chain',
    trigger: 'campaign launch',
    owner: 'manager',
    businessImpact: '+22% CVR vs baseline',
    status: 'live',
  },
  {
    id: 'mkt-email-optimizer',
    dept: 'marketing',
    category: 'Email Marketing',
    name: 'Subject-line optimizer',
    description: 'Generates and ranks subject lines; auto-promotes winners.',
    inputs: ['draft email', 'audience segment', 'past open rates'],
    outputs: ['ranked subject variants', 'send-time suggestion'],
    model: 'GPT-4o + Thompson sampling',
    trigger: 'email queued',
    owner: 'team-member',
    businessImpact: '+15% open rate',
    status: 'live',
  },
  {
    id: 'mkt-seo-content',
    dept: 'marketing',
    category: 'SEO Content',
    name: 'SEO brief → article pipeline',
    description: 'Keyword → brief → draft → edit → publish, with QC.',
    inputs: ['target keyword', 'SERP analysis', 'brand voice kit'],
    outputs: ['SEO-optimized draft', 'metadata', 'internal links'],
    model: 'Claude + Search Console API',
    trigger: 'weekly keyword queue',
    owner: 'team-member',
    businessImpact: '3× content throughput',
    status: 'live',
  },
  {
    id: 'mkt-digital-bid',
    dept: 'marketing',
    category: 'Digital Marketing',
    name: 'Programmatic bid optimizer',
    description: 'Learns bid strategies across DSPs in real time.',
    inputs: ['impression log', 'conversion events', 'creative metadata'],
    outputs: ['bid adjustments per placement'],
    model: 'Contextual bandit',
    trigger: 'every 15 min',
    owner: 'reporting-monitoring',
    businessImpact: '−18% CPA',
    status: 'live',
  },
  {
    id: 'mkt-funnel-opt',
    dept: 'marketing',
    category: 'Funnel Optimization',
    name: 'Real-time funnel optimizer',
    description: 'Watches drop-off, recommends creative/placement/copy changes live.',
    inputs: ['funnel events', 'creative library', 'segment data'],
    outputs: ['creative swap recommendations', 'auto-applied variants'],
    model: 'Causal inference + GPT-4o',
    trigger: 'hourly',
    owner: 'manager',
    businessImpact: '−12% drop-off',
    status: 'live',
  },
  {
    id: 'mkt-campaign-run',
    dept: 'marketing',
    category: 'Campaign',
    name: 'Multi-channel campaign orchestration',
    description: 'Coordinates email/push/SMS/paid across journeys.',
    inputs: ['journey definition', 'segment list', 'content library'],
    outputs: ['scheduled sends', 'engagement events'],
    model: 'n8n + Braze',
    trigger: 'journey enrollment',
    owner: 'manager',
    businessImpact: '+28% lifecycle revenue',
    status: 'live',
  },
  {
    id: 'mkt-rec-next-offer',
    dept: 'marketing',
    category: 'Recommendation',
    name: 'Next-best-offer',
    description: 'Personalized offer per customer.',
    inputs: ['customer profile', 'purchase history', 'offer catalog'],
    outputs: ['ranked offer list'],
    model: 'Two-tower retrieval',
    trigger: 'on-session',
    owner: 'team-member',
    businessImpact: '+9% AOV',
    status: 'live',
  },

  // Contact Center
  {
    id: 'cc-ai-agent',
    dept: 'contact-center',
    category: 'AI Agent',
    name: 'Tier-1 AI customer agent',
    description: 'Handles billing / order-status / FAQ autonomously; escalates complex cases.',
    inputs: ['inbound message', 'customer record', 'KB corpus'],
    outputs: ['resolution response', 'ticket disposition', 'escalation tag'],
    model: 'Claude 3.5 Sonnet + RAG',
    trigger: 'inbound message',
    owner: 'manager',
    businessImpact: '55% tier-1 deflection',
    status: 'live',
  },
  {
    id: 'cc-call-transcribe',
    dept: 'contact-center',
    category: 'Voice AI',
    name: 'Call transcription + sentiment',
    description: 'Real-time transcript with sentiment & topic tags.',
    inputs: ['call audio'],
    outputs: ['transcript', 'sentiment timeline', 'topic tags'],
    model: 'Whisper + custom classifier',
    trigger: 'call-answered',
    owner: 'reporting-monitoring',
    businessImpact: 'Enables 100% QA coverage',
    status: 'live',
  },
  {
    id: 'cc-queue-opt',
    dept: 'contact-center',
    category: 'Contact Center Mgmt',
    name: 'Queue optimization',
    description: 'Predicts call volume + AHT, rebalances queues.',
    inputs: ['historical volume', 'shift schedule', 'live queue state'],
    outputs: ['queue assignments', 'staffing recommendations'],
    model: 'Prophet + LP solver',
    trigger: 'every 5 min',
    owner: 'manager',
    businessImpact: '−20% abandon rate',
    status: 'live',
  },
  {
    id: 'cc-fraud',
    dept: 'contact-center',
    category: 'Fraud Detection',
    name: 'Account-takeover detection',
    description: 'Scores callers for ATO risk using voice biometrics + behavior.',
    inputs: ['caller ID', 'voiceprint', 'account activity'],
    outputs: ['fraud score', 'step-up auth request'],
    model: 'Voice biometrics + gradient boosting',
    trigger: 'IVR identity step',
    owner: 'compliance',
    businessImpact: '−$2.1M annual fraud loss',
    status: 'live',
  },
  {
    id: 'cc-n8n-followup',
    dept: 'contact-center',
    category: 'n8n',
    name: 'Post-call follow-up workflow',
    description: 'Auto sends summary + survey; schedules callback if needed.',
    inputs: ['call record', 'disposition', 'customer preferences'],
    outputs: ['email sent', 'callback scheduled'],
    model: 'n8n workflow + Claude summary',
    trigger: 'call-ended',
    owner: 'team-member',
    businessImpact: '+14% CSAT',
    status: 'live',
  },
  {
    id: 'cc-vendor-qa',
    dept: 'contact-center',
    category: 'Vendor Mgmt',
    name: 'BPO vendor QA scorecard',
    description: 'Samples BPO calls and scores against playbook.',
    inputs: ['BPO call transcripts', 'playbook'],
    outputs: ['vendor scorecard', 'coaching flags'],
    model: 'LLM evaluator',
    trigger: 'daily',
    owner: 'manager',
    businessImpact: 'Vendor SLA enforcement',
    status: 'live',
  },
  {
    id: 'cc-anomaly-latency',
    dept: 'contact-center',
    category: 'Anomaly Detection',
    name: 'Voice-AI latency anomalies',
    description: 'Flags p95 latency spikes in voice pipeline.',
    inputs: ['STT latency', 'LLM latency', 'TTS latency'],
    outputs: ['anomaly alerts', 'rollback suggestion'],
    model: 'Prophet + rules',
    trigger: 'every 1 min',
    owner: 'reporting-monitoring',
    businessImpact: 'Prevents silent degradation',
    status: 'live',
  },
  {
    id: 'cc-rpa-tickets',
    dept: 'contact-center',
    category: 'RPA',
    name: 'Ticket sync to CRM',
    description: 'Replicates Zendesk dispositions into Salesforce.',
    inputs: ['Zendesk events'],
    outputs: ['Salesforce case updates'],
    model: 'UiPath',
    trigger: 'every 2 min',
    owner: 'team-member',
    businessImpact: 'Eliminates manual sync',
    status: 'live',
  },
  {
    id: 'cc-rec-kb',
    dept: 'contact-center',
    category: 'Recommendation',
    name: 'Agent KB article recommender',
    description: 'Shows most-relevant KB articles as agent types.',
    inputs: ['live transcript', 'KB embeddings'],
    outputs: ['ranked KB snippets'],
    model: 'OpenAI embeddings + rerank',
    trigger: 'every utterance',
    owner: 'team-member',
    businessImpact: '−28s AHT',
    status: 'live',
  },
];

export function getUseCasesForDept(deptId) {
  return aiUseCases.filter((u) => u.dept === deptId);
}

export function getUseCasesForCategory(category) {
  return aiUseCases.filter((u) => u.category === category);
}
```

- [ ] **Step 2: Verify counts**

Run: `cd frontend && node -e "import('./src/data/aiUseCases.js').then(m => { console.log('cats:', m.USE_CASE_CATEGORIES.length); console.log('use cases:', m.aiUseCases.length); ['sales','marketing','contact-center'].forEach(d => console.log(d + ':', m.getUseCasesForDept(d).length)); })"`
Expected:
```
cats: 16
use cases: 20
sales: 4
marketing: 7
contact-center: 9
```

- [ ] **Step 3: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/data/aiUseCases.js
git commit -m "feat(data): add aiUseCases.js — 16 categories, 20 seed entries

Seeds 4 sales + 7 marketing + 9 contact-center use cases spanning
all 16 categories. Each entry has inputs/outputs/model/trigger/
owner/impact/status. Helpers getUseCasesForDept / ForCategory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Create `data/dataFlow.js` — ~20 cross-dept edges

**Files:**
- Create: `frontend/src/data/dataFlow.js`

- [ ] **Step 1: Write the full data file**

Create `frontend/src/data/dataFlow.js` with this exact content:

```js
// dataFlow.js — Business data flows between departments.
// Drives cross-dept flow viz in Manager page (Phase 4) and global DataFlowPage.

export const dataFlowEdges = [
  { from: 'retail',          to: 'sales',           entity: 'POS transactions',             schedule: 'hourly',    sla: '< 5 min lag' },
  { from: 'retail',          to: 'marketing',       entity: 'SKU-level conversions',        schedule: 'daily',     sla: '06:00 UTC'   },
  { from: 'sales',           to: 'finance',         entity: 'revenue by SKU',               schedule: 'daily',     sla: 'EOD + 1h'    },
  { from: 'sales',           to: 'marketing',       entity: 'deal outcomes',                schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'customer',        to: 'marketing',       entity: 'segment scores',               schedule: 'nightly',   sla: '05:00 UTC'   },
  { from: 'customer',        to: 'contact-center',  entity: 'customer 360 profile',         schedule: 'on-demand', sla: '< 2 sec'     },
  { from: 'contact-center',  to: 'customer',        entity: 'sentiment + tickets',          schedule: 'real-time', sla: '< 1 min'     },
  { from: 'contact-center',  to: 'marketing',       entity: 'NPS + CSAT feedback',          schedule: 'daily',     sla: '04:00 UTC'   },
  { from: 'marketing',       to: 'sales',           entity: 'MQLs with intent signal',      schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'marketing',       to: 'customer',        entity: 'campaign engagement',          schedule: 'hourly',    sla: '< 30 min'    },
  { from: 'supply-chain',    to: 'retail',          entity: 'stock levels by store',        schedule: 'hourly',    sla: '< 10 min'    },
  { from: 'supply-chain',    to: 'sales',           entity: 'ATP (available-to-promise)',   schedule: 'real-time', sla: '< 30 sec'    },
  { from: 'logistics',       to: 'supply-chain',    entity: 'ETA predictions',              schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'manufacturing',   to: 'supply-chain',    entity: 'production completes',         schedule: 'shift',     sla: 'end-of-shift'},
  { from: 'maintenance',     to: 'manufacturing',   entity: 'equipment health alerts',      schedule: 'real-time', sla: '< 1 min'     },
  { from: 'quality',         to: 'manufacturing',   entity: 'defect trends',                schedule: 'daily',     sla: '02:00 UTC'   },
  { from: 'telehealth',      to: 'customer',        entity: 'care encounter summaries',     schedule: 'real-time', sla: '< 5 min'     },
  { from: 'hr',              to: 'contact-center',  entity: 'agent roster + skills',        schedule: 'daily',     sla: '03:00 UTC'   },
  { from: 'finance',         to: 'marketing',       entity: 'campaign budget actuals',      schedule: 'daily',     sla: '07:00 UTC'   },
  { from: 'demand-forecasting', to: 'supply-chain', entity: 'SKU forecast',                 schedule: 'weekly',    sla: 'Mon 03:00'   },
];

export function getInboundEdges(deptId) {
  return dataFlowEdges.filter((e) => e.to === deptId);
}

export function getOutboundEdges(deptId) {
  return dataFlowEdges.filter((e) => e.from === deptId);
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && node -e "import('./src/data/dataFlow.js').then(m => { console.log('edges:', m.dataFlowEdges.length); console.log('marketing in:', m.getInboundEdges('marketing').length, 'out:', m.getOutboundEdges('marketing').length); })"`
Expected:
```
edges: 20
marketing in: 4 out: 2
```

- [ ] **Step 3: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/data/dataFlow.js
git commit -m "feat(data): add dataFlow.js — 20 cross-dept data flow edges

Each edge: from, to, entity, schedule, sla. Helpers for inbound
and outbound edge lookups. Drives per-dept (Manager) and global
(/data-flow) visualizations in Phase 4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Create shared `TabStub` component

**Files:**
- Create: `frontend/src/components/common/TabStub.jsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/common/TabStub.jsx`:

```jsx
// TabStub — rendered by every Phase-1 stubbed tab. Accepts name + phase label.

export default function TabStub({ name, phase = 'Phase 2–5', description }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      minHeight: '360px',
      color: 'var(--text-secondary, #64748b)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
      <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary, #0f172a)' }}>
        {name}
      </h3>
      <p style={{ margin: '8px 0 16px', fontSize: '14px', maxWidth: '520px', textAlign: 'center' }}>
        {description || 'This section is scaffolded. Content arrives in a later phase.'}
      </p>
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: 'rgba(59,130,246,0.1)',
        color: '#3b82f6',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        Coming in {phase}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/components/common/TabStub.jsx
git commit -m "feat(ui): add TabStub shared component for Phase 1 scaffolding

Centralizes 'Coming soon' rendering for all 17 stubbed tabs so
Phase 2 replacements can swap tab bodies without touching common
styling.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Create 10 admin-tab stub components

**Files (all create):**
- `frontend/src/components/admin-tabs/UsersRolesTab.jsx`
- `frontend/src/components/admin-tabs/PermissionsTab.jsx`
- `frontend/src/components/admin-tabs/IntegrationsTab.jsx`
- `frontend/src/components/admin-tabs/MCPServersTab.jsx`
- `frontend/src/components/admin-tabs/ModelRegistryTab.jsx`
- `frontend/src/components/admin-tabs/AIUseCasesTab.jsx`
- `frontend/src/components/admin-tabs/WorkflowsTab.jsx`
- `frontend/src/components/admin-tabs/ScheduledJobsTab.jsx`
- `frontend/src/components/admin-tabs/AuditLogTab.jsx`
- `frontend/src/components/admin-tabs/SettingsTab.jsx`

- [ ] **Step 1: Create UsersRolesTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function UsersRolesTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Users & Roles`}
    description="Assign Manager / Team Member / Compliance / Reporting roles. Manage access and team composition."
  />;
}
```

- [ ] **Step 2: Create PermissionsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function PermissionsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Permissions Matrix`}
    description="Role × resource permission grid for the department."
  />;
}
```

- [ ] **Step 3: Create IntegrationsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function IntegrationsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Integrations & Data Sources`}
    description="REST/GraphQL APIs, databases, Kaggle, SaaS connectors (Salesforce/SAP/Shopify), ETL schedules, field mappings, sync health."
  />;
}
```

- [ ] **Step 4: Create MCPServersTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function MCPServersTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — MCP Servers`}
    description="Model Context Protocol server registrations: URL, transport (stdio/HTTP/SSE), auth, advertised tools & resources, health check, rate limits."
  />;
}
```

- [ ] **Step 5: Create ModelRegistryTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function ModelRegistryTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Model Registry`}
    description="Deploy, rollback, deprecate ML/LLM models. Track versions, lineage, evaluation."
  />;
}
```

- [ ] **Step 6: Create AIUseCasesTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function AIUseCasesTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — AI Use Cases & Automations`}
    description="16 categories: RPA, n8n, Voice AI, CRM, Campaign, Email Mkt, Digital Mkt, Vendor Mgmt, Contact Center Mgmt, Recommendation, Anomaly Detection, Fraud Detection, AI Agent, Generative Marketing, SEO Content, Funnel Optimization."
  />;
}
```

- [ ] **Step 7: Create WorkflowsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function WorkflowsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Workflows`}
    description="Workflow automations across 6 domains: Customer, Process, Employee, Admin, Testing, Security. Each workflow: trigger, steps, AI actions, owner, status."
  />;
}
```

- [ ] **Step 8: Create ScheduledJobsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function ScheduledJobsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Scheduled Jobs`}
    description="Cron-scheduled AI/RPA jobs: schedule, last run, next run, status, owner."
  />;
}
```

- [ ] **Step 9: Create AuditLogTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function AuditLogTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Audit Log`}
    description="Admin/compliance events: role changes, model deployments, policy edits. Filter by user, action, date."
  />;
}
```

- [ ] **Step 10: Create SettingsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function SettingsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Settings`}
    description="Department branding, SLA thresholds, alert rules, notification channels."
  />;
}
```

- [ ] **Step 11: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/components/admin-tabs/
git commit -m "feat(ui): add 10 admin-tab stub components

Users & Roles, Permissions, Integrations, MCP Servers, Model
Registry, AI Use Cases, Workflows, Scheduled Jobs, Audit Log,
Settings. All render shared TabStub 'Coming in Phase 2-5'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Create 7 manager-tab stub components

**Files (all create):**
- `frontend/src/components/manager-tabs/KPIDashboardTab.jsx`
- `frontend/src/components/manager-tabs/StatusHealthTab.jsx`
- `frontend/src/components/manager-tabs/ReportsTab.jsx`
- `frontend/src/components/manager-tabs/MonitoringAlertsTab.jsx`
- `frontend/src/components/manager-tabs/TeamPerformanceTab.jsx`
- `frontend/src/components/manager-tabs/DataFlowTab.jsx`
- `frontend/src/components/manager-tabs/RolesResponsibilitiesTab.jsx`

- [ ] **Step 1: Create KPIDashboardTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function KPIDashboardTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — KPI Dashboard`}
    description="Executive KPIs with AI decision-support recommendations for the department."
  />;
}
```

- [ ] **Step 2: Create StatusHealthTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function StatusHealthTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Status & Health`}
    description="SLA compliance, model drift, data pipeline health, scheduled job success rates."
  />;
}
```

- [ ] **Step 3: Create ReportsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function ReportsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Reports`}
    description="23 report types filtered by role: Manager (7), Team Member (4), Compliance (6), Reporting & Monitoring (6)."
  />;
}
```

- [ ] **Step 4: Create MonitoringAlertsTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function MonitoringAlertsTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Monitoring & Alerts`}
    description="Real-time anomaly feed, active alerts, incident timeline, routing rules."
  />;
}
```

- [ ] **Step 5: Create TeamPerformanceTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function TeamPerformanceTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Team Performance`}
    description="Queue depth, productivity, scorecards, workload distribution."
  />;
}
```

- [ ] **Step 6: Create DataFlowTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function DataFlowTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Cross-Dept Data Flow`}
    description="Upstream and downstream data dependencies for this department (per-dept view). Global view available at /data-flow."
  />;
}
```

- [ ] **Step 7: Create RolesResponsibilitiesTab.jsx**

```jsx
import TabStub from '../common/TabStub';
export default function RolesResponsibilitiesTab({ dept }) {
  return <TabStub
    name={`${dept?.name || 'Department'} — Roles & Responsibilities`}
    description="4 roles: Manager, Team Member, Compliance, Reporting & Monitoring. Each with responsibilities, KPIs, and owned reports."
  />;
}
```

- [ ] **Step 8: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/components/manager-tabs/
git commit -m "feat(ui): add 7 manager-tab stub components

KPI Dashboard, Status & Health, Reports, Monitoring & Alerts,
Team Performance, Cross-Dept Data Flow, Roles & Responsibilities.
All render shared TabStub 'Coming in Phase 2-5'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Create `AdminPage.jsx`

**Files:**
- Create: `frontend/src/pages/AdminPage.jsx`

- [ ] **Step 1: Write the page**

Create `frontend/src/pages/AdminPage.jsx`:

```jsx
import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import UsersRolesTab from '../components/admin-tabs/UsersRolesTab';
import PermissionsTab from '../components/admin-tabs/PermissionsTab';
import IntegrationsTab from '../components/admin-tabs/IntegrationsTab';
import MCPServersTab from '../components/admin-tabs/MCPServersTab';
import ModelRegistryTab from '../components/admin-tabs/ModelRegistryTab';
import AIUseCasesTab from '../components/admin-tabs/AIUseCasesTab';
import WorkflowsTab from '../components/admin-tabs/WorkflowsTab';
import ScheduledJobsTab from '../components/admin-tabs/ScheduledJobsTab';
import AuditLogTab from '../components/admin-tabs/AuditLogTab';
import SettingsTab from '../components/admin-tabs/SettingsTab';

const TABS = [
  { id: 'users-roles',    label: 'Users & Roles',            icon: '👥',  Component: UsersRolesTab    },
  { id: 'permissions',    label: 'Permissions',              icon: '🔐',  Component: PermissionsTab   },
  { id: 'integrations',   label: 'Integrations',             icon: '🔌',  Component: IntegrationsTab  },
  { id: 'mcp-servers',    label: 'MCP Servers',              icon: '🧠',  Component: MCPServersTab    },
  { id: 'model-registry', label: 'Model Registry',           icon: '📦',  Component: ModelRegistryTab },
  { id: 'ai-use-cases',   label: 'AI Use Cases',             icon: '🤖',  Component: AIUseCasesTab    },
  { id: 'workflows',      label: 'Workflows',                icon: '🔁',  Component: WorkflowsTab     },
  { id: 'scheduled-jobs', label: 'Scheduled Jobs',           icon: '⏰',  Component: ScheduledJobsTab },
  { id: 'audit-log',      label: 'Audit Log',                icon: '📜',  Component: AuditLogTab      },
  { id: 'settings',       label: 'Settings',                 icon: '⚙️',  Component: SettingsTab      },
];

export default function AdminPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('users-roles');
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  const Active = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">⚙️ {dept.name} — Admin</div>
          <div className="page-subtitle">Administration, governance, and configuration for the {dept.name} department</div>
        </div>
        <div className="page-header-right">
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: `${dept.color}15`, border: `1px solid ${dept.color}33`,
            color: dept.color, fontSize: 'var(--font-size-sm)', fontWeight: 600,
          }}>
            {dept.icon} {dept.name}
          </span>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-content">
          <div className="tab-panel active has-padding">
            <Active dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat(ui): add AdminPage with 10 tabs (stubbed)

Per-department admin hub. Tabs: Users & Roles, Permissions,
Integrations, MCP Servers, Model Registry, AI Use Cases, Workflows,
Scheduled Jobs, Audit Log, Settings. Reuses existing .tabs-bar CSS
(same horizontal-scroll pattern as ProcessPage).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Create `ManagerPage.jsx`

**Files:**
- Create: `frontend/src/pages/ManagerPage.jsx`

- [ ] **Step 1: Write the page**

Create `frontend/src/pages/ManagerPage.jsx`:

```jsx
import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import KPIDashboardTab from '../components/manager-tabs/KPIDashboardTab';
import StatusHealthTab from '../components/manager-tabs/StatusHealthTab';
import ReportsTab from '../components/manager-tabs/ReportsTab';
import MonitoringAlertsTab from '../components/manager-tabs/MonitoringAlertsTab';
import TeamPerformanceTab from '../components/manager-tabs/TeamPerformanceTab';
import DataFlowTab from '../components/manager-tabs/DataFlowTab';
import RolesResponsibilitiesTab from '../components/manager-tabs/RolesResponsibilitiesTab';

const TABS = [
  { id: 'kpi-dashboard',          label: 'KPI Dashboard',           icon: '📊', Component: KPIDashboardTab          },
  { id: 'status-health',          label: 'Status & Health',         icon: '🫀', Component: StatusHealthTab          },
  { id: 'reports',                label: 'Reports',                 icon: '📑', Component: ReportsTab               },
  { id: 'monitoring-alerts',      label: 'Monitoring & Alerts',     icon: '🚨', Component: MonitoringAlertsTab      },
  { id: 'team-performance',       label: 'Team Performance',        icon: '🏆', Component: TeamPerformanceTab       },
  { id: 'data-flow',              label: 'Cross-Dept Data Flow',    icon: '🔀', Component: DataFlowTab              },
  { id: 'roles-responsibilities', label: 'Roles & Responsibilities', icon: '🧩', Component: RolesResponsibilitiesTab },
];

export default function ManagerPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('kpi-dashboard');
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  const Active = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">📊 {dept.name} — Manager</div>
          <div className="page-subtitle">KPIs, reports, monitoring, team performance for the {dept.name} department</div>
        </div>
        <div className="page-header-right">
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: `${dept.color}15`, border: `1px solid ${dept.color}33`,
            color: dept.color, fontSize: 'var(--font-size-sm)', fontWeight: 600,
          }}>
            {dept.icon} {dept.name}
          </span>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-content">
          <div className="tab-panel active has-padding">
            <Active dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/pages/ManagerPage.jsx
git commit -m "feat(ui): add ManagerPage with 7 tabs (stubbed)

Per-department manager hub. Tabs: KPI Dashboard, Status & Health,
Reports, Monitoring & Alerts, Team Performance, Cross-Dept Data
Flow, Roles & Responsibilities.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Create `DataFlowPage.jsx` (global stub)

**Files:**
- Create: `frontend/src/pages/DataFlowPage.jsx`

- [ ] **Step 1: Write the page**

Create `frontend/src/pages/DataFlowPage.jsx`:

```jsx
import { dataFlowEdges } from '../data/dataFlow';
import { departments } from '../data/departments';
import TabStub from '../components/common/TabStub';

export default function DataFlowPage() {
  const deptsById = Object.fromEntries(departments.map((d) => [d.id, d]));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🔀 Cross-Department Data Flow</div>
          <div className="page-subtitle">
            {dataFlowEdges.length} data flows across {departments.length - 1} departments
          </div>
        </div>
      </div>

      <TabStub
        name="Global Data-Flow Diagram"
        phase="Phase 4"
        description={`Interactive org-wide data-flow visualization. Phase 1 ships the data (${dataFlowEdges.length} edges); the diagram ships in Phase 4.`}
      />

      <div style={{ padding: '0 32px 32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Seeded edges (preview)</h3>
        <div style={{
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>From</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>To</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Entity</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Schedule</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>SLA</th>
              </tr>
            </thead>
            <tbody>
              {dataFlowEdges.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>{deptsById[e.from]?.icon} {deptsById[e.from]?.name || e.from}</td>
                  <td style={{ padding: '10px' }}>{deptsById[e.to]?.icon} {deptsById[e.to]?.name || e.to}</td>
                  <td style={{ padding: '10px' }}>{e.entity}</td>
                  <td style={{ padding: '10px' }}>{e.schedule}</td>
                  <td style={{ padding: '10px' }}>{e.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/pages/DataFlowPage.jsx
git commit -m "feat(ui): add DataFlowPage — global cross-dept flow preview

Phase 1 shows the seeded 20-edge table with emojis for each dept.
Phase 4 replaces the TabStub with an interactive Mermaid/D3
visualization.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Register new routes in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Read current file**

Run Read on `frontend/src/App.jsx` to confirm exact current imports and route order.

- [ ] **Step 2: Replace App.jsx with updated version**

Overwrite `frontend/src/App.jsx` with:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DepartmentPage from './pages/DepartmentPage';
import ProcessPage from './pages/ProcessPage';
import AdminPage from './pages/AdminPage';
import ManagerPage from './pages/ManagerPage';
import DataFlowPage from './pages/DataFlowPage';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/content.css';
import './styles/cards.css';
import './styles/tables.css';
import './styles/tabs.css';
import './styles/charts.css';
import './styles/process.css';
import './styles/forms.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-flow" element={<DataFlowPage />} />
          <Route path="/:departmentId" element={<DepartmentPage />} />
          <Route path="/:departmentId/admin" element={<AdminPage />} />
          <Route path="/:departmentId/manager" element={<ManagerPage />} />
          <Route path="/:departmentId/:processId" element={<ProcessPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Ordering note:** `/data-flow` must come BEFORE `/:departmentId` (react-router matches in order; otherwise "data-flow" matches the dynamic param and shows DepartmentPage). `/:deptId/admin` and `/:deptId/manager` must come BEFORE `/:deptId/:processId` for the same reason — "admin" / "manager" would otherwise be treated as a process ID.

- [ ] **Step 3: Verify Vite builds**

Run: `cd frontend && npm run build 2>&1 | tail -15`
Expected: build succeeds, no import errors.

- [ ] **Step 4: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/App.jsx
git commit -m "feat(routing): register /data-flow, /:deptId/admin, /:deptId/manager

New routes placed before more-specific catchalls so 'data-flow',
'admin', 'manager' are not mis-matched as dynamic params.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Add Admin + Manager sub-links to `Sidebar.jsx`

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/styles/sidebar.css`

- [ ] **Step 1: Read current Sidebar.jsx**

Run Read to confirm the block rendering `processes.map((proc) => ...)`.

- [ ] **Step 2: Replace the `nav-subitems` block**

In `frontend/src/components/Sidebar.jsx`, locate this existing JSX (around lines 72–85):

```jsx
{hasProcesses && isExpanded && (
  <div className="nav-subitems">
    {processes.map((proc) => (
      <NavLink
        key={proc.id}
        to={`/${dept.id}/${proc.id}`}
        className={({ isActive }) => 'nav-subitem' + (isActive ? ' active' : '')}
      >
        <span className="nav-subitem-dot"></span>
        <span className="nav-subitem-label">{proc.name}</span>
      </NavLink>
    ))}
  </div>
)}
```

Replace it with (note: Admin + Manager render whenever the dept is expanded, even if it has no processes):

```jsx
{isExpanded && (
  <div className="nav-subitems">
    <NavLink
      to={`/${dept.id}/admin`}
      className={({ isActive }) => 'nav-subitem nav-subitem-admin' + (isActive ? ' active' : '')}
    >
      <span className="nav-subitem-icon">⚙️</span>
      <span className="nav-subitem-label">Admin</span>
    </NavLink>
    <NavLink
      to={`/${dept.id}/manager`}
      className={({ isActive }) => 'nav-subitem nav-subitem-manager' + (isActive ? ' active' : '')}
    >
      <span className="nav-subitem-icon">📊</span>
      <span className="nav-subitem-label">Manager</span>
    </NavLink>
    {hasProcesses && <div className="nav-subitem-divider" />}
    {processes.map((proc) => (
      <NavLink
        key={proc.id}
        to={`/${dept.id}/${proc.id}`}
        className={({ isActive }) => 'nav-subitem' + (isActive ? ' active' : '')}
      >
        <span className="nav-subitem-dot"></span>
        <span className="nav-subitem-label">{proc.name}</span>
      </NavLink>
    ))}
  </div>
)}
```

- [ ] **Step 3: Update the expand-arrow to show for every non-dashboard dept**

In `frontend/src/components/Sidebar.jsx`, locate:

```jsx
{hasProcesses && (
  <span className={'nav-expand-arrow' + (isExpanded ? ' expanded' : '')}>
    &#9662;
  </span>
)}
```

Replace with:

```jsx
<span className={'nav-expand-arrow' + (isExpanded ? ' expanded' : '')}>
  &#9662;
</span>
```

(Removes the `hasProcesses` gate — every non-dashboard dept is expandable now because Admin + Manager always exist.)

- [ ] **Step 4: Add CSS for the new sub-link variants**

Append to `frontend/src/styles/sidebar.css`:

```css
/* Admin / Manager sidebar sub-links */
.nav-subitem-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  margin-right: 6px;
  font-size: 13px;
}
.nav-subitem.nav-subitem-admin,
.nav-subitem.nav-subitem-manager {
  font-weight: 600;
  color: rgba(226, 232, 240, 0.88);
}
.nav-subitem.nav-subitem-admin.active {
  background: rgba(59, 130, 246, 0.22);
  color: #bfdbfe;
}
.nav-subitem.nav-subitem-manager.active {
  background: rgba(16, 185, 129, 0.22);
  color: #a7f3d0;
}
.nav-subitem-divider {
  height: 1px;
  margin: 6px 16px;
  background: rgba(226, 232, 240, 0.08);
}
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/src/components/Sidebar.jsx frontend/src/styles/sidebar.css
git commit -m "feat(ui): inject Admin + Manager sub-links under each dept

Admin and Manager appear at the top of every expanded dept group,
followed by a divider and the existing processes list. Admin is
blue-tinted when active; Manager is green-tinted. Available on all
14 depts (including new Contact Center, Marketing, Telehealth).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Install Playwright + add smoke test

**Files:**
- Modify: `frontend/package.json` (add devDep + scripts)
- Create: `frontend/playwright.config.js`
- Create: `frontend/e2e/admin-manager-hubs.spec.js`

- [ ] **Step 1: Install Playwright**

```bash
cd /mnt/deepa/insur/frontend
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

Expected: `@playwright/test` appears in `devDependencies` and chromium browser is downloaded.

- [ ] **Step 2: Add test scripts to `package.json`**

Modify `frontend/package.json` — in the `"scripts"` object, add:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Create `playwright.config.js`**

Create `frontend/playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 4: Create the smoke test**

Create `frontend/e2e/admin-manager-hubs.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('Admin & Manager hubs — Phase 1 scaffolding', () => {
  test('Sidebar shows Admin and Manager sub-links for Sales', async ({ page }) => {
    await page.goto('/');
    // Expand Sales by clicking its parent row
    await page.getByText('Sales & Demand', { exact: false }).first().click();
    await expect(page.getByRole('link', { name: /Admin/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Manager/ }).first()).toBeVisible();
  });

  test('Admin page renders 10 tabs for Sales', async ({ page }) => {
    await page.goto('/sales/admin');
    await expect(page.locator('.page-title')).toContainText('Admin');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(10);
  });

  test('Manager page renders 7 tabs for Sales', async ({ page }) => {
    await page.goto('/sales/manager');
    await expect(page.locator('.page-title')).toContainText('Manager');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(7);
  });

  test('New departments appear on dashboard', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Contact Center', 'Marketing', 'Telehealth']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('/data-flow renders seeded edges', async ({ page }) => {
    await page.goto('/data-flow');
    await expect(page.locator('.page-title')).toContainText('Cross-Department Data Flow');
    // Has at least one row
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('Admin page for new Telehealth dept works', async ({ page }) => {
    await page.goto('/telehealth/admin');
    await expect(page.locator('.page-title')).toContainText('Telehealth');
    await expect(page.locator('.page-title')).toContainText('Admin');
  });

  test('Invalid dept redirects to dashboard', async ({ page }) => {
    await page.goto('/does-not-exist/admin');
    // The redirect sends us to "/" which renders Dashboard
    await expect(page).toHaveURL(/\/$/);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
cd /mnt/deepa/insur/frontend
npm run test:e2e
```

Expected: 7 tests pass.

If the dev server fails to start, check `playwright.config.js`'s `webServer.command`; make sure Vite listens on `5173` (default).

- [ ] **Step 6: Commit**

```bash
cd /mnt/deepa/insur
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.js frontend/e2e/
git commit -m "test(e2e): add Playwright smoke tests for Admin & Manager hubs

Verifies sidebar sub-links, Admin (10 tabs), Manager (7 tabs),
new departments on dashboard, /data-flow page, and invalid-dept
redirect. Installs @playwright/test as devDep and adds
test:e2e / test:e2e:ui scripts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Manual smoke verification

**Files:** none (runtime verification).

- [ ] **Step 1: Start dev server**

```bash
cd /mnt/deepa/insur/frontend
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/` and serves without console warnings about missing imports.

- [ ] **Step 2: Visit each page manually (or with a simple curl)**

Manually in browser — or with Playwright MCP if available — verify:

1. `http://localhost:5173/` → Dashboard shows 14 department tiles (grid wraps cleanly).
2. Expand "Sales & Demand" in sidebar → Admin + Manager links visible at top, divider, then processes.
3. `http://localhost:5173/sales/admin` → Admin page, 10 tabs, clicking each shows a "Coming in Phase 2–5" stub.
4. `http://localhost:5173/sales/manager` → Manager page, 7 tabs, stubs render.
5. `http://localhost:5173/contact-center/admin` → works (new dept).
6. `http://localhost:5173/marketing/manager` → works (new dept).
7. `http://localhost:5173/telehealth/admin` → works (new dept).
8. `http://localhost:5173/data-flow` → Table of 20 edges, preview text.
9. `http://localhost:5173/sales/forecasting` (existing process route) → still works.
10. Browser DevTools console: no errors, no warnings.

- [ ] **Step 3: Stop the dev server**

Press `Ctrl-C` in the terminal running `npm run dev` (or kill the background process).

- [ ] **Step 4: Final all-tests verification**

```bash
cd /mnt/deepa/insur/frontend
npm run lint
npm run build
npm run test:e2e
```

Expected: all three pass with zero errors.

- [ ] **Step 5: Final summary commit (optional — only if any cleanup was done)**

If any files needed adjustment during smoke test, commit them now with a concise message. Otherwise skip.

---

## Completion Criteria — Phase 1 DONE when

- [ ] All 14 tasks above are checked.
- [ ] `npm run lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `npm run test:e2e` — all 7 specs pass.
- [ ] Browser DevTools console is clean on every new page.
- [ ] Git log shows ~14 commits following conventional-commit style.

---

## Deferred to Phase 2+ (explicitly OUT of Phase 1 scope)

- Filling any admin/manager tab content beyond stubs.
- Completing role seed data for the other 11 departments.
- Expanding `aiUseCases.js` to ~100 entries covering all 14 depts.
- Cross-dept data-flow visualization (SVG/Mermaid) — currently shows table preview only.
- Wiring reports/KPIs to a backend API.
- User management / auth / RBAC enforcement.
- MCP server registration UI.
- Scheduled jobs editor.
