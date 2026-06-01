# HOLY Beverage — Sales — Demo Stories by Role

> Per operator 2026-05-22 — every dept publishes a role-scoped
> demo script for each of the 15 §63 role archetypes.
> Dept anchor KPI: **Pipeline conversion + churn**.
> Composes with global §38 audit + §47.6 RBAC + §57.6 envelope
> + §59 MDD + §63 15-role scaffold + §64.1 dept-level demo
> (sibling) + §64.37 per-role dashboards + §66.

## 1. Catalog

All 15 demo scripts below. Each fits a 90-second slot; chain
any 3-5 to assemble a Sales board demo.

| # | role | demo_id | Persona | Focus | Primary route |
|---|---|---|---|---|---|
| 1 | `admin` | `admin_demo` | Admin (System) | Tenant onboarding + RBAC drift detection | `/admin` |
| 2 | `manager` | `manager_demo` | Dept Manager | KPI surface + approval queue + team perf | `/dashboard?role=manager` |
| 3 | `team-member` | `team_member_demo` | Team Member | My-work queue + my SLA + personal metrics | `/dashboard?role=team-member` |
| 4 | `tester` | `tester_demo` | QA / Tester | Regression heatmap + flaky-test triage | `/dashboard?role=tester` |
| 5 | `security` | `security_demo` | SecOps Engineer | Alert volume + MTTD/MTTR + vuln backlog | `/security` |
| 6 | `devops` | `devops_demo` | DevOps | DORA metrics + deploy frequency + cost | `/dashboard?role=devops` |
| 7 | `ai-reviewer` | `ai_reviewer_demo` | AI Reviewer | Model drift + fairness gate + override rate | `/monitoring + /pipelines` |
| 8 | `digital-transformation` | `digital_transformation_demo` | DT Lead | AS-IS vs TO-BE + automation % per process | `/dashboard?role=digital-transformation` |
| 9 | `system-architect` | `system_architect_demo` | System Architect | Service health + dep graph + capacity | `/c4-model/deep` |
| 10 | `test-architect` | `test_architect_demo` | Test Architect | Test pyramid health + coverage per service | `/dashboard?role=test-architect` |
| 11 | `database-architect` | `database_architect_demo` | DB Architect | Slow-query list + schema drift + replication | `/dashboard?role=database-architect` |
| 12 | `api-architect` | `api_architect_demo` | API Architect | API p95 + version adoption + deprecation | `/dashboard?role=api-architect` |
| 13 | `data-owner` | `data_owner_demo` | Data Owner | Data quality + lineage + freshness SLA | `/dashboard?role=data-owner` |
| 14 | `ai-strategy` | `ai_strategy_demo` | AI Strategy Lead | Automation backlog + ROI vs plan | `/dashboard?role=ai-strategy` |
| 15 | `information-security` | `information_security_demo` | InfoSec / CISO Office | Compliance gates + CVE backlog + 3rd-party risk | `/security/deep` |

## 2. Demo script template (9 sections each)

Every demo below carries this shape — operator can copy-paste
into a slide deck or use as live-walkthrough script:

| Section | Content |
|---|---|
| 1 Persona | Named role + their daily/weekly decisions |
| 2 Scenario | Concrete business situation + main KPI moved |
| 3 KPI | The single number this demo demonstrates moving |
| 4 Steps | 3-7 click-by-click actions in the UI |
| 5 Talking Points | What the presenter says at each step |
| 6 Success Criteria | Drill-able assertions (latency / count / state) |
| 7 Gotchas | Pre-warm tips, env requirements, things that break |
| 8 Audit | What audit row(s) this demo writes per §38.3 |
| 9 Related | Cross-refs to FRD requirements + sibling demos |

## 3. Per-role demo scripts

### 3.1 — Admin (System) (`admin`)

- **demo_id**: `admin_demo`
- **Persona**: Admin (System) in Sales
- **Scenario**: Demonstrate **Tenant onboarding + RBAC drift detection** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/admin` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is Admin (System)'s view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Tenant onboarding + RBAC drift detection."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `admin` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.admin.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/admin/HOLY_REPORTS.md`](../reports-by-role/admin/HOLY_REPORTS.md) (role-specific reports)

### 3.2 — Dept Manager (`manager`)

- **demo_id**: `manager_demo`
- **Persona**: Dept Manager in Sales
- **Scenario**: Demonstrate **KPI surface + approval queue + team perf** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=manager` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is Dept Manager's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by KPI surface + approval queue + team perf."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `manager` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.manager.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/manager/HOLY_REPORTS.md`](../reports-by-role/manager/HOLY_REPORTS.md) (role-specific reports)

