# Archon Setup For Insur Analytics Dashboard

Archon is configured as a developer workflow harness for this repository. It is not part of the production FastAPI, React, Redis/Celery, RAG, or agent runtime.

## Local Workflows

- `insur-project-doctor-fix`: governance check -> implementation/docs -> validation.
- `insur-api-change-governance`: API/backend change workflow with catalog and inventory reminders.

## Commands

- `insur-governance-check`
- `insur-implement-with-docs`
- `insur-validate`

## Safe Auto-Approval

The local approval policy is `.archon/approval-policy.yaml`. It can reduce repeated approve clicks for safe local Archon workflow gates.

```bash
python3 scripts/archon_auto_approve_safe.py --dry-run
python3 scripts/archon_auto_approve_safe.py --approve
python3 scripts/archon_auto_approve_safe.py --watch --approve
```

The helper only approves safe local BEV workflow gates. It skips production deploys, secrets, destructive shell actions, GitHub auth/branch protection, real browser/CUA side effects, and broad permission sessions.

## Cron

Install the Codex safe local approval cron:

```bash
scripts/install_codex_approval_cron.sh
```

The cron job runs the safe approval helper periodically and logs to `jobs/logs/codex_approval_cron.log`. Policy details live in `docs/CODEX_APPROVAL_CRON_POLICY.md`.

## Example

```bash
archon workflow list
archon workflow run insur-project-doctor-fix "fix the current project_doctor failure"
```

Use Archon only for developer automation. Production tool adoption still requires the controls in `docs/AGENT_TOOL_SELECTION_MATRIX.md`.
