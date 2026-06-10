# Department Process AI Strategy, ROI, Data, And Demo Audit

Date: 2026-06-08

## Scope And Method

- Source of truth: `docs/GOVERNANCE_INDEX.md`, `backend/seeds/departments.json`, `backend/seeds/processes.json`, `backend/seeds/ai_mappings.json`, `backend/seeds/roi_metrics.json`, and local `data/` assets.
- Coverage: 11 seeded departments and 53 seeded processes.
- Dollar values below are planning estimates. Replace them with actual revenue, COGS, inventory, freight, labor, downtime, trade-spend, and quality-cost baselines before business-case signoff.
- `B2C` is used where the current user text said `b2`; if another category was intended, update this report.

## Real Data Download / Local Availability

| Area | Local Status | Evidence |
|---|---|---|
| Sales & Demand Planning | present | Real local dataset present: data/kaggle/rossmann/train.csv (1,017,209 rows, 9 cols); data/kaggle/rossmann/store.csv (1,115 rows, 10 cols); data/kaggle/rossmann/test.csv (41,088 rows, 8 cols) |
| Supply Chain & Inventory | present | Real local dataset present: data/kaggle/supply-chain/supply_chain_data.csv (100 rows, 24 cols) |
| Customer Analytics / Marketing | present | Real local dataset present: data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv (7,043 rows, 21 cols) |
| Other seeded departments | partial/missing direct real dataset | Logistics & Transportation, Manufacturing / Production, Maintenance, Retail & Merchandising, Finance, Procurement / Supplier Management, Quality Control, Governance / Compliance do not have a direct real CSV mapped in `data/kaggle` or `data/customer-analytics`. |
| Insurance corpus | present but separate from seeded beverage-style catalog | `data/insurance/manifest.json`: 312 files, 347257 bytes; `_manifest.json`: 15 download records, dry_run=False. |

## Executive Prioritization

| Priority | Department / Process | Why First | AI Lever | Data Readiness |
|---|---|---|---|---|
| P0 | Sales / baseline_forecasting + demand_sensing | Real Rossmann data is present; highest cross-functional impact on inventory, logistics, finance, and manufacturing. | Time-series ML, explainable AI, decision AI | High |
| P0 | Customer / churn_prediction + segmentation | Real Telco churn data is present; clear demo and measurable retention ROI. | Classification ML, segmentation, next-best-action | High |
| P1 | Supply Chain / inventory_optimization | Supply-chain CSV exists, but only 100 rows; useful for demo, needs enterprise ERP/WMS feed for production. | Optimization, probabilistic ML, decision AI | Medium |
| P1 | Logistics / route_optimization + delivery_tracking | High operational ROI, but needs carrier/GPS/API integrations. | Optimization, ETA ML, transactional AI | Low/Medium |
| P1 | Maintenance / predictive_maintenance | High downtime ROI, but needs telemetry/failure history. | Streaming ML, anomaly detection, survival models | Low |
| P2 | Governance / regulatory_compliance_tracking | Strong RAG/document use case; insurance corpus can support demo. | RAG, NLP, knowledge graph, audit AI | Medium |

## Department Deep Dive

### Sales & Demand Planning (`sales`)

**Digital transformation strategy:** Move from spreadsheet forecast cycles to exception-led demand sensing with explainable forecast drivers and promotion ROI feedback loops.

**Daily-life scenario:** A demand planner starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** Real local dataset present: data/kaggle/rossmann/train.csv (1,017,209 rows, 9 cols); data/kaggle/rossmann/store.csv (1,115 rows, 10 cols); data/kaggle/rossmann/test.csv (41,088 rows, 8 cols)

