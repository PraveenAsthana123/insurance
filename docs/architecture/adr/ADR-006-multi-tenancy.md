# ADR-006: Row-level multi-tenancy via tenant_id column + middleware

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: security, isolation, soc2

## Context

System serves multiple insurance carriers (tenants). Isolation models:
1. Shared DB + shared schema + tenant_id column (cheapest, most ops effort)
2. Shared DB + schema-per-tenant (medium, harder schema mgmt)
3. Database-per-tenant (most isolation, highest ops)
4. Hardware-per-tenant (extreme isolation; only for sovereign-data customers)

## Decision

**Row-level tenant_id column + middleware-enforced filtering. Per-customer DB only for sovereign-data add-ons.**

## Rationale

- Cheapest to operate at current scale (< 1K customers)
- Existing middleware already enforces `X-Tenant-ID` (per `backend/core/middleware.py`)
- All tables already have tenant_id column or join path
- Postgres RLS (Row Level Security) optionally available
- Cross-tenant query is a release-blocker bug class (drill catches)

## Consequences

### Positive
- Operationally simple
- Easy cross-tenant analytics (aggregation queries with admin role)
- Single backup covers all tenants

### Negative
- Blast radius of bug = all tenants (mitigated by drill suite §41.3)
- Cross-tenant data exfil if middleware bypassed
- Performance: every query has WHERE tenant_id filter (mitigated by index)

### Risks accepted
- We must drill-test isolation continuously; one untested code path can leak

## Alternatives considered

- **Schema-per-tenant**: 50× the schema migration cost
- **DB-per-tenant**: Linear cost-per-customer; great for top-tier customers, overkill for SMB
- **Postgres RLS**: Considered; defer to a later phase (adds query complexity)

## Migration trigger

Add per-tenant database for a customer when:
- Customer signs sovereign-data clause (GDPR / state-specific PII)
- Customer is > 30% of total volume (right-sizing)
- Customer pays for dedicated tier

## References

- Global §41.3 multi-tenant
- Global §47.6 SOC2 CC6.6 segmentation
- `backend/core/middleware.py` (tenant enforcement)
- Drill `drill_admin_cua_audit.py` (cross-tenant negative tests)
