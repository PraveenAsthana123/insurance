# Advanced Agentic Stack Setup

This document defines the advanced local setup for BMAD, Archon, and OpenClaw in this repository.

## Goal

Provide one command surface for the local planning, workflow, approval, and agent-task submission tools used by Codex/Claude.

## Components

| Component | Role | Advanced setup action |
|---|---|---|
| BMAD | Planning, PRD, architecture, story, review methodology | `scripts/bmad.sh status` verifies the local BMAD method install. |
| Archon | Local governed workflow harness | `archon workflow list` and `archon workflow status --json` verify workflows. |
| Codex approval watcher | Safe local Archon gate automation | `scripts/install_codex_approval_advanced.sh start` runs a user service every 2 seconds. |
| OpenClaw bridge | Local API/Redis task submission bridge | Docker backend/Redis are started and `/api/v1/openclaw/*` is checked. |
| Agent fleet | Local simple/council worker harness | `scripts/agent_fleet.sh platform-status` and supervisor checks verify readiness. |

## Main Command

Run the full advanced setup:

```bash
scripts/setup_advanced_agentic_stack.sh setup
```

Check status without a smoke task:

```bash
scripts/setup_advanced_agentic_stack.sh status
```

Start only local services and approval watcher:

```bash
scripts/setup_advanced_agentic_stack.sh start
```

Run an OpenClaw smoke submission:

```bash
scripts/setup_advanced_agentic_stack.sh smoke
```

Stop the advanced approval watcher:

```bash
scripts/setup_advanced_agentic_stack.sh stop-approval
```

## Report

Each run writes a local status report:

```text
jobs/reports/advanced_agentic_stack_status.txt
```

## Operating Flow

1. Use BMAD to shape the work: PRD, architecture, story, review, readiness.
2. Use Archon for governed local workflows: `insur-project-doctor-fix` or `insur-api-change-governance`.
3. Let the advanced approval watcher handle safe local Archon gates.
4. Use OpenClaw through `scripts/agent_fleet.sh submit-*` or `/api/v1/openclaw/tasks` for agent/council work.
5. Use supervisor commands to inspect queues, workers, schedules, and results.

## Boundaries

Advanced setup does not bypass:

- Codex platform/sandbox approval prompts
- dependency downloads or blocked network access
- secrets, credentials, tokens, or login flows
- production deploys or production data changes
- destructive shell commands
- GitHub push, merge, release, auth, or branch protection changes
- real browser/CUA side effects
- external SaaS writes

## Related Docs

- `docs/BMAD_RECIPES.md`
- `docs/APPROVAL_GOVERNANCE.md`
- `docs/CODEX_APPROVAL_ADVANCED_POLICY.md`
- `docs/AGENT_PLATFORM_SETUP.md`
- `docs/AGENT_HARNESS_GUIDE.md`
- `docs/AGENTIC_BROWSER_WIRING_STATUS.md`
