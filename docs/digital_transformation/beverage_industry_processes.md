# Beverage Industry — Required Processes (Canadian CPG context)

> **Industry:** Beverage (non-alcoholic + alcoholic + functional + dairy)
> · **Jurisdiction:** Canada · **Project:** INSUR/insur
>
> The **process catalog** for the insurerage CPG industry. Companion to
> [`canada_cpg_2026.md`](canada_cpg_2026.md) (the DT checklist).
>
> | This doc answers | The DT checklist answers |
> |---|---|
> | *"Which industry processes exist + who owns them?"* | *"Is the digital transformation complete across 12 domains?"* |
>
> Healthcare processes are addressed separately in
> [`healthcare_industry_processes.md`](healthcare_industry_processes.md).

## Why this catalog

INSUR/insur is a Canadian insurerage analytics platform. Every dept feature,
every AI use case, every dashboard ultimately serves one or more of the
processes below. A team that builds a "demand forecast" without naming
WHICH process it feeds + WHICH KPI it moves is shipping a model with
no operational anchor. This catalog is the anchor.

## At-a-glance — the 14 process families

| # | Process Family | Primary owner dept (per §63 + §66) | Core question |
|---|---|---|---|
| 1 | [Source Water & Ingredient Sourcing](#1-source-water--ingredient-sourcing) | Procurement | Where does every input come from + at what cost + at what quality? |
| 2 | [Procurement & Supplier Management](#2-procurement--supplier-management) | Procurement | Are suppliers qualified, contracted, and on-time? |
| 3 | [Recipe / Formulation Management](#3-recipe--formulation-management) | Engineering / R&D | Is the master recipe versioned + auditable? |
| 4 | [Batching & Blending](#4-batching--blending) | Operations (Plant) | Did this batch hit spec + how do we know? |
| 5 | [Bottling / Canning / Packaging](#5-bottling--canning--packaging) | Operations (Plant) | Did fill-level + cap + label + carton pass QC? |
| 6 | [Quality Assurance (Lab + Vision)](#6-quality-assurance-lab--vision) | Operations + Engineering | Is QC closing the loop on every batch + every line? |
| 7 | [Warehousing & Inventory](#7-warehousing--inventory) | Supply Chain | Where is every SKU + lot + pallet, right now? |
| 8 | [Logistics & Distribution](#8-logistics--distribution) | Supply Chain | Is the cold chain intact + are retailer deliveries on-time? |
| 9 | [Sales — Retailer Account Management](#9-sales--retailer-account-management) | Sales | Is the lift / share / margin trending right per retailer × SKU? |
| 10 | [Trade Promotion Management (TPM)](#10-trade-promotion-management-tpm) | Sales / Marketing | Are promotions ROI-positive per retailer × SKU × period? |
| 11 | [Demand Planning / S&OP](#11-demand-planning--sop) | Supply Chain + Sales | Does demand forecast match plant capacity × retailer commitments? |
| 12 | [Marketing & Brand](#12-marketing--brand) | Marketing | Are campaigns lifting awareness, intent, and consumption? |
| 13 | [Customer Engagement & Loyalty](#13-customer-engagement--loyalty) | Customer Experience | Are direct-to-consumer relationships growing + measurable? |
| 14 | [Recall, Traceability & Compliance Ops](#14-recall-traceability--compliance-ops) | Quality + Legal | Can we trace 1 case to lot in ≤ 30 min + execute a recall in ≤ 24 h? |

Plus 4 cross-cutting families covered separately:

- **Finance** (trade settlement, retailer billing, margin) — per §66 Finance dept
- **HR / Plant Workforce** — per §66 HR dept
- **IT / OT** — per §63 cross-cutting (not a insurerage-specific process)
- **Sustainability / ESG** — per `canada_cpg_2026.md` §12

---

## 1. Source Water & Ingredient Sourcing

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Water source qualification** | Validate municipal / well / spring source | Anomaly detection on TDS / conductivity / microbial | **CFIA** + **Health Canada water quality** | Water-test pass rate |
| **Ingredient sourcing (sugar, syrup, juice, flavour, additives)** | Multi-supplier strategy + qualification | Demand-aligned reorder forecasting | **CFIA SFCR** + supplier certifications | Stock-out rate / cost-per-litre |
| **Allergen + organic + Halal/Kosher certifications** | Certify per regulatory + brand claim | Certification expiry tracking | **CFIA labelling** + audit standards | Certification compliance |

**Owner dept:** Procurement
**Composes with:** framework 105 Auditable (lineage of every input lot) · ml_methodology Phase 2 (data acquisition for supplier scoring).

---

## 2. Procurement & Supplier Management

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Supplier onboarding + qualification** | KYC + certifications + audit + sample testing | Document-classification + risk scoring | **CFIA + Health Canada food safety** | Time-to-onboard |
| **Contract + price management** | Negotiate + index + clauses | Price-trend forecasting + risk alert | Competition Bureau + procurement policy | Cost-vs-index gap |
| **Order + receive + 3-way match** | PO → ASN → receipt → invoice match | RPA + invoice-OCR + auto-3-way-match | Internal audit + SOX-equivalent | Match-rate / cycle-time |
| **Supplier performance scorecard** | OTIF + quality + cost + sustainability | Composite supplier score | Continuous improvement | Supplier score |

**Owner dept:** Procurement
**Composes with:** framework 104 Accountable · §47.5 JAD chain for supplier-strategy decisions.

---

## 3. Recipe / Formulation Management

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Master recipe registry** | Versioned recipes per SKU × market | Recipe-diff visualization + impact analysis | **CFIA** + **Health Canada nutrition labelling** | Recipe-version compliance |
| **Recipe → label nutrition reconciliation** | Calc nutrition + allergens + claims | Auto-generated label spec from recipe | **CFIA Nutrition Facts Tables** | Label-recipe drift = 0 |
| **R&D / new-product development** | Concept → bench → pilot → launch | Predictive consumer-acceptance models | Internal stage-gate | Time-to-market |
| **Recipe IP protection** | Trade-secret + change control | Access-audit trail | Internal + Competition Bureau | IP-leak incidents = 0 |

**Owner dept:** Engineering / R&D
**Composes with:** framework 105 Auditable + framework 111 Portability (recipe portable across plants).

---

## 4. Batching & Blending

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Batch scheduling** | Plant scheduler builds batch sequence | Constraint-optimization scheduler | ISA-88 batch standard | Schedule adherence |
| **Ingredient dispense** | Auto-dispense per recipe | Closed-loop dispense + IoT verification | Batch record + traceability | Dispense accuracy |
| **Blending + holding** | Mix + carbonate + hold | Soft-sensor for blend uniformity | Process safety | Blend variance |
| **Batch release decision** | Lab + visual + spec → release | AI-assisted release recommendation | **CFIA** + internal QC | Time-to-release |

**Owner dept:** Operations (Plant)
**Composes with:** framework 101 Reliable (plant control loop) · ml_methodology Phase 11 (production deployment of plant AI).

---

## 5. Bottling / Canning / Packaging

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Bottle / can supply** | Empty supply + inspection | Vision QA on empty bottles (chips / contamination) | **CFIA SFCR** packaging integrity | Defect rate |
| **Fill** | Precise fill to volume × tolerance | Closed-loop fill control + vision verification | Net-content compliance (Weights & Measures Act) | Fill accuracy |
| **Capping / sealing** | Apply cap / cork / lid + torque | Vision torque + tilt detection | Tamper-evidence requirements | Seal-defect rate |
| **Labelling** | Apply primary + secondary label | Vision label-presence + alignment + correct-SKU | **CFIA labelling** + **provincial liquor (if applicable)** + **Quebec Bill 96 (French)** | Label-accuracy rate |
| **Coding / variable print** | Lot code + best-before + barcode | Vision OCR verification | **CFIA + GS1 + 2D DataMatrix** | Code-readability rate |
| **Secondary packaging (cases, trays, shrink)** | Build secondary + palletize | Vision pattern verification + robotic palletizing | OH&S | Palletization throughput |

**Owner dept:** Operations (Plant)
**Composes with:** framework 103 Safe (line safety) · framework 109 Responsible GenAI (vision system explainability) · §64.6 before/after preprocessing viz for vision-QA training.

---

## 6. Quality Assurance (Lab + Vision)

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Incoming raw-material testing** | Sample + test + accept/reject | Lab-result anomaly detection + supplier alert | **CFIA + Health Canada** | Incoming-reject rate |
| **In-process QC** | Periodic + continuous sampling | Soft-sensor + predictive QC | HACCP + preventive controls | First-pass yield |
| **Finished-good QC** | Lab + visual + sensory | Composite QC score + release predictor | **CFIA finished-good standards** | Release time |
| **Vision-QA on line** | Real-time bottle / fill / cap / label vision | CNN inspection model (per ml_methodology Phase 7) | CFIA labelling + tamper-evidence | False-reject + false-accept rates |
| **Sensory panel + consumer testing** | Trained panel + consumer tests | NLP on consumer comments + drift detection | Internal sensory protocols | Sensory consistency |

**Owner dept:** Operations + Engineering
**Composes with:** framework 102 Trustworthy (vision-QA explainability) · framework 109 Responsible GenAI (if generative QC reports) · `../ai_assurance/reliability_matrix.md` (vision-QA reliability across shifts).

---

## 7. Warehousing & Inventory

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Putaway + slotting** | Optimal slot per SKU × velocity | Slotting optimizer | WMS standard | Pick efficiency |
| **Cycle count + inventory accuracy** | Periodic count + reconciliation | Computer-vision cycle count + anomaly | Internal audit | Inventory accuracy |
| **Lot + best-before management** | FEFO (first-expire-first-out) | Auto-FEFO picker recommendations | **CFIA traceability** | Aged-stock % |
| **Returns + write-off management** | Damaged / expired / recall returns | Returns-cause classification | Internal + insurance | Return rate |

**Owner dept:** Supply Chain
**Composes with:** framework 106 Lifecycle (model lifecycle for slotting model) · §64.23 anomaly detection pipeline.

---

## 8. Logistics & Distribution

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Route + load planning** | Optimal route + truck fill | Route optimizer + dynamic re-route | Transport regulations + driver hours | OTIF |
| **Cold chain monitoring** | Temperature integrity en route | IoT + breach detection + auto-alert | **CFIA cold chain for cold-fill insurerages** | Cold-chain breach rate |
| **Retailer delivery + proof-of-delivery** | EDI 940/945 + signature | Auto-POD + exception triage | EDI X12 + retailer SLA | OTIF + claims |
| **Reverse logistics** | Returns / recalls / pallets | Reverse-flow optimization | Recall regulations | Reverse cycle time |

**Owner dept:** Supply Chain
**Composes with:** framework 101 Reliable (cold-chain telemetry) · framework 107 Monitoring (drift in route patterns).

---

## 9. Sales — Retailer Account Management

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Account planning** | Joint business plans per retailer | Lift + share + margin forecasting per retailer × SKU | Competition Bureau | Plan adherence |
| **Order management** | EDI 850/855 + EDI 856 ASN | Auto-order-correction + anomaly | Retailer SLA + EDI X12 | Order accuracy |
| **In-store execution (DSD / distributor)** | Shelf presence + facings + OOS | Vision-based shelf-audit (mobile / robot) | Retailer guidelines | Shelf compliance |
| **Sales reporting (sell-through)** | Receive retailer sales-out data | Sales-out forecasting + alerts | Retailer NDA | Sell-through visibility |

**Owner dept:** Sales
**Composes with:** framework 102 Trustworthy (forecast calibration) · framework 109 Responsible GenAI (commercial AI guardrails) · framework 104 Accountable (retailer-data agreements).

---

## 10. Trade Promotion Management (TPM)

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Promo planning** | What / when / where / depth | Promo-ROI optimizer + scenario simulator | Competition Bureau (pricing) | Plan ROI |
| **Promo execution + tracking** | Activate at retailer | Real-time execution monitor | Internal + retailer | Execution compliance |
| **Promo settlement** | Reconcile deduction + invoice | RPA + ML deduction classification | Financial control | Deduction-resolution time |
| **Promo post-evaluation** | Lift + cannibalization + halo | Causal-inference attribution | Internal | Promo-lift accuracy |

**Owner dept:** Sales + Marketing
**Composes with:** framework 103 Safe (avoid anti-competitive pricing) · framework 104 Accountable (Competition Bureau oversight).

---

## 11. Demand Planning / S&OP

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Statistical baseline forecast** | 13-26-52 week SKU × DC × retailer | ML forecast (Prophet / NeuralProphet / Temporal Fusion Transformer) | Internal | Forecast MAPE / WMAPE |
| **Demand consensus** | Sales + Marketing + Supply Chain consensus | LLM-assisted consensus summarization | Internal | Consensus-cycle time |
| **Supply review** | Capacity + constraint + risk | Constraint-aware scheduling | Plant capacity + OH&S | Plan feasibility |
| **Pre-S&OP + Executive S&OP** | Reconcile demand + supply + financial | Composite scenario dashboard | Internal | Decision velocity |

**Owner dept:** Supply Chain + Sales
**Composes with:** ml_methodology Phase 8 (validation discipline for forecast) · framework 107 Monitoring (forecast drift) · `../ai_assurance/evaluation_metrics.md` §1.1.1 (MAE/RMSE/MAPE for forecasting).

---

## 12. Marketing & Brand

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Brand strategy + positioning** | Master brand + sub-brand + SKU positioning | Consumer-segment modelling | Internal + Competition Bureau | Brand-equity score |
| **Campaign planning + creative** | Multi-channel campaign + creative | GenAI-assisted creative + A/B testing | Ad Standards Canada + **Quebec Bill 96 (French)** | Campaign ROI |
| **Media buying + optimization** | Programmatic + linear + OOH + digital | Media-mix optimizer | Privacy + cookie laws (PIPEDA + Quebec Law 25) | Media efficiency |
| **Brand health tracking** | Awareness + consideration + intent + NPS | Survey + social-listening NLP | Internal + privacy laws | Brand-health trend |

**Owner dept:** Marketing
**Composes with:** framework 109 Responsible GenAI (creative guardrails) · framework 103 Safe (no claims violations) · `../ai_assurance/responsible_by_design.md` §2 Transparency.

---

## 13. Customer Engagement & Loyalty

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Direct-to-consumer (DTC) channels** | Web + app + subscription | Recommendation + personalization (with consent) | **PIPEDA + Quebec Law 25** | DTC revenue |
| **Loyalty program** | Enroll + earn + redeem | Churn prediction + offer optimization | Loyalty + privacy laws | Active-loyalty rate |
| **Consumer-care + complaints** | Inbound (email / chat / phone) | LLM-assisted triage + auto-resolution | Consumer-protection laws | First-contact resolution |
| **Traceability lookup (consumer-facing)** | Scan QR → see origin / batch / sustainability | **GS1 Digital Link** + AR overlay | **CFIA** + GS1 + sustainability claims | Trace-engagement rate |

**Owner dept:** Customer Experience
**Composes with:** `../ai_assurance/data_governance.md` (consumer-PII + consent) · framework 102 Trustworthy (recommendation calibration) · §38.1 user notifications per AI operation.

---

## 14. Recall, Traceability & Compliance Ops

| Sub-process | What is done | AI / automation opportunity | Compliance touchpoint | KPI |
|---|---|---|---|---|
| **Forward traceability (1 lot → all cases shipped)** | Lot → carton → pallet → DC → retailer → store | Graph DB + traceability accelerator | **CFIA SFCR 1-up 1-down + ≤ 24 h recall-execution** | Recall execution time |
| **Backward traceability (1 case → source lots)** | Case → fill batch → ingredient lots → supplier | Graph DB | CFIA | Backward-trace time |
| **Recall execution** | Identify + notify + retrieve + dispose | Recall-decision workflow + auto-notification chain | **CFIA + Health Canada + provincial** | Recall completion rate |
| **Regulatory reporting** | CFIA + Health Canada + provincial + EPR | Auto-extract + auto-fill + submission | **CFIA reporting + provincial EPR + sustainability disclosure (CSDS)** | Report-on-time rate |
| **Audit support** | CFIA + retailer + 3rd-party audits | Doc-retrieval AI + audit-trail surfacing | CFIA + ISO 22000 / FSSC 22000 | Audit pass rate |

**Owner dept:** Quality + Legal
**Composes with:** framework 105 Auditable (the operational discipline of this entire process family) · `../ai_assurance/clinical_validation.md` regulatory-mapping pattern (analog for CFIA) · §38.3 audit envelope.

---

## How to use this catalog

1. **New AI use case proposed?** → Map it to ≥ 1 process family above. If it maps to 0, it's an orphan and should be challenged.
2. **Planning a dept's INSUR_DT_STRATEGY.md (4P)?** → Walk the process families that dept owns; for each, identify People / Process / Profit / Technology gaps.
3. **Quarterly DT audit?** → Walk every sub-process row; classify `✓ / ⚠ / ✗`; ladder gap closures.
4. **Recall drill?** → Process family 14 IS the drill — run it quarterly with synthetic case data; target ≤ 24 h end-to-end.

## The brutal rule

> A insurerage AI feature that cannot name (a) the process it serves,
> (b) the dept that owns the process, and (c) the KPI it moves — is a
> demo, not a product. Every model that lands in production must
> reference at least one row from this catalog. Without that anchor,
> the model is unowned, unmeasured, and unrolled-back-able.

## Composes with

- **§38 + §38.3** — every AI decision against a process row lands an audit row
- **§47** — process digitisation is the JAD-to-BRD-to-LLD chain made operational
- **§63** — each process family lives in a §63 dept (Procurement / Operations / Supply Chain / Sales / Marketing / etc.)
- **§64** — per-dept artefacts reference these processes (INSUR_DEPT_SPEC + INSUR_DT_STRATEGY)
- **§66** — INSUR_BRD + INSUR_FRD use these process rows as functional scope
- **§68** — Observability Hub surfaces per-process KPI dashboards
- Sister docs:
  - [`canada_cpg_2026.md`](canada_cpg_2026.md) — 12-domain DT checklist (compliance overlay on these processes)
  - [`healthcare_industry_processes.md`](healthcare_industry_processes.md) — parallel process catalog for healthcare
  - [`../ai_assurance/`](../ai_assurance/) — verification frameworks for any AI deployed against these processes
  - [`../ml_methodology/`](../ml_methodology/) — build-phase methodology for any model deployed against these processes