**ROI / dollar impact:**
- KPI impact ranges: Forecast Accuracy Improvement: 15-25% MAPE reduction; Promotion ROI Improvement: 10-20% increase in promo ROI; Planner Productivity: 30-50% reduction in manual effort
- Illustrative annual dollar impact: $2M-$12M/year from forecast error, promo ROI, and planner productivity improvements on a $250M revenue baseline

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| baseline_forecasting | Data quality gaps, intermittent demand, long-tail SKUs, computational scale | Near-real-time useful; batch MVP acceptable | Time Series Forecasting: Generate statistical baseline demand forecasts using Prophet, SARIMA, or XGBoost | 2+ years POS data, product hierarchy, store master, calendar | ML | B2B, B2C | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees baseline forecasting exceptions, reviews driver explanation, commits adjusted forecast. |
| promo_uplift | Cannibalization effects, overlapping promotions, new promo types, retailer variations | Real-time or near-real-time required | Causal ML / Uplift Modeling: Estimate incremental demand from promotions using XGBoost and causal inference | Promo event history, sell-through data, spend tracking, competitor promos | ML | B2B, B2C | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees promo uplift exceptions, reviews driver explanation, commits adjusted forecast. |
| seasonal_planning | Shifting holidays, climate variability, new markets, short product lifecycles | Near-real-time useful; batch MVP acceptable | Seasonal Decomposition: Decompose time series into trend, seasonality, and residual components | 3+ years POS, weather history, event calendars, geo-location data | ML, Optimization | B2B, B2C | Analytical AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Planner opens daily demand cockpit, sees seasonal planning exceptions, reviews driver explanation, commits adjusted forecast. |
| channel_demand | Channel conflict, data fragmentation across systems, e-commerce volatility | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Disaggregate total demand across retail, e-commerce, wholesale, and direct-to-consumer channels | Channel POS, e-commerce clickstream, distributor sell-through, market panel data | ML | B2B, B2C | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees channel demand exceptions, reviews driver explanation, commits adjusted forecast. |
| new_product_forecast | No historical data, analogue selection bias, cannibalisation of existing lines | Near-real-time useful; batch MVP acceptable | Analogue-based ML: Match new products to similar historical launches using embedding similarity | Analogue product trajectories, distribution rollout plan, consumer research surveys | ML | B2B, B2C | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees new product forecast exceptions, reviews driver explanation, commits adjusted forecast. |
| forecast_reconciliation | Political overrides, misaligned incentives, slow reconciliation cycle times | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Reconcile top-down financial targets with bottom-up statistical forecasts across all planning horizons | All forecast layers, financial targets, category plans, regional inputs | ML | B2B, B2C | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees forecast reconciliation exceptions, reviews driver explanation, commits adjusted forecast. |
| exception_management | Alert fatigue, unclear ownership, lack of root cause visibility | Real-time or near-real-time required | Anomaly Detection: Detect forecast anomalies using Isolation Forest and statistical control charts | Real-time POS, forecast vs actual variance, inventory alerts | ML | B2B, B2C | Transactional AI, Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees exception management exceptions, reviews driver explanation, commits adjusted forecast. |
| demand_sensing | Data latency, signal noise, integration complexity, model drift | Real-time or near-real-time required | Real-time Signal Processing: Fuse daily POS, weather, and social signals using gradient boosting ensemble | Daily/hourly POS, weather APIs, social listening feeds, web analytics | ML, NLP | B2B, B2C | Analytical AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Planner opens daily demand cockpit, sees demand sensing exceptions, reviews driver explanation, commits adjusted forecast. |
| reporting | Manual report building, inconsistent definitions, delayed data availability | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Generate standardized demand planning performance reports for stakeholders across the business | Forecast archive, actuals, approved KPI definitions, hierarchy master | ML, NLP, RAG | B2B, B2C | Transactional AI, Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees reporting exceptions, reviews driver explanation, commits adjusted forecast. |
| forecast_explanation | Black-box ML models, planner distrust, regulatory explainability requirements | Near-real-time useful; batch MVP acceptable | Explainable AI (SHAP): Apply SHAP values to decompose forecast drivers for planner interpretation | Model artifacts, SHAP outputs, feature metadata, business glossary | ML, NLP, RAG | B2B, B2C | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner opens daily demand cockpit, sees forecast explanation exceptions, reviews driver explanation, commits adjusted forecast. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Supply Chain & Inventory (`supply-chain`)

**Digital transformation strategy:** Move from static min/max planning to probabilistic inventory policies, supplier-risk-aware replenishment, and network simulation.

**Daily-life scenario:** A supply planner starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** Real local dataset present: data/kaggle/supply-chain/supply_chain_data.csv (100 rows, 24 cols)

