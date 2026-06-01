# Agent Harness Guide

This guide explains how to run, debug, and validate the agent/council system.

## Start Dependencies

```bash
docker compose up -d redis ollama
```

If Ollama is running on host instead of Docker, verify the configured URL in `docker-compose.yml`.

## Run Simple Agent Demo

```bash
python agents/seeder.py 20
docker compose up -d --scale agents=4 agents
```

Inspect output:

```bash
docker compose exec redis redis-cli LLEN tasks
docker compose exec redis redis-cli LLEN done
docker compose exec redis redis-cli LRANGE done 0 2
```

## Run Council Demo

```bash
python agents/council_seeder.py 5
docker compose up -d --scale council_agents=2 council_agents
```

Inspect output:

```bash
docker compose exec redis redis-cli LLEN council_tasks
docker compose exec redis redis-cli LLEN council_done
docker compose exec redis redis-cli LRANGE council_done 0 1
```

## Run Through API

```bash
curl -X POST http://localhost:8000/api/v1/holy/council/ask \
  -H 'Content-Type: application/json' \
  -d '{"department":"sales","prompt":"Design a distributor pricing framework"}'
```

Then poll:

```bash
curl http://localhost:8000/api/v1/holy/council/result/<task_id>
```


## Run Through OpenClaw Bridge

Start backend plus Redis, then check the bridge manifest:

```bash
curl http://localhost:8000/api/v1/openclaw/manifest
curl http://localhost:8000/api/v1/openclaw/status
```

Submit a council task through the OpenClaw-compatible API:

```bash
curl -X POST http://localhost:8000/api/v1/openclaw/tasks \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -d '{"department":"sales","mode":"council","prompt":"Run a council review for sales forecast governance","metadata":{"source":"harness"}}'
```

Poll for the result:

```bash
curl -H 'X-Demo-Role: tester' \
  'http://localhost:8000/api/v1/openclaw/tasks/<task_id>?mode=council'
```

The local bridge writes to the same Redis queues as the council worker. It is working for local orchestration; an external OpenClaw gateway/SDK is still a future adapter layer.


## Paperclip Context Packs

Store an artifact for agent context:

```bash
curl -X POST http://localhost:8000/api/v1/paperclip/clips \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -d '{"title":"Sales trace","content":"API trace or run log text","content_type":"trace","source":"operator"}'
```

Build a context pack for a task:

```bash
curl -X POST http://localhost:8000/api/v1/paperclip/context-pack \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: tester' \
  -d '{"clip_ids":["<clip_id>"],"max_chars":20000,"include_metadata":true}'
```

The local adapter is working. It is not an external Paperclip framework install.

## Debug Containers

```bash
docker compose ps
docker compose logs -f council_agents
docker compose logs -f agents
docker compose logs -f redis
docker compose logs -f ollama
```

## Debug Redis

```bash
docker compose exec redis redis-cli PING
docker compose exec redis redis-cli KEYS '*'
docker compose exec redis redis-cli LRANGE council_tasks 0 -1
docker compose exec redis redis-cli LRANGE council_done 0 -1
```

## Common Failures

- `redis unreachable`: Redis container is down or URL is wrong.
- `ollama smoke failed`: Ollama container/model is unavailable; worker will keep running but tasks may fail.
- `model not found`: pull or configure the expected model.
- council result stays pending: no `council_agents` workers are running, or all workers failed model calls.


## 100-Agent Fleet Harness

Use the single operator script for local 100-agent runs, monitoring, scheduling, and Codex/Claude task submission.

Start 100 simple agents with 100 queued tasks:

```bash
./scripts/agent_fleet.sh start-simple 100 100
```

Start council workers for governance/review tasks:

```bash
./scripts/agent_fleet.sh start-council 5 20
```

Submit one request from Codex/Claude through the OpenClaw-compatible bridge:

```bash
./scripts/agent_fleet.sh submit-simple "Create a one-sentence sales action plan" sales
./scripts/agent_fleet.sh submit-council "Review the supply-chain risk plan" supply-chain
```

Monitor live workers, queue depth, and recent completions:

```bash
./scripts/agent_fleet.sh status
./scripts/agent_fleet.sh watch
```

