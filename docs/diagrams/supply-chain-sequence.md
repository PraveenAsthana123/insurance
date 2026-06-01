# Supply Chain Stockout Risk — Sequence

Request/response flow for `POST /api/v1/supply-chain/stockout-risk`. Mirrors
the Sales forecast-sequence structure so reviewers see a consistent shape
across flagships.

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Browser)
    participant V as Vite Proxy :5173
    participant M as CorrelationIdMiddleware
    participant R as RBACMiddleware
    participant RT as /api/v1/supply-chain/stockout-risk
    participant SS as StockoutService
    participant REPO as SupplyChainRepo
    participant PG as Postgres (dim_sku, fact_shipment)

    U->>V: POST /api/v1/supply-chain/stockout-risk<br/>{sku_id: "SKU0"}<br/>X-Demo-Role: team-member
    V->>M: proxied
    M->>M: mint correlation_id
    M->>R: call_next
    R->>R: method+path lookup in PERMS_MATRIX<br/>team-member ∈ allowed → permit
    R->>RT: call_next
    RT->>SS: assess(StockoutRiskRequest)

    SS->>REPO: get_sku(sku_id)
    REPO->>PG: SELECT * FROM dim_sku WHERE sku_id=%s
    PG-->>REPO: {stock_levels, lead_time_days, ...}
    REPO-->>SS: sku dict

    SS->>REPO: get_shipments_for_sku(sku_id)
    REPO->>PG: SELECT * FROM fact_shipment WHERE sku_id=%s
    PG-->>REPO: [shipment rows]
    REPO-->>SS: shipments

    SS->>SS: daily_demand = Σ sold / 30
    SS->>SS: days_to_stockout = stock / daily_demand
    SS->>SS: risk_score = 1 − (days_to_stockout / lead_time)
    SS->>SS: band + reason narrative
    SS->>SS: emit supply_chain.stockout_risk event<br/>{sku_id, risk_score, band}

    SS-->>RT: StockoutRiskResponse
    RT-->>U: JSON {sku_id, risk_score, days_to_stockout, risk_band, reason}
```

**Latency profile.** Typical response is 50–200 ms — a single `dim_sku` point
read plus a small `fact_shipment` scan for the requested SKU. No model fit,
no cache needed. The heuristic is deliberately simple for a 100-row
dataset; the same interface extends to an XGBoost classifier in Phase 2b
without touching the router or the service contract.

**Downstream observability.** The `emit_event` call is picked up by the
existing structured-logger pipeline (`ζ` observability from Sales) and
carries the correlation_id set by the first middleware. Every stockout-risk
request is therefore traceable from browser fetch → Postgres row read →
JSON response in the logs.
