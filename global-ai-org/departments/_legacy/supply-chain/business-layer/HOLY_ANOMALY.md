# HOLY Beverage — Supply Chain — Anomaly Detection

> Per global CLAUDE.md §64.23 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Engineer** + **AI-Strategy**.

## Four anomaly tiers (all required)

### Tier 1 — Univariate

- Z-score / IQR / EWMA on key metrics
- Single-metric thresholds (rule-based)

### Tier 2 — Multivariate

- Isolation Forest / One-Class SVM / Autoencoder
- Joint-distribution anomalies

### Tier 3 — Time-series

- Prophet residual analysis
- LSTM-autoencoder reconstruction error
- Seasonal-trend decomposition

### Tier 4 — Streaming

- Online drift detection (KSWIN / ADWIN)
- Real-time alert routing

## Metrics

| Metric | Target | Source |
|---|---|---|
| Precision (high-severity) | ≥ 0.85 | labeled anomaly set |
| Recall (high-severity) | ≥ 0.80 | labeled anomaly set |
| ROC-AUC | ≥ 0.90 | offline eval |
| PR-AUC | ≥ 0.70 | offline eval |
| Per-anomaly-type confusion | per class | weekly review |

## Anomaly catalog (top 20 per supply-chain)

| # | Anomaly type | Severity | Tier | Auto-action | Backing data |
|---|---|---|---|---|---|
| 1 | _stub: anomaly for supply-chain_ | high | tier 2 | alert + auto-investigate | orders + IoT telemetry |

## Reference pipeline

To be built: `backend/ml/reference/anomaly_lifecycle.py`

## Composes with

- `HOLY_SECURITY.md` — security anomalies surface here
- `HOLY_INCIDENT_MGMT.md` — anomaly → incident pipeline
- Global §64.32 — security capture overlap
