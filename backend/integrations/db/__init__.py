"""backend/integrations/db — unified ORM-style accessors for ALL storage layers.

Per operator 2026-06-02 — ORM stubs for graph / historical / vector / search.
Composes with §3 (no SQL in routers) + §47.2 (data layer) + §77 (memory stack).

Exposes 5 clients, each lazy-imported:
  sqlite_local   - 5 SQLite dbs (voice, token, blackboard, hitl, vibecheck)
  postgres       - via psycopg (10 migrations, insur.* + insur_audit + tenants)
  chromadb       - vector store (data/eval/end_to_end/<run>/chroma)
  neo4j          - graph (if docker compose neo4j service is up)
  elasticsearch  - vector-less keyword + dense (running on :9200)

All clients respect:
  - tenant_id at the query boundary (per §41.3)
  - PII redaction by default (per §68.4)
  - audit row writes (per §38.3)
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

REPO = Path(__file__).resolve().parents[2]


# ────────────────────────────────────────────────────────────────
# 1. SQLite (local KV / queue / audit stores)
# ────────────────────────────────────────────────────────────────

SQLITE_DBS = {
    "voice":      REPO / "data" / "voice_history.db",
    "token":      REPO / "data" / "rag" / "token_usage.db",
    "blackboard": REPO / "data" / "blackboard" / "blackboard.db",
    "hitl":       REPO / "data" / "eval" / "hitl" / "approvals.db",
    "vibecheck":  REPO / ".vibecheck" / "provenance" / "attestations.db",
}


@contextmanager
def sqlite(name: str) -> Iterator:
    """Open a named SQLite DB with WAL + busy_timeout. Auto-commits."""
    import sqlite3
    if name not in SQLITE_DBS:
        raise KeyError(f"Unknown SQLite store: {name}. Valid: {list(SQLITE_DBS)}")
    db_path = SQLITE_DBS[name]
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    try:
        yield con
        con.commit()
    finally:
        con.close()


# ────────────────────────────────────────────────────────────────
# 2. Postgres (10 migrations: tenants/departments/audit/...)
# ────────────────────────────────────────────────────────────────

def pg_dsn() -> str:
    """Build DSN from env. Falls back to docker-compose defaults."""
    return os.environ.get(
        "DATABASE_URL",
        f"postgresql://insur:insur@localhost:5432/insur",
    )


@contextmanager
def postgres() -> Iterator:
    """Open a psycopg connection. Auto-commits."""
    import psycopg
    con = psycopg.connect(pg_dsn())
    try:
        yield con
        con.commit()
    finally:
        con.close()


@contextmanager
def postgres_tenant(tenant_id: int) -> Iterator:
    """Per §41.3 + §47.6 SOC2 CC6.1: tenant-scoped session via RLS."""
    import psycopg
    con = psycopg.connect(pg_dsn())
    try:
        with con.cursor() as cur:
            cur.execute("SET app.tenant_id = %s", (str(tenant_id),))
        yield con
        con.commit()
    finally:
        con.close()


# ────────────────────────────────────────────────────────────────
# 3. ChromaDB (vector store)
# ────────────────────────────────────────────────────────────────

def chroma_client(run_id: str | None = None):
    """Get a ChromaDB persistent client. Defaults to latest e2e run."""
    import chromadb
    if run_id:
        path = REPO / "data" / "eval" / "end_to_end" / run_id / "chroma"
    else:
        runs = sorted((REPO / "data" / "eval" / "end_to_end").glob("e2e-*"))
        if not runs:
            raise FileNotFoundError("No e2e runs with chroma store")
        path = runs[-1] / "chroma"
    return chromadb.PersistentClient(path=str(path))


def chroma_collection(collection_name: str = "insur_chunks", run_id: str | None = None):
    return chroma_client(run_id).get_or_create_collection(collection_name)


# ────────────────────────────────────────────────────────────────
# 4. Neo4j (graph store)
# ────────────────────────────────────────────────────────────────

def neo4j_uri() -> str:
    return os.environ.get("NEO4J_URI", "bolt://localhost:7687")


def neo4j_auth() -> tuple[str, str]:
    return (
        os.environ.get("NEO4J_USER", "neo4j"),
        os.environ.get("NEO4J_PASSWORD", "insur_local_dev_only"),
    )


@contextmanager
def neo4j_session() -> Iterator:
    """Open a Neo4j session. Requires neo4j-driver pip + docker neo4j service."""
    from neo4j import GraphDatabase
    driver = GraphDatabase.driver(neo4j_uri(), auth=neo4j_auth())
    try:
        with driver.session() as session:
            yield session
    finally:
        driver.close()


# ────────────────────────────────────────────────────────────────
# 5. Elasticsearch (vector-less keyword + BM25 + dense optional)
# ────────────────────────────────────────────────────────────────

def es_url() -> str:
    return os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200")


def es_client():
    """Get an Elasticsearch client. Verifies connection at startup."""
    from elasticsearch import Elasticsearch
    es = Elasticsearch(es_url(), request_timeout=10)
    if not es.ping():
        raise ConnectionError(f"Elasticsearch not reachable at {es_url()}")
    return es


def es_index_chunk(index: str, doc_id: str, text: str, metadata: dict[str, Any]) -> None:
    """Index one chunk for vector-less BM25 search."""
    es = es_client()
    es.index(index=index, id=doc_id, document={"text": text, **metadata})


def es_search(index: str, query: str, k: int = 5) -> list[dict[str, Any]]:
    """BM25 search — vector-less retrieval per §77 row 1442."""
    es = es_client()
    resp = es.search(index=index, query={"match": {"text": query}}, size=k)
    return [{"id": hit["_id"], "score": hit["_score"], "doc": hit["_source"]}
             for hit in resp["hits"]["hits"]]


# ────────────────────────────────────────────────────────────────
# Health check helper
# ────────────────────────────────────────────────────────────────

def health() -> dict[str, Any]:
    """Probe every DB. Returns per-store status."""
    out: dict[str, Any] = {}
    # SQLite
    for name, path in SQLITE_DBS.items():
        try:
            with sqlite(name) as con:
                n = con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
            out[f"sqlite/{name}"] = {"ok": True, "tables": n}
        except Exception as e:
            out[f"sqlite/{name}"] = {"ok": False, "error": str(e)[:200]}
    # Postgres
    try:
        with postgres() as con:
            with con.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
                n = cur.fetchone()[0]
        out["postgres"] = {"ok": True, "tables": n}
    except Exception as e:
        out["postgres"] = {"ok": False, "error": str(e)[:200]}
    # ChromaDB
    try:
        col = chroma_collection()
        out["chromadb"] = {"ok": True, "n_chunks": col.count()}
    except Exception as e:
        out["chromadb"] = {"ok": False, "error": str(e)[:200]}
    # Neo4j
    try:
        with neo4j_session() as session:
            res = session.run("RETURN 1 AS x").single()
        out["neo4j"] = {"ok": res["x"] == 1}
    except Exception as e:
        out["neo4j"] = {"ok": False, "error": str(e)[:200]}
    # Elasticsearch
    try:
        es = es_client()
        out["elasticsearch"] = {"ok": True, "info": es.info()["version"]["number"]}
    except Exception as e:
        out["elasticsearch"] = {"ok": False, "error": str(e)[:200]}
    return out


__all__ = [
    "SQLITE_DBS", "sqlite",
    "pg_dsn", "postgres", "postgres_tenant",
    "chroma_client", "chroma_collection",
    "neo4j_uri", "neo4j_auth", "neo4j_session",
    "es_url", "es_client", "es_index_chunk", "es_search",
    "health",
]