**ROI / dollar impact:**
- KPI impact ranges: Inventory Reduction: 10-20% working capital reduction; Service Level Improvement: 2-5% OTIF improvement; Write-off Reduction: 15-30% reduction in obsolescence
- Illustrative annual dollar impact: $3M-$15M/year from inventory, service-level, and write-off reduction on $50M inventory / $150M COGS baseline

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| inventory_optimization | Lead time variability, demand uncertainty, multi-echelon complexity | Near-real-time useful; batch MVP acceptable | Optimization / Stochastic Simulation: Compute safety stock and reorder points using Monte Carlo simulation | Demand forecast, supplier lead times, cost of holding, service targets | ML, Optimization | B2B, B2B partner ecosystem | Transactional AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner reviews inventory risk, simulates service-level target, approves recommended inventory optimization action. |
| replenishment_planning | Bullwhip effect, supplier unreliability, minimum order quantities | Real-time or near-real-time required | Reinforcement Learning: RL agent learns optimal order quantities across multi-echelon network | Real-time inventory, PO history, supplier performance, demand signals | ML, Optimization | B2B, B2B partner ecosystem | Transactional AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Planner reviews inventory risk, simulates service-level target, approves recommended replenishment planning action. |
| stock_balancing | High transfer costs, perishable goods, system integration gaps | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Reallocate excess inventory across locations to prevent stockouts and reduce write-offs | Warehouse inventory, demand by location, logistics costs, shelf life data | ML, CV | B2B, B2B partner ecosystem | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner reviews inventory risk, simulates service-level target, approves recommended stock balancing action. |
| supplier_lead_time_prediction | Incomplete supplier data, global disruptions, single-source dependencies | Real-time or near-real-time required | Regression / Survival Analysis: Predict delivery lead time distribution using Cox proportional hazards model | PO receipt history, supplier scorecards, shipping lane data, risk indices | ML | B2B, B2B partner ecosystem | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner reviews inventory risk, simulates service-level target, approves recommended supplier lead time prediction action. |
| network_design | Long planning horizons, capital investment decisions, political constraints | Near-real-time useful; batch MVP acceptable | Optimization / simulation / decision intelligence: Optimize the physical supply chain network — warehouse locations, distribution centers, and flow paths | Demand heatmaps, facility operating costs, freight rates, service zone maps | Optimization | B2B, B2B partner ecosystem | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Planner reviews inventory risk, simulates service-level target, approves recommended network design action. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Logistics & Transportation (`logistics`)

**Digital transformation strategy:** Move from manual dispatch and after-the-fact tracking to dynamic route/ETA optimization and proactive exception communication.

**Daily-life scenario:** A dispatcher starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Transportation Cost Reduction: 8-15% freight cost savings; Delivery Performance: 3-7% OTIF improvement
- Illustrative annual dollar impact: $1M-$5M/year from 8-15% freight savings on $15M freight spend plus OTIF gains

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| route_optimization | Dynamic order additions, traffic variability, driver availability, multi-stop complexity | Real-time or near-real-time required | Combinatorial Optimization (VRP): Vehicle routing problem solver using Google OR-Tools with ML-based time windows | Order manifest, GPS/map data, vehicle master, delivery window constraints | Optimization | B2B, B2B partner ecosystem | Transactional AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Dispatcher monitors shipments, AI flags route/delivery risk, user accepts optimized plan and sends ETA update. |
| shipment_scheduling | Carrier capacity shortages, rate volatility, last-minute order changes | Real-time or near-real-time required | Optimization / simulation / decision intelligence: Plan outbound shipment schedules to balance carrier capacity, cost, and delivery commitments | Open orders, carrier contracts, rate cards, capacity commitments | NLP, RAG, Optimization | B2B, B2B partner ecosystem | Transactional AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Dispatcher monitors shipments, AI flags route/delivery risk, user accepts optimized plan and sends ETA update. |
| delivery_tracking | Multiple carrier systems, data latency, customer expectation management | Real-time or near-real-time required | Classification / NLP: Predict delivery exceptions using ML on carrier events and NLP on exception notes | EDI 214 feeds, carrier APIs, weather API, historical delay data | ML | B2B, B2B partner ecosystem | Transactional AI, Analytical AI, Decision AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Dispatcher monitors shipments, AI flags route/delivery risk, user accepts optimized plan and sends ETA update. |
| freight_cost_optimization | Rate volatility, invoice errors, limited market visibility, long-term contracts | Near-real-time useful; batch MVP acceptable | Optimization / simulation / decision intelligence: Analyze and optimize freight spend across lanes, carriers, and modes using market intelligence | Historical invoices, lane volumes, DAT/Spot market rates, contract terms | NLP, RAG, Optimization | B2B, B2B partner ecosystem | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Dispatcher monitors shipments, AI flags route/delivery risk, user accepts optimized plan and sends ETA update. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Manufacturing / Production (`manufacturing`)

**Digital transformation strategy:** Move from fixed schedules to constraint-aware planning, batch sequencing, yield optimization, and capacity scenario planning.

