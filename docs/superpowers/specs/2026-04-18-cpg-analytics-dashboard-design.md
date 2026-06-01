# Insur Analytics Dashboard — Design Specification

**Date**: 2026-04-18
**Status**: Approved
**Type**: Interactive Knowledge Portal + Working Analytics Platform + Full ML Pipeline

---

## 1. Overview

A full-stack BEV (Beverages) Analytics Dashboard covering 11 enterprise departments. The application serves as both an interactive reference portal (process maps, AI recommendations, ROI benchmarks) and a working analytics platform (real ML models trained on Kaggle data, live predictions, model registry).

### Key Principles
- **Left sidebar + right content layout** (white background)
- **Shared data foundation** — same datasets feed multiple departments
- **8 AI types** per department: ML, DL, CV, NLP, RAG, RPA, n8n, Physical AI
- **Local development** — Docker Compose, no cloud dependency
- **Plain Python ML stack** — scikit-learn, XGBoost, Prophet, TensorFlow + Celery/Redis + MLflow

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Frontend  │  │ Backend  │  │  Worker   │          │
│  │ React+Vite│  │ FastAPI  │  │ Celery    │          │
│  │ :3000     │  │ :8000    │  │           │          │
│  └─────┬─────┘  └────┬─────┘  └─────┬─────┘         │
│        │              │              │               │
│        │         ┌────┴─────┐   ┌────┴─────┐        │
│        │         │PostgreSQL│   │  Redis    │        │
│        │         │ :5432    │   │  :6379    │        │
│        │         └──────────┘   └──────────┘        │
│        │                                             │
│        │         ┌──────────┐                        │
│        │         │  MLflow  │                        │
│        │         │  :5001   │                        │
│        │         └──────────┘                        │
└─────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Role |
|---------|------|------|
| Frontend | 3000 | React SPA with sidebar navigation |
| Backend | 8000 | FastAPI REST API (versioned /api/v1/) |
| Worker | — | Celery workers for ML training/prediction jobs |
| PostgreSQL | 5432 | Data storage, metadata, job tracking |
| Redis | 6379 | Celery broker + result backend |
| MLflow | 5001 | Model registry, experiment tracking |

---

## 3. Frontend Design

### 3.1 Layout

```
┌──────────────────────────────────────────────────┐
│  Insur Analytics Dashboard          [user] [theme] │  ← Topbar (dark: #1b1b32)
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  SIDEBAR   │         CONTENT AREA                │
│  (240px)   │         (white: #ffffff)            │
│  dark bg   │                                     │
│  #16162a   │   ┌─────────────────────────────┐   │
│            │   │  Department-specific content │   │
│  Dashboard │   │  Process maps, charts,       │   │
│  ─────────│   │  AI mappings, ML results     │   │
│  Sales     │   └─────────────────────────────┘   │
│  Supply    │                                     │
│  Logistics │                                     │
│  Mfg       │                                     │
│  Maint     │                                     │
│  Retail    │                                     │
│  Customer  │                                     │
│  Finance   │                                     │
│  Procure   │                                     │
│  Quality   │                                     │
│  Govern    │                                     │
│            │                                     │
├────────────┴─────────────────────────────────────┤
│  Status bar                                      │
└──────────────────────────────────────────────────┘
```

### 3.2 CSS Variables

```css
:root {
  --bg-page: #ffffff;
  --bg-card: #ffffff;
  --bg-sidebar: #16162a;
  --bg-topbar: #1b1b32;
  --text-primary: #1a1a2e;
  --text-secondary: #6b7280;
  --text-sidebar: #e2e8f0;
  --accent-primary: #3b82f6;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;
  --border-color: #e5e7eb;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1);
  --sidebar-width: 240px;
  --topbar-height: 56px;
}
```

### 3.3 Sidebar Navigation

| Icon | Label | Route |
|------|-------|-------|
| 📊 | Dashboard | / |
| 🛒 | Sales & Demand | /sales |
| 📦 | Supply Chain | /supply-chain |
| 🚚 | Logistics | /logistics |
| 🏭 | Manufacturing | /manufacturing |
| 🛠️ | Maintenance | /maintenance |
| 🏬 | Retail | /retail |
| 👥 | Customer Analytics | /customer |
| 💰 | Finance | /finance |
| 🧾 | Procurement | /procurement |
| ⚠️ | Quality Control | /quality |
| 🧠 | Governance | /governance |

