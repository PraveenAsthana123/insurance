# HOLY Beverage — Retail Operations — Sequence Flow

> Per global §47 (C4 L4 dynamic view) + §38 (request_id propagated end-to-end)
> + §57.6 (canonical fields on every span) + §64 (per-dept artifact).
> Mermaid sequence diagrams below render in GitHub + IDE preview + mkdocs.

## 1. Inbound API request → audit row (canonical flow)

The contract for every dept-scoped HOLY API call:

```mermaid
sequenceDiagram
    autonumber
    participant U as User / Caller
    participant G as API Gateway
    participant M as RBAC Middleware
    participant R as Router
    participant S as Service
    participant Re as Repository
    participant DB as Postgres
    participant A as Audit Log

    U->>G: HTTPS request<br/>X-Tenant-ID + Authorization
    G->>G: rate-limit + correlation_id mint
    G->>M: forward + headers
    M->>M: validate JWT / API key
    M->>M: check scope per §47.6 SOC2 CC6.2
    alt scope denied
        M-->>U: 403 Forbidden + error_code
        M->>A: deny event (request_id, actor, scope_missing)
    else scope ok
        M->>R: invoke
        R->>S: domain call
        S->>Re: query
        Re->>DB: parametrized SQL
        DB-->>Re: rows
        Re-->>S: domain objects
        S-->>R: result
        R-->>U: 200 + Pydantic envelope
        R->>A: success event (request_id, latency_ms, outcome=ok)
    end
```

## 2. Recurring cron job execution (per §65.8.5 + §66)

The 4 recurring jobs (data refresh / retrain / accuracy drift / analysis
rollup) all share this shape:

```mermaid
sequenceDiagram
    autonumber
    participant B as Celery Beat
    participant W as Celery Worker
    participant FS as Filesystem<br/>data/eval/cron/
    participant API as Monitoring API
    participant D as Dashboard

    B->>W: dispatch task (kwargs: depts=[19], cadence)
    activate W
    W->>W: BEV_DISABLE_<NAME>=1? skip
    loop per dept (max max_minutes)
        W->>W: work for this dept
        W->>FS: write per-dept artifact
    end
    W->>FS: manifest.json (audit row keyed by run_id)
    deactivate W
    D->>API: GET /api/v1/holy/monitoring/retail-operations
    API->>FS: scan latest manifest
    FS-->>API: run summary
    API-->>D: status + age + readiness
```

## 3. Dept-primary AI flow — **Footfall + Staffing**

_Sensor counts → forecast model → staff-recommendation → manager push_

```mermaid
sequenceDiagram
    autonumber
    participant Src as Source System
    participant Ing as Ingestion
    participant Q as Data Quality Gate
    participant FE as Feature Engineering
    participant M as ML Model
    participant D as Decision Layer §40
    participant H as Human-in-Loop
    participant Out as Downstream Consumer
    participant A as Audit Row §38.3

    Src->>Ing: data event
    Ing->>Q: validate against contract
    alt quality fail
        Q->>A: data_quality_breach
        Q-->>Src: error
    else quality pass
        Q->>FE: clean dataframe
        FE->>M: feature vector
        M-->>D: prediction + confidence
        alt confidence >= 0.8
            D->>Out: auto-decision
        else 0.5 <= confidence < 0.8
            D->>H: queue for review
            H-->>D: human verdict
            D->>Out: human-validated decision
        else confidence < 0.5
            D->>A: rejected_low_confidence
        end
        D->>A: decision audit (request_id, model_v, confidence, outcome)
    end
```

## 4. 10-layer agentic-stack execution (per §64.40)

When a user types a goal in `/holy/retail-operations/agentic`:

```mermaid
sequenceDiagram
    autonumber
    participant U as User Goal
    participant C as Council §64.43#2
    participant P as Planner
    participant Dec as Decomposer
    participant Pol as Policy Engine
    participant CUA as CUA Orchestrator
    participant SH as Stagehand
    participant PW as Playwright
    participant T as Target System
    participant ENT as Enterprise App
    participant A as Audit Row §38.3

    U->>C: goal text
    C->>C: author + reviewer + chair
    C->>P: scored interpretation
    P->>Dec: task DAG
    Dec->>Pol: per-task scope_required
    loop per task
        Pol->>Pol: allow / deny / require_human
        alt denied
            Pol->>A: policy denial
        else allowed
            Pol->>CUA: execute task
            CUA->>SH: semantic action
            SH->>PW: low-level browser
            PW->>T: navigate + interact
            T-->>PW: DOM
            PW-->>SH: result
            SH-->>CUA: structured
            CUA->>ENT: side-effect API call
            ENT-->>CUA: external_record_id
        end
    end
    CUA->>A: full 10-layer audit row
```

