#!/usr/bin/env python3
"""insur_bot — chat over the end-to-end demo index.

Modes:
  python insur_bot.py ask "your question"        # one-shot CLI
  python insur_bot.py repl                       # interactive CLI
  python insur_bot.py serve [--port 8001]        # FastAPI HTTP + UI

Uses artifacts produced by scripts/end_to_end_demo.py under
data/eval/end_to_end/latest/ (vector + bm25 + graph).

Per §38: every /bot/ask call writes an audit row.
Per §42: read-only over local indexes; no external calls except Ollama.
Per CLAUDE.md security: NO innerHTML — chat UI uses textContent + DOM.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import requests

REPO = Path(__file__).resolve().parents[1]
DATA_ROOT = REPO / "data" / "eval" / "end_to_end"
AUDIT_DIR = REPO / "data" / "eval" / "bot"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.environ.get("INSUR_EMBED_MODEL", "nomic-embed-text:latest")
LLM_MODEL = os.environ.get("INSUR_LLM_MODEL", "qwen2.5:latest")


def latest_run() -> Path:
    runs = sorted(DATA_ROOT.glob("e2e-*"))
    if not runs:
        sys.exit(f"No end-to-end runs found under {DATA_ROOT}. Run scripts/end_to_end_demo.py first.")
    return runs[-1]


def load_indexes(run_dir: Path) -> dict[str, Any]:
    chroma_dir = run_dir / "chroma"
    bm25 = json.loads((run_dir / "bm25_corpus.json").read_text())
    graph = json.loads((run_dir / "graph.json").read_text())
    return {"run_dir": run_dir, "chroma_dir": chroma_dir, "bm25": bm25, "graph": graph}


def embed(text: str) -> list[float]:
    r = requests.post(f"{OLLAMA}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text}, timeout=30)
    r.raise_for_status()
    return r.json()["embedding"]


def vector_search(chroma_dir: Path, query: str, k: int = 4) -> list[dict[str, Any]]:
    import chromadb
    client = chromadb.PersistentClient(path=str(chroma_dir))
    col = client.get_or_create_collection("insur_chunks")
    qv = embed(query)
    res = col.query(query_embeddings=[qv], n_results=k)
    out = []
    for i in range(len(res["ids"][0])):
        out.append({
            "id": res["ids"][0][i],
            "text": res["documents"][0][i],
            "metadata": res["metadatas"][0][i],
            "distance": float(res["distances"][0][i]),
        })
    return out


def bm25_search(bm25_data: dict[str, Any], query: str, k: int = 4) -> list[dict[str, Any]]:
    from rank_bm25 import BM25Okapi
    tokenized = bm25_data["tokenized"]
    chunks = bm25_data["chunks"]
    bm25 = BM25Okapi(tokenized)
    q_tokens = query.lower().split()
    scores = bm25.get_scores(q_tokens)
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    return [{"id": chunks[i]["id"], "text": chunks[i]["text"],
             "metadata": {"dept": chunks[i].get("dept"), "doc": chunks[i].get("doc")},
             "score": float(scores[i])} for i in top_idx]


def graph_neighbors(graph_data: dict[str, Any], query: str, k: int = 5) -> list[str]:
    q_lower = query.lower()
    nodes = graph_data["nodes"]
    matches = []
    for n in nodes:
        nid = str(n["id"]).lower()
        if any(tok in nid for tok in q_lower.split() if len(tok) > 3):
            matches.append(n["id"])
            if len(matches) >= k:
                break
    return matches


def build_context(query: str, idx: dict[str, Any], k: int = 4) -> dict[str, Any]:
    vec_hits = vector_search(idx["chroma_dir"], query, k=k)
    bm25_hits = bm25_search(idx["bm25"], query, k=k)
    graph_hits = graph_neighbors(idx["graph"], query, k=5)

    seen_ids: set[str] = set()
    ctx_chunks: list[dict[str, Any]] = []
    for hit in vec_hits + bm25_hits:
        if hit["id"] in seen_ids:
            continue
        seen_ids.add(hit["id"])
        ctx_chunks.append(hit)
        if len(ctx_chunks) >= 6:
            break

    return {
        "chunks": ctx_chunks,
        "vector_top": vec_hits[0] if vec_hits else None,
        "bm25_top": bm25_hits[0] if bm25_hits else None,
        "graph_neighbors": graph_hits,
    }


def llm_answer(query: str, ctx: dict[str, Any]) -> tuple[str, int]:
    context_text = "\n\n".join(
        f"[{c['metadata'].get('dept', '?')}/{c['metadata'].get('doc', '?')}] {c['text'][:400]}"
        for c in ctx["chunks"]
    )
    prompt = (
        "You are an insurance domain assistant. Answer ONLY from the context below. "
        "If the context does not contain the answer, say so honestly. Cite (dept/doc) tags.\n\n"
        f"CONTEXT:\n{context_text}\n\nQUESTION: {query}\n\nANSWER:"
    )
    t0 = time.time()
    r = requests.post(
        f"{OLLAMA}/api/generate",
        json={"model": LLM_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}},
        timeout=180,
    )
    r.raise_for_status()
    latency_ms = int((time.time() - t0) * 1000)
    return r.json().get("response", "").strip(), latency_ms


def write_audit(req_id: str, query: str, ctx: dict[str, Any], answer: str, latency_ms: int) -> None:
    row = {
        "request_id": req_id,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query": query,
        "llm_model": LLM_MODEL,
        "embed_model": EMBED_MODEL,
        "vector_top": ctx["vector_top"]["id"] if ctx["vector_top"] else None,
        "bm25_top": ctx["bm25_top"]["id"] if ctx["bm25_top"] else None,
        "graph_neighbors": ctx["graph_neighbors"],
        "citations": [c["id"] for c in ctx["chunks"]],
        "answer_len": len(answer),
        "latency_ms": latency_ms,
    }
    with (AUDIT_DIR / "audit.jsonl").open("a") as f:
        f.write(json.dumps(row) + "\n")


def answer_query(query: str, idx: dict[str, Any]) -> dict[str, Any]:
    req_id = f"bot-{uuid.uuid4().hex[:8]}"
    ctx = build_context(query, idx)
    answer, latency_ms = llm_answer(query, ctx)
    write_audit(req_id, query, ctx, answer, latency_ms)
    return {
        "request_id": req_id,
        "query": query,
        "answer": answer,
        "citations": [{"id": c["id"], "dept": c["metadata"].get("dept"), "doc": c["metadata"].get("doc")}
                       for c in ctx["chunks"]],
        "vector_top": ctx["vector_top"]["id"] if ctx["vector_top"] else None,
        "bm25_top": ctx["bm25_top"]["id"] if ctx["bm25_top"] else None,
        "graph_neighbors": ctx["graph_neighbors"],
        "latency_ms": latency_ms,
        "llm_model": LLM_MODEL,
    }


# ── HTTP / UI mode (no innerHTML; safe DOM only) ─────────────────────────

UI_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Insur Bot</title>
<style>
 body{font-family:system-ui,sans-serif;margin:0;background:#f5f6f8;color:#1a1a1a;}
 header{background:#0b3d91;color:#fff;padding:14px 20px;font-weight:600;}
 main{max-width:860px;margin:20px auto;padding:0 14px;}
 #log{background:#fff;border:1px solid #d6d8de;border-radius:8px;padding:14px;min-height:300px;
   max-height:62vh;overflow-y:auto;}
 .msg{margin:10px 0;padding:10px 12px;border-radius:6px;line-height:1.4;white-space:pre-wrap;}
 .user{background:#eaf2ff;}
 .bot{background:#f0f7ed;}
 .meta{font-size:12px;color:#666;margin-top:6px;}
 form{display:flex;gap:8px;margin-top:14px;}
 input[type=text]{flex:1;padding:10px;border:1px solid #c2c5cc;border-radius:6px;font-size:15px;}
 button{padding:10px 16px;background:#0b3d91;color:#fff;border:0;border-radius:6px;cursor:pointer;}
 button:disabled{background:#9aa1ad;cursor:not-allowed;}
 .citations{font-size:12px;color:#444;margin-top:6px;}
 .citations code{background:#fff;padding:1px 4px;border-radius:3px;border:1px solid #ddd;}
</style></head>
<body>
<header>Insur Bot — RAG over insurance dept docs</header>
<main>
  <div id="log" aria-live="polite"></div>
  <form id="f">
    <input id="q" type="text" placeholder="Ask about claims, underwriting, fraud, customer-service..." autocomplete="off" required>
    <button id="b" type="submit">Ask</button>
  </form>
  <p class="meta">Backend: /bot/ask · audit row per request · vector + bm25 + graph fusion</p>
</main>
<script>
(function(){
  var log = document.getElementById('log');
  var form = document.getElementById('f');
  var input = document.getElementById('q');
  var btn = document.getElementById('b');

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    var label = document.createElement('strong');
    label.textContent = role === 'user' ? 'You: ' : 'Bot: ';
    div.appendChild(label);
    var body = document.createElement('span');
    body.textContent = text;
    div.appendChild(body);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function addCitations(parent, data) {
    if (!data || !data.citations || data.citations.length === 0) return;
    var meta = document.createElement('div');
    meta.className = 'citations';
    var lbl = document.createElement('span');
    lbl.textContent = 'Citations: ';
    meta.appendChild(lbl);
    data.citations.slice(0, 6).forEach(function(c, i) {
      if (i > 0) meta.appendChild(document.createTextNode(' · '));
      var code = document.createElement('code');
      code.textContent = c.dept + '/' + c.doc;
      meta.appendChild(code);
    });
    var lat = document.createElement('div');
    lat.className = 'citations';
    lat.textContent = 'Latency: ' + data.latency_ms + 'ms · Model: ' + data.llm_model + ' · req=' + data.request_id;
    parent.appendChild(meta);
    parent.appendChild(lat);
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    addMessage('user', q);
    input.value = '';
    btn.disabled = true;
    var pending = addMessage('bot', '…thinking…');
    fetch('/bot/ask', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query: q})
    }).then(function(r){ return r.json(); }).then(function(d) {
      pending.textContent = '';
      var label = document.createElement('strong');
      label.textContent = 'Bot: ';
      pending.appendChild(label);
      var body = document.createElement('span');
      body.textContent = d.answer || d.detail || '(no answer)';
      pending.appendChild(body);
      addCitations(pending, d);
    }).catch(function(err){
      pending.textContent = '';
      var label = document.createElement('strong');
      label.textContent = 'Bot: ';
      pending.appendChild(label);
      var body = document.createElement('span');
      body.textContent = 'Error: ' + err.message;
      pending.appendChild(body);
    }).finally(function(){
      btn.disabled = false;
      input.focus();
    });
  });
})();
</script>
</body></html>
"""