Create recurring scheduled jobs:

```bash
./scripts/agent_fleet.sh schedule-add sales-pulse 300 council "Review sales forecast anomalies" sales
./scripts/agent_fleet.sh schedule-run
```

Follow worker logs:

```bash
./scripts/agent_fleet.sh logs-simple
./scripts/agent_fleet.sh logs-council
```

Stop workers:

```bash
./scripts/agent_fleet.sh stop-agents
```


## Unified Agent Platform Setup

Check the full Harness/OpenClaw/Paperclip/PoliysAI/CUA/Stagehand setup from the same command surface:

```bash
./scripts/agent_fleet.sh platform-status
./scripts/agent_fleet.sh platform-manifest
./scripts/setup_agent_platform.py status
```

The API surface is `/api/v1/agent-platform/*`. It reports working local bridges, dry-run browser/CUA adapters, governance decisions, required env vars, and production enablement gates. See `docs/AGENT_PLATFORM_SETUP.md`.

## Supervisor Layer

Use the supervisor when you need to see all agents, schedules, queue backlog, task completion, and process-test coverage from one command.

```bash
./scripts/agent_fleet.sh supervisor
./scripts/agent_fleet.sh supervisor-watch
./scripts/agent_fleet.sh supervisor-health
./scripts/agent_fleet.sh supervisor-report
./scripts/agent_fleet.sh task-status <task_id>
```

The underlying script is `scripts/agent_supervisor.py`. It reads Redis queues, `agent:heartbeat:*` keys, scheduler metadata, recent result samples, and `docs/testing/PROCESS_AGENT_CRON_CATALOG.json`. It is the local monitoring/supervisor layer for the 100-agent harness. See `docs/AGENT_SUPERVISOR_RUNBOOK.md` for the full runbook.

## Production Harness Requirements

A production harness must output a report with:

- run ID
- worker count
- model names
- queue lengths before/after
- tasks submitted
- tasks completed
- tasks failed
- p50/p95 latency
- sample outputs
- failed task details

## Idempotency Persistence (§10.3)

Backend `services/agent_platform_service.py` persists the CUA idempotency
cache to a JSONL backing file at `CUA_IDEMPOTENCY_PATH` (default
`data/agent-supervisor/cua_idempotency.jsonl`). The cache survives process
restarts and lets multi-replica deploys share state when the workers point
at the same disk path. TTL-expired and corrupt entries are skipped on load.

Full surface contract: see [docs/TENANT_ID_IDEMPOTENCY_CONTRACT.md](TENANT_ID_IDEMPOTENCY_CONTRACT.md).
Drill: `tests/drills/drill_cua_idempotency_persistence.py` (10 steps, 4 negative).

### Compaction

`scripts/idempotency_compact.py` drops expired entries + dedupes on
`(tenant_id, idempotency_key)` keeping the latest write. Atomic write
via tempfile + `os.replace()` so a crash mid-compaction never corrupts
the live cache. Schedule via cron / systemd-timer; audit-of-audit at
`data/agent-supervisor/idempotency_compact_runs.jsonl`. Drill:
`tests/drills/drill_idempotency_compaction.py` (9 steps, 4 negative).

## AgentOps Stage-1 Adapter (§56 gate-2)

Opt-in observability wrap around `execute_cua`. Enabled ONLY when BOTH
env vars set:
- `AGENTOPS_ENABLED=true`
- `AGENTOPS_API_KEY=<key>`

Lazy-imports the `agentops` SDK. If the SDK is missing OR fails to init
OR raises during a session, the wrap silently no-ops — the original
response is returned unchanged. The wrap NEVER affects request
correctness; observability MUST NOT affect the request path.

Drill: `tests/drills/drill_agentops_adapter.py` (10 steps, 5 negative)
locks the contract: default off, never default-on, broken SDK ignored,
response shape identical across off/broken/functional modes, API key
never leaks into the response.

## BMad shim (Node ≥ 20)

`scripts/bmad.sh` forces BMad to run under an nvm-managed Node ≥ 20
regardless of system Node (which may be 18.x and crash BMad with
`EBADENGINE`). Fails loudly if no nvm Node 20+ is present (no silent
fallback to system Node). Drill: `tests/drills/drill_operator_readiness.py`
step 6.

