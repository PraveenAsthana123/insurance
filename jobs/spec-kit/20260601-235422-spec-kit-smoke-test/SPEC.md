# Spec: spec kit smoke test

- Created: 2026-06-02T05:54:22+00:00
- Department: engineering
- Priority: normal
- Mode: council
- Model profile: fast

## Problem

Verify repo-local Spec Kit intake for governed BMAD and OpenClaw workflows.

## Users

- codex
- claude

## Requirements

- create structured spec
- route to BMAD when requested

## Acceptance Criteria

- SPEC.md exists
- spec.json exists
- BMAD_PROMPT.md exists

## Constraints

- repo-local only
- no approval bypass

## Non-Goals

- Do not bypass hard approval gates, service boundaries, or validation

## Risks

- Risk review required during BMAD architecture/story pass

## Validation Plan

- Update required docs per AGENTS.md when behavior changes.
- Run focused tests for touched code.
- Run ./scripts/project_doctor.sh before production-facing handoff when dependencies allow it.
