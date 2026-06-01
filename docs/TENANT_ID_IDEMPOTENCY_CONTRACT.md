# Tenant-ID + Idempotency Contract

Governance documentation for the `X-Tenant-ID` and `Idempotency-Key` request
headers introduced by the federation iteration (commits `f57b255b` →
`1a74026b`). Per global CLAUDE.md §64.43 #7 + §10.3 and `docs/APPROVAL_GOVERNANCE.md`,
behavior-changing headers must be documented in the catalog before merge.

## Surface

| Header | Routers honoring it | Default | Echo header on response |
|---|---|---|---|
| `X-Tenant-ID` | `/api/v1/agent-platform/*`, `/api/v1/openclaw/*`, `/api/v1/paperclip/*`, `/api/v1/admin/*` (all routes behind `TenantIdMiddleware`) | `default` | `X-Tenant-ID` (echoed by middleware) |
| `Idempotency-Key` | `POST /api/v1/agent-platform/cua/execute`, `POST /api/v1/openclaw/tasks`, `POST /api/v1/paperclip/clips` | none — caching disabled | CUA: _none_ (`result.idempotent_replay`); OpenClaw/Paperclip: `X-Idempotent-Replay: true` on replay |
| `X-Demo-Role` | RBAC middleware (existing) | `manager` | _none_ |
| `X-Correlation-ID` | `CorrelationIdMiddleware` (existing) | minted if absent | `X-Correlation-ID` |

## X-Tenant-ID — Federation Contract (§64.43 #7)

### Middleware (`backend/core/middleware.py::TenantIdMiddleware`)

- Reads `X-Tenant-ID` header (case-insensitive); stores on `request.state.tenant_id`.
- Validates against `^[a-z0-9][a-z0-9-]{0,62}$` (DNS-label safe; forbids path traversal).
- Bypass paths (`/api/health`, `/health`, `/docs`, `/openapi.json`, `/redoc`)
  skip strict mode so probes survive.

### Environment-driven enforcement

| Env var | Default | Effect |
|---|---|---|
| `TENANT_ID_STRICT` | `false` | When `true`, missing header on non-bypass paths → 400 `TENANT_ID_MISSING` |
| `TENANT_ID_ALLOWLIST` | _unset_ (open) | When set (comma-sep), off-list IDs → 403 `TENANT_ID_FORBIDDEN` |

### Anti-spoof (router-side)

For routers that propagate `tenant_id` into request bodies / audit rows
(`agent-platform/cua/execute`, `openclaw/tasks`, `paperclip/clips`,
`paperclip/context-pack`), the middleware-set `tenant_id` **overrides** any
caller-supplied `metadata.tenant_id` in the body. This prevents a tenant-A
caller from forging a tenant-B audit row by passing
`{"metadata": {"tenant_id": "tenant-b"}}`.

Drill: [`tests/drills/drill_tenant_id_federation.py`](../tests/drills/drill_tenant_id_federation.py) step 8.

### Paperclip — full-CRUD tenant scoping

| Operation | Tenant scoping |
|---|---|
| `POST /clips` | Artifact JSON stamped with caller's `tenant_id` |
| `GET /clips` | Filters to caller's tenant only |
| `GET /clips/{id}` | Cross-tenant → **404 (anti-enumeration, not 403)** |
| `DELETE /clips/{id}` | Cross-tenant → 404; artifact NOT modified |
| `POST /context-pack` | Foreign `clip_id`s → `missing_ids` (no content leak) |

Backward compat: pre-federation artifacts (no `tenant_id` field on disk) are
treated as belonging to `default` tenant. Drill:
[`tests/drills/drill_openclaw_paperclip_federation.py`](../tests/drills/drill_openclaw_paperclip_federation.py).

### Admin cross-tenant readback (§47.6 + SOC2 CC4 + CC7)

`GET /api/v1/admin/cua/audit` is gated to `{compliance, reporting-monitoring}`
roles only. Bypass of tenant scoping is by RBAC role, not header. Every admin
read writes one `admin.cua.audit.read` row to `cua_runs.jsonl` (synthetic
`tenant_id="_admin"`) — audit-of-audit. Default result excludes admin rows to
avoid recursion noise; `?tenant_id=_admin` explicitly returns them. Drill:
[`tests/drills/drill_admin_cua_audit.py`](../tests/drills/drill_admin_cua_audit.py).

### Audit readback (per-tenant)

`GET /api/v1/agent-platform/cua/audit` is tenant-scoped from the middleware
value. There is intentionally **no** `?tenant_id=` query parameter on this
endpoint — preventing cross-tenant reads by URL manipulation. Drill:
[`tests/drills/drill_cua_audit_readback.py`](../tests/drills/drill_cua_audit_readback.py) step 4.

## Idempotency-Key — Anti-Replay Contract (§10.3)

### Scope

`POST /api/v1/agent-platform/cua/execute`, `POST /api/v1/openclaw/tasks`, and `POST /api/v1/paperclip/clips` accept `Idempotency-Key` as either:

1. HTTP header: `Idempotency-Key: <opaque-string>` (≤128 chars)
2. Request body field: `{"idempotency_key": "<opaque-string>"}`

Body field wins over header when both set (more explicit; matches user intent).

### Cache semantics

