# Autonomous AI Department Operating Model

Date: 2026-06-08

## Purpose

This document defines how autonomous AI should operate for each seeded department in the project. It is a governed operating model, not permission for unrestricted production automation.

Source documents: `docs/GOVERNANCE_INDEX.md`, `docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md`, `docs/APPROVAL_GOVERNANCE.md`, `docs/DEPARTMENT_AI_STRATEGY_PROCESS_AUDIT_2026-06-08.md`, `backend/seeds/departments.json`, and `backend/seeds/processes.json`.

## Autonomy Levels

- `L0`: human-only; AI documents context
- `L1`: AI monitors and explains; no workflow action
- `L2`: AI recommends and drafts; human approves execution
- `L3`: AI executes safe internal low-risk workflow steps with audit; human approves high-risk or external actions
- `L4`: AI executes bounded production actions with policy, rollback, and post-audit; not default in this repo
- `L5`: full autonomous business control; explicitly forbidden for this repo

Default target for this repo is `L2` or `L3`. `L4` requires production controls not currently wired end-to-end. `L5` is forbidden.

## Global Guardrails

- Safe repo-local work, local reports, local tests, dry-run analysis, and internal recommendations can run autonomously.
- Production writes, destructive commands, dependency downloads, credentials, external SaaS writes, real browser/CUA side effects, customer/supplier/regulator notifications, payments, purchase orders, journal entries, pricing publication, recalls, filings, and policy changes require hard approval gates.
- Every autonomous run must emit: task id, department, process, agent id, input hash, output hash, evidence, decision, approval status, correlation id, and report path.
- P0/P1 recommendations must route to council/human review before execution.
- All department agents must support retry limits, dead-letter handling, audit logging, model/RAG evaluation, and supervisor reporting.

## Machine-Readable Catalog

```text
docs/AUTONOMOUS_AI_DEPARTMENT_AUTONOMY_CATALOG.json
```

## Department Autonomy Summary

| Department | Level | Primary Agents | Safe Autonomous Scope | Approval Boundary | Real Data |
|---|---|---|---|---|---|
| Sales & Demand Planning (`sales`) | `L3` | `demand-sensing-agent`, `forecast-explanation-agent`, `promo-roi-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | recommend and auto-refresh forecasts; human approval for committed S&OP forecast, promo budget, or customer/channel commitments | direct local dataset present |
| Supply Chain & Inventory (`supply-chain`) | `L3` | `inventory-policy-agent`, `replenishment-agent`, `supplier-risk-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | recommend reorder, transfer, and safety-stock changes; human approval for purchase orders, supplier changes, or inventory policy publication | direct local dataset present |
| Logistics & Transportation (`logistics`) | `L3` | `route-optimization-agent`, `eta-exception-agent`, `freight-cost-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | recommend routes, ETAs, carrier assignments; human approval for customer notifications, carrier booking, or penalty-impacting changes | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Manufacturing / Production (`manufacturing`) | `L2` | `production-scheduler-agent`, `batch-sequencing-agent`, `yield-optimization-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | simulate schedules, constraints, capacity/yield plans; human approval for shop-floor schedule publication or machine setpoint changes | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Maintenance (`maintenance`) | `L3` | `equipment-monitoring-agent`, `predictive-maintenance-agent`, `work-order-triage-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | detect anomalies and create draft work orders; human approval for downtime windows, safety-critical maintenance, or spare-part spend | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Retail & Merchandising (`retail`) | `L2` | `shelf-optimization-agent`, `assortment-agent`, `pricing-test-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | recommend assortment, shelf, and price tests; human approval for external retailer negotiation or price publication | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Customer Analytics / Marketing (`customer`) | `L2` | `segmentation-agent`, `churn-agent`, `clv-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | score churn/CLV and draft next-best actions; human approval for outbound customer communication and offer spend | direct local dataset present |
| Finance (`finance`) | `L2` | `revenue-forecast-agent`, `profitability-agent`, `trade-spend-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | produce forecasts, variance explanations, and anomaly queues; human approval for journal entries, payments, budgets, or external reporting | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Procurement / Supplier Management (`procurement`) | `L2` | `supplier-selection-agent`, `contract-intelligence-agent`, `vendor-performance-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | score suppliers, contracts, risk, and commodity exposure; human approval for awards, contract terms, hedges, or supplier removal | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Quality Control (`quality`) | `L3` | `vision-defect-agent`, `batch-validation-agent`, `supplier-quality-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | detect defects, complaints, and batch risk; human approval for release/hold/recall/CAPA closure decisions | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |
| Governance / Compliance (`governance`) | `L2` | `regulatory-rag-agent`, `audit-evidence-agent`, `risk-simulation-agent` | monitor inputs and freshness; score/rank exceptions; generate recommendation with evidence; simulate before/after impact | monitor regulations, risks, controls, evidence, and policy gaps; human approval for official filings, policy changes, or risk acceptance | no direct local real dataset mapped; synthetic/insurance corpus or connector needed |

