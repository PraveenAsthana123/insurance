# ADR-001: Docker Compose for First 1K Users; Kubernetes for Scale

- **Status**: Accepted
- **Date**: 2026-06-01
- **Deciders**: Operator + Platform
- **Tags**: infrastructure, deployment, scaling

## Context

Project is an insurance AI platform. Production target ranges from pilot (10
internal users) → SMB B2B (100 customers) → 100K concurrent users.

Two deployment models considered:
1. Docker Compose (current state) — single-host, easy local, can scale per-service via `--scale N`
2. Kubernetes (EKS / GKE / on-prem) — multi-host, autoscaling, HA, service mesh

## Decision

**Use Docker Compose for the first 1,000 paying customers.**
**Plan migration to Kubernetes (EKS) before crossing 1K MAU.**

## Rationale

- Operator team has 1 platform engineer at this stage; k8s adds operational cost (cluster ops, kubectl skill, RBAC, secrets, ingress, etc.) without proportional benefit at < 1K users.
- Docker Compose has handled the architectural patterns (Council, Hub-and-spoke, agents, council_agents, scalable workers) per global §64.43 #1.
- nginx LB (per [infra/nginx/nginx.conf](../../../infra/nginx/nginx.conf)) handles round-robin + rate limiting + TLS termination.
- Cloudflare CDN (per [infra/cdn/](../../../infra/cdn/)) handles edge + WAF without k8s.
- Single Postgres can handle 1K customers; PgBouncer can be added before then.

## Consequences

### Positive
- Lower ops burden in pilot + growth phase
- Faster iteration cycles
- nginx + Cloudflare cover most LB/CDN/WAF needs
- Existing scaffolding works as-is

### Negative
- Single-host blast radius
- No autoscaling (manual `docker compose --scale N` only)
- No multi-region DR

### Risks accepted
- Single point of failure in dev/staging (acceptable; prod uses managed services)
- Manual scaling lag during traffic spikes (mitigated by capacity buffer)

## Alternatives considered

- **AWS ECS**: Tighter AWS integration but vendor lock-in
- **Nomad + Consul**: Lighter than k8s but smaller ecosystem
- **k8s now**: Premature; ops cost exceeds value at current scale
- **Serverless (Lambda)**: Cold-start cost + 15-min limit incompatible with ML pipelines

## Migration trigger

Move to Kubernetes when ANY of these triggers fires:
- 1,000+ MAU sustained
- Multi-region requirement (regulatory or latency)
- p99 latency SLA tightens beyond what single-host can guarantee
- Compliance requirement for autoscaling / HA
- 2nd platform engineer hired

## References

- Global §47 architecture surfaces (this decision is captured at C4 L1)
- Global §41 cost / FinOps (k8s adds ~$300-1000/mo baseline EKS cost)
- [infra/nginx/nginx.conf](../../../infra/nginx/nginx.conf) — current LB
- [infra/cdn/cloudfront/main.tf](../../../infra/cdn/cloudfront/main.tf) — CDN scaffold

## History

| Date | Change |
|---|---|
| 2026-06-01 | Initial — addressed §47.3 missing-ADR brutal review item |
