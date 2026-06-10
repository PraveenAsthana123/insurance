# UI Main Menu, Sub Menu, And Department Process Audit

Date: 2026-06-08

Scope:
- Insurance UI routes under `/insurance`
- Bank UI routes under `/bank`
- Menu and sub-menu behavior for department -> domain -> process navigation
- Blueprint-backed process coverage from `data/insurance/blueprint.json`

## Executive Summary

Frontend build and lint pass. The UI is broadly working at compile time, and the insurance menu path is mostly internally consistent.

The highest-risk issues are in the bank navigation model:

1. Bank menu URLs use uppercase domains (`B2C`, `B2B`, `B2E`), while insurance routes use lowercase domains (`b2c`, `b2b`, `b2e`). This is workable only because the blueprint currently stores `channel_scenarios` as uppercase keys. It creates a cross-UI inconsistency and makes domain handling fragile.
2. Bank main menu renders every department process under every domain. It does not filter processes by explicit process domains/channels or department scenario availability.
3. Bank "sub-process" menu items are generated from AI capabilities, not from `sub_processes`. The blueprint currently has no `sub_processes` on any process, so this is a deliberate workaround, but it conflicts with other components that treat `sub_processes` as a separate data concept.
4. Bank sub-menu displays fallback defaults for agents, applications, and master data because the blueprint mostly lacks those arrays. These are not true process-specific values.
5. Insurance has routes for sub-process drill-down, but the visible insurance sub-menu does not expose sub-process rows. The current blueprint has zero sub-process records, so the route is future-facing only.

## Validation Run

Passed:
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Not available:
- `npm run typecheck` is not defined in `frontend/package.json`.

Build note:
- Vite build passes, with existing large chunk warnings for heavy chart/PDF libraries.

## Blueprint Data Coverage

Source: `data/insurance/blueprint.json`

Static audit results:

| Metric | Result |
| --- | ---: |
| Departments | 21 |
| Processes | 322 |
| Processes with AI entries | 322 |
| Processes missing `sub_processes` | 322 |
| Processes missing `agents` | 322 |
| Processes missing `applications` | 322 |
| Processes missing `master_data` | 321 |
| Duplicate process slugs inside same department | 0 |
| Processes with explicit `channels`/`domains`/`business_domains`/`audiences` | 1 |

Department process counts:

| Dept | Name | Processes | Scenario Keys |
| ---: | --- | ---: | --- |
| 1 | Product Management Department | 10 | B2B, B2C, B2E |
| 3 | Sales & Distribution | 14 | B2B, B2C, B2E |
| 4 | Underwriting | 12 | B2B, B2C |
| 5 | Policy Administration | 15 | B2B, B2C |
| 6 | Billing & Collections | 12 | B2B, B2C, B2E |
| 7 | Claims | 17 | B2B, B2C |
| 8 | Special Investigation Unit (SIU) / Fraud | 14 | B2B, B2C, B2E |
| 9 | Customer Service / Contact Center | 14 | B2B, B2C, B2E |
| 10 | Actuarial | 14 | B2B, B2C, B2E |
| 11 | Reinsurance | 14 | B2B, B2C, B2E |
| 12 | Compliance & Regulatory Affairs | 15 | B2B, B2C, B2E |
| 13 | Legal | 15 | B2B, B2C, B2E |
| 14 | Finance & Accounting | 10 | B2B, B2C, B2E |
| 15 | Enterprise Risk Management (ERM) | 17 | B2B, B2C, B2E |
| 16 | Human Resources (HR), Learning & Workforce Management | 18 | B2B, B2C, B2E |
| 17 | Procurement & Vendor Management | 15 | B2B, B2C, B2E |
| 18 | Data, Analytics & Enterprise Intelligence | 18 | B2B, B2C, B2E |
| 19 | Information Technology (IT), Cloud, Infrastructure & Platform Engineering | 22 | B2B, B2C, B2E |
| 20 | Cybersecurity, Identity & Fraud Defense | 22 | B2B, B2C, B2E |
| 21 | Sales, Distribution, Broker, Agency & Partner Management | 18 | B2B, B2C, B2E |
| 22 | Product Management, Innovation & Digital Products | 16 | B2B, B2C, B2E |

## Insurance UI Findings

Relevant files:
- `frontend/src/App.jsx`
- `frontend/src/pages/insurance/InsuranceLayout.jsx`
- `frontend/src/pages/insurance/InsuranceMainMenu.jsx`
- `frontend/src/pages/insurance/InsuranceSubMenu.jsx`
- `frontend/src/pages/insurance/ProcessDetailView.jsx`

