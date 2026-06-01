# Per-Department Admin & Manager Hubs — Design

**Date:** 2026-04-19
**Status:** Draft (awaiting user review)
**Scope:** Phase 1 only (foundation). Phases 2–5 will be planned separately.

---

## Summary

Add two new sub-pages to every department — **Admin** and **Manager** — reached from dedicated sidebar sub-links. Introduce 3 new departments (Contact Center, Marketing, Telehealth) taking the total from 11 → 14. Define four roles (Manager, Team Member, Compliance, Reporting & Monitoring) with responsibilities per department. Catalog ~100+ AI use cases across 16 categories (RPA, n8n, Voice AI, CRM, Campaign, Email Marketing, Digital Marketing, Vendor Mgmt, Contact Center Mgmt, Recommendation, Anomaly Detection, Fraud Detection, **AI Agent**, **Generative Marketing**, **SEO Content**, **Funnel Optimization**) — each with inputs, outputs, model, trigger, owner, and impact. Surface 23 report types filtered per role. Add a cross-department data-flow visualization at both per-dept and global scope.

Phase 1 delivers the foundation: data files, routes, sidebar links, and stub pages with tab scaffolding. Phases 2–5 will fill the tabs.

---

## Non-Goals (explicitly out of scope)

- Authentication / authorization (demo app — no login).
- Backend API wiring for reports/KPIs (Phase 1 uses static mock data).
- Real RBAC enforcement — roles are presentational only.
- Real-time monitoring data (charts show static/mock values in Phase 1).

---

## Architecture

### Stack (existing, unchanged)
- React 18 + Vite
- react-router-dom v6
- CSS variables (no CSS-in-JS framework)
- Data-driven: JS files in `frontend/src/data/` drive all UI

### Pattern (Phase 1 follows existing conventions)
- One data file per concept (matches `departments.js`, `processes.js`, `models.js`).
- Pages under `frontend/src/pages/`.
- Tab components under `frontend/src/components/<topic>-tabs/`.
- Routes declared centrally in `App.jsx`.

---

## Data Model

### File 1: `frontend/src/data/departments.js` — **EDIT**
Add three entries at appropriate positions:
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

### File 2: `frontend/src/data/roles.js` — **NEW**
```js
// Four canonical roles. Responsibilities tailored per dept.
export const ROLE_IDS = ['manager', 'team-member', 'compliance', 'reporting-monitoring'];

export const rolesByDept = {
  sales: {
    manager: { title: 'Sales Manager', responsibilities: [...], kpis: [...], reports: ['exec-kpi','mbr','team-scorecard',...] },
    'team-member': { title: 'Sales Analyst', responsibilities: [...], kpis: [...], reports: [...] },
    compliance: { title: 'Sales Compliance Officer', responsibilities: [...], kpis: [...], reports: [...] },
    'reporting-monitoring': { title: 'Sales Ops Monitor', responsibilities: [...], kpis: [...], reports: [...] },
  },
  // ... repeated for all 14 depts
};
```
**Phase 1 seed:** populate for **3 depts** (sales, marketing, contact-center) with full content to validate the shape. The remaining 11 depts get `{}` placeholder entries; the Roles & Responsibilities tab (built in Phase 2) will render a "Data not yet populated" fallback for those.

