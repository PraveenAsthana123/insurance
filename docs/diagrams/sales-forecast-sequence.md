# Sales Forecast — Prophet Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Browser)
    participant V as Vite Proxy :5173
    participant M as CorrelationIdMiddleware
    participant R as RBACMiddleware
    participant RT as /api/v1/sales/forecast
    participant FS as ForecastService
    participant CACHE as _FittedModel cache
    participant REPO as SalesRepo
    participant PG as Postgres (fact_sales)
    participant PR as Prophet

    U->>V: POST /api/v1/sales/forecast<br/>{store_id: 1, horizon_days: 56}
    V->>M: proxied
    M->>M: set correlation_id
    M->>R: call_next
    R->>R: role=manager → allowed
    R->>RT: call_next
    RT->>FS: forecast(store_id, horizon)

    alt Cache miss
        FS->>REPO: get_sales_history(store_id)
        REPO->>PG: SELECT * FROM fact_sales WHERE store_id=...
        PG-->>REPO: 942 rows
        REPO-->>FS: history
        FS->>FS: filter open=true, reserve last 56 days
        FS->>PR: Prophet().fit(train)
        Note over PR: ~100ms fit
        FS->>PR: predict(holdout) → MAPE
        FS->>CACHE: store _FittedModel
        FS->>FS: emit sales.forecast.fit event
    else Cache hit
        FS->>CACHE: fetch fitted model
    end

    FS->>PR: make_future_dataframe(periods=horizon)
    FS->>PR: predict(future)
    PR-->>FS: {ds, yhat, yhat_lower, yhat_upper, trend, weekly, yearly}
    FS->>FS: split into actual tail + forecast horizon
    FS->>FS: emit sales.forecast event
    FS-->>RT: ForecastResponse
    RT-->>U: JSON {actual, forecast, components, mape, fit_ms, predict_ms}
```

**Cache behavior:** `_FittedModel` is cached in-process per store. First call per store costs ~5–15 s (query + fit). Subsequent calls cost ~100–300 ms (predict only). No TTL — cache lives for the uvicorn process lifetime. Phase 2b adds scheduled re-fits.