Routes:
- `/insurance`
- `/insurance/:deptId`
- `/insurance/:deptId/:domain`
- `/insurance/:deptId/:domain/:processId`
- `/insurance/:deptId/:domain/:processId/ai/:aiType`
- `/insurance/:deptId/:domain/:processId/:subProcessId`
- `/insurance/:deptId/:domain/:processId/:subProcessId/ai/:aiType`

Working:
- Main menu renders departments and expands only the active department into B2C/B2B/B2E.
- Insurance domain URLs are lowercase (`b2c`, `b2b`, `b2e`).
- Sub-menu lists all departments, domains, and filtered processes.
- Process detail resolves process slugs correctly, and no duplicate process slugs were found inside departments.
- Process detail has a broad 17-tab workflow: readme, tech stack, demo story, as-is/to-be, problem, data, manual, automatic, flow diagram, output, visualization, dashboard, ResAI, ExpAI, governance, tests, security.

Risks:
- Process detail resolves only by department and process slug; it does not validate whether the selected domain is applicable to the process.
- Sub-process routes exist, but the visible insurance sub-menu does not render sub-process rows.
- The blueprint contains one process with explicit channel values such as `mobile app`, `portal`, `call center`, `email`, `broker`, and `chatbot`. Those values do not match canonical B2C/B2B/B2E domain IDs, so that process can disappear from canonical domain filtering unless intentionally mapped.

## Bank UI Findings

Relevant files:
- `frontend/src/App.jsx`
- `frontend/src/pages/bank/BankLayout.jsx`
- `frontend/src/pages/bank/BankSidebar.jsx`
- `frontend/src/pages/bank/BankSubMenu.jsx`
- `frontend/src/pages/bank/BankDeptView.jsx`
- `frontend/src/pages/bank/BankUseCasePage.jsx`

Routes:
- `/bank`
- `/bank/dept/:deptId/:domain`
- `/bank/dept/:deptId/:domain/:processId`
- `/bank/dept/:deptId/:domain/:processId/:subProcessId`
- `/bank/uc/:deptId/:processId`
- `/bank/bot`
- `/bank/chat`
- `/bank/bcm`
- `/bank/scorecard`
- `/bank/agentic`
- `/bank/prompts`
- `/bank/framework`

Working:
- Bank layout gives a full-screen workflow with a dark blue main menu and maroon process sub-menu.
- Main menu exposes department -> domain -> process -> AI capability drill-down.
- Bank department and process pages compile.
- BankUseCasePage resolves current process by department and process slug.

Risks:
- `BankSidebar` hard-codes uppercase domains and navigates to uppercase URLs.
- `BankDeptView` directly checks `dept.channel_scenarios[domain]`, so it depends on matching domain case.
- `BankSidebar` maps every process under every domain. It does not filter like `InsuranceSubMenu`.
- `BankSidebar` uses AI capability entries as "sub-process" rows, but `BankSubMenu` reads `proc.sub_processes` for its Sub Processes category.
- `BankSubMenu` falls back to default agents, applications, and master data because the blueprint does not contain those process-specific arrays.
- Some department/domain combinations without B2E scenario content can still appear in the bank sidebar because the domain list is unconditional.

## Recommended Fixes

Priority 1:
- Standardize domain IDs across bank and insurance. Prefer lowercase URL params (`b2c`, `b2b`, `b2e`) with uppercase labels for display.
- Add a shared domain helper for canonicalization and scenario lookup:
  - input accepts `B2C`, `b2c`, `Business-to-Consumer`
  - URL output is lowercase
  - display output is uppercase
  - scenario lookup checks both current uppercase blueprint keys and canonical lowercase keys

Priority 2:
- Move process-domain filtering into a shared utility and use it in both `InsuranceSubMenu` and `BankSidebar`.
- Do not show B2E as fully available for departments that only have B2B/B2C scenarios unless the UI marks it clearly as operator-pending.

Priority 3:
- Stop calling AI capabilities "sub-processes" in the bank main menu, or add real `sub_processes` records to the blueprint.
- If AI drill-down is the intended fourth level, rename labels and route comments from sub-process to AI capability.

Priority 4:
- Replace fallback defaults in `BankSubMenu` with explicit "operator-pending" placeholders, or backfill process-specific `agents`, `applications`, and `master_data` in the blueprint.
- Add a lightweight data integrity check that fails when canonical menu assumptions are violated:
  - duplicate process slugs inside a department
  - non-canonical process domain values without a mapping
  - route-visible process missing required menu metadata

## Conclusion

