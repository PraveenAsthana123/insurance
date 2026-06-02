# INSUR Beverage Company — Sales Specification

**Source:** operator brief (2026-05-21).
**Project:** INSUR Beverage Company.
**Scope:** this department's data types, process flow, AI impact, and recommended datasets.

## Data Types

| Data Type | Examples |
|---|---|
| Lead data | Retailers, distributors |
| CRM data | Accounts, contacts |
| Proposal/contract data | Agreements |
| Pricing data | Discount, margin |
| Order data | Purchase orders |
| Sales pipeline data | Opportunities |
| Revenue data | Sales performance |
| Territory data | Region allocation |

## Process Flow (Technical AI)

| Step | Process | Data | AI/Model | Output |
|---|---|---|---|---|
| 1 | Lead identification | CRM, retailer data | Lead scoring model | Qualified leads |
| 2 | Account prioritization | Sales history, revenue | Predictive ML | Account priority |
| 3 | Proposal creation | Product catalog, pricing | GenAI + RAG | Sales proposal |
| 4 | Price recommendation | Margin, competitor data | Optimization model | Suggested price |
| 5 | Cross-sell/upsell | Purchase history | Recommendation model | Offer recommendation |
| 6 | Sales forecasting | Pipeline, orders | Forecasting model | Sales forecast |
| 7 | Relationship tracking | Notes, emails | NLP summarization | Account insights |

## AI Impact — Level: **HIGH**

| Metric | Impact |
|---|---|
| Revenue per rep | ↑ Significant |
| Lead conversion | ↑ 10-25% |

**Recommended AI:** Lead Scoring ML, RAG Sales Copilot, Pricing Optimization, Forecasting

## Datasets (public + Kaggle)

| Dataset | Size / Format | AI Area |
|---|---|---|
| Retail Sales Dataset (CSV) | — | Lead/recommendation ML |

---

Cross-reference: `../../../INSUR_PROJECT.md` for cross-department flow + dataset map.
Scaffold standard: global CLAUDE.md §63.