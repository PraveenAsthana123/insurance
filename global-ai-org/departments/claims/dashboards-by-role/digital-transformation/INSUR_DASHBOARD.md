# Claims — digital-transformation Dashboard

Per global §64.37 — role-scoped dashboard.

## Persona
**digital-transformation** in Claims.

## Focus
AS-IS vs TO-BE progress, automation % per process

## Tiles

| Tile | Metric | Target | Alert threshold |
|---|---|---|---|
| KPI tile 1 | FNOL → Registration Time | 5 min | < 30 min |
| KPI tile 2 | Document Validation Accuracy | 95%+ | < 78% |
| KPI tile 3 | Fraud Detection Rate | 92%+ | < 55% |
| KPI tile 4 | Claims STP Rate | 80%+ | < 18% |

## Charts

Per global §64.39 — apply the 4-category chart vocabulary:

- **Data analysis**: time-series line of FNOL → Registration Time over 12 weeks
- **Management analysis**: KPI gauge for Document Validation Accuracy with RAG status
- **Statistical analysis**: boxplot of variance vs target
- **Subjective analysis**: sentiment trend (where applicable)

## Filters
- Date range (last 7/30/90/365 days)
- Tenant
- Sub-process (drill from process_hierarchy)

## Refresh
Quarterly DT scorecard

## Permissions
Per global §47.6 SOC2 CC6.2 — role-scoped. PII redacted by default; `?include_pii=1` requires audit row.

## Actions
- Drill into any tile → row-level audit per §38.3
- Approve / escalate (where role permits)

## API
```
GET /api/v1/insur/dashboards/claims/digital-transformation
```

## Endpoint contract
Returns 4-tile JSON per global §64.39.4 schema (chart_id, library, type, data, baseline, threshold, drill_url, refreshed_at).