## Department Deep Dive

### Sales & Demand Planning (`sales`)

- Recommended autonomy: `L3`
- Approval boundary: recommend and auto-refresh forecasts; human approval for committed S&OP forecast, promo budget, or customer/channel commitments
- Processes covered: `baseline_forecasting`, `promo_uplift`, `seasonal_planning`, `channel_demand`, `new_product_forecast`, `forecast_reconciliation`, `exception_management`, `demand_sensing`, `reporting`, `forecast_explanation`
- Primary agents: `demand-sensing-agent`, `forecast-explanation-agent`, `promo-roi-agent`, `sop-council-review-agent`
- Trigger events: new POS data, forecast error breach, promo calendar change, stockout signal
- Real data: direct local dataset present
- Local data paths: `data/kaggle/rossmann/train.csv`, `data/kaggle/rossmann/store.csv`, `data/kaggle/rossmann/test.csv`

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, forecast API, Rossmann sales dataset, SHAP/forecast explanation, MLflow target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- forecast bias creates excess inventory or stockouts
- promo ROI overstatement
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Supply Chain & Inventory (`supply-chain`)

- Recommended autonomy: `L3`
- Approval boundary: recommend reorder, transfer, and safety-stock changes; human approval for purchase orders, supplier changes, or inventory policy publication
- Processes covered: `inventory_optimization`, `replenishment_planning`, `stock_balancing`, `supplier_lead_time_prediction`, `network_design`
- Primary agents: `inventory-policy-agent`, `replenishment-agent`, `supplier-risk-agent`, `network-simulation-agent`
- Trigger events: inventory threshold breach, lead-time drift, demand forecast update, supplier risk alert
- Real data: direct local dataset present
- Local data paths: `data/kaggle/supply-chain/supply_chain_data.csv`

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, inventory optimizer, supply-chain CSV, simulation engine, ERP/WMS target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- unapproved purchase order or excess working capital
- supplier concentration blind spot
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Logistics & Transportation (`logistics`)

- Recommended autonomy: `L3`
- Approval boundary: recommend routes, ETAs, carrier assignments; human approval for customer notifications, carrier booking, or penalty-impacting changes
- Processes covered: `route_optimization`, `shipment_scheduling`, `delivery_tracking`, `freight_cost_optimization`
- Primary agents: `route-optimization-agent`, `eta-exception-agent`, `freight-cost-agent`, `carrier-performance-agent`
- Trigger events: new shipment, GPS delay, carrier EDI event, weather disruption
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, OR-Tools target, carrier API target, map/GPS target, ETA model | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- wrong ETA/customer notification
- carrier commitment without authorization
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Manufacturing / Production (`manufacturing`)