### 3.4 Each Department Page — Tab Structure

Each department page has 6 tabs:

1. **Overview** — Department description, KPI cards, summary metrics
2. **Processes** — Table of all processes with inputs, outputs, pain points, KPIs
3. **AI Stack** — Matrix showing which AI types (ML/DL/CV/NLP/RAG/RPA/n8n/Physical AI) apply to each process
4. **Data** — Kaggle dataset reference, column descriptions, shared data flow diagram
5. **Models** — Working ML models: train, predict, view results with charts
6. **ROI** — Business impact metrics, realistic benchmarks, ROI calculator

---

## 4. Backend Design

### 4.1 API Structure

```
/api/v1/
├── /health                    # Health check
├── /departments/              # List all departments
├── /departments/{id}/         # Department detail
├── /departments/{id}/processes/   # Processes for department
├── /departments/{id}/ai-stack/    # AI mapping
├── /departments/{id}/datasets/    # Dataset references
├── /departments/{id}/models/      # ML models
├── /departments/{id}/roi/         # ROI metrics
├── /datasets/                 # All Kaggle datasets
├── /datasets/{id}/upload/     # Upload CSV
├── /datasets/{id}/preview/    # Preview data
├── /jobs/                     # ML training/prediction jobs
├── /jobs/{id}/                # Job status
├── /jobs/{id}/results/        # Job results
├── /models/                   # MLflow model registry
├── /models/{id}/predict/      # Run prediction
└── /models/{id}/metrics/      # Model metrics
```

### 4.2 Core Entities

```
Department
  id, name, icon, description, color, route

Process
  id, department_id, name, description, inputs, outputs,
  pain_points, kpi, ai_types[], data_needed

AIMapping
  id, process_id, ai_type (ML|DL|CV|NLP|RAG|RPA|n8n|PhysicalAI),
  use_case, example_output

Dataset
  id, name, kaggle_url, description, columns[], file_path,
  departments[] (shared data foundation)

MLModel
  id, department_id, process_id, dataset_id, name,
  algorithm, status, mlflow_run_id, metrics{}

Job
  id, model_id, type (train|predict), status, celery_task_id,
  created_at, completed_at, result{}

ROIMetric
  id, department_id, benefit_area, impact_range,
  description, measurement_method
```

### 4.3 Backend Directory Structure

```
backend/
├── core/
│   ├── config.py              # Pydantic BaseSettings
│   ├── exceptions.py          # AppError hierarchy
│   ├── error_handlers.py      # Exception → HTTP mapping
│   ├── middleware.py           # Correlation, Security, RateLimit
│   ├── auth.py                # API key middleware
│   ├── logging_config.py      # JSON structured logging
│   ├── dependencies.py        # Depends() factories
│   └── utils.py               # Shared helpers
├── repositories/
│   ├── base.py                # Base repository
│   ├── department_repo.py
│   ├── process_repo.py
│   ├── dataset_repo.py
│   ├── model_repo.py
│   └── job_repo.py
├── schemas/
│   ├── common.py              # SuccessResponse, ErrorResponse, PaginatedResponse
│   ├── department.py
│   ├── process.py
│   ├── dataset.py
│   ├── model.py
│   └── job.py
├── services/
│   ├── department_service.py
│   ├── dataset_service.py
│   ├── ml_service.py          # Model training + prediction
│   ├── mlflow_service.py      # MLflow integration
│   └── job_service.py
├── routers/
│   ├── departments.py
│   ├── datasets.py
│   ├── models.py
│   └── jobs.py
├── ml/
│   ├── pipelines/
│   │   ├── demand_forecast.py     # XGBoost + Prophet
│   │   ├── inventory_optimizer.py # Stock prediction
│   │   ├── customer_segmentation.py # K-means clustering
│   │   ├── defect_detection.py    # CNN classifier
│   │   ├── sentiment_analysis.py  # NLP pipeline
│   │   └── predictive_maintenance.py # Failure prediction
│   ├── features/
│   │   ├── time_features.py       # Calendar, lag, rolling
│   │   └── text_features.py       # NLP feature extraction
│   └── utils.py                   # ML helpers
├── workers/
│   ├── celery_app.py          # Celery configuration
│   └── tasks.py               # Training + prediction tasks
├── seeds/
│   ├── departments.json       # 11 departments
│   ├── processes.json         # ~120 processes
│   ├── ai_mappings.json       # AI type mappings
│   └── roi_metrics.json       # ROI benchmarks
├── migrations/
│   ├── 001_initial.sql
│   └── 002_seed_data.sql
├── database.py
├── main.py
└── tests/
```

