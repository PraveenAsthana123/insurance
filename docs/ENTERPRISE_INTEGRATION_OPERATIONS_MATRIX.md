# Enterprise Integration Operations Matrix

This matrix lists the integration components for an advanced INSUR platform: circuit breaker, service discovery, Istio/Kiali, API gateways, load balancing, DB viewer, gRPC, Redis, Memcached, Ollama/Kivi, operations, and threshold setup.

Status labels:

- `wired`: present in the local repo/runtime path
- `partial`: config or API exists, but not fully production-wired
- `target`: architecture target only; do not claim production integration yet
- `not selected`: not currently used; needs a selection decision before setup

## Integration Catalog

| Integration | Status | Current / Target Setup | Operations | Baseline Thresholds |
|---|---|---|---|---|
| External API gateway | partial | NGINX gateway at `http://localhost:8080`; production target is CDN/WAF/API gateway before ingress. | route external traffic, enforce tenant headers, rate-limit public APIs, emit request ids. | API: `100r/s` per tenant, burst `50`; IP global `1000r/s`, burst `200`; connect timeout `5s`, read/send `60s`. |
| Internal API gateway | partial | FastAPI internal API plus local OpenClaw/Paperclip/agent-platform routers; target is internal gateway or service mesh ingress. | route service-to-service calls, centralize RBAC/OPA checks, publish OpenAPI catalog. | p95 internal API latency `<300ms`; 5xx `<1%`; auth/tenant header missing = deny. |
| Load balancer | wired | `infra/nginx/nginx.conf` uses `least_conn` upstream to `backend:8000` and `frontend:3000`. | balance backend/frontend, health-check, isolate failed upstream. | `max_fails=3`, `fail_timeout=30s`, backend keepalive `32`, frontend keepalive `16`. |
| Circuit breaker | partial | Mentioned in RAG/worker lifecycle; target is shared resilience module for Ollama, OpenClaw, DB viewer, external APIs, workers. | stop calls to unhealthy downstreams, fail fast, half-open probe, record breaker state. | open after `5` failures or `50%` failures over `20` calls; open `30s`; half-open `3` probes; request timeout `5s` API, `60s` Ollama, `900s` ML pipeline. |
| Service discovery | partial | Docker Compose DNS service names: `backend`, `frontend`, `redis`, `ollama`, `postgres`, `mlflow`. Target production: Kubernetes Services + DNS. | resolve service endpoints, remove hardcoded hosts, support scaling. | DNS resolution failure = P1 for core services; service registry freshness `<30s`. |
| Istio service mesh | target | Not wired in Docker Compose. Production target for Kubernetes mTLS, traffic policy, retries, telemetry. | mTLS, retries, timeouts, traffic splitting, fault injection, egress policy. | mTLS strict; retry `2`; per-try timeout `2s` for APIs; outlier ejection after `5` consecutive 5xx. |
| Kiali | target | Not wired; requires Istio + Kubernetes. | mesh topology, mTLS visibility, traffic graph, service health. | service error rate warning `>1%`, critical `>5%`; p95 latency warning `>500ms`, critical `>2s`. |
| gRPC | partial | Observability stack exposes OTLP gRPC `4317`; Phoenix gRPC `4319`; Jaeger OTLP gRPC `14317`. Business gRPC APIs are not wired. | tracing ingestion, future high-throughput service contracts. | gRPC error rate `<1%`; p95 `<200ms` internal; max message size explicitly configured before business use. |
| DB viewer integration | wired | `/api/v1/insur/dbviewer/*` plus process-table catalog and RBAC read roles. | inspect database/schema/table/sample, map process to tables, support PII-aware review. | sample rows max should stay bounded; PII columns redacted; cross-tenant access denied. |
| Redis queue/cache | wired | `redis:6379`, Celery broker/backend, OpenClaw task queues, agent heartbeats, scheduler metadata. | queue tasks, store results, heartbeats, schedules, broker async jobs. | queue backlog warning `>50` with no live heartbeat; Redis connect timeout `5s`; heartbeat stale `>60s`; failed recent results `>3` = unhealthy. |
| Memcached | not selected | Not present. Use only if a simple ephemeral cache is needed and Redis should stay queue/session focused. | cache read-heavy non-critical values; never store tasks, locks, auth, or durable state. | item TTL `5m-30m`; hit ratio target `>80%`; memory eviction warning `>5%` items/min. |
| Ollama runtime | wired | Docker service `ollama`; agents use `OLLAMA_URL=http://ollama:11434`; host may already use `11434`. | local generation, embeddings, RAG, council agent calls. | default request timeout `60s`; model unavailable = degrade/fallback; queue AI calls separately from API requests. |
| Kivi coding model | wired local profile | `AGENT_MODEL=kivi:local`; council author/reviewer/chair default to `kivi:local`; created via `ollama_models/kivi.Modelfile`. | fast local coding/ops agent for 100-agent throughput. | small-task p95 `<60s`; failure rate `<5%`; token/context budget enforced by task type. |
| LLM gateway | partial | `backend/services/llm_gateway.py` candidate; LiteLLM/Portkey/Helicone selection is governed by tool matrix. | provider fallback, cost logging, latency tracking, model routing. | timeout `30-60s`; retry `1`; cost/run logged; gateway disabled by default unless explicitly enabled. |
| OpenClaw bridge | wired local | FastAPI `/api/v1/openclaw/*` -> Redis queues -> workers/council. External OpenClaw gateway not bundled. | submit tasks, inspect queue status, poll results. | task enqueue must return id; queue status must show Redis availability; external gateway false until installed. |
| Agent supervisor | wired | `scripts/agent_fleet.sh supervisor`, `supervisor-health`, `supervisor-report`. | monitor queues, heartbeats, schedules, recent results. | fail if Redis unavailable, pending `>50` and no heartbeats, or recent failures `>3`. |
| Observability stack | partial | Optional compose: OTel Collector, Jaeger, Prometheus, Grafana, Phoenix. | traces, metrics, dashboards, AI/RAG trace debugging. | Prometheus retention `15d`; OTLP gRPC `4317`; OTLP HTTP `4318`; dashboard uptime `>99%` local target. |
| Prometheus/Grafana | partial | Optional observability compose. | metrics scrape, alert dashboards, queue/API/model charts. | API 5xx warn `>1%`, critical `>5%`; CPU warn `>80%`; memory warn `>85%`; disk warn `>80%`. |
| Jaeger | partial | Optional observability compose UI `16686`. | trace request -> service -> Redis -> worker -> Ollama. | trace sample `100%` local, lower in prod by traffic class; missing trace on governed action = P2. |
| Phoenix | partial | Optional UI `6006`, gRPC `4319`. | RAG/LLM trace and evaluation debugging. | groundedness mean target `>=0.5` existing eval baseline; production target should be raised per use case. |
| Kafka/event bus | target | Not wired; Redis queues are current local substitute. | durable events, DLQ, replay, consumer groups. | DLQ rate `<0.1%`; consumer lag warning `>1000` messages or `>5m`. |
| Temporal durable workflow | target | Placeholder worker exists; server/workflows not wired. | durable schedules, retries, approvals, compensation. | workflow failure `<1%`; activity retry max `3`; stuck workflow age warning `>30m`. |
| OPA policy engine | target/partial | Policy folder exists; runtime OPA sidecar/server not wired. | central deny/allow decisions for tools, API, CUA, production actions. | default deny for unknown tool/action; policy eval p95 `<50ms`. |