The UI is working at build/lint level, and the insurance department/process menu is the cleaner reference implementation. The bank UI needs domain canonicalization and a decision on whether the fourth navigation level is true sub-processes or AI capabilities. The blueprint also needs richer process metadata if the bank sub-menu is expected to show real process-specific agents, applications, and master data.

## Fix Implementation Update

Implemented on 2026-06-08:

- Added `frontend/src/utils/insuranceNavigation.js` as the shared source for canonical B2C/B2B/B2E metadata, URL slugs, scenario lookup, process-domain filtering, and AI capability rows.
- Standardized bank navigation to lowercase domain URL IDs while keeping uppercase display labels.
- Updated bank main menu and department view to filter processes by the selected canonical domain.
- Renamed bank fourth-level menu semantics from sub-process to AI capability where the route is backed by `process.ai` data.
- Updated bank sub-menu so agents, applications, and master data are no longer filled with fake defaults; missing process-specific data now shows operator-pending messages.
- Updated insurance main menu, sub-menu, overview, and process detail pages to use shared domain canonicalization.
- Updated insurance overview process cards to actually filter by the selected domain.
- Added an insurance process-detail warning when a URL selects a domain that is not mapped to that process.

Validation after fixes:

- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.

## Tab Coverage Update

Implemented after the tab audit:

- Insurance process detail now includes first-class `Model`, `Analysis`, and `User story` tabs in addition to existing `Data`, `Demo story`, `Visualization`, `ResAI`, and `ExpAI` tabs.
- `Data` tab now includes a before/after visualization section:
  - AS-IS data load chart from source, cleaning, output, and pain counts.
  - TO-BE AI-ready data chart from automation, AI, KPI, and artifact counts.
  - Before-vs-after comparison line chart.
- `Model` tab is tied to `proc.ai[]` and `blueprint.ai_opportunities[].model`; missing model specs are clearly marked operator-pending.
- `Analysis` tab summarizes issues, AS-IS/TO-BE deltas, KPI targets, ROI estimate, and a coverage chart.
- `User story` tab renders persona, business scenario, user journey, demo pitch, and acceptance criteria using `demo_story`, `manual_process`, and `automatic_process`.
- Bank workspace already had enterprise tabs for Data, Analytics, AI/Models, User Story, User Demo, Explainable AI, and Responsible AI; the insurance workspace is now aligned with the requested coverage.

Validation after tab coverage update:

- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.

## Final Tab Gap Closure Update

Implemented after the final `fix all` request:

- Added explicit insurance `User demo` tab; it no longer relies on `Demo story` as an implicit substitute.
- `User demo` renders demo setup, demo execution, pitch/URL output, and a demo-readiness chart from blueprint process data.
- `Visualization` tab now includes the same before/after visualization charts as the `Data` tab, so before/after analysis is visible from both requested places.
- Updated insurance tab count and related-tab navigation to include `User demo` and visualization cross-links.

Validation after final tab gap closure:

- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.

## Live UI Smoke Test Update

Added on 2026-06-08:

- Added `frontend/e2e/insurance-tabs.spec.js` to exercise `/insurance/1/b2c/product-strategy` in a real Chromium session.
- The smoke test verifies the requested process-detail tab surfaces are reachable: `Data`, `Model`, `Analysis`, `User story`, `User demo`, `Visualization`, `ResAI`, and `ExpAI`.
- The test also validates the key content sections for before/after data visualization, before/after process visualization, model readiness, analysis coverage, user story acceptance criteria, demo readiness, Responsible AI fairness audit, and Explainable AI methods.

Validation after live UI smoke test:

- `cd frontend && npx playwright test e2e/insurance-tabs.spec.js --project=chromium` passed.

## Per-Process Simulation UI Update

Implemented on 2026-06-08:

- Added a first-class insurance `Simulation` tab to every process detail route.
- The tab provides scenario controls for monthly cases, automation, data quality, model confidence, and risk pressure.
- The simulator renders AS-IS manual steps, TO-BE AI-assisted steps, scenario lever strength, before/after KPI movement, time saved, cost saved, accuracy lift, escalations avoided, confidence, and a decision recommendation.
- The implementation uses deterministic blueprint-derived values so every process has a usable simulation surface even when no backend reference simulation exists yet.
- Updated the focused Playwright smoke test to verify the `Simulation` tab and key headings on `/insurance/1/b2c/product-strategy`.

Validation after simulation UI update:

- `cd frontend && npm run lint` passed.
- `cd frontend && npx playwright test e2e/insurance-tabs.spec.js --project=chromium` passed.