### File 3: `frontend/src/data/reports.js` — **NEW**
```js
// 23 report types, tagged by role, rendered with a common ReportCard template.
export const reportTypes = [
  { id: 'exec-kpi',           name: 'Executive KPI Dashboard', role: 'manager', category: 'dashboard' },
  { id: 'mbr',                name: 'Monthly Business Review', role: 'manager', category: 'report' },
  { id: 'team-scorecard',     name: 'Team Performance Scorecard', role: 'manager', category: 'scorecard' },
  { id: 'budget-vs-actuals',  name: 'Budget vs Actuals', role: 'manager', category: 'report' },
  { id: 'sla-summary',        name: 'SLA Compliance Summary', role: 'manager', category: 'compliance' },
  { id: 'roi-tracker',        name: 'ROI Tracker', role: 'manager', category: 'dashboard' },
  { id: 'pipeline-health',    name: 'Pipeline Health', role: 'manager', category: 'monitoring' },
  { id: 'my-tasks',           name: 'My Tasks / Work Queue', role: 'team-member', category: 'operational' },
  { id: 'daily-productivity', name: 'Daily Productivity', role: 'team-member', category: 'operational' },
  { id: 'personal-scorecard', name: 'Personal Scorecard', role: 'team-member', category: 'scorecard' },
  { id: 'assigned-incidents', name: 'Assigned Incidents', role: 'team-member', category: 'monitoring' },
  { id: 'audit-trail',        name: 'Audit Trail', role: 'compliance', category: 'audit' },
  { id: 'regulatory-checklist', name: 'Regulatory Compliance Checklist', role: 'compliance', category: 'compliance' },
  { id: 'policy-violations',  name: 'Policy Violations', role: 'compliance', category: 'audit' },
  { id: 'model-fairness',     name: 'Model Fairness & Bias', role: 'compliance', category: 'ai-governance' },
  { id: 'pii-access',         name: 'PII Access Log', role: 'compliance', category: 'audit' },
  { id: 'change-mgmt',        name: 'Change Management Log', role: 'compliance', category: 'audit' },
  { id: 'system-health',      name: 'System Health Dashboard', role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'model-drift',        name: 'Model Drift & Accuracy', role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'pipeline-status',    name: 'Data Pipeline Status', role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'anomaly-detection',  name: 'Anomaly Detection', role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'scheduled-jobs',     name: 'Scheduled Job Status', role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'api-latency',        name: 'API Usage & Latency', role: 'reporting-monitoring', category: 'monitoring' },
];
```

### File 4: `frontend/src/data/aiUseCases.js` — **NEW**
```js
export const USE_CASE_CATEGORIES = [
  'RPA', 'n8n', 'Voice AI', 'CRM', 'Campaign', 'Email Marketing',
  'Digital Marketing', 'Vendor Mgmt', 'Contact Center Mgmt',
  'Recommendation', 'Anomaly Detection', 'Fraud Detection',
  'AI Agent', 'Generative Marketing', 'SEO Content', 'Funnel Optimization',
];

export const aiUseCases = [
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
  // ... 8–10 per dept, 13 depts, ≈100+ entries
];
```
**Phase 1 seed:** ~20 representative use cases spanning all 16 categories and the 3 seed depts (sales, marketing, contact-center) — enough to validate the data shape. Full ~100-entry catalog is Phase 2.

### File 5: `frontend/src/data/dataFlow.js` — **NEW**
```js
export const dataFlowEdges = [
  { from: 'retail', to: 'sales', entity: 'POS transactions', schedule: 'hourly', sla: '< 5min lag' },
  { from: 'sales', to: 'finance', entity: 'revenue by SKU', schedule: 'daily', sla: 'EOD+1h' },
  { from: 'customer', to: 'marketing', entity: 'segment scores', schedule: 'nightly', sla: '05:00 UTC' },
  // ... ~30 edges covering all depts
];
```

---

## Routing (App.jsx — EDIT)

```jsx
<Route path="/" element={<Dashboard />} />
<Route path="/data-flow" element={<DataFlowPage />} />                    // NEW (stub)
<Route path="/:departmentId" element={<DepartmentPage />} />
<Route path="/:departmentId/admin" element={<AdminPage />} />            // NEW
<Route path="/:departmentId/manager" element={<ManagerPage />} />        // NEW
<Route path="/:departmentId/:processId" element={<ProcessPage />} />
```

---

## Components (NEW)

