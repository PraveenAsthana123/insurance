Spec Kit handoff for BMAD.

Spec path: jobs/spec-kit/20260601-235422-spec-kit-smoke-test/SPEC.md
Title: spec kit smoke test
Department: engineering
Priority: normal

Task:
Verify repo-local Spec Kit intake for governed BMAD and OpenClaw workflows.

Acceptance criteria:
- SPEC.md exists
- spec.json exists
- BMAD_PROMPT.md exists

Required BMAD route:
1. bmad-prd or bmad-product-brief for intent and scope.
2. bmad-create-architecture if API/backend/frontend/system behavior changes.
3. bmad-dev-story for implementation-ready story.
4. bmad-code-review before handoff when code changes are made.
