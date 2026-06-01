# Codex Approval Cron Policy

This policy defines the scheduled approval behavior for Codex-assisted local development in this repository.

## Advanced Mode

For active workflows with repeated safe local gates, use `docs/CODEX_APPROVAL_ADVANCED_POLICY.md` and `scripts/install_codex_approval_advanced.sh`. Cron remains the fallback.

## Purpose

The cron job reduces repeated local approval clicks for safe Archon developer workflow gates. It supports the no-approval autonomy policy by keeping low-risk local workflow gates moving without operator interruption.

## Run Plan

Operational checklist: `docs/CODEX_APPROVAL_CRON_RUN_PLAN.md`.

## Installed Job

Installer:

```bash
scripts/install_codex_approval_cron.sh
```

Default cron entry:

```cron
* * * * * cd /mnt/deepa/insur_project && python3 scripts/archon_auto_approve_safe.py --approve >> jobs/logs/codex_approval_cron.log 2>&1
```

The schedule can be overridden at install time:

```bash
CODEX_APPROVAL_CRON_SCHEDULE="*/2 * * * *" scripts/install_codex_approval_cron.sh
```

## Scope

The cron job only runs the existing safe approval helper:

```bash
python3 scripts/archon_auto_approve_safe.py --approve
```

That helper is constrained by `.archon/approval-policy.yaml` and only approves safe local Archon workflow gates for the approved local workflows.

## Allowed Auto-Approval

The cron job may approve only low-risk local gates that match all of these conditions:

- workflow is listed in `.archon/approval-policy.yaml`
- gate is listed in `.archon/approval-policy.yaml`
- run is waiting for approval
- run text does not include blocked risk keywords
- work is local developer workflow only
- required docs and validation remain in force

## Never Auto-Approved

The cron job must not approve or bypass:

- Codex sandbox escalation prompts
- dependency downloads or network access prompts
- destructive shell actions
- production deploys or production data changes
- database migrations or destructive data changes
- secrets, tokens, credentials, or login flows
- GitHub auth, merge, push, branch protection, or release actions
- real browser/CUA keyboard or mouse side effects
- external SaaS writes or connector authorization
- changes to approval policy files themselves

## Logs

Cron output is appended to:

```text
jobs/logs/codex_approval_cron.log
```

## Operational Rule

This policy automates safe local workflow approval only. It does not create a general permission bypass for Codex, Claude, Copilot, Archon, GitHub, CI, deployment environments, or the local sandbox.