**Daily-life scenario:** A production planner starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: OEE Improvement: 5-15% OEE increase; Raw Material Waste Reduction: 10-20% yield improvement
- Illustrative annual dollar impact: $2M-$10M/year from OEE, yield, waste, and capacity gains

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| production_planning | Short runs, changeover time, shared resources, last-minute demand changes | Near-real-time useful; batch MVP acceptable | Constraint-based Optimization: Mixed-integer programming to optimize production schedules across lines and shifts | BOM, routing sheets, machine capacity, demand forecast, raw material inventory | ML, Optimization | B2E | Transactional AI, Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Plant manager compares current schedule to AI plan, validates constraints, and publishes shift-level production planning plan. |
| batch_scheduling | Allergen/cleaning constraints, minimum batch sizes, shared ingredients, regulatory holds | Near-real-time useful; batch MVP acceptable | Optimization / simulation / decision intelligence: Sequence and schedule production batches to minimize changeover costs and maximize throughput | Product families, changeover matrix, line speeds, batch history, quality specs | Optimization | B2E | Transactional AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Plant manager compares current schedule to AI plan, validates constraints, and publishes shift-level batch scheduling plan. |
| yield_optimization | Raw material variability, equipment wear, operator skill variation, seasonal inputs | Real-time or near-real-time required | Process Mining / Regression: Identify yield-driving process parameters using LASSO regression on sensor data | Process sensor data, lab results, raw material specs, equipment logs | ML, Optimization | B2E | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Plant manager compares current schedule to AI plan, validates constraints, and publishes shift-level yield optimization plan. |
| capacity_planning | Long equipment lead times, demand uncertainty, CapEx approval cycles | Batch / planning cycle | Optimization / simulation / decision intelligence: Project long-term capacity requirements and identify gaps requiring capital investment or outsourcing | 5-year demand plan, line capacity data, investment pipeline, outsourcing costs | Optimization | B2E | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Plant manager compares current schedule to AI plan, validates constraints, and publishes shift-level capacity planning plan. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Maintenance (`maintenance`)

**Digital transformation strategy:** Move from calendar PM to condition-based maintenance using live equipment telemetry and risk-ranked work orders.

**Daily-life scenario:** A maintenance lead starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Unplanned Downtime Reduction: 20-40% reduction; Maintenance Cost Reduction: 15-25% maintenance cost reduction
- Illustrative annual dollar impact: $1M-$6M/year from downtime and maintenance-cost reduction

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| predictive_maintenance | Sensor data quality, model drift over equipment aging, alert fatigue | Real-time or near-real-time required | Anomaly Detection / Survival Analysis: Predict time-to-failure using LSTM neural network on multivariate sensor streams | Time-series sensor data, equipment master, maintenance log, failure history | ML | B2E | Transactional AI, Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Reliability lead sees equipment health alert, checks failure probability, schedules maintenance before downtime. |
| equipment_monitoring | Legacy equipment without sensors, network connectivity, data storage costs | Real-time or near-real-time required | Real-time Streaming ML: Online anomaly detection on equipment sensor streams using statistical process control | SCADA/IoT feeds, equipment specs, historical baselines, threshold definitions | ML, DL | B2E | Transactional AI, Analytical AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Reliability lead sees equipment health alert, checks failure probability, schedules maintenance before downtime. |
| maintenance_scheduling | Competing priorities with production, technician skill matching, parts availability | Near-real-time useful; batch MVP acceptable | Optimization / simulation / decision intelligence: Optimize preventive and corrective maintenance schedules to minimize production impact | PM schedules, production calendar, technician rosters, spare parts data | Optimization | B2E | Transactional AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Reliability lead sees equipment health alert, checks failure probability, schedules maintenance before downtime. |
| spare_parts_optimization | Long lead time parts, obsolescence risk, limited storage space, global supply | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Optimize spare parts inventory levels to balance service availability against carrying costs | Parts consumption history, lead times, equipment criticality ratings, cost data | ML, Optimization | B2E | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Reliability lead sees equipment health alert, checks failure probability, schedules maintenance before downtime. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Retail & Merchandising (`retail`)

**Digital transformation strategy:** Move from manual assortment and planogram decisions to store-cluster optimization, shelf intelligence, and controlled pricing tests.

