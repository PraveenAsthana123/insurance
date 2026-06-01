# Run And Debug Runbook

## GitHub Copilot CLI

GitHub Copilot CLI is installed as optional local developer tooling, not production runtime infrastructure.

```bash
copilot --version
copilot login
copilot -i "inspect this repo and summarize pending validation work"
copilot -p "explain the project_doctor failure" --allow-tool="shell(./scripts/project_doctor.sh)"
```

For headless use, Copilot CLI checks `COPILOT_GITHUB_TOKEN`, then `GH_TOKEN`, then `GITHUB_TOKEN`. Prefer narrow tool permissions over `--allow-all`/`--yolo`.

## Claude Autonomy Setup

Verify Claude's repo-local autonomy policy and start the safe approval automation:

```bash
scripts/setup_claude_autonomy.sh
```

Policy: `docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md`. This reduces repo-local approval loops, but cannot bypass Claude Code platform-level permission prompts.

## Voice/Text Automation

Plan and execute transcribed voice or typed text through Ollama and OpenClaw:

```bash
scripts/automation_job_runner.py status
scripts/automation_job_runner.py run-once --department sales --mode council --text "Review sales anomalies and create next actions"
```

Schedule with cron:

```bash
scripts/automation_job_runner.py install-cron --name sales-voice-review --cron "*/30 * * * *" --department sales --mode council --text "Review sales anomalies and create next actions"
```

Full runbook: `docs/VOICE_TEXT_AUTOMATION_RUNBOOK.md`.

## Advanced Agentic Stack

Set up BMAD, Archon, advanced approval watcher, OpenClaw, and agent platform status from one command:

```bash
scripts/setup_advanced_agentic_stack.sh setup
scripts/setup_advanced_agentic_stack.sh status
```

Run one OpenClaw smoke submission:

```bash
scripts/setup_advanced_agentic_stack.sh smoke
```

Run reports are written to `jobs/reports/advanced_agentic_stack_status.txt`. Policy and usage live in `docs/ADVANCED_AGENTIC_STACK_SETUP.md`.

## Archon Developer Workflow Harness

Archon is installed as an optional local developer workflow harness, not as production runtime infrastructure. Repo-local workflows live in `.archon/`.

```bash
archon --version
archon workflow list
archon workflow run insur-project-doctor-fix "fix the current project_doctor failure"
archon workflow run insur-api-change-governance "add or change an API endpoint"
```

Use `insur-project-doctor-fix` for project health failures and `insur-api-change-governance` for router/schema/service changes that require API catalog or inventory updates.

## BMAD And Dark Factory Governance

BMAD is local planning/review methodology. The dark factory flow is documented in `docs/DARK_FACTORY_OPERATING_MODEL.md` and must keep BMAD planning, Archon approval gates, coding agents, local agent-platform adapters, CI, monitoring, and human approvals separate.

```bash
./scripts/bmad.sh status
```

## Codex Approval Advanced Mode

Start the continuous safe local approval watcher:

```bash
scripts/install_codex_approval_advanced.sh
scripts/install_codex_approval_advanced.sh status
```

Stop it when needed:

```bash
scripts/install_codex_approval_advanced.sh stop
```

Policy: `docs/CODEX_APPROVAL_ADVANCED_POLICY.md`.

## Codex Approval Cron

Install or refresh the safe local approval cron:

```bash
scripts/install_codex_approval_cron.sh
```

Inspect the installed block:

```bash
crontab -l | sed -n "/CODEX-SAFE-APPROVAL/,/CODEX-SAFE-APPROVAL (insur_project) - end/p"
```

Watch approval cron logs:

```bash
tail -f jobs/logs/codex_approval_cron.log
```

Actively watch and approve safe local gates every 2 seconds:

```bash
scripts/watch_codex_approvals.sh
```

The cron job is governed by `docs/CODEX_APPROVAL_CRON_POLICY.md`, `docs/CODEX_APPROVAL_CRON_RUN_PLAN.md`, and `.archon/approval-policy.yaml`. It only scans safe local Archon approval gates.

## Approval Governance

Approval flow docs live in `docs/APPROVAL_GOVERNANCE.md`. Main commands:

```bash
archon workflow run insur-project-doctor-fix "fix the current project issue"
archon workflow status --json
archon workflow approve <run-id> --comment "approved"
archon workflow reject <run-id> --reason "revise tests/docs"
./scripts/governance_diff_check.sh
```

GitHub enforcement requires repository settings: protect `main`, require PR reviews, require CODEOWNERS review, and require CI checks.

## Doctor Setup

Run the default project health check:

```bash
./scripts/project_doctor.sh
```

This checks:

- frontend build
- frontend lint
- backend tests excluding opt-in evals
- docs/config drift

## Docker Setup

Start core services:

```bash
docker compose up -d postgres redis backend frontend adminer
```

Start AI/agent services:

```bash
docker compose up -d ollama
docker compose up -d --scale council_agents=2 council_agents
```

## Database Viewer

Start:

```bash
docker compose up -d postgres adminer
```

Open:

```text
http://localhost:8080
```

Credentials:

```text
System: PostgreSQL
Server: postgres
Username: insur_user
Password: insur_secret_password
Database: insur_analytics
```

## Debug Docker Containers

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f council_agents
```

## Debug Backend Locally

```bash
cd backend
../.venv/bin/uvicorn main:app --reload --port 8000
```

Open API docs:

```text
http://localhost:8000/docs
```

## Debug Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

F12 debug helpers:

```js
window.__BEV_DEBUG__.enable()
window.__BEV_DEBUG__.events()
window.__BEV_DEBUG__.clear()
window.__BEV_DEBUG__.disable()
```

## Debug Database Connection From Backend

```bash
docker compose exec backend python - <<'PY'
from core.config import get_settings
print(get_settings().database_url)
PY
```

## Debug API Endpoint

```bash
curl -v http://localhost:8000/api/v1/health
curl -v http://localhost:8000/api/v1/models
```

For RBAC demo routes:

```bash
curl -H 'X-Demo-Role: manager' http://localhost:8000/api/v1/sales/stores
```

## Logs In Terminal

Backend logs are emitted by Python logging and structured logger utilities. Watch them with:

```bash
docker compose logs -f backend
```

Agent logs:

```bash
docker compose logs -f council_agents
```
