# HOLY_FRAUD.md · Dept 20 · Cybersecurity / Fraud Defense

> Generated scaffold per §64.23 · multi-layer fraud detection.

## Rule layer (hard rules · first)
TODO · per-process rules + thresholds.

## ML layer
- XGBoost · TODO features
- Autoencoder · TODO
- Graph features · TODO (per GNN)

## LLM layer
- Transaction-narrative classifier · TODO
- §82.21 prompt injection defense

## Decision layer (per §40)
- Rule fires? → reject / approve / escalate
- ML confidence threshold? → review / auto / decline
- HITL for ambiguous

## Cost-sensitive metrics
- Recall at fraud > 90% with FPR < 5% · TODO
- Cost-weighted F1 · TODO

## §76 fairness
- Per-cohort false-positive rate parity (DI ≥ 0.8)
- Per-cohort recall parity
- Audit cadence: weekly

Composes with §38.3 · §43 · §47.7 · §48 · §57.5 · §64.23 · §74 · §75 · §76 · §82.7 · §82.21 · §87 · §90.
