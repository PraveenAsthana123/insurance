# HOLY Beverage — Procurement Network Flow

**Source:** operator brief 2026-05-21. Describes the runtime network topology + flows.

## Ingress

```
Internet
    ↓
Cloud LB (ALB / GLB)
    ↓ TLS termination
API Gateway (rate-limit + auth)
    ↓ mTLS within VPC
FastAPI service (Kubernetes Deployment)
```

## Inter-service traffic (within VPC)

```
Procurement API ──HTTP──► Auth Service           (RBAC + ABAC checks)
              ──HTTP──► Other dept APIs       (cross-dept reads)
              ──TCP───► PostgreSQL            (primary OLTP)
              ──TCP───► Redis                 (cache + queue)
              ──HTTP──► Ollama / Inference    (LLM calls)
              ──HTTP──► Vector DB             (RAG retrieval)
              ──HTTP──► Snowflake             (analytics queries)
              ──gRPC──► Model Registry        (MLflow)
              ──UDP───► OpenTelemetry Coll.   (spans + metrics)
              ──HTTP──► Audit Sink            (decision audit)
```

## Egress (external)

```
Procurement API ──HTTPS──► Vendor APIs            (Salesforce / SAP / etc.)
              ──HTTPS──► LLM provider         (OpenAI / Anthropic — when not local)
              ──HTTPS──► CDN / Object Store   (S3 / Cloudflare R2)
              ──HTTPS──► Telemetry SaaS       (Datadog / Honeycomb)
```

## Async + event flows

```
Event source                   Topic / Queue            Consumer
─────────────                  ───────────────          ──────────
Frontend UI       ──►          procurement_user_events       analytics-svc
Backend API       ──►          procurement_audit              audit-store
ML Worker         ──►          procurement_predictions        prediction-store
Drift detector    ──►          procurement_alerts             on-call PagerDuty
Council ask       ──►          council_tasks (Redis)     council_agents
```

## Network policies (Kubernetes NetworkPolicy)

| Source pod | Destination | Port | Protocol |
|---|---|---|---|
| procurement-api | postgresql | 5432 | TCP |
| procurement-api | redis | 6379 | TCP |
| procurement-api | ollama | 11434 | TCP |
| procurement-api | otel-collector | 4317 | gRPC |
| procurement-api | (other dept APIs) | 8000 | HTTP via service mesh |
| (internet) | api-gateway | 443 | TLS |

## DR + failover

- Primary region: AWS us-east-1
- DR region: AWS us-west-2 (warm standby)
- RTO: 1 hour (per §41.2 Tier 2)
- RPO: 15 min (DB backup cadence)
- Failover trigger: API health check failure > 5 min OR manual operator declaration

## Compose with

- `../hld/HOLY_HLD.md` — system context
- `../lld/HOLY_LLD.md` — endpoint inventory
- `../c4-model/HOLY_C4.md` — L1–L7 diagrams
- `../../HOLY_TECH_STACK.md` — tools that fill each box
