# Flowchart, Data, Demo, Problem, Pain, AI Type, Dashboard, And Report Audit

Date: 2026-06-08

## Scope

- Seeded department/process catalog: `backend/seeds/departments.json`, `backend/seeds/processes.json`, `backend/seeds/ai_mappings.json`.
- INSUR API catalogs: `backend/routers/reports.py`, `backend/routers/demo_stories.py`, `backend/routers/graph.py`, `backend/routers/downloads.py`.
- Local data evidence: `data/kaggle`, `data/customer-analytics`, `data/insurance`.

## Coverage Summary

| Area | Count / Status | Evidence |
|---|---:|---|
| Seeded departments | 11 | `backend/seeds/departments.json` |
| Seeded processes | 53 | `backend/seeds/processes.json` |
| Explicit AI mappings | 30 | `backend/seeds/ai_mappings.json`; unmapped processes require inferred AI type |
| ROI metric rows | 24 | `backend/seeds/roi_metrics.json` |
| Flowchart/diagram markdown files | 332 | `docs/testing`, `docs/diagrams`, `docs/processes` |
| INSUR report catalog | 19 departments x 15 reports = 285 | `GET /api/v1/insur/reports/_global` |
| INSUR demo catalog | 19 departments x 15 roles = 285 | `GET /api/v1/insur/demo-stories/_global` |
| INSUR dashboard graph nodes | 15 role dashboards per department | `GET /api/v1/insur/graph/{dept}/nodes?type=dashboard` |
| INSUR download catalog | 19 departments; 25 datasets; four files per dataset | `GET /api/v1/insur/downloads/_global` |

## Flowchart / Diagram Inventory

| Flowchart Source | Status | Notes |
|---|---|---|
| `docs/testing/PROCESS_TESTING_DIAGRAMS.md` | present | Process testing graphs, flowcharts, pipeline, cron scheduling, and agent assignment diagrams. |
| `docs/diagrams/agent-platform-architecture.md` | present | Layered agent platform, runtime, tool governance, memory/RAG, and observability diagrams. |
| `docs/processes/**/process-detail.md` | present at scale | 322 process markdown files contain Mermaid/diagram markers. Many generated process files still have TODO fields. |
| Seeded 53-process beverage catalog | partial | Process metadata exists, but no one Mermaid flowchart per seeded process. Recommended next artifact: generated per-process flowchart catalog from `backend/seeds/processes.json`. |

## Real Data Inventory

| Dataset | Rows | Columns | Use | Status |
|---|---:|---:|---|---|
| `data/kaggle/rossmann/train.csv` | 1,017,209 | 9 | Sales forecasting | downloaded locally |
| `data/kaggle/rossmann/store.csv` | 1,115 | 10 | Sales forecasting | downloaded locally |
| `data/kaggle/rossmann/test.csv` | 41,088 | 8 | Sales forecasting | downloaded locally |
| `data/kaggle/supply-chain/supply_chain_data.csv` | 100 | 24 | Supply chain demo | downloaded locally |
| `data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv` | 7,043 | 21 | Customer churn demo | downloaded locally |
| `data/insurance/manifest.json` | n/a | n/a | Insurance demo/data corpus | 312 files; .csv: 67, .docx: 29, .json: 67, .mp4: 5, .pdf: 67, .png: 5, .txt: 67, .wav: 5 |

## AI Type List

- Analogue-based ML
- Analytical AI
- Anomaly Detection
- Anomaly Detection / Survival Analysis
- BG/NBD + Gamma-Gamma Model
- Binary Classification
- Causal ML / Uplift Modeling
- Classification / NLP
- Clustering / Unsupervised ML
- Collaborative Filtering / NLP
- Combinatorial Optimization (VRP)
- Computer Vision
- Computer Vision / Deep Learning
- Constraint-based Optimization
- Decision AI
- Deep Learning
- Ensemble Forecasting
- Explainable AI (SHAP)
- Multi-Criteria Decision Analysis
- NLP
- NLP / Knowledge Graph
- NLP / Text Classification
- Optimization / Simulation
- Optimization / Stochastic Simulation
- Price Elasticity Modeling
- Probabilistic Risk Modeling
- Process Mining / Regression
- RAG / Knowledge AI
- Real-time Signal Processing
- Real-time Streaming ML
- Regression / Survival Analysis
- Reinforcement Learning
- Responsible AI / Fairness / Toxicity Evaluation
- Seasonal Decomposition
- Space Optimization / Computer Vision
- Time Series Forecasting
- Transactional AI