## Operator-Readiness Drill

`tests/drills/drill_operator_readiness.py` is the truth detector for
"are the agent surfaces actually configured?". Catches false-positive
ready claims: gh / Slack / Telegram / Node-too-old gaps are named, not
silenced. 10 steps, 4 negative.

## Unified Tenant-Activity Endpoint (§64.43 #7 follow-through)

`GET /api/v1/agent-platform/activity` returns a per-tenant feed composed
across CUA executes + admin audit-of-audit reads + Paperclip artifacts.
Tenant-scoped from `X-Tenant-ID` middleware header; NO `?tenant_id=`
query parameter (cross-tenant reads impossible by construction).

Response shape:
- `items[]` — sorted desc by ts, each tagged with `source: cua | admin | paperclip`
- `total_items` — pre-pagination count
- `sources_available` — dict showing which sources contributed any row

Drill: `tests/drills/drill_tenant_activity.py` (10 steps, 4 negative)
locks: cross-tenant exclusion, URL-param ignored, corrupt-line skipped,
sorted-desc-by-ts.

## LiteLLM Gateway — Stage-1 Adapter (§56.2)

`backend/services/llm_gateway.py` — sync single-call interface to LiteLLM,
complementary to the async OpenClaw → Redis → worker path. Feature-flag
opt-in:

```bash
export HOLY_LLM_GATEWAY_ENABLED=true
export HOLY_LLM_MODEL=ollama/kivi:local        # default; targets local Ollama
export HOLY_LLM_TIMEOUT_SECONDS=30
```

Then call from any service:

```python
from services.llm_gateway import complete

result = complete(
    "Summarize this incident", tenant_id="tenant-a",
    request_id="req-123", max_tokens=200,
)
if result.outcome == "executed":
    print(result.text)
elif result.outcome == "error":
    print(f"Failed: {result.error_type} — {result.error_msg}")
elif result.outcome == "disabled":
    pass  # gateway not opted in; fallback to OpenClaw queue
elif result.outcome == "unavailable":
    pass  # litellm package missing; same fallback
```

Audit log at `data/agent-supervisor/llm_gateway_runs.jsonl` records EVERY
call regardless of outcome (disabled/unavailable/executed/error) — so
operators can see attempts that never landed.

Drill: `tests/drills/drill_litellm_gateway.py` (11 steps, 5 negative)
locks: default off + opt-in env required, lazy import, broken SDK
swallowed, timeout wrapped, API key never leaks, audit row per call.

## HOLY/monitoring Federation (§64.43 #7 — first of 9 holy routers)

`backend/routers/monitoring.py` is the first `/api/v1/holy/*` router
federated under §64.43 #7. Monitoring data is fleet-wide infrastructure
telemetry (NOT tenant-scoped data) — so federation here means:

  - Every read writes a §38.3 audit row attributing the read to the
    caller's `X-Tenant-ID` + `X-Demo-Role`
  - Audit log at `data/agent-supervisor/monitoring_reads.jsonl`
  - Cross-tenant reads ARE allowed (fleet telemetry is intentionally
    non-tenant-partitioned) — only the audit trail distinguishes them
  - RBAC: read-only via `_READ_ROLES` in PERMS_MATRIX
  - Validator 404s (anti-info-leakage) run BEFORE audit-log writes,
    so failed lookups don't pollute the read trail

This is the right pattern for shared infrastructure surfaces: data
stays fleet-wide, access is tenant-attributed. Operator can answer
"which tenant looked at the pricing model accuracy curve last week?"
without artificially partitioning per tenant.

Drill: `tests/drills/drill_holy_monitoring_federation.py` (10 steps,
4 negative) locks: tenant echo, audit row per endpoint, validator-
before-audit ordering, cross-tenant payload equality, disk-write
failure tolerated.

## HOLY/* Shared Audit Helper — 7 remaining routers federated

`backend/core/holy_audit.py` is the factored §38.3 audit-trail helper
that lets every remaining `holy/*` router federate with three lines:

