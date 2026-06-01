# Supply Chain Network Topology

## Suppliers and locations

The active supplier base consists of five primary manufacturers distributed across India:

- **Supplier 1 — Mumbai.** Coastal sourcing partner; strongest for skincare and haircare categories. Typical manufacturing lead time 20–35 days.
- **Supplier 2 — Delhi.** Northern hub; best access to Rail and Road lanes into central warehouses. Manufacturing lead time 25–40 days.
- **Supplier 3 — Bangalore.** South-India tech-corridor site; strongest cosmetics supplier and highest throughput on Air shipments to overseas clients.
- **Supplier 4 — Kolkata.** East-coast supplier; handles Sea-freight exports and domestic Rail distribution.
- **Supplier 5 — Chennai.** South-east coastal supplier; specialises in haircare. Sea-lane feeder for container moves.

Each supplier carries between 15 and 25 active SKUs. SKU-to-supplier assignment is fixed per contract year; re-sourcing mid-year requires a Supply Chain Manager approval.

## Transportation modes and baseline transit

| Mode | Baseline transit (days) | Best use | Cost per unit |
|------|-------------------------|----------|---------------|
| **Air** | 1 – 2 | Critical stockout risk, high-margin SKUs, overseas priority | Highest (~6× Sea) |
| **Road** | 3 – 5 | Inland cross-city moves, mid-priority restock | Moderate |
| **Rail** | 5 – 7 | Bulk domestic transfer between metros | Low |
| **Sea** | 10 – 14 | Coastal routing (Mumbai ↔ Chennai ↔ Kolkata), export containers | Lowest |

These averages are computed from `fact_shipment.shipping_time` across the 100-SKU Kaggle corpus and are the defaults behind the ETA prediction service.

## Route bands

Three route bands aggregate lanes by region and priority:

- **Route A — North corridor.** Delhi → central warehouses via Road/Rail. Fastest average cycle.
- **Route B — West / South corridor.** Mumbai and Bangalore → country-wide. Mixed Road + Air. Highest volume route.
- **Route C — East / coastal corridor.** Kolkata and Chennai → Sea-biased fulfilment; longer lead times but lowest unit cost.

## Carriers and last-mile handoff

Three carriers (A / B / C) execute the physical moves. Carrier A dominates Air + Road; Carrier B handles Rail + cross-dock Sea; Carrier C is the regional last-mile specialist. Last-mile handoffs happen at the destination Distribution Centre and add 0.5 – 1.5 days to the carrier transit leg. When a carrier reports exception (strike, customs hold, vehicle breakdown), the Supply Chain Manager can switch carriers within the same route band without a contract amendment.

## Capacity notes

Mumbai and Bangalore DCs absorb roughly 55% of total SKU throughput. A disruption at either site cascades to two-thirds of active SKUs within 72 hours unless an alternate route is activated inside the same band.