## Dashboard Inventory

| Dashboard | Persona / Role | Primary Purpose | Route / API |
|---|---|---|---|
| admin dashboard | Admin (System) | Tenant onboarding + RBAC drift detection | `/admin`; graph node `dashboard:admin` |
| manager dashboard | Dept Manager | KPI surface + approval queue + team perf | `/dashboard?role=manager`; graph node `dashboard:manager` |
| team-member dashboard | Team Member | My-work queue + my SLA + personal metrics | `/dashboard?role=team-member`; graph node `dashboard:team-member` |
| tester dashboard | QA / Tester | Regression heatmap + flaky-test triage | `/dashboard?role=tester`; graph node `dashboard:tester` |
| security dashboard | SecOps Engineer | Alert volume + MTTD/MTTR + vuln backlog | `/security`; graph node `dashboard:security` |
| devops dashboard | DevOps | DORA metrics + deploy frequency + cost | `/dashboard?role=devops`; graph node `dashboard:devops` |
| ai-reviewer dashboard | AI Reviewer | Model drift + fairness gate + override rate | `/monitoring + /pipelines`; graph node `dashboard:ai-reviewer` |
| digital-transformation dashboard | DT Lead | AS-IS vs TO-BE + automation % per process | `/dashboard?role=digital-transformation`; graph node `dashboard:digital-transformation` |
| system-architect dashboard | System Architect | Service health + dep graph + capacity | `/c4-model/deep`; graph node `dashboard:system-architect` |
| test-architect dashboard | Test Architect | Test pyramid health + coverage per service | `/dashboard?role=test-architect`; graph node `dashboard:test-architect` |
| database-architect dashboard | DB Architect | Slow-query list + schema drift + replication | `/dashboard?role=database-architect`; graph node `dashboard:database-architect` |
| api-architect dashboard | API Architect | API p95 + version adoption + deprecation | `/dashboard?role=api-architect`; graph node `dashboard:api-architect` |
| data-owner dashboard | Data Owner | Data quality + lineage + freshness SLA | `/dashboard?role=data-owner`; graph node `dashboard:data-owner` |
| ai-strategy dashboard | AI Strategy Lead | Automation backlog + ROI vs plan | `/dashboard?role=ai-strategy`; graph node `dashboard:ai-strategy` |
| information-security dashboard | InfoSec / CISO Office | Compliance gates + CVE backlog + 3rd-party risk | `/security/deep`; graph node `dashboard:information-security` |

Additional process/UI dashboards already referenced by the app and APIs:

- `/agent-supervisor`: local agent, queue, heartbeat, schedule, report, and task monitoring.
- `/api/v1/insur/graph/{dept}`: master entities, process, pipeline, role, report, demo, audit event, and dashboard graph.
- `/api/v1/insurance/*`: insurance process detail dashboards and role dashboards for the insurance corpus.
- Seeded process UI tabs: overview, data, model, analysis, visualization, simulation, user story, user demo, ResAI, ExpAI, governance/testing where wired in frontend process views.

## Standard Report Inventory

| Report ID | Cadence | Format | Owner Role | Audience |
|---|---|---|---|---|
| `daily_ops_digest` | daily 08:00 | PDF + Slack | admin | admin / devops / manager |
| `weekly_business_review` | weekly Monday | PDF + email | manager | manager / dept staff |
| `daily_my_work` | daily 07:00 | email | team-member | team-member (per user) |
| `pre_release_test_report` | per release | HTML | tester | tester / engineering / manager |
| `weekly_security_posture` | weekly Monday | PDF | security | security / information-security / manager |
| `dora_weekly` | weekly | Grafana JSON | devops | devops / engineering / manager |
| `monthly_model_review` | monthly | PDF + Notion | ai-reviewer | ai-reviewer / ai-strategy / manager |
| `quarterly_dt_scorecard` | quarterly | PDF | digital-transformation | digital-transformation / executive-leadership |
| `monthly_arch_review` | monthly | Markdown | system-architect | system-architect / engineering / devops |
| `quarterly_test_strategy` | quarterly | PDF | test-architect | test-architect / engineering / tester |
| `weekly_db_health` | weekly | Grafana | database-architect | database-architect / devops |
| `weekly_api_contract` | weekly | Markdown | api-architect | api-architect / engineering |
| `monthly_data_steward` | monthly | PDF | data-owner | data-owner / ai-strategy / manager |
| `quarterly_dt_strategy` | quarterly | PDF + slides | ai-strategy | ai-strategy / executive-leadership / manager |
| `monthly_infosec` | monthly | PDF | information-security | information-security / security / executive-leadership |

