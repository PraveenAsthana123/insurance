#!/usr/bin/env python3
"""end_to_end_demo — actually wire all the pieces.

Per operator: "all the process, data, model, accuracy, rag, bot UI,
all the data vector, vector less, graph db"

Phase 1 TRAIN     — UW medical_cost → sklearn + xgboost → R²/RMSE/MAE
Phase 2 INDEX     — claims docs → chunk → embed (Ollama) → Chroma + BM25 + networkx
Phase 3 QUERY     — 3 queries × (vector + bm25 + graph) → LLM answer + audit row
Phase 4 METRICS   — summary.json

Persistent state: ChromaDB (its own files); BM25 + graph as JSON
(no pickle — per project security policy).
"""
from __future__ import annotations
import json
import logging
import os
import re
import sys
import time
import uuid
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("chromadb").setLevel(logging.WARNING)

REPO = Path(__file__).resolve().parent.parent
RUN_ID = f"e2e-{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}-{uuid.uuid4().hex[:6]}"
OUT_DIR = REPO / "data" / "eval" / "end_to_end" / RUN_ID
OUT_DIR.mkdir(parents=True, exist_ok=True)

OLLAMA = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text:latest")
CHAT_MODEL = os.getenv("CHAT_MODEL", "qwen2.5:latest")

import httpx
import numpy as np


def step(n, name): print(f"\n\033[1;34m═══ PHASE {n}: {name} ═══\033[0m")
def info(msg): print(f"  {msg}")
def ok(msg): print(f"  \033[1;32m✓ {msg}\033[0m")
def warn(msg): print(f"  \033[1;33m⚠ {msg}\033[0m")


# ─────────────────────────────────────────────────────────────────────────
# Phase 1 — TRAIN
# ─────────────────────────────────────────────────────────────────────────
def phase_1_train():
    step(1, "TRAIN — UW medical_cost regression")
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline

    CSV = REPO / "data" / "insurance" / "underwriting" / "medical_cost" / "insurance.csv"
    df = pd.read_csv(CSV)
    info(f"loaded {len(df):,} rows from {CSV.name}")

    y = df["charges"]
    X = df.drop(columns=["charges"])
    cat_cols = ["sex", "smoker", "region"]
    num_cols = [c for c in X.columns if c not in cat_cols]

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ("num", "passthrough", num_cols),
    ])

    metrics = {}
    try:
        import xgboost as xgb
        models = {
            "RandomForest":     RandomForestRegressor(n_estimators=100, random_state=42),
            "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
            "XGBoost":          xgb.XGBRegressor(n_estimators=100, random_state=42),
        }
    except ImportError:
        models = {
            "RandomForest":     RandomForestRegressor(n_estimators=100, random_state=42),
            "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
        }

    for name, est in models.items():
        t = time.time()
        pipe = Pipeline([("pre", pre), ("model", est)])
        pipe.fit(X_tr, y_tr)
        pred = pipe.predict(X_te)
        metrics[name] = {
            "r2": float(r2_score(y_te, pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_te, pred))),
            "mae": float(mean_absolute_error(y_te, pred)),
            "train_time_sec": time.time() - t,
        }
        m = metrics[name]
        ok(f"{name:18s}  R²={m['r2']:.4f}  RMSE={m['rmse']:9.2f}  "
           f"MAE={m['mae']:8.2f}  ({m['train_time_sec']:.1f}s)")

    best = max(metrics.items(), key=lambda kv: kv[1]["r2"])
    info(f"\n  best: {best[0]} (R² = {best[1]['r2']:.4f})")

    (OUT_DIR / "metrics.json").write_text(json.dumps({
        "dataset": str(CSV.relative_to(REPO)),
        "n_train": len(X_tr), "n_test": len(X_te),
        "models": metrics,
        "best_model": best[0],
    }, indent=2))
    return {"best": best[0], "metrics": metrics}


# ─────────────────────────────────────────────────────────────────────────
# Phase 2 — INDEX
# ─────────────────────────────────────────────────────────────────────────
def chunk_text(text, size=400, overlap=60):
    paras = re.split(r"\n\n+", text)
    chunks = []; cur = ""
    for p in paras:
        if len(cur) + len(p) < size:
            cur += "\n\n" + p
        else:
            if cur.strip(): chunks.append(cur.strip())
            cur = p
    if cur.strip(): chunks.append(cur.strip())
    out = []
    for i, c in enumerate(chunks):
        if i > 0:
            out.append(chunks[i-1][-overlap:] + " " + c)
        else:
            out.append(c)
    return out


