# Reliable AI (Framework 101)

> **Core question:** Does the AI deliver consistent, available, predictable behavior?
>
> **Owner:** SRE / AI Platform · **Family:** `ai_assurance` · **DB ID:** 101

## Why this framework

Reliability is the first thing a user notices and the last thing a
budget protects. Before fairness, before explainability, before cost
— a model that returns 503 to one in twenty users is not in
production. This framework is the SRE-flavoured umbrella over the
classic four golden signals applied to AI: latency, traffic, errors,
saturation, plus AI-specific signals (prompt-token rate, model-warm
cache hit, council-quorum success).

## Modules (18)

Live source is `analysis_module WHERE phase_id=101`. Each row carries:

```json
{ "analyzed": [...metrics...], "output": "<artefact>" }
```

Typical modules include uptime / SLO tracking, error-budget burn,
p95 + p99 latency, retry / circuit-breaker health, queue depth,
GPU saturation, prompt-cache hit-rate, council quorum success, model
warm-pool readiness, and disaster-recovery drill results.

## Required outputs (per release)

- `reliability_dashboard` rendered in §68 hub
- `slo_report.md` per service per release
- `error_budget_burn_chart.png` with threshold overlay
- DR drill log under `data/eval/dr/<service>/<run_id>/`

## Composes with

- §47.7 (4-layer rollback) — rollback path validated as a reliability gate
- §47.8 (K8s 3-probe) — startup / liveness / readiness wired
- §47.10 (5-phase load testing) — phases 2–5 are reliability evidence
- §57.5 (5-question runbook) — feeds the "WHEN did it break?" answer
- §68.4 (monitoring surface) — the read-side of this framework
- §64.42 (chaos engineering row) — LitmusChaos + Chaos Mesh + Toxiproxy provide the drills