**Daily-life scenario:** A category manager starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Category Revenue Growth: 3-8% revenue increase; Out-of-Stock Reduction: 20-40% OOS reduction
- Illustrative annual dollar impact: $1M-$8M/year from category revenue lift and OOS reduction

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| shelf_optimization | Retailer compliance, frequent assortment changes, physical measurement accuracy | Near-real-time useful; batch MVP acceptable | Space Optimization / Computer Vision: Recommend shelf facings using sales velocity and computer vision planogram analysis | POS by store/SKU, shelf dimensions, space management data, shopper behavior | DL, CV, Optimization | B2B, B2C | Analytical AI, Decision AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Category manager reviews store-level shelf/pricing recommendation and launches controlled test. |
| product_assortment | Retailer gatekeepers, local demand variation, distribution cost constraints | Near-real-time useful; batch MVP acceptable | Analytical AI + workflow automation: Optimize product range selection by store cluster to maximize relevance and financial performance | Item-level POS, store cluster definitions, shopper demographics, competitor range | Optimization | B2B, B2C | Decision AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Category manager reviews store-level shelf/pricing recommendation and launches controlled test. |
| store_analytics | Inconsistent retailer data formats, geographic data granularity, attribution complexity | Batch / planning cycle | Analytical AI + workflow automation: Analyze store-level performance patterns and identify growth opportunities by geography and format | Weekly POS, store attributes, panel market share, retail audit data | RAG | B2B, B2C | Analytical AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Category manager reviews store-level shelf/pricing recommendation and launches controlled test. |
| pricing_optimization | Retailer price control, cross-SKU cannibalization, rapid competitor response | Real-time or near-real-time required | Price Elasticity Modeling: Estimate price response curves using hierarchical Bayesian models per store cluster | Price point history, volume data, competitor price tracking, margin structure | Optimization | B2B, B2C | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Category manager reviews store-level shelf/pricing recommendation and launches controlled test. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Customer Analytics / Marketing (`customer`)

**Digital transformation strategy:** Move from broad campaigns to customer-level propensity, CLV, churn, personalization, and next-best-action orchestration.

**Daily-life scenario:** A marketing analyst starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** Real local dataset present: data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv (7,043 rows, 21 cols)

**ROI / dollar impact:**
- KPI impact ranges: Customer Retention: 5-15% churn reduction; Marketing ROI Improvement: 20-35% marketing efficiency gain
- Illustrative annual dollar impact: $2M-$10M/year from churn reduction and marketing efficiency

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| customer_segmentation | Data privacy regulations, segment drift over time, actionability of segments | Near-real-time useful; batch MVP acceptable | Clustering / Unsupervised ML: K-means and hierarchical clustering on RFM features with demographic enrichment | Transaction history, loyalty program data, demographic enrichment, web/app behavior | ML | B2B, B2C | Analytical AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Marketing manager selects high-risk/high-value customers, reviews recommended next action, and pushes campaign list. |
| churn_prediction | Defining churn for BEV (no subscription), indirect measurement via loyalty data | Near-real-time useful; batch MVP acceptable | Binary Classification: Gradient boosting classifier on purchase recency, frequency, and engagement signals | Purchase history, loyalty engagement, survey responses, redemption data | ML | B2B, B2C | Analytical AI, Decision AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Marketing manager selects high-risk/high-value customers, reviews recommended next action, and pushes campaign list. |
| clv_prediction | Short loyalty membership periods, household vs individual tracking, private label competition | Near-real-time useful; batch MVP acceptable | BG/NBD + Gamma-Gamma Model: Probabilistic CLV model using BG/NBD for purchase frequency and Gamma-Gamma for spend | Full transaction history, loyalty tenure, product mix, channel usage patterns | ML | B2B, B2C | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Marketing manager selects high-risk/high-value customers, reviews recommended next action, and pushes campaign list. |
| personalization | Cold start for new customers, consent management, channel coordination | Real-time or near-real-time required | Collaborative Filtering / NLP: Matrix factorization and content-based filtering for product recommendations | Individual transaction data, email/app engagement, product catalog, consent records | NLP | B2B, B2C | Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Marketing manager selects high-risk/high-value customers, reviews recommended next action, and pushes campaign list. |
| campaign_effectiveness | Attribution in multi-channel world, long purchase cycles, lack of holdout groups | Near-real-time useful; batch MVP acceptable | Analytical AI + workflow automation: Measure and attribute marketing campaign performance using test/control and multi-touch attribution | Media spend by channel, sales by test/control, campaign exposure data, survey data | ML | B2B, B2C | Analytical AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Marketing manager selects high-risk/high-value customers, reviews recommended next action, and pushes campaign list. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Finance (`finance`)

**Digital transformation strategy:** Move from static variance reporting to predictive finance, automated deduction analysis, and driver-based P&L forecasting.

