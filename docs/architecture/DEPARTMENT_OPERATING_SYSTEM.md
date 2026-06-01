# Department Operating System — Master Table

**Status:** POLICY (normative, binding for Phase 2+ functional decomposition)
**Adopted:** 2026-04-19 (user-provided canonical reference)
**Scope:** Every department inherits this 12-module OS. Every tab in the system must honor the 9-column contract (Input · Process · Output · AI · Governance · History · Reporting).

This policy sits alongside [ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md](./ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md) — that one covers *how AI is built*, this one covers *how the platform is used*.

---

## The 9-Column Contract

Every tab (regardless of which Main Menu it belongs to) commits to all nine:

| Column | Meaning |
|---|---|
| **Component** | UI element that renders this tab (Panel, Table, Graph, Chart, Form) |
| **Input** | What data enters this tab |
| **Process** | What transformation happens |
| **Output** | What the user / downstream sees |
| **AI Used** | Which AI capability, if any (ML, DL, NLP, RAG, Decision AI, XAI, Responsible AI, Predictive, Document AI, Graph AI) |
| **Governance** | Policy / rule / compliance gate that applies |
| **History** | What is logged for audit and replay |
| **Reporting** | What analytics / report rolls up from this tab |

Tabs that can't populate all nine are **not ready to ship** — either a column is under-defined (governance, history) or the feature is purely cosmetic (no real Input/Process/Output).

---

## The 12 Main Menus

### 1. Dashboard
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Overview | Overview | KPI Cards | KPI data | aggregate | metrics | ML (forecast) | threshold check | snapshot logs | KPI trends |
| Alerts | Overview | Alert Panel | events | rule + AI detect | alerts | Predictive AI | severity rules | alert logs | alert report |
| AI Insights | AI | Recommendation Panel | process data | scoring | recommendation | Decision AI | approval policy | decision logs | impact report |

### 2. Work
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| My Tasks | Overview | Task Table | task data | filter/sort | task list | — | SLA rules | task history | workload report |
| Task Detail | Details | Task Panel | form + docs | validate | structured task | NLP | validation rules | changes log | completion stats |
| Workflow | Process | Workflow Tracker | process config | state tracking | step status | — | process rules | step logs | bottleneck report |
| AI Suggestions | AI | Suggestion Panel | task + model | prediction | suggestion | ML/NLP | approval check | AI logs | accuracy report |

### 3. Decision
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Pending | Overview | Decision List | case data | filter | decision queue | — | approval rules | decision logs | approval stats |
| Recommendation | AI | Decision Panel | data + doc | scoring | recommendation | Decision AI | policy check | decision history | decision quality |
| Explainability | AI | Explain Panel | model output | factor analysis | reasoning | Explainable AI | compliance check | explanation logs | trust report |
| Overrides | Actions | Override Panel | user input | override logic | final decision | — | audit rules | override logs | override rate |

### 4. Documents
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Documents | Overview | Document List | files | index | doc list | — | access control | doc logs | usage report |
| Extraction | AI | Extract Panel | PDF/doc | extract fields | structured data | Document AI | validation | extraction logs | accuracy report |
| RAG | AI | Search Panel | query | retrieve + generate | answer | RAG | source validation | query logs | search usage |
| Version | Transactions | Version Panel | doc changes | version control | versions | — | audit rules | version logs | change report |

### 5. AI
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Models | Overview | Model List | model data | catalog | model view | — | approval | model logs | model usage |
| Runs | Details | Run Panel | input data | inference | prediction | ML/DL | validation | run logs | performance |
| Accuracy | AI | Metrics Panel | results | evaluation | metrics | ML | threshold | metric logs | accuracy trends |
| Explainability | AI | Explain Panel | model output | analysis | explanation | XAI | compliance | explanation logs | trust report |
| Responsible | Governance | Ethics Panel | model data | bias check | fairness score | Responsible AI | policy | audit logs | ethics report |

### 6. Operations
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Daily Ops | Overview | Ops Panel | tasks | tracking | status | — | SLA | ops logs | efficiency report |
| Issues | Details | Issue Panel | issue data | classify | issue | NLP/ML | escalation | issue logs | issue trends |
| Dependency | Process | Dependency Graph | process | link | dependency | Graph AI | validation | dependency logs | delay report |

### 7. Projects
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Implementation | Overview | Project Panel | requirements | plan | roadmap | — | approval | project logs | progress report |
| Deployment | Process | Release Panel | build data | deploy | release | — | release rules | release logs | deployment report |

### 8. Incidents
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Active | Overview | Incident Panel | logs/events | detect | incident | ML | severity rules | incident logs | incident report |
| RCA | Details | RCA Panel | logs | analysis | root cause | ML/NLP | review | RCA logs | RCA report |
| Resolution | Actions | Fix Panel | issue | resolve | fix | — | validation | resolution logs | MTTR report |

