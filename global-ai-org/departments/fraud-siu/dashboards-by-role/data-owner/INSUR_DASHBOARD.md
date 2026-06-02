# Fraud / Special Investigations Unit (SIU) — data-owner Dashboard

Per global §64.37 — role-scoped dashboard.

## Persona
**data-owner** in Fraud / Special Investigations Unit (SIU).

## Focus
Data quality, lineage gaps, freshness SLA, consumer count

## Tiles

| Tile | Metric | Target | Alert threshold |
|---|---|---|---|
| KPI tile 1 | Fraud Detection Rate | 92%+ | < 55% |
| KPI tile 2 | Fraud Leakage | <$5M/yr | < $15M/yr |
| KPI tile 3 | Provider-Fraud Detection | 80%+ | < 30% |
| KPI tile 4 | Investigation Cycle Time | <15 days | < 45 days |

## Charts

Per global §64.39 — apply the 4-category chart vocabulary:

- **Data analysis**: time-series line of Fraud Detection Rate over 12 weeks
- **Management analysis**: KPI gauge for Fraud Leakage with RAG status
- **Statistical analysis**: boxplot of variance vs target
- **Subjective analysis**: sentiment trend (where applicable)

## Filters
- Date range (last 7/30/90/365 days)
- Tenant
- Sub-process (drill from process_hierarchy)

## Refresh
Monthly data steward report

## Permissions
Per global §47.6 SOC2 CC6.2 — role-scoped. PII redacted by default; `?include_pii=1` requires audit row.

## Actions
- Drill into any tile → row-level audit per §38.3
- Approve / escalate (where role permits)

## API
```
GET /api/v1/insur/dashboards/fraud-siu/data-owner
```

## Endpoint contract
Returns 4-tile JSON per global §64.39.4 schema (chart_id, library, type, data, baseline, threshold, drill_url, refreshed_at).
