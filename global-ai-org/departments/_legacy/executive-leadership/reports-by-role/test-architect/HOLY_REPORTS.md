# HOLY Beverage — Executive Leadership — Test Architect Standard Reports

> Per global CLAUDE.md §64.37 — every (dept, role) pair MUST have ≥ 3 standard
> reports. These are the reports the **test-architect** in **executive-leadership** uses.

## Standard Reports

| # | Report Name | Cadence | Format | Recipients |
|---|---|---|---|---|
| 1 | Quarterly test strategy | quarterly | PDF | eng + QA |
| 2 | Per-release pyramid snapshot | per release | PDF | manager |
| 3 | Flaky-test cleanup queue | weekly | CSV | test-architect |

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
- **Portal**: every report retrievable at `/holy/executive-leadership/reports?role=test-architect&id=<report_id>`
- **SFTP**: optional for downstream systems (finance / legal)

## Retention

Each report's retention is set in the JSON spec. Defaults:
- Daily reports: 90 days
- Weekly reports: 1 year
- Monthly + quarterly: 7 years (compliance per §38 + §47.6 SOC2)

## Audit

Every report generation MUST land in the decision audit row (§38.3) with:
- `request_id`, `actor_role=test-architect`, `dept=executive-leadership`, `report_id`, `recipients[]`
- `data_hash` (so we can prove what was sent vs what was claimed)

## Backend Contract

```
GET  /api/v1/holy/reports/executive-leadership/test-architect
  → list of standard reports

POST /api/v1/holy/reports/executive-leadership/test-architect/<report_id>/run
  → trigger report; returns {run_id, status, artifact_url}

GET  /api/v1/holy/reports/executive-leadership/test-architect/<report_id>/runs/<run_id>
  → status + signed download URL
```

## Related Artifacts

- `../../dashboards-by-role/test-architect/HOLY_DASHBOARD.md` — paired dashboard
- `../../roles/test-architect/HOLY_README.md` — role definition
- Frontend route: `/holy/executive-leadership/reports?role=test-architect`