```python
from core.holy_audit import log_holy_access

@router.get("/{dept}")
def dept_X(http_request: Request, dept: str):
    _validate_dept(dept)                      # ALWAYS first (§47.6 anti-info-leak)
    log_holy_access(http_request, "<surface>", "dept_X", dept=dept)
    # ... existing body unchanged ...
```

Federated this iteration:

  - `routers/master_data.py`  (surface=`master_data`,  3 endpoints)
  - `routers/transactions.py` (surface=`transactions`, 3 endpoints)
  - `routers/pipelines.py`    (surface=`pipelines`,    3 endpoints)
  - `routers/reports.py`      (surface=`reports`,      3 endpoints)
  - `routers/demo_stories.py` (surface=`demo_stories`, 3 endpoints)
  - `routers/graph.py`        (surface=`graph`,        4 endpoints)
  - `routers/downloads.py`    (surface=`downloads`,    3 endpoints)

Total: 22 endpoints now writing tenant-attributed §38.3 rows to the
unified holy-fleet audit trail at `data/agent-supervisor/holy_reads.jsonl`
(env-overridable via `HOLY_AUDIT_PATH`).

Monitoring keeps its own helper writing to `monitoring_reads.jsonl` —
intentional split so the high-volume infrastructure telemetry surface
can rotate / archive on a different cadence from the lower-volume
operational surfaces. Both helpers emit the same §38.3 envelope shape.

RBAC: each prefix gets a catch-all `_READ_ROLES` entry in
`backend/core/rbac_middleware.py::PERMS_MATRIX` — read-only in MVP;
mutations stay gated per §42.

Drill: `tests/drills/drill_holy_routers_federation.py` (12 steps, 4
negative + a schema invariant) covers representative endpoints from
all 7 surfaces, the validator-before-audit ordering, default-tenant
fallback when no `X-Tenant-ID` header, and best-effort persistence
under disk-write failure.

## Pydantic AI Typed Council — Stage-2 Pilot (§56.2)

`backend/services/typed_council.py` plus `POST /api/v1/agent-platform/typed-council/run` — sync 3-stage council with
Pydantic-validated outputs. Complementary to the async OpenClaw → Redis
→ worker council path. Pydantic AI's Agent class enforces output schema
via function calling, so off-schema LLM output is caught at parse time.

Opt-in:

```bash
export HOLY_TYPED_COUNCIL_ENABLED=true
export HOLY_LLM_MODEL=openai/gpt-4o-mini    # or any pydantic_ai-supported provider
```

Use from any service:

```python
from services.typed_council import run_typed_council

result = run_typed_council(
    "should we deploy the new pricing feature on Tuesday?",
    tenant_id="tenant-a",
    request_id="req-123",
)

if result.outcome == "executed":
    print(f"Author: {result.author.proposal} (confidence={result.author.confidence})")
    print(f"Reviewer score: {result.reviewer.score} / must_fix: {result.reviewer.must_fix}")
    print(f"Chair decision: {result.chair.decision}")
elif result.outcome == "schema_error":
    # LLM returned off-schema; caller decides retry policy
    print(f"Schema fail: {result.error_msg}")
elif result.outcome == "error":
    print(f"Provider failure: {result.error_type}")
elif result.outcome in ("disabled", "unavailable"):
    # Fallback to OpenClaw council path
    pass
```

Run through the agent-platform API:

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/typed-council/run \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -H 'X-Tenant-ID: tenant-a' \
  -d '{"prompt":"should we deploy the new pricing feature on Tuesday?"}'
