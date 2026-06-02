# BMad Workflow Recipes — INSUR/insur

How to use the 44 BMad skills (installed at `_bmad/` + `.claude/skills/bmad-*/`)
inside INSUR's existing flows. Skill discovery: `scripts/bmad.sh status`.

## Index of the 44 skills

| Group | Skills |
|---|---|
| Planning | `bmad-product-brief`, `bmad-prd`, `bmad-create-prd`, `bmad-edit-prd`, `bmad-validate-prd`, `bmad-prfaq`, `bmad-create-architecture` |
| Story authoring | `bmad-create-story`, `bmad-create-epics-and-stories`, `bmad-dev-story` |
| Research | `bmad-investigate`, `bmad-domain-research`, `bmad-technical-research`, `bmad-market-research` |
| Review | `bmad-code-review`, `bmad-editorial-review-prose`, `bmad-editorial-review-structure`, `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter` |
| Sprint ops | `bmad-sprint-planning`, `bmad-sprint-status`, `bmad-retrospective`, `bmad-correct-course` |
| Agents | `bmad-agent-analyst`, `bmad-agent-architect`, `bmad-agent-dev`, `bmad-agent-pm`, `bmad-agent-tech-writer`, `bmad-agent-ux-designer` |
| Docs | `bmad-document-project`, `bmad-index-docs`, `bmad-shard-doc` |
| Q&A | `bmad-qa-generate-e2e-tests`, `bmad-check-implementation-readiness`, `bmad-checkpoint-preview` |
| Workflow | `bmad-quick-dev`, `bmad-customize`, `bmad-party-mode`, `bmad-spec` |
| UX | `bmad-ux` |
| Meta | `bmad-help`, `bmad-advanced-elicitation`, `bmad-brainstorming`, `bmad-generate-project-context` |


## Recipe 0 — AI Dark Factory full flow

Use this when an idea needs the complete governed delivery path rather than a direct fix:

```text
1. Idea
   -> capture the business intent, user, risk, and expected outcome
2. bmad-agent-analyst / bmad-create-prd
   -> produce PRD, acceptance criteria, assumptions, and non-goals
3. bmad-agent-architect / bmad-create-architecture
   -> produce system design, API/data shape, RBAC, tenant, idempotency, and rollback notes
4. bmad-create-epics-and-stories / bmad-create-story
   -> convert the PRD/design into implementation stories
5. ARCHON: archon workflow run insur-api-change-governance "<story>"
   -> pause at local approval gates before implementation and handoff
6. Codex/Claude/Copilot implement today
   -> OpenHands remains a target developer harness, not wired production runtime
7. Playwright + focused drills
   -> run browser/API checks appropriate to the story
8. DeepEval only when explicitly configured
   -> AI/RAG evals are opt-in and not part of default project_doctor
9. Approval broker / Archon / CODEOWNERS today
   -> Temporal approval workflow remains a target architecture component
10. Deployment by operator-approved release path
11. Monitoring through current logs/audits today
   -> full OpenTelemetry/OpenLit/Langfuse/Phoenix pipeline remains target or opt-in
```

Fast local command chain:

```bash
./scripts/bmad.sh status
archon workflow run insur-project-doctor-fix "describe the issue"
python3 scripts/archon_auto_approve_safe.py --dry-run
./scripts/project_doctor.sh
```

Do not mark OpenHands, DeepEval, Temporal, or full OpenTelemetry as wired unless the corresponding setup docs, tests, and runbooks have been updated and validated.

## Recipe 1 — Adding a new INSUR API endpoint

Existing flow lives in `.archon/workflows/insur-api-change-governance.yaml` —
plan → approve → implement → validate → approve. BMad augments each phase:

```text
1. bmad-product-brief
   → write a 1-page brief: who needs this endpoint, why, what changes
2. bmad-create-architecture
   → reason about request/response shape, RBAC, tenant scoping, idempotency
3. ARCHON: archon workflow run insur-api-change-governance "<brief>"
   ↓ pauses at approve_plan
4. (operator) review the plan, approve
5. Claude/Codex implements
   ↓ pauses at approve_handoff
6. bmad-code-review on the diff (catch obvious issues before approval)
7. bmad-qa-generate-e2e-tests
   → derive Playwright + drill steps from the spec
8. (operator) review + approve handoff
9. CI runs: project_doctor + governance_diff_check + drills
10. CODEOWNERS merge
```

