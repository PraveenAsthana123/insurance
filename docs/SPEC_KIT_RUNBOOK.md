# Spec Kit Runbook

Spec Kit is the repo-local specification intake layer before BMAD. It captures a short request, voice transcript, copied note, or file into a structured spec workspace and can route that spec into KT/BMAD and OpenClaw.

## Commands

Create a spec only:

```bash
scripts/spec_kit.py create --title "catalog filter fix" --text "Fix catalog filters and update tests/docs"
```

Create a spec and BMAD handoff:

```bash
scripts/spec_kit.py create --bmad --title "catalog filter fix" --text "Fix catalog filters and update tests/docs"
```

Create a spec, BMAD handoff, and OpenClaw task:

```bash
scripts/spec_kit.py create --submit --department engineering --mode council --profile fast --text "Plan and implement the next governed task"
```

Add richer structure:

```bash
scripts/spec_kit.py create   --title "approval dashboard"   --users "manager;tester"   --requirements "show pending approvals;filter by risk;export audit evidence"   --acceptance "manager can approve safe task;tester can view audit trail"   --constraints "no production write without HITL;update docs"   --risks "approval bypass;stale queue data"   --text "Create the approval dashboard workflow."
```

List specs:

```bash
scripts/spec_kit.py list
```

## Outputs

Each workspace is written under `jobs/spec-kit/` and contains:

- `SPEC.md`: human-readable spec.
- `spec.json`: machine-readable payload.
- `BMAD_PROMPT.md`: prompt for BMAD/KT handoff.
- `kt_bmad_output.txt`: present when `--bmad` or `--submit` is used.

## Policy

- Spec Kit owns specification intake only.
- BMAD owns PRD, architecture, story, and review shaping.
- OpenClaw owns execution routing only after a spec and handoff exist.
- Hard approval gates still apply for secrets, production changes, external writes, destructive commands, and sandbox escalation.
