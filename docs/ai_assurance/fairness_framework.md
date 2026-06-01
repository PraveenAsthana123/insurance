# Fairness & Responsible-by-Design Framework

> **Cross-cutting doc.** Defines how fairness is measured, how bias is
> handled, and how Responsible-by-Design is enforced across the
> lifecycle. Owned by RAI Office; auditable by Compliance.
>
> Maps to: framework **102** (Trustworthy) and **104** (Accountable);
> reads from **107** (Monitoring/Drift) and **109** (Responsible GenAI).
> Per-implementation tooling in §64.42 (Fairlearn, AIF360); per-policy
> in §48.8 (fairness as part of explainability).

## 1️⃣ Fairness Metrics — measured, not assumed

Fairness is measured continuously. Three layers.

### A. Data-level (pre-training / pre-inference)

| Metric | What it detects | Threshold |
|---|---|---|
| **Representation parity** | Skewed group distribution in training data | Group-share within ±15% of population |
| **Missingness parity** | Missing-data rate by group | Δ rate ≤ 5pp across groups |
| **Outlier parity** | Anomaly rate by group | Δ rate ≤ 5pp across groups |
| **Label balance** | Outcome distribution by group | Disparate-impact ratio ≥ 0.8 |

*Purpose:* prevent biased learning from skewed inputs.

### B. Model-level (during eval)

| Metric | Formula (intuition) | Threshold |
|---|---|---|
| **Demographic parity difference** | Δ P(ŷ=1 \| group=A) − P(ŷ=1 \| group=B) | ≤ 0.10 |
| **Equal opportunity difference** | Δ TPR across groups | ≤ 0.05 |
| **Equalized odds** | Δ TPR AND Δ FPR | both ≤ 0.05 |
| **FPR / FNR parity** | Same-error-cost across groups | Δ ≤ 0.05 |
| **Calibration within groups** | Per-group ECE | ECE per-group ≤ 0.05 |

*Purpose:* ensure outcomes are not systematically worse for any group.

### C. Outcome-level (post-deployment)

| Metric | What it detects |
|---|---|
| Decision approval / rejection parity | Disparate outcomes in production |
| Error impact analysis by group | Cost of errors falls unevenly |
| User complaint rates by segment | Lived experience of bias |
| Drift in fairness metrics over time | Silent regression |

*Purpose:* real-world behavior often differs from test data.

## 2️⃣ How fairness is maintained in the app

### A. Fairness-aware data pipeline

- Sensitive attributes are **never used directly for decision making**.
- Sensitive attributes are used **only for auditing fairness**, not inference.
- **Automatic dataset-bias reports** generated per release.

### B. Model selection + evaluation

- Multiple models evaluated → fairness × performance trade-off analyzed.
- **Deployment blocked** if fairness thresholds are violated.
- Fairness metrics are **gating criteria**, not optional KPIs.

### C. Runtime safeguards

- Policy engine checks for high-risk outputs.
- Confidence thresholds → human review when exceeded.
- **Graceful fallback** when fairness confidence drops.

### D. Continuous monitoring

- Fairness dashboards updated in near-real time (§68.4 monitoring surface).
- Alerts when fairness drift exceeds limits (§107 Monitoring/Drift).
- Periodic re-validation + recalibration (quarterly).

## 3️⃣ Bias handling — by design, not retrofit

### A. Bias detection

| Phase | Technique |
|---|---|
| Pre-deployment | Bias audits across data, model, output |
| Stress | Synthetic edge cases (e.g., adversarial subgroups) |
| Counterfactual | "Same input, different group" — does outcome change inappropriately? |

### B. Bias mitigation

| Technique | When applied |
|---|---|
| Data re-balancing + re-weighting | Pre-train |
| Fairness-constrained optimization | During training |
| Post-processing adjustments (e.g., threshold tuning per group) | Post-train, pre-deploy |
| Human-in-the-loop overrides | Runtime, for sensitive decisions |

### C. Explicitly avoided

- ❌ **Proxy discrimination** (location, device, language acting as proxy for protected class)
- ❌ **Hidden group inference** (system inferring race / gender from name + acting on it)
- ❌ **Self-reinforcing feedback loops** (system's past decisions become its future training data without rebalancing)

## 4️⃣ Responsible-by-Design controls (lifecycle)

### Design-time

- Responsible AI principles embedded in requirements (FRD per §66)
- Fairness criteria in acceptance tests
- Ethics + risk review before go-live

### Build-time

- CI/CD fairness checks (Fairlearn + AIF360 per §64.42)
- Model cards + datasheets required for release (per §48.3)
- Approval workflows for high-impact changes (RACI per §104)

### Run-time

- User-visible explanations
- **Right to challenge outcomes**
- Kill-switch for unsafe or biased behavior

### Governance + ownership

- Named AI system owner (per §63 RACI)
- Independent review capability (Compliance audit)
- Full audit trail for every decision (§105 Auditable + §38.3)

## 5️⃣ Audit-ready statement (reusable verbatim)

> Fairness is continuously measured using data-, model-, and
> outcome-level metrics. Bias detection and mitigation are embedded
> across the lifecycle. Responsible AI controls are enforced at
> design, build, and runtime, with full transparency and accountability.

## Composes with

- **§38** — every fairness gate decision is an audit row
- **§48.8** — fairness as part of explainability
- **§64.21** — XAI / RAI / Compliance per model
- **§64.36** — Bias/Governance flavor in per-sub-process scorecard
- **§64.42** — Fairlearn (Microsoft) + IBM AIF360 + Aequitas listed
- **§68.11** — safety eval surface includes fairness output
- Framework **102** Trustworthy AI (calibration) + **107** Monitoring (drift) + **109** Responsible GenAI (fairness across languages, demographics in generation)
