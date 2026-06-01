# ADR-005: PostgreSQL 16 single-instance; PgBouncer + read replicas at scale

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: database, persistence

## Context

Need OLTP database for tenant data, audit rows (§38.3), idempotency, decision
log, master data (§64.13).

## Decision

**PostgreSQL 16 single-instance. Add PgBouncer at > 200 connections; add streaming read replicas at > 1K MAU.**

## Rationale

- ACID guarantees needed (financial transactions, decision audit)
- JSON/JSONB for flexible decision-audit + nested data
- pg_partman for audit row 7-year retention partitioning
- Mature ecosystem (psycopg2 + SQLAlchemy + Alembic)
- pgvector available if we shift vector DB later (ADR-003)

## Consequences

### Positive
- Single technology for OLTP + audit + partial vector (pgvector option)
- Free + open-source
- Backup/restore well-understood (pg_dump + WAL archive)

### Negative
- Vertical-scale ceiling per node (~50K conn theoretical, ~500 practical)
- Read replicas add eventual-consistency consideration

## Alternatives considered

- **MySQL/MariaDB**: Smaller JSON capability; weaker partitioning
- **CockroachDB**: Horizontally scalable but ops complexity premature
- **DynamoDB**: Vendor lock; doesn't fit relational audit schema

## Migration trigger

Add read replicas when:
- p95 read latency > 50ms sustained
- > 200 concurrent connections from backend pool

Consider sharding when:
- > 100M decision audit rows per dept
- Single-node disk > 4TB

## References

- ADR-001 (deployment target) — Docker Compose runs single PG node
- ADR-006 (multi-tenancy) — row-level tenant_id keying
- Global §38.3 (decision audit schema)
- `backend/database.py` + `backend/migrations/`