**Daily-life scenario:** A finance analyst starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Forecast Accuracy: 10-20% revenue forecast error reduction; Trade Spend Efficiency: 5-10% trade spend ROI improvement
- Illustrative annual dollar impact: $1M-$7M/year from forecast accuracy, deduction accuracy, and trade spend leakage reduction

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| revenue_forecasting | Integration with multiple ERP systems, assumption alignment with commercial teams | Near-real-time useful; batch MVP acceptable | Ensemble Forecasting: Ensemble of ARIMA, XGBoost, and neural network models with Bayesian model averaging | Demand forecast, price realization history, trade spend actuals, market share data | ML, NLP, RAG | B2E | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Finance analyst reviews forecast/variance drivers, drills into exceptions, and exports CFO-ready report. |
| profitability_analysis | Overhead allocation methodologies, trade spend net-back complexity, data silos | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Analyze profitability by SKU, customer, and channel to identify margin improvement opportunities | SAP/ERP actuals, trade fund system data, cost allocation models, volume data | ML | B2E | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Finance analyst reviews forecast/variance drivers, drills into exceptions, and exports CFO-ready report. |
| trade_spend_management | Deduction disputes, post-event reconciliation delays, system fragmentation | Near-real-time useful; batch MVP acceptable | Classification / NLP: Automate deduction validation using ML classifier and NLP on invoice descriptions | Trade fund contracts, retailer deduction data, sell-through reports, event calendar | NLP, RAG | B2E | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Finance analyst reviews forecast/variance drivers, drills into exceptions, and exports CFO-ready report. |
| cashflow_forecasting | Receivables timing uncertainty, cross-border FX complexity, system data gaps | Near-real-time useful; batch MVP acceptable | Time-series ML / forecasting: Forecast operating cash flows to optimize working capital and treasury operations | AR aging, AP schedule, revenue forecast, inventory plan, bank position data | ML, Optimization | B2E | Transactional AI, Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Finance analyst reviews forecast/variance drivers, drills into exceptions, and exports CFO-ready report. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Procurement / Supplier Management (`procurement`)

**Digital transformation strategy:** Move from relationship-only sourcing to risk-adjusted supplier decisions, commodity forecasting, and contract intelligence.

**Daily-life scenario:** A buyer starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Procurement Cost Savings: 3-8% COGS reduction; Supply Risk Mitigation: 30-50% reduction in supply disruptions
- Illustrative annual dollar impact: $2M-$12M/year from 3-8% COGS/procurement savings and supply-risk reduction

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| supplier_selection | Limited supplier transparency, sustainability data gaps, single-source concentration | Near-real-time useful; batch MVP acceptable | Multi-Criteria Decision Analysis: AHP-based supplier scoring with ML risk adjustment from financial and ESG signals | Supplier financial reports, audit results, cost benchmarks, ESG ratings | NLP, RAG | B2B, B2B partner ecosystem | Analytical AI, Decision AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Buyer reviews supplier/risk/price recommendation, checks evidence, and starts sourcing workflow. |
| contract_management | Manual contract repositories, expired terms, lack of spend linkage | Real-time or near-real-time required | NLP / RAG / explainable AI: Manage supplier contract lifecycle from negotiation through expiry, including compliance tracking | Contract database, purchase orders, invoice actuals, compliance audit records | NLP, RAG | B2B, B2B partner ecosystem | Transactional AI, Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Buyer reviews supplier/risk/price recommendation, checks evidence, and starts sourcing workflow. |
| vendor_performance | Data collection burden, subjective scoring, vendor pushback on metrics | Real-time or near-real-time required | Computer vision / deep learning: Track and score vendor performance across quality, delivery, cost, and service dimensions | PO receipts, quality inspection logs, invoice data, service tickets | DL, CV, NLP | B2B, B2B partner ecosystem | Analytical AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Buyer reviews supplier/risk/price recommendation, checks evidence, and starts sourcing workflow. |
| commodity_price_forecasting | Market volatility, geopolitical shocks, model instability in crisis periods | Near-real-time useful; batch MVP acceptable | Time Series Forecasting: LSTM model on commodity futures, macro indicators, and supply/demand balances | Futures market data, Bloomberg/Reuters feeds, supplier indices, consumption volumes | ML, NLP | B2B, B2B partner ecosystem | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Buyer reviews supplier/risk/price recommendation, checks evidence, and starts sourcing workflow. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Quality Control (`quality`)

**Digital transformation strategy:** Move from sampled/manual quality control to inline inspection, complaint intelligence, and early batch-risk detection.