---

## 5. 11 Departments — Full Specification

### 5.1 Sales & Demand Planning
- **Processes**: Baseline forecasting, promo uplift, seasonal planning, channel demand, new product forecast, forecast reconciliation, exception management, demand sensing, reporting, forecast explanation
- **AI Stack**: ML (XGBoost time-series), DL (LSTM), NLP (promo text), RAG (forecast explanation), RPA (auto reports), n8n (alert workflows)
- **Kaggle**: Store Sales Time Series Forecasting
- **Working Models**: XGBoost demand forecast, Prophet seasonal decomposition
- **ROI**: 10-20% forecast accuracy improvement, 5% inventory cost reduction

### 5.2 Supply Chain & Inventory
- **Processes**: Inventory planning, safety stock, replenishment, warehouse balancing, stock transfer, demand-supply matching
- **AI Stack**: ML (stock prediction), DL (demand-supply), NLP (supplier comms), RAG (decision explanation), RPA (auto reorder), n8n (restock triggers), Physical AI (warehouse robots)
- **Kaggle**: Inventory Forecasting Dataset
- **Working Models**: Stock level predictor, reorder point optimizer
- **ROI**: 15-25% stockout reduction

### 5.3 Logistics & Transportation
- **Processes**: Route planning, shipment scheduling, carrier selection, load optimization, delivery tracking, last-mile
- **AI Stack**: ML (ETA), DL (traffic), CV (vehicle detection), NLP (delivery notes), RAG (route decisions), RPA (scheduling), n8n (event workflows), Physical AI (autonomous delivery)
- **Kaggle**: Supply Chain Logistics Dataset
- **Working Models**: ETA predictor, route optimizer
- **ROI**: 10-15% logistics cost saving

### 5.4 Manufacturing / Production
- **Processes**: Production planning, batch scheduling, MRP, yield optimization, production execution, capacity planning
- **AI Stack**: ML (production forecast), DL (process optimization), CV (defect detection), NLP (machine logs), RAG (SOP assistant), RPA (work orders), n8n (pipeline orchestration), Physical AI (factory robots)
- **Kaggle**: Industrial Sensor Dataset
- **Working Models**: Production yield predictor, batch scheduler
- **ROI**: 10-20% efficiency gain

### 5.5 Maintenance
- **Processes**: Preventive maintenance, predictive maintenance, work order management, equipment inspection, downtime tracking
- **AI Stack**: ML (failure prediction), DL (anomaly detection), NLP (maintenance logs), RAG (troubleshooting), RPA (auto tickets), n8n (alert workflows), Physical AI (inspection robots)
- **Kaggle**: Predictive Maintenance Dataset
- **Working Models**: Equipment failure predictor, anomaly detector
- **ROI**: 20-30% downtime reduction

### 5.6 Retail & Merchandising
- **Processes**: Shelf optimization, product assortment, store demand, promo effectiveness, category management
- **AI Stack**: ML (sales clustering), DL (behavior modeling), CV (shelf analysis), NLP (feedback), RAG (insights), RPA (reporting), n8n (campaign workflows), Physical AI (smart shelves)
- **Kaggle**: Retail Transaction Dataset
- **Working Models**: Product clustering, shelf optimizer
- **ROI**: 5-15% sales uplift

