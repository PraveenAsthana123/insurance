# HOLY Beverage — Manufacturing — Recommendation System (content + CF + hybrid)

> Per global CLAUDE.md §64.22 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**AI-Strategy** + **Engineer**.

## Three flavors (mandatory)

### Content-based

- Technique: TF-IDF / embedding similarity (sentence-BERT)
- Use case: cold-start, sparse interactions
- Backing data: item attributes + text descriptions

### Collaborative filtering

- Technique: Matrix factorization (ALS / NMF) OR two-tower model
- Use case: rich user × item interaction history
- Backing data: implicit (clicks/views) + explicit (ratings)

### Hybrid (production default)

- Content + CF blended with business rules
- Re-rank stage: margin × inventory × eligibility × diversity
- Cold-start fallback to content-based

## Metrics (per §64.22)

| Metric | Target | Measurement |
|---|---|---|
| Precision@k (k=10) | ≥ 0.25 | offline holdout |
| Recall@k (k=10) | ≥ 0.40 | offline holdout |
| nDCG@k | ≥ 0.35 | offline holdout |
| MAP | ≥ 0.30 | offline holdout |
| Diversity (intra-list) | ≥ 0.6 | per-rec list |
| Novelty | ≥ 0.5 | popularity-based |
| Online CTR lift vs baseline | ≥ +10% | A/B test |

## Algorithm comparison (≥ 3 required)

| Algorithm | Precision@10 | Recall@10 | Latency p95 |
|---|---|---|---|
| Popularity baseline | _ | _ | _ |
| Content-based | _ | _ | _ |
| Collaborative filtering | _ | _ | _ |
| Hybrid | _ | _ | _ |

## Top-10 sample recs (≥ 5 sample users)

User U1:
1. _
2. _
…

(repeat for 5+ users)

## Re-rank business rules

| Rule | Effect | Owner |
|---|---|---|
| Margin > X → boost | yes | finance |
| Inventory < threshold → suppress | yes | supply-chain |
| Eligibility (age, region, tier) | required | legal |
| Diversity (no 3+ same category) | yes | UX |

## Fairness eval (per §64.21)

- Do recommendations over-promote one cohort?
- Per-segment metric: precision@k by user cohort
- Disparate impact ≥ 0.8 across cohorts
- Drill: assert eval rerun nightly + flag regression

## Reference pipeline

To be built: `backend/ml/reference/recommendation_lifecycle.py`

## Composes with

- `HOLY_DATA_MGMT.md` — input data contracts
- `HOLY_DT_STRATEGY.md` — ROI of recommendations
- Global §48 — SHAP explainability per recommendation
- Global §64.21 — bias / fairness gates
