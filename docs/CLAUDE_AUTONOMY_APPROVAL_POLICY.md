# Claude Autonomy And Approval Policy

This policy tells Claude Code how to finish local tasks without repeated approval prompts in this repository.

## Default Behavior

Claude should proceed autonomously for safe repo-local work when the user intent is clear.

Safe repo-local work includes:

- reading repository files and governance docs
- editing files inside this repository
- updating required docs after code or workflow changes
- running local checks, builds, lint, and tests
- running repo scripts under `scripts/`
- inspecting git status and diffs
- using BMAD for planning and review structure
- using Archon workflows for governed implementation
- using OpenClaw for local agent/council task submission
- using the local scheduler and cron installers
- using Ollama for local planning or summarization

## Do Not Ask For Approval For

- `scripts/setup_advanced_agentic_stack.sh status|setup|start`
- `scripts/install_codex_approval_advanced.sh status|start`
- `scripts/install_codex_approval_cron.sh`
- `scripts/automation_job_runner.py status|plan|run-once|execute|install-cron`
- `./scripts/agent_fleet.sh status|watch|supervisor|supervisor-watch|platform-status|platform-manifest`
- `./scripts/agent_fleet.sh submit-simple ...`
- `./scripts/agent_fleet.sh submit-council ...`
- `./scripts/agent_fleet.sh schedule-add ...`
- `./scripts/agent_fleet.sh schedule-list|schedule-once|schedule-run`
- `./scripts/bmad.sh status`
- `archon workflow list`
- `archon workflow status --json`
- `python3 scripts/archon_auto_approve_safe.py --approve`

## Hard Gates That Still Require Human Approval

Claude must still stop for explicit human approval when the action involves:

- production deployment or production data change
- secrets, tokens, credentials, login, or OAuth scopes
- destructive shell commands such as broad `rm`, `git reset --hard`, database drops, force-pushes, or branch protection changes
- package publishing or Docker image publishing
- external SaaS writes
- real browser/CUA side effects outside dry-run/local allowlist
- changing this policy or `.claude/settings*.json` in a way that broadens access to dangerous operations

## Automation Path

When the user asks Claude to complete a task automatically:

1. Read `docs/GOVERNANCE_INDEX.md`.
2. If planning is needed, use BMAD or create a plan file.
3. If workflow governance is needed, use Archon.
4. Keep `scripts/install_codex_approval_advanced.sh` running so safe Archon gates are auto-approved.
5. Use OpenClaw or `scripts/automation_job_runner.py` for agent/council execution.
6. Use scheduler or cron for recurring work.
7. Use supervisor/status commands for monitoring.
8. Run focused validation and summarize results.

## Practical One-Command Setup

```bash
scripts/setup_advanced_agentic_stack.sh setup
scripts/install_codex_approval_advanced.sh status
```

## Task Completion Pattern

For a safe local automation task, Claude should prefer:

```bash
scripts/automation_job_runner.py run-once --department engineering --mode council --text "<task>"
```

For recurring work:

```bash
scripts/automation_job_runner.py install-cron --name <job-name> --cron "*/30 * * * *" --department engineering --mode council --text "<task>"
```

For 100-agent work:

```bash
./scripts/agent_fleet.sh start-simple 100 100
./scripts/agent_fleet.sh start-council 5 20
./scripts/agent_fleet.sh supervisor-watch
```

## Important Limit

This policy reduces repo-local Claude workflow approval prompts. It cannot bypass Claude Code platform-level permission prompts if the Claude runtime itself requires them. Configure those through Claude Code permissions/settings, not through project code.
