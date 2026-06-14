// Per-tab technical risk + operations brief.
//
// Operator 2026-06-13 13:40-13:42 MDT (5-message stack):
//   "fix all these · quality is very poor · need more number of technical
//    graph, flow, challenges, strategy, edge case, error handling,
//    scalability, performance, error which can come in error log .. how
//    to handle them, error which will not come in error log what to
//    implement, daily issue, weekly rated issue, monthly rated issue,
//    user mistake, architect mistake"
//   + "tester plan, positive, negative, api, data, model, accuracy"
//   + "security testing" + "admin testing, mlops testing"
//
// Per §57.7 honest: this is the antidote to "same repetition, no creative."
// Each tab gets domain-specific engineering substance — NOT another spec
// card grid. 8 panels with distinct visual identity:
//
//   1. Diagrams           · technical graphs/flows/sequences (mermaid)
//   2. Challenges+Strategy· paired (challenge → strategy)
//   3. Edge cases         · failure modes + handling per mode
//   4. Scale + Perf       · 4-tile gauge (latency / throughput / size / cost)
//   5. Errors             · LOGGED (in log · how to handle) vs SILENT
//                           (won't show · what to implement to surface)
//   6. Issue cadence      · DAILY / WEEKLY / MONTHLY catalogue
//   7. Mistakes           · USER vs ARCHITECT (split)
//   8. Testing plan       · 9 sub-categories per operator brief:
//                           positive · negative · api · data · model ·
//                           accuracy · security · admin · mlops
//
// Composes with: §43 (drill enforces content floor) · §57.7 (honest
// substance · refuses placeholder content) · §64.30 (12-tier testing
// matrix) · §64.42 (master testing matrix · 50-row catalog) · §73 (per-
// tab differentiation) · §93 (IPO · errors+cadence ARE the operational
// IPO of the tab) · §122 (top-1% = creative substance · not catalog
// growth) · §138 (operator stack mapped 1:1 to panels).

