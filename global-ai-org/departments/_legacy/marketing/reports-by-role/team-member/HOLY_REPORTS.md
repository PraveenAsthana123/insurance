# HOLY Beverage — Marketing — Team Member Standard Reports

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have ≥ 3 standard
> reports. These are the reports the **team-member** in **marketing** uses.

## Standard Reports

| # | Report Name | Cadence | Format | Recipients |
|---|---|---|---|---|
| 1 | Daily my-work brief | daily | email | self |
| 2 | Weekly my-output rollup | weekly | CSV | self + manager |
| 3 | Monthly my-impact summary | monthly | PDF | self |

## Per-Report Details

Each report MUST have a JSON spec under `report_<n>.json` defining:

```json
{
  "id": "...",
  "title": "...",
  "cadence": "daily | weekly | monthly | quarterly | on-demand | per-release",
  "format": "CSV | PDF | Excel | JSON | email",
  "recipients": [...],
  "query": { "source": "...", "metrics": [...], "filters": {...}, "groupby": [...] },
  "chart_spec": { "library": "recharts | plotly | echarts | ...", "type": "...", "x": "...", "y": "..." },
  "retention_days": 365,
  "compliance_tags": ["SOC2 CC8.1", "..."]
}
```

## Distribution

- **Email**: SMTP via §37 chat-logger pattern; daily/weekly reports go out at 08:00 local
- **Slack**: webhook per channel; weekly/monthly summaries
- **Portal**: every report retrievable at `/holy/marketing/reports?role=team-member&id=<report_id>`
- **SFTP**: optional for downstream systems (finance / legal)

## Retention

Each report's retention is set in the JSON spec. Defaults:
- Daily reports: 90 days
- Weekly reports: 1 year
- Monthly + quarterly: 7 years (compliance per §38 + §47.6 SOC2)

## Audit

Every report generation MUST land in the decision audit row (§38.3) with:
- `request_id`, `actor_role=team-member`, `dept=marketing`, `report_id`, `recipients[]`
- `data_hash` (so we can prove what was sent vs what was claimed)

## Backend Contract

```
GET  /api/v1/holy/reports/marketing/team-member
  → list of standard reports

POST /api/v1/holy/reports/marketing/team-member/<report_id>/run
  → trigger report; returns {run_id, status, artifact_url}

GET  /api/v1/holy/reports/marketing/team-member/<report_id>/runs/<run_id>
  → status + signed download URL
```

## Related Artifacts

- `../../dashboards-by-role/team-member/HOLY_DASHBOARD.md` — paired dashboard
- `../../roles/team-member/HOLY_README.md` — role definition
- Frontend route: `/holy/marketing/reports?role=team-member`
