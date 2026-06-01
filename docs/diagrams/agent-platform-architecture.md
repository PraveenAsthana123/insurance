# Agent Platform Architecture Diagrams

## 1. Layered Architecture Flow

```mermaid
flowchart TD
    User[User / API / Event / Orchestration] --> Gateway[Gateway Layer<br/>auth, rate limit, websocket, sessions, validation]
    Gateway --> Planner[Planner + Workflow + Policy Layer]
    Planner --> Runtime[Multi-Agent Runtime]
    Runtime --> ToolManager[Tool Manager + Governance]
    Runtime --> Memory[Memory + RAG]
    ToolManager --> Execution[Execution Layer<br/>shell, files, browser, API, Docker, SQL]
    Execution --> External[External Systems<br/>K8s, GitHub, Grafana, Prometheus, DBs]
    Memory --> KG[Vector DB / Knowledge Graph / Ontology target]
    Planner --> Queue[Queue / Scheduler / Event Bus]
    Queue --> Runtime
    Runtime --> Observability[Observability<br/>logs, traces, metrics, tokens, cost]
    ToolManager --> Security[Security + Guardrails<br/>RBAC, ABAC, secrets, sandbox, approvals]
    Observability --> Audit[Audit + Incident Records]
    Security --> Audit
```

## 2. Agent Runtime Flow

```mermaid
flowchart LR
    Task[Receive task] --> Validate[Validate envelope]
    Validate --> Context[Load context and memory]
    Context --> Plan[Plan actions]
    Plan --> Policy[Policy and permission check]
    Policy --> Tool[Execute tool or agent step]
    Tool --> Observe[Capture output and telemetry]
    Observe --> Decide{More steps?}
    Decide -->|yes| Context
    Decide -->|no| Verify[Verify result]
    Verify --> Stream[Stream / return output]
    Stream --> Audit[Audit and persist state]
```

## 3. Tool Governance Flow

```mermaid
flowchart TD
    Call[Tool call request] --> Schema[Schema validation]
    Schema --> Permission[Permission manager]
    Permission --> Risk[Risk analyzer]
    Risk --> Approval{Human approval required?}
    Approval -->|yes| Human[Human approval workflow]
    Human --> Sandbox[Sandbox selection]
    Approval -->|no| Sandbox
    Sandbox --> Execute[Execute tool]
    Execute --> Normalize[Normalize output]
    Normalize --> Audit[Audit log]
    Audit --> Result[Return tool result]
```

## 4. Memory And RAG Flow

```mermaid
flowchart LR
    Input[Task / conversation] --> Short[Short-term memory]
    Input --> Retrieve[Retriever]
    Retrieve --> Vector[Vector index target]
    Retrieve --> Graph[Knowledge graph target]
    Retrieve --> Docs[Runbooks / incidents / policies]
    Vector --> Rerank[Reranker]
    Graph --> Rerank
    Docs --> Rerank
    Rerank --> Inject[Context injector]
    Short --> Inject
    Inject --> Agent[Agent reasoning]
    Agent --> Summary[Summary + citations + evidence]
    Summary --> Long[Long-term memory target]
```

## 5. Governance And Observability Flow

```mermaid
flowchart TD
    Action[Agent action] --> Identity[Agent/user identity]
    Identity --> Policy[Policy engine<br/>RBAC/ABAC/OPA target]
    Policy --> Guardrail[Guardrails<br/>prompt injection, secrets, unsafe exec]
    Guardrail --> Decision{Allow?}
    Decision -->|deny| Denied[Audit denied action]
    Decision -->|approve needed| HITL[Human approval]
    HITL --> Execute[Execute if approved]
    Decision -->|allow| Execute
    Execute --> Telemetry[Telemetry<br/>logs, metrics, traces, token usage]
    Telemetry --> Dashboards[Grafana/Jaeger/Langfuse target]
    Telemetry --> Audit[Audit store]
```