def serve(port: int) -> None:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import HTMLResponse, JSONResponse
    from pydantic import BaseModel
    import uvicorn

    idx = load_indexes(latest_run())
    app = FastAPI(title="insur-bot", version="0.1")

    class AskRequest(BaseModel):
        query: str

    @app.get("/bot/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "run_dir": str(idx["run_dir"]),
            "chunks": len(idx["bm25"]["chunks"]),
            "graph_nodes": len(idx["graph"]["nodes"]),
            "graph_edges": len(idx["graph"]["edges"]),
            "llm_model": LLM_MODEL,
            "embed_model": EMBED_MODEL,
        }

    @app.post("/bot/ask")
    def ask(req: AskRequest) -> JSONResponse:
        if not req.query.strip():
            raise HTTPException(400, "query required")
        result = answer_query(req.query.strip(), idx)
        return JSONResponse(result)

    @app.get("/bot/ui", response_class=HTMLResponse)
    def ui() -> HTMLResponse:
        return HTMLResponse(UI_HTML)

    @app.get("/")
    def root() -> dict[str, str]:
        return {"ui": f"http://localhost:{port}/bot/ui", "ask": "/bot/ask", "health": "/bot/health"}

    print(f"[insur-bot] serving on http://localhost:{port}/bot/ui")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


