# HOLY Beverage — Engineering Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Code AI, Predictive ML, GenAI, Reliability AI

## Application + ML stack

| Layer | Tools |
|---|---|
| GitHub / GitLab | Jira |
| Python | LangGraph |
| OpenAI / Anthropic for codegen | OpenAI / Anthropic for codegen |
| DataDog / Grafana | DataDog / Grafana |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | issue tracker |
| Vector DB | code embeddings + RFC corpus |
| S3 | build artifacts |
| Snowflake | engineering metrics |

## Key models

- Code-review assistant (Copilot / CodeLlama)
- Incident-cause classifier (BERT)
- Build-failure predictor (XGBoost)
- Code-search (embedding + reranker)

## Infrastructure

- GitHub Actions / GitLab CI
- Kubernetes for build infra
- OpenTelemetry for traces

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).