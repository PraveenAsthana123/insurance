# HOLY Beverage — Engineering — Security Dashboard

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have a
> role-scoped dashboard. This is the dashboard for **security** in **engineering**.

## Persona

The **security** at Engineering. They use this dashboard
to make their day-to-day decisions. Tiles + charts here are tailored to
their authority + responsibility — no shared "everything for everyone" view.

## Focus

Threat counts + alert volume + MTTD/MTTR + vuln backlog

## KPIs Surfaced (Tiles)

- Open alerts
- Alerts (24h)
- MTTD median
- MTTR median
- Open CVEs (CVSS≥7)
- Pen-test findings

Every tile shows: metric value + target/baseline + delta vs prior period + drill-down link.
Color-coded: 🟢 on target, 🟡 at risk, 🔴 below threshold.

## Charts (per §64.39 — full chart vocabulary)

- Alert-volume time-series (with anomaly flags)
- MTTR distribution (boxplot)
- Top 10 vuln categories (pareto)

Library dispatch per chart (recharts / plotly / echarts / d3 / vega-lite)
returned by backend `GET /api/v1/holy/dashboards/engineering/security/charts/<chart_id>`.

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

Inline actions the **security** can take from this dashboard:
- Approve / reject (where workflow applies)
- Escalate to next role tier
- Drill into row-level source (audit trail per §38.3)
- Export current view (CSV / PDF / Excel per §23.2)

## Backend Contract

```
GET /api/v1/holy/dashboards/engineering/security
  → {tiles: [...], charts: [...], filters: {...}, refreshed_at}

GET /api/v1/holy/dashboards/engineering/security/charts/<chart_id>
  → {library, type, data, baseline, threshold, drill_url, refreshed_at}
```

## Related Artifacts

- `../../reports-by-role/security/HOLY_REPORTS.md` — paired standard reports
- `../../roles/security/HOLY_README.md` — role definition
- `../../business-layer/HOLY_DEMO_STORY.md` — dept narrative
- `../../business-layer/HOLY_ASIS_ASSESSMENT.md` — pain points this role addresses
- Frontend route: `/holy/engineering/dashboard?role=security`