**Daily-life scenario:** A quality manager starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Defect Rate Reduction: 40-60% defect reduction; Recall Risk Reduction: 50-70% reduction in quality incidents
- Illustrative annual dollar impact: $1M-$10M/year from defect, complaint, recall, and scrap reduction

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| defect_detection | Lighting variability, product variation, high throughput speed, model retraining | Real-time or near-real-time required | Computer Vision / Deep Learning: CNN-based real-time defect detection on production line camera feeds | Labeled image datasets, sensor readings, product specification files | ML, DL, CV | B2E | Analytical AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Quality lead receives batch/complaint/defect signal, reviews evidence, and opens CAPA workflow. |
| batch_validation | Manual review bottlenecks, LIMS integration, regulatory variation by market | Near-real-time useful; batch MVP acceptable | NLP / RAG / explainable AI: Validate production batch compliance against regulatory and internal quality specifications before release | LIMS results, batch manufacturing records, regulatory limits, historical batch data | NLP, RAG | B2E | Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Quality lead receives batch/complaint/defect signal, reviews evidence, and opens CAPA workflow. |
| supplier_quality_management | Supplier non-disclosure, testing cost and time, limited visibility into sub-suppliers | Near-real-time useful; batch MVP acceptable | Computer vision / deep learning: Monitor and manage incoming raw material quality from suppliers to prevent production quality failures | Incoming QC records, supplier audit reports, specification libraries, field complaint data | DL, CV, NLP, RAG | B2E | Transactional AI, Analytical AI, Decision AI | High: $250K-$900K MVP; $1M-$3M enterprise rollout | Quality lead receives batch/complaint/defect signal, reviews evidence, and opens CAPA workflow. |
| consumer_complaint_analysis | Unstructured text data, batch traceability gaps, volume vs severity trade-offs | Real-time or near-real-time required | NLP / Text Classification: Topic modeling and sentiment analysis on consumer complaint text using BERT | CRM complaint logs, batch traceability data, social media mentions, product returns | NLP | B2E | Transactional AI, Analytical AI, Decision AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Quality lead receives batch/complaint/defect signal, reviews evidence, and opens CAPA workflow. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

### Governance / Compliance (`governance`)

**Digital transformation strategy:** Move from manual compliance tracking to RAG-backed obligation mapping, risk simulation, evidence automation, and audit-ready controls.

**Daily-life scenario:** A compliance lead starts the day with a prioritized queue, investigates only high-impact exceptions, accepts/rejects AI recommendations, and leaves an audit trail.

**Data status:** No direct real dataset found for this seeded department; use synthetic/demo data or insurance corpus until source data is connected

**ROI / dollar impact:**
- KPI impact ranges: Compliance Coverage: 90-99% regulatory compliance rate; Audit Efficiency: 30-50% reduction in audit preparation time
- Illustrative annual dollar impact: $500K-$5M/year from audit efficiency, avoided penalties, and faster remediation

| Process | Pain / List Of Pain | Real-Time Need | AI Strategy And Right Lever | Data Types Needed | AI Modality | Business Fit | AI Class | Cost | Demo Scenario |
|---|---|---|---|---|---|---|---|---|---|
| regulatory_compliance_tracking | Frequent regulatory changes, multi-market complexity, product reformulation costs | Real-time or near-real-time required | NLP / Knowledge Graph: Extract regulatory requirements from regulatory texts using NLP and map to products | Regulatory databases, product specifications, labelling records, market registration data | NLP, RAG | B2E | Transactional AI, Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Compliance owner reviews regulatory/risk alert, checks citations, assigns remediation owner, and records audit trail. |
| audit_management | Resource availability, auditee resistance, finding recurrence, documentation gaps | Real-time or near-real-time required | Optimization / simulation / decision intelligence: Plan, execute, and track internal and external audits to ensure operational and financial compliance | Audit plans, previous reports, SOPs, risk register, corrective action log | NLP, RAG, Optimization | B2E | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Compliance owner reviews regulatory/risk alert, checks citations, assigns remediation owner, and records audit trail. |
| risk_assessment | Subjectivity in risk scoring, emerging risk identification, cross-functional silos | Near-real-time useful; batch MVP acceptable | Probabilistic Risk Modeling: Bayesian network model for enterprise risk quantification and scenario simulation | Risk event history, process data, external risk feeds, insurance claims data | NLP, RAG | B2E | Decision AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Compliance owner reviews regulatory/risk alert, checks citations, assigns remediation owner, and records audit trail. |
| data_governance | Organizational resistance, tool fragmentation, lack of data ownership accountability | Real-time or near-real-time required | Analytical AI + workflow automation: Establish and enforce data quality standards, lineage tracking, and access controls across enterprise data | Data profiling results, catalog metadata, access logs, master data records | RAG | B2E | Transactional AI, Analytical AI | Low/Medium: $60K-$250K MVP; $250K-$800K rollout | Compliance owner reviews regulatory/risk alert, checks citations, assigns remediation owner, and records audit trail. |
| esg_reporting | Data collection from operations, evolving reporting standards (CSRD, SEC), third-party verification | Real-time or near-real-time required | NLP / RAG / explainable AI: Collect, validate, and report Environmental, Social, and Governance metrics for regulatory and investor disclosure | Utility data, logistics emissions, waste records, HR diversity data, governance policies | NLP, RAG | B2E | Analytical AI | Medium: $120K-$450K MVP; $500K-$1.5M rollout | Compliance owner reviews regulatory/risk alert, checks citations, assigns remediation owner, and records audit trail. |