| Property | Behavior |
|---|---|
| Cache key | `(tenant_id, idempotency_key)` — cross-tenant isolated by construction |
| TTL | CUA: 300 seconds default; env `CUA_IDEMPOTENCY_TTL_SECONDS`. OpenClaw/Paperclip: 300 seconds default; env `IDEMPOTENCY_TTL_SECONDS` |
| Capacity | CUA: 1000 entries; env `CUA_IDEMPOTENCY_MAX_ENTRIES`. OpenClaw/Paperclip: 1000 entries; env `IDEMPOTENCY_MAX_ENTRIES`. Both LRU-trim on overflow |
| Replay marker | CUA: `result.idempotent_replay = true` on cached returns. OpenClaw/Paperclip: `X-Idempotent-Replay: true` response header |
| Cached statuses | CUA: `executed`, `dry-run`. OpenClaw/Paperclip: successful create responses only |
| **Not** cached | CUA: `blocked`, `error`, `unavailable`; OpenClaw/Paperclip: 4xx/5xx exceptions — caller may legitimately retry |
| Persistence | CUA: append-only JSONL at `CUA_IDEMPOTENCY_PATH` (default `data/agent-supervisor/cua_idempotency.jsonl`). OpenClaw/Paperclip: namespace JSONL via `IDEMPOTENCY_PATH_OPENCLAW` / `IDEMPOTENCY_PATH_PAPERCLIP`, defaulting to `data/agent-supervisor/idempotency_<namespace>.jsonl`. Survives process restarts. Multiple workers writing to the same path share the cache. TTL-expired entries are skipped on load. Corrupt JSON lines + blank lines are skipped (never crash). Drills: [`tests/drills/drill_cua_idempotency_persistence.py`](../tests/drills/drill_cua_idempotency_persistence.py), [`tests/drills/drill_openclaw_paperclip_federation.py`](../tests/drills/drill_openclaw_paperclip_federation.py) |

### Why failures are NOT cached

A naive idempotency cache would store every response, including `blocked`
from policy denials. If the policy is later fixed and the caller retries
with the same key, the cache would replay the stale `blocked` response,
shielding them from the fix. The current contract caches **successes only**
so retries-after-repair work as expected. Drill:
[`tests/drills/drill_cua_idempotency.py`](../tests/drills/drill_cua_idempotency.py) steps 10-11.

### OpenClaw + Paperclip create endpoint extension (§56 stage-2, added 2026-05-26)

OpenClaw and Paperclip use `backend/core/idempotency.py`, a namespace-scoped reusable cache. Cache keys are `(namespace, tenant_id, idempotency_key)`, so the same caller key can safely be reused by different tenants without cross-tenant replay.

| Endpoint | Namespace | Replay effect | Duplicate prevented |
|---|---|---|---|
| `POST /api/v1/openclaw/tasks` | `openclaw` | Cached `OpenClawTaskResponse` returned with `X-Idempotent-Replay: true` | No second queue enqueue |
| `POST /api/v1/paperclip/clips` | `paperclip` | Cached `PaperclipArtifactResponse` returned with `X-Idempotent-Replay: true` | No duplicate artifact JSON write |

Paperclip also normalizes `metadata.tenant_id` from the middleware tenant before create, matching the OpenClaw anti-spoof rule. Body-supplied `metadata.tenant_id` never wins.

## AgentOps Stage-1 Adapter Wrap (§56 gate-2, added 2026-05-26)

`execute_cua` is wrapped by `_AgentOpsSession` (in
`backend/services/agent_platform_service.py`) — opt-in observability
that NEVER affects request correctness.

### Gate

Wrap fires ONLY when BOTH env vars are set:
- `AGENTOPS_ENABLED=true`
- `AGENTOPS_API_KEY=<key>`

Either missing → wrap is a zero-cost no-op context manager.

### Compose rules

| Rule | Why |
|---|---|
| Idempotency check happens BEFORE wrap fires | Replays must NEVER trigger a new AgentOps session (would double-count cost) |
| Tenant tag uses middleware `tenant_id` | Same anti-spoof guarantee as the rest of §64.43 #7 |
| Session start/record/end wrapped in try/except | Broken SDK MUST NOT crash request |
| API key value never appears in response | Prevents creds leak via error envelopes |

Drill: [`tests/drills/drill_agentops_adapter.py`](../tests/drills/drill_agentops_adapter.py)
— 10 steps, 5 negative (default off, both vars required, SDK init/start/record exceptions
all swallowed, response shape stable, API key never leaks).

## Drill coverage

| Drill | Steps | Negative assertions | Cycle time |
|---|---|---|---|
| `drill_tenant_id_federation.py` | 9 | 4 | 0.9s |
| `drill_cua_audit_readback.py` | 10 | 4 | 0.2s |
| `drill_openclaw_paperclip_federation.py` | 14 | 6 | 0.1s |
| `drill_admin_cua_audit.py` | 11 | 5 | 0.1s |
| `drill_cua_idempotency.py` | 12 | 5 | 2.0s (real TTL expiry) |
| `drill_cua_idempotency_persistence.py` | 10 | 4 | 0.6s (disk-backed cache) |
| **Total federation+idempotency** | **66** | **28** | **~3.9s** |

Plus the existing `drill_agent_platform_cua.py` (8 steps, 4 negative) for the
CUA execute path which underpins all of the above.

## Owner

`@PraveenAsthana123` per [.github/CODEOWNERS](../.github/CODEOWNERS). Changes
to this contract MUST update both:

1. This file (the human-readable contract)
2. The corresponding drill (the machine-enforced contract)

per the governance contract in [docs/APPROVAL_GOVERNANCE.md](APPROVAL_GOVERNANCE.md)
and `scripts/governance_diff_check.sh`.