## Operation Catalog

| Operation | Command / Portal | Owner | Pass Signal |
|---|---|---|---|
| Start core stack | `docker compose up -d postgres redis backend frontend` | Operator | backend `8000` and frontend `3000` reachable. |
| Start gateway | `docker compose up -d nginx` | Platform | `http://localhost:8080/nginx_status` reachable from allowed network. |
| Start agent runtime | `docker compose up -d ollama redis` | AI platform | Ollama and Redis healthy. |
| Start 100 Kivi agents | `./scripts/agent_fleet.sh start-100-kivi 100 100` | AI platform | heartbeats live and queues drain. |
| Check OpenClaw | `curl http://localhost:8000/api/v1/openclaw/status` | AI platform | Redis available and queues listed. |
| Check agent platform | `./scripts/setup_agent_platform.py status` | AI platform | tool readiness printed. |
| Run supervisor | `./scripts/agent_fleet.sh supervisor` | Operator | queue/heartbeat/result report visible. |
| Health gate | `./scripts/agent_fleet.sh supervisor-health` | Release owner | exit code zero. |
| Start observability | `docker compose -f infra/observability/docker-compose.observability.yml up -d` | SRE | Grafana, Prometheus, Jaeger, Phoenix reachable. |
| Inspect traces | Jaeger `http://localhost:16686` | SRE | API/worker/model spans visible when instrumentation is wired. |
| Inspect metrics | Prometheus `http://localhost:9090`, Grafana `http://localhost:3001` | SRE | scrape targets up, dashboards loaded. |
| Inspect AI traces | Phoenix `http://localhost:6006` | AI platform | RAG/LLM spans visible when exporters are wired. |
| Inspect DB viewer | `http://localhost:8000/api/v1/insur/dbviewer/_global` | Data owner | tenant-scoped metadata returned. |
| Validate frontend | `cd frontend && npm run lint && npm run build` | Frontend | lint/build pass. |
| Validate project | `./scripts/project_doctor.sh` | Release owner | default gate passes or blocker documented. |

