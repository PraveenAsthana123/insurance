# HOLY Beverage — E Commerce Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Recommendation AI, Personalization AI, Predictive ML, Fraud AI, GenAI

## Application + ML stack

| Layer | Tools |
|---|---|
| Shopify | Snowflake |
| Python | LightFM (recommenders) |
| Stripe Radar (fraud) | Stripe Radar (fraud) |
| OpenAI for content | visual search |

## Data stores

| Store | Purpose |
|---|---|
| Shopify | storefront |
| Snowflake | clickstream + orders |
| Vector DB | product + image embeddings |
| Redis | session personalization |

## Key models

- Product recommender (two-tower)
- Cart abandonment predictor (XGBoost)
- Payment fraud (XGBoost + autoencoder)
- Visual search (CLIP)

## Infrastructure

- Shopify webhooks for events
- Kafka for clickstream
- Kubernetes for real-time personalization
- Stripe Radar for payment fraud

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).