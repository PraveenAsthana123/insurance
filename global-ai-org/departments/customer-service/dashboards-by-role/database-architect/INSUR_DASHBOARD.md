# Customer Service / Contact Center — database-architect Dashboard

Per global §64.37 — role-scoped dashboard.

## Persona
**database-architect** in Customer Service / Contact Center.

## Focus
Query latency, slow-query list, schema drift

## Tiles

| Tile | Metric | Target | Alert threshold |
|---|---|---|---|
| KPI tile 1 | First Call Resolution (FCR) | 85%+ | < 62% |
| KPI tile 2 | Average Handle Time (AHT) | 6 min | < 18 min |
| KPI tile 3 | Chatbot Deflection / Self-Service | 85%+ | < 22% |
| KPI tile 4 | CSAT | 4.7 / 5 | < 3.6 / 5 |

## Charts

Per global §64.39 — apply the 4-category chart vocabulary:

- **Data analysis**: time-series line of First Call Resolution (FCR) over 12 weeks
- **Management analysis**: KPI gauge for Average Handle Time (AHT) with RAG status
- **Statistical analysis**: boxplot of variance vs target
- **Subjective analysis**: sentiment trend (where applicable)

## Filters
- Date range (last 7/30/90/365 days)
- Tenant
- Sub-process (drill from process_hierarchy)

## Refresh
Weekly DB health

## Permissions
Per global §47.6 SOC2 CC6.2 — role-scoped. PII redacted by default; `?include_pii=1` requires audit row.

## Actions
- Drill into any tile → row-level audit per §38.3
- Approve / escalate (where role permits)

## API
```
GET /api/v1/holy/dashboards/customer-service/database-architect
```

## Endpoint contract
Returns 4-tile JSON per global §64.39.4 schema (chart_id, library, type, data, baseline, threshold, drill_url, refreshed_at).
