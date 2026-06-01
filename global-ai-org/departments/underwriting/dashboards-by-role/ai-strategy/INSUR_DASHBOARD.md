# Underwriting — ai-strategy Dashboard

Per global §64.37 — role-scoped dashboard.

## Persona
**ai-strategy** in Underwriting.

## Focus
Automation backlog rank, AS-IS impact, ROI realized vs planned

## Tiles

| Tile | Metric | Target | Alert threshold |
|---|---|---|---|
| KPI tile 1 | Quote Turnaround Time (personal lines) | <5 min | < 2.5 days |
| KPI tile 2 | Underwriting Cycle Time (commercial) | <48 hrs | < 14 days |
| KPI tile 3 | STP Rate (personal lines) | 70%+ | < 22% |
| KPI tile 4 | Loss Ratio | <58% | < 67% |

## Charts

Per global §64.39 — apply the 4-category chart vocabulary:

- **Data analysis**: time-series line of Quote Turnaround Time (personal lines) over 12 weeks
- **Management analysis**: KPI gauge for Underwriting Cycle Time (commercial) with RAG status
- **Statistical analysis**: boxplot of variance vs target
- **Subjective analysis**: sentiment trend (where applicable)

## Filters
- Date range (last 7/30/90/365 days)
- Tenant
- Sub-process (drill from process_hierarchy)

## Refresh
Quarterly DT strategy

## Permissions
Per global §47.6 SOC2 CC6.2 — role-scoped. PII redacted by default; `?include_pii=1` requires audit row.

## Actions
- Drill into any tile → row-level audit per §38.3
- Approve / escalate (where role permits)

## API
```
GET /api/v1/holy/dashboards/underwriting/ai-strategy
```

## Endpoint contract
Returns 4-tile JSON per global §64.39.4 schema (chart_id, library, type, data, baseline, threshold, drill_url, refreshed_at).
