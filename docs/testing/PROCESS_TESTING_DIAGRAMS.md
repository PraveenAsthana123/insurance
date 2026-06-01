# Process Testing Graphs, Flowcharts, Pipeline, And Cron Scheduling

These diagrams show how the global process testing policy runs across departments, processes, agents, OpenClaw, Redis, workers, and cron.

## 1. System Graph

```mermaid
flowchart LR
    Seeds[backend/seeds/departments.json<br/>backend/seeds/processes.json]
    Catalog[docs/testing/PROCESS_AGENT_CRON_CATALOG.json]
    Policy[docs/testing/GLOBAL_PROCESS_TESTING_POLICY.md]
    CLI[scripts/process_test_plan.py]
    Cron[System cron / operator scheduler]
    OpenClaw[FastAPI OpenClaw Bridge<br/>/api/v1/openclaw/tasks]
    Redis[(Redis queues<br/>tasks / council_tasks)]
    SimpleAgents[Simple agent fleet<br/>daily smoke tests]
    CouncilAgents[Council agents<br/>weekly full validation]
    Paperclip[Paperclip context packs<br/>/api/v1/paperclip/*]
    Results[(Redis results<br/>done / council_done)]
    Monitor[agent_fleet monitor<br/>queue depth + heartbeats]
    Evidence[Evidence package<br/>logs, traces, test plan, risks]

    Seeds --> Catalog
    Policy --> Catalog
    Catalog --> CLI
    CLI -->|list/export/run| Cron
    CLI -->|manual run| OpenClaw
    Cron -->|scheduled run| CLI
    OpenClaw --> Redis
    Paperclip --> OpenClaw
    Redis --> SimpleAgents
    Redis --> CouncilAgents
    SimpleAgents --> Results
    CouncilAgents --> Results
    Results --> Monitor
    Results --> Evidence
```

## 2. Process Test Execution Flowchart

```mermaid
flowchart TD
    A[Select department process] --> B[Resolve suite_id from PROCESS_AGENT_CRON_CATALOG.json]
    B --> C{Run mode?}
    C -->|smoke| D[Use simple OpenClaw mode]
    C -->|full| E[Use council OpenClaw mode]
    D --> F[Build prompt with process inputs, outputs, KPI, subprocess tests]
    E --> F
    F --> G{Dry run?}
    G -->|yes| H[Print JSON payload only]
    G -->|no| I[POST /api/v1/openclaw/tasks]
    I --> J[OpenClawGatewayService selects queue]
    J --> K{Agent mode}
    K -->|simple| L[Redis list: tasks]
    K -->|council| M[Redis list: council_tasks]
    L --> N[Simple worker executes test planning task]
    M --> O[Council worker author/reviewer/chair validation]
    N --> P[Redis list: done]
    O --> Q[Redis list: council_done]
    P --> R[Monitor result and collect evidence]
    Q --> R
    R --> S{Pass/fail decision}
    S -->|pass| T[Record evidence and keep schedule]
    S -->|fail| U[Create remediation, rerun full suite, escalate P0/P1]
```

## 3. Enterprise Testing Pipeline

```mermaid
flowchart TD
    Commit[Developer commit / process change] --> Doctor[project_doctor.sh]
    Doctor --> Unit[Unit tests<br/>PyTest]
    Unit --> API[API tests<br/>FastAPI TestClient / future Karate]
    API --> Contract[Contract tests<br/>API catalog / future Pact]
    Contract --> UI[UI/E2E<br/>Playwright]
    UI --> Visual[Visual tests<br/>future Applitools/Percy]
    Visual --> A11y[Accessibility<br/>future Axe/Lighthouse]
    A11y --> Security[Security scans<br/>future Semgrep/ZAP/Trivy]
    Security --> Perf[Performance<br/>future k6/Locust]
    Perf --> AI[AI/RAG evaluation<br/>RAGAS/DeepEval/Promptfoo target]
    AI --> Governance[Governance validation<br/>RBAC now / OPA target]
    Governance --> Observability[Observability validation<br/>correlation IDs now / OpenTelemetry target]
    Observability --> ProcessSuites[Per-process smoke/full suites<br/>process_test_plan.py]
    ProcessSuites --> Release{Promotion gate}
    Release -->|pass| Deploy[Deploy / keep scheduled cron]
    Release -->|fail| Fix[Block release and remediate]
    Fix --> Doctor
```

