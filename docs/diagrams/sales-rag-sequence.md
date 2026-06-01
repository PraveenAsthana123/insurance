# Sales AI Explain — RAG Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Browser)
    participant V as Vite Proxy :5173
    participant M as CorrelationIdMiddleware
    participant R as RBACMiddleware
    participant RT as /api/v1/ai/explain
    participant RAG as RAGService
    participant BM25 as BM25 Index
    participant NUMPY as numpy Cosine
    participant OLL as Ollama (qwen2.5)
    participant FS as sales-context/*.md

    U->>V: POST /api/v1/ai/explain<br/>{question, context}<br/>X-Demo-Role: manager
    V->>M: proxied request
    M->>M: set correlation_id contextvar<br/>emit http.request (start)
    M->>R: call_next
    R->>R: check matrix for POST /api/v1/ai/explain<br/>role=manager → allowed
    R->>RT: call_next
    RT->>RAG: explain(req)
    alt First call per process
        RAG->>FS: read 4 .md files, split on H2
        RAG->>OLL: POST /embeddings × 20 chunks
        RAG->>BM25: build inverted index
    end
    RAG->>RAG: redact PII in question
    RAG->>OLL: POST /embeddings (query)
    RAG->>BM25: get_scores(query tokens)
    RAG->>NUMPY: cosine(query_embed, chunk_embeds)
    RAG->>RAG: hybrid score = 0.5 × cosine + 0.5 × bm25<br/>top-3 after sort
    RAG->>OLL: POST /generate (prompt + top-3 snippets)
    OLL-->>RAG: markdown response with [ref N] tags
    RAG->>RAG: build Citation objects, enforce [ref 1] guardrail
    RAG->>RAG: emit ai.explain event
    RAG-->>RT: ExplainResponse
    RT-->>R: JSONResponse
    R-->>M: response
    M->>M: emit http.request (end)<br/>add X-Correlation-Id header
    M-->>V: response
    V-->>U: response
```

**Key latency contributors (cold-cache):** Ollama embedding calls (~400 ms × 20 = 8 s), Ollama generation (~2-4 s). Subsequent calls skip the index-build — only query-embed + generation run (~3 s total).

**Guardrails active in this flow:** PII redaction (email, phone), timeout (30 s), `[ref N]` required in response, max tokens capped at 800.
