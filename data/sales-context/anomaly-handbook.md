# Anomaly Handbook

## Stockout patterns

A sudden sales drop with normal customer count usually means stockout on high-velocity SKUs. Flag when daily customers ≥ 90% of trailing mean but revenue < 60% of trailing mean.

## Competitive shock

When a competitor opens within 500m, typical pattern:
- Week 1: -18% revenue, -12% customers
- Weeks 2–4: recovery to -10% revenue
- Weeks 5–16: gradual return to baseline
If the recovery doesn't materialize by week 16, there's a permanent share loss — reassess assortment and pricing.

## Weather / seasonal

Unexpected storms, heat waves, or cold snaps can produce 2–4σ anomalies in daily sales. Cross-reference with NOAA / local weather feeds before assuming operational issues. Weather anomalies are usually self-correcting within 1–3 days.

## Data-quality anomalies

- **Missing promo flag**: revenue pattern looks promoted but `promo=0`. Check POS sync.
- **Customer count mismatch**: customer count >> revenue — POS lane failed mid-day. Check hourly breakdowns.
- **Zero sales + open=1**: store marked open but no transactions. Likely system outage or staff no-show.

## Response playbook

- Stockout → Trigger expedite PO, alert supply-chain.
- Competitive shock → Short-term promo + assortment review.
- Weather → No action except logging; wait 3 days.
- Data-quality → Open ops ticket; do not retrain forecast until resolved.

## Escalation thresholds

- ±2σ from 28-day rolling mean: log as anomaly.
- ±3σ: alert on-call analyst.
- Multiple 3σ events same week: escalate to dept manager + compliance.