### 3.3 — Team Member (`team-member`)

- **demo_id**: `team_member_demo`
- **Persona**: Team Member in Sales
- **Scenario**: Demonstrate **My-work queue + my SLA + personal metrics** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=team-member` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is Team Member's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by My-work queue + my SLA + personal metrics."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `team-member` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.team_member.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/team-member/HOLY_REPORTS.md`](../reports-by-role/team-member/HOLY_REPORTS.md) (role-specific reports)

### 3.4 — QA / Tester (`tester`)

- **demo_id**: `tester_demo`
- **Persona**: QA / Tester in Sales
- **Scenario**: Demonstrate **Regression heatmap + flaky-test triage** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=tester` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is QA / Tester's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Regression heatmap + flaky-test triage."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `tester` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.tester.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/tester/HOLY_REPORTS.md`](../reports-by-role/tester/HOLY_REPORTS.md) (role-specific reports)

### 3.5 — SecOps Engineer (`security`)

- **demo_id**: `security_demo`
- **Persona**: SecOps Engineer in Sales
- **Scenario**: Demonstrate **Alert volume + MTTD/MTTR + vuln backlog** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/security` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is SecOps Engineer's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Alert volume + MTTD/MTTR + vuln backlog."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `security` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.security.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/security/HOLY_REPORTS.md`](../reports-by-role/security/HOLY_REPORTS.md) (role-specific reports)

### 3.6 — DevOps (`devops`)

- **demo_id**: `devops_demo`
- **Persona**: DevOps in Sales
- **Scenario**: Demonstrate **DORA metrics + deploy frequency + cost** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=devops` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is DevOps's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by DORA metrics + deploy frequency + cost."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `devops` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.devops.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/devops/HOLY_REPORTS.md`](../reports-by-role/devops/HOLY_REPORTS.md) (role-specific reports)

### 3.7 — AI Reviewer (`ai-reviewer`)

- **demo_id**: `ai_reviewer_demo`
- **Persona**: AI Reviewer in Sales
- **Scenario**: Demonstrate **Model drift + fairness gate + override rate** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/monitoring + /pipelines` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is AI Reviewer's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Model drift + fairness gate + override rate."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `ai-reviewer` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.ai_reviewer.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/ai-reviewer/HOLY_REPORTS.md`](../reports-by-role/ai-reviewer/HOLY_REPORTS.md) (role-specific reports)

### 3.8 — DT Lead (`digital-transformation`)

- **demo_id**: `digital_transformation_demo`
- **Persona**: DT Lead in Sales
- **Scenario**: Demonstrate **AS-IS vs TO-BE + automation % per process** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=digital-transformation` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is DT Lead's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by AS-IS vs TO-BE + automation % per process."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `digital-transformation` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.digital_transformation.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/digital-transformation/HOLY_REPORTS.md`](../reports-by-role/digital-transformation/HOLY_REPORTS.md) (role-specific reports)

### 3.9 — System Architect (`system-architect`)

- **demo_id**: `system_architect_demo`
- **Persona**: System Architect in Sales
- **Scenario**: Demonstrate **Service health + dep graph + capacity** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/c4-model/deep` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is System Architect's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Service health + dep graph + capacity."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `system-architect` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.system_architect.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/system-architect/HOLY_REPORTS.md`](../reports-by-role/system-architect/HOLY_REPORTS.md) (role-specific reports)

### 3.10 — Test Architect (`test-architect`)

- **demo_id**: `test_architect_demo`
- **Persona**: Test Architect in Sales
- **Scenario**: Demonstrate **Test pyramid health + coverage per service** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=test-architect` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is Test Architect's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Test pyramid health + coverage per service."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `test-architect` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.test_architect.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/test-architect/HOLY_REPORTS.md`](../reports-by-role/test-architect/HOLY_REPORTS.md) (role-specific reports)

### 3.11 — DB Architect (`database-architect`)

- **demo_id**: `database_architect_demo`
- **Persona**: DB Architect in Sales
- **Scenario**: Demonstrate **Slow-query list + schema drift + replication** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=database-architect` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is DB Architect's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Slow-query list + schema drift + replication."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `database-architect` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.database_architect.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/database-architect/HOLY_REPORTS.md`](../reports-by-role/database-architect/HOLY_REPORTS.md) (role-specific reports)