## 5. RAG retrieval — citation contract (per §48.5)

For any RAG-backed answer in this dept:

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant API as RAG API
    participant CB as Cache
    participant E as Embedder
    participant V as Vector DB
    participant K as Keyword Index
    participant R as Reranker
    participant LLM as LLM
    participant G as Guardrail
    participant A as Audit Row §48.5

    U->>API: question + tenant_id
    API->>CB: cache key
    alt cache hit (≠ PII)
        CB-->>API: cached answer
        API-->>U: result + cache_hit=true
        Note over API: cache replays do NOT contribute to latency p95
    else cache miss
        API->>E: embed question
        E-->>API: vector
        par
            API->>V: top-k vector search
            and
            API->>K: keyword search (hybrid)
        end
        V-->>API: candidate chunks
        K-->>API: candidate chunks
        API->>R: rerank merged candidates
        R-->>API: top-N reranked
        API->>LLM: prompt + context + citation instruction
        LLM-->>API: answer + cited chunk_ids
        API->>G: input + output filter
        alt guardrail fires
            G->>A: guardrail_triggered
            G-->>U: filtered/refused
        else clean
            G-->>API: passthrough
            API->>A: retrieval trail + prompt_v + model_v + citations + latency
            API-->>U: answer + citations
        end
        API->>CB: store (if non-PII)
    end
```

## 6. Incident escalation (per §64.5)

When monitoring AI detects an anomaly that needs human review:

```mermaid
sequenceDiagram
    autonumber
    participant Mon as Monitoring AI §66
    participant Inc as Incident Service
    participant L1 as L1 Self-Service Bot
    participant L2 as L2 SME
    participant L3 as L3 Engineering
    participant Mgr as Dept Manager
    participant A as Audit Row §38.3

    Mon->>Inc: drift_alert{severity, dept, evidence}
    Inc->>Inc: classify (L1 / L2 / L3)
    alt L1 (top-20 known issue)
        Inc->>L1: route + retrieve runbook (RAG)
        L1-->>Inc: auto-resolved
    else L2 (top-10 escalation)
        Inc->>L2: assign + page
        L2-->>Inc: resolution_notes
    else L3 (P1)
        Inc->>L3: page + open war-room
        Inc->>Mgr: notify
        L3-->>Inc: post-mortem + RCA
    end
    Inc->>A: incident lifecycle row (MTTD + MTTR + level + resolver)
```

## 7. Cross-references (§49 compose-footer)

- [`HOLY_HLD.md`](../hld/HOLY_HLD.md) — system shape these sequences run within
- [`HOLY_LLD.md`](../lld/HOLY_LLD.md) — class/method-level expansion of each lane
- [`HOLY_NETWORK_FLOW.md`](../network-flow/HOLY_NETWORK_FLOW.md) — runtime topology these sequences traverse
- [`HOLY_FRD.md`](../frd/HOLY_FRD.md) — functional requirements each sequence implements
- [`HOLY_BRD.md`](../brd/HOLY_BRD.md) — business goals each sequence ultimately serves
- [`HOLY_FLOW.md`](../../business-layer/HOLY_FLOW.md) — sibling manual-vs-automatic flow comparison
- [`HOLY_PROCESS_MGMT.md`](../../business-layer/HOLY_PROCESS_MGMT.md) — full IPO + TODO + task catalog
- [`HOLY_MONITORING_AI.md`](../../business-layer/HOLY_MONITORING_AI.md) — runtime evidence each sequence produced

---

## Rendering

GitHub renders Mermaid in markdown natively. For local preview:

```bash
# IDE: VSCode + "Markdown Preview Mermaid Support" extension
# CLI:
npx -p @mermaid-js/mermaid-cli mmdc -i HOLY_SEQUENCE.md -o sequence.svg
```

## The contract

Every sequence above MUST carry the request_id end-to-end (Mermaid does
not show every field — the canonical envelope §57.6 is assumed on every
arrow). Per global §38, the final lane in every sequence is the audit
row; a sequence that doesn't terminate in an audit write is incomplete.
