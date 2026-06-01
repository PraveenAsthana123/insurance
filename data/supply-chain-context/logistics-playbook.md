# Logistics Playbook

Operational responses to the disruption patterns most often seen on the India supply-chain network. Intended for Inventory Planners and Supply Chain Managers who need to resolve an at-risk shipment inside one shift.

## Monsoon-season disruption (June – September)

Annual south-west monsoon degrades Sea and Road lanes on the west and south coasts. Expected impact:

- **Sea-lane delays** of 3 – 5 days on Mumbai ↔ Chennai and Kolkata container moves.
- **Road delays** of 1 – 3 days on NH-48 and NH-66 corridors due to flooding near coastal DCs.
- **Rail** is the most reliable bulk mode during monsoon; prefer it for non-perishable SKUs.

**Response rule.** If a monsoon-window shipment is on a Sea or coastal-Road lane and the SKU carries `risk_score > 0.6`, switch the remaining leg to Air (Carrier A). Expedited air premium is typically 4–6× base cost, but revenue-at-risk from a stockout on a high-velocity haircare SKU exceeds the premium within two days of the promised delivery.

## Customs hold (cross-border / import)

Customs holds commonly occur on imports that arrive without complete HS-code or country-of-origin paperwork. Typical hold length is 2 – 5 days. The pre-submission checklist to avoid holds:

1. Commercial invoice with exact HS code for every line item.
2. Packing list with carton-level weights and volumes.
3. Country-of-origin certificate (Form A for preferential tariff).
4. Broker authorisation letter on the supplier's letterhead.

If a hold is already open, the Supply Chain Manager escalates to the customs broker with the shipment ID; resolution typically completes within 24 hours once the missing doc is supplied.

## Carrier strike or capacity shortfall

When a carrier's lane falls below 70% on-time rate for more than 48 hours (measured on `fact_shipment.actual_delivery` vs `promised_delivery`), treat the lane as at-risk:

- Re-assign the next 3 shipments on that lane to the carrier with the best OTIF on an adjacent band.
- Flag all in-flight shipments on that carrier for daily status checks.
- If Carrier A is in strike and the route is Air-dominated, fall back to Road through a substitute carrier in the same band; Air-to-Road adds 3 – 4 days and should trigger an Ask-AI review.

## Weather disruption matrix

| Event | Affected lanes | Typical added days |
|-------|----------------|--------------------|
| Cyclone (East / South-East coast) | Chennai ↔ Kolkata Sea, Bhubaneswar Road | +4 to +7 |
| Dense fog (North corridor Dec–Jan) | Delhi Road & Rail lanes | +1 to +2 |
| Heatwave (Central India Apr–May) | All Road lanes; refrigerated SKUs critical | +1 |
| Flash flooding (urban monsoon) | Last-mile in affected city | +2 to +3 |

The Ask-AI button on Stockout Risk and Network Simulator screens cites this matrix when the current shipment context matches any of these patterns.

## Expediting policy

Expedite triggers automatically when `days_to_stockout < lead_time / 2`. Default expedite strategy is mode-upgrade one tier (Sea → Rail → Road → Air). Supply Chain Manager approval is required before committing to Air on SKUs with unit margin below ₹500.
