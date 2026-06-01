# Claude And Codex Handoff Policy

Claude and Codex must know what the other agent changed, why it changed, and how to continue safely.

## Shared State Files

| File | Purpose |
|---|---|
| `docs/GOVERNANCE_INDEX.md` | Single index of active policies and architecture docs. |
| `docs/global-services/GLOBAL_AGENT_APPROVAL_POLICY.md` | Approval and next-agent handoff rules. |
| `docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md` | Cross-project access policy for agent services. |
| `docs/AGENT_PLATFORM_SETUP.md` | Current setup status and commands. |
| `data/agent-supervisor/latest.json` | Latest supervisor machine report. |

## Required Handoff Entry

Whenever Claude or Codex completes a task, update or reference a handoff summary with:

- actor: `claude` or `codex`
- request summary
- files changed
- commands run
- tests run
- approval decisions
- remaining blockers
- next recommended agent

## Coordination Rules

- Claude must read governance docs before modifying agent/platform behavior.
- Codex must update docs when changing scripts, APIs, policies, or UI flows.
- Neither agent should overwrite unrelated user changes.
- If one agent starts a workflow, the next agent must check supervisor status and latest handoff before continuing.
- Browser/CUA execution must remain dry-run unless approval and allowlist are present.

## Current Codex Handoff

Codex has created:

- unified agent platform status API
- OpenClaw/Paperclip local bridge visibility
- PoliysAI governance facade
- CUA/Stagehand dry-run policy gate
- Kivi local Ollama model alias
- 100-agent startup command
- supervisor health/report commands
- approval-agent supervisor UI simulation at `/agent-supervisor`
- global service and approval policies

Claude should integrate by reading this policy plus `docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md` before adding project-specific automation.
