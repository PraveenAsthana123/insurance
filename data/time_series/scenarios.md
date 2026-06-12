# §141 · Time Series Scenarios

> Full catalog of TS techniques + when to use each + reference impl in this repo.

## Scenarios by problem type

| Problem | Best technique | Data needed | Reference impl |
|---|---|---|---|
| **Short-horizon forecast** (next hour/day) | ARIMA or AR(p) Ridge | < 6 months history | `models/refs/arima-statistical/` (MAE 16.25) `models/refs/time-series/` (MAE 22.47) |
| **Multi-seasonal forecast** (weekly + daily) | Prophet | ≥ 2 seasonal cycles | `models/refs/prophet-ts/` (MAE 597 · honest gap: too little data) |
| **Long-horizon non-stationary** | LSTM or TFT | > 500 timestamps | `models/refs/rnn-lstm/` (MAE 21.86) |
| **Anomaly detection on signal** | VAE on rolling window | training stable period | `models/refs/vae/` (P95 2.02) |
| **Counterfactual forecasting** | Bayesian structural TS | medium history | TBD · PyMC scaffold |
| **Causal impact (intervention)** | CausalImpact (BSTS) | pre/post intervention | TBD · pycausalimpact |
| **Demand sensing (1-day horizon)** | Gradient Boosting on lag features | rich features | TBD · LightGBM scaffold |
| **Real-time anomaly stream** | Online EWMA + Z-score | streaming | scaffold only |
| **Seasonality decomposition** | STL · classical decompose | history | statsmodels |
| **Sequence-to-sequence** (multi-step) | seq2seq LSTM with attention | rich history | scaffold only |

## Reference impls actually trained

```
models/refs/time-series/         · Ridge AR(7) on agent_invocation hourly count
models/refs/arima-statistical/   · ARIMA(2,1,2) statsmodels (BEST: MAE 16.25)
models/refs/prophet-ts/          · Prophet (HONEST: data too short · MAPE 224%)
models/refs/rnn-lstm/            · LSTM 2-layer hidden=16 (MAE 21.86)
models/refs/vae/                 · VAE for anomaly score (P95=2.02 P99=8.17)
```

## When NOT to use each method

| Method | Avoid when |
|---|---|
| ARIMA | Strong nonlinearity · multiple seasonalities |
| Prophet | <2 seasonal cycles · need explainability of every weight |
| LSTM | Need uncertainty quantification (use Bayesian alternative) |
| VAE | Anomaly definition unclear · need labeled anomalies |
| Bayesian | Compute-bound real-time inference |
| Gradient Boost | Long-range temporal dependencies (use Transformer) |

## Department scenario mapping (per §140)

| Dept | Primary TS use case | Recommended method |
|---|---|---|
| claims | Claim arrival forecast | ARIMA + Prophet ensemble |
| underwriting | Premium curve forecast | LSTM with attention |
| finance | Cash flow / loss reserve | Bayesian structural TS |
| supply-chain | Demand forecast SKU × region | Gradient Boost + Prophet |
| operations | System load hourly | LSTM + EWMA anomaly |
| sales | Pipeline forecast 30/60/90 day | LSTM + Prophet |
| security-operations | Attack volume trend | EWMA + Isolation Forest |
| it-operations | Disk fill / CPU forecast | AR(7) + alerting threshold |
| marketing | Campaign response curve | Prophet + multiplicative seasonality |
| actuarial | Mortality / loss curves | Bayesian + survival |
| hr | Headcount / attrition forecast | ARIMA + GLM |
| customer-support | Ticket volume forecast | Prophet + holiday effects |
| customer-experience | NPS trend | EWMA + drift detection |
| procurement | Lead-time forecast | LSTM + bootstrap CI |
| policy-admin | Endorsement volume | Prophet + day-of-week |
| distribution | Agent productivity | LightGBM lag features |
| fraud-investigation | Fraud rate trend | EWMA + concept drift |
| engineering | Build-time forecast | Linear AR + holiday calendar |
| legal | Contract review volume | Prophet + slow drift |

§141 spec
