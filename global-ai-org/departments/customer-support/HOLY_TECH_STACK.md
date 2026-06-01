# HOLY Beverage — Customer Support Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, RAG, Conversational AI, Sentiment AI, Routing AI

## Application + ML stack

| Layer | Tools |
|---|---|
| Zendesk | Freshdesk |
| Python | LangGraph |
| OpenAI / Claude / local LLMs | OpenAI / Claude / local LLMs |
| Snowflake (ticket warehouse) | Snowflake (ticket warehouse) |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | ticket store |
| Vector DB | KB + macros |
| Redis | chat memory |
| S3 | transcripts + recordings |

## Key models

- Intent classifier (DistilBERT)
- Sentiment (RoBERTa)
- Auto-resolution suggester (RAG)
- Ticket-routing classifier (XGBoost)

## Infrastructure

- Twilio Flex / Genesys
- Kubernetes for chat workers
- OpenTelemetry for ticket-flow tracing

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).