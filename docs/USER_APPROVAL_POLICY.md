# User Approval Policy

This policy records the standing user instruction for this repository: all safe repo-local work is approved by default. Agents should not ask the user for routine approval before reading, editing, validating, documenting, or fixing files inside this workspace.

It applies to Codex, Claude, local agents, approval broker flows, Archon local workflows, OpenClaw task routing, and other automation working inside `/mnt/deepa/insur_project`.

## Standing User Approval

The user has explicitly granted standing approval for safe, non-destructive, repo-local work. Treat this as pre-approval for normal implementation, docs, validation, audit, and local workflow steps. Do not pause for a separate "should I continue" confirmation when the next step is safe and implied by the task.

Agents may proceed directly with:

- reading project files and governance docs
- creating or editing files inside this repository
- updating docs required by governance policy
- running local lint, build, test, doctor, status, and diff commands
- creating plans, runbooks, specs, BMAD handoffs, and task workspaces
- submitting safe local OpenClaw tasks
- running dry-run browser/CUA envelopes
- inspecting local logs, queues, schedules, manifests, and reports
- summarizing failures and taking the next safe repo-local fix step

## Do Not Ask Repeatedly For

Do not ask the user to approve each small safe step such as:

- `rg`, `sed`, `git diff`, `git status`
- frontend lint/build
- backend tests that use already-installed dependencies
- docs updates
- code edits requested by the user
- local status checks
- local agent supervisor checks
- safe local Archon approval gates covered by `.archon/approval-policy.yaml`

## Hard Gates Still Apply

Standing approval does not bypass platform, security, or production gates. These are not routine approval prompts; they are hard controls imposed by the runtime, sandbox, or safety policy.

Agents must still use the required tool/platform approval path for:

- dependency downloads or installs
- network access blocked by the sandbox
- sandbox escalation required by the execution environment, using the narrowest command scope
- credentials, API keys, login, tokens, or secrets
- destructive commands, including `rm`, `git reset`, `git checkout --`, database drops, force push, or irreversible cleanup
- production deploys or production data changes
- external SaaS writes
- real browser/CUA actions with side effects
- files outside the writable workspace
- GitHub admin, merge, release, branch-protection, or auth operations

## Required Hard-Gate Behavior

When a hard gate is unavoidable, do not ask a separate conversational question first. Use the tool or platform approval mechanism directly.

1. Request the narrowest approval needed.
2. Explain the reason in one sentence.
3. Prefer a scoped command prefix over broad unrestricted approval.
4. Continue immediately after approval is granted.
5. Record any behavior or policy change in the relevant docs.

## Automation Rules

Safe local automation may run continuously or on a schedule only when it stays inside the allowed scope.

Allowed:

- safe local approval scans
- status monitoring
- queue supervision
- report generation
- process-test dry runs
- recurring safe local OpenClaw tasks
- docs or spec generation

Not allowed without explicit hard-gate approval:

- installing packages from the internet
- writing to external systems
- changing production resources
- executing destructive cleanup
- using credentials or secrets
- performing real browser/computer actions against non-local targets

## Relationship To Other Policies

This policy is the user-level instruction. It works with, and does not replace:

- `docs/NO_APPROVAL_AUTONOMY_POLICY.md`
- `docs/APPROVAL_GOVERNANCE.md`
- `docs/CODEX_APPROVAL_CRON_POLICY.md`
- `docs/CODEX_APPROVAL_ADVANCED_POLICY.md`
- `docs/AI_COMMAND_CENTER_MONITORING_DELEGATION_RUNBOOK.md`
- `.archon/approval-policy.yaml`
- Codex/Claude platform sandbox rules
- GitHub, CI, CODEOWNERS, and deployment approval gates

## Short Version For Agents

Proceed with safe repo-local work. Do not interrupt for routine reads, edits, checks, plans, docs, local task routing, or validation. User approval is already granted for that scope. Use explicit tool/platform approval only for hard gates and keep the request narrow.
