# Digital Transformation Checklist — Canadian Consumer-Packaged Goods (Beverage Focus, 2026)

> **Industry:** Consumer-Packaged Goods (Beverage emphasis) · **Jurisdiction:** Canada · **Year:** 2026
>
> Direct DT checklist for the INSUR/insur project's actual deployment
> domain. 12-domain × ~48-area checklist following the same 6-column
> rubric as [`canada_healthcare_2026.md`](canada_healthcare_2026.md):
> Domain / Area / What to Check / Key Questions / Canadian Context +
> Compliance / Outcome KPI.
>
> Compliance citations preserved verbatim. Replace healthcare-specific
> rows (EHR / clinical / PHIPA / Health Canada SaMD) with insurerage-
> specific equivalents (CFIA / Health Canada food directorate / SCI
> / TPP / provincial liquor boards / bottling + supply-chain).

## At-a-glance — the 12 domains

| # | Domain | Areas | Core question |
|---|---|---|---|
| 1 | [Strategy & Governance](#1-strategy--governance) | 5 | Is there a digital vision tied to brand + market outcomes? |
| 2 | [Operations & Supply Chain](#2-operations--supply-chain) | 5 | Are AS-IS supply flows mapped and TO-BE flows digitised? |
| 3 | [Core Systems](#3-core-systems) | 5 | Are ERP / MES / WMS / TMS / CRM integrated? |
| 4 | [Interoperability](#4-interoperability) | 4 | Can systems talk via EDI / GS1 / OPC UA / FHIR-equivalent? |
| 5 | [Data & Analytics](#5-data--analytics) | 4 | Is consumer + supply-chain data catalogued and predictive? |
| 6 | [AI / Advanced Tech](#6-ai--advanced-tech) | 6 | Are AI use cases (demand forecast, vision QA, recommendation) explainable and fair? |
| 7 | [Cloud & Infrastructure](#7-cloud--infrastructure) | 4 | Is the cloud sovereign, retail-pipeline resilient, IIoT scalable? |
| 8 | [Privacy & Security](#8-privacy--security) | 4 | Is consumer PII + payment + OT separated by Zero Trust? |
| 9 | [Workforce & Culture](#9-workforce--culture) | 4 | Are plant + retail + HQ staff trained, supported, and engaged? |
| 10 | [Customer Engagement](#10-customer-engagement) | 4 | Can consumers access loyalty, traceability, sustainability data? |
| 11 | [Compliance & Regulation](#11-compliance--regulation) | 4 | Are CFIA / Health Canada food / provincial liquor / accessibility / sustainability covered? |
| 12 | [Measurement & Sustainability](#12-measurement--sustainability) | 4 | Are ROI / ESG / scope-3 emissions / packaging waste tracked? |

**Totals:** 12 domains × ~53 areas. Each row classifiable as
`✓ done / ⚠ partial / ✗ gap` during the DT audit.

---

## 1. Strategy & Governance

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Digital Vision** | Defined digital CPG vision aligned to brand + retailer + consumer outcomes | Is this margin-led, growth-led, or sustainability-led? | Align with parent-co global strategy + Competition Bureau guidance | Clear roadmap |
| **Leadership Sponsorship** | Executive + Ops + IT champions assigned | Who owns success across plant + HQ + commercial? | Board + CFO alignment | Faster adoption |
| **Governance Model** | Decision + risk + escalation structure | Who approves AI, consumer-data use, retailer-data sharing? | Required for PIPEDA + Competition Bureau audits | Controlled delivery |
| **Change Management** | Org-wide change plan across plant + retail + HQ | How do workflows change for shift workers, sales reps, planners? | Union (CFAW, UFCW) + workforce considerations | Reduced resistance |
| **Sustainability Sponsorship** | ESG/sustainability champion at exec level | Who owns scope-3, packaging waste, carbon targets? | Canada Net Zero Emissions Act + provincial EPR | Stakeholder trust |

**Composes with:** §47.5 JAD chain · §63 global-ai-org (governance) ·
§104 Accountable AI · §53.40 Business KPI tracking.

---

## 2. Operations & Supply Chain

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Current State Mapping** | AS-IS plant + distribution + retail workflows documented | Where are delays / manual touches / OT-IT silos? | Required for any IIoT investment case | Process clarity |
| **Process Digitization** | TO-BE digital workflows (S&OP, IBP, plant floor) | What can be automated end-to-end? | Standards: ISA-95 levels 1-4 | Cost reduction + OEE |
| **Standardization** | Plant + DC + retail standards aligned | Are sites running different SOPs? | Provincial bottling regs (e.g., Ontario LCBO supply standards) | Consistency |
| **Automation** | RPA / OT automation / RGV-AGV / packaging-line robotics | Which tasks are repetitive? | OHSA + provincial OH&S codes for robotics safety | Staff time saved + safety |
| **Cold Chain & Traceability** | End-to-end traceability for cold/temperature-sensitive SKUs | Can we trace 1 case to source lot in ≤ 30 min? | **CFIA Safe Food for Canadians Regulations (SFCR)** + recall traceability one-up one-down | Recall cost reduction |

**Composes with:** §66 INSUR_DEPT_SPEC (supply-chain dept) · §64.40
agentic stack Layer 10 (Enterprise Apps = ERP / MES / WMS) · framework
106 Lifecycle Management.

---

## 3. Core Systems

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **ERP** | Integrated finance + plan + procure + plant ERP (SAP S/4 / Oracle / D365) | Single financial source of truth? | CICA + ASPE / IFRS reporting | Reduced reconciliation |
| **MES (Manufacturing Execution)** | Real-time plant floor visibility | OEE / changeover / yield captured? | ISA-95 + ISA-88 batch standards | Real-time OEE |
| **WMS / TMS (Warehouse + Transport)** | Inventory + fleet visibility | Stockouts at retailers? | OTM / EDI 944 / 945 standards | Service-level lift |
| **CRM / TPM** | Trade-promotion management + sales-force automation | Promo ROI measurable per retailer / SKU? | Competition Bureau + retailer NDAs | Promo lift visibility |
| **Master Data Management (MDM)** | Single SKU + customer + supplier hierarchy | One material code across all systems? | GS1 GTIN + Canadian retailer hierarchies (Loblaw / Sobeys / Metro / Walmart Canada) | Master-data quality |

**Composes with:** §63 global-ai-org `app-stack/` · §64.40 Layer 10 ·
framework 106 + 111 Portability AI.

---

## 4. Interoperability

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **EDI Standards** | EDI X12 (810 / 850 / 856 / 940 / 944 / 945) + EDIFACT | Do all retailer + supplier connections work? | Mandatory for retailer onboarding (Loblaw / Walmart Canada / Costco) | Onboarding speed |
| **GS1 Standards** | GTIN + GLN + SSCC + GS1-128 + 2D barcode (DataMatrix) | Are all SKUs registered? | **GS1 Canada** registry | Trace + retailer compliance |
| **OPC UA (Plant Floor)** | OT-IT data flow from PLCs / SCADA | Can plant data reach the data lake? | IEC 62541 (OPC UA) + IEC 62443 (security) | Plant data availability |
| **Cloud API Strategy** | API-first integration (REST / GraphQL / event-streaming) | Can new apps plug in? | Vendor-neutral architecture (no lock-in) | Scalability |

**Composes with:** §47.6 SOC2 + DevSecOps · framework 111 Portability ·
§53.37 dependency contracts.

---

## 5. Data & Analytics

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Data Inventory** | Consumer + retailer + supply + plant data catalogued | Where is PII / payment / consumer-behaviour data stored? | **PIPEDA** + provincial (e.g., Quebec Law 25) | Audit readiness |
| **Data Quality** | Master + transactional data quality monitored | Can demand-forecast AI trust this data? | Internal data-governance policy | Reliable insights |
| **Analytics & BI** | Self-service BI + role dashboards | Are KPIs visible to plant + commercial + finance? | Quarterly board reporting | Better decisions |
| **Predictive Analytics** | Demand forecast + churn + price-elasticity | Can we predict 13-week demand at SKU × retailer × store? | None (commercial discretion) | Forecast accuracy lift |

**Composes with:** ml_methodology phases 2 (data) + 5 (EDA) ·
[`../ai_assurance/data_governance.md`](../ai_assurance/data_governance.md)
· framework 105 Auditable · §68.7 PII inventory surface.

---

## 6. AI / Advanced Tech

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **AI Use Cases** | Demand forecast · Vision-QA on bottling lines · Recommendation · Price-elasticity · Anomaly | Which use cases have measurable ROI? | **Directive on Automated Decision-Making** (federal procurement, if Crown corp) | Productivity + revenue lift |
| **Explainability** | SHAP / feature importance / counterfactuals on key decisions | Can a commercial planner trust the AI's promo recommendation? | Responsible AI guidance + future **Canadian AIDA (Artificial Intelligence and Data Act)** | Trust |
| **Bias & Fairness** | Pricing + recommendation tested across consumer segments | Are smaller retailers / certain consumer groups disadvantaged? | Competition Bureau + AIDA risk classification | Ethical AI |
| **Computer Vision (QA on line)** | Bottle / cap / label / fill-level vision QA | Can vision QA replace manual sample inspection? | **CFIA labelling regs** + Canadian Food Inspection Agency packaging-integrity standards | Defect-rate reduction |
| **Edge AI / IIoT** | Plant-floor edge inference for predictive maintenance | Latency / connectivity OK on plant floor? | IEC 62443 OT-security | Reduced unplanned downtime |
| **HPC / Cloud Training** | Large-model training (e.g., consumer-behaviour transformer) | Need high-scale compute? | **Canadian data residency** for consumer + retailer data | Faster iteration |

**Composes with:** Frameworks **102** Trustworthy · **103** Safe ·
**104** Accountable · **109** Responsible GenAI · §48 explainability ·
[`../ai_assurance/fairness_framework.md`](../ai_assurance/fairness_framework.md)
· [`../ai_assurance/responsible_by_design.md`](../ai_assurance/responsible_by_design.md).

---

## 7. Cloud & Infrastructure

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Cloud Strategy** | Hybrid / sovereign cloud strategy | Where does consumer + retailer + plant data live? | **Canadian data-residency** (esp. for Quebec Law 25) + cross-border-transfer flags | Compliance |
| **Network** | SD-WAN + plant-floor segmentation | Plant + DC reliable at peak season? | Rural / remote plant connectivity | Reliability |
| **Legacy Modernization** | AS/400 + custom-legacy plant systems phased out | Security + vendor-EOL risks? | Vendor EOL risk register | Stability |
| **DR & BCP** | Disaster recovery (peak season impact!) | Can systems recover in < 4 h during peak (e.g., holiday season)? | Cyber insurance + retailer SLAs | Resilience |

**Composes with:** §47.7 (4-layer rollback) · §47.10 (5-phase load
testing) · framework 101 Reliable · framework 111 Portability · §41.2
disaster recovery.

---

## 8. Privacy & Security

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Privacy by Design** | Embedded consumer-PII handling + loyalty + payment | Consent captured per Quebec Law 25? | **PIPEDA** + **Quebec Law 25** + payment card standards | Trust |
| **Cybersecurity** | Zero Trust + IT-OT segmentation + SOC + MFA | Ransomware ready (CPG is a top-5 target sector)? | **CCCS guidance** + **CCCS NIST 800-53 mapping** | Reduced incidents |
| **Vendor + Third-Party Risk** | Retailer-data-sharing agreements + cloud SaaS audits | Are 3rd-party processors PIPEDA-compliant? | Contractual safeguards + cross-border-transfer DPA | Reduced exposure |
| **Incident Response** | IR + breach playbook + retailer-notification chain | Who notifies retailer + regulator within 72h? | **PIPEDA breach-of-security-safeguards reporting** | Faster recovery |

**Composes with:** §47.6 4-lens security · [`../ai_assurance/data_governance.md`](../ai_assurance/data_governance.md)
· §64.32 per-dept security tab · §69 approval-minimization.

---

## 9. Workforce & Culture

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Digital Skills** | Training across plant + HQ + commercial | Can plant operators use MES / mobile / vision tools? | Provincial workforce-development grants | Adoption |
| **Role Redesign** | New digital roles (Data PM, AI PM, OT-IT engineer) | What jobs change? | **CFAW / UFCW** + provincial union agreements | Productivity |
| **Plant + Commercial Buy-In** | Co-design with line operators + sales reps | Are tools usable on the line / on the road? | Safety + adoption | Satisfaction |
| **Support Model** | Helpdesk + super users across shifts | Who supports 24/7 production go-live? | 24/7 operation needs | Continuity |

**Composes with:** §63 global-ai-org per-dept roles · §53.41 change
management · §53.42 documentation.

---

## 10. Customer Engagement

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Consumer Portal / Loyalty** | Direct-to-consumer experience + loyalty program | Can consumers see purchase + redemption history? | Consent + access laws (PIPEDA + Quebec Law 25) | Engagement |
| **Traceability for Consumers** | Per-bottle / per-case traceability (QR + 2D barcode) | Can consumer verify origin + lot + sustainability metrics? | **GS1 Digital Link** + CFIA labelling | Brand trust |
| **Digital Front Door (Web / App)** | Accessibility-compliant + multi-language | Is the site usable in English + French (+ Indigenous languages where relevant)? | **AODA / ACA** + Quebec Bill 96 (French-language) | Satisfaction + reach |
| **Trust & Transparency** | Clear data + AI usage disclosure | Do consumers know when AI is used (e.g., recommendation, dynamic pricing)? | Future **AIDA disclosure** + Competition Bureau guidance | Adoption |

**Composes with:** §14 frontend standards (WCAG 2.1 AA) ·
[`../ai_assurance/responsible_by_design.md`](../ai_assurance/responsible_by_design.md)
§2 Transparency · §38.1 user notifications per AI operation.

---

## 11. Compliance & Regulation

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Food + Beverage Safety** | HACCP / SFCR / preventive controls | Hazard plan current per facility? | **CFIA Safe Food for Canadians Regulations (SFCR)** + **Health Canada Food and Drugs Act** | Recall risk reduction |
| **Provincial Liquor Boards** (if applicable) | Compliance with LCBO / SAQ / BCLDB / AGLC supply standards | Are listing + reporting + EDI flows compliant? | **Provincial liquor authorities** (Ontario, Quebec, BC, Alberta) | Channel access |
| **Documentation** | PIAs / TRAs / AI risk assessment | Audit-ready? | **OPC + provincial Privacy Commissioners** + AIDA risk register | Risk reduction |
| **Sustainability + EPR** | Extended Producer Responsibility on packaging | Are packaging fees + recycled-content targets met? | **Provincial EPR** (Ontario Blue Box, Quebec EPR, BC CleanFarms) + **Plastics Registry** | ESG + cost compliance |

**Composes with:** [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md)
§11 Regulatory mapping (analog for CPG) · [`../ai_assurance/auditable_ai.md`](../ai_assurance/auditable_ai.md)
· §38 AI Production Governance.

---

## 12. Measurement & Sustainability

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **KPI Framework** | Plant (OEE) + commercial (lift) + financial (margin) + consumer (NPS) | Is value measured end-to-end? | Public-co quarterly reporting (if listed) | ROI |
| **ESG / Scope-3 Emissions** | Carbon + water + packaging tracked through supply chain | Are scope-3 emissions auditable? | **Canadian Net Zero Emissions Act** + **CSDS (Canadian Sustainability Disclosure Standards)** | Stakeholder trust |
| **Funding Model** | Opex / Capex planning across DT roadmap | Is the multi-year DT funding sustainable? | Capex / Opex board approval | Longevity |
| **Future Readiness** | Scalability + new-tech absorption (AIDA, 5G plant, digital-twin) | Ready for next 18-24 months? | National AI strategy + ISED programs | Long-term value |

**Composes with:** §41.1 FinOps · §53.40 Business KPI · §53.45
Continuous Improvement · §68 Observability Hub.

---

## Compliance citation index (do NOT paraphrase)

| Citation | Full name | Scope |
|---|---|---|
| **PIPEDA** | Personal Information Protection and Electronic Documents Act | Federal private-sector data |
| **Quebec Law 25** | An Act to modernize legislative provisions as regards the protection of personal information | Quebec consumer PII (stricter than PIPEDA) |
| **CFIA SFCR** | Safe Food for Canadians Regulations | All federally regulated food + insurerage |
| **Health Canada Food and Drugs Act** | Food and Drugs Act + Regulations | Federal food + insurerage safety + labelling |
| **GS1 Canada** | Global Standards 1, Canadian member | GTIN + GLN + SSCC + DataMatrix registry |
| **CCCS** | Canadian Centre for Cyber Security | Cyber guidance (esp. CCCS NIST 800-53 mapping) |
| **AODA** | Accessibility for Ontarians with Disabilities Act | Ontario accessibility |
| **ACA** | Accessible Canada Act | Federal accessibility |
| **Quebec Bill 96** | An Act respecting French, the official and common language of Québec | Quebec language compliance |
| **AIDA** | Artificial Intelligence and Data Act (anticipated) | Federal AI risk classification |
| **Competition Bureau** | Competition Act | Pricing + promotion + market fairness |
| **Provincial EPR** | Extended Producer Responsibility (Ontario / Quebec / BC) | Packaging recovery + recycled content |
| **CSDS** | Canadian Sustainability Disclosure Standards | ESG disclosure (CSA-aligned) |
| **LCBO / SAQ / BCLDB / AGLC** | Provincial liquor authorities | Provincial alcohol-channel rules |
| **OPC** | Office of the Privacy Commissioner of Canada | PIPEDA enforcement |
| **ISA-95 / ISA-88** | International Society of Automation standards | Plant-floor integration + batch processing |
| **IEC 62443** | Industrial automation + control-systems security | OT cybersecurity |
| **IEC 62541** | OPC UA | Plant data interoperability |

## Per-row classification template

Same as [`canada_healthcare_2026.md`](canada_healthcare_2026.md) §"Per-row classification template" — see that doc for the JSON schema.

## Anti-patterns (CPG / insurerage-specific)

| Anti-pattern | Why it fails |
|---|---|
| Skip plant-floor (OT) row | IT-only DT misses OEE + cost reduction; biggest CPG margin lever ignored |
| Skip retailer-data-sharing row | Without retailer integration, sales-out is invisible; demand forecast is blind |
| Forget Quebec Law 25 | Cross-border consumer data leak → immediate breach under stricter provincial rules |
| Forget provincial liquor boards | Listings can be revoked overnight; entire channel blocked |
| Skip Scope-3 + EPR | ESG audit failures + provincial packaging fees compound |
| Vision-QA without CFIA labelling check | False-positive on label → recall risk; false-negative → consumer-safety risk |
| Plant-floor edge AI without IEC 62443 | OT security gap; potential ransomware blast-radius across multiple plants |
| AI pricing without Competition Bureau review | Risk of "algorithmic collusion" or anti-competitive findings |
| Loyalty data without consent granularity | Quebec Law 25 + PIPEDA enforcement |
| AODA/ACA + Bill 96 missed | Provincial access + language compliance gaps |

## Audit-ready statement

> *"Digital-transformation maturity was assessed against the 12-domain
> Canadian Consumer-Packaged Goods 2026 checklist, covering Strategy &
> Governance, Operations & Supply Chain, Core Systems, Interoperability,
> Data & Analytics, AI & Advanced Tech, Cloud & Infrastructure,
> Privacy & Security, Workforce & Culture, Customer Engagement,
> Compliance & Regulation, and Measurement & Sustainability. Each of
> ~53 areas was classified as done / partial / gap with named owner,
> compliance reference (PIPEDA / Quebec Law 25 / CFIA SFCR / GS1 Canada
> / provincial liquor + EPR / future AIDA), and KPI target. Re-assessment
> is quarterly; gap closure is tracked alongside §66 per-dept artefacts
> and §38 production-governance gates."*

## Composes with

- **§38 AI Production Governance** — every row's outcome KPI feeds §38.3 audit envelope
- **§42 Operational Autonomy** — AIDA + Quebec Law 25 changes gate certain operations
- **§47 Architecture & Design Patterns** — 7 design surfaces apply at every Core Systems + OT integration
- **§47.6 (security 4 lenses)** — SOC2 + STRIDE + OWASP + DevSecOps gates Privacy & Security rows
- **§53 Enterprise AI Maturity Stack** — items 35–48 align with this DT checklist's domains
- **§63 Global AI Org Structure** — 19-dept scaffold IS the organisational substrate (Sales / Supply Chain / Operations / Marketing / Finance / HR / Legal / Procurement / Customer Support / Engineering / Security Ops + project-specific bottling/plant depts)
- **§64 Per-Dept Business Artifacts** — every dept's INSUR_DT_STRATEGY.md (4P) maps directly to this checklist
- **§66 per-dept INSUR_BRD + INSUR_FRD** reference compliance citations from here
- **§68 Observability Hub** — DT progress dashboard tile per domain
- Sister catalogs:
  - [`canada_healthcare_2026.md`](canada_healthcare_2026.md) — the healthcare worked example (same structure, different rows)
  - [`../ai_assurance/`](../ai_assurance/) — verification frameworks (101–111 + 10 horizontals)
  - [`../ml_methodology/`](../ml_methodology/) — build-phase methodology (201–211)