- Recommended autonomy: `L2`
- Approval boundary: simulate schedules, constraints, capacity/yield plans; human approval for shop-floor schedule publication or machine setpoint changes
- Processes covered: `production_planning`, `batch_scheduling`, `yield_optimization`, `capacity_planning`
- Primary agents: `production-scheduler-agent`, `batch-sequencing-agent`, `yield-optimization-agent`, `capacity-simulation-agent`
- Trigger events: new demand plan, material shortage, line constraint change, yield anomaly
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, constraint optimizer target, MES/ERP target, capacity simulator, yield model | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- unsafe schedule or machine setting
- constraint violation on allergens/regulatory hold
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Maintenance (`maintenance`)

- Recommended autonomy: `L3`
- Approval boundary: detect anomalies and create draft work orders; human approval for downtime windows, safety-critical maintenance, or spare-part spend
- Processes covered: `predictive_maintenance`, `equipment_monitoring`, `maintenance_scheduling`, `spare_parts_optimization`
- Primary agents: `equipment-monitoring-agent`, `predictive-maintenance-agent`, `work-order-triage-agent`, `spare-parts-agent`
- Trigger events: sensor anomaly, failure probability threshold, PM due date, spare-part shortage
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, IoT/SCADA target, anomaly detector, work-order system target, survival model | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- missed safety-critical failure
- unplanned downtime from poor scheduling
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Retail & Merchandising (`retail`)

- Recommended autonomy: `L2`
- Approval boundary: recommend assortment, shelf, and price tests; human approval for external retailer negotiation or price publication
- Processes covered: `shelf_optimization`, `product_assortment`, `store_analytics`, `pricing_optimization`
- Primary agents: `shelf-optimization-agent`, `assortment-agent`, `pricing-test-agent`, `store-analytics-agent`
- Trigger events: store sales drift, OOS alert, price change candidate, planogram variance
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, planogram/shelf data target, price elasticity model, CV shelf target, A/B test tracker | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- wrong price or retailer-facing change
- planogram noncompliance
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Customer Analytics / Marketing (`customer`)

- Recommended autonomy: `L2`
- Approval boundary: score churn/CLV and draft next-best actions; human approval for outbound customer communication and offer spend
- Processes covered: `customer_segmentation`, `churn_prediction`, `clv_prediction`, `personalization`, `campaign_effectiveness`
- Primary agents: `segmentation-agent`, `churn-agent`, `clv-agent`, `personalization-agent`, `campaign-effectiveness-agent`
- Trigger events: churn score refresh, campaign response, complaint trend, consent status change
- Real data: direct local dataset present
- Local data paths: `data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv`

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, Telco churn dataset, segmentation model, next-best-action target, consent guardrail | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- privacy/consent breach
- unfair or toxic personalization
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Finance (`finance`)

- Recommended autonomy: `L2`
- Approval boundary: produce forecasts, variance explanations, and anomaly queues; human approval for journal entries, payments, budgets, or external reporting
- Processes covered: `revenue_forecasting`, `profitability_analysis`, `trade_spend_management`, `cashflow_forecasting`
- Primary agents: `revenue-forecast-agent`, `profitability-agent`, `trade-spend-agent`, `cashflow-agent`
- Trigger events: month-end close event, variance threshold, deduction exception, cash position change
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, forecast model, variance analyzer, deduction classifier, ERP/GL target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- incorrect external number or journal entry
- payment/deduction error
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Procurement / Supplier Management (`procurement`)

- Recommended autonomy: `L2`
- Approval boundary: score suppliers, contracts, risk, and commodity exposure; human approval for awards, contract terms, hedges, or supplier removal
- Processes covered: `supplier_selection`, `contract_management`, `vendor_performance`, `commodity_price_forecasting`
- Primary agents: `supplier-selection-agent`, `contract-intelligence-agent`, `vendor-performance-agent`, `commodity-forecast-agent`
- Trigger events: supplier score change, contract expiry, commodity price move, PO exception
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, supplier scorecard, contract RAG, commodity forecast, risk feed target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- supplier award bias
- contract or hedge risk
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Quality Control (`quality`)

