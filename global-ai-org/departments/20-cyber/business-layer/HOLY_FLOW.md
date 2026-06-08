# HOLY_FLOW.md · Dept 20 · Cybersecurity / Fraud Defense

> Generated scaffold per §64.27 · Manual + Automatic flow + Architecture.

## Per-process flow

### Process 1.0 · TODO

#### Manual flow (AS-IS)
```mermaid
graph TB
    User[Actor A] -->|"Step 1 · TODO"| StepA1[Sub-step]
    StepA1 -->|"Step 2"| StepA2[Sub-step]
```

#### Automatic flow (TO-BE)
```mermaid
graph TB
    Trigger[Event] -->|"agent invoke"| LangGraph[LangGraph DAG]
    LangGraph -->|"per §91"| RAG[RAG retrieval]
    LangGraph -->|"per §91"| LLM[WebLLM in browser]
    LangGraph -->|"§38.3"| Audit[Audit row]
```

#### Architecture view (C4 L2)
TODO · per §47.2 C4 model.

#### Per-step table

| # | Actor | Action | AI augmentation | Decision rule | Log/trace point | Fallback path |
|---|---|---|---|---|---|---|
| 1 | TODO | TODO | TODO | TODO | TODO | TODO |

#### Comparison table (Manual vs Auto)

| Metric | Manual | Auto | Delta |
|---|---|---|---|
| Time per instance | TODO | TODO | TODO |
| Error rate | TODO | TODO | TODO |
| Cost | TODO | TODO | TODO |
| Human-touch-points | TODO | TODO | TODO |

Composes with §38.3 · §43 · §47.2 (C4) · §59 (DDD process modeling) · §64.7 (manual/auto tags) · §64.27 · §91.
