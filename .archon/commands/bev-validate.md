Validate the Insur Analytics Dashboard change.

Run the narrowest useful checks first, then the default gate when production-facing:

1. Check git diff to understand the exact change.
2. Run targeted tests for touched backend/frontend/API areas.
3. Run ./scripts/project_doctor.sh before handoff for production-facing changes.
4. Report failures with file/line references and exact commands.
5. If checks cannot run, explain the blocker and residual risk.

Do not claim success unless validation actually passed.

User request:
$ARGUMENTS
