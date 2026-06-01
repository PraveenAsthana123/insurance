# Department Operating System — Master Blueprint

**Status:** CANONICAL (supersedes piecemeal specs; binding for Phase 3+)
**Adopted:** 2026-04-19
**Supersedes:** none (new layer)
**Related:** [ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md](./ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md) · [DEPARTMENT_OPERATING_SYSTEM.md](./DEPARTMENT_OPERATING_SYSTEM.md)

---

## 0. Product definition

**What we are building:** a **Department Operating System** that consolidates:

- **System of Record** — every task, decision, document, event lives here
- **System of Workflow** — every process is explicit, visible, state-machine-backed
- **System of Decision** — every decision has recommendation + confidence + explainability + override history
- **System of Automation** — every repeatable step is automatable (RPA / n8n / scheduled jobs)
- **System of Governance** — every action is policy-checked, audit-logged, explainable
- **System of Monitoring** — system + process + AI health, real-time observable
- **System of Reporting** — operational, management, financial, AI-performance, ROI, governance

**Core objective:** move work from brain / Excel / email → governed system where humans do only approval + exception + monitoring + governance; AI + system do capture + track + route + recommend + score + automate + log + report.

**Formula:** `People + Process + Data + AI + Technology + Governance + Operations + ROI`

---

## 1. Final Left Menu (10–13 items)

```
Dashboard
Work Management
Process Management
Decision Center
Documents & Data
AI & Intelligence
Operations
Projects
Incidents
Reports & Analytics
Governance & Compliance
Monitoring & Observability
Admin & Configuration
```

### 1.1 Submenu summary

| Main | Submenus |
|---|---|
| **Dashboard** | Overview · KPI Summary · Alerts & Risks · AI Insights |
| **Work Management** | My Tasks · Team Tasks · Backlog · Dependencies · Task History |
| **Process Management** | Process Catalog · Process Detail · Workflow Builder · Manual vs Automation · Bottlenecks |
| **Decision Center** | Pending Decisions · AI Recommendations · Decision History · Overrides · Explainability |
| **Documents & Data** | Documents · Extracted Data · Data Inventory · RAG Search · Version History |
| **AI & Intelligence** | Model Catalog · AI Runs · Accuracy & Metrics · Explainability · Responsible AI · Trust AI |
| **Operations** | Daily Operations · Issues Tracking · Performance · Dependencies |
| **Projects** | Implementation · Production Deployment · Change Requests · Release Management |
| **Incidents** | Active Issues · Root Cause · Resolution · Incident History · Lessons Learned |
| **Reports & Analytics** | Operational · Financial · AI Performance · KPI Dashboard · ROI |
| **Governance & Compliance** | Policies · Compliance Checks · Audit Logs · Trust & Ethics |
| **Monitoring** | System Health · Process Health · AI Monitoring · Alerts · Logs & Traces |
| **Admin** | Users · Roles · Workflow Config · Rules Engine · AI Config · Integrations · Tenant Setup |

---

## 2. Standard tab structure (5–8 tabs per screen)

Every screen exposes the same tab grammar:

| Tab | Purpose |
|---|---|
| **Overview** | summary + KPIs |
| **Details** | full data |
| **Process** | workflow / dependencies / manual-vs-automation |
| **AI Insights** | predictions / recommendations / accuracy / explainability / responsible AI |
| **Transactions** | activity log / decision log / status changes / audit trail |
| **Reports** | charts + trends |
| **Governance** | policy / compliance |
| **Actions** | approve · edit · assign · escalate · override |

### 2.1 Sub-tab examples

- **Process tab** → Steps · Dependencies · Manual vs Automation · Bottlenecks
- **AI tab** → Predictions · Recommendations · Accuracy · Explainability · Responsible AI
- **Transactions tab** → Activity Log · Decision Log · Status Changes · Audit Trail

---

## 3. Universal component contract (every major component)

Every component must implement these layers:

| Layer | Must contain |
|---|---|
| **Input** | form / API / event / document |
| **Process** | business logic + workflow + AI inference |
| **Output** | result / decision / transaction / alert |
| **Operations** | edit · approve · assign · escalate |
| **History** | who / what / when / why (logged) |
| **Visualization** | table · KPI card · trend · flow view |
| **Scoring** | risk · confidence · severity · priority |
| **Recommendation** | next-best-action |
| **Governance** | policy check · compliance status |
| **Explainability** | reason · factors · confidence · interpretability |

### 3.1 Universal data flow

```
Input → Validation → Workflow → AI → Decision → Action → Output → Log → Monitor → Report → Govern
```

---

## 4. Must-capture entities

If it's important, it must be a first-class entity:

| Entity | Why |
|---|---|
| Task | track work |
| Decision | audit + explainability |
| Document | traceability + RAG |
| Communication | context + collaboration |
| Incident | learning + support |
| Dependency | bottleneck tracking |
| Policy check | compliance |
| AI recommendation | trust + review |
| Override | accountability |
| Outcome | feedback loop |

**Brutal rule:** if it is not in the system, it does not exist.

---

## 5. Required lifecycles

| Entity | Lifecycle |
|---|---|
| **Task** | created → assigned → in-progress → blocked → completed → closed |
| **Decision** | pending → recommended → approved / rejected / overridden |
| **Document** | uploaded → processed → validated → approved → archived |
| **Incident** | open → triaged → investigating → resolved → closed |
| **AI Model** | training → validated → deployed → monitored → retired |

### 5.1 Must-log fields (on every entity change)

`created_by`, `created_at`, `updated_by`, `updated_at`, `old_value`, `new_value`, `ai_run_id_used`, `approval_reason`, `rejection_reason`, `override_reason`, `policy_result`.

---

## 6. AI coverage model

### 6.1 Core AI (ship first)

| Type | Use |
|---|---|
| Predictive AI | forecast · risk · delay |
| Decision AI | rank · recommend · route |
| Document AI | extract fields from contracts / invoices / forms |
| NLP | summarize · classify · interpret |
| RAG | grounded Q&A over enterprise knowledge |
| Transactional AI | execute workflow steps |
| Automation tools | n8n · RPA orchestration |

### 6.2 Advanced AI (later)

CV (image inspection) · DL (complex patterns) · Physical AI (robotics) · Quantum AI (experimental).

**Advice:** most depts do NOT need quantum / robotics / advanced DL to transform. Start with Document AI + NLP + RAG + predictive ML + decision logic + automation.

---

## 7. Governance / Trust / Responsible AI (mandatory)

| Area | Must implement |
|---|---|
| Policy | enforce business rules |
| Compliance | check actions + decisions |
| Audit | full traceability |
| Explainability | why AI recommended X |
| Trust | confidence · safety · robustness scores |
| Responsible AI | fairness · bias · accountability |
| Human override | allow + log |
| Threshold controls | confidence floors + approval gates |

Every AI decision surface must show: recommendation · confidence · risk · key factors · alternatives · policy-check result · final human action.

---

## 8. Monitoring (3 kinds)

| Type | Tracks |
|---|---|
| System monitoring | uptime · latency · failures |
| Process monitoring | SLA · bottlenecks · stuck steps |
| AI monitoring | accuracy · drift · trust metrics |

### 8.1 Operations must include

daily work tracking · workload visibility · issue tracking · dependency tracking · escalation · exception handling · recovery · continuity planning.

---

## 9. Projects layer

| View | Scope |
|---|---|
| Implementation | requirements · user stories · workflow design · build · test · deploy |
| Production | release tracking · change requests · environment readiness · incident trends · rollback |

---

## 10. Business Continuity (often missed)

- Critical process identification
- Fallback workflow
- Manual backup path
- Recovery plan
- Continuity owner
- Continuity testing / failure simulation

---

## 11. Reporting categories

| Type | Purpose |
|---|---|
| Operational | daily work · SLA · backlog |
| Management | KPI · bottlenecks · approvals |
| Financial | cost · savings · impact |
| AI Performance | accuracy · drift · confidence |
| Governance | audits · policy violations |
| ROI / Value | before vs after business impact |