Drill auto-update reminder: per §10.3 / §64.43 #7, every new endpoint
that handles tenant data must have `X-Tenant-ID` middleware integration +
idempotency consideration. Use `bmad-check-implementation-readiness`
before approving the handoff.

## Recipe 2 — Per-dept feature (e.g. new pipeline for sales)

INSUR has 19 departments under `global-ai-org/departments/*`. Each one
has 25+ business-layer artifacts. BMad helps author per-dept content:

```text
1. bmad-domain-research        → research the dept's business context
2. bmad-create-prd             → PRD for the new pipeline
3. bmad-create-epics-and-stories → break into sprint-sized stories
4. bmad-create-story           → expand each story with acceptance criteria
5. (operator) review + reorder backlog
6. bmad-dev-story              → implement
7. bmad-code-review            → review per story
8. bmad-qa-generate-e2e-tests  → smoke + integration coverage
9. drill_per_dept_artifacts.py confirms 1387-file release-blocker still green
```

## Recipe 3 — Fixing a runtime regression

```text
1. ./scripts/project_doctor.sh       — current health
2. archon workflow run insur-project-doctor-fix "<description of failure>"
   ↓ pauses at approve-plan
3. bmad-investigate                  → root-cause hypothesis
4. bmad-review-edge-case-hunter      → list adjacent failure modes
5. (operator) approve plan
6. Claude implements fix + drill
   ↓ pauses at approve-handoff
7. bmad-code-review                  → spot quality issues
8. (operator) approve handoff
9. CI runs full drill regression
10. Merge
```

## Recipe 4 — Refactor / debt reduction

```text
1. bmad-document-project   → current-state inventory
2. bmad-create-architecture (variant: "target state")
3. bmad-shard-doc          → split into per-area refactor stories
4. bmad-sprint-planning    → pick this sprint's slice
5. bmad-correct-course every retro
6. bmad-retrospective at sprint end
```

## Recipe 5 — UX / frontend change

```text
1. bmad-ux                          → user-flow map + screens
2. bmad-agent-ux-designer (skill)   → propose interaction patterns
3. bmad-create-story per screen
4. bmad-qa-generate-e2e-tests       → Playwright coverage
5. Implementation + screenshot review
6. drill_voice_pipeline.py if voice-related
```

## Compose with existing INSUR tooling

| INSUR Surface | BMad Replacement OR Complement | Note |
|---|---|---|
| `.archon/workflows/insur-*.yaml` | **Complement** | BMad authors content for the workflow's command nodes |
| `docs/AGENT_TOOL_SELECTION_MATRIX.md` | **Complement** | BMad's 44 skills mostly methodology, not the tools themselves |
| `tests/drills/drill_*.py` | **Complement** | `bmad-qa-generate-e2e-tests` proposes test cases; drills lock the invariants |
| `scripts/governance_diff_check.sh` | **Independent** | BMad doesn't gate CI; governance check still runs |
| `docs/APPROVAL_GOVERNANCE.md` | **Independent** | BMad-authored content still flows through CODEOWNERS + Archon approval gates |

## When NOT to use BMad

- **One-line bug fix** — use direct edit + drill; PRD overhead is waste
- **Drill-only changes** — drill spec IS the contract; no BMad needed
- **Infrastructure / deps** — `scripts/bmad.sh` doesn't help with pip / docker
- **Same-day hotfixes** — methodology is for sustainable work, not P0 incidents

## How to run

```bash
# Check installed skills
./scripts/bmad.sh status

# Use a skill (Claude Code reads .claude/skills/bmad-* automatically)
# Just describe the intent — e.g.:
"use bmad-create-prd for the new sales-forecast endpoint"
"use bmad-code-review on the diff"
"use bmad-investigate why drill_admin_cua_audit step 8 flaked"
```

## Composes with

- `docs/AGENT_HARNESS_GUIDE.md` — overall agent runtime
- `docs/APPROVAL_GOVERNANCE.md` — Archon approval gates
- `docs/DARK_FACTORY_OPERATING_MODEL.md` — operating model that ties BMad +
  Archon + Codex/Claude + CI together
- `_bmad/_config/skill-manifest.csv` — canonical 44-skill list
- `tests/drills/drill_bmad_installed.py` — install contract drill
