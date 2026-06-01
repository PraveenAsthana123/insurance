# HOLY Beverage — Digital Marketing — Test Architect Dashboard

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have a
> role-scoped dashboard. This is the dashboard for **test-architect** in **digital-marketing**.

## Persona

The **test-architect** at Digital Marketing. They use this dashboard
to make their day-to-day decisions. Tiles + charts here are tailored to
their authority + responsibility — no shared "everything for everyone" view.

## Focus

Test pyramid health + flaky-test count + per-service coverage

## KPIs Surfaced (Tiles)

- Test pyramid ratio
- Flaky tests
- Mean test duration
- Coverage per service (min/max)
- Process-drill pass-rate
- Pen-test gaps

Every tile shows: metric value + target/baseline + delta vs prior period + drill-down link.
Color-coded: 🟢 on target, 🟡 at risk, 🔴 below threshold.

## Charts (per §64.39 — full chart vocabulary)

- Test-pyramid stacked-bar (per service)
- Flaky-test heatmap (test × week)
- Coverage delta per release (waterfall)

Library dispatch per chart (recharts / plotly / echarts / d3 / vega-lite)
returned by backend `GET /api/v1/holy/dashboards/digital-marketing/test-architect/charts/<chart_id>`.

## Filters

- Date range (default last 30 days)
- Tenant (where applicable — per global §41.3 multi-tenant)
- Region / product / team (per dept)

## Refresh Cadence

- Real-time tiles: alerts, open items, current SLA
- Hourly: KPIs that aggregate over current day
- Daily: trend charts (12-week+ horizons)

## Permissions

| Can see | Cannot see |
|---|---|
| All data scoped to this dept | Data from other depts (unless cross-dept role) |
| Aggregated PII (per §38 + §47.6 SOC2) | Raw PII unless role has data-owner permission |
| Per-tenant data if assigned that tenant | Other tenants (per §41.3 multi-tenant isolation) |

## Actions

Inline actions the **test-architect** can take from this dashboard:
- Approve / reject (where workflow applies)
- Escalate to next role tier
- Drill into row-level source (audit trail per §38.3)
- Export current view (CSV / PDF / Excel per §23.2)

## Backend Contract

```
GET /api/v1/holy/dashboards/digital-marketing/test-architect
  → {tiles: [...], charts: [...], filters: {...}, refreshed_at}

GET /api/v1/holy/dashboards/digital-marketing/test-architect/charts/<chart_id>
  → {library, type, data, baseline, threshold, drill_url, refreshed_at}
```

## Related Artifacts

- `../../reports-by-role/test-architect/HOLY_REPORTS.md` — paired standard reports
- `../../roles/test-architect/HOLY_README.md` — role definition
- `../../business-layer/HOLY_DEMO_STORY.md` — dept narrative
- `../../business-layer/HOLY_ASIS_ASSESSMENT.md` — pain points this role addresses
- Frontend route: `/holy/digital-marketing/dashboard?role=test-architect`