Additional testing/governance report families:

- `jobs/reports/testing/*`: default global testing reports from `docs/testing/GLOBAL_DEFAULT_TESTING_POLICY.md`.
- `docs/DEPARTMENT_AI_STRATEGY_PROCESS_AUDIT_2026-06-08.md`: department/process AI strategy, ROI, data, and use-case audit.
- `docs/DEEP_ERROR_ANALYSIS_REPORT_2026-06-08.md`: earlier error/data/model/frontend/backend/API deep analysis report.
- `./scripts/agent_fleet.sh supervisor-report`: JSON report for agent queues, heartbeats, schedules, process-test catalog, and recent failures.

## Process Problem / Pain / Data / Demo Check

| Department | Processes | Problem/Data/Pain Coverage | Demo Coverage | Real Data Coverage |
|---|---:|---|---|---|
| Sales & Demand Planning (`sales`) | 10 | 10/10 have description, inputs, outputs, pain, and data_needed | INSUR role demo catalog present | direct real dataset present |
| Supply Chain & Inventory (`supply-chain`) | 5 | 5/5 have description, inputs, outputs, pain, and data_needed | INSUR role demo catalog present | direct real dataset present |
| Logistics & Transportation (`logistics`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | no direct real dataset mapped in core data folders |
| Manufacturing / Production (`manufacturing`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | INSUR role demo catalog present | no direct real dataset mapped in core data folders |
| Maintenance (`maintenance`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | no direct real dataset mapped in core data folders |
| Retail & Merchandising (`retail`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | no direct real dataset mapped in core data folders |
| Customer Analytics / Marketing (`customer`) | 5 | 5/5 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | direct real dataset present |
| Finance (`finance`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | INSUR role demo catalog present | no direct real dataset mapped in core data folders |
| Procurement / Supplier Management (`procurement`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | INSUR role demo catalog present | no direct real dataset mapped in core data folders |
| Quality Control (`quality`) | 4 | 4/4 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | no direct real dataset mapped in core data folders |
| Governance / Compliance (`governance`) | 5 | 5/5 have description, inputs, outputs, pain, and data_needed | inferred demo scenario in AI strategy audit; INSUR role demos exist only if mapped to INSUR 19-dept router | no direct real dataset mapped in core data folders |

## Per-Process Checklist

| Department | Process | Problem | Pain | Data Needed | AI Type | Demo | Real Data |
|---|---|---|---|---|---|---|---|
| sales | baseline_forecasting | Generate statistical baseline demand forecasts using historical sales data without promotional effects | Data quality gaps, intermittent demand, long-tail SKUs, computational scale | 2+ years POS data, product hierarchy, store master, calendar | Time Series Forecasting | Demo in strategy audit: operator reviews baseline forecasting recommendation and approves/audits action | yes |
| sales | promo_uplift | Model incremental demand lift from trade promotions, pricing changes, and marketing activities | Cannibalization effects, overlapping promotions, new promo types, retailer variations | Promo event history, sell-through data, spend tracking, competitor promos | Causal ML / Uplift Modeling | Demo in strategy audit: operator reviews promo uplift recommendation and approves/audits action | yes |
| sales | seasonal_planning | Identify and model seasonal demand patterns including holidays, events, and weather impacts | Shifting holidays, climate variability, new markets, short product lifecycles | 3+ years POS, weather history, event calendars, geo-location data | Seasonal Decomposition | Demo in strategy audit: operator reviews seasonal planning recommendation and approves/audits action | yes |
| sales | channel_demand | Disaggregate total demand across retail, e-commerce, wholesale, and direct-to-consumer channels | Channel conflict, data fragmentation across systems, e-commerce volatility | Channel POS, e-commerce clickstream, distributor sell-through, market panel data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews channel demand recommendation and approves/audits action | yes |
| sales | new_product_forecast | Forecast demand for new product launches using analogous product performance and market research | No historical data, analogue selection bias, cannibalisation of existing lines | Analogue product trajectories, distribution rollout plan, consumer research surveys | Analogue-based ML | Demo in strategy audit: operator reviews new product forecast recommendation and approves/audits action | yes |
| sales | forecast_reconciliation | Reconcile top-down financial targets with bottom-up statistical forecasts across all planning horizons | Political overrides, misaligned incentives, slow reconciliation cycle times | All forecast layers, financial targets, category plans, regional inputs | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews forecast reconciliation recommendation and approves/audits action | yes |
| sales | exception_management | Identify and surface forecast anomalies, outliers, and events requiring planner attention | Alert fatigue, unclear ownership, lack of root cause visibility | Real-time POS, forecast vs actual variance, inventory alerts | Anomaly Detection | Demo in strategy audit: operator reviews exception management recommendation and approves/audits action | yes |
| sales | demand_sensing | Use near-real-time signals (POS, social, weather) to adjust short-horizon forecasts within the planning cycle | Data latency, signal noise, integration complexity, model drift | Daily/hourly POS, weather APIs, social listening feeds, web analytics | Real-time Signal Processing | Demo in strategy audit: operator reviews demand sensing recommendation and approves/audits action | yes |
| sales | reporting | Generate standardized demand planning performance reports for stakeholders across the business | Manual report building, inconsistent definitions, delayed data availability | Forecast archive, actuals, approved KPI definitions, hierarchy master | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews reporting recommendation and approves/audits action | yes |
| sales | forecast_explanation | Provide interpretable explanations for forecast drivers and variance to enable planner trust and override decisions | Black-box ML models, planner distrust, regulatory explainability requirements | Model artifacts, SHAP outputs, feature metadata, business glossary | Explainable AI (SHAP) | Demo in strategy audit: operator reviews forecast explanation recommendation and approves/audits action | yes |
| supply-chain | inventory_optimization | Compute optimal inventory targets (safety stock, reorder points, max levels) across the network | Lead time variability, demand uncertainty, multi-echelon complexity | Demand forecast, supplier lead times, cost of holding, service targets | Optimization / Stochastic Simulation | Demo in strategy audit: operator reviews inventory optimization recommendation and approves/audits action | yes |
| supply-chain | replenishment_planning | Generate automated replenishment orders based on inventory positions and demand signals | Bullwhip effect, supplier unreliability, minimum order quantities | Real-time inventory, PO history, supplier performance, demand signals | Reinforcement Learning | Demo in strategy audit: operator reviews replenishment planning recommendation and approves/audits action | yes |
| supply-chain | stock_balancing | Reallocate excess inventory across locations to prevent stockouts and reduce write-offs | High transfer costs, perishable goods, system integration gaps | Warehouse inventory, demand by location, logistics costs, shelf life data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews stock balancing recommendation and approves/audits action | yes |
| supply-chain | supplier_lead_time_prediction | Predict supplier delivery lead times using historical PO data and external disruption signals | Incomplete supplier data, global disruptions, single-source dependencies | PO receipt history, supplier scorecards, shipping lane data, risk indices | Regression / Survival Analysis | Demo in strategy audit: operator reviews supplier lead time prediction recommendation and approves/audits action | yes |
| supply-chain | network_design | Optimize the physical supply chain network — warehouse locations, distribution centers, and flow paths | Long planning horizons, capital investment decisions, political constraints | Demand heatmaps, facility operating costs, freight rates, service zone maps | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews network design recommendation and approves/audits action | yes |
| logistics | route_optimization | Optimize delivery routes for minimum cost, distance, and time while meeting delivery windows | Dynamic order additions, traffic variability, driver availability, multi-stop complexity | Order manifest, GPS/map data, vehicle master, delivery window constraints | Combinatorial Optimization (VRP) | Demo in strategy audit: operator reviews route optimization recommendation and approves/audits action | missing direct dataset |
| logistics | shipment_scheduling | Plan outbound shipment schedules to balance carrier capacity, cost, and delivery commitments | Carrier capacity shortages, rate volatility, last-minute order changes | Open orders, carrier contracts, rate cards, capacity commitments | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews shipment scheduling recommendation and approves/audits action | missing direct dataset |
| logistics | delivery_tracking | Monitor shipment status in real-time and predict delivery exceptions before they occur | Multiple carrier systems, data latency, customer expectation management | EDI 214 feeds, carrier APIs, weather API, historical delay data | Classification / NLP | Demo in strategy audit: operator reviews delivery tracking recommendation and approves/audits action | missing direct dataset |
| logistics | freight_cost_optimization | Analyze and optimize freight spend across lanes, carriers, and modes using market intelligence | Rate volatility, invoice errors, limited market visibility, long-term contracts | Historical invoices, lane volumes, DAT/Spot market rates, contract terms | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews freight cost optimization recommendation and approves/audits action | missing direct dataset |
| manufacturing | production_planning | Create detailed production schedules to meet demand forecasts within capacity constraints | Short runs, changeover time, shared resources, last-minute demand changes | BOM, routing sheets, machine capacity, demand forecast, raw material inventory | Constraint-based Optimization | Demo in strategy audit: operator reviews production planning recommendation and approves/audits action | missing direct dataset |
| manufacturing | batch_scheduling | Sequence and schedule production batches to minimize changeover costs and maximize throughput | Allergen/cleaning constraints, minimum batch sizes, shared ingredients, regulatory holds | Product families, changeover matrix, line speeds, batch history, quality specs | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews batch scheduling recommendation and approves/audits action | missing direct dataset |
| manufacturing | yield_optimization | Maximize product yield and minimize waste by analyzing production parameters and process variables | Raw material variability, equipment wear, operator skill variation, seasonal inputs | Process sensor data, lab results, raw material specs, equipment logs | Process Mining / Regression | Demo in strategy audit: operator reviews yield optimization recommendation and approves/audits action | missing direct dataset |
| manufacturing | capacity_planning | Project long-term capacity requirements and identify gaps requiring capital investment or outsourcing | Long equipment lead times, demand uncertainty, CapEx approval cycles | 5-year demand plan, line capacity data, investment pipeline, outsourcing costs | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews capacity planning recommendation and approves/audits action | missing direct dataset |
| maintenance | predictive_maintenance | Predict equipment failures before they occur using sensor data and ML anomaly detection | Sensor data quality, model drift over equipment aging, alert fatigue | Time-series sensor data, equipment master, maintenance log, failure history | Anomaly Detection / Survival Analysis | Demo in strategy audit: operator reviews predictive maintenance recommendation and approves/audits action | missing direct dataset |
| maintenance | equipment_monitoring | Continuously monitor equipment health indicators and surface anomalies in real time | Legacy equipment without sensors, network connectivity, data storage costs | SCADA/IoT feeds, equipment specs, historical baselines, threshold definitions | Real-time Streaming ML | Demo in strategy audit: operator reviews equipment monitoring recommendation and approves/audits action | missing direct dataset |
| maintenance | maintenance_scheduling | Optimize preventive and corrective maintenance schedules to minimize production impact | Competing priorities with production, technician skill matching, parts availability | PM schedules, production calendar, technician rosters, spare parts data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews maintenance scheduling recommendation and approves/audits action | missing direct dataset |
| maintenance | spare_parts_optimization | Optimize spare parts inventory levels to balance service availability against carrying costs | Long lead time parts, obsolescence risk, limited storage space, global supply | Parts consumption history, lead times, equipment criticality ratings, cost data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews spare parts optimization recommendation and approves/audits action | missing direct dataset |
| retail | shelf_optimization | Determine optimal shelf space allocation and product placement to maximize category revenue | Retailer compliance, frequent assortment changes, physical measurement accuracy | POS by store/SKU, shelf dimensions, space management data, shopper behavior | Space Optimization / Computer Vision | Demo in strategy audit: operator reviews shelf optimization recommendation and approves/audits action | missing direct dataset |
| retail | product_assortment | Optimize product range selection by store cluster to maximize relevance and financial performance | Retailer gatekeepers, local demand variation, distribution cost constraints | Item-level POS, store cluster definitions, shopper demographics, competitor range | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews product assortment recommendation and approves/audits action | missing direct dataset |
| retail | store_analytics | Analyze store-level performance patterns and identify growth opportunities by geography and format | Inconsistent retailer data formats, geographic data granularity, attribution complexity | Weekly POS, store attributes, panel market share, retail audit data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews store analytics recommendation and approves/audits action | missing direct dataset |
| retail | pricing_optimization | Set optimal retail prices by analyzing price elasticity, competitive positioning, and margin targets | Retailer price control, cross-SKU cannibalization, rapid competitor response | Price point history, volume data, competitor price tracking, margin structure | Price Elasticity Modeling | Demo in strategy audit: operator reviews pricing optimization recommendation and approves/audits action | missing direct dataset |
| customer | customer_segmentation | Cluster customers into behaviorally and demographically distinct segments for targeted marketing | Data privacy regulations, segment drift over time, actionability of segments | Transaction history, loyalty program data, demographic enrichment, web/app behavior | Clustering / Unsupervised ML | Demo in strategy audit: operator reviews customer segmentation recommendation and approves/audits action | yes |
| customer | churn_prediction | Identify customers at risk of churning and enable proactive retention interventions | Defining churn for BEV (no subscription), indirect measurement via loyalty data | Purchase history, loyalty engagement, survey responses, redemption data | Binary Classification | Demo in strategy audit: operator reviews churn prediction recommendation and approves/audits action | yes |
| customer | clv_prediction | Forecast customer lifetime value to prioritize acquisition spend and retention investments | Short loyalty membership periods, household vs individual tracking, private label competition | Full transaction history, loyalty tenure, product mix, channel usage patterns | BG/NBD + Gamma-Gamma Model | Demo in strategy audit: operator reviews clv prediction recommendation and approves/audits action | yes |
| customer | personalization | Deliver personalized product recommendations and offers through digital and physical channels | Cold start for new customers, consent management, channel coordination | Individual transaction data, email/app engagement, product catalog, consent records | Collaborative Filtering / NLP | Demo in strategy audit: operator reviews personalization recommendation and approves/audits action | yes |
| customer | campaign_effectiveness | Measure and attribute marketing campaign performance using test/control and multi-touch attribution | Attribution in multi-channel world, long purchase cycles, lack of holdout groups | Media spend by channel, sales by test/control, campaign exposure data, survey data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews campaign effectiveness recommendation and approves/audits action | yes |
| finance | revenue_forecasting | Forecast revenue by product, channel, and geography to support financial planning and investor reporting | Integration with multiple ERP systems, assumption alignment with commercial teams | Demand forecast, price realization history, trade spend actuals, market share data | Ensemble Forecasting | Demo in strategy audit: operator reviews revenue forecasting recommendation and approves/audits action | missing direct dataset |
| finance | profitability_analysis | Analyze profitability by SKU, customer, and channel to identify margin improvement opportunities | Overhead allocation methodologies, trade spend net-back complexity, data silos | SAP/ERP actuals, trade fund system data, cost allocation models, volume data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews profitability analysis recommendation and approves/audits action | missing direct dataset |
| finance | trade_spend_management | Plan, execute, and reconcile trade promotion investments against financial targets | Deduction disputes, post-event reconciliation delays, system fragmentation | Trade fund contracts, retailer deduction data, sell-through reports, event calendar | Classification / NLP | Demo in strategy audit: operator reviews trade spend management recommendation and approves/audits action | missing direct dataset |
| finance | cashflow_forecasting | Forecast operating cash flows to optimize working capital and treasury operations | Receivables timing uncertainty, cross-border FX complexity, system data gaps | AR aging, AP schedule, revenue forecast, inventory plan, bank position data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews cashflow forecasting recommendation and approves/audits action | missing direct dataset |
| procurement | supplier_selection | Evaluate and score suppliers using a multi-criteria framework to support sourcing decisions | Limited supplier transparency, sustainability data gaps, single-source concentration | Supplier financial reports, audit results, cost benchmarks, ESG ratings | Multi-Criteria Decision Analysis | Demo in strategy audit: operator reviews supplier selection recommendation and approves/audits action | missing direct dataset |
| procurement | contract_management | Manage supplier contract lifecycle from negotiation through expiry, including compliance tracking | Manual contract repositories, expired terms, lack of spend linkage | Contract database, purchase orders, invoice actuals, compliance audit records | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews contract management recommendation and approves/audits action | missing direct dataset |
| procurement | vendor_performance | Track and score vendor performance across quality, delivery, cost, and service dimensions | Data collection burden, subjective scoring, vendor pushback on metrics | PO receipts, quality inspection logs, invoice data, service tickets | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews vendor performance recommendation and approves/audits action | missing direct dataset |
| procurement | commodity_price_forecasting | Forecast commodity input prices to inform hedging strategy and budget planning | Market volatility, geopolitical shocks, model instability in crisis periods | Futures market data, Bloomberg/Reuters feeds, supplier indices, consumption volumes | Time Series Forecasting | Demo in strategy audit: operator reviews commodity price forecasting recommendation and approves/audits action | missing direct dataset |
| quality | defect_detection | Detect product defects in real time during production using computer vision and sensor analytics | Lighting variability, product variation, high throughput speed, model retraining | Labeled image datasets, sensor readings, product specification files | Computer Vision / Deep Learning | Demo in strategy audit: operator reviews defect detection recommendation and approves/audits action | missing direct dataset |
| quality | batch_validation | Validate production batch compliance against regulatory and internal quality specifications before release | Manual review bottlenecks, LIMS integration, regulatory variation by market | LIMS results, batch manufacturing records, regulatory limits, historical batch data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews batch validation recommendation and approves/audits action | missing direct dataset |
| quality | supplier_quality_management | Monitor and manage incoming raw material quality from suppliers to prevent production quality failures | Supplier non-disclosure, testing cost and time, limited visibility into sub-suppliers | Incoming QC records, supplier audit reports, specification libraries, field complaint data | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews supplier quality management recommendation and approves/audits action | missing direct dataset |
| quality | consumer_complaint_analysis | Analyze consumer complaint patterns to identify product quality issues and drive improvement | Unstructured text data, batch traceability gaps, volume vs severity trade-offs | CRM complaint logs, batch traceability data, social media mentions, product returns | NLP / Text Classification | Demo in strategy audit: operator reviews consumer complaint analysis recommendation and approves/audits action | missing direct dataset |
| governance | regulatory_compliance_tracking | Monitor product and process compliance against regulatory requirements across all operating markets | Frequent regulatory changes, multi-market complexity, product reformulation costs | Regulatory databases, product specifications, labelling records, market registration data | NLP / Knowledge Graph | Demo in strategy audit: operator reviews regulatory compliance tracking recommendation and approves/audits action | missing direct dataset |
| governance | audit_management | Plan, execute, and track internal and external audits to ensure operational and financial compliance | Resource availability, auditee resistance, finding recurrence, documentation gaps | Audit plans, previous reports, SOPs, risk register, corrective action log | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews audit management recommendation and approves/audits action | missing direct dataset |
| governance | risk_assessment | Identify, quantify, and prioritize enterprise risks across supply chain, operational, and regulatory domains | Subjectivity in risk scoring, emerging risk identification, cross-functional silos | Risk event history, process data, external risk feeds, insurance claims data | Probabilistic Risk Modeling | Demo in strategy audit: operator reviews risk assessment recommendation and approves/audits action | missing direct dataset |
| governance | data_governance | Establish and enforce data quality standards, lineage tracking, and access controls across enterprise data | Organizational resistance, tool fragmentation, lack of data ownership accountability | Data profiling results, catalog metadata, access logs, master data records | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews data governance recommendation and approves/audits action | missing direct dataset |
| governance | esg_reporting | Collect, validate, and report Environmental, Social, and Governance metrics for regulatory and investor disclosure | Data collection from operations, evolving reporting standards (CSRD, SEC), third-party verification | Utility data, logistics emissions, waste records, HR diversity data, governance policies | inferred only; add explicit `ai_mappings.json` row | Demo in strategy audit: operator reviews esg reporting recommendation and approves/audits action | missing direct dataset |

## Gaps And Fix List

- Generate one canonical Mermaid flowchart per seeded process from `backend/seeds/processes.json`; current rich Mermaid coverage is strongest in generated insurance `docs/processes/**` files, not the 53 seeded beverage processes.
- Add explicit `ai_mappings.json` rows for every seeded process; currently only high-priority processes have explicit AI type/use-case mappings.
- Map seeded 11-department processes to the INSUR 19-department reports/demos/dashboard APIs or create a parallel beverage process report/demo/dashboard catalog.
- Add direct real datasets for logistics, manufacturing, maintenance, retail, finance, procurement, quality, and governance, or mark demos as synthetic/insurance-corpus-backed.
- Add generated dashboard inventory JSON so frontend menus can assert every department/process has a dashboard, report, demo, data, and flowchart link.
