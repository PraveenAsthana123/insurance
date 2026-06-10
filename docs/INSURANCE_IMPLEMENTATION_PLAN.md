# Insurance Implementation Plan

Created 2026-06-02 from a code/documentation inspection of the current
Insur Analytics Dashboard.


## Approval Policy

This plan follows `docs/NO_APPROVAL_AUTONOMY_POLICY.md` first, with layered
approval governance from `docs/APPROVAL_GOVERNANCE.md` and `.archon/approval-policy.yaml`.

Safe repo-local work should proceed without asking for approval: reading docs,
editing repo files, updating required governance docs, running local tests,
inspecting git status/diffs, and running `./scripts/project_doctor.sh`.

Hard gates still require explicit approval before execution:

- dependency installs or downloads
- network access blocked by the sandbox
- sandbox escalation or files outside the writable workspace
- destructive commands such as `rm`, `git reset`, database drops, or force pushes
- production deploys or production data changes
- credentials, tokens, logins, or secrets
- external SaaS writes
- real browser/CUA actions beyond dry-run or local test automation

## Current State

- Backend has both `/api/v1/insur/*` and `/api/v1/insurance/*` surfaces.
- `/api/v1/insurance/*` serves four insurance departments from
  `global-ai-org/departments`: claims, underwriting, customer-service, and
  fraud-siu.
- `backend/ml/insurance/run_dept_pipelines.py` defines insurance ML/RAG
  pipelines for those four departments.
- Insurance department business artifacts exist under
  `global-ai-org/departments/*/business-layer`.
- Frontend routing has `/insur` and `/insur/:departmentId`, but the shared
  department catalog still carries the older cross-industry/BEV department
  set and copy.
- API governance docs do not yet clearly catalog the `/api/v1/insurance/*`
  endpoints.

## Goal

Make the project a coherent insurance analytics platform with working
department navigation, role dashboards, reports, datasets, pipelines,
simulation outputs, AI/RAG explanations, observability, and governance for the
four priority insurance domains:

- Claims
- Underwriting
- Customer Service
- Fraud / SIU

## Phase 1: Governance And Naming Alignment

1. Decide canonical namespace usage:
   - Keep `/api/v1/insur/*` for platform navigation, eval artifacts,
     simulation, council, fleet, and observability.
   - Keep `/api/v1/insurance/*` for insurance-department markdown,
     role-dashboard/report reads, and direct pipeline runner invocation.
   - Document cross-links between both namespaces.
2. Replace stale BEV/cross-industry copy in project status, frontend labels,
   and API descriptions where the current product is insurance-specific.
3. Regenerate and update:
   - `docs/API_ENDPOINT_CATALOG.md`
   - `docs/API_CATALOG.json`
   - `docs/BACKEND_FILE_INVENTORY.md`
   - `docs/BACKEND_FILE_INVENTORY.json`
4. Add backend tests for `/api/v1/insurance/*` happy paths, invalid department
   rejection, invalid role rejection, and missing artifact behavior.

Acceptance:

- API catalog includes `/api/v1/insurance/depts` and each documented endpoint.
- `./scripts/project_doctor.sh` passes or any unrelated baseline failure is
  documented.

## Phase 2: Insurance Frontend Integration

1. Convert the shared frontend department catalog to the insurance priority
   departments, or introduce a separate insurance catalog used by `/insur`.
2. Wire `/insur` department picker to show business-friendly labels, owner,
   priority KPIs, available artifacts, and readiness status.
3. Add views for:
   - department spec
   - role dashboard markdown
   - role reports markdown
   - pipeline list and latest run status
   - manual-vs-auto process view
   - simulation UI spec
   - system design
4. Preserve existing frontend policy:
   - use shared API binding/tracing
   - expose freshness/status/debug information
   - avoid one-off fetch code where existing API helpers fit

Acceptance:

- A user can open `/insur`, select all four insurance departments, and see the
  department artifacts without manually calling backend endpoints.
- Frontend build and lint pass.

## Phase 3: Data And Pipeline Readiness

1. Run `scripts/download_insurance_datasets.py --dry-run` and verify all
   planned Kaggle slugs, skipped datasets, and expected local paths.
2. Add a data-readiness endpoint or status panel from `data/insurance/_manifest.json`.
3. Smoke-test every registered pipeline:
   - claims: pipelines 1-4
   - underwriting: pipelines 1-3
   - customer-service: pipelines 1-3
   - fraud-siu: pipelines 1-4
4. Normalize artifact paths so pipeline outputs are consistently discoverable by
   the existing `/api/v1/insur/eval/{dept}/{pipeline}/runs` UI component.
5. Add tests for missing datasets and successful smoke-run response shape.

Acceptance:

- Each department has at least one smoke-run manifest visible from the frontend.
- Missing datasets produce clear status, not silent empty screens.

## Phase 4: Insurance Decisioning And AI Controls

1. Define department-level decision services behind routers:
   - claims triage and severity/fraud risk
   - underwriting risk score and price/eligibility guidance
   - customer-service churn/complaint triage
   - fraud/SIU investigation priority and anomaly clustering
2. Keep routers HTTP-only. Put business logic in services and SQL in
   repositories.
3. Add guardrail checks before any generative explanation:
   - citation-required RAG answer
   - no unsupported policy/coverage claims
   - PII redaction in logs and artifacts
   - tenant-scoped reads
4. Add explicit HITL gates for high-risk insurance decisions:
   - coverage denial
   - fraud escalation
   - premium/rate recommendation
   - high-value settlement

Acceptance:

- Every high-impact recommendation has traceable input, output, model version,
  guardrail result, and human-review status.

## Phase 5: Observability, Compliance, And Demo Readiness

1. Add OpenTelemetry spans around insurance pipeline execution and decision
   services.
2. Surface department health in the observability hub:
   - data freshness
   - pipeline run status
   - model/eval scores
   - guardrail failures
   - cost/safety eval summaries
3. Expand compliance mapping for insurance:
   - PII handling
   - audit trails
   - state DOI/rate-filing constraints where applicable
   - HIPAA-adjacent handling for medical claims/underwriting datasets
4. Produce walkthroughs for each department:
   - manager view
   - tester view
   - admin/security view
   - AI reviewer view

Acceptance:

- A demo can show one complete insurance workflow from intake to decision,
  explanation, audit, and monitoring for each priority department.

## Immediate Next Tasks

Status as of 2026-06-02:

1. Done — added insurance router/nav tests in `backend/tests/test_insurance_router.py`.
2. Done — generated `INSUR_NAV.json` for claims, underwriting, customer-service, and fraud-siu.
3. Done — updated frontend `/insur` copy from beverage/cross-industry language to insurance language.
4. Done — regenerated `docs/openapi.json` and updated API/backend governance catalogs.
5. Pending validation — run `./scripts/project_doctor.sh` before handoff of production-facing changes.
