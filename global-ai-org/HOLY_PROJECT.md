# INSUR Beverage Company — Project Overview

**Source:** operator-provided business brief (2026-05-21).
**Scaffold standard:** global CLAUDE.md §63 + `~/.claude/policies/global-ai-org-structure.md`.

This file gives the enterprise-wide view of INSUR's AI architecture. For each
department's detailed spec (data types / process flow / AI impact / datasets),
see `departments/<dept>/business-layer/INSUR_SPEC.md`.

## Departments in scope (12)

| Dept | Path |
|---|---|
| Digital Marketing | `departments/digital-marketing/` |
| Customer Experience | `departments/customer-experience/` |
| Supply Chain | `departments/supply-chain/` |
| Manufacturing | `departments/manufacturing/` |
| Product R&D | `departments/product-rd/` |
| Retail Operations | `departments/retail-operations/` |
| Sales | `departments/sales/` |
| Finance | `departments/finance/` |
| Governance & Compliance | (uses top-level `governance-trust-compliance-layer/` + dept-scoped specs) |
| HR | `departments/hr/` |
| Procurement | `departments/procurement/` |
| Executive Leadership | `departments/executive-leadership/` |

## Cross-Department AI Flow

```
Source Systems (CRM | Shopify | ERP | POS | IoT | Social | Ads | Finance | HRIS)
        ↓
Data Ingestion Layer (Batch | Streaming | API | Webhook | File Upload)
        ↓
Data Lake / Lakehouse (Bronze → Silver → Gold)
        ↓
Feature Store + Vector Store (ML Features | Embeddings | Metadata)
        ↓
Model Layer (ML | DL | NLP | CV | RAG | Forecasting | Optimization)
        ↓
AI Orchestration Layer (Agents | Workflows | Rules | HITL | Policy Engine)
        ↓
Business Services (Campaign | Customer | Supply Chain | Finance | Manufacturing)
        ↓
Applications (Dashboards | Copilots | Mobile Apps | Portals | Alerts)
        ↓
Observability + Governance (Logs | Metrics | Traces | Drift | Bias | Audit | Cost)
```

## Enterprise AI Governance Flow

```
AI Request
   → Policy Validation
   → Prompt Governance
   → Model Invocation
   → RAG Grounding
   → Safety Validation
   → Brand Compliance Validation
   → Human Approval (if needed)
   → Production Deployment
   → Monitoring & Audit Logging
```

## AI Impact Priority Matrix

| Priority | Department | ROI Potential | Complexity |
|---|---|---|---|
| **P1** | Digital Marketing | Extremely High | Medium |
| **P1** | Customer Experience | Extremely High | Medium |
| **P1** | Supply Chain | Extremely High | High |
| **P1** | Manufacturing | Extremely High | High |
| **P2** | Product R&D | High | Medium |
| **P2** | Retail Operations | High | Medium |
| **P2** | Executive Intelligence | High | Medium |
| **P3** | Finance | Medium-High | Medium |
| **P3** | Governance | Medium-High | Medium |

## Highest-ROI AI Opportunities for INSUR

| AI Initiative | Estimated Enterprise Value |
|---|---|
| AI Personalization Engine | Very High |
| Autonomous Campaign Optimization | Very High |
| Demand Forecasting AI | Very High |
| Predictive Maintenance | Very High |
| AI Recommendation Engine | Very High |
| AI Influencer Intelligence | High |
| RAG Customer Copilot | High |
| Computer Vision Shelf Analytics | High |
| Flavor Innovation AI | Medium-High |
| Governance AI | Medium-High |

## Data Classification Summary

| Data Category | Examples |
|---|---|
| Structured | CSV, SQL tables, ERP |
| Semi-Structured | JSON, XML, logs |
| Unstructured Text | Reviews, emails, chats |
| Image | Product images, shelf images |
| Video | CCTV, promotional videos |
| Audio | Customer calls |
| Time-Series | IoT telemetry, sales trends |
| Streaming | Clickstream, IoT feeds |
| Geospatial | GPS, store location |
| Graph | Customer-product relationships |
| Vector | Embeddings for RAG |
| Metadata | Product tags, campaign metadata |

## Recommended Starter Datasets per Use Case

| Goal | Dataset Combination |
|---|---|
| AI Marketing Copilot | Open Food Facts + Retail Sales |
| Product Recommendation Engine | Retail Sales + Shopify |
| AI Chatbot | Open Food Facts + FAQ |
| Demand Forecasting | Beverage Sales + Weather |
| Shelf Detection AI | Open Food Facts Images |
| Nutrition Intelligence | Starbucks + Open Food Facts |
| Influencer Intelligence | Social engagement datasets |
| RAG Knowledge Platform | Open Food Facts + internal docs |

## Best Dataset for Each AI Area

| AI Area | Recommended Dataset |
|---|---|
| NLP | Open Food Facts |
| RAG | OpenFoodFacts Product DB |
| Computer Vision | Open Food Facts Images |
| Forecasting | Beverage Sales Dataset |
| Recommendation AI | Retail Sales Dataset |
| Time-Series | Iowa Liquor Sales |
| Optimization AI | Warehouse Retail Sales |
| Multimodal AI | FooDI-ML |
| Sentiment AI | Customer review datasets |
| Generative AI | Open Food Facts + reviews + campaigns |

## Model Type → Department Mapping

| AI Type | Where Used |
|---|---|
| ML | Segmentation, scoring, forecasting, churn |
| DL | Demand forecasting, advanced recommendation |
| NLP | Sentiment, reviews, claims, support tickets |
| CV | Shelf detection, packaging inspection, label validation |
| RAG | Chatbot, policy assistant, sales copilot, R&D assistant |
| IoT AI | Manufacturing, cold chain, smart shelves |
| RPA | Invoice matching, HR scheduling, PO creation |
| Optimization AI | Budget, pricing, routing, production planning |
| Quantum-Inspired Optimization | Routing, SKU planning, portfolio optimization |
| Agentic AI | Campaign automation, governance review, executive copilot |

## Per-Department Spec Files

Each department's deep spec is at: `departments/<dept>/business-layer/INSUR_SPEC.md`.
The 12 in-scope INSUR departments listed above each have such a file.
