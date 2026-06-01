# Phase 11 — Production / Pilot Deployment (Monitoring, Drift, Retraining, Governance)

> **DB ID:** 211 · **Owner:** MLOps + SRE · **Family:** `ml_methodology`
>
> **Core question:** *Does it stay reliable as the world drifts?*

## Why this phase

A model that worked on the test set at release is not a model that
works on day 60 unless drift detection, feedback loops, retraining
policy, rollback, and audit are in place from day 1. Phase 11 is
where Frameworks 101 / 107 / 111 / 103 / 104 / 105 all stop being
abstract and become runtime infrastructure.

## Steps

| Step | What you do | Practical options | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Deployment context** — where the model runs | Edge (wearable) · mobile · cloud · hybrid | Match latency + privacy needs | One-size-fits-all | Deployment decision doc | Latency + privacy targets met | Edge too slow → model compression |
| 2 | **Inference pipeline** — freeze runtime pipeline end-to-end | Same preproc + norm + features as training | Mirror training exactly | "Light" runtime shortcuts | Inference pipeline spec | Output parity vs offline | Drift due to missing step → enforce pipeline hash |
| 3 | **Input data validation** — validate EEG before inference | Signal range checks · missing channel check · SQI gate | Reject bad input early | Predicting on garbage | Input validator | % rejected within expected range | Too many rejects → relax SQI or improve sensors |
| 4 | **Output post-processing** — make predictions usable | Thresholding · smoothing over time · hysteresis | Align with clinical/business objective | Raw frame-by-frame decisions | Decision logic spec | Stable decisions over time | Flicker → temporal smoothing |
| 5 | **Runtime monitoring (model)** — track model behavior in production | Prediction distribution · confidence · latency | Log silently + continuously | Only monitoring accuracy (labels missing) | Monitoring dashboard | No silent failures | Sudden confidence spike → investigate |
| 6 | **Runtime monitoring (data)** — detect input drift | PSD drift · bandpower stats · channel variance · KL divergence | Compare to train distribution | Ignoring slow drift | Data drift alerts | Drift within tolerance | New device → re-baseline stats |
| 7 | **Performance feedback loop** — collect weak/strong labels post-deployment | Human review · delayed outcomes · proxy labels | Separate training vs audit data | Training on noisy feedback blindly | Feedback dataset | Label quality tracked | Label noise → consensus or weighting |
| 8 | **Drift detection policy** — when is the model "outdated"? | Thresholds on data drift + confidence + error proxy | Define triggers upfront | Ad-hoc retraining | Drift policy doc | Trigger rules tested | Frequent triggers → widen tolerance |
| 9 | **Retraining cadence** — how often to update | Time-based (monthly) · event-based (drift) · hybrid | Retrain on versioned data | Continuous retrain without review | Retraining schedule | Retrain improves val metrics | No improvement → stop + analyze |
| 10 | **Model update validation** — validate new model before release | Shadow deployment · A/B test · offline replay | Compare against current model | Replacing without comparison | Model v-Next validation report | v-Next ≥ v-Current | Regression → rollback |
| 11 | **Rollback strategy** — safe fallback | Keep last stable model live | Instant rollback capability | One-way upgrades | Rollback plan | Rollback tested | Corrupt update → auto-revert |
| 12 | **Explainability in production** — interpretable signals | Feature importance summaries · saliency snapshots | Use for audit + trust | Real-time heavy explainability | Explainability log | Stable patterns | Noisy explanations → aggregate |
| 13 | **Security + privacy** — protect EEG + predictions | Encryption · access control · anonymization | Least-privilege access | Storing raw IDs | Security checklist | Compliance met | Breach risk → tokenization |
| 14 | **Compliance + audit** — enable traceability | Model cards · data lineage · decision logs | Audit-ready by design | Retroactive documentation | Audit trail | Audit passes | Missing logs → block deployment |
| 15 | **KPI + ROI tracking** — measure real-world value | Accuracy proxy · recall@risk · latency · cost · adoption | Tie metrics to stakeholders | Only technical KPIs | KPI dashboard | Stakeholder targets met | Adoption low → UX redesign + comms |

## Phase deliverables (minimum)

- [ ] Deployment decision doc (edge / cloud / hybrid · latency + privacy)
- [ ] Inference pipeline spec (mirrors training · hash-locked)
- [ ] Input validator (signal range · channels · SQI gate)
- [ ] Decision logic spec (post-processing rules)
- [ ] Monitoring dashboard (model + data signals)
- [ ] Data drift alerts (thresholds tuned, on-call routing)
- [ ] Feedback dataset (separate from training)
- [ ] Drift policy doc (trigger rules tested)
- [ ] Retraining schedule (time + event triggers)
- [ ] Model v-Next validation report (shadow + A/B)
- [ ] Rollback plan (tested in staging)
- [ ] Explainability log (stable per-window patterns)
- [ ] Security checklist (encryption + RBAC + anonymization)
- [ ] Audit trail (model cards · lineage · decision logs)
- [ ] KPI dashboard (technical + business + stakeholder targets)

## Composes with

- **§101 Reliable AI** — runtime monitoring + SLOs
- **§103 Safe AI** — input validation + output post-processing as guardrails
- **§104 Accountable AI** — RACI for retraining decisions
- **§105 Auditable AI** — audit trail + model lineage
- **§107 Monitoring/Drift** — drift detection policy lives here
- **§111 Portability AI** — model rollback path + cross-environment portability
- **§47.7 (4-layer rollback)** — app + DB + AI + infra layers
- **§47.8 (K8s 3-probe pattern)** — startup / liveness / readiness wired
- **§64.40 (10-layer agentic stack)** — if agents are involved, this phase wires layers 5–10 in production
- **§43 drills** — `drill_pipeline_hash_match.py` (runtime pipeline hash = training pipeline hash) + `drill_drift_alert_fires.py` (synthetic drift triggers alert) + `drill_rollback_works.py` (one-command rollback returns to prior bundle)
- **AI assurance horizontals** — every cross-cutting doc in `../ai_assurance/` has a hook here: data_governance for input validation, validation_playbook §4 robustness + §6 accountability for runtime, evaluation_metrics §5 metrics-card refresh per retraining cycle, fairness_framework drift-monitor for fairness, hallucination_controls (if generative component) for runtime guardrails, responsible_by_design 5 pillars all firing

## The brutal rule

> A deployed model without drift detection, rollback, retraining
> cadence, and audit is technical debt that will mature into an
> incident. Phase 11 is the work that makes Phases 1–10 *survive
> production* — without it, the prior 10 phases are theatre.
