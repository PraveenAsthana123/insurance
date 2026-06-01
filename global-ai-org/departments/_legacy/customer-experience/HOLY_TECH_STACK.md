# HOLY Beverage — Customer Experience Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, RAG, Sentiment AI, Conversational AI, Predictive ML

## Application + ML stack

| Layer | Tools |
|---|---|
| FastAPI | Python |
| LangGraph for orchestration | LangGraph for orchestration |
| Whisper (STT) | ElevenLabs (TTS) |
| OpenAI / Claude / local LLMs | OpenAI / Claude / local LLMs |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | CRM |
| Vector DB | FAQ / policy embeddings |
| Redis | session memory |
| S3 | call recordings |

## Key models

- Intent classifier (DistilBERT)
- Sentiment model (RoBERTa)
- Churn model (XGBoost)
- RAG with hybrid retrieval

## Infrastructure

- Twilio / Genesys for telephony
- Kubernetes for chat workers
- OpenTelemetry for trace + sentiment monitoring

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).