def main() -> None:
    ap = argparse.ArgumentParser(description="Insur Bot — RAG chat over end-to-end indexes")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sp_ask = sub.add_parser("ask", help="One-shot question")
    sp_ask.add_argument("question", help="The question to ask")
    sub.add_parser("repl", help="Interactive CLI")
    sp_serve = sub.add_parser("serve", help="Run FastAPI HTTP + UI")
    sp_serve.add_argument("--port", type=int, default=8001)
    args = ap.parse_args()

    if args.cmd == "ask":
        idx = load_indexes(latest_run())
        result = answer_query(args.question, idx)
        print(json.dumps(result, indent=2))
    elif args.cmd == "repl":
        idx = load_indexes(latest_run())
        print(f"[insur-bot] REPL — run_dir={idx['run_dir']}. Ctrl-D / 'quit' to exit.")
        while True:
            try:
                q = input("\n? ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if not q or q in ("quit", "exit"):
                break
            result = answer_query(q, idx)
            print(f"\n{result['answer']}\n")
            print(f"  citations: {', '.join(c['dept'] + '/' + c['doc'] for c in result['citations'][:4])}")
            print(f"  latency: {result['latency_ms']}ms · model: {result['llm_model']}")
    elif args.cmd == "serve":
        serve(args.port)


if __name__ == "__main__":
    main()