### 5.7 Customer Analytics / Marketing
- **Processes**: Segmentation, personalization, campaign targeting, CLV, churn prediction
- **AI Stack**: ML (clustering), DL (recommendations), NLP (sentiment), RAG (insight assistant), RPA (campaign execution), n8n (marketing automation)
- **Kaggle**: Customer Segmentation Dataset
- **Working Models**: K-means segmentation, churn predictor
- **ROI**: 10-25% conversion increase

### 5.8 Finance
- **Processes**: Revenue analysis, cost allocation, profitability, budget planning, forecasting
- **AI Stack**: ML (financial forecasting), DL (risk modeling), NLP (invoice extraction), RAG (financial insights), RPA (invoice automation), n8n (finance workflows)
- **Kaggle**: Retail Financial Proxy Dataset
- **Working Models**: Revenue forecaster, profitability analyzer
- **ROI**: Better decision-making

### 5.9 Procurement / Supplier Management
- **Processes**: Supplier selection, contract management, PO management, vendor performance, cost negotiation
- **AI Stack**: ML (supplier scoring), NLP (contract analysis), RAG (contract intelligence), RPA (PO automation), n8n (approval workflows)
- **Kaggle**: Supply Chain Dataset
- **Working Models**: Supplier scorer, contract analyzer
- **ROI**: 5-10% cost reduction

### 5.10 Quality Control
- **Processes**: Defect detection, quality inspection, batch validation, compliance checks, recall management
- **AI Stack**: CV (defect detection - primary), DL (image classification), NLP (quality reports), RAG (quality SOP), RPA (report automation), n8n (alert workflows), Physical AI (inspection robots)
- **Kaggle**: Defect Detection Dataset
- **Working Models**: CNN defect classifier, quality scorer
- **ROI**: Significant defect reduction

### 5.11 Governance / Compliance
- **Processes**: Regulatory compliance, product traceability, audit, risk assessment, data governance
- **AI Stack**: ML (risk scoring), NLP (regulatory parsing), RAG (compliance assistant), RPA (audit automation), n8n (compliance workflows)
- **Kaggle**: Food Safety Dataset
- **Working Models**: Risk scorer, compliance checker
- **ROI**: Reduced compliance violations

---

## 6. Shared Data Foundation

### Cross-Department Data Flow

```
Sales Data (Kaggle: Store Sales)
  ├── Sales & Demand → Forecasting
  ├── Supply Chain → Inventory planning
  ├── Finance → Revenue analysis
  └── Retail → Store analytics

Inventory Data (Kaggle: Inventory Forecasting)
  ├── Supply Chain → Stock optimization
  ├── Retail → Replenishment
  └── Manufacturing → MRP

Customer Data (Kaggle: Customer Segmentation)
  ├── Customer Analytics → Segmentation
  ├── Finance → CLV analysis
  └── Marketing → Campaign targeting

Sensor Data (Kaggle: Industrial/Predictive Maintenance)
  ├── Manufacturing → Yield optimization
  ├── Maintenance → Failure prediction
  └── Quality → Defect detection
```

---

## 7. ML Pipeline Design

### 7.1 Training Flow

```
Upload CSV → Validate → Feature Engineering → Train Model → Log to MLflow → Store Results
     │                                              │
     └── Celery Task ──────────────────────────────┘
```

### 7.2 Prediction Flow

```
Select Model → Load from MLflow → Input Data → Predict → Return Results + Charts
```

### 7.3 Model Registry (MLflow)

- Each model versioned with dataset hash + hyperparameters
- Metrics: MAPE, RMSE, accuracy, F1 as applicable
- Artifacts: trained model, feature importance, confusion matrix

---

## 8. Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | 18.x |
| Routing | React Router | 6.x |
| Charts | Recharts | 2.x |
| Styling | CSS Modules + Variables | — |
| Backend | FastAPI | 0.110+ |
| ORM/DB | PostgreSQL + psycopg2 | 16.x |
| Task Queue | Celery | 5.x |
| Broker | Redis | 7.x |
| ML | scikit-learn, XGBoost, Prophet | latest |
| DL | TensorFlow / PyTorch | latest |
| NLP | spaCy / transformers | latest |
| Model Registry | MLflow | 2.x |
| Containers | Docker Compose | 3.8 |

