# Runbook · Collaborative Filtering AI
Effective: 2026-06-11 · §134 Phase 4

## Symptom (5-question runbook per §57.5)

WHAT broke?      Check `/data/metrics/collaborative-filtering-ai.json` for accuracy regression
WHEN broke?      Compare `trained_at` vs current · check `/data/drift/collaborative-filtering-ai.json`
WHO touched?     `git log --since=<date> data/ai_types/collaborative-filtering-ai.json`
WHY broke?       Check feature_importance shift vs baseline
HOW rollback?    `cp models/collaborative-filtering-ai/model.joblib.backup models/collaborative-filtering-ai/model.joblib`

## Production Gates

- accuracy ≥ 0.95
- drift PSI < 0.2
- per-cohort disparate impact ≥ 0.8
- ECE calibration ≤ 0.05
- p95 latency < 500ms

## Escalation

L1: ML on-call · 15 min ack
L2: Model owner · 60 min ack
L3: AI Governance Council · 4hr review per §103.5

## Composes with

§38 · §47 · §48 · §76 · §103.5 · §122 · §132 · §133 · §134
