# HOLY Beverage — Security Operations Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Cybersecurity AI, Behavioral AI, Correlation AI, Anomaly Detection, RAG

## Application + ML stack

| Layer | Tools |
|---|---|
| Splunk | CrowdStrike + Sentinel |
| Python | sklearn + XGBoost |
| OpenAI / local LLMs for triage | OpenAI / local LLMs for triage |
| Snowflake | dbt |

## Data stores

| Store | Purpose |
|---|---|
| ElasticSearch | security logs |
| PostgreSQL | CMDB / IAM |
| Vector DB | TTP corpus |
| Neo4j | attack-path graph |

## Key models

- Threat classifier (Random Forest)
- User-behavior anomaly (autoencoder)
- Phishing detector (BERT)
- Attack-path predictor (GNN)

## Infrastructure

- SOAR (Cortex XSOAR / Splunk SOAR)
- Kafka for event streaming
- OpenTelemetry across security plane

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).