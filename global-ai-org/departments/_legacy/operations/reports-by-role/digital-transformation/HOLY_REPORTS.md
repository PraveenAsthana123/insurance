# HOLY Beverage — Operations — Digital Transformation Standard Reports

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have ≥ 3 standard
> reports. These are the reports the **digital-transformation** in **operations** uses.

## Standard Reports

| # | Report Name | Cadence | Format | Recipients |
|---|---|---|---|---|
| 1 | Monthly DT scorecard | monthly | PDF | exec + ai-strategy |
| 2 | Quarterly impact realized | quarterly | PDF | board + exec |
| 3 | Per-process AS-IS-vs-TO-BE deltas | on-demand | CSV | ai-strategy |

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
- **Portal**: every report retrievable at `/holy/operations/reports?role=digital-transformation&id=<report_id>`
- **SFTP**: optional for downstream systems (finance / legal)

## Retention

Each report's retention is set in the JSON spec. Defaults:
- Daily reports: 90 days
- Weekly reports: 1 year
- Monthly + quarterly: 7 years (compliance per §38 + §47.6 SOC2)

## Audit

Every report generation MUST land in the decision audit row (§38.3) with:
- `request_id`, `actor_role=digital-transformation`, `dept=operations`, `report_id`, `recipients[]`
- `data_hash` (so we can prove what was sent vs what was claimed)

## Backend Contract

```
GET  /api/v1/holy/reports/operations/digital-transformation
  → list of standard reports

POST /api/v1/holy/reports/operations/digital-transformation/<report_id>/run
  → trigger report; returns {run_id, status, artifact_url}

GET  /api/v1/holy/reports/operations/digital-transformation/<report_id>/runs/<run_id>
  → status + signed download URL
```

## Related Artifacts

- `../../dashboards-by-role/digital-transformation/HOLY_DASHBOARD.md` — paired dashboard
- `../../roles/digital-transformation/HOLY_README.md` — role definition
- Frontend route: `/holy/operations/reports?role=digital-transformation`
