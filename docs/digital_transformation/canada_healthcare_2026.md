# Digital Transformation Checklist — Canadian Healthcare (2026)

> **Industry:** Healthcare · **Jurisdiction:** Canada · **Year:** 2026
>
> 12-domain × ~47-area enterprise digital-transformation checklist.
> Each row carries Domain / Area / What to Check / Key Questions /
> Canadian Context + Compliance / Outcome KPI. Use during DT scoping
> + quarterly audit per [`README.md`](README.md) §"How to use".
>
> **Compliance citations preserved verbatim.** Auditors verify against
> specific regulatory references (PIPEDA / PHIPA / Infoway / OHIP /
> Health Canada SaMD / CCCS / OCAP / REB / etc.); do not paraphrase.

## At-a-glance — the 12 domains

| # | Domain | Areas | Core question |
|---|---|---|---|
| 1 | [Strategy & Governance](#1-strategy--governance) | 5 | Is there an owner, a vision, and a decision-rights matrix? |
| 2 | [Clinical & Business Processes](#2-clinical--business-processes) | 4 | Are AS-IS workflows mapped and TO-BE workflows digitised? |
| 3 | [Core Systems](#3-core-systems) | 4 | Are EHR / LIS / RIS / PACS / billing / ERP integrated? |
| 4 | [Interoperability](#4-interoperability) | 4 | Can the systems talk (FHIR / HL7 / SNOMED / API-first)? |
| 5 | [Data & Analytics](#5-data--analytics) | 4 | Is PHI catalogued, accurate, dashboarded, predictive? |
| 6 | [AI / Advanced Tech](#6-ai--advanced-tech) | 6 | Are AI use cases explainable, fair, regulated, and useful? |
| 7 | [Cloud & Infrastructure](#7-cloud--infrastructure) | 4 | Is the cloud sovereign, the network resilient, the legacy retired? |
| 8 | [Privacy & Security](#8-privacy--security) | 4 | Is privacy by design + Zero Trust + IR ready? |
| 9 | [Workforce & Culture](#9-workforce--culture) | 4 | Are clinicians trained, bought in, and supported? |
| 10 | [Patient Engagement](#10-patient-engagement) | 4 | Can patients access records, telehealth, and trust the system? |
| 11 | [Compliance & Regulation](#11-compliance--regulation) | 3 | Are PIAs / TRAs / REB / SaMD covered? |
| 12 | [Measurement & Sustainability](#12-measurement--sustainability) | 4 | Are KPIs visible, funding sustainable, future-ready? |

**Totals:** 12 domains × ~50 areas = **~50 checklist rows**. Each row
classifiable as `✓ done / ⚠ partial / ✗ gap` during the DT audit.

---

## 1. Strategy & Governance

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Digital Vision** | Defined digital health vision aligned to care + business | Is this tech-led or outcome-led? | Align with provincial digital health strategies | Clear roadmap |
| **Leadership Sponsorship** | Executive + clinical champions assigned | Who owns success? | Health Authority / Board alignment | Faster adoption |
| **Governance Model** | Decision, risk, and escalation structure | Who approves AI, data use? | Required for PHIPA / PIPEDA audits | Controlled delivery |
| **Change Management** | Org-wide change plan | How do workflows change? | Union + workforce considerations | Reduced resistance |
| **Digital Equity** | Inclusion strategy | Who may be excluded digitally? | Indigenous + rural equity | Improved access |

**Composes with:** §47.5 JAD chain (vision → BRD) · §63 global-ai-org
(governance roles) · §104 Accountable AI · §63 + §66 dept-level RACI.

---

## 2. Clinical & Business Processes

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Current State Mapping** | AS-IS workflows documented | Where are delays / manual work? | Required for public funding justification | Process clarity |
| **Process Digitization** | TO-BE digital workflows | What can be automated? | Ministry reporting standards | Cost reduction |
| **Standardization** | Clinical + admin standards | Are sites working differently? | Provincial care pathways | Consistency |
| **Automation** | RPA / workflow engines | Which tasks are repetitive? | Billing + scheduling rules | Staff time saved |

**Composes with:** §66 per-dept HOLY_DEPT_SPEC + flowchart artefacts ·
§64.40 10-layer agentic stack (Layer 6 CUA orchestrates automation) ·
ml_methodology Phase 1 framing.

---

## 3. Core Systems

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **EHR / EMR** | Integrated, interoperable EHR | Single patient record? | Infoway / FHIR aligned | Reduced errors |
| **LIS / RIS / PACS** | Lab + imaging integration | Are results real-time? | Provincial repositories | Faster diagnosis |
| **Billing & Claims** | Digital claims processing | Manual vs automated? | Insurer + OHIP rules | Faster reimbursement |
| **ERP / Supply Chain** | Inventory + procurement | Stockouts? Wastage? | Public procurement rules | Cost savings |

**Composes with:** §63 global-ai-org `app-stack/` (backend integration
layer) · §64.40 Layer 10 Enterprise Applications · framework 106
Lifecycle Management.

---

## 4. Interoperability

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Standards** | FHIR / HL7 / SNOMED | Can systems talk? | Infoway mandates | Data continuity |
| **API Strategy** | API-first architecture | Can new apps plug in? | Vendor neutrality | Scalability |
| **Provincial Integration** | Netcare / eHealth systems | Connected to province? | Mandatory in many regions | Continuity of care |
| **Cross-Org Sharing** | Hospital ↔ clinic ↔ pharmacy | Is referral data complete? | Consent requirements | Reduced duplication |

**Composes with:** §47.6 SOC2 (interoperability is the secure-by-
default surface) · framework 111 Portability AI · §53.37 dependency
contracts.

---

## 5. Data & Analytics

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Data Inventory** | Data sources catalogued | Where is PHI stored? | PIPEDA / PHIPA | Audit readiness |
| **Data Quality** | Accuracy + completeness | Can AI trust this data? | Clinical safety | Reliable insights |
| **Analytics** | BI + dashboards | Are KPIs visible? | Ministry reporting | Better decisions |
| **Big Data** | Population health analysis | Can we predict risk? | Public health usage | Preventive care |

**Composes with:** ml_methodology Phase 2 (data acquisition) +
Phase 5 (EDA) · [`../ai_assurance/data_governance.md`](../ai_assurance/data_governance.md)
· framework 105 Auditable AI · §68.7 PII inventory surface.

---

## 6. AI / Advanced Tech

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **AI Use Cases** | Clinical + operational AI | Diagnosis? Triage? Ops? | **Health Canada SaMD rules** | Productivity |
| **Explainability** | SHAP / LIME / auditability | Can clinicians trust AI? | Responsible AI guidance | Trust |
| **Bias & Fairness** | Bias testing | Are groups disadvantaged? | Equity mandates | Ethical AI |
| **Robotics** | Surgical / logistics robots | ROI justified? | Medical device regs | Precision |
| **AR / VR** | Training + therapy | Improves outcomes? | Safety standards | Skill improvement |
| **HPC** | Genomics / AI training | Need high-scale compute? | **Canadian data residency** | Faster research |

**Composes with:** Frameworks **102** Trustworthy · **103** Safe ·
**104** Accountable · **109** Responsible GenAI · §48 explainability ·
[`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md)
(Health Canada SaMD + FDA 510(k) mapping) ·
[`../ai_assurance/fairness_framework.md`](../ai_assurance/fairness_framework.md).

---

## 7. Cloud & Infrastructure

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Cloud Strategy** | Hybrid / sovereign cloud | Where does data live? | **Data must stay in Canada** | Compliance |
| **Network** | Bandwidth + redundancy | Telehealth-ready? | Rural connectivity gaps | Reliability |
| **Legacy Modernization** | Old systems phased out | Security risks? | Vendor EOL risks | Stability |
| **DR & BCP** | Disaster recovery | Can systems recover fast? | Cyber insurance | Resilience |

**Composes with:** §47.7 (4-layer rollback) · §47.10 (5-phase load
testing) · §53.35 DR metrics · framework 101 Reliable AI · framework
111 Portability AI · §41.2 disaster recovery.

---

## 8. Privacy & Security

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Privacy by Design** | Embedded privacy controls | Consent captured? | **PIPEDA / PHIPA** | Trust |
| **Cybersecurity** | Zero Trust, SOC, MFA | Ransomware ready? | **CCCS (Canadian Centre for Cyber Security) guidance** | Reduced incidents |
| **Vendor Risk** | Third-party audits | Is vendor compliant? | Contractual safeguards | Reduced exposure |
| **Incident Response** | IR + breach playbooks | Who responds? | **Mandatory reporting** | Faster recovery |

**Composes with:** §47.6 4-lens security (OWASP + STRIDE + DevSecOps
+ SOC2) · [`../ai_assurance/data_governance.md`](../ai_assurance/data_governance.md)
· §64.32 per-dept security tab · §69 approval-minimization helper.

---

## 9. Workforce & Culture

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Digital Skills** | Training programs | Can staff use tools? | Infoway training programs | Adoption |
| **Role Redesign** | New digital roles | What jobs change? | Union + HR policies | Productivity |
| **Clinical Buy-In** | Co-design with clinicians | Is tool usable? | Safety + adoption | Satisfaction |
| **Support Model** | Helpdesk + super users | Who supports go-live? | 24/7 care needs | Continuity |

**Composes with:** §63 global-ai-org per-dept role scaffolding (15
roles per dept) · §53.41 change management · §53.42 documentation.

---

## 10. Patient Engagement

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Patient Portal** | Access to records | Can patients see data? | Consent + access laws | Engagement |
| **Telehealth** | Virtual care services | Hybrid care model? | Virtual care billing | Access |
| **Experience** | Digital front door | Is it easy to use? | **Accessibility laws (AODA in ON, ACA federally)** | Satisfaction |
| **Trust & Transparency** | Clear data usage | Do patients trust system? | Privacy disclosure | Adoption |

**Composes with:** §14 frontend standards (WCAG 2.1 AA) ·
[`../ai_assurance/responsible_by_design.md`](../ai_assurance/responsible_by_design.md)
§2 Transparency · §38.1 user notifications per AI operation.

---

## 11. Compliance & Regulation

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **Legal Review** | Regulatory assessment | Medical device? AI risk? | **Health Canada** | Approval |
| **Documentation** | PIAs (Privacy Impact Assessments) / TRAs (Threat Risk Assessments) | Audit-ready? | **Privacy Commissioners** (federal + provincial) | Risk reduction |
| **Ethics** | Data + AI ethics | Secondary data use? | **REB** (Research Ethics Board) / **OCAP** (Ownership, Control, Access, Possession — for Indigenous data) | Public trust |

**Composes with:** [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md)
§11 Regulatory mapping · [`../ai_assurance/auditable_ai.md`](../ai_assurance/auditable_ai.md)
· §38 AI Production Governance · OCAP principles require Indigenous-led
data governance — a mandatory consultation step before AI on Indigenous
populations.

---

## 12. Measurement & Sustainability

| Area | What to Check | Key Questions | Canadian Context / Compliance | Outcome / KPI |
|---|---|---|---|---|
| **KPI Framework** | Clinical + financial KPIs | Is value measured? | Public accountability | ROI |
| **Continuous Improvement** | Feedback loops | Are systems improved? | Quality improvement | Maturity |
| **Funding Model** | Opex / Capex planning | Is funding sustainable? | Grants + ministry funding | Longevity |
| **Future Readiness** | Scalability | Ready for new tech? | National data initiatives | Long-term value |

**Composes with:** §41.1 FinOps · §53.40 Business KPI tracking ·
§53.45 Continuous Improvement · §47.11 pre-release gates · §68
Observability Hub.

---

## Compliance citation index (do NOT paraphrase)

| Citation | Full name | Scope |
|---|---|---|
| **PIPEDA** | Personal Information Protection and Electronic Documents Act | Federal private-sector data |
| **PHIPA** | Personal Health Information Protection Act | Ontario PHI (each province has analog) |
| **Infoway** | Canada Health Infoway | Federal interoperability + FHIR mandates |
| **Health Canada SaMD** | Software as a Medical Device classification | AI medical-device regulation |
| **OHIP** | Ontario Health Insurance Plan | Billing rules (province-specific) |
| **CCCS** | Canadian Centre for Cyber Security | Cyber guidance for critical infrastructure |
| **REB** | Research Ethics Board | Mandatory for research use of patient data |
| **OCAP** | Ownership, Control, Access, Possession | Indigenous data sovereignty principles |
| **AODA** | Accessibility for Ontarians with Disabilities Act | Provincial accessibility |
| **ACA** | Accessible Canada Act | Federal accessibility |
| **Federal Privacy Commissioner** | OPC (Office of the Privacy Commissioner of Canada) | PIPEDA enforcement |
| **Provincial Privacy Commissioners** | E.g., IPC Ontario | PHIPA enforcement |

## Per-row classification template

For each row, the DT audit produces:

```json
{
  "domain": "6. AI / Advanced Tech",
  "area": "Explainability",
  "status": "partial",
  "evidence": "SHAP integrated for tabular models; not yet for CV pipelines",
  "gap_severity": "P1",
  "owner": "RAI Office",
  "target_close_date": "2026-Q3",
  "compliance_refs": ["Responsible AI guidance", "EU AI Act Art. 86 (anticipated)"],
  "linked_artefacts": [
    "../ai_assurance/responsible_by_design.md",
    "../ai_assurance/clinical_validation.md"
  ],
  "kpi_target": "Clinician-rated trust score ≥ 4/5"
}
```

## Anti-patterns (DT-specific)

| Anti-pattern | Why it fails |
|---|---|
| Tech-led DT (start with cloud picks, not business outcomes) | Builds a stack nobody uses |
| Skip the workforce row | Best-in-class system that clinicians refuse to adopt |
| Skip the OCAP row for any Indigenous data | Regulatory + ethical violation |
| Skip the data-residency row | Cross-border data leak → immediate compliance breach |
| Aggregate KPIs without per-dept slicing | Hides which dept is succeeding vs failing |
| Annual audit (not quarterly) | DT debt compounds invisibly between cycles |
| One-size-fits-all checklist (skip jurisdiction-specific compliance column) | Fails first regulator review |
| No row-level owner | Every gap is "someone's problem" |
| Telehealth without rural-connectivity row | Equity failure built in |
| AI use cases without explainability row | Cannot land in regulated clinical practice |

## Audit-ready statement

> *"Digital-transformation maturity was assessed against the 12-domain
> Canadian Healthcare 2026 checklist, covering Strategy & Governance,
> Clinical & Business Processes, Core Systems, Interoperability,
> Data & Analytics, AI & Advanced Tech, Cloud & Infrastructure,
> Privacy & Security, Workforce & Culture, Patient Engagement,
> Compliance & Regulation, and Measurement & Sustainability. Each
> of ~50 areas was classified as done / partial / gap with named
> owner, compliance reference, and KPI target. Re-assessment is
> quarterly; gap closure is tracked alongside §66 per-dept artefacts
> and §38 production-governance gates."*

## How to fork this for another jurisdiction × industry

1. Copy this file → `<jurisdiction>_<industry>_<year>.md`
2. Keep the 12-domain structure (it generalises)
3. Replace **Canadian Context / Compliance** column with the new
   jurisdiction's references (e.g., HIPAA / FDA / EU AI Act / GDPR
   / SOC2 / PCI-DSS)
4. Adjust the **Citation index** verbatim per jurisdiction
5. Update the **Anti-patterns** with jurisdiction-specific failure
   modes (e.g., HIPAA: skip Business Associate Agreements)
6. Link from [`README.md`](README.md) §"Available checklists"

The checklist methodology is portable; only the regulatory + cultural
columns change.

## Composes with

- **§38 AI Production Governance** — every row's outcome KPI feeds the §38.3 audit envelope
- **§42 Operational Autonomy** — regulatory changes (e.g., new SaMD rule) gate certain operations
- **§47 Architecture & Design Patterns** — 7 design surfaces apply at every Core Systems integration
- **§47.6 (security 4 lenses)** — SOC2 + STRIDE + OWASP + DevSecOps gates every Privacy & Security row
- **§53 Enterprise AI Maturity Stack** — items 35–48 align with this DT checklist's domains
- **§63 Global AI Org Structure** — the 19-dept scaffold IS the organisational substrate this checklist transforms
- **§64 Per-Dept Business Artifacts** — every dept's HOLY_DT_STRATEGY.md (4P) maps directly to this checklist
- **§66 per-dept** — HOLY_DEPT_SPEC + HOLY_DT_STRATEGY + HOLY_BRD + HOLY_FRD reference this checklist's compliance citations
- **§68 Observability Hub** — DT progress dashboard tile per domain
- Sister catalogs:
  - [`../ai_assurance/`](../ai_assurance/) — verification frameworks (101–111 + 10 horizontals)
  - [`../ml_methodology/`](../ml_methodology/) — build-phase methodology (201–211)
