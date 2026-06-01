# Debug AI (Framework 110)

> **Core question:** When models or pipelines fail, can we identify, attribute, and fix the root cause?
>
> **Owner:** ML Engineering · **Family:** `ai_assurance` · **DB ID:** 110

## Why this framework

Production AI incidents are uniquely hard to debug because the failure
mode is often distributional, not deterministic. "It worked on my
machine" is replaced by "it worked on 99.4% of last week's queries."
This framework codifies the instrumentation, replay capability, and
attribution toolkit that turn "the model is wrong" into a fixed bug.

## Modules (18+)

Live source is `analysis_module WHERE phase_id=110`. Typical modules:
per-request replay (input → output reproducible from audit row),
per-span tracing (OpenTelemetry — every layer of the §64.40 10-layer
stack), prompt-diff between baseline + suspect, retrieval-set diff
(RAG), embedding-vector inspector, feature-attribution (SHAP / LIME),
error-classification taxonomy, regression-bisect across versions,
training-data subset finder ("which examples drove this prediction?"),
counterfactual generator, agent chain-of-thought log, tool-call
trace, latency-flame-graph, cost-attribution per request, error-budget
attribution per failure mode.

## Required outputs (per release)

- `/api/v1/.../debug?prediction_id=...` returns full reconstruction <1s
- Trace coverage > 95% per service
- Replay drill: pick a past prediction, reproduce within ±confidence noise
- Error-taxonomy populated (every prod incident classified)

## Composes with

- §48 (Explainability — per-decision reconstruction)
- §48.5 (RAG four-part contract — debug surface)
- §48.6 (agent plan + tool trace)
- §57.5 (5-question runbook — this framework IS the answer infrastructure)
- §57.6 (canonical logging fields — every span MUST carry request_id etc.)
- §64.42 (observability triad — OpenTelemetry + Prometheus + Grafana)
- §68.4 (monitoring) + §68.5 (transactions) — read-side
