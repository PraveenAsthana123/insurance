# HOLY_ANOMALY.md · Dept 8 · SIU / Fraud Investigation

> Generated scaffold per §64.23 · multi-flavor anomaly detection.

## Univariate
- Z-score · TODO threshold
- IQR · TODO
- EWMA · TODO

## Multivariate
- Isolation Forest · TODO contamination
- One-Class SVM · TODO
- Autoencoder · TODO reconstruction threshold

## Time-series
- Prophet residual · TODO
- LSTM-autoencoder · TODO

## Streaming (online drift)
- KSWIN · TODO window
- ADWIN · TODO

## Scoring
- PR-AUC · TODO target
- ROC-AUC · TODO target
- Per-anomaly-type confusion matrix · TODO

## §76 RAI per anomaly
- Per-cohort recall fairness (DI ≥ 0.8)
- Per-anomaly explanation (SHAP / per-feature contribution)
- HITL escalation for high-confidence + high-impact

Composes with §38.3 · §43 · §48 · §64.23 · §74 · §75 · §76 · §82.7 (drift on anomaly model itself) · §87 · §90.
