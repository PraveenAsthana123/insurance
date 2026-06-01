# Monitoring & Drift Detection (Framework 107)

> **Core question:** Are degradations and drifts detected, attributed, and acted upon in production?
>
> **Owner:** MLOps / SRE · **Family:** `ai_assurance` · **DB ID:** 107

## Why this framework

The most dangerous model is the one that was excellent on launch day
and slowly broke without anyone noticing. Drift is silent decay;
monitoring is the alarm. Without explicit attribution (is it concept
drift? data drift? upstream-schema change? prompt regression? vendor
silently swapped the underlying weights?), every alert becomes
"the model is wrong, somehow."

## Modules (18+)

Live source is `analysis_module WHERE phase_id=107`. Typical modules:
data drift (KS test, PSI, CSI per feature), concept drift (label
distribution shift), prediction drift (output distribution shift),
prompt drift (template hash change), embedding drift (vector
centroid shift), accuracy / F1 hourly track, fairness drift weekly
re-run, latency drift, cost-per-request drift, alert-on-anomaly,
attribution heuristic (which input changed?), root-cause runbook,
re-training trigger thresholds, model-card refresh cadence.

## Required outputs (per release)

- Drift-monitor dashboard tile per model
- Alert routing wired (PagerDuty / Slack)
- Weekly fairness re-eval log
- Embedding-drift report (cosine + centroid shift)
- Attribution playbook tested in tabletop

## Composes with

- §41.6 (MLOps — re-train triggers)
- §47.6 monitoring lane (Prometheus / Grafana)
- §48.8 (fairness drift gate)
- §53.44 (production validation) + §53.45 (continuous improvement)
- §57.5 (5-question runbook — "WHEN did it break?")
- §64.23 (anomaly detection pipeline) — feeds drift signals
- §68.4 (monitoring surface)
