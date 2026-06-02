# Digital Transformation Catalogs

> Third sibling catalog, alongside
> [`../ai_assurance/`](../ai_assurance/README.md) (verification
> frameworks) and [`../ml_methodology/`](../ml_methodology/README.md)
> (build phases).
>
> **AI Assurance** answers *"how do we know it's behaving correctly?"*
> **ML Methodology** answers *"how do we build it correctly in the first place?"*
> **Digital Transformation** (this folder) answers *"how does the enterprise change to absorb it?"*

## Why this catalog exists

Frameworks 101–111 (AI assurance) + phases 201–211 (ML methodology)
deliver correctly-built and correctly-verified AI. But an AI system
landing in a hospital, a bank, or a insurerage CPG enterprise also
needs:

- **Governance** (who owns the digital vision, who approves AI use)
- **Process digitisation** (AS-IS → TO-BE workflows mapped + standardised)
- **Core systems integration** (EHR / ERP / supply chain / billing)
- **Interoperability** (FHIR / HL7 / SAP IDocs / etc.)
- **Privacy + security at jurisdiction level** (PIPEDA / PHIPA / GDPR / HIPAA / SOC2)
- **Workforce + culture** (training, role redesign, union/HR considerations)
- **Patient/customer engagement** (portals, telehealth, digital front-door)
- **Regulatory + ethics** (Health Canada SaMD / EU AI Act / FDA / REB)
- **Measurement + sustainability** (KPIs, funding model, future-readiness)

These are not features Claude builds; they are organisational
disciplines the enterprise must adopt for any AI feature to actually
land. This catalog codifies them per jurisdiction × industry.

## The catalog shape

Every DT doc follows the same 6-column rubric:

| Domain | Area | What to Check | Key Questions | Jurisdiction Context / Compliance | Outcome / KPI |

Typical scope per doc: **~12 domains × ~45 areas = ~540 checklist
rows**, each with a named compliance source and an outcome metric.

## Available DT checklists (12-domain compliance overlays)

| Doc | Industry | Jurisdiction | Year | Status |
|---|---|---|---|---|
| [Canada Healthcare 2026](canada_healthcare_2026.md) | Healthcare | Canada | 2026 | ✅ Worked example |
| [Canada CPG / Beverage 2026](canada_cpg_2026.md) | CPG / Beverage | Canada | 2026 | ✅ Project-relevant (INSUR/insur) |
| _(future)_ Canada Finance 2026 | Banking / FinTech | Canada | 2026 | ⏳ Planned |
| _(future)_ EU Pharma 2026 | Pharma / MedDevice | EU | 2026 | ⏳ Planned |

## Available process catalogs (industry-process inventory)

Different from the DT checklist — these enumerate the **industry processes** that AI/automation lands against, with dept owner + KPI per row.

| Doc | Industry | Scope |
|---|---|---|
| [Beverage Industry Processes](insurerage_industry_processes.md) | Beverage / CPG | 14 process families with full sub-process detail (INSUR/insur primary focus) |
| [Healthcare Industry Processes](healthcare_industry_processes.md) | Healthcare | 12 process family summary (parallel reference; expand on actual deployment) |

Each new jurisdiction × industry combination = a new MD file.
The first row (Canada healthcare DT + Beverage Process catalog) is the worked example that establishes both structures.

## How to use a DT checklist

1. **Phase 0 (scoping)** — Pick the right (industry, jurisdiction) checklist
2. **Phase 1 (gap analysis)** — Walk every row; classify each as `✓ done / ⚠ partial / ✗ gap`
3. **Phase 2 (prioritisation)** — Map gaps to business value × regulatory risk
4. **Phase 3 (roadmap)** — Sequence gap closure across quarters / fiscal year
5. **Phase 4 (execution)** — Each gap row spawns a project tracked via
   §66 per-dept artefacts + §64.40 agentic stack execution
6. **Phase 5 (audit)** — Quarterly re-walk; each row's status feeds
   the §68 Observability Hub's governance dashboard

## How this composes with the other two catalogs

| If you want to… | Look here |
|---|---|
| Score whether your AI feature is **behaving correctly** | `ai_assurance/` (frameworks 101–111 + 10 horizontal docs) |
| Build a new ML model **correctly from data to production** | `ml_methodology/` (phases 201–211) |
| Confirm the **enterprise can absorb** the AI feature | This folder (DT checklists per jurisdiction × industry) |
| Cover all three (recommended for any regulated rollout) | All three catalogs in parallel |

The three catalogs are mutually disjoint by *scope* but mutually
reinforcing by *outcome*: a feature that passes all 3 surfaces is
production-grade by the §38 + §47 + §53 + §57 definition.

## Cross-cutting compliance threads

Some compliance requirements span the DT domain rows + the AI
assurance horizontals. Always check both:

| Compliance area | DT-side row | AI-assurance-side doc |
|---|---|---|
| PIPEDA / PHIPA / GDPR data handling | §1.5 Digital Equity · §5.1 Data Inventory · §8.1 Privacy by Design | [`../ai_assurance/data_governance.md`](../ai_assurance/data_governance.md) |
| Health Canada SaMD / FDA / EU MDR | §6.1 AI Use Cases · §11.1 Legal Review | [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md) |
| AI Explainability (clinician trust + EU AI Act Art. 86) | §6.2 Explainability | [`../ai_assurance/responsible_by_design.md`](../ai_assurance/responsible_by_design.md) · framework 102 |
| Bias / fairness across populations | §6.3 Bias & Fairness | [`../ai_assurance/fairness_framework.md`](../ai_assurance/fairness_framework.md) |
| Audit + reporting | §11.2 Documentation · §12.1 KPI Framework | [`../ai_assurance/validation_playbook.md`](../ai_assurance/validation_playbook.md) · framework 105 |
| Cyber / Zero Trust | §8.2 Cybersecurity | §47.6 (4-lens security) |

## The brutal rule

> A model that ships through the AI Assurance + ML Methodology
> catalogs but lands in an enterprise that hasn't done the Digital
> Transformation work will *fail in deployment* — not because the
> model is wrong, but because the workforce can't use it, the data
> can't flow to it, the cloud isn't compliant, or the governance
> can't approve it. The DT checklist is what makes the technical
> work survive contact with the organisation.
