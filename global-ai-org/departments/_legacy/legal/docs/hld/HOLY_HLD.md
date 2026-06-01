# HOLY Beverage — Legal High-Level Design (HLD)

**Source:** operator brief 2026-05-21. **Status:** Draft, per-dept.

## 1. Department scope

This HLD covers the Legal department's AI + automation platform within HOLY's
broader enterprise architecture (per `global-ai-org/` per §63).

## 2. Primary AI categories

NLP, OCR, RAG, Document AI, Compliance AI

## 3. Context (C4 Level 1)

```
External Actors                       HOLY Platform                  External Systems
─────────────                         ──────────────                 ─────────────────
Consumers           ─────────►        Legal                       ◄─────  Suppliers
Retailers           ─────────►        AI Platform                    ◄─────  Distributors
Employees           ─────────►        ↑                              ◄─────  Regulators
                                      └── HOLY Operating System
                                          (other 11 depts)
```

## 4. Container view (C4 Level 2)

```
Legal App
├── Frontend (React)               — operator + executive UI
├── Backend API (FastAPI)          — REST endpoints, auth, RBAC
├── Worker (Celery)                — async ML jobs
├── AI Models (Ollama / external)  — inference
├── Data store (Snowflake / PG)    — analytics + transactional
├── Vector store                   — RAG embeddings
└── Telemetry (OTel + Grafana)     — observability
```

## 5. Cross-department dependencies

- Reads from: Sales (revenue), Operations (capacity), Marketing (campaigns), Customer Experience (sentiment)
- Writes to: Executive Leadership (KPIs), Governance (audit trail)
- Shared services: Auth, RBAC/ABAC, Audit, Model Registry, Vector DB

## 6. Non-functional requirements

| NFR | Target |
|---|---|
| API latency (p95) | < 500ms |
| Council inference latency | < 30s (CPU baseline) / < 5s (GPU) |
| Forecast accuracy (where applicable) | improving MAPE quarter-over-quarter |
| Availability | 99.5% |
| Audit retention | 7 years (regulated) / 1 year (non-regulated) |

## 7. Compose with

- `docs/lld/HOLY_LLD.md` — low-level design (API + DB + flow)
- `docs/sad/HOLY_SAD.md` — solution architecture document
- `HOLY_TECH_STACK.md` — stack inventory
- `HOLY_NAV.json` — process / sub-process navigation
- `business-layer/HOLY_SPEC.md` — department specification
- Global §47 (architecture standards), §63 (folder structure)