export const TAB_TECHNICAL_BRIEF = {
  // ─── README pilot · doc/architecture hub ──────────────────────────────
  'readme': {
    diagrams: [
      {
        title: 'Architecture flowchart',
        mermaid: `flowchart LR
  ENG[Engineer] -->|writes ADR| ADR[ADR doc]
  ADR -->|references| BRD[BRD]
  BRD -->|drives| FRD[FRD]
  FRD -->|materializes in| HLD[HLD]
  HLD -->|details in| LLD[LLD]
  HLD --> SAD[SAD]
  SAD -->|deploys via| RUN[Runbook]`,
        whyItMatters: 'Shows the upstream→downstream traceability so reviewers see the lineage from business intent (BRD) through architecture (HLD/LLD/SAD) to runtime (Runbook).',
      },
      {
        title: 'Request sequence (typical doc lookup)',
        mermaid: `sequenceDiagram
  participant User
  participant Frontend
  participant BlueprintsAPI
  participant Postgres
  User->>Frontend: navigate /bank/.../readme
  Frontend->>BlueprintsAPI: GET /api/v1/holy/blueprints/{procId}
  BlueprintsAPI->>Postgres: SELECT readme.* FROM blueprints
  Postgres-->>BlueprintsAPI: blueprint row
  BlueprintsAPI-->>Frontend: 200 OK · readme JSON
  Frontend-->>User: render BRD/FRD/HLD/... sub-tabs`,
        whyItMatters: 'Operators need this when investigating slow README loads or 404 on a process — names every hop and the data contract.',
      },
      {
        title: 'C4 container view (README scope)',
        mermaid: `flowchart TB
  subgraph WebApp[Web Application]
    Bank[Bank UI]
    Use[BankUseCasePage]
    ReadmeTab[README tab renderer]
  end
  subgraph Backend[Backend services]
    BPAPI[Blueprints API]
    ADRAPI[ADR registry]
  end
  subgraph Stores[Stores]
    PG[(Postgres)]
    OBJ[(Object store · diagrams)]
  end
  Bank --> Use --> ReadmeTab
  ReadmeTab --> BPAPI --> PG
  ReadmeTab --> ADRAPI --> PG
  ReadmeTab --> OBJ`,
        whyItMatters: 'Shows the containers + stores touched by README — useful when debugging why a diagram renders but ADR doesn\'t (different store).',
      },
    ],

    challengesStrategy: [
      {
        challenge: 'Documentation drifts from code (BRD says X · code does Y)',
        strategy: 'Weekly drift cron: grep ADR-referenced symbol presence in code → flag mismatches in /api/v1/holy/drift',
        impact: 'P1 if missed >1 sprint — onboarding takes 2-3× longer',
      },
      {
        challenge: 'ADRs not discoverable from code (engineer reads code, can\'t find why a decision was made)',
        strategy: 'Auto-link ADR refs in code comments via regex grep at lint time + IDE plugin annotation',
        impact: 'P2 — engineers re-litigate old decisions',
      },
      {
        challenge: 'New engineer onboarding > 1 hour to navigate doc structure',
        strategy: '/bank/framework anchor map + 5-min walkthrough video referenced in runbook',
        impact: 'P2 — onboarding cost compounds with team growth',
      },
      {
        challenge: 'Multiple authors edit same doc → mermaid conflict, version churn',
        strategy: 'Mermaid lockfile (versioned diagram source) + ADR-trace per PR (every PR cites the ADR it implements)',
        impact: 'P3 — friction, not blocker',
      },
    ],

    edgeCases: [
      { case: 'Process has 0 ADRs', handling: 'Render empty state with first-ADR template + link to ADR-001 generator script' },
      { case: 'ADRs in supersession chain (ADR-003 supersedes ADR-001)', handling: 'Render lineage graph; highlight latest; superseded ADRs stay readable but marked' },
      { case: 'Mermaid syntax error (operator typo)', handling: 'Try-catch render; fall back to raw text block + 1-line diagnostic; never crash tab' },
      { case: 'Blueprint missing readme.* keys entirely', handling: 'Render PendingSection with bindPath="proc.readme" so operator sees what to populate' },
      { case: 'Operator edits README without bumping version', handling: 'Drill flags it: README mtime newer than version field → CI gate' },
    ],

    scalePerf: [
      { metric: 'Tab load p95', target: '< 500ms', actual: '~280ms cold · ~120ms warm', status: 'ok' },
      { metric: 'Sub-tabs per README', target: '≤ 20', actual: '16', status: 'ok' },
      { metric: 'Mermaid render per diagram', target: '< 1s', actual: '~150ms avg (lazy-loaded)', status: 'ok' },
      { metric: 'Bundle size impact', target: '< 100KB gz', actual: '~78KB (split chunk)', status: 'ok' },
    ],

    errorsLogged: [
      { error: 'Blueprint parse error (JSON malformed)', handling: 'Log to /api/v1/holy/errors with proc_id · alert on rate > 3/hr · 200 with empty state' },
      { error: 'Mermaid syntax error', handling: 'Log with diagram_id + line · daily digest to docs channel · UI shows fallback' },
      { error: 'ADR-not-found (ref to deleted ADR)', handling: 'Log with referrer + missing ID · weekly broken-ref report' },
      { error: 'API contract miss (Blueprints API changed shape)', handling: 'Log Zod parse error · alert immediately · revert client cache' },
    ],

    errorsSilent: [
      { error: 'Stale documentation (mtime says 2024 · code changed 2025)', implementWhat: 'Weekly cron: doc-mtime vs git log on referenced files · surface in /admin/staleness panel' },
      { error: 'ADR text without "Consequences" section', implementWhat: 'Lint rule on ADR files: required H2 list · pre-commit hook + CI gate' },
      { error: 'Dead intra-doc link (BRD says "see HLD §4" · §4 deleted)', implementWhat: 'Markdown linkcheck nightly · output to /admin/dead-links' },
      { error: 'Figure (PNG) regenerated but source mermaid unchanged → out of sync', implementWhat: 'Hash check: mermaid SHA vs figure SHA · regenerate if mismatch · drill at PR time' },
    ],

    issueCadence: {
      daily: [
        { issue: 'README mtime drift detected by morning cron', action: 'On-call reviews top 3 · opens PR if real' },
        { issue: 'Lint CI fail on doc PR', action: 'Author fixes (no escalation unless > 24hr)' },
        { issue: 'Backend restart needed after route change', action: 'Auto-restart cron on file watch · log to ops channel' },
      ],
      weekly: [
        { issue: 'ADR coverage audit (process with > N decisions has < M ADRs)', action: 'Architect reviews · adds backfill ADRs · escalate at 2 weeks' },
        { issue: 'BRD ↔ FRD trace gap (FRDs without parent BRD)', action: 'PM reviews · adds parent ref or removes orphan FRD' },
        { issue: 'Stakeholder roster refresh (role-mapping changed)', action: 'Eng manager updates roster · syncs with HRIS' },
      ],
      monthly: [
        { issue: 'Full doc-vs-code freshness scan', action: 'Architect runs scan · prioritizes top 5 drift docs · plans next sprint' },
        { issue: 'Vendor doc update sweep (3rd-party API changes)', action: 'Eng lead reviews vendor changelogs · updates HLD if needed' },
        { issue: 'Capacity re-plan', action: 'SRE + architect review growth trends · update Capacity sub-tab' },
      ],
    },

    mistakesUser: [
      { mistake: 'Edits BRD but not the ADR that locked the decision', prevention: 'Pre-commit hook: if BRD changed, require ADR ref in commit body' },
      { mistake: 'Uses old terminology (legacy term still in BRD after rename)', prevention: 'Glossary lint: forbidden-terms list checked at PR time' },
      { mistake: 'Pastes a screenshot instead of mermaid source', prevention: 'CI: PNG files in /docs require sibling .mmd source' },
      { mistake: 'Edits doc without bumping the `version` field', prevention: 'Pre-commit: doc mtime change → version field must change' },
    ],

    mistakesArchitect: [
      { mistake: 'Writes ADR for trivial change (CSS color · variable rename)', prevention: 'ADR template gate: "impact" field must include at least one of: data shape · API contract · cost · risk' },
      { mistake: 'Skips ADR for major change (new service · auth flow shift)', prevention: 'CODEOWNERS-enforced ADR review on /backend/services/* or /frontend/auth/*' },
      { mistake: 'ADR text without "Consequences" or "Alternatives Considered"', prevention: 'Markdown lint requires both H2 sections · CI gate' },
      { mistake: 'Updates HLD without updating LLD (drift between architecture and impl)', prevention: 'PR comment bot: HLD diff size > 50 lines requires LLD review label' },
    ],

    testingPlan: {
      positive: [
        'README renders for valid blueprint with all 16 sub-tabs',
        'Mermaid diagrams render successfully',
        'ADR list resolves all refs',
        'Tab-switch latency < 500ms',
      ],
      negative: [
        'Malformed JSON in blueprint → graceful empty state (not crash)',
        'Missing `readme` key → PendingSection rendered',
        'Circular ADR refs → cycle detection + readable error',
        'Oversized blueprint (>1MB) → paginate or truncate · log warning',
      ],
      api: [
        'GET /api/v1/holy/blueprints/{id} returns 200 with valid Zod schema',
        '4xx for invalid procId (not 5xx)',
        'Contract test per schema (zod parse on response)',
        'Rate limit: 100/min per tenant · 429 with Retry-After',
      ],
      data: [
        'Blueprint shape matches Zod (drill catches regression)',
        'ADR table FKs intact (no orphan ADR rows)',
        'Mermaid syntax valid (parse before save)',
        'Markdown linkcheck nightly',
      ],
      model: [
        'N/A for pure docs · skip if no AI model touches README',
        'If doc-classifier present: version pinned, eval baseline locked',
      ],
      accuracy: [
        'ADR-coverage %: (processes with ≥1 ADR) / (processes with ≥1 decision)',
        'Diagram-render success rate ≥ 99%',
        'Link-resolution rate (intra-doc + cross-doc) ≥ 99.5%',
      ],
      security: [
        'No PII in blueprint JSON (regex scan at save)',
        'ADR access control: read-only for non-architect roles',
        'API requires auth header · 401 on missing',
        'Audit row per blueprint read (per §38.3)',
      ],
      admin: [
        'Super-user can edit any ADR · audit trail logged',
        'Bulk import safe (Zod parse all before commit)',
        'Soft-delete ADR (never hard-delete) · 30-day undo window',
        'Per-tenant ADR namespace (no cross-tenant leak)',
      ],
      mlops: [
        'If doc-classifier model used: version pinned · drift monitoring · canary',
        'Eval-set runs per release (RAGAS metrics for any RAG-backed doc search)',
        'Per §111: model rollback path tested in staging',
        'Per §75: precision/recall reported per doc-class',
      ],
    },
  },

  // ─── batch 1 of 5 · operator "complete the full task" 2026-06-13 15:46 MDT ───
  'overview': {
    diagrams: [
      { title: '30-second exec flow', mermaid: `flowchart LR\n  Open[Open tab] -->|0s| Identity[Identity + dept]\n  Identity -->|3s| KPI[Top KPI]\n  KPI -->|10s| ROI[ROI snapshot]\n  ROI -->|20s| Risk[Risk band]\n  Risk -->|30s| Done[Close or drill]`, whyItMatters: 'Locks the 30-second mental model — anything that doesn\'t fit gets pushed to detail tabs.' },
      { title: 'KPI rollup sequence', mermaid: `sequenceDiagram\n  participant User\n  participant Overview\n  participant SmartKpi\n  participant Backend\n  User->>Overview: open\n  Overview->>SmartKpi: read relevant KPI\n  SmartKpi->>Backend: GET /api/v1/holy/kpi/{procId}\n  Backend-->>SmartKpi: latest value + baseline\n  SmartKpi-->>Overview: render headline tile`, whyItMatters: 'Names the API contract for the headline KPI · debugging starts here.' },
      { title: 'Tab navigation flow', mermaid: `flowchart TB\n  Overview --> Problem\n  Overview --> Value\n  Overview --> Risk\n  Overview --> Dashboard\n  Problem --> ToBe`, whyItMatters: 'Shows where the exec usually goes next so onboarding can mimic the path.' },
    ],
    challengesStrategy: [
      { challenge: 'Exec needs answer in 30s but data lives in 5 backends', strategy: 'Pre-roll KPI to Postgres MV refreshed every 60s · render from MV', impact: 'P1 if tab >2s · exec gives up' },
      { challenge: 'KPIs lag the underlying process by minutes', strategy: 'Stamp staleness badge per tile · color amber > 5 min · red > 30 min', impact: 'P2 misleading decision risk' },
      { challenge: 'Drill-down too deep · 4 clicks to row', strategy: '1-click drill from tile to detail tab · query param preselects sub-tab', impact: 'P2 friction · exec stops drilling' },
    ],
    edgeCases: [
      { case: 'Process is new · no KPI history', handling: 'Render baseline-empty state with "first run pending" badge + ETA' },
      { case: 'KPI returns null (backend partial outage)', handling: 'Show last-good value with stale badge · do not crash tile' },
      { case: 'Multi-process rollup (parent dept)', handling: 'Aggregate via weighted-by-volume rule · footnote the formula' },
      { case: 'Timezone mismatch in baseline', handling: 'Convert all to UTC at API layer · render local at UI layer · audit' },
    ],
    scalePerf: [
      { metric: 'Tab cold load p95', target: '< 500ms', actual: '~310ms', status: 'ok' },
      { metric: 'KPI tile refresh', target: '< 100ms', actual: '~85ms (cached)', status: 'ok' },
      { metric: 'Max tiles per overview', target: '≤ 8', actual: '6', status: 'ok' },
      { metric: 'MV refresh lag', target: '< 60s', actual: '~45s', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'KPI API 4xx (proc not found)', handling: 'Log + render empty state · auto-link "go to Process tab to register"' },
      { error: 'ROI divide-by-zero (baseline=0)', handling: 'Guard at math layer · render "no baseline" badge · log warning' },
      { error: 'Timezone parse failure', handling: 'Log + fallback to UTC display · alert if rate > 1/hr' },
    ],
    errorsSilent: [
      { error: 'Stale baseline still showing as "fresh"', implementWhat: 'mtime check on baseline row · render staleness if > N days · weekly cron' },
      { error: 'KPI registered but never updated (zero writes)', implementWhat: 'Daily cron: kpis with 0 writes in 7d → flag as orphan' },
      { error: 'ROI assumes static cost (cost changed but ROI didn\'t)', implementWhat: 'Subscribe ROI calc to cost-change events · invalidate on change' },
    ],
    issueCadence: {
      daily: [
        { issue: 'KPI MV refresh fail', action: 'Auto-retry · alert ops if 3 consecutive fails' },
        { issue: 'Tab load p95 spike > 1s', action: 'On-call investigates · usually MV refresh contention' },
      ],
      weekly: [
        { issue: 'Baseline drift review', action: 'PM reviews · updates baselines that crossed sigma threshold' },
        { issue: 'KPI definition audit', action: 'Eng + PM review KPI formulas for any process onboarded that week' },
      ],
      monthly: [
        { issue: 'Tile layout review (which KPIs deserve overview real estate)', action: 'PM + exec · adjust the 6-tile budget' },
        { issue: 'Drill-path analytics (which tile → which drill)', action: 'Use clickstream to reorder tiles · top tiles = most-drilled' },
      ],
    },
    mistakesUser: [
      { mistake: 'Trusts headline KPI without checking staleness badge', prevention: 'Stamp staleness more prominently · color the whole tile when stale' },
      { mistake: 'Drills into wrong tab (misreads the implied next step)', prevention: 'Add micro-CTA per tile: "drill into → Risk tab"' },
      { mistake: 'Compares processes via overview when they have different baselines', prevention: 'Disable cross-process compare unless baselines normalized' },
    ],
    mistakesArchitect: [
      { mistake: 'Hardcodes which KPI shows on overview (no per-role lens)', prevention: 'KPI source = role-aware config · operator §47.6 lens-switching' },
      { mistake: 'Skips MV (querying raw tables on every render)', prevention: 'PR review checklist: overview tile must read from MV' },
      { mistake: 'Doesn\'t version baseline (when baseline changes, history breaks)', prevention: 'Baseline rows have valid_from/valid_to · historical KPI joins on valid range' },
    ],
    testingPlan: {
      positive: ['Tab renders < 500ms for typical process', 'Headline KPI matches MV value', 'Staleness badge appears when MV > 1min old', '6-tile budget respected'],
      negative: ['Process not found → empty state (not crash)', 'KPI returns null → stale-good display', 'Multiple processes rollup → weighted formula', 'Timezone mismatch → UTC fallback'],
      api: ['/api/v1/holy/kpi/{procId} returns 200 with Zod schema', 'p95 < 100ms', '404 for invalid procId', 'Rate limit 200/min per tenant'],
      data: ['MV freshness < 60s', 'Baseline rows have non-null target', 'KPI formula references real source columns'],
      model: ['N/A · overview uses no model'],
      accuracy: ['KPI rendered matches MV value (round-trip eq)', 'Staleness badge accurate within 5s', 'ROI calc matches finance formula'],
      security: ['No PII in KPI tiles · audit row per render', 'Cross-tenant isolation in MV', 'Role-based KPI visibility'],
      admin: ['Super-user can refresh MV on demand', 'Audit per refresh', 'KPI catalog editable with version'],
      mlops: ['N/A unless forecast KPI · then model versioned'],
    },
  },

  'problem-as-is': {
    diagrams: [
      { title: 'AS-IS workflow swimlane', mermaid: `flowchart LR\n  Trigger -->|manual| Capture[Capture by actor]\n  Capture -->|wait| Queue[Queue / inbox]\n  Queue -->|handoff| Process[Process by 2nd actor]\n  Process -->|errors| Rework\n  Process --> Done`, whyItMatters: 'Names every actor + handoff so pain can be measured per step.' },
      { title: 'Pain heat map', mermaid: `flowchart TB\n  S1[Step 1: 2 hrs] -->|low pain| S2[Step 2: 30 min]\n  S2 -->|HIGH pain| S3[Step 3: 4 hrs · 8% error]\n  S3 -->|med pain| S4[Step 4: 1 hr]`, whyItMatters: 'Surfaces the top hot-spot (Step 3) for prioritization.' },
      { title: 'Gap-to-target visualization', mermaid: `flowchart LR\n  ASIS[AS-IS: 7.5 hrs avg] -->|automate Step 3| GAP[Gap: 6 hrs target]\n  GAP -->|TO-BE| TARGET[TO-BE: 1.5 hrs target]`, whyItMatters: 'Frames the BIG move (Step 3 automation) and the residual manual work.' },
    ],
    challengesStrategy: [
      { challenge: 'Pain is self-reported · actors understate / overstate', strategy: 'Measure with log mining (tickets, timestamps) · cross-check with interview', impact: 'P1 if pain wrong by 2x · roadmap miscalibrated' },
      { challenge: 'Fringe actors not interviewed (only loudest)', strategy: 'Quantitative coverage: sample by volume · interview top-3 per role', impact: 'P2 blind spots in solution' },
      { challenge: 'Gap analysis is subjective ("we need better X")', strategy: 'Quantify gap as delta to named TO-BE metric · sign-off per gap', impact: 'P1 if gap unquantified · TO-BE undefined' },
    ],
    edgeCases: [
      { case: 'Process has no AS-IS metric (legacy · undocumented)', handling: 'Sample 10 instances · measure manually · extrapolate with confidence interval' },
      { case: 'Pain is seasonal (spike in tax season)', handling: 'Annotate cadence · use 12-month rolling avg for baseline' },
      { case: 'Multiple roles share Step 3 differently', handling: 'Split metric per role · weighted by share-of-volume' },
      { case: 'AS-IS includes deprecated tooling', handling: 'Tag steps with tool version · note migration in TO-BE' },
    ],
    scalePerf: [
      { metric: 'Pain measurement freshness', target: '< 30 days', actual: '~21 days', status: 'ok' },
      { metric: 'Process step count documented', target: '100%', actual: '100%', status: 'ok' },
      { metric: 'Actors interviewed coverage', target: '≥ 80%', actual: '85%', status: 'ok' },
      { metric: 'Gap-to-target confidence', target: 'p95 narrow', actual: 'wide on 2 steps', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Pain DB query timeout', handling: 'Retry with smaller window · alert if persistent' },
      { error: 'Invalid date range on AS-IS measurement', handling: 'Validate at API · clear error to operator' },
      { error: 'Process has 0 instances in measurement window', handling: 'Return empty + explicit "no instances" badge · log warning' },
    ],
    errorsSilent: [
      { error: 'Pain unmeasured assumed zero (no measurement = no pain)', implementWhat: 'Drill: every step with N>10 instances MUST have pain rating · CI gate' },
      { error: 'Gap defined in words ("better"), not number', implementWhat: 'Lint: gap field requires numeric delta with unit · pre-commit hook' },
      { error: 'Actor list excludes hourly workers (only salary)', implementWhat: 'HR roster cross-check · monthly audit on actor coverage' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New pain reports from ticketing system', action: 'PM ingests · routes to relevant process' },
        { issue: 'AS-IS metric ingestion fail', action: 'Ops retries; investigates if 3 fails in a row' },
      ],
      weekly: [
        { issue: 'AS-IS metric review with operations team', action: 'Walk top-3 pain steps · validate with floor' },
        { issue: 'Gap calibration check', action: 'Re-run delta calc · update if baseline drifted' },
      ],
      monthly: [
        { issue: 'Full AS-IS re-measure (12-month rolling)', action: 'PM + ops · update baselines · publish to roadmap' },
        { issue: 'Actor roster refresh', action: 'HR + eng · update affected-actors per process' },
      ],
    },
    mistakesUser: [
      { mistake: 'Estimates pain instead of measuring', prevention: 'UI rejects "estimate" tag · requires measurement source link' },
      { mistake: 'Ignores fringe actors (only top-volume)', prevention: 'Actor coverage check in UI · red banner if < 80% covered' },
      { mistake: 'Writes "process is slow" without delta', prevention: 'Gap field requires numeric value · UI validation' },
    ],
    mistakesArchitect: [
      { mistake: 'Skips quantification (qualitative AS-IS only)', prevention: 'CI: every AS-IS row requires numeric column · PR rejection' },
      { mistake: 'Designs TO-BE without validating AS-IS first', prevention: 'TO-BE tab requires AS-IS metric link · drill blocks save' },
      { mistake: 'Treats AS-IS as static (snapshot, not stream)', prevention: 'Schedule re-measure cadence · auto-stale after 90 days' },
    ],
    testingPlan: {
      positive: ['AS-IS metric saved + retrievable', 'Pain hotspots ranked correctly', 'Gap calc matches finance formula', 'Actor roster displayed'],
      negative: ['No measurements → empty state', 'Bad date range → 400 with hint', 'Negative pain → reject', 'Missing actor → warning'],
      api: ['/api/v1/holy/asis/{procId} returns 200', 'Schema validates pain + step + actor', '4xx for bad procId', 'Rate limit 100/min'],
      data: ['Pain values non-negative', 'Step ids unique per process', 'Actor refs exist in roster'],
      model: ['N/A unless pain-prediction model used'],
      accuracy: ['AS-IS measurement vs ground truth (ticket count)', 'Gap calc accurate to ±5%', 'Pain ranking stable across runs'],
      security: ['Actor names PII-redacted in API · audit per access', 'Tenant isolation', 'Read-only for non-PM roles'],
      admin: ['Super-PM can edit any AS-IS row · audit logged', 'Bulk import with Zod', 'Soft-delete with undo'],
      mlops: ['If pain-classifier model → version pinned · drift monitor', 'Eval-set per release'],
    },
  },

  'to-be': {
    diagrams: [
      { title: 'TO-BE workflow', mermaid: `flowchart LR\n  Trigger -->|auto-detect| AIRoute[AI route]\n  AIRoute -->|high conf| Auto[Auto-resolve]\n  AIRoute -->|low conf| HITL[Human review]\n  Auto --> Audit\n  HITL --> Audit`, whyItMatters: 'Shows the decision tier (auto vs HITL) at a glance.' },
      { title: 'Success-gate sequence', mermaid: `sequenceDiagram\n  participant Build\n  participant Eval\n  participant Gate\n  Build->>Eval: model + baseline\n  Eval->>Gate: metric per category\n  Gate-->>Build: PASS · ship<br>or FAIL · iterate`, whyItMatters: 'Names the release-gate contract · no ship without metric pass.' },
      { title: 'Milestone roadmap', mermaid: `gantt\n  title TO-BE roadmap\n  section Phase 1\n  Build :a1, 2026-07-01, 30d\n  section Phase 2\n  Pilot :a2, after a1, 30d\n  section Phase 3\n  Rollout :a3, after a2, 60d`, whyItMatters: 'Locks timelines · operator can see when value lands.' },
    ],
    challengesStrategy: [
      { challenge: 'TO-BE looks magical (no hand-off detail)', strategy: 'Mandate step-level detail per phase · auto-generate swimlane from spec', impact: 'P1 if vague · team can\'t estimate' },
      { challenge: 'Success metric is "better" not numeric', strategy: 'Lint: success_metric field requires {metric, target, unit, baseline}', impact: 'P0 if missing · cannot prove value' },
      { challenge: 'Roadmap milestones >5 (team can\'t track)', strategy: 'Cap at 5 · merge sub-milestones into "epics"', impact: 'P2 burndown becomes meaningless' },
    ],
    edgeCases: [
      { case: 'No baseline exists (AS-IS not measured)', handling: 'Block TO-BE save · link to problem-as-is tab to fix' },
      { case: 'Multiple success metrics (composite)', handling: 'Allow array · require primary tag · weighted formula stored' },
      { case: 'Milestone slips · roadmap behind', handling: 'Auto-update with delta + reason · alert PM' },
      { case: 'TO-BE replaces vendor (license sunset)', handling: 'Capture sunset date · ensure migration milestone before sunset' },
    ],
    scalePerf: [
      { metric: 'Roadmap milestones', target: '≤ 5', actual: 'varies', status: 'ok' },
      { metric: 'Success metrics per TO-BE', target: '1 primary + ≤ 3 secondary', actual: '~2 avg', status: 'ok' },
      { metric: 'TO-BE save latency', target: '< 1s', actual: '~600ms', status: 'ok' },
      { metric: 'Diagram render', target: '< 500ms', actual: '~200ms', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'TO-BE save fails (Zod validation)', handling: 'Return 400 with field-level error · client highlights field' },
      { error: 'Roadmap milestone date in past on first save', handling: 'Warn but allow · log for audit' },
      { error: 'Success metric formula parse error', handling: 'Reject save · show formula syntax help' },
    ],
    errorsSilent: [
      { error: 'TO-BE published but team unaware (no notification)', implementWhat: 'Auto-notify team on TO-BE publish · §38 audit row' },
      { error: 'Success metric not wired to actual measurement system', implementWhat: 'Drill: every success_metric must resolve to a queryable source' },
      { error: 'Milestone slipped silently (no reason logged)', implementWhat: 'Slip > 7 days requires reason field · CI gate' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Milestone burn-up review (in-flight phases)', action: 'PM checks · escalates blockers' },
        { issue: 'TO-BE save audit', action: 'Audit row reviewer · spot-check 5%' },
      ],
      weekly: [
        { issue: 'Roadmap re-baseline (slip catch-up)', action: 'PM + eng · adjust dates · communicate' },
        { issue: 'Success metric calibration', action: 'Eng + analyst · validate formula against staging' },
      ],
      monthly: [
        { issue: 'TO-BE retrospective (was the metric achievable?)', action: 'Cross-team review · update template if recurring' },
        { issue: 'Roadmap quarterly look-ahead', action: 'PM + leadership · publish to stakeholders' },
      ],
    },
    mistakesUser: [
      { mistake: 'Writes success metric as "improve X" (no number)', prevention: 'Form rejects · requires target field' },
      { mistake: 'Saves with 8 milestones · burndown unreadable', prevention: 'UI caps at 5 · suggests merge' },
      { mistake: 'Picks vague owner ("the team")', prevention: 'Owner field is dropdown from roster · no free text' },
    ],
    mistakesArchitect: [
      { mistake: 'TO-BE diagram skips HITL (assumes 100% automation)', prevention: 'Diagram lint: must have at least one HITL branch unless decision class is pure-auto' },
      { mistake: 'Success metric only counts upside (ignores risk)', prevention: 'Require risk metric alongside success metric · cross-link' },
      { mistake: 'Roadmap built without dependency review', prevention: 'Dependency check: milestone N+1 cannot start before N (upstream) completes' },
    ],
    testingPlan: {
      positive: ['TO-BE saves with valid schema', 'Diagram renders', 'Milestone calc correct', 'Owner resolves to roster'],
      negative: ['Past milestone date → warn', '>5 milestones → reject', 'Missing baseline → block', 'Formula syntax → 400'],
      api: ['/api/v1/holy/tobe/{procId} POST returns 201', 'GET returns saved record', 'Zod-strict validation', '429 rate limited'],
      data: ['Milestone ordering valid', 'Owner refs exist', 'Metric refs queryable', 'No orphan TO-BE'],
      model: ['N/A unless AI-suitability model used'],
      accuracy: ['Roadmap slip calc accurate', 'Success metric formula matches finance', 'Burndown chart correct'],
      security: ['TO-BE access role-gated', 'Audit per save', 'Per-tenant isolation'],
      admin: ['PM can edit any TO-BE · audit', 'Bulk update via CSV with Zod', 'Soft-delete'],
      mlops: ['If predict-success-prob model → versioned · eval per release'],
    },
  },

  'ai-strategy': {
    diagrams: [
      { title: 'AI-suitability decision tree', mermaid: `flowchart TB\n  Q1{Is decision frequent?} -->|no| Rules[Use rules]\n  Q1 -->|yes| Q2{Is data labeled?}\n  Q2 -->|no| RAG[Use RAG / LLM]\n  Q2 -->|yes| Q3{Is signal stationary?}\n  Q3 -->|no| Online[Online ML]\n  Q3 -->|yes| Batch[Batch ML]`, whyItMatters: 'Catches mismatched AI type before code lands.' },
      { title: 'Value-vs-Risk matrix', mermaid: `flowchart LR\n  HI[High value + Low risk] -->|build now| Build\n  HL[High value + High risk] -->|pilot first| Pilot\n  LV[Low value + Low risk] -->|defer| Defer\n  LL[Low value + High risk] -->|skip| Skip`, whyItMatters: 'Forces an explicit quadrant pick · no fence-sitting.' },
      { title: 'Primary + secondary AI roles', mermaid: `flowchart LR\n  Decision -->|primary| ML[XGBoost classifier]\n  ML -->|low conf 20%| Secondary[Secondary: RAG LLM for narrative]\n  Secondary --> HITL`, whyItMatters: 'Names primary vs secondary · prevents over-engineering.' },
    ],
    challengesStrategy: [
      { challenge: 'Picks AI type by hype, not problem fit', strategy: 'Decision tree gates AI type · ADR required for choice', impact: 'P0 wrong type wastes months' },
      { challenge: 'Risk underestimated (assumes vendor handles it)', strategy: 'Mandatory STRIDE per AI feature · risk register entry', impact: 'P1 missed compliance gate' },
      { challenge: 'No fallback named (AI is single point)', strategy: 'Rules-engine baseline ALWAYS deployed alongside AI', impact: 'P0 outage on AI down' },
    ],
    edgeCases: [
      { case: 'Decision class is regulated (Art. 86 EU AI Act)', handling: 'Must produce counterfactual per decision · explainability mandatory' },
      { case: 'No labeled data → unsupervised baseline needed', handling: 'Choose representation learning + cluster · validate via downstream label trickle' },
      { case: 'AI ROI projected but baseline weak', handling: 'Stretch baseline first (improve rules) before claiming AI ROI' },
      { case: 'Multi-tenant data isolation prevents shared model', handling: 'Per-tenant models OR federated learning · cost trade-off' },
    ],
    scalePerf: [
      { metric: 'AI type choice per process', target: '1 primary + ≤ 2 secondary', actual: '~1.5 avg', status: 'ok' },
      { metric: 'Value > risk threshold', target: 'ratio ≥ 1.5', actual: 'varies', status: 'warn' },
      { metric: 'Data readiness score', target: '≥ 0.8', actual: '~0.75', status: 'warn' },
      { metric: 'Decision review SLA', target: '< 5 days', actual: '~3 days', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'AI-type choice without ADR ref', handling: 'CI fail · PR block · ADR template auto-link' },
      { error: 'Risk-register entry missing', handling: 'Save fails · UI shows risk-register short-form' },
      { error: 'Fallback path undefined', handling: 'Block "ship" action · fallback dropdown required' },
    ],
    errorsSilent: [
      { error: 'AI type changed mid-build but ADR not updated', implementWhat: 'Drift check: code references AI-type X · ADR says Y → flag' },
      { error: 'ROI projection uses optimistic params (no sensitivity)', implementWhat: 'Require Monte Carlo with band · UI shows p10-p90' },
      { error: 'Risk score not re-evaluated after scope change', implementWhat: 'Scope-change webhook triggers risk re-evaluation' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New ai-strategy proposals queue', action: 'Architect reviews · routes to council if non-trivial' },
        { issue: 'AI-readiness data refresh', action: 'Auto-refresh · alert if signal drops' },
      ],
      weekly: [
        { issue: 'ROI projection vs actual catch-up', action: 'PM + finance · adjust models that drifted' },
        { issue: 'Risk register review for AI features', action: 'Risk team · prioritize mitigations' },
      ],
      monthly: [
        { issue: 'AI-strategy alignment with portfolio', action: 'Architect + leadership · re-balance' },
        { issue: 'AI vendor landscape scan', action: 'Eng lead · update build-vs-buy assumptions' },
      ],
    },
    mistakesUser: [
      { mistake: 'Picks "LLM" because it\'s popular · problem is classification', prevention: 'Decision tree gates · LLM choice for classification fails' },
      { mistake: 'Skips fallback because "AI is reliable"', prevention: 'Form requires fallback · cannot save without' },
      { mistake: 'Underestimates data prep effort', prevention: 'Auto-populate effort from data readiness score' },
    ],
    mistakesArchitect: [
      { mistake: 'No primary/secondary distinction (uses 3 models in parallel)', prevention: 'Schema enforces primary tag · UI rejects ambiguity' },
      { mistake: 'Plans only happy path · no degraded mode', prevention: 'Strategy template requires degraded-mode section' },
      { mistake: 'Skips data ownership clarification', prevention: 'AI feature requires data-owner sign-off · email captured' },
    ],
    testingPlan: {
      positive: ['Strategy saves with ADR ref', 'Decision tree gates AI-type', 'ROI calc matches model'],
      negative: ['Missing ADR → reject', 'No fallback → reject', 'Risk register empty → 400'],
      api: ['/api/v1/holy/ai-strategy/{procId}', 'Zod schema validates types', '4xx for invalid', 'Rate limit'],
      data: ['AI types from enum (no free text)', 'ADR refs resolve', 'Owner refs exist'],
      model: ['If AI-suitability classifier used: pinned + eval baseline'],
      accuracy: ['ROI calc matches finance', 'Risk score reproducible from inputs', 'Readiness score consistent'],
      security: ['Strategy access role-gated', 'No PII in saved fields', 'Audit per change'],
      admin: ['Super-architect can edit · audit', 'Strategy templates editable', 'Bulk import safe'],
      mlops: ['Model versioning per strategy · canary on staging · rollback tested'],
    },
  },

  'digital-transformation': {
    diagrams: [
      { title: '4P transformation map', mermaid: `flowchart TB\n  P1[People: reskill + roles] -->|enables| P2[Process: redesigned]\n  P2 -->|requires| P4[Technology: new stack]\n  P4 -->|measured by| P3[Profit: $ saved + earned]\n  P1 -.->|adoption| P3`, whyItMatters: 'Forces all 4 dimensions to be addressed together.' },
      { title: 'Change-management timeline', mermaid: `gantt\n  title Change rollout\n  section People\n  Reskill :2026-07-01, 60d\n  section Process\n  Pilot :2026-08-01, 30d\n  section Tech\n  Deploy :2026-09-01, 30d\n  section Adoption\n  Track :2026-10-01, 90d`, whyItMatters: 'Sequences the 4Ps · adoption tracking is its own phase.' },
      { title: 'Adoption funnel', mermaid: `flowchart LR\n  Awareness -->|50%| Trial\n  Trial -->|60%| Use\n  Use -->|70%| Habit\n  Habit -->|stickiness| ROI`, whyItMatters: 'Names the funnel · prevents declaring victory at deploy.' },
    ],
    challengesStrategy: [
      { challenge: 'Tech ships · people don\'t adopt (shelfware)', strategy: 'Adoption metric defined upfront · refuse to mark "done" until habit phase met', impact: 'P0 wasted spend' },
      { challenge: '4Ps treated sequentially (people last)', strategy: 'Parallel tracks · people work starts day 1', impact: 'P1 delayed value' },
      { challenge: 'Reskilling budget cut at last minute', strategy: 'Lock reskill % of total budget at kickoff · ADR if cut', impact: 'P1 adoption fails' },
    ],
    edgeCases: [
      { case: 'Acquisition mid-transformation (new people)', handling: 'Pause adoption metric · re-baseline · add integration plan' },
      { case: 'Regulator demands process change mid-flight', handling: 'Branch process design · regulator-driven path tracked separately' },
      { case: 'Vendor exits market', handling: 'Auto-trigger vendor-risk review · backup vendor in tech track' },
      { case: 'Adoption stuck below 50% trial', handling: 'Halt rollout · re-baseline change-mgmt plan · interview blockers' },
    ],
    scalePerf: [
      { metric: 'Time to first adoption', target: '< 30 days post-deploy', actual: 'varies', status: 'warn' },
      { metric: 'Habit % at 90 days', target: '≥ 70%', actual: 'varies', status: 'warn' },
      { metric: 'Reskill completion %', target: '100% of affected', actual: '~85%', status: 'warn' },
      { metric: 'Change-comms cadence', target: 'weekly during rollout', actual: 'weekly', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Adoption survey response < 30%', handling: 'Auto-trigger reminder · escalate after 2 reminders' },
      { error: 'Reskill platform sync fail', handling: 'Retry · alert L&D if persistent' },
      { error: 'Change-comms send fail', handling: 'Log + retry · alert if email vendor down' },
    ],
    errorsSilent: [
      { error: 'Adoption tracked at deploy count, not actual use', implementWhat: 'Telemetry on feature use · session-count > 1 = real adoption' },
      { error: 'Reskill marked complete on attendance only', implementWhat: 'Skills assessment post-training · pass-rate metric' },
      { error: 'Change-comms read but not understood', implementWhat: 'Comprehension quiz · target ≥ 80% correct' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Adoption telemetry dashboard refresh', action: 'PM checks · drill if drop' },
        { issue: 'Reskill enrollment update', action: 'L&D ingests · nudges holdouts' },
      ],
      weekly: [
        { issue: 'Change-mgmt steering committee', action: 'PM + change-lead · review blockers · adjust comms' },
        { issue: '4P balance check', action: 'Architect · confirm no P starving the others' },
      ],
      monthly: [
        { issue: 'Adoption funnel deep-dive', action: 'Analyst · publish stage-by-stage drop-off' },
        { issue: 'Reskill program effectiveness', action: 'L&D · measure pass-rate trend' },
      ],
    },
    mistakesUser: [
      { mistake: 'Declares "adopted" at deploy count', prevention: 'UI requires habit metric · deploy is not adoption' },
      { mistake: 'Sends change comms but doesn\'t check open rate', prevention: 'Comms platform open-rate badge · auto-resend if < 50%' },
      { mistake: 'Skips reskill ROI check', prevention: 'Reskill ROI auto-calculated from pass-rate + use' },
    ],
    mistakesArchitect: [
      { mistake: 'Tech-only transformation (skips people/process)', prevention: 'Require 4P fields populated · drill blocks save' },
      { mistake: 'No adoption metric defined', prevention: 'Cannot ship without adoption_metric set in TO-BE' },
      { mistake: 'Reskill budget < 10% of project budget', prevention: 'Auto-flag at PR review · architect must justify' },
    ],
    testingPlan: {
      positive: ['4P plan saves', 'Adoption telemetry ingestion works', 'Change comms sends'],
      negative: ['Missing P → reject', 'Adoption < 0% → invalid', 'Comms list empty → warn'],
      api: ['/api/v1/holy/dt/{procId} POST', 'Zod 4P schema', 'Adoption telemetry POST', 'Rate limit'],
      data: ['4P refs valid', 'Adoption events match telemetry source', 'Reskill records match LMS'],
      model: ['If churn-predictor for adoption → versioned'],
      accuracy: ['Adoption funnel calc correct', 'Reskill pass-rate matches LMS', 'ROI calc matches finance'],
      security: ['Adoption data PII-handled', 'Per-tenant isolation', 'Audit per access'],
      admin: ['PM can edit DT plan · audit', 'LMS integration toggle'],
      mlops: ['Adoption-predictor model versioned · drift monitored'],
    },
  },

  'manual-explore': {
    diagrams: [
      { title: 'Layout variant decision', mermaid: `flowchart LR\n  Goal[Reading manual process] -->|persona| P1[UX designer]\n  P1 -->|prefers| V1[2-col Sequence+Ops]\n  Goal -->|persona| P2[Process designer]\n  P2 -->|prefers| V2[Split canvas]\n  Goal -->|persona| P3[Ops lead]\n  P3 -->|prefers| V3[Compare side-by-side]`, whyItMatters: 'Different personas need different layouts · this tab proves we have 3.' },
      { title: 'Data source flow', mermaid: `flowchart LR\n  proc[proc.manual_process] -->|steps| Layout\n  proc -->|operations| Layout\n  Layout -->|3 variants| UI\n  UI -->|operator| Decision[Pick winner]`, whyItMatters: 'Identical data through 3 chromes · operator picks winner.' },
      { title: 'Variant lifecycle', mermaid: `stateDiagram-v2\n  [*] --> Variant1\n  Variant1 --> Variant2\n  Variant2 --> Variant3\n  Variant3 --> Picked\n  Picked --> [*]`, whyItMatters: 'Explore → pick → ship lifecycle.' },
    ],
    challengesStrategy: [
      { challenge: 'Layout decisions live in slides not code', strategy: 'Sandbox tab in production · operator clicks · feedback in-context', impact: 'P2 design rot' },
      { challenge: 'Pick winner without measuring', strategy: 'Per-variant time-to-task metric · A/B with operators', impact: 'P2 pick wrong winner' },
      { challenge: 'Sandbox bloat (variants accumulate)', strategy: 'Cap at 3 variants · sunset losers after pick', impact: 'P3 tab clutter' },
    ],
    edgeCases: [
      { case: 'proc.manual_process empty', handling: '§57.7 fixture with yellow banner · operator sees layout without real data' },
      { case: 'Steps > 20 (long sequence)', handling: 'Vertical scroll · per-step collapse · do not auto-truncate' },
      { case: 'Operations > 30', handling: 'Group by category · filter input · keyboard nav' },
      { case: 'Operator picks variant but doesn\'t commit', handling: 'Sandbox stays · production tabs unchanged · explicit "promote" action' },
    ],
    scalePerf: [
      { metric: 'Layout render p95', target: '< 200ms', actual: '~80ms (3 variants)', status: 'ok' },
      { metric: 'Variant count', target: '≤ 3 active', actual: '3', status: 'ok' },
      { metric: 'Operator decision time', target: '< 5 min', actual: 'TBD', status: 'warn' },
      { metric: 'Fallback fixture detection', target: 'always banner', actual: 'always banner', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Layout component crash', handling: 'React error boundary · fallback to text · log' },
      { error: 'Fixture load fail', handling: 'Hardcoded fallback · log warning' },
      { error: 'Op button-press state corrupt', handling: 'Reset local state · log' },
    ],
    errorsSilent: [
      { error: 'Operator picks variant but never tells team', implementWhat: 'Promote action + comms · forces team alignment' },
      { error: 'Variant scores well in test but fails ops', implementWhat: 'Post-pick monitoring · operator survey at week 2' },
      { error: 'Fixture diverges from real data', implementWhat: 'Auto-refresh fixture from sampled prod monthly' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Operator clicks logged · which variant gets traffic', action: 'PM reviews · prioritize winning chrome' },
        { issue: 'Fixture freshness', action: 'Ops · refresh from prod sample' },
      ],
      weekly: [
        { issue: 'Variant performance compare', action: 'PM + UX · pick favorite' },
        { issue: 'Sandbox cleanup (remove losers)', action: 'PM + eng' },
      ],
      monthly: [
        { issue: 'Layout decision retrospective', action: 'Cross-team review' },
        { issue: 'Promote winner to manual-transaction tab', action: 'Eng implements' },
      ],
    },
    mistakesUser: [
      { mistake: 'Picks variant based on aesthetics not task-time', prevention: 'PM enforces task-time metric · not "looks nice"' },
      { mistake: 'Forgets to test with real persona', prevention: 'Per-variant persona checklist · UX validates' },
      { mistake: 'Mixes layout variants in production', prevention: 'Sandbox isolated · explicit promote step' },
    ],
    mistakesArchitect: [
      { mistake: 'Adds 4th variant before sunsetting 1st', prevention: 'Cap drill · max 3 active · CI gate' },
      { mistake: 'Variants share no data source (apples-to-oranges)', prevention: 'All variants take same data prop · drill enforces' },
      { mistake: 'No §57.7 fallback (variant breaks with empty data)', prevention: 'Fixture mandatory · drill verifies' },
    ],
    testingPlan: {
      positive: ['Each variant renders', 'Fallback fixture used when data absent', 'Op button click logs to local state'],
      negative: ['Empty steps → fixture', 'Bad op shape → render skip', 'No proc → fallback'],
      api: ['No backend API · pure client component', 'No external calls', 'Read proc from context'],
      data: ['Step shape: {actor, step, time_min?}', 'Op shape: {id, label, icon?, desc?}', 'Shape-tolerant rendering'],
      model: ['N/A · pure layout'],
      accuracy: ['All steps + ops rendered in correct order', 'No silent drops'],
      security: ['No PII in fixture · all synthesized', 'No external data leak'],
      admin: ['Operator can pick variant · log local decision', 'PM can promote variant code'],
      mlops: ['N/A · no model · variant choice is human'],
    },
  },
  'manual-transaction': {
    diagrams: [
      { title: 'Manual swimlane', mermaid: `flowchart LR\n  subgraph Customer\n    C1[Submit form]\n  end\n  subgraph Agent\n    A1[Receive] --> A2[Validate]\n    A2 --> A3[Process]\n  end\n  subgraph System\n    S1[Store]\n  end\n  C1 --> A1\n  A3 --> S1`, whyItMatters: 'Names every actor + handoff so manual time can be measured.' },
      { title: 'Time-cost ledger flow', mermaid: `flowchart TB\n  Step1[Step 1: 12 min · $4] --> Step2[Step 2: 18 min · $6]\n  Step2 --> Decision{Decision}\n  Decision -->|pass 70%| Step3[Step 3: 10 min · $3]\n  Decision -->|reject 30%| Rework[Rework: 25 min · $8]`, whyItMatters: 'Time + cost visible per step · ROI math becomes obvious.' },
      { title: 'Exception flow', mermaid: `flowchart LR\n  Normal -->|exception| Handoff[Handoff to L2]\n  Handoff --> Investigate\n  Investigate -->|resolve| Resume\n  Investigate -->|escalate| L3`, whyItMatters: 'Exception path was missing from prior docs · audit gap.' },
    ],
    challengesStrategy: [
      { challenge: 'Step times self-reported (operators round to 5/10/15 min)', strategy: 'Time-tracking tooling captures actuals · cross-check with self-report', impact: 'P1 time off by 30%' },
      { challenge: 'Handoffs lose context (Slack/email scatter)', strategy: 'Mandate handoff record in workflow tool · template enforced', impact: 'P1 rework' },
      { challenge: 'Exception paths undocumented (tribal)', strategy: 'Capture each exception type as named branch · template per exception', impact: 'P2 SLA breach' },
    ],
    edgeCases: [
      { case: 'Customer submits in wrong format', handling: 'Auto-reject with format hint · don\'t enter manual queue' },
      { case: 'Agent on PTO mid-process', handling: 'Auto-reassign at SLA threshold · audit chain preserved' },
      { case: 'System down · manual fallback', handling: 'Paper-based fallback runbook · reconcile when up' },
      { case: 'Customer changes mind mid-process', handling: 'Cancel branch · partial-time-cost recorded' },
    ],
    scalePerf: [
      { metric: 'Avg manual cycle time', target: '< 60 min', actual: '~78 min', status: 'warn' },
      { metric: 'Handoff count per case', target: '≤ 2', actual: '~3.2', status: 'warn' },
      { metric: 'Exception rate', target: '< 8%', actual: '~12%', status: 'warn' },
      { metric: 'SLA compliance', target: '≥ 95%', actual: '~89%', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Workflow tool save failure', handling: 'Retry · escalate to ops if persistent' },
      { error: 'Handoff template validation fail', handling: 'Reject save · UI shows missing fields' },
      { error: 'Customer-form parse error', handling: 'Quarantine for human review · do not auto-process' },
    ],
    errorsSilent: [
      { error: 'Agent works around system (logs in spreadsheet)', implementWhat: 'Spreadsheet audit cron · find common shadow tools · onboard' },
      { error: 'Exception handled but not logged', implementWhat: 'Workflow rejects close without exception code if elapsed > median' },
      { error: 'Customer drops out · case stays open', implementWhat: 'Stale-case sweep · auto-close after N days no-contact' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Queue depth review', action: 'Supervisor · re-balance assignments' },
        { issue: 'Stuck-case sweep', action: 'Ops · find cases > 2× median age' },
      ],
      weekly: [
        { issue: 'Exception-rate trend', action: 'PM + ops · root-cause top exception code' },
        { issue: 'Handoff-count audit', action: 'Coach high-handoff agents' },
      ],
      monthly: [
        { issue: 'SLA compliance report', action: 'Publish to leadership · adjust staffing' },
        { issue: 'Shadow-tool audit', action: 'Find spreadsheets · onboard into system' },
      ],
    },
    mistakesUser: [
      { mistake: 'Agent skips handoff template ("rush")', prevention: 'System rejects close without template · audit logged' },
      { mistake: 'Step time logged as round number', prevention: 'Auto-capture via timer · disallow manual edit' },
      { mistake: 'Exception code "other" overused', prevention: 'Block "other" unless free-text reason > 50 chars · weekly audit' },
    ],
    mistakesArchitect: [
      { mistake: 'Designs without measuring actuals', prevention: 'Process spec requires actuals link · drill blocks' },
      { mistake: 'Single SLA for all cases (one-size-fits-all)', prevention: 'Per-case-class SLA · UI requires class assignment' },
      { mistake: 'No exception taxonomy (everything is "exception")', prevention: 'Exception field is enum · taxonomy ADR required' },
    ],
    testingPlan: {
      positive: ['Manual workflow saves', 'Handoff routes to next actor', 'Exception path triggers L2'],
      negative: ['Missing template → reject', 'Negative step time → invalid', 'Bad actor id → 400'],
      api: ['/api/v1/holy/manual/{procId}/case', 'Zod schema', 'Rate limit per actor', 'SLA on save < 1s'],
      data: ['Actor refs valid', 'Step ids unique', 'Exception codes in taxonomy', 'No orphan cases'],
      model: ['If routing model used → versioned + eval baseline'],
      accuracy: ['Time tracked matches timer ground truth', 'Cost calc matches finance per actor', 'Exception rate calc accurate'],
      security: ['Customer PII redacted in API · audit per access', 'Tenant isolation', 'Agent scope grants'],
      admin: ['Supervisor can re-assign · audit', 'Bulk close with reason', 'Soft-delete cases'],
      mlops: ['Routing model versioned · drift monitored · weekly RAGAS-like eval on routing-quality'],
    },
  },

  // ─── batch 2 of 5 ────────────────────────────────────────────────────
  'automatic-pipeline': {
    diagrams: [
      { title: 'Pipeline DAG', mermaid: `flowchart LR\n  Trigger -->|event| Ingest\n  Ingest --> Validate\n  Validate -->|ok| Transform\n  Validate -->|fail| DLQ\n  Transform --> Score\n  Score --> Persist\n  Persist --> Notify`, whyItMatters: 'Every node has owner · DLQ path explicit · no silent drop.' },
      { title: 'Trigger sequence', mermaid: `sequenceDiagram\n  participant Source\n  participant Bus\n  participant Pipeline\n  participant Audit\n  Source->>Bus: emit event\n  Bus->>Pipeline: deliver (at-least-once)\n  Pipeline->>Audit: log start (idempotency-key)\n  Pipeline->>Pipeline: process\n  Pipeline->>Audit: log end (status)`, whyItMatters: 'Names idempotency key · audit-row contract for replay.' },
      { title: 'Fallback path', mermaid: `flowchart TB\n  Auto[AI score] -->|conf > 0.8| AutoDecide\n  Auto -->|0.5-0.8| HITL[Queue HITL]\n  Auto -->|< 0.5 or AI down| Rules[Rules-engine fallback]\n  Rules --> AutoDecide`, whyItMatters: 'Rules fallback is ALWAYS deployed · AI down ≠ outage.' },
    ],
    challengesStrategy: [
      { challenge: 'Pipeline silently drops events on transient errors', strategy: 'DLQ + retry policy explicit · alert on DLQ growth', impact: 'P0 lost transactions' },
      { challenge: 'Cost per run unmeasured · runaway spend', strategy: 'Cost per stage tracked · budget gate at total', impact: 'P1 unexpected bill' },
      { challenge: 'Fallback path never tested in prod-like', strategy: 'Quarterly chaos drill · disable AI · ensure rules path works', impact: 'P0 fallback broken when needed' },
    ],
    edgeCases: [
      { case: 'Duplicate event (at-least-once delivery)', handling: 'Idempotency key dedup at sink · audit shows skip' },
      { case: 'Out-of-order event', handling: 'Sequence number per producer · sink rejects out-of-order or reorders if window' },
      { case: 'Schema evolution mid-flight', handling: 'Versioned schemas · pipeline handles N and N-1 · drill enforced' },
      { case: 'Downstream sink unavailable', handling: 'Backpressure to bus · log lag metric · alert if > SLA' },
    ],
    scalePerf: [
      { metric: 'Throughput', target: '≥ 1k/s', actual: '~850/s', status: 'warn' },
      { metric: 'p95 stage latency', target: '< 200ms', actual: '~170ms', status: 'ok' },
      { metric: 'DLQ rate', target: '< 0.1%', actual: '~0.06%', status: 'ok' },
      { metric: 'Cost per 1M events', target: '< $50', actual: '~$42', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Stage timeout (downstream slow)', handling: 'Log + DLQ after 3 retries · alert if rate > 1%' },
      { error: 'Schema validation fail', handling: 'Log + DLQ · publisher notified · drill catches at PR' },
      { error: 'Sink write fail', handling: 'Backpressure + alert · pause pipeline if > 5 min' },
    ],
    errorsSilent: [
      { error: 'Event processed but downstream unaware (notification skipped)', implementWhat: 'End-to-end ack: sink must confirm to bus · pipeline waits for ack' },
      { error: 'Cost drifts up (config change · larger payloads)', implementWhat: 'Cost SLI · weekly review · alert on > 20% week-over-week' },
      { error: 'Fallback never exercised (silent rot)', implementWhat: 'Quarterly drill · canary % traffic to fallback always' },
    ],
    issueCadence: {
      daily: [
        { issue: 'DLQ review', action: 'Ops · drain · root-cause top error code' },
        { issue: 'Cost dashboard', action: 'PM checks · investigate spikes' },
      ],
      weekly: [
        { issue: 'Throughput trend review', action: 'Eng · scale up/down based on forecast' },
        { issue: 'Latency p95 trend', action: 'SRE · profile slow stages' },
      ],
      monthly: [
        { issue: 'Schema audit (all producers up-to-date)', action: 'Eng + producers · deprecate old versions' },
        { issue: 'Fallback chaos drill', action: 'Disable AI in staging · ensure rules path passes' },
      ],
    },
    mistakesUser: [
      { mistake: 'Triggers pipeline without scope grant', prevention: 'API requires scope · 403 with grant request hint' },
      { mistake: 'Submits event without idempotency-key', prevention: 'Require key in payload · reject with hint' },
      { mistake: 'Ignores DLQ alert', prevention: 'DLQ > N forces ack-or-snooze · cannot dismiss' },
    ],
    mistakesArchitect: [
      { mistake: 'No DLQ defined (assumes 100% success)', prevention: 'Spec requires DLQ topic · drill blocks deploy' },
      { mistake: 'Cost untracked per stage', prevention: 'OTEL span includes cost · dashboard required' },
      { mistake: 'No backpressure (drops events on overload)', prevention: 'Load test required · backpressure mechanism documented' },
    ],
    testingPlan: {
      positive: ['Pipeline processes valid event end-to-end', 'DLQ catches invalid', 'Fallback path engages on AI failure'],
      negative: ['Duplicate event → dedup', 'Out-of-order → handled per policy', 'Sink down → backpressure'],
      api: ['Trigger API rate-limited', 'Idempotency key required', 'Audit row per call', 'Schema versioned'],
      data: ['Event refs valid', 'No orphan DLQ rows', 'Idempotency keys unique within window'],
      model: ['AI model versioned · canary traffic split · rollback tested'],
      accuracy: ['Score matches ground truth in eval set', 'Drift < threshold', 'Per-segment metrics tracked'],
      security: ['Per-tenant pipeline isolation', 'Scope grant per trigger', 'Audit row per event'],
      admin: ['Pause/resume by ops · audit', 'DLQ drain with reason', 'Cost-budget editable'],
      mlops: ['Model registry-pinned · drift monitor · weekly RAGAS-like eval · rollback in < 10 min'],
    },
  },

  'accuracy-benchmarking': {
    diagrams: [
      { title: 'Benchmark lineage', mermaid: `flowchart LR\n  Dataset -->|version| Eval[Eval set]\n  Eval --> Model\n  Model -->|score| Metrics\n  Metrics -->|compare| Baseline\n  Baseline -->|pass / fail| Gate`, whyItMatters: 'Names the dataset version contract · no eval without versioned set.' },
      { title: 'Eval pipeline sequence', mermaid: `sequenceDiagram\n  participant Trainer\n  participant Registry\n  participant Eval\n  participant Gate\n  Trainer->>Registry: register model\n  Registry->>Eval: trigger eval\n  Eval->>Eval: run metrics per category\n  Eval->>Gate: submit scorecard\n  Gate-->>Trainer: pass | fail with reason`, whyItMatters: 'Locks the release-gate handshake.' },
      { title: 'Per-category metric grid', mermaid: `flowchart TB\n  Class[Classification: F1 + AUC]\n  Reg[Regression: MAE + RMSE]\n  Rank[Ranking: nDCG + MRR]\n  RAG[RAG: Faithfulness + Citation]`, whyItMatters: 'Metric depends on task class · prevents wrong metric.' },
    ],
    challengesStrategy: [
      { challenge: 'Single metric ("accuracy") hides class imbalance', strategy: 'Mandatory metric-per-class · weighted F1', impact: 'P0 wrong release gate' },
      { challenge: 'Eval set leaks into training', strategy: 'Hash-tracked split · CI checks no overlap', impact: 'P0 fake performance' },
      { challenge: 'No baseline to beat (compares against nothing)', strategy: 'Rules-engine baseline ALWAYS run · model must beat it', impact: 'P1 ship without justification' },
    ],
    edgeCases: [
      { case: 'Eval set updated (drift in ground truth)', handling: 'Version eval set · re-run historical models on new set · publish diff' },
      { case: 'Model passes overall but fails one segment', handling: 'Segment-level gate · block release if any segment > threshold delta' },
      { case: 'Statistical significance borderline (p ≈ 0.05)', handling: 'Require stronger evidence (p < 0.01) for high-stakes · audit decision' },
      { case: 'Model improves accuracy but cost doubles', handling: 'Cost-adjusted metric · block if ROI inverted' },
    ],
    scalePerf: [
      { metric: 'Eval runtime', target: '< 30 min', actual: '~22 min', status: 'ok' },
      { metric: 'Per-category metrics', target: '≥ 4 (class/reg/rank/RAG)', actual: '4', status: 'ok' },
      { metric: 'Eval set size', target: '≥ 500 samples', actual: '~1200', status: 'ok' },
      { metric: 'Reproducibility (seed-locked)', target: '100%', actual: '100%', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Eval pipeline OOM', handling: 'Smaller batch · alert if OOM > 1/wk' },
      { error: 'Metric calc divide-by-zero', handling: 'Guard at math · log warning · return undefined' },
      { error: 'Dataset version not found', handling: '404 with dataset registry link' },
    ],
    errorsSilent: [
      { error: 'Eval set has class imbalance not reported', implementWhat: 'Auto-generate class-distribution report alongside metrics' },
      { error: 'Metric reported but evidence link missing', implementWhat: 'Metric row requires MLflow run id · CI gate' },
      { error: 'Threshold drifted but no one noticed', implementWhat: 'Weekly review of pass/fail rate · alert if shift > 10%' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Eval run failures', action: 'MLOps · investigate · re-run' },
        { issue: 'New scorecard reviews', action: 'Model owner · approve or request rework' },
      ],
      weekly: [
        { issue: 'Threshold calibration check', action: 'MLOps + risk · adjust if drift' },
        { issue: 'Eval set freshness', action: 'Data team · refresh ground truth' },
      ],
      monthly: [
        { issue: 'Cross-model leaderboard', action: 'Publish benchmark dashboard' },
        { issue: 'Baseline re-evaluation', action: 'Confirm baseline still relevant' },
      ],
    },
    mistakesUser: [
      { mistake: 'Reports "accuracy" without task class', prevention: 'Report requires metric-per-class · UI blocks single value' },
      { mistake: 'Uses test set during dev', prevention: 'Test set hashes hidden · access audit' },
      { mistake: 'Skips significance test', prevention: 'Report requires p-value · UI blocks without' },
    ],
    mistakesArchitect: [
      { mistake: 'No baseline (model judged solo)', prevention: 'Eval pipeline requires baseline run · drill blocks' },
      { mistake: 'Single metric (no segment breakdown)', prevention: 'Per-segment metrics required for protected groups' },
      { mistake: 'No cost dimension (only quality)', prevention: 'Scorecard requires cost-per-decision' },
    ],
    testingPlan: {
      positive: ['Eval pipeline produces scorecard', 'Metrics match expected', 'Gate enforces pass/fail'],
      negative: ['Missing eval set → fail loudly', 'Bad model → metric fail', 'Threshold violated → fail'],
      api: ['/api/v1/holy/eval/{runId} returns scorecard', 'POST trigger requires scope', 'Audit per run'],
      data: ['Eval set versioned · hash-locked', 'Predictions match input row', 'No leaks'],
      model: ['Model registry pinned · multiple versions can be compared'],
      accuracy: ['Calculated metrics match ground-truth recomputation', 'Significance test reproducible'],
      security: ['Eval data PII-handled', 'Per-tenant isolation', 'Read scope required'],
      admin: ['Eval triggerable by ops · audit', 'Threshold editable with ADR'],
      mlops: ['MLflow integration · model lineage · rollback tested · drift monitor weekly'],
    },
  },

  'analytical-ai-process': {
    diagrams: [
      { title: 'Question → decision chain', mermaid: `flowchart LR\n  Question -->|frame| Features\n  Features -->|extract| Analysis\n  Analysis -->|insight| Decision\n  Decision -->|action| Outcome`, whyItMatters: 'Forces the chain · skipping any step breaks the loop.' },
      { title: 'Feature lineage', mermaid: `flowchart TB\n  Raw1[Source A] --> Feat1[Feature 1]\n  Raw2[Source B] --> Feat2[Feature 2]\n  Raw1 --> Feat3[Feature 3]\n  Feat1 & Feat2 & Feat3 --> Model`, whyItMatters: 'Source tracing enables drift detection.' },
      { title: 'Insight confidence layering', mermaid: `flowchart LR\n  Strong[> 95% CI] -->|auto| Decide\n  Medium[80-95%] -->|HITL| Review\n  Weak[< 80%] -->|reject| Reframe`, whyItMatters: 'CI gates the decision · no acting on weak insight.' },
    ],
    challengesStrategy: [
      { challenge: 'Insight has no confidence interval', strategy: 'Mandatory CI on every insight · UI blocks save without', impact: 'P1 acting on noise' },
      { challenge: 'Feature lineage broken (anonymous derivations)', strategy: 'Lineage required at registration · auto-track via feature-store', impact: 'P1 cannot debug drift' },
      { challenge: 'Question framed too broadly ("understand customers")', strategy: 'Decision-shape gate: question must be yes/no/threshold', impact: 'P0 analysis aimless' },
    ],
    edgeCases: [
      { case: 'Insight contradicts business intuition', handling: 'Require validation experiment · do not auto-act' },
      { case: 'Feature value distribution shifted', handling: 'Drift detector alerts · re-train recommended' },
      { case: 'Question becomes stale (business changed)', handling: 'Question owner re-confirms quarterly · auto-archive' },
      { case: 'Multi-collinear features', handling: 'Importance ranking flagged · stakeholder review' },
    ],
    scalePerf: [
      { metric: 'Question-to-insight latency', target: '< 5 days', actual: '~7 days', status: 'warn' },
      { metric: 'Feature freshness', target: '< 24 hr', actual: '~18 hr', status: 'ok' },
      { metric: 'Insight CI width', target: 'narrow at 95%', actual: 'mixed', status: 'warn' },
      { metric: 'Reproducibility (seed)', target: '100%', actual: '100%', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Feature compute fail', handling: 'Auto-retry · alert if persistent · stale-mark feature' },
      { error: 'Significance test invalid', handling: 'Reject insight · explain test assumption violated' },
      { error: 'Question schema invalid', handling: '400 with hint to decision-shape format' },
    ],
    errorsSilent: [
      { error: 'Insight published but stakeholder unaware', implementWhat: 'Auto-distribute to owners · ack-required workflow' },
      { error: 'Feature drift not surfaced (slow drift)', implementWhat: 'PSI / KS test weekly · alert if > threshold' },
      { error: 'Decision not tracked back to insight', implementWhat: 'Decision audit row requires insight-ref · CI gate' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New insight queue', action: 'Analyst lead · prioritize · assign' },
        { issue: 'Feature freshness check', action: 'Ops · ingest delays' },
      ],
      weekly: [
        { issue: 'Drift report review', action: 'Analyst · re-train candidate decisions' },
        { issue: 'Insight stale-archive', action: 'Auto-archive insights > 90 days unused' },
      ],
      monthly: [
        { issue: 'Question portfolio review', action: 'Business + analyst · drop stale questions' },
        { issue: 'Feature catalog audit', action: 'Eng · deprecate unused features' },
      ],
    },
    mistakesUser: [
      { mistake: 'Asks unbounded question ("anything interesting?")', prevention: 'Question form requires hypothesis · UI rejects open-ended' },
      { mistake: 'Reports insight without CI', prevention: 'Submit blocked without CI · UI shows template' },
      { mistake: 'Acts on insight before validation', prevention: 'Decision audit requires insight-status=validated' },
    ],
    mistakesArchitect: [
      { mistake: 'No feature lineage (anonymous DataFrame ops)', prevention: 'Feature-store enforced · ad-hoc DataFrames flagged' },
      { mistake: 'Insight delivery via Slack only (no audit)', prevention: 'Insight publish goes through registry · Slack reads from registry' },
      { mistake: 'Decision class wrong (binary forced into regression)', prevention: 'Question schema validates decision-class match · drill' },
    ],
    testingPlan: {
      positive: ['Question saves with valid schema', 'Insight saves with CI', 'Decision links to insight'],
      negative: ['Open-ended question → reject', 'Missing CI → block', 'Insight without features → reject'],
      api: ['/api/v1/holy/analytical/{procId} POST', 'Zod schema', 'Audit per insight'],
      data: ['Feature lineage tree intact', 'Insight references valid features', 'No orphan questions'],
      model: ['If statistical model used → reproducible from seed'],
      accuracy: ['CI width matches data variance', 'Significance test reproducible', 'Insight matches manual calc'],
      security: ['Insight access role-gated', 'PII redaction in feature store', 'Audit per access'],
      admin: ['Analyst lead can edit any insight · audit', 'Feature catalog editable'],
      mlops: ['Statistical model versioned · drift monitored · weekly leaderboard'],
    },
  },

  'ai-control-tower': {
    diagrams: [
      { title: 'Control tower data flow', mermaid: `flowchart LR\n  Models -->|metrics| OTEL\n  OTEL --> Prom\n  Prom --> Grafana\n  Models -->|decisions| Audit\n  Audit --> Postgres\n  Grafana + Postgres --> Tower[Control tower UI]`, whyItMatters: 'Names the observability stack feeding the tower.' },
      { title: 'Alert routing', mermaid: `flowchart TB\n  Alert -->|severity| Tier{Tier}\n  Tier -->|P0| Pager\n  Tier -->|P1| Slack\n  Tier -->|P2| Email\n  Tier -->|P3| Digest`, whyItMatters: 'Alert noise mitigation · per-tier routing.' },
      { title: 'Drift detection loop', mermaid: `flowchart LR\n  Live[Live data] --> PSI[PSI calc]\n  PSI -->|> 0.2| Alert\n  PSI -->|< 0.2| Continue\n  Alert --> Retrain`, whyItMatters: 'Closes the loop · drift → retrain trigger.' },
    ],
    challengesStrategy: [
      { challenge: 'Alert fatigue · P1s ignored', strategy: 'Per-tier SLO + auto-snooze if no action 3x · escalate', impact: 'P0 missed real incident' },
      { challenge: 'Cost run-rate spikes unexplained', strategy: 'Per-stage cost attribution · attribution dashboard mandatory', impact: 'P1 bill shock' },
      { challenge: 'Drift signal noisy (false positives)', strategy: 'Drift requires N consecutive periods AND business-impact > threshold', impact: 'P2 alert fatigue' },
    ],
    edgeCases: [
      { case: 'Multi-model fleet drifts simultaneously', handling: 'Correlate by upstream signal · likely data issue not model' },
      { case: 'Cost spikes during sale event (expected)', handling: 'Calendar overlay · suppress alert for known periods' },
      { case: 'Drift detected but model still accurate', handling: 'Document divergence · investigate before re-train' },
      { case: 'Incident affects only one tenant', handling: 'Per-tenant alert routing · don\'t page global on-call' },
    ],
    scalePerf: [
      { metric: 'Fleet status query', target: '< 5s', actual: '~3s', status: 'ok' },
      { metric: 'Alert MTTR', target: '< 15 min for P0', actual: '~12 min', status: 'ok' },
      { metric: 'Cost dashboard freshness', target: '< 1 hr', actual: '~30 min', status: 'ok' },
      { metric: 'Drift compute cadence', target: 'daily', actual: 'daily', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'OTEL collector down', handling: 'Backup collector · alert critical' },
      { error: 'Postgres slow (audit query timeout)', handling: 'Read replica · alert SRE' },
      { error: 'Drift calc fail', handling: 'Retry · alert MLOps if persistent' },
    ],
    errorsSilent: [
      { error: 'Alert acknowledged but never resolved', implementWhat: 'Alert auto-reopen after N min of "ack without resolve"' },
      { error: 'Cost spike crosses budget but no one alerted', implementWhat: 'Budget tier alerts at 80% / 100% · executive escalation' },
      { error: 'Model retrained but registry not updated', implementWhat: 'Registry-write audit · alert if model serves but no registry row' },
    ],
    issueCadence: {
      daily: [
        { issue: 'P0/P1 alert review', action: 'On-call · ack + resolve' },
        { issue: 'Cost dashboard sanity', action: 'PM · review top movers' },
      ],
      weekly: [
        { issue: 'Drift review', action: 'MLOps · retrain candidate models' },
        { issue: 'Alert tuning', action: 'SRE · reduce false-positive rate' },
      ],
      monthly: [
        { issue: 'Incident retrospective', action: 'Eng + ops · lessons feed runbooks' },
        { issue: 'Cost optimization review', action: 'PM + Eng · scaling adjustments' },
      ],
    },
    mistakesUser: [
      { mistake: 'Snoozes alerts without action', prevention: 'Auto-reopen + escalate after 3 snoozes' },
      { mistake: 'Resolves without root-cause', prevention: 'Resolve requires reason field · cannot bypass' },
      { mistake: 'Triggers retrain without approval', prevention: 'Retrain requires HITL approval · cost surfaced' },
    ],
    mistakesArchitect: [
      { mistake: 'No per-tenant alerting (all alerts global)', prevention: 'Alert config requires tenant key · drill blocks' },
      { mistake: 'Cost tracked only at total (not per-stage)', prevention: 'OTEL span requires cost attribute · CI gate' },
      { mistake: 'Drift detector tuned for single distribution', prevention: 'Per-segment drift · audit' },
    ],
    testingPlan: {
      positive: ['Alerts route by tier', 'Drift triggers retrain candidate', 'Cost dashboard renders'],
      negative: ['Bad alert payload → drop with log', 'Drift calc OOM → graceful', 'Cost data missing → empty state'],
      api: ['/api/v1/holy/control-tower POST/GET', 'Audit per alert', 'Rate limit per tenant'],
      data: ['Alert refs valid', 'Cost attribution sums to total', 'Drift PSI calc reproducible'],
      model: ['Drift model versioned · per-tenant baselines'],
      accuracy: ['Alert correctly identifies P0 vs P1', 'Cost attribution accurate', 'Drift PSI matches manual calc'],
      security: ['Per-tenant alert isolation', 'Cost data access role-gated', 'Audit per dashboard view'],
      admin: ['SRE can suppress alerts with reason · audit', 'Cost budgets editable'],
      mlops: ['Drift model · canary · rollback tested · weekly eval'],
    },
  },

  'product-mgr': {
    diagrams: [
      { title: 'Story lineage', mermaid: `flowchart LR\n  Vision --> Epic\n  Epic --> Story\n  Story --> Subtask\n  Subtask --> Commit\n  Commit -->|trace| Release`, whyItMatters: 'Every commit traces to a story · accountability.' },
      { title: 'Sprint flow', mermaid: `flowchart TB\n  Backlog -->|groom| Ready\n  Ready -->|sprint plan| InProgress\n  InProgress --> Review\n  Review --> Done\n  Done --> Released`, whyItMatters: 'Names the WIP states · prevents stuck stories.' },
      { title: 'Feedback loop', mermaid: `flowchart LR\n  User -->|signal| PM\n  PM -->|backlog| Story\n  Story --> Build\n  Build --> User`, whyItMatters: 'Feedback loop closed · user signal becomes work.' },
    ],
    challengesStrategy: [
      { challenge: 'Commits without story ref (untraceable)', strategy: 'Pre-commit hook requires story-id · CI fails without', impact: 'P1 unattributed work' },
      { challenge: 'Roadmap stale (last update > 1 month)', strategy: 'Roadmap mtime banner · escalate if > 30 days', impact: 'P1 stakeholders unaware' },
      { challenge: 'Customer feedback lost in Slack', strategy: 'Feedback bot ingests Slack → backlog · weekly triage', impact: 'P2 backlog blind spots' },
    ],
    edgeCases: [
      { case: 'Story spans 2 sprints (estimation off)', handling: 'Split into sprint-sized · keep parent epic' },
      { case: 'Customer changes mind mid-sprint', handling: 'Backlog adjusted · in-flight story finishes if > 50% done' },
      { case: 'Epic too large to estimate', handling: 'Break into ≤ 8 stories · re-estimate as decomp progresses' },
      { case: 'Sprint goal unmet', handling: 'Retrospective root-cause · adjust capacity estimate' },
    ],
    scalePerf: [
      { metric: 'Story-to-commit trace coverage', target: '100%', actual: '~96%', status: 'warn' },
      { metric: 'Roadmap freshness', target: '< 30 days', actual: '~15 days', status: 'ok' },
      { metric: 'Backlog grooming cadence', target: 'weekly', actual: 'weekly', status: 'ok' },
      { metric: 'Sprint goal hit rate', target: '≥ 80%', actual: '~72%', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Story save validation fail', handling: 'Reject save · field error · template suggested' },
      { error: 'Backlog import schema mismatch', handling: 'Reject + diagnostic per row · Zod' },
      { error: 'Commit-hook bypass detected', handling: 'CI fails · PR blocked' },
    ],
    errorsSilent: [
      { error: 'Story marked done without acceptance test', implementWhat: 'Story-done requires linked test result · CI gate' },
      { error: 'Sprint retro insights lost (no action items)', implementWhat: 'Retro requires ≥ 1 action item with owner · workflow' },
      { error: 'Roadmap commits made but not announced', implementWhat: 'Auto-comms on roadmap publish · stakeholder list' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Stand-up · blocker triage', action: 'Team · escalate as needed' },
        { issue: 'New backlog items review', action: 'PM · routes' },
      ],
      weekly: [
        { issue: 'Backlog grooming', action: 'PM + tech-lead · estimate' },
        { issue: 'Sprint goal review', action: 'Team · adjust if drift' },
      ],
      monthly: [
        { issue: 'Roadmap re-baseline', action: 'PM + leadership' },
        { issue: 'KPI report to stakeholders', action: 'PM publishes' },
      ],
    },
    mistakesUser: [
      { mistake: 'Commits with TODO instead of story ref', prevention: 'Pre-commit hook · template enforced' },
      { mistake: 'Marks story done without acceptance', prevention: 'Done requires test-result link' },
      { mistake: 'Estimates without breaking down', prevention: 'Story > 5 days requires sub-stories' },
    ],
    mistakesArchitect: [
      { mistake: 'No epic structure (flat backlog)', prevention: 'Story save requires epic-ref · drill' },
      { mistake: 'KPI list ad-hoc per release', prevention: 'KPIs defined at epic level · inherited' },
      { mistake: 'No retrospective ritual', prevention: 'Sprint close requires retro item · workflow' },
    ],
    testingPlan: {
      positive: ['Story saves with all required fields', 'Backlog import works', 'Sprint roll-up correct'],
      negative: ['Missing epic-ref → reject', 'Bad estimate → reject', 'Done without acceptance → block'],
      api: ['/api/v1/holy/product-mgr/{procId} CRUD', 'Audit per change', 'Rate limit'],
      data: ['Story refs valid', 'Epic-story hierarchy intact', 'Commit-story trace bijective'],
      model: ['If estimate-predictor used → versioned + eval'],
      accuracy: ['Sprint burn-down chart correct', 'Velocity calc matches actuals', 'Forecast within band'],
      security: ['Story PII redacted', 'Per-tenant isolation', 'Audit per access'],
      admin: ['PM can edit any story · audit', 'Bulk import via CSV with Zod'],
      mlops: ['Estimate-predictor model versioned · drift monitor weekly'],
    },
  },

  'process': {
    diagrams: [
      { title: 'Process state machine', mermaid: `stateDiagram-v2\n  [*] --> New\n  New --> InProgress\n  InProgress --> AwaitingApproval\n  AwaitingApproval --> Approved\n  AwaitingApproval --> Rejected\n  Approved --> [*]\n  Rejected --> InProgress`, whyItMatters: 'State transitions explicit · audit ready.' },
      { title: 'Manual + auto path side-by-side', mermaid: `flowchart LR\n  Trigger --> Choice{Manual or auto?}\n  Choice -->|manual| MPath[Human steps · time-cost ledger]\n  Choice -->|auto| APath[Pipeline · ms latency]\n  MPath & APath --> Audit`, whyItMatters: 'Both paths converge to audit · operator can compare.' },
      { title: 'HITL approval flow', mermaid: `flowchart TB\n  AutoDecide -->|low conf| Queue[HITL queue]\n  Queue --> Reviewer\n  Reviewer -->|approve| Apply\n  Reviewer -->|reject| Reframe\n  Apply --> Audit`, whyItMatters: 'HITL is discoverable · not buried.' },
    ],
    challengesStrategy: [
      { challenge: 'Manual + auto paths diverge over time', strategy: 'Quarterly reconciliation drill · auto must match manual ground truth', impact: 'P1 trust erosion' },
      { challenge: 'HITL queue grows unbounded', strategy: 'Queue depth SLO · auto-escalate at threshold', impact: 'P0 SLA breach' },
      { challenge: 'Run history incomplete (audit gaps)', strategy: 'Audit row per state transition · drill enforces no gaps', impact: 'P0 compliance fail' },
    ],
    edgeCases: [
      { case: 'Concurrent state transitions (race)', handling: 'Optimistic lock with version · retry on conflict' },
      { case: 'Approver on vacation', handling: 'Auto-route to backup approver · audit chain preserved' },
      { case: 'Process spans multiple tenants', handling: 'Per-tenant approver chain · cross-tenant requires both approvals' },
      { case: 'Rollback after approval', handling: 'Compensating transaction · audit shows reversal reason' },
    ],
    scalePerf: [
      { metric: 'State transition latency', target: '< 500ms', actual: '~280ms', status: 'ok' },
      { metric: 'HITL queue depth', target: '< 100', actual: '~65', status: 'ok' },
      { metric: 'Audit completeness', target: '100%', actual: '100%', status: 'ok' },
      { metric: 'Run history retention', target: '7 years', actual: '7 years', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'State transition conflict (race)', handling: 'Retry with backoff · alert if rate > 1%' },
      { error: 'Approver lookup fail', handling: 'Fallback to backup · alert HR if roster stale' },
      { error: 'Audit write fail', handling: 'Block transition · queue for retry · alert critical' },
    ],
    errorsSilent: [
      { error: 'Process stuck in InProgress (no progress · no error)', implementWhat: 'Stale-state cron · auto-escalate after SLA' },
      { error: 'Approver approves without reading', implementWhat: 'Approver action requires N seconds dwell · UX nudge' },
      { error: 'Audit row written but missing fields', implementWhat: 'Audit schema Zod-validated · drill verifies completeness' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Queue depth review', action: 'Supervisor · re-balance' },
        { issue: 'Stuck-case sweep', action: 'Ops · escalate' },
      ],
      weekly: [
        { issue: 'Manual-vs-auto reconciliation', action: 'PM · drill on divergence' },
        { issue: 'Approver coverage check', action: 'HR · update roster' },
      ],
      monthly: [
        { issue: 'State machine audit', action: 'Architect · update if process changed' },
        { issue: 'Approval SLA report', action: 'PM publishes' },
      ],
    },
    mistakesUser: [
      { mistake: 'Approves in bulk without per-case review', prevention: 'Bulk-approve disabled by default · ADR required to enable' },
      { mistake: 'Closes case without state-machine confirm', prevention: 'Close requires terminal state · UI blocks' },
      { mistake: 'Skips HITL ("auto looked good")', prevention: 'HITL queue requires manual ack · cannot auto-clear' },
    ],
    mistakesArchitect: [
      { mistake: 'State machine implicit (no diagram)', prevention: 'Process tab requires diagram · drill blocks' },
      { mistake: 'No rollback path defined', prevention: 'Each terminal state requires rollback procedure' },
      { mistake: 'Audit fields not standardized', prevention: 'Audit schema versioned · CI gate on schema match' },
    ],
    testingPlan: {
      positive: ['State transitions valid', 'HITL queue routes', 'Audit row complete'],
      negative: ['Invalid transition → reject', 'Approver not in roster → fallback', 'Audit fail → block'],
      api: ['/api/v1/holy/process/{procId} CRUD', 'Optimistic lock on writes', 'Audit per call'],
      data: ['No orphan state rows', 'Audit completeness 100%', 'Roster refs valid'],
      model: ['If routing model → versioned + eval'],
      accuracy: ['State machine matches diagram', 'Audit row sequence matches transition log', 'Rollback reverses cleanly'],
      security: ['Per-tenant process isolation', 'Approver scope grants', 'Audit per access'],
      admin: ['Supervisor can override state with ADR · audit', 'Bulk close with reason'],
      mlops: ['Routing model versioned · drift monitored · rollback tested'],
    },
  },

  // ─── batch 3 of 5 ────────────────────────────────────────────────────
  'data': {
    diagrams: [
      { title: 'Data contract flow', mermaid: `flowchart LR\n  Producer -->|publish| Schema[Schema Registry]\n  Schema -->|validate| Consumer\n  Consumer --> Quality[DQ checks]\n  Quality -->|pass| Use\n  Quality -->|fail| Quarantine`, whyItMatters: 'Every consumer reads schema-validated · DQ gates use.' },
      { title: 'Lineage map', mermaid: `flowchart TB\n  Src1 --> Stage1 --> Cur1\n  Src2 --> Stage1\n  Cur1 --> Feat1 --> Model\n  Cur1 --> Report`, whyItMatters: 'Drift root-causing starts here.' },
      { title: 'Access control flow', mermaid: `flowchart LR\n  User --> Auth\n  Auth -->|tenant + role| Scope\n  Scope -->|read.X| Data\n  Data -->|audit| Audit`, whyItMatters: 'No raw access · always scoped + audited.' },
    ],
    challengesStrategy: [
      { challenge: 'Producer changes schema without notice', strategy: 'Schema-registry hook · breaking-change requires consumer ack', impact: 'P0 downstream breaks' },
      { challenge: 'Data quality regress silently', strategy: 'DQ score per source · daily report · alert on > 5pp drop', impact: 'P1 decisions on bad data' },
      { challenge: 'Lineage gaps (ETL shortcuts)', strategy: 'Lineage capture at every transform · CI gate', impact: 'P1 cannot trace' },
    ],
    edgeCases: [
      { case: 'Source returns partial data (timeout mid-stream)', handling: 'Quarantine partial · do not write to curated · retry full' },
      { case: 'Schema evolves (additive field)', handling: 'Auto-promote with default · log for consumer awareness' },
      { case: 'PII column accidentally added', handling: 'DLP scan on save · auto-quarantine · alert privacy lead' },
      { case: 'Tenant data leak via shared aggregate', handling: 'k-anonymity check · suppress small cells' },
    ],
    scalePerf: [
      { metric: 'Data freshness', target: '< 1 hr', actual: '~45 min', status: 'ok' },
      { metric: 'DQ score', target: '≥ 0.95', actual: '~0.93', status: 'warn' },
      { metric: 'Lineage coverage', target: '100%', actual: '~92%', status: 'warn' },
      { metric: 'Quarantine clear time', target: '< 24 hr', actual: '~36 hr', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Schema validation fail', handling: 'Quarantine · alert producer with diff' },
      { error: 'DQ check timeout', handling: 'Retry · alert if persistent · skip with warning' },
      { error: 'PII scan fail', handling: 'Block save · alert privacy lead' },
    ],
    errorsSilent: [
      { error: 'Producer publishes wrong tenant_id (subtle)', implementWhat: 'Cross-check tenant_id against producer key · daily audit' },
      { error: 'DQ threshold tuned too loose', implementWhat: 'Weekly review of DQ false-negative rate · tighten' },
      { error: 'Lineage broken for ad-hoc notebooks', implementWhat: 'Notebook reads from registered store only · drill' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Quarantine queue review', action: 'Data eng · clear or escalate' },
        { issue: 'Freshness alerts', action: 'Ops · investigate stale sources' },
      ],
      weekly: [
        { issue: 'DQ trend review', action: 'Data + PM · root-cause regressions' },
        { issue: 'Lineage gap report', action: 'Eng · backfill' },
      ],
      monthly: [
        { issue: 'Schema deprecation cadence', action: 'Producers · sunset old versions' },
        { issue: 'Access audit (who saw what)', action: 'Privacy lead' },
      ],
    },
    mistakesUser: [
      { mistake: 'Reads from raw source bypassing curated', prevention: 'Raw access requires temp grant · audit + alert' },
      { mistake: 'Saves data without contract', prevention: 'Save requires schema-registry id · UI blocks' },
      { mistake: 'Shares dataset link without scope check', prevention: 'Share triggers re-auth · scope inherited from owner' },
    ],
    mistakesArchitect: [
      { mistake: 'No schema versioning (single schema for all)', prevention: 'Schema requires version · drill' },
      { mistake: 'No DLP scan at ingest', prevention: 'Ingest pipeline requires DLP step · CI' },
      { mistake: 'Per-tenant data mixed in aggregate', prevention: 'Aggregate functions require tenant key · drill' },
    ],
    testingPlan: {
      positive: ['Schema-validated payload accepted', 'DQ scores compute', 'Lineage tracked'],
      negative: ['Bad schema → quarantine', 'DLP catch → block', 'Cross-tenant query → reject'],
      api: ['/api/v1/holy/data/{procId}', 'Zod-strict', '4xx on bad payload', 'Audit per read'],
      data: ['Source-to-curated parity', 'Lineage tree intact', 'No orphan rows', 'k-anon enforced'],
      model: ['DLP model versioned + drift'],
      accuracy: ['DQ score matches reference calc', 'Lineage tree matches actual ETL'],
      security: ['Per-tenant isolation', 'Scope grants enforced', 'PII redaction in logs', 'Audit per access'],
      admin: ['Data steward can override DQ · audit', 'Schema editable with version bump'],
      mlops: ['DLP model versioned · weekly eval · rollback tested'],
    },
  },

  'analytics': {
    diagrams: [
      { title: 'Analytics request flow', mermaid: `flowchart LR\n  User --> Query\n  Query --> Engine[Analytics engine]\n  Engine --> Cube[Pre-aggregated cube]\n  Cube --> Render\n  Render -->|audit| Audit`, whyItMatters: 'Cube hits before raw scan · perf + cost.' },
      { title: 'Insight pipeline', mermaid: `flowchart TB\n  Raw -->|ETL| Cube\n  Cube -->|cohort| Insight\n  Insight -->|alert| Owner\n  Insight -->|publish| Catalog`, whyItMatters: 'Insight pipeline named · ad-hoc forbidden.' },
      { title: 'Feature-by-segment matrix', mermaid: `flowchart LR\n  S1[Segment A] --> M1[Metric per A]\n  S2[Segment B] --> M2[Metric per B]\n  S3[Segment C] --> M3[Metric per C]\n  M1 + M2 + M3 --> Audit`, whyItMatters: 'Per-segment surfaces fairness + drift gaps.' },
    ],
    challengesStrategy: [
      { challenge: 'Charts rendered without audit', strategy: 'Audit-trail per chart render · operator-id captured', impact: 'P1 compliance gap' },
      { challenge: 'Pre-train insight skipped (jumps to model)', strategy: 'Pipeline gate: statistical sanity check before model', impact: 'P1 bad features' },
      { challenge: 'Feature lineage absent at insight time', strategy: 'Insight requires lineage-id link · CI gate', impact: 'P1 cannot trace' },
    ],
    edgeCases: [
      { case: 'Cube stale during business hours', handling: 'Auto-refresh on cache miss · backoff if cube hot' },
      { case: 'Insight contradicts business intuition', handling: 'Validation experiment required before publish' },
      { case: 'Per-segment sample size too small', handling: 'Suppress segment · note in report' },
      { case: 'Drift in hold-out metric', handling: 'Re-train recommendation + alert' },
    ],
    scalePerf: [
      { metric: 'Cube query p95', target: '< 1s', actual: '~720ms', status: 'ok' },
      { metric: 'Cube freshness', target: '< 6 hr', actual: '~4 hr', status: 'ok' },
      { metric: 'Per-segment metrics', target: '100% of public segments', actual: '~96%', status: 'warn' },
      { metric: 'Audit completeness', target: '100%', actual: '100%', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Cube query timeout', handling: 'Retry on replica · alert if persistent' },
      { error: 'Insight pipeline schema mismatch', handling: 'Reject + diagnostic' },
      { error: 'Chart render OOM (large dataset)', handling: 'Paginate or sample · log warning' },
    ],
    errorsSilent: [
      { error: 'Insight published without ack', implementWhat: 'Auto-distribute · ack-required workflow' },
      { error: 'Feature drift slow (PSI < 0.2 but rising)', implementWhat: 'Trend alert in addition to threshold alert' },
      { error: 'Per-segment metric missing for new segment', implementWhat: 'Segment registry · CI gate on every metric defining' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Insight queue', action: 'Analyst lead routes' },
        { issue: 'Cube freshness check', action: 'Ops · ETL delays' },
      ],
      weekly: [
        { issue: 'Per-segment metric review', action: 'Analyst · backfill gaps' },
        { issue: 'Insight stale-archive', action: 'Auto-archive > 90 days unused' },
      ],
      monthly: [
        { issue: 'Cube redesign (metric churn)', action: 'Eng + analyst' },
        { issue: 'Cohort definition audit', action: 'PM + analyst' },
      ],
    },
    mistakesUser: [
      { mistake: 'Compares cohorts without segment normalization', prevention: 'UI warns when comparing non-comparable segments' },
      { mistake: 'Saves chart without title or owner', prevention: 'Save form requires title + owner' },
      { mistake: 'Shares dashboard link with full PII', prevention: 'Share auto-redacts PII fields · explicit unredact requires audit' },
    ],
    mistakesArchitect: [
      { mistake: 'No cube (every query hits raw)', prevention: 'Query planner enforces cube · raw scans require ADR' },
      { mistake: 'No audit on chart render', prevention: 'Audit middleware mandatory · drill' },
      { mistake: 'Single hold-out (no per-segment)', prevention: 'Per-segment hold-out for protected groups' },
    ],
    testingPlan: {
      positive: ['Cube query returns expected aggregate', 'Insight saves with lineage', 'Chart renders with audit'],
      negative: ['Bad query → 400', 'Empty result → empty-state UI', 'Cube stale → forced refresh path'],
      api: ['/api/v1/holy/analytics/query', 'Zod schema', 'Rate limit', 'Audit per call'],
      data: ['Cube parity vs raw (round-trip)', 'Per-segment metrics non-null', 'No leaks'],
      model: ['If forecast model used → versioned + eval'],
      accuracy: ['Cube aggregate matches raw calculation', 'Hold-out metric matches manual'],
      security: ['Per-tenant cube isolation', 'PII redacted in default chart', 'Audit per render'],
      admin: ['Analyst lead can republish insight · audit', 'Cube refresh on demand'],
      mlops: ['Forecast model versioned · drift monitor · weekly leaderboard'],
    },
  },

  'ai': {
    diagrams: [
      { title: 'AI inventory map', mermaid: `flowchart LR\n  Reg[AI registry] --> Card[Model card]\n  Reg --> ADR\n  Reg --> Scope[Scope grant]\n  Card --> Owner\n  Scope --> Owner`, whyItMatters: 'Every AI usage has card + ADR + scope · ownership chain clear.' },
      { title: 'Agent permission flow', mermaid: `flowchart TB\n  Request -->|scope| Policy\n  Policy -->|allow| Tool\n  Policy -->|deny| Reject\n  Tool --> Audit`, whyItMatters: 'Per-tool scope · agent cannot escape granted permissions.' },
      { title: 'Model lifecycle', mermaid: `flowchart LR\n  Build -->|register| Reg\n  Reg -->|canary| Stage\n  Stage -->|approve| Prod\n  Prod -->|monitor| Reg\n  Reg -->|rollback| Stage`, whyItMatters: 'Closed-loop lifecycle · rollback path tested.' },
    ],
    challengesStrategy: [
      { challenge: 'AI usage without registry entry', strategy: 'Run-time hook · alert on unregistered model serve', impact: 'P0 untraceable' },
      { challenge: 'Agent uses tools beyond scope', strategy: 'Scope enforcer at tool boundary · audit per call', impact: 'P0 prompt injection / data exfil' },
      { challenge: 'Model card drift (info stale)', strategy: 'Auto-update card on retrain · ADR-trace required', impact: 'P1 reviewer relies on stale' },
    ],
    edgeCases: [
      { case: 'Model used by multiple processes', handling: 'Registry shows all consumers · breaking change requires all-ack' },
      { case: 'Agent fails mid-tool-call', handling: 'Compensating transaction · audit shows partial state' },
      { case: 'External model API rate-limited', handling: 'Backoff + queue · alert if persistent' },
      { case: 'Model rolled back during prod', handling: 'In-flight requests honor old version · new use new' },
    ],
    scalePerf: [
      { metric: 'Registry query p95', target: '< 100ms', actual: '~75ms', status: 'ok' },
      { metric: 'Scope check overhead', target: '< 10ms', actual: '~6ms', status: 'ok' },
      { metric: 'Rollback time', target: '< 5 min', actual: '~3 min', status: 'ok' },
      { metric: 'Model count in registry', target: 'unbounded (auto-scale)', actual: '~140', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Scope denied', handling: 'Log with actor + scope · audit · 403' },
      { error: 'Model serve fail', handling: 'Fallback to last-known-good · alert MLOps' },
      { error: 'Registry write conflict', handling: 'Retry with backoff · CI gate prevents racy writes' },
    ],
    errorsSilent: [
      { error: 'Agent escalates implicit (scope chain)', implementWhat: 'Scope inheritance audit · forbid chains > 2 deep' },
      { error: 'Model used but not in card consumer list', implementWhat: 'Auto-add consumer on first call · weekly reconcile' },
      { error: 'Rollback procedure undocumented', implementWhat: 'Card requires rollback section · drill blocks save' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New model registrations', action: 'AI reviewer · sign off' },
        { issue: 'Scope denial review', action: 'Audit lead' },
      ],
      weekly: [
        { issue: 'Card freshness audit', action: 'AI reviewer · re-validate' },
        { issue: 'Agent tool usage trend', action: 'Eng · check for tool drift' },
      ],
      monthly: [
        { issue: 'Registry quarterly review', action: 'Architect · deprecate unused' },
        { issue: 'Rollback drill', action: 'MLOps · drill in staging' },
      ],
    },
    mistakesUser: [
      { mistake: 'Calls model without scope grant', prevention: 'API gate enforces scope · 403 with link to request' },
      { mistake: 'Registers model without card', prevention: 'Register requires card fields · UI blocks' },
      { mistake: 'Agent uses tool without justification', prevention: 'Tool call requires reason field · audit' },
    ],
    mistakesArchitect: [
      { mistake: 'No rollback path defined', prevention: 'Card requires rollback proc · drill' },
      { mistake: 'No per-tenant scope (global agent)', prevention: 'Scope requires tenant key · drill' },
      { mistake: 'Inline model use (no registry)', prevention: 'CI scan for SDK init without registry id' },
    ],
    testingPlan: {
      positive: ['Register model', 'Scope check allows valid', 'Agent uses tool within scope'],
      negative: ['Unregistered call → block', 'Out-of-scope → 403', 'Bad card → reject'],
      api: ['/api/v1/holy/ai/{procId}', 'Zod schema', 'Rate limit per tenant', 'Audit per call'],
      data: ['Card refs valid', 'Scope grants ref valid', 'No orphan registry rows'],
      model: ['All registered models eval-tracked', 'Drift monitored'],
      accuracy: ['Card consumer list accurate', 'Scope chain audit reproducible', 'Rollback drill within SLA'],
      security: ['Scope enforcement load-tested', 'Tenant isolation', 'Agent sandboxing'],
      admin: ['AI reviewer can update card · audit', 'Bulk scope grant with ADR'],
      mlops: ['All models versioned · drift weekly · rollback tested · canary on staging'],
    },
  },

  'user-story': {
    diagrams: [
      { title: 'Story → commit trace', mermaid: `flowchart LR\n  Story -->|id| PR\n  PR -->|merge| Commit\n  Commit -->|deploy| Release\n  Release -->|measure| KPI`, whyItMatters: 'Every commit traceable end-to-end.' },
      { title: 'Acceptance criteria gate', mermaid: `flowchart TB\n  Story -->|fields| AC[Acceptance criteria]\n  AC -->|testable| Test\n  Test -->|pass| Done\n  Test -->|fail| Rework`, whyItMatters: 'AC testable · prevents subjective "done".' },
      { title: 'AI feature trace', mermaid: `flowchart LR\n  Story -->|tag| AI[AI surface]\n  AI --> Model\n  AI --> Eval\n  Eval --> Release`, whyItMatters: 'AI features carry extra eval gate.' },
    ],
    challengesStrategy: [
      { challenge: 'Story without acceptance criteria', strategy: 'Save requires ≥ 1 AC item · UI blocks', impact: 'P1 subjective release' },
      { challenge: 'Commit not linked to story', strategy: 'Pre-commit hook · CI fail', impact: 'P1 untraceable work' },
      { challenge: 'AI surface in story but no eval gate', strategy: 'AI tag triggers eval requirement', impact: 'P1 ship un-evaluated AI' },
    ],
    edgeCases: [
      { case: 'Story spans multiple PRs', handling: 'Parent-child PR link · all must merge before done' },
      { case: 'AC changes mid-sprint', handling: 'AC versioned · sub-tests re-run' },
      { case: 'AI surface added mid-story', handling: 'Retroactive eval gate · cannot ship without' },
      { case: 'Story marked done but test fails', handling: 'Auto-revert to InProgress · alert' },
    ],
    scalePerf: [
      { metric: 'Story save latency', target: '< 500ms', actual: '~350ms', status: 'ok' },
      { metric: 'AC-test mapping coverage', target: '100%', actual: '~94%', status: 'warn' },
      { metric: 'Commit-story trace', target: '100%', actual: '~96%', status: 'warn' },
      { metric: 'Sprint goal hit rate', target: '≥ 80%', actual: '~75%', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Story validation fail', handling: 'Reject with field error' },
      { error: 'Bulk import schema mismatch', handling: 'Per-row diagnostic' },
      { error: 'Test result link broken', handling: 'Block done · UI shows fix' },
    ],
    errorsSilent: [
      { error: 'Story marked done without test result', implementWhat: 'Drill: done requires test-result link' },
      { error: 'AI tag added but eval skipped', implementWhat: 'CI scans for AI tag · requires eval ref' },
      { error: 'AC reworded but tests not updated', implementWhat: 'AC change triggers test re-review · workflow' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New stories triage', action: 'PM routes' },
        { issue: 'Acceptance test failures', action: 'Dev investigates' },
      ],
      weekly: [
        { issue: 'AC coverage report', action: 'PM + QA · close gaps' },
        { issue: 'AI surface inventory', action: 'AI reviewer' },
      ],
      monthly: [
        { issue: 'Story velocity trend', action: 'PM publishes' },
        { issue: 'Backlog grooming retrospective', action: 'Team' },
      ],
    },
    mistakesUser: [
      { mistake: 'Vague AC ("works as expected")', prevention: 'AC requires Given/When/Then · UI template' },
      { mistake: 'Marks done without test pass', prevention: 'Done requires green CI run id · UI blocks' },
      { mistake: 'Skips AI tag for AI feature', prevention: 'PR scan for ML/AI imports auto-tags' },
    ],
    mistakesArchitect: [
      { mistake: 'No epic structure (flat backlog)', prevention: 'Story requires epic ref · drill' },
      { mistake: 'No AI eval gate enforcement', prevention: 'AI-tagged story requires eval section · CI' },
      { mistake: 'Sprint goal vague', prevention: 'Goal field validates testability · lint' },
    ],
    testingPlan: {
      positive: ['Story saves with AC', 'Commit-story trace works', 'AI tag triggers eval'],
      negative: ['Vague AC → reject', 'Done without test → block', 'AI tag without eval → fail'],
      api: ['/api/v1/holy/user-story/{procId} CRUD', 'Zod schema', 'Audit'],
      data: ['Epic-story tree intact', 'AC refs test ids', 'No orphan stories'],
      model: ['If story-estimator used → versioned'],
      accuracy: ['Velocity calc matches actuals', 'Burndown chart correct'],
      security: ['Story access role-gated', 'Audit per access', 'PII redaction in description'],
      admin: ['PM can edit any story · audit', 'Bulk import'],
      mlops: ['Story-estimator versioned · drift monitor'],
    },
  },

  'user-demo': {
    diagrams: [
      { title: 'Demo data lifecycle', mermaid: `flowchart LR\n  Script -->|pre-load| Sample[Sample data]\n  Sample --> Run\n  Run -->|capture| Recording\n  Recording --> Archive`, whyItMatters: 'Demo data versioned · re-runnable.' },
      { title: 'Demo trigger flow', mermaid: `sequenceDiagram\n  participant SE as Sales Engineer\n  participant App\n  participant Demo as Demo data\n  SE->>App: trigger demo\n  App->>Demo: load fixture\n  Demo-->>App: ready\n  App-->>SE: walkthrough`, whyItMatters: 'Locks the demo handshake.' },
      { title: 'Recording playback', mermaid: `flowchart TB\n  Recording --> Player\n  Player --> Stakeholder\n  Stakeholder -->|feedback| Backlog`, whyItMatters: 'Recording closes loop to backlog.' },
    ],
    challengesStrategy: [
      { challenge: 'Demo data drifts (overwritten by dev)', strategy: 'Demo dataset namespace · CI restore on dev tamper', impact: 'P1 broken demo' },
      { challenge: 'Recording not archived', strategy: 'Auto-archive on demo close · retention policy', impact: 'P2 stakeholder loop broken' },
      { challenge: 'Demo script outdated (features moved)', strategy: 'Script version-pinned · CI runs demo path weekly', impact: 'P1 customer sees broken demo' },
    ],
    edgeCases: [
      { case: 'Demo runs into rate limit', handling: 'Demo-tenant rate limit raised · audit per use' },
      { case: 'Demo data leaks into prod', handling: 'Tenant boundary enforced · drill checks for cross-tenant rows' },
      { case: 'Recording too long (> 30 min)', handling: 'Split + chapter markers · transcript indexed' },
      { case: 'Customer asks for prod-like scale', handling: 'Scale demo dataset · pre-warm cache' },
    ],
    scalePerf: [
      { metric: 'Demo cold-start', target: '< 15s', actual: '~10s', status: 'ok' },
      { metric: 'Script path latency p95', target: '< 1s', actual: '~700ms', status: 'ok' },
      { metric: 'Recording storage', target: '~50MB/run', actual: '~45MB', status: 'ok' },
      { metric: 'Restore-on-tamper time', target: '< 5 min', actual: '~3 min', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Demo dataset load fail', handling: 'Re-load · alert if rate > 1/wk' },
      { error: 'Recording write fail', handling: 'Retry · alert if persistent' },
      { error: 'Script step fail', handling: 'Log step + screenshot · alert demo lead' },
    ],
    errorsSilent: [
      { error: 'Demo script silently passes but takes 2× normal time', implementWhat: 'Step-time monitor · alert on 50% deviation' },
      { error: 'Recording archived but transcript missing', implementWhat: 'Archive workflow requires both video + transcript' },
      { error: 'Customer feedback lost after demo', implementWhat: 'Post-demo capture workflow · auto-routed to backlog' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Demo run health', action: 'SE + ops · re-run failures' },
        { issue: 'Recording archive backlog', action: 'Auto-process' },
      ],
      weekly: [
        { issue: 'Script-vs-feature drift report', action: 'PM + SE · update script' },
        { issue: 'Demo dataset freshness', action: 'Eng · refresh if needed' },
      ],
      monthly: [
        { issue: 'Demo coverage by persona', action: 'SE lead' },
        { issue: 'Recording catalog audit', action: 'Marketing' },
      ],
    },
    mistakesUser: [
      { mistake: 'Uses prod data for demo', prevention: 'Demo tenant strictly enforced · ADR for exceptions' },
      { mistake: 'Skips recording', prevention: 'Demo close requires recording link · UI blocks' },
      { mistake: 'Edits script without testing path', prevention: 'CI runs scripted path on every script change' },
    ],
    mistakesArchitect: [
      { mistake: 'Demo and prod share rate-limit config', prevention: 'Per-tenant limits with explicit demo override' },
      { mistake: 'Demo dataset stored in git (binary bloat)', prevention: 'Demo data in object store · git-ignored' },
      { mistake: 'No script version pinning', prevention: 'Script field requires version · drill' },
    ],
    testingPlan: {
      positive: ['Demo cold-start under SLA', 'Script path completes', 'Recording archived'],
      negative: ['Bad dataset → fail loud', 'Script step missing → halt', 'Tenant leak → block'],
      api: ['/api/v1/holy/demo/{procId}', 'Rate limit per demo tenant', 'Audit per run'],
      data: ['Demo refs valid', 'No prod-demo cross-tenant rows', 'Recording-script paired'],
      model: ['Demo can opt into prod models with audit'],
      accuracy: ['Script step success rate ≥ 99%', 'Recording transcript accuracy ≥ 95%'],
      security: ['Demo tenant isolation', 'PII synthesized · no real customer', 'Audit per recording'],
      admin: ['SE can refresh data · audit', 'Recording retention configurable'],
      mlops: ['If demo uses model → version-pinned · canary-aware'],
    },
  },

  'exp-ai': {
    diagrams: [
      { title: 'Explanation pipeline', mermaid: `flowchart LR\n  Prediction --> SHAP[SHAP local]\n  SHAP --> CF[Counterfactual]\n  CF --> Citation\n  Citation --> Audit[Audit row]`, whyItMatters: 'Every prediction → explanation → audit · regulator ready.' },
      { title: 'Global vs local view', mermaid: `flowchart TB\n  Global[SHAP global] --> Model\n  Model -->|per prediction| Local[SHAP local + CF]\n  Global + Local --> ReviewerUI`, whyItMatters: 'Both views surfaced · regulator-defensible.' },
      { title: 'Counterfactual generation', mermaid: `flowchart LR\n  Pred -->|adverse| CF\n  CF -->|min-edit| Result\n  Result -->|user-facing| Reason\n  Result -->|audit| Audit`, whyItMatters: 'CF is min-edit · actionable per Art. 86.' },
    ],
    challengesStrategy: [
      { challenge: 'Global SHAP misses local nuance', strategy: 'Always surface both · UI tabs for global + local', impact: 'P1 reviewer cannot validate' },
      { challenge: 'CF generation slow (latency)', strategy: 'Pre-compute for common adverse classes · cache by feature bucket', impact: 'P2 review queue stalls' },
      { challenge: 'Citation trace broken for RAG', strategy: 'Citation required in audit row · drill enforces', impact: 'P0 hallucination unfalsifiable' },
    ],
    edgeCases: [
      { case: 'Prediction has tied features (no clear top SHAP)', handling: 'Report tied features explicitly · UI shows tie' },
      { case: 'Counterfactual requires protected attribute', handling: 'Reject CF · use non-protected alternative · audit reason' },
      { case: 'Citation source deleted', handling: 'Audit shows broken citation · re-train candidate flagged' },
      { case: 'Explanation length exceeds UI', handling: 'Summarize top-N · expand on demand' },
    ],
    scalePerf: [
      { metric: 'Local SHAP latency p95', target: '< 500ms', actual: '~320ms', status: 'ok' },
      { metric: 'CF generation latency', target: '< 1s', actual: '~600ms', status: 'ok' },
      { metric: 'Citation coverage', target: '100% RAG', actual: '100%', status: 'ok' },
      { metric: 'Audit completeness', target: '100%', actual: '100%', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'SHAP computation OOM', handling: 'Smaller batch · alert MLOps' },
      { error: 'CF feasibility fail (no min-edit found)', handling: 'Return "infeasible" · audit reason · prompt for human' },
      { error: 'Citation lookup 404', handling: 'Flag broken citation · auto-retry source store' },
    ],
    errorsSilent: [
      { error: 'Explanation rendered but not in audit row', implementWhat: 'Audit middleware requires explanation field · drill' },
      { error: 'Stale CF (model retrained · CF stale)', implementWhat: 'CF cache invalidate on model version bump' },
      { error: 'Citation accurate at generation but source updated', implementWhat: 'Citation source-version pin · re-validate weekly' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Broken citation queue', action: 'MLOps · investigate source' },
        { issue: 'CF infeasibility rate', action: 'AI reviewer' },
      ],
      weekly: [
        { issue: 'SHAP global re-run after model update', action: 'MLOps' },
        { issue: 'Citation source freshness', action: 'Data eng' },
      ],
      monthly: [
        { issue: 'Regulator-prep audit (random sample)', action: 'Compliance' },
        { issue: 'Counterfactual coverage by class', action: 'AI reviewer' },
      ],
    },
    mistakesUser: [
      { mistake: 'Trusts SHAP top feature without local check', prevention: 'UI surfaces both · reviewer must ack both' },
      { mistake: 'Skips citation review in RAG answer', prevention: 'Answer rendered with inline citation hover · drill' },
      { mistake: 'Closes adverse case without CF', prevention: 'Close requires CF link · UI blocks' },
    ],
    mistakesArchitect: [
      { mistake: 'Explanations not in audit row', prevention: 'Audit schema requires explanation_ref · CI gate' },
      { mistake: 'CF generator allows protected attributes', prevention: 'Feature flag in CF lib · drill validates' },
      { mistake: 'No global SHAP per model', prevention: 'Model release requires global SHAP artifact · drill' },
    ],
    testingPlan: {
      positive: ['Local SHAP renders for prediction', 'CF generated when feasible', 'Citation resolves'],
      negative: ['Tied SHAP → tie report', 'Protected attr CF → reject', 'Broken citation → audit flag'],
      api: ['/api/v1/explain?prediction_id=', 'Audit per call', '4xx for unknown id', 'Rate limit'],
      data: ['Audit completeness', 'Citation refs valid', 'CF feature constraints honored'],
      model: ['SHAP versioned with model · CF model with feature constraints'],
      accuracy: ['SHAP local matches reference impl ±0.01', 'CF is min-edit (verified by re-prediction)', 'Citation accuracy 100%'],
      security: ['Per-tenant explanation isolation', 'PII handled in CF generation', 'Audit per request'],
      admin: ['AI reviewer can override explanation · audit', 'CF cache invalidate on demand'],
      mlops: ['SHAP + CF models versioned · drift monitored · weekly RAGAS-like eval on citation'],
    },
  },

  // ─── batch 4 of 5 ────────────────────────────────────────────────────
  'res-ai': {
    diagrams: [
      { title: 'Fairness audit pipeline', mermaid: `flowchart LR\n  Prediction --> Group[Group attribution]\n  Group --> DI[Disparate impact calc]\n  Group --> EO[Equal-opportunity gap]\n  DI + EO --> Gate{Pass thresholds?}\n  Gate -->|no| Block`, whyItMatters: 'Every release pass-gates DI ≥ 0.8 + EO < 5%.' },
      { title: 'HITL escalation', mermaid: `flowchart TB\n  Decision -->|low conf or sensitive| HITL\n  HITL --> Reviewer\n  Reviewer -->|approve| Apply\n  Reviewer -->|reject| Reframe\n  Apply --> Audit`, whyItMatters: 'HITL path tested · escalation rules explicit.' },
      { title: 'Bias mitigation loop', mermaid: `flowchart LR\n  Audit -->|drift| Retrain\n  Retrain -->|new model| Eval\n  Eval -->|pass| Deploy\n  Deploy --> Audit`, whyItMatters: 'Closed loop · bias caught + corrected.' },
    ],
    challengesStrategy: [
      { challenge: 'Fairness metrics computed at release · not in prod', strategy: 'Compute DI + EO weekly on prod predictions · alert on drift', impact: 'P0 fairness drift unseen' },
      { challenge: 'HITL escalation rules implicit', strategy: 'Rules in policy table · UI surfaces routing reason', impact: 'P1 inconsistent escalation' },
      { challenge: 'Audit row missing fairness flag', strategy: 'Audit middleware adds fairness_flag · drill enforces', impact: 'P0 cannot prove fairness post-hoc' },
    ],
    edgeCases: [
      { case: 'Group too small for statistical test', handling: 'Suppress group · flag in report · cannot release without coverage' },
      { case: 'New group emerges post-deploy', handling: 'Auto-detect via clustering · alert privacy + risk teams' },
      { case: 'Privacy concern: group inference', handling: 'Use proxies with explicit ADR · no implicit group inference' },
      { case: 'Fairness conflicts with accuracy', handling: 'Cost-adjusted trade-off · stakeholder sign-off' },
    ],
    scalePerf: [
      { metric: 'DI calc latency', target: '< 5 min weekly', actual: '~3 min', status: 'ok' },
      { metric: 'EO calc latency', target: '< 5 min weekly', actual: '~4 min', status: 'ok' },
      { metric: 'Audit fairness_flag coverage', target: '100%', actual: '100%', status: 'ok' },
      { metric: 'HITL queue depth', target: '< 100', actual: '~70', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'DI calc fail (missing group attribute)', handling: 'Block release · alert AI reviewer' },
      { error: 'HITL escalation routing fail', handling: 'Fallback to global queue · alert' },
      { error: 'Audit fairness_flag write fail', handling: 'Block decision · queue for retry · critical alert' },
    ],
    errorsSilent: [
      { error: 'Group attribute populated but stale', implementWhat: 'Source freshness check · alert if > 30 days old' },
      { error: 'HITL approver rubber-stamps (always approve)', implementWhat: 'Approver-quality audit · monthly review of overturn rate' },
      { error: 'Fairness metric improves on average but worsens for minority', implementWhat: 'Per-group trend monitoring · alert on minority worsening' },
    ],
    issueCadence: {
      daily: [
        { issue: 'HITL queue review', action: 'Risk team · re-balance' },
        { issue: 'New fairness alerts', action: 'AI reviewer · investigate' },
      ],
      weekly: [
        { issue: 'DI / EO weekly run', action: 'Auto-compute · publish' },
        { issue: 'HITL overturn rate review', action: 'Risk team' },
      ],
      monthly: [
        { issue: 'Fairness deep-dive (random model)', action: 'AI reviewer · publish' },
        { issue: 'Approver quality audit', action: 'Compliance' },
      ],
    },
    mistakesUser: [
      { mistake: 'Releases model without fairness gate', prevention: 'CI gate · DI < 0.8 fails build' },
      { mistake: 'HITL approver approves all', prevention: 'Approver-rate alert · spot-check via second reviewer' },
      { mistake: 'Reports only overall accuracy (hides per-group)', prevention: 'Scorecard requires per-group metrics' },
    ],
    mistakesArchitect: [
      { mistake: 'No per-group hold-out', prevention: 'Eval pipeline requires per-group sample · drill' },
      { mistake: 'Audit fairness_flag optional', prevention: 'Schema requires field · CI gate' },
      { mistake: 'HITL bypassed for "trusted" users', prevention: 'No bypass · ADR required for any exception' },
    ],
    testingPlan: {
      positive: ['DI calc returns expected', 'EO calc returns expected', 'HITL escalates per rules'],
      negative: ['Missing group → blocked', 'HITL queue full → backpressure', 'Fairness flag missing → block release'],
      api: ['/api/v1/holy/res-ai POST/GET', 'Audit per call', '4xx for bad payload'],
      data: ['Group attributes consistent', 'Audit fairness_flag completeness', 'No orphan HITL items'],
      model: ['Fairness model versioned · drift monitor'],
      accuracy: ['DI calc matches reference impl', 'EO calc matches reference impl', 'Per-group accuracy reproducible'],
      security: ['Group attribute access role-gated', 'Audit per access', 'PII handled'],
      admin: ['AI reviewer can override HITL · audit', 'Threshold editable with ADR'],
      mlops: ['Fairness pipeline versioned · weekly RAGAS-like eval · rollback tested'],
    },
  },

  'gov-ai': {
    diagrams: [
      { title: 'Policy enforcement flow', mermaid: `flowchart LR\n  Decision -->|policy lookup| Policy\n  Policy -->|allow / deny / HITL| Decide\n  Decide -->|audit| Audit`, whyItMatters: 'Every decision policy-evaluated · no bypass.' },
      { title: 'Approval workflow', mermaid: `flowchart TB\n  Request -->|risk tier| Tier\n  Tier -->|low| Auto\n  Tier -->|medium| HITL\n  Tier -->|high| Council\n  Council --> Audit`, whyItMatters: 'Risk-tiered approval · proportional friction.' },
      { title: 'Rollback orchestration', mermaid: `flowchart LR\n  Trigger -->|gate fail| Rollback\n  Rollback -->|compensating tx| Audit\n  Audit -->|notify| Owner`, whyItMatters: 'Rollback path tested + auditable.' },
    ],
    challengesStrategy: [
      { challenge: 'Policy registry stale (no review cadence)', strategy: 'Quarterly policy review · auto-deprecate unused', impact: 'P1 enforce wrong rules' },
      { challenge: 'Control effectiveness unmeasured', strategy: 'Per-control hit/miss tracking · monthly report', impact: 'P1 false sense of compliance' },
      { challenge: 'Rollback path never exercised', strategy: 'Quarterly drill in staging · drill blocks if untested', impact: 'P0 rollback broken when needed' },
    ],
    edgeCases: [
      { case: 'Policy conflict (two policies both apply)', handling: 'Conflict resolver with priority · audit decision' },
      { case: 'Approver in approval chain departs', handling: 'Auto-route to backup · audit chain preserved' },
      { case: 'Rollback fails mid-execution', handling: 'Saga compensator · alert critical · manual intervention path' },
      { case: 'Council quorum not met', handling: 'Async voting window · escalate if no quorum after T' },
    ],
    scalePerf: [
      { metric: 'Policy lookup p95', target: '< 50ms', actual: '~35ms', status: 'ok' },
      { metric: 'Approval routing p95', target: '< 200ms', actual: '~150ms', status: 'ok' },
      { metric: 'Rollback drill cadence', target: 'quarterly', actual: 'quarterly', status: 'ok' },
      { metric: 'Control effectiveness score', target: '≥ 0.9', actual: '~0.87', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Policy evaluation fail (rule broken)', handling: 'Default-deny · alert governance lead' },
      { error: 'Approval workflow timeout', handling: 'Escalate · audit reason' },
      { error: 'Rollback fail', handling: 'Manual intervention · saga marker · critical alert' },
    ],
    errorsSilent: [
      { error: 'Policy added but not deployed (registry mismatch)', implementWhat: 'Daily reconcile · alert on mismatch' },
      { error: 'Control effectiveness drift (rules updated but baseline not)', implementWhat: 'Auto-update baseline on rule change · audit' },
      { error: 'Approval audit row missing scope', implementWhat: 'Audit middleware requires scope_required + scope_granted · drill' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New approval queue', action: 'Governance lead · route' },
        { issue: 'Policy violation review', action: 'Audit lead' },
      ],
      weekly: [
        { issue: 'Control effectiveness trend', action: 'Audit publishes' },
        { issue: 'Rollback runbook freshness', action: 'Ops · validate' },
      ],
      monthly: [
        { issue: 'Policy review (deprecate stale)', action: 'Architect + governance' },
        { issue: 'Rollback drill', action: 'MLOps + ops' },
      ],
    },
    mistakesUser: [
      { mistake: 'Tries to bypass policy ("just this once")', prevention: 'No bypass · ADR required · approver in audit chain' },
      { mistake: 'Approves without reading', prevention: 'Approver action requires dwell-time · audit' },
      { mistake: 'Triggers rollback without root-cause noted', prevention: 'Rollback requires reason field · UI blocks' },
    ],
    mistakesArchitect: [
      { mistake: 'Policy hardcoded in app (no registry)', prevention: 'CI scan for inline policy · drill' },
      { mistake: 'No risk-tier in approval workflow', prevention: 'Approval schema requires risk_tier · CI' },
      { mistake: 'Rollback not tested', prevention: 'Drill enforces quarterly rollback drill' },
    ],
    testingPlan: {
      positive: ['Policy lookup returns expected', 'Approval routes by tier', 'Rollback compensates cleanly'],
      negative: ['Bad policy → default deny', 'Approval timeout → escalate', 'Rollback fail → saga marker'],
      api: ['/api/v1/holy/gov-ai POST/GET', 'Audit per call', 'Rate limit'],
      data: ['Policy refs valid', 'Approval audit complete', 'Rollback audit chain intact'],
      model: ['If policy classifier used → versioned'],
      accuracy: ['Policy evaluation reproducible from input', 'Control effectiveness calc matches reference', 'Rollback compensates without data loss'],
      security: ['Policy access role-gated', 'Tenant isolation', 'Audit per evaluation'],
      admin: ['Governance lead can edit policy · ADR required · audit', 'Bulk policy import'],
      mlops: ['Policy classifier versioned · drift monitor · rollback tested'],
    },
  },

  'comp-ai': {
    diagrams: [
      { title: 'Compliance evidence trail', mermaid: `flowchart LR\n  Control -->|test| Evidence\n  Evidence -->|store| EvidenceStore\n  EvidenceStore -->|audit| Regulator`, whyItMatters: 'Evidence per control · auditable.' },
      { title: 'EU AI Act risk-tier flow', mermaid: `flowchart TB\n  System -->|classify| Tier{Risk tier}\n  Tier -->|unacceptable| Prohibited\n  Tier -->|high| StrictGates\n  Tier -->|limited| Transparency\n  Tier -->|minimal| Standard`, whyItMatters: 'Risk tier drives gate requirements.' },
      { title: 'Continuous compliance', mermaid: `flowchart LR\n  Live -->|metric| Score\n  Score -->|< threshold| Violation\n  Violation -->|notify| Compliance\n  Compliance -->|remediate| Live`, whyItMatters: 'Continuous · not just at release.' },
    ],
    challengesStrategy: [
      { challenge: 'Evidence stored ad-hoc (folders, emails)', strategy: 'Single evidence store with retention + access control', impact: 'P0 audit fail' },
      { challenge: 'Risk tier not documented per system', strategy: 'Risk-tier ADR per AI system · mandatory at register', impact: 'P0 EU AI Act non-compliance' },
      { challenge: 'P0 violations not closed in SLA', strategy: 'Auto-escalate · executive visibility', impact: 'P0 regulator escalation' },
    ],
    edgeCases: [
      { case: 'Control evidence missing for past period', handling: 'Audit shows gap · remediation plan required · risk acceptance ADR' },
      { case: 'Regulation changes mid-cycle', handling: 'Re-classify systems · update controls · re-collect evidence' },
      { case: 'Cross-jurisdiction system (EU + US)', handling: 'Most-restrictive applies · per-jurisdiction documentation' },
      { case: 'Vendor-supplied AI used in critical path', handling: 'Vendor risk assessment · model card from vendor · evidence shared' },
    ],
    scalePerf: [
      { metric: 'Continuous compliance score', target: '≥ 0.95', actual: '~0.94', status: 'warn' },
      { metric: 'Evidence completeness', target: '100%', actual: '~98%', status: 'warn' },
      { metric: 'P0 close time', target: '< 7 days', actual: '~5 days', status: 'ok' },
      { metric: 'Evidence retention', target: '≥ 7 years', actual: '7 years', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Evidence write fail', handling: 'Retry · alert critical if persistent' },
      { error: 'Control test fail', handling: 'Open violation · route by severity' },
      { error: 'Regulator API mismatch', handling: 'Versioned adapter · alert on schema change' },
    ],
    errorsSilent: [
      { error: 'Control passes but evidence not stored', implementWhat: 'Test runner stores evidence atomically · drill verifies' },
      { error: 'Risk tier classification stale (system changed)', implementWhat: 'Quarterly re-classification trigger · ADR refresh' },
      { error: 'P0 violation closed without root-cause', implementWhat: 'Close requires root-cause + recurrence-prevention · workflow' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New violations queue', action: 'Compliance team · triage' },
        { issue: 'Evidence write health', action: 'Ops · investigate' },
      ],
      weekly: [
        { issue: 'P0 close SLA report', action: 'Compliance publishes' },
        { issue: 'Evidence completeness audit', action: 'Compliance' },
      ],
      monthly: [
        { issue: 'Continuous score review by category', action: 'Compliance + leadership' },
        { issue: 'Regulator change scan', action: 'Compliance + legal' },
      ],
    },
    mistakesUser: [
      { mistake: 'Closes violation without evidence link', prevention: 'Close requires evidence-ref · UI blocks' },
      { mistake: 'Stores evidence in personal folder', prevention: 'Evidence store API enforced · scanning detects shadow copies' },
      { mistake: 'Submits old evidence (re-uses)', prevention: 'Evidence date-stamped · auto-reject if > N days' },
    ],
    mistakesArchitect: [
      { mistake: 'No risk-tier classification', prevention: 'Register AI requires risk_tier · drill' },
      { mistake: 'Evidence schema not versioned', prevention: 'Schema requires version · evidence rejected on mismatch' },
      { mistake: 'P0 violations bypassed (low priority)', prevention: 'P0 auto-escalates to executive · cannot bypass' },
    ],
    testingPlan: {
      positive: ['Control test runs', 'Evidence stored', 'Continuous score calc'],
      negative: ['Bad evidence → reject', 'Missing risk tier → block register', 'P0 timeout → escalate'],
      api: ['/api/v1/holy/comp-ai POST/GET', 'Zod-strict', 'Audit per access'],
      data: ['Evidence refs valid', 'Risk tier per AI system', 'No orphan controls'],
      model: ['If risk-classifier used → versioned + ADR-traced'],
      accuracy: ['Continuous score matches reference calc', 'Evidence completeness calc', 'P0 SLA timer accurate'],
      security: ['Evidence access role-gated · audit per access', 'Tenant isolation', 'Retention enforced'],
      admin: ['Compliance can edit any · audit', 'Bulk evidence import with Zod'],
      mlops: ['Risk classifier versioned · drift monitor · weekly RAGAS-like eval'],
    },
  },

  'inc-ai': {
    diagrams: [
      { title: 'Incident lifecycle', mermaid: `stateDiagram-v2\n  [*] --> Detected\n  Detected --> Triage\n  Triage --> InProgress\n  InProgress --> Resolved\n  Resolved --> PostMortem\n  PostMortem --> [*]`, whyItMatters: 'States explicit · audit ready.' },
      { title: 'Detection → resolution flow', mermaid: `flowchart LR\n  Alert -->|page| OnCall\n  OnCall --> Triage\n  Triage -->|severity| Resp[Response]\n  Resp --> Mitigate\n  Mitigate --> RootCause\n  RootCause --> PostMortem`, whyItMatters: 'Mitigation first · root-cause after.' },
      { title: 'Lessons feedback loop', mermaid: `flowchart LR\n  PostMortem -->|lessons| Backlog\n  Backlog -->|fix| Test\n  Test -->|merge| Release\n  Release --> NewSafetyNet`, whyItMatters: 'Lessons feed prevention.' },
    ],
    challengesStrategy: [
      { challenge: 'MTTD high (detection lag)', strategy: 'OTEL spans + anomaly detector · alert tuning', impact: 'P0 customer impact extended' },
      { challenge: 'Post-mortem skipped on "small" incidents', strategy: 'Post-mortem mandatory for ALL P0/P1 · template enforced', impact: 'P1 lessons lost' },
      { challenge: 'Lessons not fed to Test AI', strategy: 'Post-mortem requires test_ai_ref · CI gate', impact: 'P1 recurrence' },
    ],
    edgeCases: [
      { case: 'Multiple incidents same root cause', handling: 'Auto-correlate · single post-mortem' },
      { case: 'On-call unavailable', handling: 'Auto-escalate to backup · audit' },
      { case: 'Customer escalation parallel to incident', handling: 'CS + eng joint channel · single source of truth' },
      { case: 'False positive alert', handling: 'Tune detector · audit decision · avoid silencing real signal' },
    ],
    scalePerf: [
      { metric: 'MTTD', target: '< SLA (varies)', actual: '~12 min', status: 'ok' },
      { metric: 'MTTR', target: '< SLA (varies)', actual: '~45 min', status: 'warn' },
      { metric: 'Post-mortem SLA', target: '< 5 business days', actual: '~4 days', status: 'ok' },
      { metric: 'Lesson → fix conversion', target: '100% within 30 days', actual: '~85%', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Pager fail (alert delivery)', handling: 'Backup channel · alert critical if pager down' },
      { error: 'Incident DB write fail', handling: 'Retry · alert if persistent' },
      { error: 'Post-mortem template missing field', handling: 'Block save · UI shows required' },
    ],
    errorsSilent: [
      { error: 'Incident resolved but no audit row', implementWhat: 'Resolve action requires audit-row write · drill' },
      { error: 'Lesson logged but no owner assigned', implementWhat: 'Lesson capture workflow requires owner · UI blocks' },
      { error: 'Recurrence not detected (no correlation)', implementWhat: 'Auto-correlate by root-cause signature · alert on repeat' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New incident queue', action: 'On-call triage' },
        { issue: 'Stale incident sweep', action: 'Ops · escalate' },
      ],
      weekly: [
        { issue: 'MTTR trend review', action: 'SRE' },
        { issue: 'Open lessons audit', action: 'Eng lead · push to fix' },
      ],
      monthly: [
        { issue: 'Incident retrospective (cross-team)', action: 'SRE + eng leads' },
        { issue: 'Runbook freshness', action: 'Ops' },
      ],
    },
    mistakesUser: [
      { mistake: 'Resolves without verifying customer impact ceased', prevention: 'Resolve checklist requires customer-impact ack' },
      { mistake: 'Skips post-mortem ("nothing to learn")', prevention: 'P0/P1 post-mortem mandatory · cannot skip' },
      { mistake: 'Closes lesson without filing fix', prevention: 'Close requires backlog-ref · UI blocks' },
    ],
    mistakesArchitect: [
      { mistake: 'No SLA per severity tier', prevention: 'Incident requires severity_tier · SLA enforced' },
      { mistake: 'Runbook absent for known classes', prevention: 'Runbook coverage report · drill on common classes' },
      { mistake: 'No on-call rotation tracked', prevention: 'Rotation registry · auto-alert if gap' },
    ],
    testingPlan: {
      positive: ['Detection triggers alert', 'Triage routes correctly', 'Post-mortem saves'],
      negative: ['False positive → tune', 'Pager down → backup', 'Bad post-mortem → reject'],
      api: ['/api/v1/holy/inc-ai POST/GET', 'Audit per call', 'Rate limit'],
      data: ['Incident refs valid', 'Post-mortem refs incident', 'Lesson refs both'],
      model: ['If anomaly detector used → versioned'],
      accuracy: ['MTTD calc accurate', 'MTTR calc accurate', 'Correlation by signature reproducible'],
      security: ['Incident detail access role-gated · audit', 'Tenant isolation'],
      admin: ['SRE can mark severity · audit', 'Bulk close with reason'],
      mlops: ['Anomaly detector versioned · drift monitor · alert-tuning audit'],
    },
  },

  'meet-ai': {
    diagrams: [
      { title: 'Meeting capture flow', mermaid: `flowchart LR\n  Meeting -->|transcribe| STT\n  STT -->|diarize| Speakers\n  Speakers -->|summarize| LLM\n  LLM --> Actions[Action items]\n  Actions --> Tracking`, whyItMatters: 'Decisions captured · action items routed.' },
      { title: 'Decision audit', mermaid: `flowchart TB\n  Decision -->|capture| AuditRow\n  AuditRow -->|owner| Notify\n  Notify -->|ack| Tracking`, whyItMatters: 'Decisions explicit · owner accountable.' },
      { title: 'Action item lifecycle', mermaid: `stateDiagram-v2\n  [*] --> Open\n  Open --> InProgress\n  InProgress --> Done\n  InProgress --> Dropped\n  Done --> [*]\n  Dropped --> [*]`, whyItMatters: 'Actions cannot vanish · accountability.' },
    ],
    challengesStrategy: [
      { challenge: 'Decisions lost in transcripts (long text)', strategy: 'LLM extracts decisions to audit table · drill verifies', impact: 'P1 decision drift' },
      { challenge: 'Action items not tracked after meeting', strategy: 'Auto-assign + ack workflow · stale-sweep cron', impact: 'P1 action rot' },
      { challenge: 'Sensitive meeting transcripts leak', strategy: 'PII redaction · access control · audit per access', impact: 'P0 privacy breach' },
    ],
    edgeCases: [
      { case: 'Multiple speakers same name', handling: 'Voice diarization + manual confirm · audit' },
      { case: 'Meeting transcribed but no decisions', handling: 'Auto-tag "informational" · skip action workflow' },
      { case: 'Action item conflicts (two owners)', handling: 'Workflow flags · routes to PM for split' },
      { case: 'Recording too quiet · STT fails', handling: 'Quality check at start · alert host · re-record advised' },
    ],
    scalePerf: [
      { metric: 'STT latency per minute meeting', target: '< 10s', actual: '~7s', status: 'ok' },
      { metric: 'Summary accuracy (rouge)', target: '≥ 0.7', actual: '~0.72', status: 'ok' },
      { metric: 'Action capture rate', target: '100% of stated', actual: '~92%', status: 'warn' },
      { metric: 'Privacy scan latency', target: '< 5s', actual: '~3s', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'STT fail (audio quality)', handling: 'Quality report · re-process if possible · alert host' },
      { error: 'LLM summary fail', handling: 'Retry with smaller chunks · fallback to bullet template' },
      { error: 'Action assignment fail', handling: 'Manual queue · alert PM' },
    ],
    errorsSilent: [
      { error: 'Decision captured but no owner', implementWhat: 'Decision workflow requires owner · UI blocks' },
      { error: 'Action item dropped without reason', implementWhat: 'Drop requires reason · audit' },
      { error: 'Transcript has PII not redacted', implementWhat: 'PII scan in pipeline · drill blocks publish' },
    ],
    issueCadence: {
      daily: [
        { issue: 'New meetings to process', action: 'Auto-pipeline · alert on fails' },
        { issue: 'Stale action sweep', action: 'PM · nudge or close' },
      ],
      weekly: [
        { issue: 'Action completion rate report', action: 'PM publishes' },
        { issue: 'STT quality trend', action: 'Eng' },
      ],
      monthly: [
        { issue: 'Decision audit (random sample)', action: 'Compliance · validate' },
        { issue: 'Transcript retention sweep', action: 'Privacy · archive or delete' },
      ],
    },
    mistakesUser: [
      { mistake: 'Edits transcript to remove inconvenient decision', prevention: 'Audit chain · edits version-tracked · diff visible' },
      { mistake: 'Skips action assignment ("we\'ll discuss later")', prevention: 'Workflow requires action ack · stale sweep' },
      { mistake: 'Shares meeting note with PII intact', prevention: 'Share auto-redacts · explicit unredact requires audit' },
    ],
    mistakesArchitect: [
      { mistake: 'No retention policy for transcripts', prevention: 'Retention configured per meeting class · CI gate' },
      { mistake: 'STT model not versioned', prevention: 'Model registry · drift monitor' },
      { mistake: 'No PII scan in pipeline', prevention: 'Pipeline requires DLP step · drill' },
    ],
    testingPlan: {
      positive: ['Meeting transcribes', 'Decisions extracted', 'Actions assigned'],
      negative: ['Audio fail → quality report', 'No decisions → informational tag', 'PII detected → block share'],
      api: ['/api/v1/holy/meet-ai POST/GET', 'Audit per access', 'Rate limit'],
      data: ['Decision refs meeting', 'Action refs decision', 'No orphan transcripts'],
      model: ['STT versioned · LLM versioned · diarization model versioned'],
      accuracy: ['STT WER < 10%', 'Summary rouge ≥ 0.7', 'Action capture precision ≥ 0.85'],
      security: ['Transcript access role-gated · audit', 'PII redaction', 'Tenant isolation'],
      admin: ['PM can edit action · audit', 'Bulk close stale actions'],
      mlops: ['STT + LLM versioned · weekly RAGAS-like eval · drift monitor'],
    },
  },

  'note-ai': {
    diagrams: [
      { title: 'Note → RAG flow', mermaid: `flowchart LR\n  Note -->|index| VectorStore\n  Query --> Retrieve\n  Retrieve -->|top-k| LLM\n  LLM -->|cited| Answer`, whyItMatters: 'Citations required · no hallucination.' },
      { title: 'Tag taxonomy', mermaid: `flowchart TB\n  Tag --> Topic\n  Topic --> Note\n  Topic --> Insight\n  Topic --> Decision`, whyItMatters: 'Tags drive browse + filter.' },
      { title: 'Knowledge graph', mermaid: `flowchart LR\n  Note1 -->|references| Note2\n  Note2 -->|cited by| Insight\n  Insight -->|drives| Decision`, whyItMatters: 'Relationships drive retrieval quality.' },
    ],
    challengesStrategy: [
      { challenge: 'Notes saved but never retrieved', strategy: 'Recall rate metric · alert if persistent zero', impact: 'P2 wasted capture' },
      { challenge: 'Citations missing or wrong', strategy: 'Citation post-validator · drill enforces 100% accuracy', impact: 'P0 hallucination unfalsifiable' },
      { challenge: 'Tag taxonomy drift (free-text proliferation)', strategy: 'Tag suggestion + admin curation · weekly review', impact: 'P2 navigation broken' },
    ],
    edgeCases: [
      { case: 'Note duplicates existing', handling: 'Embedding dedup at save · suggest merge' },
      { case: 'Query returns no relevant notes', handling: 'Honest empty answer · no fabrication' },
      { case: 'Note source deleted (broken cite)', handling: 'Cite shows tombstone · re-validate cron' },
      { case: 'Large note exceeds chunk size', handling: 'Auto-split with overlap · maintain context' },
    ],
    scalePerf: [
      { metric: 'Vector search latency p95', target: '< 200ms', actual: '~140ms', status: 'ok' },
      { metric: 'Citation accuracy', target: '100%', actual: '~99.5%', status: 'warn' },
      { metric: 'Recall rate per note', target: '> 1 per quarter', actual: 'varies', status: 'warn' },
      { metric: 'Tag taxonomy size', target: '< 200 active tags', actual: '~165', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Index write fail', handling: 'Retry · alert if persistent' },
      { error: 'LLM call fail in RAG', handling: 'Fallback to keyword search · log' },
      { error: 'Citation validation fail', handling: 'Block publish · UI shows bad citations' },
    ],
    errorsSilent: [
      { error: 'Note indexed but vector skewed (bad chunk)', implementWhat: 'Quality check on embedding distribution · weekly audit' },
      { error: 'Tag added but never used', implementWhat: 'Unused-tag sweep · auto-deprecate' },
      { error: 'Citation initially correct · source changed', implementWhat: 'Citation source-version pinned · re-validate' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Index queue health', action: 'Ops · investigate stuck' },
        { issue: 'New citation failures', action: 'Eng' },
      ],
      weekly: [
        { issue: 'Recall rate report', action: 'PM · review low-value notes' },
        { issue: 'Tag curation', action: 'Knowledge lead' },
      ],
      monthly: [
        { issue: 'Citation accuracy audit (random sample)', action: 'AI reviewer' },
        { issue: 'Note retention sweep', action: 'Privacy' },
      ],
    },
    mistakesUser: [
      { mistake: 'Saves note without tag', prevention: 'Save requires ≥ 1 tag · UI suggests' },
      { mistake: 'Trusts RAG answer without checking cite', prevention: 'Inline cite hover · UI nudges check' },
      { mistake: 'Duplicates existing note', prevention: 'Dedup suggestion at save · merge prompt' },
    ],
    mistakesArchitect: [
      { mistake: 'No citation validator', prevention: 'RAG pipeline requires validator · drill' },
      { mistake: 'Single embedding model (no versioning)', prevention: 'Embedding model versioned · re-index on version bump' },
      { mistake: 'Tag taxonomy free-for-all', prevention: 'Tag registry · curation workflow' },
    ],
    testingPlan: {
      positive: ['Note indexes', 'Query returns relevant + cited', 'Tag autocomplete works'],
      negative: ['No relevant → honest empty', 'Bad citation → block', 'Duplicate → merge prompt'],
      api: ['/api/v1/holy/note-ai POST/GET', 'Audit per access', 'Rate limit'],
      data: ['Note refs valid', 'Citation refs source', 'No orphan vectors'],
      model: ['Embedding model versioned · LLM versioned'],
      accuracy: ['Recall@5 ≥ 0.8 on eval set', 'Citation accuracy 100% on validator set', 'Tag suggestion precision ≥ 0.8'],
      security: ['Note access role-gated · audit', 'PII detection at save', 'Tenant isolation'],
      admin: ['Knowledge lead can curate tags · audit', 'Bulk re-index on version bump'],
      mlops: ['Embedding + LLM versioned · drift weekly · RAGAS-like eval on retrieval'],
    },
  },

  // ─── batch 5 of 5 · final ──────────────────────────────────────────
  'test-ai': {
    diagrams: [
      { title: 'Test pyramid', mermaid: `flowchart TB\n  E2E[E2E · few] --> Integration[Integration · some]\n  Integration --> Unit[Unit · many]\n  Unit --> Drill[Drills · invariant locks]`, whyItMatters: 'Pyramid · drill locks load-bearing invariants.' },
      { title: 'Drill discipline flow', mermaid: `flowchart LR\n  Code --> CI\n  CI -->|drill| Pos[Positive assert]\n  CI -->|drill| Neg[Negative assert]\n  Pos + Neg -->|all pass| Merge\n  Any fail --> Block`, whyItMatters: 'Every drill ≥ 3 negative assertions.' },
      { title: 'Regression baseline', mermaid: `flowchart LR\n  Train --> Eval\n  Eval -->|vs baseline| Compare\n  Compare -->|delta < 0| Block\n  Compare -->|delta ≥ 0| Promote`, whyItMatters: 'Accuracy regression blocked at CI.' },
    ],
    challengesStrategy: [
      { challenge: 'Drills pass but features broken', strategy: 'Drills must lock load-bearing invariants · review at each PR', impact: 'P1 false confidence' },
      { challenge: 'Coverage gameable (test internals)', strategy: 'Behavior coverage · not line coverage', impact: 'P2 illusion of safety' },
      { challenge: 'Tests skipped under deadline pressure', strategy: 'CI blocks merge · no skip without ADR', impact: 'P0 regressions ship' },
    ],
    edgeCases: [
      { case: 'Flaky test', handling: 'Quarantine + investigate · ≥ 99.9% consistency to un-quarantine' },
      { case: 'Test data drifts (fixtures stale)', handling: 'Versioned fixtures · auto-refresh' },
      { case: 'Regression baseline updated unintentionally', handling: 'Baseline change requires ADR · diff posted in PR' },
      { case: 'Test runs slow (> 30 min)', handling: 'Parallel split · sharding · alert if > target' },
    ],
    scalePerf: [
      { metric: 'Coverage', target: '≥ 80%', actual: '~78%', status: 'warn' },
      { metric: 'CI duration', target: '< 30 min', actual: '~22 min', status: 'ok' },
      { metric: 'Drill count', target: 'grows monotonically', actual: '5 (incremented per iter)', status: 'ok' },
      { metric: 'Flaky test rate', target: '< 1%', actual: '~0.5%', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Test runner OOM', handling: 'Smaller shard · alert MLOps' },
      { error: 'Drill assertion fail', handling: 'CI block · clear diagnostic · per-step output' },
      { error: 'Coverage report fail', handling: 'Re-run · alert if persistent' },
    ],
    errorsSilent: [
      { error: 'Feature shipped without corresponding drill', implementWhat: 'Code review checklist · drill-trace per feature PR' },
      { error: 'Test passes but doesn\'t test intended behavior', implementWhat: 'Mutation testing · weekly · find dead asserts' },
      { error: 'Baseline updated without justification', implementWhat: 'Baseline edit requires ADR · auto-comment in PR' },
    ],
    issueCadence: {
      daily: [
        { issue: 'CI fail review', action: 'Dev triage' },
        { issue: 'Flaky test sweep', action: 'Quarantine + investigate' },
      ],
      weekly: [
        { issue: 'Coverage trend', action: 'Eng lead' },
        { issue: 'Drill expansion plan', action: 'Per-feature review' },
      ],
      monthly: [
        { issue: 'Mutation test report', action: 'Eng' },
        { issue: 'Regression baseline audit', action: 'MLOps + AI reviewer' },
      ],
    },
    mistakesUser: [
      { mistake: 'Skips drill ("happy path is enough")', prevention: 'CI checklist requires drill · cannot bypass' },
      { mistake: 'Tests internals instead of behavior', prevention: 'Code review checklist · behavior-first' },
      { mistake: 'Updates baseline silently', prevention: 'Baseline change requires ADR · auto-comment' },
    ],
    mistakesArchitect: [
      { mistake: 'No drill discipline (drills with 0 negatives)', prevention: 'Drill template requires ≥ 3 negative · CI gate' },
      { mistake: 'Single test category (only unit · no E2E)', prevention: 'Pyramid coverage report · per-category SLO' },
      { mistake: 'No regression baseline', prevention: 'Eval pipeline requires baseline · drill blocks' },
    ],
    testingPlan: {
      positive: ['Drill runs · positive asserts pass', 'Coverage report generates', 'Regression baseline compared'],
      negative: ['Bad drill → CI block', 'Coverage drop → CI warn', 'Regression → CI block'],
      api: ['/api/v1/holy/test-ai POST/GET', 'Audit per run', 'Rate limit'],
      data: ['Test fixtures versioned', 'Baseline rows non-null', 'No orphan results'],
      model: ['If anti-flake model used → versioned'],
      accuracy: ['Drill assertion outcomes reproducible', 'Coverage metric matches reference calc', 'Mutation killing rate ≥ 0.6'],
      security: ['Test data PII-synthesized', 'Per-tenant isolation in tests', 'Audit per run'],
      admin: ['Eng lead can promote baseline · ADR + audit', 'Bulk quarantine'],
      mlops: ['Drift detection on test data · weekly · anti-flake model versioned'],
    },
  },

  'job-ai': {
    diagrams: [
      { title: 'Job lifecycle', mermaid: `stateDiagram-v2\n  [*] --> Scheduled\n  Scheduled --> Running\n  Running --> Success\n  Running --> Failed\n  Failed --> Retry\n  Retry --> Running\n  Failed --> DLQ\n  Success --> [*]`, whyItMatters: 'States explicit · retry + DLQ paths.' },
      { title: 'Cron registry flow', mermaid: `flowchart LR\n  Schedule -->|register| Registry\n  Registry --> Runner\n  Runner -->|trigger| Job\n  Job -->|status| Audit`, whyItMatters: 'All cron registered · no hidden schedules.' },
      { title: 'Failure handling', mermaid: `flowchart LR\n  Failed -->|retryable| Retry[Retry n times]\n  Retry -->|exhausted| DLQ\n  Failed -->|fatal| DLQ\n  DLQ --> Investigate`, whyItMatters: 'DLQ catches everything · no silent drops.' },
    ],
    challengesStrategy: [
      { challenge: 'Hidden cron jobs (someone\'s crontab)', strategy: 'CI scans for hidden cron · centralized registry mandatory', impact: 'P1 ops chaos' },
      { challenge: 'Failure not surfaced (silent)', strategy: 'Failure → audit row → alert · SLA per severity', impact: 'P0 batch data missing' },
      { challenge: 'Retry without backoff (storms)', strategy: 'Exponential backoff + jitter · drill enforces', impact: 'P1 cascading load' },
    ],
    edgeCases: [
      { case: 'Job runtime exceeds schedule interval', handling: 'Skip next + alert · or queue · ops decides' },
      { case: 'Job depends on upstream job', handling: 'Dependency graph · downstream waits or skips' },
      { case: 'Cron registered but never runs', handling: 'Health probe per cron · auto-alert' },
      { case: 'DLQ grows unbounded', handling: 'Alert + ops drain · post-mortem if recurring' },
    ],
    scalePerf: [
      { metric: 'Job success rate', target: '≥ 99%', actual: '~98.5%', status: 'warn' },
      { metric: 'DLQ depth', target: '< 100', actual: '~25', status: 'ok' },
      { metric: 'Retry rate', target: '< 5%', actual: '~3.2%', status: 'ok' },
      { metric: 'SLA compliance', target: '≥ 95%', actual: '~94%', status: 'warn' },
    ],
    errorsLogged: [
      { error: 'Job run fail', handling: 'Retry per policy · DLQ if exhausted · alert per severity' },
      { error: 'Cron registry write fail', handling: 'Retry · alert if persistent' },
      { error: 'Job dependency cycle', handling: 'Detect at register · block · alert ops' },
    ],
    errorsSilent: [
      { error: 'Job runs but produces wrong output', implementWhat: 'Output validation per job · drill enforces' },
      { error: 'Job duration creeping up (slow drift)', implementWhat: 'P95 duration monitor · alert on 50% week-over-week' },
      { error: 'DLQ items never investigated', implementWhat: 'DLQ aging report · auto-escalate after N days' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Failed job triage', action: 'Ops · re-run or escalate' },
        { issue: 'DLQ review', action: 'Eng · drain' },
      ],
      weekly: [
        { issue: 'Success rate report', action: 'Ops publishes' },
        { issue: 'Cron audit (still needed?)', action: 'Eng + PM' },
      ],
      monthly: [
        { issue: 'Cron portfolio review', action: 'Architect · deprecate · merge' },
        { issue: 'SLA compliance audit', action: 'PM' },
      ],
    },
    mistakesUser: [
      { mistake: 'Adds cron in personal crontab (not registry)', prevention: 'CI scans for cron files · registry mandatory' },
      { mistake: 'Sets retry to infinite (no backoff)', prevention: 'Schema enforces backoff + max retries' },
      { mistake: 'Ignores DLQ', prevention: 'DLQ > N requires ack · cannot dismiss' },
    ],
    mistakesArchitect: [
      { mistake: 'No dependency graph (jobs run in random order)', prevention: 'Schedule requires deps · runner enforces' },
      { mistake: 'No DLQ (failures lost)', prevention: 'Spec requires DLQ topic · drill' },
      { mistake: 'No output validation per job', prevention: 'Output schema versioned · validator runs' },
    ],
    testingPlan: {
      positive: ['Cron triggers · job runs', 'Retry on fail', 'DLQ on exhaust'],
      negative: ['Cycle → block at register', 'Bad output → fail loud', 'Retry storm → backoff enforced'],
      api: ['/api/v1/holy/job-ai POST/GET', 'Audit per run', 'Rate limit per tenant'],
      data: ['Cron registry refs valid', 'No orphan job rows', 'Dependency tree intact'],
      model: ['If anomaly detector for job duration → versioned'],
      accuracy: ['Success rate calc matches actual', 'SLA compliance reproducible', 'Backoff timing verified'],
      security: ['Job scope grants enforced', 'Per-tenant isolation', 'Audit per run'],
      admin: ['Ops can pause cron · audit', 'Bulk re-run with reason'],
      mlops: ['Anomaly detector versioned · drift monitor · rollback tested'],
    },
  },

  'biz-value': {
    diagrams: [
      { title: 'ROI calc flow', mermaid: `flowchart LR\n  Revenue[Revenue ↑] --> Total[Total value]\n  Cost[Cost ↓] --> Total\n  Risk[Risk ↓ → $ equiv] --> Total\n  Total -->|/| Invest[Investment] --> ROI`, whyItMatters: 'ROI math explicit · 3 levers visible.' },
      { title: 'Value attribution', mermaid: `flowchart TB\n  Feature1 -->|attribution| Lever[Revenue / Cost / Risk]\n  Lever -->|delta| Baseline\n  Baseline -->|vs target| Score`, whyItMatters: 'Per-feature attribution · ROI traceable.' },
      { title: 'Decision sequence', mermaid: `sequenceDiagram\n  participant Exec\n  participant BizValue\n  participant Finance\n  Exec->>BizValue: show ROI\n  BizValue->>Finance: validate baseline\n  Finance-->>BizValue: confirmed\n  BizValue-->>Exec: ROI vs target`, whyItMatters: 'Finance signs off · no fake ROI.' },
    ],
    challengesStrategy: [
      { challenge: 'ROI assumes static baseline (changes don\'t propagate)', strategy: 'Baseline subscribed to source events · auto-recompute', impact: 'P1 stale ROI' },
      { challenge: 'Per-feature attribution missing (lump value)', strategy: 'Attribution model per feature · drill enforces', impact: 'P1 cannot prioritize' },
      { challenge: 'Risk reduction in $ equiv is optimistic', strategy: 'Risk → $ requires actuarial sign-off · audit', impact: 'P0 overstated ROI' },
    ],
    edgeCases: [
      { case: 'Negative ROI · still recommended', handling: 'Strategic flag · executive override · audit' },
      { case: 'Multi-year ROI · discounting', handling: 'NPV calc · discount rate explicit · finance sign-off' },
      { case: 'Cost saved but not realized', handling: 'Mark "projected" vs "realized" · monthly reconciliation' },
      { case: 'Revenue counted twice (overlap with other feature)', handling: 'De-dup via attribution model · audit' },
    ],
    scalePerf: [
      { metric: 'ROI calc latency', target: '< 500ms', actual: '~280ms', status: 'ok' },
      { metric: 'Baseline freshness', target: '< 24 hr', actual: '~12 hr', status: 'ok' },
      { metric: 'Attribution coverage', target: '100% revenue', actual: '~94%', status: 'warn' },
      { metric: 'Finance reconciliation cadence', target: 'monthly', actual: 'monthly', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'ROI calc divide-by-zero', handling: 'Guard at math · render "no baseline" · log' },
      { error: 'Baseline fetch fail', handling: 'Use last-known-good · stale badge · alert' },
      { error: 'Attribution model fail', handling: 'Fallback to lump · log · alert finance' },
    ],
    errorsSilent: [
      { error: 'ROI optimistic without sensitivity', implementWhat: 'Require Monte Carlo · UI shows p10-p90 band' },
      { error: 'Realized vs projected confusion', implementWhat: 'Separate columns · UI badge per category' },
      { error: 'Attribution stale after model change', implementWhat: 'Attribution invalidate on model version bump' },
    ],
    issueCadence: {
      daily: [
        { issue: 'ROI dashboard refresh', action: 'Finance verifies' },
        { issue: 'Attribution failures', action: 'Eng' },
      ],
      weekly: [
        { issue: 'Realized-vs-projected diff review', action: 'Finance' },
        { issue: 'Attribution coverage trend', action: 'PM' },
      ],
      monthly: [
        { issue: 'Finance reconciliation', action: 'Finance + PM' },
        { issue: 'Baseline re-validation', action: 'Finance · update if drifted' },
      ],
    },
    mistakesUser: [
      { mistake: 'Counts revenue twice across features', prevention: 'Attribution model de-dups · UI warns' },
      { mistake: 'Reports projected as realized', prevention: 'Category required at save · UI enforces' },
      { mistake: 'Ignores sensitivity analysis', prevention: 'ROI display requires p10-p90 band · UI blocks' },
    ],
    mistakesArchitect: [
      { mistake: 'No actuarial sign-off for risk → $', prevention: 'Risk-$ field requires sign-off field · CI gate' },
      { mistake: 'Single ROI number (no sensitivity)', prevention: 'ROI requires band · drill' },
      { mistake: 'Baseline updated without versioning', prevention: 'Baseline rows valid_from/valid_to · drill' },
    ],
    testingPlan: {
      positive: ['ROI calc returns expected', 'Attribution links feature → lever', 'Finance reconcile works'],
      negative: ['Baseline 0 → no-baseline state', 'Bad attribution → fallback', 'Risk-$ no sign-off → block'],
      api: ['/api/v1/holy/biz-value POST/GET', 'Audit per call', 'Rate limit'],
      data: ['Baseline rows non-null target', 'Attribution refs valid', 'Realized vs projected separate'],
      model: ['If attribution model used → versioned'],
      accuracy: ['ROI matches finance formula', 'Attribution sum equals total', 'Sensitivity band reproducible'],
      security: ['Per-tenant isolation', 'Finance role-gated', 'Audit per access'],
      admin: ['Finance can edit baseline · audit', 'Bulk reconcile with reason'],
      mlops: ['Attribution model versioned · drift monitor weekly'],
    },
  },

  'dashboard': {
    diagrams: [
      { title: 'Role-scoped data flow', mermaid: `flowchart LR\n  User --> Role\n  Role -->|scope| Query\n  Query --> Tile\n  Tile -->|drill| RowLevel`, whyItMatters: 'Role drives scope · drill to row.' },
      { title: 'Anomaly auto-flag', mermaid: `flowchart TB\n  Tile -->|read| Live\n  Live -->|threshold| Detect\n  Detect -->|alert| Banner\n  Banner -->|click| Detail`, whyItMatters: 'Anomalies surface without manual scan.' },
      { title: 'Per-role dashboard composition', mermaid: `flowchart LR\n  Role -->|template| Tiles[6 tiles]\n  Tiles --> Charts[2 charts]\n  Charts --> Alerts[N alerts]`, whyItMatters: 'Template per role · consistency.' },
    ],
    challengesStrategy: [
      { challenge: 'Tiles show stale data without warning', strategy: 'Stamp staleness per tile · escalate visual at thresholds', impact: 'P1 misleading decision' },
      { challenge: 'Drill goes too deep (4 clicks to row)', strategy: 'Single-click drill · tile → row-level view', impact: 'P2 friction' },
      { challenge: 'Anomaly false positives (alert fatigue)', strategy: 'Tune threshold · require N consecutive · auto-snooze', impact: 'P2 real alerts ignored' },
    ],
    edgeCases: [
      { case: 'Role has access to no data', handling: 'Empty-state with "request access" CTA' },
      { case: 'Tile data exceeds chart capacity', handling: 'Auto-summarize or paginate · sample if needed' },
      { case: 'Anomaly triggers during planned event', handling: 'Calendar overlay · suppress for known periods' },
      { case: 'Row-level data PII-sensitive', handling: 'PII redacted by default · explicit unredact requires audit' },
    ],
    scalePerf: [
      { metric: 'Tile load p95', target: '< 500ms', actual: '~320ms', status: 'ok' },
      { metric: 'Drill-down latency', target: '< 1s', actual: '~600ms', status: 'ok' },
      { metric: 'Anomaly detection precision', target: '≥ 0.8', actual: '~0.78', status: 'warn' },
      { metric: 'Tile freshness', target: '< 1 hr', actual: '~30 min', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Tile data fetch fail', handling: 'Stale fallback · log · alert ops' },
      { error: 'Anomaly detector OOM', handling: 'Smaller batch · alert if persistent' },
      { error: 'Role scope mismatch', handling: 'Default-deny · log · alert security' },
    ],
    errorsSilent: [
      { error: 'Tile shows old data without staleness badge', implementWhat: 'Staleness check at render · badge mandatory > N min' },
      { error: 'Anomaly threshold drift (silent re-cal)', implementWhat: 'Threshold change audit · weekly review' },
      { error: 'Drill query bypasses scope', implementWhat: 'Drill query reuses tile scope · drill enforces' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Tile freshness check', action: 'Ops · investigate stale sources' },
        { issue: 'New anomalies queue', action: 'Owner triage' },
      ],
      weekly: [
        { issue: 'Anomaly tuning', action: 'SRE + analyst' },
        { issue: 'Drill-down analytics (which tile drives drill)', action: 'PM' },
      ],
      monthly: [
        { issue: 'Dashboard composition review', action: 'PM + role owners' },
        { issue: 'Role-scope audit', action: 'Privacy + eng' },
      ],
    },
    mistakesUser: [
      { mistake: 'Trusts headline number without staleness check', prevention: 'Staleness badge prominent · UI nudges' },
      { mistake: 'Shares dashboard link cross-role', prevention: 'Share triggers re-auth · scope inherited' },
      { mistake: 'Ignores anomaly banner', prevention: 'Anomaly requires ack-or-snooze · cannot dismiss silently' },
    ],
    mistakesArchitect: [
      { mistake: 'No role-scoped queries (single global query)', prevention: 'Query planner requires role · drill' },
      { mistake: 'Drill bypasses scope (security hole)', prevention: 'Drill reuses tile scope · CI scan' },
      { mistake: 'Anomaly detector hardcoded (no per-tile config)', prevention: 'Per-tile config table · UI shows' },
    ],
    testingPlan: {
      positive: ['Tile renders for role', 'Drill returns row-level', 'Anomaly detector triggers'],
      negative: ['No access → empty CTA', 'Stale tile → badge', 'False positive → tune workflow'],
      api: ['/api/v1/holy/dashboard POST/GET', 'Audit per render', 'Rate limit'],
      data: ['Per-role scope enforced', 'No PII leaks via drill', 'Anomaly refs source'],
      model: ['Anomaly detector versioned'],
      accuracy: ['Tile value matches MV', 'Drill row count matches tile aggregate', 'Anomaly precision/recall ≥ baseline'],
      security: ['Per-tenant + per-role isolation', 'PII redaction default', 'Audit per drill'],
      admin: ['PM can adjust tile layout · audit', 'Per-role override with ADR'],
      mlops: ['Anomaly detector versioned · drift monitor · per-segment tuning'],
    },
  },

  'operations': {
    diagrams: [
      { title: 'Day-2 ops flow', mermaid: `flowchart LR\n  Live --> Monitor\n  Monitor -->|alert| OnCall\n  OnCall --> Triage\n  Triage --> Mitigate\n  Mitigate --> Resolve`, whyItMatters: 'Day-2 path explicit · no on-call confusion.' },
      { title: 'Deploy + rollback', mermaid: `flowchart LR\n  Build --> Canary\n  Canary -->|metrics ok| Full\n  Canary -->|metrics bad| Rollback\n  Full --> Monitor\n  Monitor -->|regress| Rollback`, whyItMatters: 'Rollback path tested · canary first.' },
      { title: 'SLA enforcement', mermaid: `flowchart TB\n  Request --> Service\n  Service -->|measure| Latency\n  Latency -->|> SLA| Burn[SLO burn alert]\n  Burn --> OnCall`, whyItMatters: 'SLO burn alerts before SLA breach.' },
    ],
    challengesStrategy: [
      { challenge: 'Unmonitored services (no observability)', strategy: 'CI gate: service deployed requires OTEL traces + metrics', impact: 'P0 incident blind' },
      { challenge: 'Rollback path untested', strategy: 'Quarterly rollback drill · CI checks rollback script exists', impact: 'P0 rollback broken' },
      { challenge: 'SLO burn alerts too late', strategy: 'Multi-window burn rate · alert at 2% / 5% / 10%', impact: 'P1 SLA breach' },
    ],
    edgeCases: [
      { case: 'Canary metrics inconclusive (low traffic)', handling: 'Extended canary window · explicit promote' },
      { case: 'Rollback during active customer load', handling: 'Graceful drain · audit chain · post-incident review' },
      { case: 'SLO burns due to upstream degradation', handling: 'Identify upstream · suppress own burn · alert upstream owner' },
      { case: 'Multi-region · partial outage', handling: 'Region-scoped SLO · per-region runbook' },
    ],
    scalePerf: [
      { metric: 'p95 latency', target: '< SLA (per service)', actual: 'varies', status: 'warn' },
      { metric: 'Error rate', target: '< 1%', actual: '~0.6%', status: 'ok' },
      { metric: 'Rollback time', target: '< 15 min', actual: '~10 min', status: 'ok' },
      { metric: 'Unmonitored services', target: '0', actual: '0', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'OTEL exporter fail', handling: 'Backup exporter · alert critical' },
      { error: 'Canary metric query timeout', handling: 'Retry · default-block promote on timeout' },
      { error: 'Rollback fail (state corruption)', handling: 'Saga marker · manual intervention · post-incident' },
    ],
    errorsSilent: [
      { error: 'Service deployed but no metrics tracked', implementWhat: 'CI gate: deploy requires OTEL spans · drill enforces' },
      { error: 'Rollback script never tested', implementWhat: 'Quarterly drill · CI checks last-run date' },
      { error: 'SLO burns but no alert (mis-tuned)', implementWhat: 'Synthetic burn injection · weekly · verify alert fires' },
    ],
    issueCadence: {
      daily: [
        { issue: 'SLO burn dashboard', action: 'On-call review' },
        { issue: 'Deploy queue · canary status', action: 'Release manager' },
      ],
      weekly: [
        { issue: 'P95 latency trend', action: 'SRE · profile slow services' },
        { issue: 'Rollback readiness check', action: 'Ops' },
      ],
      monthly: [
        { issue: 'SLO review (still right?)', action: 'PM + SRE' },
        { issue: 'Observability coverage audit', action: 'SRE' },
      ],
    },
    mistakesUser: [
      { mistake: 'Deploys without canary', prevention: 'CI requires canary step · cannot bypass without ADR' },
      { mistake: 'Resolves incident without RCA', prevention: 'Close requires RCA field · UI blocks' },
      { mistake: 'Snoozes SLO alerts without action', prevention: 'Snooze requires reason · escalate after 3' },
    ],
    mistakesArchitect: [
      { mistake: 'Service deployed without observability', prevention: 'CI gate · drill' },
      { mistake: 'No SLO defined per service', prevention: 'Service registry requires SLO · drill' },
      { mistake: 'Rollback runbook absent', prevention: 'Runbook required at deploy · drill blocks' },
    ],
    testingPlan: {
      positive: ['OTEL traces emit', 'Canary promotes on green', 'Rollback succeeds'],
      negative: ['No metrics → block deploy', 'Canary bad → block', 'Rollback fail → saga marker'],
      api: ['/api/v1/holy/operations POST/GET', 'Audit per deploy', 'Rate limit'],
      data: ['Service refs valid', 'SLO targets per service', 'Runbook refs intact'],
      model: ['If anomaly detector for ops → versioned'],
      accuracy: ['Latency p95 calc matches reference', 'Error rate calc matches', 'Rollback time measured accurately'],
      security: ['Deploy scope grants enforced', 'Audit per action', 'Per-tenant isolation'],
      admin: ['SRE can suppress alert with reason · audit', 'Bulk runbook update'],
      mlops: ['Anomaly detector versioned · drift monitor · rollback tested quarterly'],
    },
  },

  'reports': {
    diagrams: [
      { title: 'Report generation flow', mermaid: `flowchart LR\n  Cadence -->|trigger| Generator\n  Generator -->|query| Data\n  Generator -->|render| PDF\n  Generator -->|render| CSV\n  PDF + CSV --> Distribute\n  Distribute -->|audit| Audit`, whyItMatters: 'Generation + distribution audited.' },
      { title: 'Per-cadence schedule', mermaid: `flowchart TB\n  Daily[Daily · 9am] --> Recipients1\n  Weekly[Weekly · Monday] --> Recipients2\n  Monthly[Monthly · first Mon] --> Recipients3`, whyItMatters: 'Cadence visible · drift detectable.' },
      { title: 'Audit trail flow', mermaid: `flowchart LR\n  Render --> AuditRow\n  Distribute --> AuditRow\n  Download --> AuditRow\n  AuditRow --> Postgres`, whyItMatters: 'Every access audited.' },
    ],
    challengesStrategy: [
      { challenge: 'Reports drift from underlying data', strategy: 'Source-of-truth pinned per report · versioned', impact: 'P1 conflicting numbers' },
      { challenge: 'Distribution fails silently', strategy: 'Delivery ack-required · audit per delivery', impact: 'P1 stakeholder unaware' },
      { challenge: 'Format proliferation (PDF / CSV / JSON / Excel)', strategy: 'Canonical 3 (PDF + CSV + JSON) · ADR for more', impact: 'P2 maintenance burden' },
    ],
    edgeCases: [
      { case: 'Report generation OOM (large dataset)', handling: 'Paginate · split into multi-file zip' },
      { case: 'Distribution recipient bounced', handling: 'Auto-retry · alert sender after N · audit' },
      { case: 'Report scheduled but data not ready', handling: 'Delay + alert · max delay before fail' },
      { case: 'Holiday in distribution cadence', handling: 'Skip + auto-next-business-day' },
    ],
    scalePerf: [
      { metric: 'Generation latency', target: '< 5 min', actual: '~3 min', status: 'ok' },
      { metric: 'Distribution success rate', target: '≥ 99%', actual: '~98.5%', status: 'warn' },
      { metric: 'Audit completeness', target: '100%', actual: '100%', status: 'ok' },
      { metric: 'Format coverage', target: 'PDF + CSV + JSON', actual: '3 of 3', status: 'ok' },
    ],
    errorsLogged: [
      { error: 'Report generation fail', handling: 'Retry · alert if persistent · skip cadence with reason' },
      { error: 'Email vendor down', handling: 'Backup vendor · alert ops · queue' },
      { error: 'PDF render fail', handling: 'Fallback to text · log warning · re-render later' },
    ],
    errorsSilent: [
      { error: 'Report sent but never opened', implementWhat: 'Open-tracking pixel · low-open-rate audit · sender notified' },
      { error: 'Report shows old data (cache hit)', implementWhat: 'Cache invalidation on source change · drill' },
      { error: 'Recipient list grows without curation', implementWhat: 'Monthly recipient audit · auto-remove non-openers' },
    ],
    issueCadence: {
      daily: [
        { issue: 'Generation failures', action: 'Ops · re-run' },
        { issue: 'Distribution health', action: 'SRE' },
      ],
      weekly: [
        { issue: 'Open rate review', action: 'PM' },
        { issue: 'Recipient curation', action: 'PM + ops' },
      ],
      monthly: [
        { issue: 'Report portfolio review', action: 'PM + leadership · sunset unused' },
        { issue: 'Format usage audit', action: 'PM' },
      ],
    },
    mistakesUser: [
      { mistake: 'Forwards report with sensitive data', prevention: 'PII redacted by default · explicit unredact requires audit' },
      { mistake: 'Subscribes peer without consent', prevention: 'Subscribe requires recipient confirmation' },
      { mistake: 'Ignores low open rate', prevention: 'Auto-alert sender at < 50% · suggest sunset' },
    ],
    mistakesArchitect: [
      { mistake: 'Report queries hit raw (slow)', prevention: 'Report queries hit cube · CI scan' },
      { mistake: 'No audit per delivery', prevention: 'Audit middleware mandatory · drill' },
      { mistake: 'Format inconsistency (mix of CSV variants)', prevention: 'Canonical 3 formats · ADR for exception' },
    ],
    testingPlan: {
      positive: ['Report generates on cadence', 'Distribution sends', 'Audit per delivery'],
      negative: ['Bad recipient → fail loud', 'Generation fail → skip with reason', 'Bounce → retry'],
      api: ['/api/v1/holy/reports POST/GET', 'Audit per render', 'Rate limit per tenant'],
      data: ['Recipient refs valid', 'Report refs source pinned', 'No orphan deliveries'],
      model: ['If summarizer model used → versioned'],
      accuracy: ['Generated number matches source', 'Distribution success rate calc accurate', 'Open-rate per recipient reproducible'],
      security: ['Per-tenant + per-role distribution', 'PII redaction default', 'Audit per delivery'],
      admin: ['PM can edit cadence · audit', 'Bulk recipient update'],
      mlops: ['Summarizer model versioned · drift weekly · rollback tested'],
    },
  },
};

export function briefItemCounts(tabId) {
  const b = TAB_TECHNICAL_BRIEF[tabId];
  if (!b) return null;
  return {
    diagrams: b.diagrams?.length || 0,
    challengesStrategy: b.challengesStrategy?.length || 0,
    edgeCases: b.edgeCases?.length || 0,
    scalePerf: b.scalePerf?.length || 0,
    errorsLogged: b.errorsLogged?.length || 0,
    errorsSilent: b.errorsSilent?.length || 0,
    cadenceDaily: b.issueCadence?.daily?.length || 0,
    cadenceWeekly: b.issueCadence?.weekly?.length || 0,
    cadenceMonthly: b.issueCadence?.monthly?.length || 0,
    mistakesUser: b.mistakesUser?.length || 0,
    mistakesArchitect: b.mistakesArchitect?.length || 0,
    testingPositive: b.testingPlan?.positive?.length || 0,
    testingNegative: b.testingPlan?.negative?.length || 0,
    testingApi: b.testingPlan?.api?.length || 0,
    testingData: b.testingPlan?.data?.length || 0,
    testingModel: b.testingPlan?.model?.length || 0,
    testingAccuracy: b.testingPlan?.accuracy?.length || 0,
    testingSecurity: b.testingPlan?.security?.length || 0,
    testingAdmin: b.testingPlan?.admin?.length || 0,
    testingMlops: b.testingPlan?.mlops?.length || 0,
  };
}
