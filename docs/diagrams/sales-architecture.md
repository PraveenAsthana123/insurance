# Sales Flagship — Container View (C4-lite)

```mermaid
graph TB
    subgraph Browser["Browser (localhost:5173)"]
        UI[React + Vite]
        LS[(localStorage<br/>insur.role)]
    end

    subgraph Dev["Dev host"]
        Vite[Vite dev server<br/>proxy /api → :8001]
        BE[FastAPI backend<br/>uvicorn :8001]
        subgraph Middleware["Middleware stack"]
            CID[CorrelationId]
            RBAC[RBAC demo-mode]
        end
        subgraph Services["Services"]
            FS[ForecastService<br/>+ LRU cache]
            SS[SimulationService]
            RAG[RAGService]
        end
        REPO[SalesRepo]
        PG[(Postgres 16<br/>1.017M rows)]
        OLL[Ollama<br/>qwen2.5:latest :11434]
        CTX[(data/sales-context/<br/>*.md)]
    end

    UI --> Vite
    UI <--> LS
    Vite --> BE
    BE --> CID
    CID --> RBAC
    RBAC --> Services
    FS --> REPO
    SS --> FS
    REPO --> PG
    RAG --> OLL
    RAG --> CTX
    FS --> OLL

    classDef dim fill:#eef2ff,stroke:#6366f1
    classDef core fill:#dbeafe,stroke:#3b82f6
    classDef ext fill:#dcfce7,stroke:#16a34a
    class UI,Vite,BE core
    class PG,OLL,CTX ext
    class CID,RBAC,FS,SS,RAG,REPO dim
```

**Notes:**
- Vite proxy removes CORS concerns in dev. Production uses nginx or equivalent.
- No real auth — `insur.role` in localStorage feeds `X-Demo-Role` header; middleware enforces the matrix.
- `data/sales-context/` is hand-authored markdown for RAG grounding.
