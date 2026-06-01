# Responsible AI Framework — 5 Pillars (Executive Framing)

> **User-centric · Enterprise-ready · Audit-proof**
>
> Cross-cutting executive framing aligned with EU AI Act, NIST AI RMF,
> and ISO 42001. The 5 pillars (Privacy / Transparency / Robustness /
> Safety / Accountability) provide a board-room vocabulary; the
> 11 frameworks (101–111) provide the engineering-grade vocabulary.
> They are two views of the same surface.

## One-line summary (executive-ready)

> User privacy is protected by design, system behavior is transparent,
> operations are robust and safe, and every AI action is fully
> accountable and auditable.

## Mapping — 5 pillars ↔ 11 frameworks

| Pillar | Owns (frameworks) | Reads from (frameworks) |
|---|---|---|
| **Privacy** | 105 Auditable | 102 Trustworthy, 103 Safe, 109 Responsible GenAI |
| **Transparency** | 102 Trustworthy | 104 Accountable, 105 Auditable, 110 Debug |
| **Robustness** | 101 Reliable, 107 Monitoring | 106 Lifecycle, 110 Debug, 111 Portability |
| **Safety** | 103 Safe, 109 Responsible GenAI | 104 Accountable, 107 Monitoring |
| **Accountability** | 104 Accountable, 105 Auditable | All (every framework names an owner) |

## 1️⃣ User Privacy

**Goal:** User data is protected, minimized, and never misused.

| Plane | Items |
|---|---|
| **Principles** | Data minimization by default · Purpose limitation · No unauthorized sharing · Privacy by design + by default |
| **Enforced controls** | PII/PHI detection + redaction before any AI processing · No-training / no-retention model configuration · On-device / edge processing for sensitive data · Encryption at rest + in transit (CMEK) · Strict retention + deletion policies |
| **User rights** | View what data was used · Request deletion / correction · Opt-out of AI processing |
| **Evidence** | DLP logs · redaction reports · retention timers · access logs |

Detailed enforcement: see [`data_governance.md`](data_governance.md).

## 2️⃣ Transparency

**Goal:** Users understand what the system does and why.

| Plane | Items |
|---|---|
| **What must be transparent** | When AI is used · What data categories are involved · Which model / system is acting · Why a decision or output was generated |
| **User-facing mechanisms** | Operation-level notifications · AI activity timeline / audit view · Plain-language explanations · Model disclosure (AI-assisted / automated / human-in-loop) |
| **System transparency** | Versioned models + policies · Logged decision paths · Explainability artefacts where applicable |
| **Evidence** | User notifications · explanation logs · model/version registry |

Detailed mechanisms: see [`trustworthy_ai.md`](trustworthy_ai.md) +
[`auditable_ai.md`](auditable_ai.md) + EU AI Act Art. 50 disclosure.

## 3️⃣ Robustness

**Goal:** The system is reliable, resilient, and performs as expected.

| Plane | Items |
|---|---|
| **Technical robustness** | Input validation + schema enforcement · Adversarial-prompt protection · Fallback logic (graceful degradation) · Human-override mechanisms |
| **Operational robustness** | Continuous monitoring (drift, bias, performance) · Fail-safe defaults · Redundancy for critical operations |
| **Testing** | Stress tests · edge-case simulations · failure-injection tests |
| **Evidence** | Test reports · monitoring dashboards · fallback logs |

Detailed implementation: see [`reliable_ai.md`](reliable_ai.md) +
[`monitoring_drift.md`](monitoring_drift.md) + [`debug_ai.md`](debug_ai.md).

## 4️⃣ Safety

**Goal:** Prevent harm to users, systems, and society.

| Plane | Items |
|---|---|
| **Safety dimensions** | Physical (robotics, autonomous systems) · Psychological / social · Cybersecurity · Misuse / abuse prevention |
| **Safety controls** | Policy-based guardrails · Content + action filtering · Role-based permissions · Kill-switch / emergency stop (for robots + agents) · Human-in-the-loop for high-risk actions |
| **Risk management** | Hazard identification · Risk scoring + mitigation plans · Incident-response playbooks |
| **Evidence** | Safety policies · incident logs · mitigation records |

Detailed implementation: see [`safe_ai.md`](safe_ai.md) +
[`responsible_genai.md`](responsible_genai.md).

## 5️⃣ Accountability

**Goal:** Every action is traceable, owned, and reviewable.

| Plane | Items |
|---|---|
| **Accountability structure** | Clear ownership per AI system · Defined roles + responsibilities (RACI) · Separation of duties (build vs approve vs operate) |
| **Audit + traceability** | Immutable audit logs · Actor identification (user / system / admin) · Policy decision records · Consent + approval tracking |
| **User accountability** | User confirmations for sensitive actions · Action-history visibility · Dispute + escalation mechanisms |
| **Evidence** | Audit trails · approval records · governance reports |

Detailed implementation: see [`accountable_ai.md`](accountable_ai.md) +
[`auditable_ai.md`](auditable_ai.md).

## Lifecycle wrap (Responsible-by-Design)

| Phase | Validation method |
|---|---|
| **Design** | Ethics + risk review checklist · pillar-acceptance criteria embedded in requirements |
| **Build** | CI/CD fairness + safety gates · model cards + datasheets required for release |
| **Test** | Bias, privacy, robustness, hallucination test suites |
| **Deploy** | Go / no-go governance approval (per §47.11 pre-release gates) |
| **Run** | Continuous monitoring (per §68 hub) |
| **Review** | Periodic re-certification (quarterly) |

## Composes with

- **§38** — every pillar lands an audit row
- **§47** — Architecture-design surfaces (C4 / ADR / JAD / Security / Rollout / Principles / Load) provide the engineering evidence
- **§48** — Explainability is the read-side of Transparency + Accountability
- **§53** — Enterprise maturity stack (esp. 39 schema evolution, 41 change mgmt, 42 documentation, 45 continuous improvement) provides the long-horizon enforcement
- **§64.36** — 6-flavor scorecard (Analytical / Predictive / Sentimental / Output-Relevancy / Bias-Gov / Explainable) is the per-sub-process surface of the 5 pillars
- **§64.42** — testing matrix provides the OSS tooling per pillar
- **§68** — Observability Hub is the runtime surface; this doc is the design-time surface
