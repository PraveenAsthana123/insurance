# Auditable AI (Framework 105)

> **Core question:** Can every decision, dataset, and update be reconstructed and verified later?
>
> **Owner:** Audit / Compliance · **Family:** `ai_assurance` · **DB ID:** 105

## Why this framework

Auditability is the discipline that makes Accountable AI (104)
enforceable. Accountability without auditability is theatre — you
named an owner but cannot prove what they actually approved. This
framework codifies what "reconstruct the decision" actually means
in bytes on disk + rows in a database.

## Modules (18)

Live source is `analysis_module WHERE phase_id=105`. Typical modules:
per-decision audit row schema (per §38.3), prompt-version registry,
model-version registry, dataset-version + lineage, training-run
artefact registry (MLflow), retention policy compliance, immutable
log storage, tamper-evidence (hash chains), access-log coverage,
diff-from-baseline per release, regulator-readable export (CSV / JSON),
cross-system trace correlation (request_id → spans → audit → drafts).

## Required outputs (per release)

- Audit row populated for every model decision (§38.3 schema)
- 7-year retention for regulated decisions
- Per-release `audit_envelope.json` referencing prompt + model + data versions
- Tamper-evident hash chain over decision log
- Regulator-export drill log (`/api/v1/.../export?prediction_id=...` works in <1s)

## Composes with

- §38.3 (the canonical decision audit envelope — this framework IS its enforcement layer)
- §47.6 SOC2 CC8.1 (change management) + CC6.1 (access)
- §48.4 (per-prediction audit row)
- §51 (forensic substrate — every commit carries reconstruction metadata)
- §57.6 (canonical fields — request_id, tenant_id, actor, tool, latency, outcome)
- §68.5 (transactions surface — the read side of the audit log)
