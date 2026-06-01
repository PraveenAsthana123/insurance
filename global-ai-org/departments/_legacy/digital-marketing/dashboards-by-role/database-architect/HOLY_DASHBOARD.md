# HOLY Beverage — Digital Marketing — Database Architect Dashboard

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have a
> role-scoped dashboard. This is the dashboard for **database-architect** in **digital-marketing**.

## Persona

The **database-architect** at Digital Marketing. They use this dashboard
to make their day-to-day decisions. Tiles + charts here are tailored to
their authority + responsibility — no shared "everything for everyone" view.

## Focus

Query latency + slow-query list + schema drift + replication lag

## KPIs Surfaced (Tiles)

- DB latency p95
- Slow queries (24h)
- Schema-drift count
- Replica lag (max)
- Disk usage %
- Open migration backlog

Every tile shows: metric value + target/baseline + delta vs prior period + drill-down link.
Color-coded: 🟢 on target, 🟡 at risk, 🔴 below threshold.

## Charts (per §64.39 — full chart vocabulary)

- Slow-query top-20 bar (with explain plan link)
- Schema drift over time
- Replica lag heatmap

Library dispatch per chart (recharts / plotly / echarts / d3 / vega-lite)
returned by backend `GET /api/v1/holy/dashboards/digital-marketing/database-architect/charts/<chart_id>`.

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

Inline actions the **database-architect** can take from this dashboard:
- Approve / reject (where workflow applies)
- Escalate to next role tier
- Drill into row-level source (audit trail per §38.3)
- Export current view (CSV / PDF / Excel per §23.2)

## Backend Contract

```
GET /api/v1/holy/dashboards/digital-marketing/database-architect
  → {tiles: [...], charts: [...], filters: {...}, refreshed_at}

GET /api/v1/holy/dashboards/digital-marketing/database-architect/charts/<chart_id>
  → {library, type, data, baseline, threshold, drill_url, refreshed_at}
```

## Related Artifacts

- `../../reports-by-role/database-architect/HOLY_REPORTS.md` — paired standard reports
- `../../roles/database-architect/HOLY_README.md` — role definition
- `../../business-layer/HOLY_DEMO_STORY.md` — dept narrative
- `../../business-layer/HOLY_ASIS_ASSESSMENT.md` — pain points this role addresses
- Frontend route: `/holy/digital-marketing/dashboard?role=database-architect`