### `frontend/src/pages/AdminPage.jsx`
Renders page header + tab bar with **10 tabs**. Phase 1 tab panels are stubs showing "Coming in Phase 2–5".
Tabs: Users & Roles · Permissions · **Integrations & Data Sources** · **MCP Servers** · Model Registry · AI Use Cases & Automations · **Workflows** · Scheduled Jobs · Audit Log · Settings

**Integrations & Data Sources** tab (Phase 2+) covers: REST/GraphQL APIs · databases (Postgres, Snowflake, etc.) · Kaggle datasets · SaaS connectors (Salesforce, SAP, Shopify) · ETL pipeline schedules · field mappings · sync health.

**MCP Servers** tab (Phase 2+) covers Model Context Protocol server registrations the dept's AI features consume: server URL · transport (stdio/HTTP/SSE) · auth · advertised tools & resources · health check · rate limits.

**Workflows** tab (Phase 2+) catalogs workflow automations across 6 domains: **Customer · Process · Employee · Admin · Testing · Security**. Each workflow shows trigger · steps · AI actions (response/follow-up/approvals) · owner · status.

### `frontend/src/pages/ManagerPage.jsx`
Same structure, 7 tabs:
KPI Dashboard · Status & Health · Reports · Monitoring & Alerts · Team Performance · Cross-Dept Data Flow · Roles & Responsibilities

### `frontend/src/pages/DataFlowPage.jsx`
Stub page with "Global data-flow diagram — coming in Phase 4".

### `frontend/src/components/admin-tabs/` and `frontend/src/components/manager-tabs/`
Empty placeholder `.jsx` files per tab — each exports a `function <Name>Tab({ dept }) { return <div>Coming soon</div>; }`. Lets Phase 2+ fill them without touching page shells.

### `frontend/src/components/Sidebar.jsx` (EDIT)
Inside each expanded department group, inject two fixed sub-links above the processes list:
```jsx
<NavLink to={`/${dept.id}/admin`}   className="nav-subitem nav-subitem-admin">
  <span className="nav-subitem-icon">⚙️</span> Admin
</NavLink>
<NavLink to={`/${dept.id}/manager`} className="nav-subitem nav-subitem-manager">
  <span className="nav-subitem-icon">📊</span> Manager
</NavLink>
<div className="nav-subitem-divider" />
{processes.map(...)}   // existing
```

---

## Acceptance Criteria (Phase 1)

- [ ] Sidebar shows "⚙️ Admin" and "📊 Manager" sub-links under every department (14 depts total incl. new Contact Center + Marketing + Telehealth).
- [ ] Clicking a link navigates to `/:deptId/admin` or `/:deptId/manager`.
- [ ] Admin page renders header + tab bar with 10 tabs (panels stubbed).
- [ ] Manager page renders header + tab bar with 7 tabs (panels stubbed).
- [ ] Data files (`roles.js`, `reports.js`, `aiUseCases.js`, `dataFlow.js`) exist, import cleanly, validate Phase-1 seed data for at least 3 depts.
- [ ] `departments.js` now lists 14 departments; Dashboard tile grid renders all 14 without layout break.
- [ ] No console errors. Vite dev server runs clean. Existing routes (Dashboard, DepartmentPage, ProcessPage) still work.

---

## Testing

- Manual smoke test: visit each dept in sidebar → Admin → Manager; verify tabs render and navigation works.
- Run `npm run validate` (lint + format + unit tests) — must pass with zero errors.
- Playwright smoke test (`e2e/admin-manager-hubs.spec.js` — new): asserts sidebar shows new sub-links on first dept, both pages mount, tab bar present.

---

## Error Handling