### 9. Reports
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| KPI | Overview | KPI Panel | metrics | aggregate | KPI | ML | target rules | KPI logs | KPI dashboard |
| Financial | Details | Finance Panel | cost | analyze | report | ML | audit | finance logs | cost report |
| AI | AI | AI Report | model data | analyze | report | ML | governance | AI logs | AI ROI |

### 10. Governance
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Policies | Overview | Policy Panel | rules | validate | pass/fail | — | enforcement | policy logs | compliance report |
| Audit | Transactions | Audit Panel | actions | track | audit | — | compliance | audit logs | audit report |
| Trust | AI | Trust Panel | AI runs | evaluate | trust score | AI | governance | trust logs | trust report |

### 11. Monitoring
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Health | Overview | Health Panel | metrics | monitor | status | ML | thresholds | logs | health report |
| Alerts | Details | Alert Panel | logs | detect | alerts | ML | severity | alert logs | alert trends |
| Trace | Transactions | Trace Panel | events | trace | flow | — | audit | trace logs | trace report |

### 12. Admin
| Sub | Tab | Component | Input | Process | Output | AI | Governance | History | Reporting |
|---|---|---|---|---|---|---|---|---|---|
| Users | Overview | User Panel | user data | manage | users | — | RBAC | user logs | user report |
| Workflow | Process | Config Panel | config | validate | workflow | — | policy | config logs | config report |
| AI Config | AI | Model Config | settings | apply | config | — | governance | config logs | usage report |

---

## What This Guarantees

✅ **Everything is captured** — task · decision · document · communication · incident
✅ **Everything is structured** — input · process · output
✅ **Everything is explainable** — AI reasoning · confidence · factors
✅ **Everything is governed** — policy · compliance · audit
✅ **Everything is measurable** — KPI · ROI · accuracy

---

## Mapping to Current Implementation (as of 2026-04-19)

Current tabs in the BEV app (Admin + Manager) cover ~5 of the 12 modules:

| Master Menu | Current Coverage |
|---|---|
| 1. Dashboard | ✅ Dashboard page + per-dept Overview tab with live KPI tiles |
| 2. Work | 🟡 Admin → Workflows tab (partial — 193 workflows catalogued, no task tracking) |
| 3. Decision | ❌ Not yet — only SimulationTab touches scenario decisions |
| 4. Documents | ❌ Not yet — RAG corpus exists but no Documents hub |
| 5. AI | 🟡 Admin → AI Use Cases + Model Registry tabs (partial — 77 use cases catalogued) |
| 6. Operations | 🟡 Manager → Status & Health partial |
| 7. Projects | ❌ Not yet |
| 8. Incidents | 🟡 Manager → Monitoring & Alerts partial |
| 9. Reports | 🟡 Manager → Reports tab (catalog only, 23 report types) |
| 10. Governance | 🟡 Admin → Audit Log + Permissions partial |
| 11. Monitoring | 🟡 Admin → Scheduled Jobs + Manager → Status & Health partial |
| 12. Admin | ✅ AdminPage shell + Users & Roles, Permissions, MCP Servers, Settings tabs live |

Gaps that require new UI:
- **Decision** hub (Pending queue · Recommendation · Explainability · Overrides)
- **Documents** hub (Documents list · Extraction · RAG search · Versions)
- **Projects** hub (Implementation · Deployment)

---

## Enforcement Rules (Phase 2b onwards)

1. No new tab ships without populating all 9 contract columns in a companion `docs/tabs/<module>/<tab>.md`.
2. Every tab emits an **event row** via `emit_event("<module>.<tab>.<action>", ...)` — auto-flows into the History column.
3. The dept-vertical Admin/Manager shell stays; the 12-module horizontal navigation is added as a **second axis** (top-bar menu or left-sidebar section).
4. Each dept **inherits** the 12 modules with dept-specific data. Cross-dept rollup views exist at `/os/<module>` (global).
5. AI-powered tabs MUST pass the Enterprise AI Reference Architecture gates (citations, guardrails, evaluation) — not this policy, but this policy defers to that one.

---

## Open Architectural Decisions (to be resolved per dept)

- **Routes** — `/:dept/work` vs `/work?dept=:dept`? I recommend dept-scoped for ergonomics.
- **Cross-dept rollup** — `/os/work` shows tasks across all 14 depts. Who owns it (CEO role?)?
- **Permission model** — Decision module touches high-stakes approvals. Who can override vs recommend?
- **Document storage** — RAG corpus lives in markdown today. Production: S3? SharePoint connector?

These are not in scope for saving the policy but need to be resolved before implementation.
