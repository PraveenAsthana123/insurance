# Session operator prompts — `/bank` enrichment

> Captured per operator directive "save all the input prompts" + "add them".
> Source: this Claude session 2026-06-04.

## Tabs covered (in order requested)

### 1. Overview tab — 11 sections (Done)
> "demo story for each process, problem explain, impact, AS IS, To Be, roi, kpi,
> value, impact on people, process, profit, revenue ve cost impact, productivity"

Sections shipped (real data + Pending fallback per §57.7):

0. Use-case metadata
1. Demo story (persona / scenario / walkthrough / pitch)
2. Problem assessment + Impact (with severity badges + derived/operator-set flag)
3. AS-IS → TO-BE (side-by-side amber/green)
4. ROI (from `as_is_to_be.roi_estimate` + `cost_analysis.roi_3yr`)
5. KPI — SMART scorecard + dept KPI improvements
6. Value (from `executive_summary`)
7. 4P Impact (People · Process · Profit · Technology — from `readme.ai_strategy`)
8. Revenue vs Cost impact (from `cost_analysis`)
9. Productivity (from `as_is_to_be.deltas`)
10. AI capabilities mapped

### 2. Data tab — 11 sections (Done)
> "data visualization, AS IS data and date cleaning process, missing data,
> data cleaning, data transformation, data visualization, structure,
> unstructured, semi-structured, balance, unbalance, bias, eda,
> feature evaluation, feature selection ...all the process must be addressed"

Sections shipped:

1. Data process flow (Input → Cleaning + transform → Output)
2. Data type classification (structured / semi / unstructured)
3. Missing data + cleaning
4. Data transformation (incl. normalization / standardization / encoding / vectorization)
5. EDA — Exploratory Data Analysis
6. Class balance / imbalance (incl. SMOTE / ADASYN)
7. Bias audit (per §48.8 fairness gates)
8. Feature evaluation (Pearson / MI / Chi-sq / SHAP / VIF)
9. Feature selection (VarianceThreshold / SelectKBest / RFE / Lasso / Boruta)
10. Data visualization — AS-IS vs TO-BE paired plots
11. Source systems + lineage

### 3. Model tab — 10 sections (Done)
> "list of model can be used AI, ML, CV, NL, DL, time series, list of
> hyperparameters, list of accuracy technique, recall, precision, roc curve,
> etc, loss function, gradient descent, batch job, epoch, ensemble model,
> all the model evaluation, model selection, model training, data split,
> input, process, output ...each process of model must be present here ...top 1%"
> "with accuracy, visualization"

Sections shipped:

0. AI capabilities mapped to use case
1. Model families (Classical ML · DL · CV · NLP · TS · RL · GenAI)
2. Data split (train/val/test + CV + stratified + time-series split)
3. Hyperparameters (per family, with tuning method)
4. Loss functions (per task type)
5. Training process (optimizer, gradient descent, batch, epochs, LR, regularization, mixed precision, distributed)
6. Evaluation metrics + accuracy techniques (19 metrics with formulas)
7. Accuracy visualization (paired AS-IS / TO-BE plots)
8. Ensemble methods (8 types incl. Council, Mixture-of-Agents)
9. Model selection (baseline → candidates → tuning → champion)
10. IPO pipeline summary

### 4. Accuracy tab — 6 sections (Done)
> "Must have all the accuracy technique, report, visualization, benchmarking,
> input process, output"

Sections shipped:

0. Input · Process · Output (IPO) for accuracy pipeline
1. AI capabilities scored on this use case
2. Accuracy techniques (19 metrics)
3. Accuracy report (11 sections that get written per release)
4. Accuracy visualization (12 paired plots)
5. Benchmarking (8 baselines — trivial / rules / champion / human / industry / SOTA / vN-1 / cost-adjusted)
6. Pass/fail gates (per §59.4 + §48.8 + §38)

### 5. Manual Process tab — 7 sections (Done, business audience)
> "manual process: input data to model selection to output, visualization,
> transaction history ...how the user going to run end to end flow"
> "Manual process ... was for business team"

Sections shipped:

