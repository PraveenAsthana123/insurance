# Global Agent Service Policy

This policy defines how other projects may access the HOLY local agent services: Harness Agent, OpenClaw, Paperclip, PoliysAI governance, CUA dry-run gateway, Stagehand/Playwright contracts, Redis queues, and Ollama/Kivi model service.

## Service Boundary

Other projects must integrate through stable service contracts, not by importing internal Python modules directly.

| Capability | Allowed integration | Do not use |
|---|---|---|
| Agent task submission | `POST /api/v1/openclaw/tasks` or `./scripts/agent_fleet.sh submit-*` | Direct Redis writes from another repo unless explicitly approved. |
| Task result polling | `GET /api/v1/openclaw/tasks/{task_id}` | Reading worker internals or container logs as a contract. |
| Artifact/context sharing | `/api/v1/paperclip/*` | Writing files directly into `data/paperclip`. |
| Governance | `/api/v1/agent-platform/governance/evaluate` and `/api/v1/agent-platform/approval-broker/decide` | Bypassing policy for tools, shell, browser, API execution, approve/submit/next, or downstream task submission. |
| CUA/browser actions | `/api/v1/agent-platform/cua/execute` in dry-run first | Real browser/computer-use side effects without approval/allowlist. |
| Fleet monitoring | `./scripts/agent_fleet.sh supervisor*` or `data/agent-supervisor/latest.json` | Assuming container count equals healthy agents. |
| Ollama/Kivi model | `OLLAMA_HOST`, `AGENT_MODEL=kivi:local` | Hardcoding private model paths or host-only URLs. |

## Required Environment For Client Projects

```bash
export HOLY_AGENT_API_URL=http://localhost:8000
export HOLY_OPENCLAW_URL=http://localhost:8000/api/v1/openclaw
export HOLY_PAPERCLIP_URL=http://localhost:8000/api/v1/paperclip
export HOLY_AGENT_PLATFORM_URL=http://localhost:8000/api/v1/agent-platform
export HOLY_OLLAMA_URL=http://localhost:11434
export HOLY_AGENT_MODEL=kivi:local
export HOLY_AGENT_ROLE=tester
```

Inside Docker Compose networks, use service names:

```bash
export HOLY_AGENT_API_URL=http://backend:8000
export HOLY_OLLAMA_URL=http://ollama:11434
export HOLY_REDIS_URL=redis://redis:6379/0
```

## 100-Agent Runtime Standard

Default local runtime:

```bash
./scripts/agent_fleet.sh ollama-setup
./scripts/agent_fleet.sh start-100-kivi 100 100
./scripts/agent_fleet.sh supervisor-watch
```

Minimum runtime controls:

- `SIMPLE_AGENTS=100` for high-throughput simple execution.
- `COUNCIL_AGENTS=5` for review/governance tasks.
- `AGENT_MODEL=kivi:local` for simple agents.
- `COUNCIL_AUTHOR_MODEL=kivi:local`, `COUNCIL_REVIEWER_MODEL=kivi:local`, `COUNCIL_CHAIR_MODEL=kivi:local` for council agents.
- `OLLAMA_TIMEOUT` and `STAGE_TIMEOUT` must be tuned before long-running workloads.

## Ollama/Kivi Policy

`kivi:local` is a local Ollama model alias defined in `ollama_models/kivi.Modelfile`. It uses `BASE_MODEL=gemma3:1b` by default because that is already compatible with this repo.

Setup:

```bash
BASE_MODEL=gemma3:1b KIVI_MODEL=kivi:local ./scripts/setup_ollama_models.sh setup
# Or against host/remote Ollama without Docker Compose:
./scripts/setup_kivi_model.py --ollama-host http://localhost:11434 --base-model gemma3:1b --kivi-model kivi:local
```

Override base model only after verifying memory and latency:

```bash
BASE_MODEL=<your-model> KIVI_MODEL=kivi:local ./scripts/setup_ollama_models.sh setup
```

Do not force every agent to a large model. For 100 agents, prefer a small local model and route expensive tasks to council or specialist queues.

## Security And Governance Rules

Every external project must follow this order:

```text
request -> governance/evaluate or approval-broker/decide -> OpenClaw/Paperclip/CUA endpoint -> supervisor/report -> audit evidence
```

Mandatory controls:

- Use `X-Demo-Role` or future JWT/service identity on API calls.
- Use `governance/evaluate` before shell, browser, deployment, database, or tool execution.
- Keep CUA/Stagehand/Playwright in dry-run unless the target allowlist, human approval, sandboxing, trace retention, timeout, and rollback path exist.
- Never send secrets, API keys, private keys, or raw PII to prompts or Paperclip artifacts.
- Store task ids and correlation ids in the caller project logs.
- Poll task status through OpenClaw, not by scraping Redis directly.

## Observability Requirements

Client projects must record:

- `task_id`
- source project name
- user/service role
- department/domain
- selected mode: `simple` or `council`
- model name
- policy decision
- queue name
- completion status
- error message, if any

Use:

```bash
./scripts/agent_fleet.sh supervisor-report
```

The report path is `data/agent-supervisor/latest.json`.

## Promotion Gates

Before another project depends on these services:

```bash
./scripts/setup_agent_platform.py status
./scripts/agent_fleet.sh ollama-status
./scripts/agent_fleet.sh supervisor-health
./scripts/project_doctor.sh
```

Required result:

- setup status is `ready-local`
- OpenClaw is working-local
- Paperclip is working-local
- PoliysAI governance facade is working-local
- supervisor health is healthy
- project doctor failures are zero
