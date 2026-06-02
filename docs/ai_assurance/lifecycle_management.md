# Model Lifecycle Management (Framework 106)

> **Core question:** Is the model governed end-to-end — from problem definition through retirement?
>
> **Owner:** MLOps · **Family:** `ai_assurance` · **DB ID:** 106

## Why this framework

Models rot. Training data ages, business definitions shift, downstream
schemas evolve, prompts get tweaked without versioning, vendors push
silent updates. Without an end-to-end lifecycle contract, a model
becomes a fossil that nobody dares touch and nobody dares retire.

## Modules (18+)

Live source is `analysis_module WHERE phase_id=106`. Typical modules:
problem-framing review, data-acquisition gate, training-run
reproducibility, eval-set acceptance, model-registry promotion,
shadow-deploy gate, canary rollout gate, full-rollout gate, post-
deploy validation, scheduled re-eval cadence, retraining triggers
(drift, accuracy drop, calendar), deprecation announcement,
sunset migration plan, registry archival, dataset retention,
prompt-version migration, vendor model-update intake, rollback drill.

## Required outputs (per release)

- Registry row with all lineage fields populated
- Pre/post-deploy eval delta artefact
- Promotion + rollback runbooks reviewed
- Sunset plan filed for any model entering EOL window
- Vendor-update intake log per upstream model

## Composes with

- §38 (governance) — lifecycle stages are §38 gates
- §41.6 (MLOps Pipeline) — the runtime mechanism
- §47.5 (JAD chain) — problem-framing connects business to model
- §47.7 (4-layer rollback) — model rollback path required at release
- §53.39 (schema evolution) + §53.45 (continuous improvement)
- §66 (per-dept artifacts) — each dept's INSUR_DEPT_SPEC names its models
