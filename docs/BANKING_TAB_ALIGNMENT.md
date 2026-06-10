# Banking Workspace Tab Alignment

This document is the current UI alignment standard for the banking-style process workspace.

Code source of truth:

- `frontend/src/pages/bank/BankUseCasePage.jsx` owns the horizontal workspace tabs, active sub-tab row, and workspace body rendering.
- `frontend/src/pages/bank/tabs/BankTabs.jsx` owns shared tab content components and reusable footer/audit widgets.
- Runtime data comes from `data/insurance/blueprint.json`, served in dev through `/insurance-blueprint`.

Route:

```text
/bank/dept/:deptId/:domain/:processId
```

## Navigation Depth Rule

Keep the workspace depth to exactly:

```text
Workspace Tab -> Workspace Sub-Tab -> Components
```

Do not create deeper navigation such as:

```text
Data -> Quality -> Completeness -> Missing Values -> Rules
```

## Layout Rule

Workspace tabs are always:

- horizontal
- top-aligned in the workspace
- single-row with horizontal overflow if needed
- separate from the blue business menu and maroon asset navigator

Final workspace structure:

```text
Context row
Workspace tabs row
Workspace sub-tabs row, only when active tab has sub-tabs
Component body
Universal tab footer widgets
```

## Panels

| Level | Example | Owner |
|---|---|---|
| Main menu | Claims / Underwriting / Finance | Blue department menu |
| Asset navigator | Department -> B2C/B2B/B2E -> Process | Maroon second menu |
| Workspace tab | Data | `BankUseCasePage.jsx` top tabs |
| Workspace sub-tab | Quality | `BankUseCasePage.jsx` sub-tab row |
| Components | Missing Values, Duplicates, Outliers | Workspace body renderers |

## Workspace Tabs

| Order | Tab ID | Label | Sub-tabs | Renderer |
|---:|---|---|---|---|
| 1 | `overview` | Overview | None | `OverviewTab` from `BankTabs.jsx` |
| 2 | `process` | Process | Workflow, Manual Execution, Automatic Execution, Pipeline Status, Approvals, History | `renderProcessSubTab` |
| 3 | `data` | Data | Data Sources, Discovery, Quality, Preparation, Master Data, Metadata, Lineage, Security, Monitoring | `renderDataSubTab` |
| 4 | `analytics` | Analytics | EDA, Feature Engineering, Evaluation, Explainability | `renderAnalyticsSubTab` |
| 5 | `ai` | AI | Capabilities, Models, Agents, Experiments, Registry | `renderAISubTab` |
| 6 | `testing` | Testing | None | `TestingHub` from `BankTabs.jsx` |
| 7 | `operations` | Operations | Monitoring, Jobs, Incidents, Alerts, Deployment, Rollback, Logs, Observability, SLA | `renderOperationsSubTab` |
| 8 | `governance` | Governance | Security, Compliance, Risk, Audit, Responsible AI, Explainable AI, Policies, Approvals, Controls, Data Privacy, Model Risk | `renderGovernanceSubTab` |
| 9 | `reports` | Reports | Executive, Business, Technical, Financial, Compliance, Audit | `renderReportsSubTab` |

## Data Tab Standard

`Data` is the largest workspace area and must use sub-tabs. Do not put all data functions in one flat page.

| Data Sub-tab | Components / Visuals |
|---|---|
| Data Sources | Internal Systems, External Systems, Files, APIs, Streaming Sources, Databases, Data Lake, Data Warehouse, Source Inventory, Connection Status, Refresh Frequency, Owner |
| Discovery | Dataset Registry, Schema Explorer, Catalog, Dictionary, Column Statistics, Dataset List, Schema Tree, Column Profile, Business Glossary |
| Quality | Completeness, Accuracy, Consistency, Validity, Uniqueness, Timeliness, Quality Score, Missing Values, Duplicate Analysis, Outlier Analysis, Quality Trend |
| Preparation | Cleaning, Transformation, Sampling, Balancing, Feature Preparation, Missing Value Handling, Duplicate Removal, Outlier Treatment, Standardization, Encoding, Normalization, Scaling, Aggregation, Derived Columns, SMOTE, Oversampling, Undersampling, Class Distribution |
| Master Data | Customer, Product, Organization, Pricing, Tax, Policy, Claim, Broker, Vendor, Employee; each object has Overview, Relationships, Quality, Ownership, History, Usage |
| Metadata | Business Metadata, Technical Metadata, Operational Metadata, Owner, Steward, Retention, Sensitivity, Classification |
| Lineage | Source System, Transformation, Target System, Dependencies, Data Flow, Source -> Raw -> Clean -> Feature Store -> Model |
| Security | PII, PHI, Masking, Encryption, Access Control, Data Sharing |
| Monitoring | Freshness, Schema Drift, Data Drift, Quality Drift, Pipeline Health, Alerts |

## Process Tab Standard

