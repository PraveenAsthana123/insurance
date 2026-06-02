# INSUR DB Viewer + Per-Function Tables — Reference Impl of Global §68

> Global policy: [`~/.claude/policies/insur-observability-hub.md`](../../home/praveen/.claude/policies/insur-observability-hub.md)
> Tool comparison: [TOOL_COMPARISON.md](TOOL_COMPARISON.md)
> Per-process tables catalog: [`data/dbviewer/per_process_tables.json`](../../data/dbviewer/per_process_tables.json)

## What this is

The INSUR/insur reference implementation of the 13-sub-surface
**Observability + Data Hub** mandated by global §68. This iteration
ships **2 of the 13 surfaces**:

- §68.1 — DB Viewer (5 endpoints)
- §68.2 — Per-function tables (3 endpoints)

Remaining 11 surfaces (guardrails / PII inventory / security / functional
eval / cost eval / safety eval / multi-model compare / Langfuse adapter)
ship in subsequent iterations per the §68 iteration plan.

## API

### §68.1 DB Viewer

| Endpoint | Returns |
|---|---|
| `GET /api/v1/insur/dbviewer/_global` | Registered DBs + endpoint map + invariants |
| `GET /api/v1/insur/dbviewer/databases/{db_id}` | DB info (no creds) + schemas |
| `GET /api/v1/insur/dbviewer/databases/{db_id}/schemas/{schema}` | Tables + PII flags + tenant_id flag + row estimates |
| `GET /api/v1/insur/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}` | Columns + PK + FK + PII flags |
| `GET /api/v1/insur/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}/sample` | Sample rows (PII-redacted, tenant-scoped, capped at 100) |

### §68.2 Per-function tables

| Endpoint | Returns |
|---|---|
| `GET /api/v1/insur/dbviewer/process-tables/_global` | Full catalog: every process with primary + secondary tables |
| `GET /api/v1/insur/dbviewer/process-tables/{dept}` | Per-dept slice |
| `GET /api/v1/insur/dbviewer/process-tables/{dept}/{process_id}` | Single process: primary_table + secondary_tables + join_keys + pii_columns |

## Invariants (drill-locked)

Per `tests/drills/drill_dbviewer.py` (12 steps, 4 negative):

1. **Read-only** — no mutation endpoint exists
2. **PII redacted by default** — `?include_pii=1` opt-in (audited)
3. **Tenant-scoped at SQL boundary** — `WHERE tenant_id = $1` applied when column exists
4. **Sample-size capped at 100 rows**
5. **Audit row per call** via `core.insur_audit.log_insur_access`
6. **NO connection strings in responses** (defense in depth at router)
7. **Validators 404 BEFORE audit** per §47.6 anti-info-leak
8. **Best-effort persistence** — DB unreachable does NOT crash the request
9. **SQL injection blocked** — schema/table names regex-validated AND looked up against introspected allow-list

## Quick start

```bash
# List registered databases
curl -s http://localhost:8000/api/v1/insur/dbviewer/_global \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq

# What tables back the lead_scoring process?
curl -s http://localhost:8000/api/v1/insur/dbviewer/process-tables/sales/lead_scoring \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq .process

# Sample 10 PII-redacted rows from dim_customer
curl -s 'http://localhost:8000/api/v1/insur/dbviewer/databases/insur/schemas/public/tables/dim_customer/sample?limit=10' \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq

# Same, with PII visible (audited)
curl -s 'http://localhost:8000/api/v1/insur/dbviewer/databases/insur/schemas/public/tables/dim_customer/sample?limit=10&include_pii=1' \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq
```

## Updating the per-process catalog

Edit [`data/dbviewer/per_process_tables.json`](../../data/dbviewer/per_process_tables.json):

```json
{
  "dept": "<dept>",
  "process_id": "<process_id>",
  "process_name": "<Display Name>",
  "primary_table": "<table>",
  "secondary_tables": ["<table>", "<table>"],
  "join_keys": [{"left": "<a.col>", "right": "<b.col>"}],
  "pii_columns": ["<table>.<col>"],
  "tenant_column": "<col or '(none)'>",
  "status": "annotated"
}
```

Then re-run the drill: `python tests/drills/drill_dbviewer.py`. Status
options: `annotated` (everything wired) / `stub` (primary table not yet
migrated — placeholder).

## Roadmap (INSUR/insur specific)

| Iter | Surface | Status |
|---|---|---|
| 1 | §68.1 DB Viewer + §68.2 Per-function tables | ✅ this commit |
| 2 | §68.6 PII inventory + §68.5 Guardrails | next |
| 3 | §68.7 Security posture | |
| 4 | §68.8/9/10 Functional + cost + safety eval triplet | |
| 5 | §68.11 Multi-model compare | |
| 6 | §68.12 Langfuse Stage-1 adapter | |
| 7 | Frontend Observability Hub page | |

## See also

- Tool comparison: [TOOL_COMPARISON.md](TOOL_COMPARISON.md)
- Global policy: §68 in [`~/.claude/CLAUDE.md`](../../home/praveen/.claude/CLAUDE.md)
- Federation pattern: [`docs/AGENT_HARNESS_GUIDE.md`](../AGENT_HARNESS_GUIDE.md) → "INSUR/* Shared Audit Helper"
