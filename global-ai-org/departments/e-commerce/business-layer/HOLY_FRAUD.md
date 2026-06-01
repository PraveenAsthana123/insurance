# HOLY Beverage — E Commerce — Fraud Detection

> Per global CLAUDE.md §64.23 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Engineer** + **InfoSec** + **AI-Strategy**.

## Four-layer detection (mandatory)

### Layer 1 — Rule layer (hard rules first)

- Velocity rules (X transactions / Y minutes)
- Geo-anomaly (login from country never seen)
- Amount thresholds (> 3σ from user's normal)
- Blacklist matching

### Layer 2 — ML layer

- XGBoost on engineered features (recency, frequency, monetary, behavioral)
- Autoencoder reconstruction error
- Graph features (network of associated entities)
- Combined probability score 0-1

### Layer 3 — LLM layer

- Transaction-narrative classifier (suspicious wording detection)
- Document-forgery detection (image + text models combined)

### Layer 4 — Decision layer (per §40)

```
Rule fires? → block immediately
ML score > 0.9 → block + queue for review
ML score 0.5-0.9 → step-up auth + human review
ML score < 0.5 → allow + log
```

## Cost-sensitive metrics

| Metric | Target |
|---|---|
| Recall at FPR ≤ 5% | ≥ 0.90 |
| Fraud loss prevented $/month | _ |
| False-positive customer-friction events | < 0.5% of legit txns |
| Median review time | < 4 hours |
| Decision audit row coverage | 100% |

## Reference pipeline

To be built: `backend/ml/reference/fraud_lifecycle.py`

## Composes with

- `HOLY_INCIDENT_MGMT.md` — confirmed fraud → incident
- `HOLY_SECURITY.md` — security capture
- Global §40 — decision system
- Global §48 — explainability per fraud decision (required by regulator)
