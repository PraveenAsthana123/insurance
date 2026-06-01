# HOLY Beverage — Industry Datasets Catalog

**Source:** operator brief 2026-05-21

## By Department × Use Case × Dataset

| Department | Use Case | Dataset | Data Type | Size | AI Area |
|---|---|---|---|---|---|
| Marketing | Beverage sales forecasting | Beverage Sales Dataset | CSV time-series | ~5-50 MB | ML, Forecasting |
| Marketing | Campaign optimization | Beverage Sales Prediction | CSV (sales + temperature) | ~1-10 MB | Predictive AI |
| Marketing | Customer segmentation | Beverage Sales Clustering | CSV | ~53 MB | Clustering ML |
| Marketing | Retail customer analytics | Retail Sales Dataset | CSV | ~10-50 MB | ML, BI |
| Marketing | Soft drink sales trends | Soft Drink Sales | CSV | ~1.1 MB | Forecasting ML |
| Marketing | Social sentiment | Food/Beverage Reviews | Text | Variable | NLP |
| Product R&D | Nutrition intelligence | Open Food Facts | CSV/JSON | Multi-GB | NLP, RAG |
| Product R&D | Ingredient analysis | OpenFoodFacts Product DB | JSONL/CSV | Multi-GB | NLP, RAG |
| Product R&D | Beverage nutrition | Starbucks Beverage Nutrition | CSV | KB-MB | ML, NLP |
| Manufacturing | Factory optimization | Warehouse & Retail Sales | CSV | ~5-20 MB | Forecasting AI |
| Manufacturing | Inventory optimization | Liquor Sales | CSV | GB-scale | Forecasting, Optimization |
| Manufacturing | Production demand | Iowa Liquor Sales | CSV | Multi-GB | Forecasting ML |
| Supply Chain | Warehouse optimization | Warehouse & Retail Sales | CSV | ~5-20 MB | Optimization AI |
| Supply Chain | Demand prediction | Retail Supply Chain Sales | CSV | Medium | ML/DL |
| Retail Operations | Shelf analytics | Open Food Facts Images | Images + OCR | TB-scale | Computer Vision |
| Retail Operations | Packaging OCR | Open Food Facts OCR Images | Images + OCR | Multi-million | CV + OCR |
| Customer Experience | Conversational AI | Open Food Facts API | JSON API | Real-time | RAG, NLP |
| Customer Experience | Recommendation | Retail Sales + Purchase | CSV | Medium | Recommendation AI |
| Governance | Nutrition/claim compliance | Open Nutrition | Structured | Medium | NLP, Governance |
| AI/CV Research | Multimodal food/insur AI | FooDI-ML | Images + multilingual | 1.5M+ images | CV + NLP + Multimodal |

## Data Types × Recommended AI

| Data Type | Examples | Recommended AI |
|---|---|---|
| Tabular Sales | Orders, campaigns, inventory | ML, Forecasting |
| Customer Behavior | Clickstream, CRM | Recommendation AI |
| Text | Reviews, comments, surveys | NLP, Sentiment AI |
| Image | Packaging, shelves | Computer Vision |
| Video | Retail/store footage | CV + Edge AI |
| Sensor/IoT | Temperature, machinery | IoT AI |
| Product Metadata | Ingredients, nutrition | RAG + NLP |
| Multi-Modal | Product image + text | Vision-Language AI |

## Best Dataset per AI Area

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

## Starter Stack per Goal

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

## Ingestion Targets in this Project

Place downloaded raw datasets under:
- `data-layer/bronze/<dataset-name>/` (raw)
- `data-layer/silver/<dataset-name>/` (cleansed)
- `data-layer/gold/<dataset-name>/` (curated)

Existing project ingest scripts: `scripts/ingest_rossmann.py`, `scripts/ingest_supply_chain.py`, `scripts/ingest_customer_telco.py`.
