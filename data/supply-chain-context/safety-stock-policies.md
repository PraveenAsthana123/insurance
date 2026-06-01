# Safety Stock & Reorder Policies

Safety stock is the inventory buffer carried above expected demand to absorb variability in demand and supply. This playbook governs the reorder math used by the Stockout Risk service and by the auto-PO workflow.

## Core formulae

```
daily_demand      = number_of_products_sold / 30         # last-30-day average per SKU
safety_stock      = daily_demand × lead_time × safety_factor
reorder_point     = safety_stock + (daily_demand × lead_time)
days_to_stockout  = stock_levels / max(daily_demand, 1)
```

The Stockout Risk service evaluates `risk_score = 1 − (days_to_stockout / lead_time)` bounded to [0, 1]. When the ratio drops below 0.3, the SKU is classed as high risk and the "Expedite" action surfaces on the Stockout Risk tab.

## Safety factor by category

Safety factor reflects the coefficient-of-variation observed for each category. Higher variance → larger buffer.

| Category | Safety factor | Rationale |
|----------|---------------|-----------|
| **Haircare** | 1.5 | High demand variance from promo campaigns and seasonality. |
| **Skincare** | 1.5 | Comparable variance; promo-driven spikes around festivals. |
| **Cosmetics** | 1.3 | Slightly lower variance; longer shelf-life allows tighter buffer. |

A one-size-fits-all factor of 1.0 is **not** acceptable for any category on this network because observed coefficient-of-variation across the 100-SKU corpus is consistently above 0.4.

## Reorder-point triggers

When `on_hand ≤ reorder_point`, one of three actions fires:

1. **Auto-PO** (routine). If the supplier is Green (> 70 score) and the approval threshold is met, the auto-PO workflow opens an order in the ERP and notifies the buyer.
2. **Manual review** (amber supplier or high-value SKU). Inventory Planner validates the reorder before release.
3. **Expedite + re-source** (red supplier or high stockout risk). Supply Chain Manager engages; mode-upgrade is usually required and the alternate-supplier catalog is consulted.

## Expedite policy

Expediting is triggered automatically when `days_to_stockout < lead_time / 2`. The escalation path:

- **Tier 1.** Upgrade transportation mode one level on the remaining leg (Sea → Rail → Road → Air). This alone resolves 60 – 70% of at-risk shipments.
- **Tier 2.** Split shipment — route a partial qty by Air for immediate cover, send the rest on the original mode.
- **Tier 3.** Emergency source from the secondary supplier if contracted; pay mitigation premium.

Any Tier 3 move requires Supply Chain Manager approval. The Network Simulation tab estimates the revenue-at-risk vs mitigation cost tradeoff before commitment.

## Escalation thresholds

- Two or more high-risk SKUs on a single supplier → trigger a supplier-level review in the next 24 hours.
- More than 5% of active SKUs in red risk band → Weekly S&OP meeting escalation.
- Any stockout that actually breaches (on_hand = 0) → incident post-mortem within 72 hours, logged to audit trail.

## Review cadence

Safety factors are reviewed each quarter against the observed stockout incident rate. If a category shows fewer than 2 stockouts per quarter, the factor may be trimmed by 0.1 to reduce working capital.