- Invalid `:departmentId` → redirect to `/` (matches existing `DepartmentPage` behavior).
- Missing data entries (e.g., role for dept without seed data) → render "Data not yet populated for <dept>" fallback rather than crashing.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sidebar becomes too tall with 14 × (Admin + Manager + processes) | Collapsed by default (existing behavior); divider between Admin/Manager and processes for visual separation. |
| Tab proliferation on Admin/Manager pages (10 + 7 = 17 tabs) | Existing `.tabs-bar` already supports horizontal scroll (used in ProcessPage). Reuse the same CSS. |
| New departments break Dashboard tile grid | Dashboard already uses CSS grid `auto-fill` — should flow. Verify in Phase 1. |
| Data file seed inconsistency across 14 depts | Phase 1 fully seeds only 3 depts; others have skeleton + `TODO:` comments. Phase 2 completes them. |

---

## Build Order (Phase 1 tasks)

1. Edit `data/departments.js` → add Contact Center + Marketing + Telehealth.
2. Create `data/roles.js` with seed data for 3 depts + skeletons for 11.
3. Create `data/reports.js` with full 23-report catalog.
4. Create `data/aiUseCases.js` with ~20 seed entries spanning all 16 categories.
5. Create `data/dataFlow.js` with ~20 edges covering the 3 seed depts + connectivity to others.
6. Create `pages/AdminPage.jsx` + `components/admin-tabs/*` stubs.
7. Create `pages/ManagerPage.jsx` + `components/manager-tabs/*` stubs.
8. Create `pages/DataFlowPage.jsx` stub.
9. Edit `App.jsx` — register new routes.
10. Edit `Sidebar.jsx` — inject Admin/Manager sub-links.
11. Smoke test (manual + Playwright).
12. Commit.

---

## Out of Scope — deferred to Phase 2+

- Phase 2: Fill Roles & Responsibilities tab, Reports tab, RPA/n8n/AI Use Cases admin tab.
- Phase 3: Users & Roles admin tab, Permissions matrix, Audit log.
- Phase 4: Cross-dept data-flow visualization (per-dept + global).
- Phase 5: Remaining tabs (Monitoring, Scheduled Jobs, Model Registry, KPI Dashboard with charts).

### Phase 2+ content direction — Enterprise AI Reference Architecture

User-approved direction: Phase 2 tab content folds in a 9-layer Enterprise AI Reference Architecture:

| Architecture Layer | Hosts in |
|---|---|
| Experience (multi-channel apps) | Manager → KPI Dashboard; Dashboard tiles |
| Prompt (governance, versioning) | Admin → Model Registry |
| Agent (multi-agent orchestration) | Admin → AI Use Cases (AI Agent category) |
| Orchestration (event pipelines) | Admin → Workflows, Scheduled Jobs |
| LLM (multi-model routing) | Admin → Model Registry, MCP Servers |
| Retrieval (hybrid + reranker) | Admin → Integrations (Vector DB, Search); Manager → Status & Health (retrieval latency) |
| Data (lakehouse) | Admin → Integrations (Databricks/Snowflake/Kafka); Manager → Cross-Dept Data Flow |
| Governance (RBAC, PII, audit) | Admin → Users & Roles, Permissions, Audit Log |
| Observability (LLMOps) | Manager → Monitoring & Alerts, Status & Health |

This mapping is Phase 2+ implementation guidance and does **not** expand Phase 1 scope.

---

## Decisions (locked this session)

| Q | Decision |
|---|---|
| Scope | **Phase 1 only first** |
| New depts | Add Contact Center + Marketing + Telehealth (14 total) |
| Data flow viz | Both per-dept and global (Phase 4) |
| Data source | Static mock data in JS files |
| Use case categories | **16** — RPA, n8n, Voice AI, CRM, Campaign, Email Mkt, Digital Mkt, Vendor Mgmt, Contact Center Mgmt, Recommendation, Anomaly Detection, Fraud Detection, AI Agent, Generative Marketing, SEO Content, Funnel Optimization |
| Admin tabs | 10 (adds Workflows covering customer/process/employee/admin/testing/security) |
| Structural changes | **LOCKED** — no more additions; further requirements become Phase 2+ content |
