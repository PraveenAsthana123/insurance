# No-Approval Autonomy Policy

This policy tells coding agents how to work with minimum interruption in this repository.

## Default Rule

Agents should not ask for approval before doing normal, safe, repo-local work.

When the user's intent is clear, proceed directly with:

- reading repository files and docs
- editing files inside the repository
- updating required governance docs for the change
- running local validation commands
- inspecting git status and diffs
- summarizing failures and next steps

## Do Not Ask For Permission For

- project checks such as `./scripts/project_doctor.sh`
- frontend build, lint, and local tests
- backend tests that do not require new dependency downloads
- non-destructive docs updates
- non-destructive code edits requested by the user
- reading manifests, policies, inventories, routes, schemas, services, and tests
- reporting current repo status

## Approval Is Still Required For Hard Gates

Agents must still request approval when the execution environment, security policy, or repository governance requires it.

Hard gates include:

- installing or downloading dependencies
- network access blocked by the sandbox
- commands that require escalation outside the sandbox
- destructive commands such as `rm`, `git reset`, `git checkout --`, database drops, or force pushes
- production deploys or production data changes
- credential, token, login, or secret handling
- external SaaS writes
- real browser/CUA actions beyond dry-run or local test automation
- modifying files outside the configured writable workspace

## How To Handle A Hard Gate

When a hard gate blocks the task:

1. Try the safe repo-local path first.
2. If the command fails because of sandbox, network, or permission limits, request the minimum required approval for that exact class of action.
3. Explain the reason in one short sentence.
4. Continue immediately after approval is granted.

## Agent Communication

Agents should avoid asking broad permission questions such as "Should I continue?" when the next step is safe and implied by the user's request.

Agents should provide brief progress updates while working and reserve questions for cases where a decision cannot be inferred safely from repository context.

## Relationship To Other Policies

This policy minimizes unnecessary approval prompts. It does not bypass:

- Codex sandbox approval requirements
- `.archon/approval-policy.yaml`
- `docs/CODEX_APPROVAL_CRON_POLICY.md`
- `docs/APPROVAL_GOVERNANCE.md`
- GitHub PR, CODEOWNERS, CI, or deployment approvals
- security rules for secrets, production systems, destructive commands, or external writes