---

## 12. UX / Product engineering rules

| Rule | Recommendation |
|---|---|
| Left menu | 10–13 items max |
| Tabs per screen | 5–8 max |
| Components per tab | 3–6 max |
| Every screen | must allow action, not only viewing |
| Every AI screen | must show explanation |
| Every key entity | must have history |
| Every complex process | must show flow view |
| Every role | role-specific simplified UI |

### 12.1 Presentation levels (3)

- **Visual** — dashboards · KPIs · risk
- **Flowchart** — end-to-end process · dependencies
- **Operation** — exact input-process-output-execution

---

## 13. Gap analysis vs Phase 3 blueprint

Major gaps between current implementation (144 commits) and this blueprint:

| Gap | Current state | Blueprint requirement |
|---|---|---|
| **Lifecycle states** | Tasks have `status`, no enforced state machine | Formal state transitions per entity with pre/post conditions |
| **Data lineage** | None | Source → Transformation → AI → Decision → Action → Outcome graph |
| **Feedback loops** | None | AI → Decision → Outcome → Feedback → Model improvement, persisted |
| **Simulation / What-if** | Only Sales (price×promo) + Supply Chain (delay) | Full decision simulator across all entities |
| **Configurability / No-code** | Zero — workflows hardcoded in React tabs | Drag-drop workflow builder · rules engine · dynamic fields · dynamic approvals |
| **Multi-tenancy** | Single org assumed | Tenant isolation · org-level config · per-dept customization |
| **Cost / ROI tracking** | Customer pilot has 1 doc | Cost per process · AI inference cost · savings · ROI everywhere |
| **Knowledge management** | RAG corpus (8 markdown files) | SOPs · playbooks · lessons learned · best practices layer above docs |
| **Override analytics** | Not tracked | Override frequency · rejection patterns · decision delay by type |
| **Security depth** | RBAC demo-mode only | ABAC (context-based) · field-level security · PII masking · audit alerts |
| **User behavior analytics** | None | Clicks · time spent · drop-offs · override frequency |
| **Business continuity** | None | Critical process inventory · fallback workflow · recovery plan · failure sim |
| **12 OS Modules** | 5 partially covered | All 12 modules fully implemented |

**Pilots complete:** Sales (8/8) · Supply Chain (8/8) · Customer (depth pilot, core done) · Universal tab fill (all 14 depts live).

**Work remaining to reach blueprint:** ~6-12 months of focused product engineering.

---

## 14. Recommended build order

### Phase 1 — Core operational MVP (largely complete)
✅ Dashboard · ✅ Work Management (Admin Workflows tab) · 🟡 Process Management · 🟡 Decision Center · ✅ Documents (via RAG) · ✅ Reports (Manager Reports tab)

### Phase 2 — Operational maturity (partially complete)
🟡 Incidents (Manager Monitoring & Alerts) · 🟡 Monitoring (structured logs shipped) · ✅ Governance (RBAC + audit) · ✅ AI & Intelligence (Sales + SC models) · 🟡 Operations

### Phase 3 — Enterprise scale (not yet started — next roadmap)

1. **Lifecycle state machines** for Task / Decision / Document / Incident / Model entities
2. **Data lineage service** — capture every transformation; surface in UI as a graph
3. **Feedback loop** — "AI was wrong" button → correction event → retraining signal
4. **What-if simulator** — cross-entity decision comparison with cost impact
5. **Configurability** — no-code workflow builder · rules engine
6. **ABAC + field-level security + PII masking**
7. **Multi-tenancy** — if productized for external customers
8. **Knowledge layer** — SOPs / playbooks / lessons-learned library

### Phase 4 — Productization (if applicable)

Tenant setup · billing · white-label · per-org marketplace · connector library.

---

## 15. What every AI decision surface MUST show

