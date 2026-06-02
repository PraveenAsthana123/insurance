# KT + BMAD Space Runbook

`kt+bmad` is the repo-local kickoff/task space for turning a short request, voice transcript, or copied note into a BMAD-ready planning handoff and optional OpenClaw execution task.

## Purpose

Use this when the input is too small for a full PRD but should still enter the governed BMAD path:

1. Capture the task in a durable workspace under `jobs/kt-bmad/`.
2. Produce a `BMAD_HANDOFF.md` with the recommended BMAD flow.
3. Produce an `openclaw_payload.json` for automation.
4. Optionally submit the task to OpenClaw immediately.

## Commands

Create a workspace only:

```bash
scripts/kt_bmad_space.py create --title "fix catalog filters" --text "Check backend catalog filters and update tests/docs"
```

Create and submit to OpenClaw:

```bash
scripts/kt_bmad_space.py create --submit --department engineering --mode council --profile fast --text "Create BMAD story for the next project health fix"
```

Use a file or voice transcript:

```bash
scripts/kt_bmad_space.py create --file jobs/transcripts/latest.txt --submit
```

List workspaces:

```bash
scripts/kt_bmad_space.py list
```

## Policy

- BMAD remains the planning/review methodology, not runtime infrastructure.
- OpenClaw owns task submission/routing only after a workspace exists.
- Ollama profile selection follows `docs/AGENT_MODEL_ROUTING_POLICY.md`.
- Safe repo-local work can proceed under `docs/NO_APPROVAL_AUTONOMY_POLICY.md`.
- Destructive commands, production changes, secrets, external writes, or sandbox escalation still require hard approval.

## Recommended Profiles

- `fast`: Kivi/Ollama for many small tasks and 100-agent throughput.
- `balanced`: mixed planning and implementation.
- `coding`: fewer agents with stronger coding models.
- `review`: code review and issue hunting.
