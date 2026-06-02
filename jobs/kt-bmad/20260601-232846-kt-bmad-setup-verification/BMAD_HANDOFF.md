# BMAD Handoff: kt bmad setup verification

Use this workspace as the shared context for Codex, Claude, Cursor, or shell-based agents.

## Recommended BMAD Flow

1. bmad-product-brief or bmad-prd for intent and scope
1. bmad-create-architecture for system/API/frontend impact
1. bmad-dev-story for implementation-ready tasks
1. bmad-code-review before handoff when code changes are made

## Automation Route

- Planner: BMAD methodology and `scripts/automation_job_runner.py`
- Executor: OpenClaw task queue
- Model routing: `fast` from `config/agent_model_profiles.json`
- Validation: project doctor, focused tests, and required docs

## Original Prompt

Verify the KT plus BMAD workspace path for short task kickoff, BMAD handoff, and optional OpenClaw routing.