**Implementation sequence:**
- 0-30 days: confirm source systems, baseline KPIs, data owner, security/PII classification, and demo path.
- 30-60 days: build MVP data pipeline, golden dataset, basic model/optimization baseline, and Playwright/API demo.
- 60-90 days: add monitoring, human approval, model/RAG evals, ROI dashboard, and operational handoff.
- 90+ days: productionize with lineage, drift monitoring, cost controls, retry/dead-letter workflows, and governed rollout.

## Cross-Department AI Lever Map

| AI Lever | Best-Fit Departments | Required Data | Evaluation |
|---|---|---|---|
| Transactional AI | Supply Chain, Logistics, Manufacturing, Maintenance, Finance operations | Orders, inventory, work orders, shipments, approvals, audit logs | API contract tests, idempotency, latency, workflow completion, rollback |
| Analytical AI | Sales, Finance, Retail, Customer, Quality, Governance | Time series, KPI history, transactions, customer/product hierarchy | MAPE, AUC/F1, forecast bias, uplift accuracy, drift |
| Decision AI | Sales S&OP, Replenishment, Routing, Production, Procurement, Risk | Forecasts, constraints, costs, service levels, risk scores | Decision quality, constraint satisfaction, ROI, human override rate |
| RAG / Knowledge AI | Governance, Finance, Quality, Sales reporting, Forecast explanation | Policies, contracts, regulations, playbooks, evidence files | RAGAS, DeepEval, G-Eval, citation accuracy, faithfulness, context precision/recall |
| Computer Vision | Quality, Retail shelf, Manufacturing inspection | Images/video, labels, defect taxonomy, camera metadata | Precision/recall, false reject, defect PPM, latency |
| Deep Learning / Streaming AI | Maintenance, demand sensing, defect detection | Sensor streams, event streams, images, weather/social signals | Anomaly precision, lead time, false positives, drift |
| Responsible AI | Customer, Finance, Governance, HR-like decisions if added | Protected attributes where lawful, labels, decision logs | Fairlearn fairness metrics, Detoxify toxicity, bias/fairness thresholds |

## Key Gaps

- Direct real datasets are present for Sales, Supply Chain, and Customer only. Logistics, Manufacturing, Maintenance, Retail, Finance, Procurement, Quality, and Governance need direct source datasets or must use the insurance corpus/synthetic demos.
- Several process AI mappings exist only for high-priority processes; remaining process mappings are inferred from process descriptions in this audit.
- Current local Postgres was not reachable in the latest health checks, so downloaded CSV presence is confirmed but database ingestion status is not fully confirmed in this audit run.
- Real-time claims require live POS, carrier, IoT/SCADA, WMS/ERP, CRM, or regulatory feeds; most local data is static CSV/document data.
- Dollar value impact is estimate-only until actual spend/revenue/labor/downtime baselines are loaded.

## Next Actions

1. Map each seeded process to one explicit source dataset, owner, refresh cadence, PII level, and production system of record.
2. Add missing real-data connectors or curated demo datasets for Logistics, Manufacturing, Maintenance, Retail, Finance, Procurement, Quality, and Governance.
3. Add department ROI baseline inputs: annual revenue, trade spend, freight spend, inventory value, COGS, downtime cost/hour, quality incident cost, and audit labor cost.
4. Build one demo per priority tier: Sales forecast cockpit, Customer churn cockpit, Supply inventory cockpit, Governance RAG compliance cockpit.
5. Add automated report generation under `jobs/reports/department-ai-strategy/` so this audit can be refreshed from seeds and data inventory.
