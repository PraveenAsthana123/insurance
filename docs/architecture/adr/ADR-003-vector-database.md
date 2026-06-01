# ADR-003: ChromaDB embedded for first 100M vectors; Qdrant when scaling out

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: ai, vector, retrieval

## Context

RAG pipelines need persistent vector storage. Candidates:
1. ChromaDB (embedded, single-node, Python-native)
2. Pinecone (managed SaaS)
3. Qdrant (open-source, can self-host or cloud)
4. Weaviate (open-source, GraphQL surface)
5. pgvector (Postgres extension)

## Decision

**ChromaDB embedded for first 100M vectors. Plan Qdrant migration for cluster scale.**

## Rationale

- Already wired in `backend/ml/reference/rag_lifecycle.py`
- Python-native (no separate process to manage in docker-compose)
- Persistent across restarts
- Single-node ceiling: ~100M vectors before degradation
- Embedded means no separate network hop

## Consequences

### Positive
- Zero-config setup; works in dev + prod single-node
- No additional service in docker-compose
- Python API matches sentence-transformers naturally

### Negative
- Single-node ceiling caps growth
- No native multi-tenancy (we enforce via tenant_id metadata + filter)
- Slower than Qdrant for very-high-QPS workloads

## Alternatives considered

- **Pinecone**: Excellent but vendor lock + cost; PHI requires BAA
- **Qdrant**: Better for cluster; defer until needed
- **pgvector**: Operationally simpler (one DB) but slower for >10M vectors
- **Weaviate**: GraphQL is over-feature for this domain

## Migration trigger

Move to Qdrant cluster when:
- Vector count > 50M sustained
- Per-tenant isolation needs hardware-level (not metadata-filter)
- QPS > 100/s with p99 > 100ms

## References

- ADR-002 (LLM provider) — composes for RAG stack
- `backend/ml/reference/rag_lifecycle.py`
- Global §39 RAG architecture standards