def embed_batch(texts):
    embeds = []
    with httpx.Client(timeout=60.0) as client:
        for t in texts:
            r = client.post(f"{OLLAMA}/api/embeddings",
                            json={"model": EMBED_MODEL, "prompt": t})
            r.raise_for_status()
            embeds.append(r.json()["embedding"])
    return np.array(embeds, dtype=np.float32)


def phase_2_index():
    step(2, "INDEX — chunk + embed + 3-way (vector + BM25 + graph)")
    import chromadb
    from rank_bm25 import BM25Okapi
    import networkx as nx

    corpus_files = sorted(
        (REPO / "global-ai-org" / "departments").glob("*/business-layer/INSUR_*.md")
    )
    info(f"corpus: {len(corpus_files)} dept docs")

    all_chunks = []
    for f in corpus_files:
        dept = f.parts[-3]; doc = f.stem
        for i, c in enumerate(chunk_text(f.read_text())):
            all_chunks.append({
                "id": f"{dept}/{doc}/{i}",
                "dept": dept, "doc": doc, "chunk_idx": i, "text": c,
            })
    info(f"chunks: {len(all_chunks)}")

    # ── Vector — ChromaDB ─────────────────────────────────────────
    info("embedding via Ollama nomic-embed-text (slow part)...")
    t = time.time()
    texts = [c["text"] for c in all_chunks]
    BATCH = 16
    all_emb = []
    for i in range(0, len(texts), BATCH):
        all_emb.append(embed_batch(texts[i:i+BATCH]))
    embeddings = np.vstack(all_emb)
    embed_time = time.time() - t
    ok(f"embedded {len(texts)} chunks ({embeddings.shape[1]}-dim) in {embed_time:.1f}s")

    chroma_dir = OUT_DIR / "chroma"
    chroma_dir.mkdir(exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    try: client.delete_collection("insurance")
    except Exception: pass
    coll = client.create_collection(name="insurance", metadata={"created": RUN_ID})
    coll.add(
        ids=[c["id"] for c in all_chunks],
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=[{"dept": c["dept"], "doc": c["doc"]} for c in all_chunks],
    )
    ok(f"ChromaDB persisted at {chroma_dir.relative_to(REPO)}")

    # ── BM25 — JSON-serializable: store tokenized corpus + chunk metadata ──
    tokenized = [t.lower().split() for t in texts]
    bm25 = BM25Okapi(tokenized)
    # Persist the corpus so we can rebuild bm25 at query time
    (OUT_DIR / "bm25_corpus.json").write_text(json.dumps({
        "tokenized": tokenized,
        "chunks": [{"id": c["id"], "text": c["text"], "dept": c["dept"], "doc": c["doc"]}
                   for c in all_chunks],
    }))
    ok(f"BM25 corpus saved ({len(tokenized)} docs) → bm25_corpus.json")

    # ── Graph — networkx (serialized as node-link JSON) ───────────
    G = nx.MultiDiGraph()
    entity_kinds = {
        "Agent": r"\b([A-Z][a-z]+ )+(Agent|Copilot|Assistant)\b",
        "Process": r"\b(FNOL|Underwriting|Pricing|Claim Intake|Validation|Settlement|Fraud|Investigation|Assessment|Compliance)\b",
        "Metric": r"\b(NPS|CSAT|AUC|RMSE|MAE|F1|Precision|Recall|Loss Ratio|Combined Ratio|MTTR|MTTD|STP|FCR|AHT)\b",
        "Tech": r"\b(Ollama|Whisper|ChromaDB|MLflow|FastAPI|Postgres|Redis|Vault|Keycloak|OPA|Pinecone|Neo4j|XGBoost|GradientBoosting|RandomForest)\b",
    }
    edges = 0
    for c in all_chunks:
        chunk_id = c["id"]
        G.add_node(chunk_id, kind="Chunk")
        G.add_node(c["dept"], kind="Dept")
        G.add_node(f"{c['dept']}/{c['doc']}", kind="Doc")
        G.add_edge(c["dept"], f"{c['dept']}/{c['doc']}", rel="HAS_DOC")
        G.add_edge(f"{c['dept']}/{c['doc']}", chunk_id, rel="HAS_CHUNK")
        edges += 2
        for kind, pat in entity_kinds.items():
            for m in re.finditer(pat, c["text"]):
                ent = m.group(0).strip()
                G.add_node(ent, kind=kind)
                G.add_edge(chunk_id, ent, rel="MENTIONS")
                edges += 1

    # node-link JSON (deterministic; no pickle)
    graph_data = {
        "nodes": [{"id": n, **G.nodes[n]} for n in G.nodes],
        "edges": [{"src": u, "dst": v, **d} for u, v, d in G.edges(data=True)],
    }
    (OUT_DIR / "graph.json").write_text(json.dumps(graph_data))
    ok(f"graph: {G.number_of_nodes():,} nodes, {edges:,} edges → graph.json")

    return {
        "chunks": len(all_chunks),
        "embed_dim": embeddings.shape[1],
        "embed_time_sec": embed_time,
        "graph_nodes": G.number_of_nodes(),
        "graph_edges": edges,
    }


# ─────────────────────────────────────────────────────────────────────────
# Phase 3 — QUERY
# ─────────────────────────────────────────────────────────────────────────
QUERIES = [
    "What is the auto approval threshold in the claims department?",
    "Which AI agents handle underwriting risk scoring?",
    "How does fraud detection use SHAP for explainability?",
]


def llm_ask(prompt):
    t = time.time()
    with httpx.Client(timeout=120.0) as client:
        r = client.post(f"{OLLAMA}/api/generate",
                        json={"model": CHAT_MODEL, "prompt": prompt, "stream": False})
        r.raise_for_status()
        data = r.json()
    return data.get("response", "").strip(), {
        "tokens": data.get("eval_count", 0),
        "latency_ms": int((time.time() - t) * 1000),
        "model": CHAT_MODEL,
    }


def phase_3_query(index_info):
    step(3, "QUERY — 3-way retrieval + LLM + audit row")
    import chromadb
    from rank_bm25 import BM25Okapi
    import networkx as nx

    client = chromadb.PersistentClient(path=str(OUT_DIR / "chroma"))
    coll = client.get_collection("insurance")

    bm25_data = json.loads((OUT_DIR / "bm25_corpus.json").read_text())
    bm25 = BM25Okapi(bm25_data["tokenized"])
    chunks = bm25_data["chunks"]

    gd = json.loads((OUT_DIR / "graph.json").read_text())
    G = nx.MultiDiGraph()
    for n in gd["nodes"]: G.add_node(n["id"], **{k: v for k, v in n.items() if k != "id"})
    for e in gd["edges"]: G.add_edge(e["src"], e["dst"], **{k: v for k, v in e.items() if k not in ("src", "dst")})

    audit_path = OUT_DIR / "audit.jsonl"
    f_out = open(audit_path, "w")
    summary = []

    for qi, query in enumerate(QUERIES, 1):
        print(f"\n  Q{qi}: \033[1;36m{query}\033[0m")

        q_emb = embed_batch([query])[0].tolist()
        v_hits = coll.query(query_embeddings=[q_emb], n_results=3)
        v_top = [{"id": v_hits["ids"][0][i],
                  "dist": v_hits["distances"][0][i],
                  "text": v_hits["documents"][0][i][:120]}
                 for i in range(len(v_hits["ids"][0]))]

        scores = bm25.get_scores(query.lower().split())
        b_idx = np.argsort(scores)[::-1][:3]
        b_top = [{"id": chunks[i]["id"], "score": float(scores[i]),
                  "text": chunks[i]["text"][:120]} for i in b_idx]

        graph_neighbors = []
        try:
            top_chunk_id = v_top[0]["id"]
            for u, v_node, data in G.out_edges(top_chunk_id, data=True):
                if data.get("rel") == "MENTIONS":
                    entity = v_node
                    coments = [n for n in G.predecessors(entity)][:3]
                    graph_neighbors.append({"entity": entity,
                                             "kind": G.nodes[entity].get("kind", "?"),
                                             "co_mentioned_in": coments})
        except Exception as e:
            warn(f"graph: {e}")

        ok(f"vector top: {v_top[0]['id']} (dist={v_top[0]['dist']:.3f})")
        ok(f"bm25 top:   {b_top[0]['id']} (score={b_top[0]['score']:.2f})")
        ok(f"graph: {len(graph_neighbors)} 1-hop entities")

        ctx_ids = {h["id"] for h in v_top} | {h["id"] for h in b_top}
        ctx_chunks = [c for c in chunks if c["id"] in ctx_ids]
        context = "\n\n---\n".join(f"[{c['id']}]\n{c['text']}" for c in ctx_chunks[:5])
        prompt = (
            f"You are an insurance domain assistant. Answer using ONLY the "
            f"provided context. Cite source IDs in brackets.\n\n"
            f"=== CONTEXT ===\n{context[:4000]}\n\n"
            f"=== QUESTION ===\n{query}\n\n=== ANSWER ==="
        )
        info("calling LLM...")
        answer, meta = llm_ask(prompt)
        preview = (answer or "(empty)").split("\n")[0][:200]
        print(f"  \033[1;32mA{qi}:\033[0m {preview}")
        info(f"  ({meta['tokens']} tok · {meta['latency_ms']}ms · {meta['model']})")

        row = {
            "request_id": str(uuid.uuid4()),
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "query": query, "answer": answer,
            "retrieval": {"vector_top": v_top, "bm25_top": b_top,
                          "graph_neighbors": graph_neighbors,
                          "context_chunks": [c["id"] for c in ctx_chunks[:5]]},
            "llm": meta, "model_version": meta["model"],
            "embedding_version": EMBED_MODEL, "tenant_id": "default",
            "actor": "end_to_end_demo",
        }
        f_out.write(json.dumps(row) + "\n")
        summary.append({"query": query, "answer_preview": preview,
                        "tokens": meta["tokens"], "latency_ms": meta["latency_ms"]})

    f_out.close()
    ok(f"\n  {len(QUERIES)} queries × audit rows → audit.jsonl")
    return {"queries": summary, "audit_file": str(audit_path.relative_to(REPO))}


# ─────────────────────────────────────────────────────────────────────────
# Phase 4 — METRICS
# ─────────────────────────────────────────────────────────────────────────
def phase_4_metrics(train_res, index_res, query_res):
    step(4, "METRICS — end-to-end summary")
    summary = {"run_id": RUN_ID, "out_dir": str(OUT_DIR.relative_to(REPO)),
               "phase_1_train": train_res, "phase_2_index": index_res,
               "phase_3_query": query_res}
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    print()
    print(f"  ML accuracy (best): R² = {train_res['metrics'][train_res['best']]['r2']:.4f}")
    print(f"  Embed dim: {index_res['embed_dim']}  chunks: {index_res['chunks']}")
    print(f"  Graph: {index_res['graph_nodes']:,} nodes / {index_res['graph_edges']:,} edges")
    print(f"  Queries answered: {len(query_res['queries'])}")
    avg_lat = sum(q["latency_ms"] for q in query_res["queries"]) / len(query_res["queries"])
    print(f"  Avg LLM latency: {avg_lat:.0f}ms")
    print(f"\n  All artifacts: {OUT_DIR}")
    print(f"  Inspect: cat {OUT_DIR / 'audit.jsonl'} | head")


if __name__ == "__main__":
    print(f"\033[1;34m═══ end_to_end_demo  run_id={RUN_ID} ═══\033[0m")
    print(f"  out: {OUT_DIR}")
    print(f"  ollama: {OLLAMA}  embed={EMBED_MODEL}  chat={CHAT_MODEL}")
    t0 = time.time()
    try:
        train_res = phase_1_train()
        index_res = phase_2_index()
        query_res = phase_3_query(index_res)
        phase_4_metrics(train_res, index_res, query_res)
        print(f"\n\033[1;32mTOTAL: {time.time()-t0:.1f}s\033[0m")
    except Exception as e:
        print(f"\n\033[1;31mFAIL: {type(e).__name__}: {e}\033[0m")
        import traceback; traceback.print_exc()
        sys.exit(1)
