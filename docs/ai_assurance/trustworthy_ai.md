# Trustworthy AI (Framework 102)

> **Core question:** Can stakeholders trust outputs, decisions, and limits?
>
> **Owner:** RAI Office · **Family:** `ai_assurance` · **DB ID:** 102

## Why this framework

Trust ≠ accuracy. A 99%-accurate model that fails opaquely on the
remaining 1% is less trustworthy than a 95%-accurate model that
declares uncertainty + cites sources + escalates to humans on edge
cases. This framework codifies the contract every model surfaces to
its consumer.

## Modules (18)

Live source is `analysis_module WHERE phase_id=102`. Typical modules:
calibration (do confidence scores match true correctness?), abstention
(does the model refuse when unsure?), citation accuracy (RAG-backed
answers point to real sources), counterfactual sensitivity, human-
override rate, disclosure to user when AI is involved, drift in trust
metrics, fairness across protected groups, prompt-injection resilience.

## Required outputs (per release)

- `model_card.md` (per §48.3) refreshed
- `calibration_plot.png` + Brier score
- `abstention_curve.png` (refusal rate × confidence)
- Citation accuracy = 100% drill log (RAG models)
- Human-override rate dashboard tile

## Composes with

- §48 (Explainability) — the source-of-truth for SHAP / counterfactual / model-card
- §38.3 (decision audit) — every trust signal lands a row
- §59.4 (ORF metrics) — Ragas faithfulness/context-precision feed this
- §64.21 (XAI / RAI) — per-sub-process scorecard reflects 102
- §68.6 (guardrails) + §68.11 (safety eval) — runtime enforcement
