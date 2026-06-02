# INSUR Beverage Company — Customer Experience Specification

**Source:** operator brief (2026-05-21).
**Project:** INSUR Beverage Company.
**Scope:** this department's data types, process flow, AI impact, and recommended datasets.

## Data Types

| Data Type | Examples |
|---|---|
| Chat data | Chatbot conversations |
| Support ticket data | Complaints, issues |
| Sentiment data | Reviews, ratings |
| Voice/text data | Calls, transcripts |
| FAQ knowledge data | Product FAQs |
| CRM customer data | Profiles, subscriptions |
| Loyalty data | Rewards, points |
| Retention data | Churn signals |
| Behavioral data | Browsing and buying behavior |

## Process Flow (Technical AI)

| Step | Process | Data | AI/Model | Output |
|---|---|---|---|---|
| 1 | Customer inquiry | Chat, email, voice text | NLP intent model | Intent classification |
| 2 | Customer identification | CRM, order history | Identity resolution | Customer context |
| 3 | FAQ retrieval | Product docs, policy docs | RAG | Grounded answer |
| 4 | Product recommendation | Purchase history, preferences | Recommendation model | Suggested product |
| 5 | Sentiment detection | Chat text, reviews | Sentiment model | Sentiment score |
| 6 | Issue classification | Ticket text | NLP classifier | Issue category |
| 7 | Escalation | Risk score, sentiment | Rule engine | Human handoff |
| 8 | Retention trigger | Churn signals | Churn model | Retention action |

## AI Impact — Level: **EXTREMELY HIGH**

| Metric | Impact |
|---|---|
| Support Cost | ↓ 30–60% |
| Retention | ↑ 20–30% |
| Response Time | Near real-time |
| Subscription Churn | ↓ 15–25% |

**Recommended AI:** RAG, NLP, Predictive AI, Conversational AI

## Datasets (public + Kaggle)

| Dataset | Size / Format | AI Area |
|---|---|---|
| Open Food Facts API (real-time) | JSON API | RAG, NLP |
| Retail Sales for Recommendations | CSV | Recommendation AI |

---

Cross-reference: `../../../INSUR_PROJECT.md` for cross-department flow + dataset map.
Scaffold standard: global CLAUDE.md §63.