```

The endpoint uses middleware tenant attribution and RBAC, then delegates to the same typed service.

Typed output schemas:
- `CouncilAuthorOutput` — proposal + confidence ∈ [0,1] + risks (≤10)
- `CouncilReviewerOutput` — critique + score ∈ [1,10] + must_fix (≤10)
- `CouncilChairDecision` — decision ∈ {approve, reject, revise} + rationale

Audit log at `data/agent-supervisor/typed_council_runs.jsonl` — one row
per stage (author/reviewer/chair) on success; one summary row on
gate-rejected/error.

Drill: `tests/drills/drill_typed_council.py` (11 steps, 5 negative) plus `backend/tests/test_agent_platform_router.py` endpoint coverage
locks: default off, schema_error vs error distinction, 3 audit rows
per successful run, schema constraints enforced (confidence ≤ 1, score
≤ 10, decision in literal set), API key never leaks.

## DSPy RAG Prompt Optimizer — Stage-1 Adapter (§56.2)

`backend/services/dspy_optimizer.py` — sync RAG prompt optimization with
DSPy 3.x. Complementary to whatever hand-written prompt the caller is
currently shipping; this compiles a typed signature
`(question, context) -> answer` into a few-shot program with demos
selected by metric. Caller can serialize the result + version it.

Opt-in:

```bash
export HOLY_DSPY_OPTIMIZER_ENABLED=true
export HOLY_LLM_MODEL=ollama/kivi:local          # any DSPy-supported LM
# Optional:
export HOLY_DSPY_AUDIT_PATH=data/agent-supervisor/dspy_optimizer_runs.jsonl
```

Use from any service:

```python
from services.dspy_optimizer import run_optimization

result = run_optimization(
    train_examples=[
        {"question": "Q1?", "context": "ctx1", "answer": "A1"},
        {"question": "Q2?", "context": "ctx2", "answer": "A2"},
        # … up to 200 examples …
    ],
    tenant_id="tenant-a",
    request_id="req-123",
    optimizer="BootstrapFewShot",      # or "LabeledFewShot"
    metric="contains",                  # or "exact_match"
    max_bootstrapped_demos=4,
    max_labeled_demos=4,
)

if result.outcome == "executed":
    print(f"Optimizer: {result.optimizer_used}")
    print(f"Demos compiled: {result.n_demos_compiled}")
    print(f"Accuracy before: {result.train_accuracy_before}")
    print(f"Accuracy after:  {result.train_accuracy_after}")
    print(f"Program repr:\n{result.optimized_prompt_repr}")
elif result.outcome == "validation_error":
    # malformed examples / unknown optimizer / unknown metric — no LM call made
    print(result.validation_errors)
elif result.outcome == "error":
    print(f"Provider failure: {result.error_type}: {result.error_msg}")
elif result.outcome in {"disabled", "unavailable"}:
    # Fallback to hand-written prompt
    pass
```

Whitelists (hard-coded — extend deliberately, not by `**kwargs`):
- Optimizers: `BootstrapFewShot`, `LabeledFewShot`
- Metrics: `exact_match`, `contains`
- Limits: ≤ 200 train examples, ≤ 16 demos

Validation gate runs BEFORE any LM call so malformed input doesn't burn
tokens. Audit row carries `optimizer`, `metric`, `n_train_examples`,
`n_demos_compiled`, `train_accuracy_before`, `train_accuracy_after` —
reviewers can defend why this prompt shipped vs the baseline per §48
(explainability) + §59.4 (ORF metrics).

Drill: `tests/drills/drill_dspy_optimizer.py` (10 steps, 4 negative +
schema invariant) — offline-friendly via `dspy.utils.dummies.DummyLM`
so the drill doesn't need Ollama / OpenAI. Locks: default-off,
unavailable fallback, 4 distinct validation errors (empty / bad
optimizer / bad metric / missing keys), end-to-end compile with
DummyLM, §38.3 schema, status surface, disk-write failure tolerated.

## Stage-1 Adapter Aggregator — `/api/v1/agent-platform/adapters`

One read-only GET that answers "which §56.2 Stage-1 adapters are
installed, opt-in flag set, and ready to invoke RIGHT NOW?" without
hitting four different status endpoints. Currently covers all 4:
`agentops`, `llm-gateway`, `typed-council`, `dspy-optimizer`.

```bash
$ curl -s http://localhost:8000/api/v1/agent-platform/adapters \
    -H "X-Tenant-ID: tenant-a" \
    -H "X-Demo-Role: manager" | jq '.n_enabled, .n_importable, .adapters[].key'