1. Recommendation
2. Confidence score (0-1)
3. Risk score (0-1)
4. Top 3-5 factors (from feature importance or SHAP)
5. Alternative options if applicable
6. Policy-check result
7. Final human action (approved · rejected · overridden + reason)

Currently implemented: ChurnRiskTab has 1-3, partially 4. **Gap: 5-7 across the board.**

---

## 16. Final brutal summary

> If you build only screens + workflow + AI + reports → you have a feature-rich app.
>
> If you build lifecycle + history + lineage + feedback + governance + trust + ROI + configurability → you have an enterprise-grade AI Department Operating System.

We are currently in the former category. To move to the latter requires focused Phase 3 work.

---

## 17. Related policies

- [ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md](./ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md) — 9-layer AI stack (retrieval · reranking · citations · guardrails · eval · LLMOps)
- [DEPARTMENT_OPERATING_SYSTEM.md](./DEPARTMENT_OPERATING_SYSTEM.md) — 12-module master table with 9-column contract
- This doc — canonical master blueprint covering menu · tabs · components · API · schema · gaps · roadmap

When the three conflict, precedence: **this blueprint > DOS master table > AI reference architecture**. But in practice they are complementary: AI ref arch covers "how AI is built"; DOS table covers "how platform is used"; this blueprint covers "how platform is engineered as a product."

---

## 18. Appendix — Database schema (condensed)

Full schema definitions (136 columns across 40+ tables) omitted here; see source user-provided blueprint for verbatim table DDL.

**Core groups:** organization · identity · process · work · decisions · documents · AI · operations · governance · reporting · integration.

**Priority 1 MVP tables:**
`organizations`, `departments`, `teams`, `users`, `roles`, `user_roles`, `processes`, `process_steps`, `workflow_instances`, `tasks`, `task_actions`, `task_history`, `decision_cases`, `decision_recommendations`, `decision_actions`, `documents`, `document_metadata`, `document_fields`, `incidents`, `alerts`, `audit_logs`, `transaction_logs`, `kpi_definitions`, `kpi_snapshots`.

**Currently implemented (as Postgres tables in migrations 010-012):**
`dim_store`, `dim_date`, `fact_sales` (Rossmann) · `dim_sku`, `dim_supplier`, `dim_customer`, `fact_shipment` (Supply Chain) · `dim_customer_pilot`, `fact_customer_interaction`, `fact_churn_label` (Customer Telco).

**Gap:** the 24 MVP tables above are NOT yet in Postgres. They are domain-modeling targets for Phase 3.

---

## 19. Appendix — API design pattern

All APIs follow the pattern:

```
UI Screen → API → Service → DB → Event/AI → Response
```

### 19.1 Core endpoint groups

- `/v1/auth/*` · `/v1/users/*` · `/v1/roles/*`
- `/v1/org/*` · `/v1/departments/*`
- `/v1/tasks/*` · `/v1/workflows/*`
- `/v1/decisions/*` · `/v1/recommendations/*`
- `/v1/documents/*` · `/v1/rag/query` · `/v1/document-extraction/*`
- `/v1/models/*` · `/v1/ai-runs/*` · `/v1/ai-scores/*`
- `/v1/incidents/*` · `/v1/rca/*`
- `/v1/monitoring/*` · `/v1/alerts/*`
- `/v1/policies/*` · `/v1/compliance/check` · `/v1/audit/*`
- `/v1/reports/*` · `/v1/kpis/*`
- `/v1/config/*` · `/v1/integrations/*`

### 19.2 Standard response envelope

```json
{
  "status": "success",
  "data": { ... },
  "metadata": { "traceId": "...", "generatedAt": "..." },
  "errors": [ ... ]
}
```

### 19.3 Every action emits an event

`task.created` · `task.assigned` · `task.completed` · `decision.recommended` · `decision.approved` · `decision.overridden` · `document.uploaded` · `document.extracted` · `incident.opened` · `incident.resolved` · `policy.violation.detected` · `report.generated`.

---

## 20. One-line summary

> **Capture everything · automate what is repeatable · let AI recommend · let humans approve exceptions · log every action · measure every outcome.**
