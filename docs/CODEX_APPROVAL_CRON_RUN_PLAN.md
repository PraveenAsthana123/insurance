# Codex Approval Cron Run Plan

This run plan is the operational checklist for installing and executing the safe local Codex approval cron job.

## Goal

Keep safe local Archon workflow approval gates moving without repeated manual approval prompts.

## Scope

This plan covers only local Archon approval gates handled by:

```bash
scripts/archon_auto_approve_safe.py --approve
```

The approval decision remains constrained by `.archon/approval-policy.yaml` and `docs/CODEX_APPROVAL_CRON_POLICY.md`.

## Schedule

Default managed cron schedule:

```cron
* * * * *
```

Installed command:

```bash
cd /mnt/deepa/insur_project && /home/praveen/venv-ardupilot/bin/python3 /mnt/deepa/insur_project/scripts/archon_auto_approve_safe.py --approve >> /mnt/deepa/insur_project/jobs/logs/codex_approval_cron.log 2>&1
```

## Advanced Mode

For repeated gates, start the continuous watcher first:

```bash
scripts/install_codex_approval_advanced.sh
```

## Execution Steps

1. Refresh the managed crontab block:

```bash
scripts/install_codex_approval_cron.sh
```

2. Run the approval job immediately:

```bash
/home/praveen/venv-ardupilot/bin/python3 scripts/archon_auto_approve_safe.py --approve
```

Optional active watch while a workflow is running:

```bash
scripts/watch_codex_approvals.sh
```

3. Review the log:

```bash
tail -n 50 jobs/logs/codex_approval_cron.log
```

4. Confirm the managed cron block:

```bash
crontab -l | awk '/CODEX-SAFE-APPROVAL/{show=1} show{print} /CODEX-SAFE-APPROVAL \(insur_project\) - end/{show=0}'
```

## Allowed Outcome

The job may approve safe local workflow gates only when all policy checks pass.

If no workflow is waiting, the expected output is:

```text
No Archon workflow runs found.
```

## Blocked Outcome

The job must skip or fail closed for:

- production deployment
- secrets or credentials
- destructive shell commands
- dependency downloads or network approvals
- external SaaS writes
- GitHub auth, push, merge, release, or branch protection changes
- real browser/CUA side effects
- approval policy changes

## Evidence

Evidence for each manual run should include:

- installer output
- immediate job output
- current git status
- any pending Archon run decisions printed by the helper