```

Response shape:
```json
{
  "scanned_at": 1748419000.0,
  "n_adapters": 4,
  "n_enabled": 1,
  "n_importable": 4,
  "stage": "§56.2 Stage-1",
  "adapters": [
    {"key": "agentops",      "enabled": false, "importable": true, ...},
    {"key": "llm-gateway",   "enabled": false, "importable": true, ...},
    {"key": "typed-council", "enabled": false, "importable": true, ...},
    {"key": "dspy-optimizer","enabled": true,  "importable": true, ...}
  ]
}
```

Lazy-imports each adapter so a single SDK breakage never crashes the
endpoint — the bad row carries `importable: false` + `error_type`.
Adding a 5th adapter = register it in
`AgentPlatformIntegrationService.adapters_status()` and re-deploy.

Drill: `tests/drills/drill_adapters_endpoint.py` (10 steps, 4 negative)
locks: 4 stable keys, per-row schema, default-off, enable-flag echo,
broken-row tolerance, RBAC catch-entry, tenant echo, unknown-role 400.

## §68 HOLY Observability + Data Hub — Iteration 1 (DB Viewer + per-function tables)

Reference impl of global §68. Two surfaces shipped:

**§68.1 DB Viewer** — `/api/v1/holy/dbviewer/{_global, databases/{db_id}, databases/{db_id}/schemas/{schema}, databases/{db_id}/schemas/{schema}/tables/{table}, databases/{db_id}/schemas/{schema}/tables/{table}/sample}`. Read-only Postgres introspection with PII redaction + tenant-scoped SQL + best-effort graceful degradation (DB unreachable → status=`unreachable`, never crashes).

**§68.2 Per-function tables** — `/api/v1/holy/dbviewer/process-tables/{_global, {dept}, {dept}/{process_id}}`. Surfaces the primary + secondary table map per process from `data/dbviewer/per_process_tables.json`. Catalog is the foundation for §68.11 multi-model comparison (knowing the input/output table → know what to score).

```bash
# What tables back lead_scoring?
curl -s http://localhost:8000/api/v1/holy/dbviewer/process-tables/sales/lead_scoring \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq .process

# 10 rows from dim_customer, PII redacted
curl -s 'http://localhost:8000/api/v1/holy/dbviewer/databases/holy/schemas/public/tables/dim_customer/sample?limit=10' \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager"
```

Drill: `tests/drills/drill_dbviewer.py` (12 steps, 4 negative + §38.3 schema invariant). Offline-capable — uses graceful degradation as a positive case so the drill runs without docker postgres.

Tool comparison locking the "build thin, not embed heavy" verdict: [`docs/dbviewer/TOOL_COMPARISON.md`](dbviewer/TOOL_COMPARISON.md). Documents why CloudBeaver / pgweb / Adminer / Datasette / Metabase / sqladmin were all skipped (license / heavy runtime / bypasses TenantId+RBAC+audit+PII stack).

Next iterations of §68 (per the policy roadmap):
- iter 2 — §68.5 Guardrails + §68.6 PII inventory
- iter 3 — §68.7 Security posture
- iter 4 — §68.8/9/10 Functional + cost + safety eval triplet
- iter 5 — §68.11 Multi-model compare
- iter 6 — §68.12 Langfuse Stage-1 adapter (5th in series)
- iter 7 — Frontend Observability Hub page

## CUA Audit-Log Rotation (§38.3)

`scripts/audit_compact.py` rotates `cua_runs.jsonl` when it crosses
`CUA_AUDIT_ROTATE_BYTES` (default 50MB). NEVER drops rows — atomic
gzip + replace + audit-of-audit at `audit_compact_runs.jsonl`.

Drill: `tests/drills/drill_audit_compact.py` (9 steps, 4 negative)
locks: archive preserves all rows including corrupt + blank.

## BMad Methodology (installed in this clone)

Installed via `scripts/bmad.sh install --modules bmm --tools claude-code`.
Per-user config (`_bmad/config.user.toml`) is gitignored. To install in a
fresh clone:

```bash
scripts/bmad.sh install --modules bmm --tools claude-code --yes --directory .
scripts/bmad.sh status
```

The install populates two surfaces:
- `_bmad/` — methodology config + workflow phase dirs (committed)
- `.claude/skills/bmad-*/` — 44 executable skills wired for Claude Code

Drill: `tests/drills/drill_bmad_installed.py` (8 steps, 3 negative)
locks the install contract: config files present, skill manifest enumerates
≥ 20 skills, .claude/skills wiring landed, no host-path leaks, no secrets.