- Recommended autonomy: `L3`
- Approval boundary: detect defects, complaints, and batch risk; human approval for release/hold/recall/CAPA closure decisions
- Processes covered: `defect_detection`, `batch_validation`, `supplier_quality_management`, `consumer_complaint_analysis`
- Primary agents: `vision-defect-agent`, `batch-validation-agent`, `supplier-quality-agent`, `complaint-intelligence-agent`
- Trigger events: vision defect signal, batch lab result, complaint cluster, supplier quality breach
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, CV inspection target, LIMS target, complaint NLP, CAPA workflow target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- false release/hold decision
- missed defect/recall signal
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

### Governance / Compliance (`governance`)

- Recommended autonomy: `L2`
- Approval boundary: monitor regulations, risks, controls, evidence, and policy gaps; human approval for official filings, policy changes, or risk acceptance
- Processes covered: `regulatory_compliance_tracking`, `audit_management`, `risk_assessment`, `data_governance`, `esg_reporting`
- Primary agents: `regulatory-rag-agent`, `audit-evidence-agent`, `risk-simulation-agent`, `data-governance-agent`, `esg-reporting-agent`
- Trigger events: new regulation, audit request, risk score breach, data quality or access violation
- Real data: no direct local real dataset mapped; synthetic/insurance corpus or connector needed

| Allowed Autonomous Action | Required Control |
|---|---|
| monitor inputs and freshness | audit row, evidence link, idempotency key, supervisor report |
| score/rank exceptions | audit row, evidence link, idempotency key, supervisor report |
| generate recommendation with evidence | audit row, evidence link, idempotency key, supervisor report |
| simulate before/after impact | audit row, evidence link, idempotency key, supervisor report |
| draft report or work item | audit row, evidence link, idempotency key, supervisor report |
| submit P0/P1 decisions to council/human review | audit row, evidence link, idempotency key, supervisor report |

| Forbidden Without Approval | Why |
|---|---|
| production write without approval | high business, security, legal, financial, or external-impact risk |
| external customer/supplier/regulator notification without approval | high business, security, legal, financial, or external-impact risk |
| payment, PO, journal, price, recall, policy, or filing commitment without approval | high business, security, legal, financial, or external-impact risk |
| credential or secret access outside approved connector scope | high business, security, legal, financial, or external-impact risk |
| destructive command, production deploy, or external SaaS write without hard gate | high business, security, legal, financial, or external-impact risk |

| Tools/Data | Monitoring And Tests |
|---|---|
| OpenClaw task queue, Paperclip context pack, Redis/agent supervisor, RAG/context retrieval, audit log, testing report, policy RAG, knowledge graph target, OPA/Conftest target, evidence vault target | default project doctor, agent task contract, RBAC/tenant isolation, idempotency, audit trail, human approval gate, model/RAG evals, dead-letter/retry behavior |

Risk controls:
- incorrect regulatory interpretation
- unauthorized risk acceptance
- bad recommendation accepted without review
- data drift
- stale context
- missing audit evidence
- tenant/PII leakage

## Autonomous Run Flow

```text
event/input -> classify department/process -> validate tenant/RBAC/idempotency -> retrieve context/data -> run specialist agent -> verify output -> simulate impact -> write audit/report -> if low-risk internal action execute -> if P0/P1 or external/high-risk route to council/human approval -> monitor outcome
```

## Implementation Backlog

1. Add explicit `ai_mappings.json` rows for the 23 seeded processes that are still inferred only.
2. Generate one autonomous-agent prompt/contract per department and one test fixture per process.
3. Add dead-letter/retry tests for agent queues and per-department autonomous tasks.
4. Add real datasets or connectors for logistics, manufacturing, maintenance, retail, finance, procurement, quality, and governance.
5. Add dashboards that show autonomy level, last autonomous run, pending approvals, blocked actions, ROI estimate, and test status per department.
6. Add report generation under `jobs/reports/autonomous-ai/` with Markdown and JSON outputs.
