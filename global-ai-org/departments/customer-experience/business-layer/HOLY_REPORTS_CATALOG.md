# HOLY Beverage — Customer Experience — Reports Catalog

> Per operator 2026-05-22 — dept-level rollup of every standard
> report this dept publishes across its 15 roles.
> Primary dept KPI tracked across most reports: **CSAT + ticket deflection**.
> Composes with global §38 audit + §47.6 RBAC + §57.6 canonical
> envelope + §59 MDD + §64.37 per-role reports (sibling) + §66.

## 1. Catalog (15 standard reports)

Per global §64.37.2 — every dept ships the same 15 role archetypes
with dept-specific titles. Each row is a published deliverable;
each generation lands an audit row per §38.3.

| # | report_id | Title | Cadence | Format | Owner Role | Audience |
|---|---|---|---|---|---|---|
| 1 | `daily_ops_digest` | Customer Experience Daily Operations Digest | daily 08:00 | PDF + Slack | admin | admin / devops / manager |
| 2 | `weekly_business_review` | Customer Experience Weekly Business Review | weekly Monday | PDF + email | manager | manager / dept staff |
| 3 | `daily_my_work` | Customer Experience My-Work Brief | daily 07:00 | email | team-member | team-member (per user) |
| 4 | `pre_release_test_report` | Customer Experience Pre-Release Test Report | per release | HTML | tester | tester / engineering / manager |
| 5 | `weekly_security_posture` | Customer Experience Weekly Security Posture | weekly Monday | PDF | security | security / information-security / manager |
| 6 | `dora_weekly` | Customer Experience DORA Metrics (Deploy/MTTR/etc.) | weekly | Grafana JSON | devops | devops / engineering / manager |
| 7 | `monthly_model_review` | Customer Experience Monthly Model-Card Review | monthly | PDF + Notion | ai-reviewer | ai-reviewer / ai-strategy / manager |
| 8 | `quarterly_dt_scorecard` | Customer Experience Quarterly DT Scorecard | quarterly | PDF | digital-transformation | digital-transformation / executive-leadership |
| 9 | `monthly_arch_review` | Customer Experience Monthly Architecture Review | monthly | Markdown | system-architect | system-architect / engineering / devops |
| 10 | `quarterly_test_strategy` | Customer Experience Quarterly Test Strategy Report | quarterly | PDF | test-architect | test-architect / engineering / tester |
| 11 | `weekly_db_health` | Customer Experience Weekly DB Health Report | weekly | Grafana | database-architect | database-architect / devops |
| 12 | `weekly_api_contract` | Customer Experience Weekly API Contract Review | weekly | Markdown | api-architect | api-architect / engineering |
| 13 | `monthly_data_steward` | Customer Experience Monthly Data Steward Report | monthly | PDF | data-owner | data-owner / ai-strategy / manager |
| 14 | `quarterly_dt_strategy` | Customer Experience Quarterly DT Strategy Report | quarterly | PDF + slides | ai-strategy | ai-strategy / executive-leadership / manager |
| 15 | `monthly_infosec` | Customer Experience Monthly InfoSec Report | monthly | PDF | information-security | information-security / security / executive-leadership |

## 2. Per-report contract

Every report MUST surface these properties at the catalog endpoint:

| Field | Purpose |
|---|---|
| `report_id` | Stable identifier — namespaced per dept |
| `title` | Human-readable name |
| `cadence` | When it runs (daily 08:00 / weekly Monday / monthly / quarterly / per-release) |
| `format` | Output type (PDF / HTML / email / Slack / Notion / Grafana / Markdown) |
| `owner_role` | Role responsible for the report's accuracy |
| `audience` | Roles that consume it (RBAC enforced per §47.6 SOC2 CC6.2) |
| `last_generated_at` | ISO-8601 of last successful run (from audit) |
| `next_scheduled_at` | ISO-8601 of next planned run |

## 3. Audit row per generation (§38.3)

Every report-generation event writes:

```json
{
  "event_id": "evt-report-<request_id>",
  "event_type": "report.<report_id>",
  "request_id": "<uuid>",
  "tenant_id": "<tenant>",
  "actor": "report-generator-worker",
  "dept": "customer-experience",
  "timestamp": "<ISO-8601>",
  "latency_ms": "<int>",
  "outcome": "ok | partial | failed",
  "payload": {
    "report_id": "<report_id>",
    "audience_delivered_to": ["<role>", ...],
    "format": "<format>",
    "size_bytes": "<int>"
  }
}
```

## 4. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/reports/customer-experience` | All 15 standard reports + dept-specific |
| `GET /api/v1/holy/reports/customer-experience/<report_id>` | Single report detail + audit summary |
| `GET /api/v1/holy/reports/_global` | Cross-dept inventory + counts |

## 5. Drill (release blocker)

`tests/drills/drill_reports_catalog.py` asserts:
- Every dept catalog has exactly 15 standard reports (per §64.37.2)
- Every report carries 6 required fields
- Report IDs unique within a dept
- Owner roles match the 15-role list per §63 scaffold
- NEGATIVE: unknown dept → 404
- NEGATIVE: malformed report_id (caps/special) → 400
- NEGATIVE: report_id duplication across rows → release blocker

## 6. Compose-footer (§49)

- [`reports-by-role/`](../reports-by-role/) — per-role report specs (sibling, role-scoped)
- [`dashboards-by-role/`](../dashboards-by-role/) — sibling per-role dashboards
- [`HOLY_TRANSACTIONS.md`](./HOLY_TRANSACTIONS.md) — audit rows for each report generation
- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — per-job health for cron-driven reports
- [`HOLY_PIPELINES.md`](./HOLY_PIPELINES.md) — Phase-5 (Report) of each pipeline references these
- [`HOLY_PROCESS_MGMT.md`](./HOLY_PROCESS_MGMT.md) — processes that produce report inputs
- [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) — functional requirements served by reports