### 3.12 — API Architect (`api-architect`)

- **demo_id**: `api_architect_demo`
- **Persona**: API Architect in Sales
- **Scenario**: Demonstrate **API p95 + version adoption + deprecation** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=api-architect` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is API Architect's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by API p95 + version adoption + deprecation."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `api-architect` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.api_architect.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/api-architect/HOLY_REPORTS.md`](../reports-by-role/api-architect/HOLY_REPORTS.md) (role-specific reports)

### 3.13 — Data Owner (`data-owner`)

- **demo_id**: `data_owner_demo`
- **Persona**: Data Owner in Sales
- **Scenario**: Demonstrate **Data quality + lineage + freshness SLA** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=data-owner` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is Data Owner's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Data quality + lineage + freshness SLA."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `data-owner` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.data_owner.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/data-owner/HOLY_REPORTS.md`](../reports-by-role/data-owner/HOLY_REPORTS.md) (role-specific reports)

### 3.14 — AI Strategy Lead (`ai-strategy`)

- **demo_id**: `ai_strategy_demo`
- **Persona**: AI Strategy Lead in Sales
- **Scenario**: Demonstrate **Automation backlog + ROI vs plan** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/dashboard?role=ai-strategy` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is AI Strategy Lead's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Automation backlog + ROI vs plan."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `ai-strategy` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.ai_strategy.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/ai-strategy/HOLY_REPORTS.md`](../reports-by-role/ai-strategy/HOLY_REPORTS.md) (role-specific reports)

### 3.15 — InfoSec / CISO Office (`information-security`)

- **demo_id**: `information_security_demo`
- **Persona**: InfoSec / CISO Office in Sales
- **Scenario**: Demonstrate **Compliance gates + CVE backlog + 3rd-party risk** on the Sales dashboards
- **KPI moved**: Pipeline conversion + churn
- **Steps**: Navigate to `/security/deep` → drill into the top tile → trigger a representative action (e.g. approve / page / refresh) → confirm the audit row writes to the per-dept transaction feed
- **Talking points**: "This is InfoSec / CISO Office's view of Sales. In 90 seconds we'll move Pipeline conversion + churn by Compliance gates + CVE backlog + 3rd-party risk."
- **Success criteria** (drill-able):
  - Dashboard endpoint responds in p95 < 500ms
  - Action triggers an audit row visible in `/api/v1/holy/transactions/sales` within 30s
  - RBAC denies the action when the actor lacks the `information-security` scope
- **Gotchas**: pre-load demo data; ensure Ollama warm; clear browser cache
- **Audit**: writes event `demo.information_security.<action>` per §38.3
- **Related**: [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) (dept-level demo) · [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) (functional requirements) · [`reports-by-role/information-security/HOLY_REPORTS.md`](../reports-by-role/information-security/HOLY_REPORTS.md) (role-specific reports)

## 4. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/demo-stories/sales` | All 15 role demos |
| `GET /api/v1/holy/demo-stories/sales/<role>` | Single role demo detail |
| `GET /api/v1/holy/demo-stories/_global` | Cross-dept demo inventory (285 total) |

## 5. Drill (release blocker)

`tests/drills/drill_demo_stories.py` asserts:
- Per-dept catalog has exactly 15 demos (matches §63 role archetypes)
- Every demo carries the 9 canonical sections
- No duplicate demo_id within a dept
- Every role ∈ 15-role §63 archetype set (no typos / drift)
- NEGATIVE: unknown dept → 404
- NEGATIVE: unknown role → 404 + lists available
- NEGATIVE: malformed role (caps/special) → 400

## 6. Compose-footer (§49)

- [`HOLY_DEMO_STORY.md`](./HOLY_DEMO_STORY.md) — sibling dept-level demo (§64.1)
- [`HOLY_REPORTS_CATALOG.md`](./HOLY_REPORTS_CATALOG.md) — each role demo cites its role-scoped reports
- [`HOLY_PIPELINES.md`](./HOLY_PIPELINES.md) — Phase 5 (Report) of each pipeline anchors a demo
- [`HOLY_TRANSACTIONS.md`](./HOLY_TRANSACTIONS.md) — audit rows demos write
- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — per-tile health surfaced in demos
- [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) — FR-rows each demo proves
- [`reports-by-role/`](../reports-by-role/) — role-scoped reports sibling
- [`dashboards-by-role/`](../dashboards-by-role/) — role-scoped dashboards sibling
