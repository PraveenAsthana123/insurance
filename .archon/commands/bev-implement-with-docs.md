Implement the requested Insur Analytics Dashboard change while following local architecture boundaries.

Required behavior:

- Routers stay HTTP-only.
- Services own business logic and logs/traces.
- Repositories own SQL only.
- Schemas define API input/output contracts.
- Workers orchestrate async work through services.
- Frontend must use shared API binding and tracing.
- Preserve unrelated user changes.

If the change affects behavior, update the required docs from docs/GOVERNANCE_INDEX.md:

- setup/run/debug changes -> README.md and docs/RUN_DEBUG_RUNBOOK.md
- requirement/scope changes -> docs/PROJECT_REQUIREMENTS.md and docs/STATUS.md
- frontend policy changes -> docs/UI_GLOBAL_POLICY.md
- backend/API/system-design changes -> docs/BACKEND_GLOBAL_POLICY.md
- API behavior changes -> docs/API_ENDPOINT_CATALOG.md and docs/API_CATALOG.json
- backend file responsibility changes -> docs/BACKEND_FILE_INVENTORY.md and .json

After implementation, report what changed and what validation remains.

User request:
$ARGUMENTS