---

## 9. Enterprise AI Classification (Reference)

### 5 AI Buckets Used

| Bucket | AI Types | Dashboard Representation |
|--------|----------|------------------------|
| Insight AI | Descriptive, Diagnostic | Charts, trend analysis |
| Prediction AI | Predictive (ML/DL) | Forecasts, predictions |
| Decision AI | Prescriptive, Optimization | Recommendations |
| Action AI | RPA, n8n, Autonomous | Workflow automation |
| Interaction AI | NLP, GenAI, RAG | Natural language explanations |

---

## 10. Enterprise Gaps Addressed (Sales & Demand Planning Deep Dive)

### 10.1 Stockout & Lost Sales Correction
- Detect stockouts: IF sales == 0 AND avg_sales_last_7_days > threshold
- ML-based: predict expected demand, compare actual vs predicted
- Store both actual_sales and corrected_demand in demand_correction table
- Feed corrected demand back into forecasting pipeline

### 10.2 Forecast Hierarchy
- Levels: SKU → Category → Brand → Store → Region → Channel → Country
- Bottom-up and top-down reconciliation
- Each level independently forecastable

### 10.3 Override Governance
- Planner override with reason codes, approval trail
- Forecast Value Added (FVA) analysis — do overrides help or hurt?
- Audit log for all changes

### 10.4 Confidence Intervals
- Best case / likely / worst case bands
- Risk scoring per SKU/store
- Business users see ranges, not single numbers

### 10.5 Scenario Simulation (What-If)
- Sliders: price, promo depth, season, launch timing
- Real-time recalculation with ML model
- Compare scenarios side-by-side

### 10.6 13 Demo Scenarios
1. Demand Forecasting System (30-day prediction)
2. Promotion Impact Simulator
3. Forecast Accuracy Dashboard (MAPE/WAPE)
4. Exception Detection System (anomaly alerts)
5. Demand Explanation (RAG chat)
6. Demand Sensing (real-time short-horizon)
7. New Product Forecasting (cold-start)
8. Multi-Store Demand Comparison (heatmap)
9. Scenario Planning (what-if sliders)
10. Automated Forecast Pipeline (n8n trigger)
11. AI Planner Assistant (RAG copilot chat)
12. Alerting System (n8n workflows)
13. Report Automation (PDF generation)

### 10.7 5 Core UI Screens Per Department
1. Forecast Dashboard — SKU-level forecast, actual vs predicted graph, filters
2. Accuracy & KPI Dashboard — MAPE/WAPE, error by SKU/store, outliers
3. Exception / Alerts Screen — high-risk SKUs, stockout alerts
4. AI Explanation (RAG Chat) — "Why demand changed?" with driver ranking
5. Scenario Simulation — what-if sliders, confidence bands

### 10.8 Database Additions
- demand_correction: date, store_id, product_id, actual_sales, predicted_demand, corrected_demand, stockout_flag
- forecast_versions: version_id, type (baseline/promo/consensus/final), created_by, approved_by
- forecast_overrides: override_id, forecast_id, original_value, override_value, reason, planner_id
- model_drift: model_id, metric_name, baseline_value, current_value, drift_score, timestamp

### 10.9 Additional Data Tables (Star Schema)
- sales_fact: date, store_id, product_id, sales_qty, revenue, promo_flag
- product_dim: product_id, category, brand, price
- store_dim: store_id, location, region, store_type
- external_features: date, holiday_flag, event_type, oil_price
- forecast_output: date, store_id, product_id, predicted_sales, confidence_lower, confidence_upper, model_version
- model_metrics: model_name, MAPE, RMSE, bias, version, timestamp
- pipeline_logs: run_id, status, error_message, runtime

---

## 11. Non-Functional Requirements

- **Response time**: API < 500ms (p95), ML jobs async via Celery
- **Data limits**: Kaggle datasets up to 1GB per file
- **Concurrent users**: Local dev, 1-5 users
- **Browser support**: Chrome, Firefox, Edge (latest)
- **Accessibility**: ARIA labels, keyboard navigation
- **Security**: API key auth (optional in dev), CORS restricted, security headers
