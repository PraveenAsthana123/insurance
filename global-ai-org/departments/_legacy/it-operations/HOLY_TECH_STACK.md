# HOLY Beverage — It Operations Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Observability AI, Predictive ML, FinOps AI, Self-healing AI, Conversational AI

## Application + ML stack

| Layer | Tools |
|---|---|
| ServiceNow | Datadog + Splunk |
| Python | sklearn + XGBoost |
| Ollama for on-prem LLM ops | Ollama for on-prem LLM ops |
| Snowflake | dbt |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | CMDB |
| ElasticSearch | logs |
| TimescaleDB | metrics |
| Vector DB | runbook + KB embeddings |

## Key models

- Incident-classifier (DistilBERT)
- Anomaly detection (Isolation Forest)
- Capacity forecast (Prophet)
- RAG runbook copilot

## Infrastructure

- Kubernetes for control plane
- Argo for orchestration
- OpenTelemetry across the fleet

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).