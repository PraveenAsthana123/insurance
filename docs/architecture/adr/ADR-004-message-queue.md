# ADR-004: Redis + Celery for background work; Kafka deferred

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: infrastructure, async, workers

## Context

Need async / background work for:
- ML pipeline runs (slow, must not block HTTP)
- Agent fleet task dispatch (hub-and-spoke per §64.43 #1)
- Cron-triggered jobs
- Cross-service events

## Decision

**Redis (lists + pub/sub) + Celery for background work. Kafka deferred until event-driven needs surface.**

## Rationale

- Already wired in docker-compose (`redis:` + `worker:` services)
- Celery is well-known to FastAPI developers
- Redis BRPOP pattern handles agent fleet dispatch (`agents/agent.py`)
- Operational complexity of Kafka (Zookeeper, partitioning, schema registry) not justified at current scale

## Consequences

### Positive
- One technology covers queue + cache + pub/sub
- Existing `backend/workers/celery_app.py` works
- 100-agent hub-and-spoke scales fine with Redis BRPOP

### Negative
- No event ordering guarantees across partitions
- No exactly-once semantics (at-least-once + idempotency keys per §64.43 #6)
- Redis is SPOF unless clustered (acceptable for current scale)

## Alternatives considered

- **Kafka**: Excellent for event sourcing but operationally heavy
- **RabbitMQ**: Good middle ground; ecosystem worse than Redis+Celery
- **AWS SQS**: Vendor lock + cost; defer if multi-cloud goal
- **Temporal**: Already installed (per global §64.42); reserved for workflow orchestration, not generic queue

## Migration trigger

Move to Kafka when:
- Event sourcing becomes a domain requirement (audit log replay)
- Need cross-service event broadcast at > 1K events/s
- Multi-region replication required

## References

- ADR-001 (deployment target) — Docker Compose limits influence this choice
- Global §64.43 #1 (hub-and-spoke) — implemented with Redis lists
- `backend/workers/celery_app.py`
- `agents/agent.py`