## 4. Cron Scheduling Flow

```mermaid
flowchart LR
    Catalog[PROCESS_AGENT_CRON_CATALOG.json<br/>53 process entries]
    Export[process_test_plan.py export-cron]
    Crontab[Reviewed crontab install]
    Smoke[Daily smoke schedule<br/>01:00-04:59]
    Full[Weekly full schedule<br/>02:00-06:59]
    Run[process_test_plan.py run]
    OpenClaw[OpenClaw bridge]
    Queues[(Redis queues)]
    Workers[Agent workers]
    Log[logs/process-test-cron.log]

    Catalog --> Export
    Export --> Crontab
    Crontab --> Smoke
    Crontab --> Full
    Smoke --> Run
    Full --> Run
    Run --> OpenClaw
    OpenClaw --> Queues
    Queues --> Workers
    Run --> Log
    Workers --> Log
```

## 5. Agent Assignment Flow

```mermaid
flowchart TD
    ProcessName[Process name + department route] --> Rules{Agent assignment rules}
    Rules -->|forecast / prediction / sensing / drift| AIML[ai-ml-test-agent]
    Rules -->|compliance / audit / risk / governance / ESG| Gov[governance-test-agent]
    Rules -->|quality / defect / validation / complaint| Quality[quality-test-agent]
    Rules -->|route / shipment / tracking / freight / network| Logistics[logistics-process-test-agent]
    Rules -->|inventory / stock / supplier / vendor / contract| Supply[supply-procurement-test-agent]
    Rules -->|production / batch / yield / capacity / maintenance| Ops[operations-test-agent]
    Rules -->|customer / churn / CLV / personalization / campaign| Customer[customer-analytics-test-agent]
    Rules -->|finance / revenue / profit / cashflow / spend| Finance[finance-test-agent]
    Rules -->|fallback| General[process-test-agent]

    AIML --> Review[council-governance-review-agent for weekly full runs]
    Gov --> Review
    Quality --> Review
    Logistics --> Review
    Supply --> Review
    Ops --> Review
    Customer --> Review
    Finance --> Review
    General --> Review
```

## 6. Subprocess Test Coverage Graph

```mermaid
flowchart LR
    Suite[Process suite] --> Input[input_contract_validation]
    Suite --> Logic[service_business_logic]
    Suite --> Data[data_quality_and_lineage]
    Suite --> AI[ai_quality_and_explainability]
    Suite --> Security[security_governance_rbac]
    Suite --> Resilience[performance_resilience_observability]
    Suite --> HITL[human_workflow_and_approval]

    Input --> A1[api-contract-test-agent]
    Logic --> A2[functional-test-agent]
    Data --> A3[data-quality-test-agent]
    AI --> A4[ai-evaluation-test-agent]
    Security --> A5[security-governance-test-agent]
    Resilience --> A6[resilience-observability-test-agent]
    HITL --> A7[hitl-workflow-test-agent]
```

## 7. Run Commands

```bash
# Inspect process suites
./scripts/process_test_plan.py list
./scripts/process_test_plan.py list --dept sales

# Export cron entries
./scripts/process_test_plan.py export-cron --mode smoke
./scripts/process_test_plan.py export-cron --mode full --dept supply-chain

# Dry-run one payload
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full --dry-run

# Submit one process test through OpenClaw
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full

# Monitor workers
./scripts/agent_fleet.sh watch
```
