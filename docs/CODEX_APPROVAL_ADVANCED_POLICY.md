# Codex Approval Advanced Policy

This policy defines advanced local approval automation for Codex-assisted development.

## Purpose

Advanced mode removes repeated local Archon approval clicks during active workflows by running the safe approval helper continuously instead of waiting for cron.

## Components

- `scripts/install_codex_approval_advanced.sh`: installs and starts advanced mode.
- `scripts/archon_auto_approve_safe.py`: makes the actual approval decision.
- `.archon/approval-policy.yaml`: allowlist for workflows and gates.
- `scripts/install_codex_approval_cron.sh`: one-minute fallback cron.

## Runtime

Preferred runtime is a user systemd service:

```text
insur-codex-approval-watch.service
```

Fallback runtime is a background process with PID file:

```text
jobs/codex_approval_watch.pid
```

Logs are written to:

```text
jobs/logs/codex_approval_watch.log
jobs/logs/codex_approval_cron.log
```

## Commands

Install/start advanced mode:

```bash
scripts/install_codex_approval_advanced.sh
```

Check status:

```bash
scripts/install_codex_approval_advanced.sh status
```

Stop advanced mode:

```bash
scripts/install_codex_approval_advanced.sh stop
```

## Approval Scope

Advanced mode uses the same safe approval policy as cron mode. It may approve only local Archon workflow gates that match `.archon/approval-policy.yaml`.

It must not approve or bypass:

- Codex platform or sandbox approval prompts
- dependency downloads or network approval prompts
- destructive commands
- production deploys or production data changes
- secrets, credentials, tokens, or login flows
- external SaaS writes
- GitHub auth, push, merge, release, or branch protection changes
- real browser/CUA side effects
- approval policy changes

## Cadence

Default watcher interval:

```text
2 seconds
```

Override at install time:

```bash
CODEX_APPROVAL_WATCH_INTERVAL=1 scripts/install_codex_approval_advanced.sh
```
