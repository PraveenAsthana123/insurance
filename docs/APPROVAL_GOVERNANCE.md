# Approval Governance

This repo uses a layered approval model for AI-assisted development.

## Local AI Workflow Gates

Archon workflows in `.archon/workflows/` pause at human approval gates before implementation and before final handoff.

Useful commands:

```bash
archon workflow run insur-project-doctor-fix "fix the current project issue"
archon workflow status --json
archon workflow approve <run-id> --comment "approved"
archon workflow reject <run-id> --reason "revise tests/docs"
```

## Safe Local Auto-Approval

Repeated local Archon approval clicks can be automated for low-risk developer workflow gates. The policy lives at `.archon/approval-policy.yaml` and is executed by `scripts/archon_auto_approve_safe.py`.

Use dry-run first:

```bash
python3 scripts/archon_auto_approve_safe.py --dry-run
```

Approve safe pending gates once:

```bash
python3 scripts/archon_auto_approve_safe.py --approve
```

Watch and approve safe pending gates as they appear:

```bash
python3 scripts/archon_auto_approve_safe.py --watch --approve
```

Auto-approval is allowed only for the BEV local workflows `insur-project-doctor-fix` and `insur-api-change-governance`, and only for plan/handoff gates that do not mention production deploys, secrets, destructive commands, browser/CUA real execution, external SaaS writes, GitHub auth, branch protection, or git reset/force-push operations.

This policy does not bypass Codex sandbox approvals, GitHub PR approvals, CODEOWNERS, deployment environment approvals, or any operator-only credential/login flow.

## Approval Broker

The local approval broker endpoint provides a programmable approve/submit/next policy surface:

```text
request -> classify risk -> auto approve safe local work -> optionally submit next task to OpenClaw
```

Endpoint:

```text
POST /api/v1/agent-platform/approval-broker/decide
```

It may auto-approve low-risk local validation, docs, status, dry-run, and next-task orchestration. It returns `require_human_approval` or `deny` for production deploys, secrets, destructive shell commands, GitHub auth or branch protection, real browser/CUA, database migrations, or external SaaS writes.

OpenClaw submission happens only when `submit_next=true`, `next_prompt` is present, and the request is low-risk.

## Pull Request Gates

`.github/CODEOWNERS` maps backend, frontend, docs, CI, and agent-tooling paths to `@PraveenAsthana123`.

To enforce this in GitHub repository settings:

1. Protect `main`.
2. Require a pull request before merging.
3. Require approvals.
4. Require review from Code Owners.
5. Require status checks to pass before merging.
6. Require branches to be up to date before merging.
7. Require approval of the most recent reviewable push.
8. Dismiss stale approvals when new commits are pushed.

## CI Governance Checks

`.github/workflows/ci.yml` runs `scripts/governance_diff_check.sh` on PRs and pushes. The check enforces the project rule that behavior changes must update matching docs.

## Dark Factory Approval Chain

The dark factory flow is documented in `docs/DARK_FACTORY_OPERATING_MODEL.md`. Treat it as an operating model, not a production runtime:

```text
BMAD spec/story -> Archon implementation approval -> code/docs/tests -> project_doctor -> Archon handoff approval -> PR/CODEOWNERS -> deploy environment approval
```

BMAD owns planning structure. Archon owns repeatable local workflow gates. Codex, Claude, and Copilot assist implementation only inside repo governance. Harness Agent, OpenClaw, Paperclip, CUA, Stagehand, and Playwright must stay behind RBAC, tenant headers, dry-run/allowlist controls, audit readback, and service boundaries.

## Deployment Approval

`.github/workflows/deploy-approval-example.yml` is a no-op deployment gate example. It references the `production` environment. Configure required reviewers in GitHub Environments before using it for real deployment.

## Permission Rules

- Do not run Copilot with `--allow-all` or `--yolo` for sensitive changes.
- Keep Archon/Copilot as developer tooling, not production runtime infrastructure.
- Keep BMAD as planning/review methodology, not runtime infrastructure.
- Keep the dark factory model gated by human approval, CI, CODEOWNERS, deployment environments, audit, monitoring, and docs updates.
- Use `.archon/approval-policy.yaml` only for safe local Archon approval automation; do not use it to bypass production, credential, deploy, destructive, browser/CUA, or GitHub approval gates.
- Keep tokens in user-local secret stores such as `~/.archon/.env`, never in repo-local files.
- Use `./scripts/project_doctor.sh` before handing back production-facing changes.
