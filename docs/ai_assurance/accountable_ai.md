# Accountable AI (Framework 104)

> **Core question:** Who is responsible when things go wrong, and how is that responsibility enforced?
>
> **Owner:** Governance / Legal · **Family:** `ai_assurance` · **DB ID:** 104

## Why this framework

Most AI incidents have unclear ownership precisely because the AI
crosses traditional org boundaries (Eng built the model, Data owned
the training set, Product chose the threshold, Legal cleared the
disclosure). Accountability is the mapping from each layer of the
stack to a named human + a documented decision-rights matrix.

## Modules (18)

Live source is `analysis_module WHERE phase_id=104`. Typical modules:
RACI per model lifecycle stage, model-owner registry, dataset-owner
registry, decision-rights map (who can deploy / pause / rollback),
change-management approval chain, incident-commander assignment,
ethics-council standing review, vendor-contract clauses, regulatory
reporting obligations, public disclosure procedures, customer
notification, escalation matrix, sign-off audit trail.

## Required outputs (per release)

- RACI matrix per model in registry
- Sign-off chain captured per release (§51 forensic substrate)
- Ethics-council quarterly review log
- Incident-response RACI tested via tabletop exercise

## Composes with

- §38.5 (Reviewer Responsibilities — Architect / Security / AI Owner / Ops)
- §47.3 (ADR rules — every locked decision named + signed)
- §47.14 (governance — ownership matrix is a pre-release gate)
- §53.11 + §53.41 (enterprise maturity stack — change management)
- §63 (org structure) — RACI flows through dept × role assignment
- §68.10 (cost eval) + §68.11 (safety eval) — each surfaces an owner per row
