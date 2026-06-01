# Agent Platform Setup

This document is the local setup contract for Harness Agent, OpenClaw, Paperclip, PoliysAI, CUA, Stagehand, and Playwright agentic browser execution.

## Current Wiring

| Tool | Local status | What works now | External status |
|---|---|---|---|
| Harness Agent | Working local | `scripts/agent_fleet.sh`, scheduler, supervisor, Redis queues, worker scaling, task status, reports | No external harness product installed. |
| OpenClaw | Working local | `/api/v1/openclaw/*` task enqueue, manifest, status, result polling | External OpenClaw gateway/SDK not bundled. |
| Paperclip | Working local | `/api/v1/paperclip/*` artifact storage, PII redaction, hashing, context packs | External Paperclip framework not bundled. |
| PoliysAI | Working local governance facade | `/api/v1/agent-platform/governance/evaluate` policy decisions, denylist, approval routing | External provider optional; set `POLIYSAI_API_KEY` only when selected. |
| CUA | Dry-run contract | `/api/v1/agent-platform/cua/execute` validates and audits CUA/browser intent | Real computer-use execution disabled until allowlist, approval, session audit, and executor exist. |
| Stagehand | Dry-run contract | Tool status and CUA adapter selection | Requires Stagehand package and `BROWSERBASE_API_KEY`; real sessions disabled. |
| Playwright agentic adapter | Working local (real navigation) | Real headless-Chromium navigation behind `PLAYWRIGHT_ALLOWLIST` (default: `http://localhost,http://127.0.0.1`). Audit row per session at `data/agent-supervisor/cua_runs.jsonl`. Drill at `tests/drills/drill_agent_platform_cua.py`. | `pip install playwright && python -m playwright install chromium`. Off-allowlist targets blocked at gateway. |
| Pydantic AI typed council | Stage-2 opt-in pilot | `POST /api/v1/agent-platform/typed-council/run` returns typed author/reviewer/chair results when enabled. Defaults to disabled/unavailable without provider calls. | Requires `pydantic_ai` and `HOLY_TYPED_COUNCIL_ENABLED=true`; provider credentials depend on selected `HOLY_LLM_MODEL`. |
| Approval Broker | Working local policy facade | `POST /api/v1/agent-platform/approval-broker/decide` classifies approve/submit/next requests, auto-approves low-risk local work, and can submit safe next tasks to OpenClaw. | Local rules only; does not bypass human approval for production, credentials, deploys, destructive commands, real browser/CUA, or GitHub admin actions. |

## Ollama And Kivi Model

The local 100-agent runtime uses `AGENT_MODEL=kivi:local` by default. `kivi:local` is created from `ollama_models/kivi.Modelfile` and defaults to `BASE_MODEL=gemma3:1b`.

```bash
./scripts/agent_fleet.sh ollama-setup
./scripts/agent_fleet.sh ollama-status
./scripts/setup_kivi_model.py --check-only
./scripts/agent_fleet.sh start-100-kivi 100 100
```

Other projects should read `docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md` before using these services.

## Operator Commands

Check full setup:

```bash
./scripts/setup_agent_platform.py status
./scripts/agent_fleet.sh platform-status
```

Print machine-readable manifest:

```bash
./scripts/setup_agent_platform.py manifest
./scripts/agent_fleet.sh platform-manifest
```

Run and supervise agents:

```bash
./scripts/agent_fleet.sh start-simple 100 100
./scripts/agent_fleet.sh start-council 5 20
./scripts/agent_fleet.sh supervisor-watch
./scripts/agent_fleet.sh supervisor-health
```

## API Surface

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/agent-platform/status` | Aggregated setup status for Harness/OpenClaw/Paperclip/PoliysAI/CUA/Stagehand/Playwright. |
| `GET /api/v1/agent-platform/manifest` | Machine-readable architecture and contracts. |
| `POST /api/v1/agent-platform/governance/evaluate` | Evaluate whether an agent/tool action is allowed, denied, or requires approval. |
| `POST /api/v1/agent-platform/approval-broker/decide` | Decide approve/submit/next, auto-approve safe local work, and optionally enqueue safe next tasks through OpenClaw. |
| `POST /api/v1/agent-platform/cua/execute` | Submit a policy-gated CUA/browser action envelope. Defaults to dry-run. |
| `POST /api/v1/agent-platform/typed-council/run` | Run the opt-in Pydantic AI typed author/reviewer/chair council. Defaults to disabled unless explicitly enabled. |

## Example Approval Broker Next Task

Safe local approve only:

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/approval-broker/decide \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -H 'X-Tenant-ID: tenant-a' \
  -d '{"action":"approve next local docs validation","target":"project_doctor dry-run"}'
```

Safe local approve and submit next task to OpenClaw:

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/approval-broker/decide \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -H 'X-Tenant-ID: tenant-a' \
  -d '{"action":"approve next local validation","target":"project_doctor","submit_next":true,"next_prompt":"Run project_doctor and summarize failures","department":"engineering","mode":"council"}'
```

The broker returns `require_human_approval` or `deny` for production, secrets, deployment, destructive commands, GitHub admin/auth, real browser/CUA, and other high-risk requests.

## Example Governance Check

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/governance/evaluate   -H 'Content-Type: application/json'   -H 'X-Demo-Role: tester'   -d '{"agent_id":"security-agent","tool":"poliysai","action":"read dashboard","target":"/holy/sales","user_role":"tester"}'
```

Dangerous targets such as secrets, tokens, private keys, production deletion, and force-push patterns are denied.

## Example Typed Council Run

Default-off health check:

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/typed-council/run \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-Role: manager' \
  -H 'X-Tenant-ID: tenant-a' \
  -d '{"prompt":"Should we deploy the new pricing workflow?"}'
```

Enable only for an explicit pilot:

```bash
export HOLY_TYPED_COUNCIL_ENABLED=true
export HOLY_LLM_MODEL=openai/gpt-4o-mini
```

The endpoint remains RBAC-gated to manager/tester roles and tenant-attributed from `X-Tenant-ID`.

## Example CUA Dry Run

```bash
curl -X POST http://localhost:8000/api/v1/agent-platform/cua/execute   -H 'Content-Type: application/json'   -H 'X-Demo-Role: manager'   -d '{"instruction":"click refresh in browser","target":"http://localhost:3000","adapter":"stagehand","dry_run":true}'
```

The local response records the selected adapter, policy decision, and dry-run result. It does not click the browser.

## Production Enablement Gates

Do not enable real CUA/Stagehand/Playwright side effects until all are implemented:

- target allowlist
- human approval for write/destructive actions
- session recording or trace retention
- audit log with correlation id, agent id, user role, tool, action, target, and result
- secret redaction
- timeout and circuit breaker
- sandbox/session isolation
- rollback or compensation path
- tests for allowed, denied, approval-required, timeout, and malformed-output paths

## Validation

Focused checks:

```bash
python3 -m py_compile backend/schemas/agent_platform.py backend/services/agent_platform_service.py backend/routers/agent_platform.py scripts/setup_agent_platform.py
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_agent_platform_router.py -q
```

Full repo gate:

```bash
./scripts/project_doctor.sh
```