1. End-to-end flow you run today (6-stage visual flow)
2. Who does what (actors + responsibility + avg time)
3. Step-by-step walkthrough (the demo)
4. What hurts today (pain table with severity)
5. Visualizations + dashboards used (5 surfaces)
6. Transaction history (audit row schema)
7. Output — what gets produced

### 6. Automatic Process tab — 4 sections + 11-phase pipeline (Done)
> "automatic must have each pipeline - data, model, accuracy, training,
> inference, ing, fallback, testing, load, performance, security ...top 1%
> all the pipeline must visible by each phase work completion with score
> and output and end summary result must be present"

Sections shipped:

0. Automatic process summary
1. **11-phase pipeline** (each with score + output):
   1. Data ingestion · 2. Data preparation · 3. Model training · 4. Model evaluation
   5. Inference · 6. Fallback + safety · 7. Testing · 8. Load + performance
   9. Security · 10. Monitoring + drift · 11. Governance + audit
2. AI agent chain (per §64.40 10-layer)
3. Ingestion modes (real-time / streaming / batch / bulk)
4. **End-summary scorecard** (11 dimensions)

### 7. Testing tab — 3 sections (Done, tester audience)
> "Testing tab: for tester ...manual, api, UI, model, data, accuracy,
> output evaluation ...each part of internal"

Sections shipped:

1. Test tiers (12 tiers: manual / API / UI / model / data / accuracy / output-eval / unit / integration / drill / load / security) — each with owner + tool
2. Coverage scorecard for this process
3. Detailed sub-surfaces (12 card grid)

### 8. AI Hub — 3 sections (Done, governance)
> "explain AI, resAI, ethical ai, governance AI, bias AI, performance AI,
> compliance AI, list of AI check ...add them what is required for this process"
> "is this process link with which AI component"

Sections shipped:

1. AI checks required for this process (14 checks: XAI · RAI · Ethical · Governance · Bias/Fairness · Performance · Compliance · Robust · Secure · Portable · Trust · Reasoning · Hallucination · Privacy)
2. AI components this process is linked to (real from `proc.ai[]`)
3. Detailed sub-surfaces (10 card grid)

### 9. Monitor Hub — 6 sections (Done, dashboards + reports)
> "list of dashboard ..with real data ..create each type of graph ...management
> graph, team member graph, each role graph and message summary point"
> "list of report for this process for the role"

Sections shipped:

1. Dashboards — per role (10 roles)
2. Graph types catalog (4 categories per §64.39)
3. Live job feed
4. Reports — per role (10 roles)
5. Message summary — top alerts to share
6. Detailed sub-surfaces (8 card grid)

## First menu / Second menu (Done earlier)

> "blue is main menu" / "I don't see b2c, b2b, b2e under each department"
> "second menu must have process"
> "move the process of each department to next maroon menu as all the process
> which is align with that department under b2b or b2c or b2e"

Layout shipped:

- **Blue first menu**: department-only (expandable to nested B2C/B2B/B2E)
- **Maroon second menu**: dept → domain → process tree
- **Right content**: 14 banking-style tabs

## Remaining work (operator-pending content)

The structure ships; values are mostly Operator-pending (per §57.7 honesty rule).
Operator paste populates each section's actual values.

- AI Strategy enrichment (Blue-Green · First principles · North Star · SWOT · Porter · PESTLE · ROI · KPI · Value realization · DT analysis 4P · cost-benefit · break-even)
- FinOps (cost calc + services + recommendations + impl cost + savings)
- Real dashboard data wiring (operator fills `proc.dashboards` + `proc.reports`)

## Standards referenced (global §)

§14 frontend · §38 governance + audit · §40 decision system · §42 autonomy
§43 drills · §47 architecture · §48 explainability + fairness · §51 forensic substrate
§54 no Co-Authored-By · §57 production-grade · §59.4 ORF metrics · §62 checklist
§64 per-dept artifacts · §64.7 before/after viz · §64.19 data-prep stack
§64.21 XAI · §64.30 12-tier testing · §64.39 chart vocabulary
§64.40 10-layer agentic stack · §73 17-tab right pane · §73.3a referential integrity