## Recommended Threshold Setup

### Gateway And API

| Metric | Warn | Critical | Action |
|---|---:|---:|---|
| API 5xx rate | `>1%` for 5m | `>5%` for 5m | inspect backend logs, circuit breakers, recent deploy. |
| API p95 latency | `>500ms` | `>2s` | check DB, Redis, downstream model calls. |
| Gateway 502/503/504 | `>10/min` | `>100/min` | check upstream health and NGINX upstream failures. |
| Tenant rate limit hits | `>100/min` | `>1000/min` | inspect tenant workload or abuse. |

### Redis And Agent Queues

| Metric | Warn | Critical | Action |
|---|---:|---:|---|
| Pending simple/council queue | `>50` without drain | `>500` | scale agents or stop producers. |
| Heartbeat age | `>60s` | `>180s` | restart matching worker class. |
| Recent malformed/failed results | `>3` sampled | `>10` | inspect task IDs and worker logs. |
| Redis memory | `>80%` | `>90%` | compact queues/results, increase memory, add TTL policy. |

### Ollama/Kivi

| Metric | Warn | Critical | Action |
|---|---:|---:|---|
| Ollama request timeout | `>60s` | `>120s` | reduce model size, split task, check GPU/CPU. |
| Kivi task failure rate | `>5%` | `>15%` | inspect prompt/task type, route to council or coding model. |
| AI queue age | `>5m` | `>30m` | scale workers or pause AI producers. |
| Hallucination/grounding score | below use-case threshold | repeated below threshold | route to AI eval and governance review. |

### DB Viewer And Database

| Metric | Warn | Critical | Action |
|---|---:|---:|---|
| DB connect failure | any | sustained `>5m` | check Postgres container/credentials/port conflict. |
| Slow table metadata | `>1s` | `>5s` | add indexes/cache, inspect catalog size. |
| PII leak in sample | any | any | block release, run security/governance review. |
| Cross-tenant access | any | any | P0; stop release. |

### Observability

| Metric | Warn | Critical | Action |
|---|---:|---:|---|
| Missing trace for governed action | any | repeated | fix instrumentation before promotion. |
| Prometheus target down | `>2m` | `>10m` | restart target/exporter. |
| Grafana unavailable | `>5m` | `>30m` | restart observability stack. |
| Phoenix unavailable during AI eval | `>5m` | `>30m` | use local logs, then repair trace stack. |

## Advanced Setup Order

1. Keep NGINX gateway and Redis/OpenClaw stable locally.
2. Extract a shared circuit-breaker/resilience module and apply it to Ollama, OpenClaw, DB viewer, and external API clients.
3. Wire OpenTelemetry spans through FastAPI, services, Redis enqueue/dequeue, workers, DB calls, and Ollama calls.
4. Enable Prometheus/Grafana/Jaeger/Phoenix dashboards for local observability.
5. Add OPA policy runtime for tool/API/CUA authorization.
6. Move service discovery from Docker DNS to Kubernetes Services when production Kubernetes exists.
7. Add Istio and Kiali only after Kubernetes manifests are ready.
8. Introduce Kafka/Temporal only for workflows that exceed Redis/Celery reliability needs.
9. Evaluate Memcached only if Redis memory pressure or cache/queue separation becomes necessary.
10. Keep Kivi/Ollama as the fast local model path; route high-risk coding/design to council or stronger external models only through approved gateways.

## Top-Level Rule

Do not mark target integrations as production-wired until the repo has code/config, startup command, health check, runbook, tests, thresholds, and rollback guidance for that integration.
