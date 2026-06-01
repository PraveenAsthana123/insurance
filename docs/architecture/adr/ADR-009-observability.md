# ADR-009: OpenTelemetry + Jaeger + Prometheus + Grafana

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: observability, monitoring

## Context

Per global §57.6 + §47.6: every request needs `request_id` baggage propagation;
every log + span + audit row keyed on it. Need: tracing + metrics + logs + alerting.

## Decision

**OpenTelemetry SDK (already installed) → Jaeger (traces) + Prometheus (metrics) + Loki/ELK (logs) + Grafana (dashboards).**

## Rationale

- OpenTelemetry is vendor-neutral (swap backend later without app changes)
- Jaeger is OSS, mature, good Trace UI
- Prometheus + Grafana is the de-facto OSS metrics stack
- Loki cheaper than ELK at scale; tradeoff is weaker full-text search
- Already started: `backend/core/structured_logger.py` emits structured events

## Consequences

### Positive
- One SDK (OTel) covers all 3 signal types
- Self-hosted (no SaaS billing surprise)
- Industry-standard tooling = easy hiring

### Negative
- Ops burden (Jaeger + Prom + Loki + Grafana = 4 services)
- Storage cost for traces (sampling required at scale)
- Loki is newer than ELK; some maturity gaps

## Alternatives considered

- **Datadog / New Relic**: Excellent but $30-50/host/mo + lock
- **Honeycomb**: Great query UX but cost at scale
- **AWS CloudWatch + X-Ray**: AWS lock + worse UX
- **Tempo + Loki + Grafana** (Grafana Labs stack): Strong alternative; consider if we standardize on Grafana

## Implementation status

- [x] OpenTelemetry SDK installed (per `pip list`)
- [x] Structured logger emits events
- [ ] OTel collector deployed in docker-compose (planned next)
- [ ] Jaeger + Prom + Grafana in docker-compose
- [ ] Per-tenant dashboards
- [ ] Per-dept SLO dashboards

## Migration trigger

Move to Tempo + Loki + Grafana (all Grafana Labs) if:
- We standardize on Grafana for all signals
- Want unified single-binary observability backend

## References

- Global §57.6 canonical fields
- Global §47.6 SOC2 CC7.2 anomaly detection
- `backend/core/structured_logger.py`