| Process Sub-tab | Components |
|---|---|
| Workflow | Trigger, Decide, Act, Persist, Audit, Hand-off, Step list, Decision branches, Loops + retries, SLA per step, Owner per step |
| Manual Execution | Dataset Selection, Feature Selection, Model Selection, Hyperparameter Selection, Loss Function Selection, Optimizer Selection, Epoch, Batch Size, Threshold, Run Step, Pause, Rollback, Reset |
| Automatic Execution | Dataset Selection, Target Variable, Business Goal, Run Full Pipeline, AI workflow, HITL, scope grants |
| Pipeline Status | Current Stage, Success Rate, Errors, Warnings, Runtime, Progress Bar, 11-phase pipeline status |
| Approvals | Requested by, Confidence tier, Auto-approve, Reviewer queue, Reject + audit, confidence tiers |
| History | Run ID, Status, Operator, Duration, Cost, Audit row link, Replay button |

## Analytics Tab Standard

| Analytics Sub-tab | Components |
|---|---|
| EDA | Distribution Analysis, Correlation Matrix, Outlier Detection, Trend Analysis, Clustering, Segmentation, Insights, Histogram, Box plot, Violin plot, Heatmap |
| Feature Engineering | Feature Creation, Feature Selection, Feature Ranking, Normalization, Encoding, PCA, SHAP Feature Importance, Feature catalog |
| Evaluation | Accuracy, Precision, Recall, F1, ROC AUC, PR AUC, MCC, Log Loss, Calibration, Confusion Matrix, ROC Curve, Precision Recall Curve |
| Explainability | SHAP, LIME, Counterfactual Analysis, Decision Path, Feature Importance, Citation Trail |

## AI Tab Standard

| AI Sub-tab | Components |
|---|---|
| Capabilities | AI type catalog, per-process AI mapping, coverage matrix, hand-off contracts |
| Models | Model name, family, framework, version, status, hyperparameters, lifecycle |
| Agents | Agent name, role, model backing, tools, owner, health, cost, performance, memory, tool-call audit, scope grants |
| Experiments | Experiment ID, params, data version, metric, status, author, sweep results |
| Registry | Model versions, prompt versions, active model/prompt, sign-off, audit trail, rollback target |

## Operations Tab Standard

| Operations Sub-tab | Components |
|---|---|
| Monitoring | Live metric panel, latency p50/p95/p99, throughput, error rate, tenant breakdown |
| Jobs | Job ID, cadence, last run, duration, status, owner |
| Incidents | Daily issues, weekly rollup, 4-weekly trend, monthly report, severity matrix, live feed |
| Alerts | Alert rule, threshold, channel, on-call rotation, silence |
| Deployment | Pipeline status, canary %, blue/green, promotion gate, last deploy |
| Rollback | Rollback target, reason, trigger, audit row, verification |
| Logs | Live tail, search, request_id filter, tenant filter, severity filter |
| Observability | Logs, traces, metrics, tab render events, sub-tab changes, API call events, error events |
| SLA | Latency p95, availability, error rate, cost/call, SLA met percentage |

## Governance Tab Standard

| Governance Sub-tab | Components |
|---|---|
| Security | Threat counts, pen-test results, CVE backlog, secrets rotation, access review, vulnerability tracker |
| Compliance | EU AI Act, NIST AI RMF, ISO 42001, SOC 2, GDPR, HIPAA, NAIC, Lloyds |
| Risk | Risk register, likelihood, impact, owner, mitigation, status |
| Audit | Audit timeline, request_id, time, actor, action, outcome, latency, audit row link |
| Responsible AI | Disparate Impact, Equal Opportunity gap, per-group calibration, bias audit, privacy, audit fields |
| Explainable AI | SHAP global, SHAP per-prediction, counterfactual, citation trail, reasoning trace |
| Policies | Prompt versioning, model registry pin, source allowlist, tenant isolation, cost ceiling, output redaction |
| Approvals | Pending HITL, approver, SLA, reason, decision, audit row |
| Controls | SOC2 control mappings |
| Data Privacy | PII inventory, consent record, retention, right to be forgotten, DSAR queue |
| Model Risk | Model card, drift score, override rate, audit-row volume, quarterly review |

## Reports Tab Standard

| Reports Sub-tab | Components |
|---|---|
| Executive | Headline, value today, value target, stakeholder ask, risk summary, KPI dashboard, sign-off, PDF/Excel export |
| Business | Persona, scenario, KPI movement, per-domain breakdown, recommendation |
| Technical | Architecture, data flow, API contracts, DB schema, test coverage, deployment |
| Financial | Build cost, run cost, savings, 3-year ROI, break-even months, cost per call |
| Compliance | EU AI Act status, NIST RMF status, ISO 42001 status, SOC2 status, audit findings, remediation plan |
| Audit | Audit period, findings, evidence, auditor, sign-off date, next audit |

## Universal Footer Widgets

Every workspace tab/sub-tab body appends:

| Component | Purpose |
|---|---|
| `TabTimestamp` | Render timestamp for the current tab/sub-tab. |
| `TabDatabaseOps` | Database table, operation list, input/process/output, audit/cache contract. |
| `TabTransactionHistory` | Placeholder audit-row transaction history. |
| `TabTodoByRole` | Role-based to-do list. |
| `HitlFeedback` | Human feedback capture for improving tab output, model, bot, data, and pipeline behavior. |
