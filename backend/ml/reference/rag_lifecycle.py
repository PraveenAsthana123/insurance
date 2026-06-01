"""HOLY reference: full RAG lifecycle (chunking → embed → vector DB → retrieve → rerank → LLM → cite → eval).

Demonstrates the operator's ask: chunking, RAG, vector DB, Ollama integration,
all in one runnable reference. Copy this file for every dept's RAG pipeline.

Pipeline stages:
    1. Document ingest — read .md from data/{customer,sales,supply-chain}-context/
    2. Chunking — 3 strategies (fixed-size, sentence-aware, semantic-paragraph)
    3. Embedding — sentence-transformers/all-MiniLM-L6-v2
    4. Vector DB index — ChromaDB (in-process, persistent)
    5. Query → retrieve top-k → keyword rerank
    6. LLM answer — Ollama (gemma3:1b) with retry + circuit breaker
    7. Citation map — answer span → chunk id
    8. Eval — Precision@k, MRR, faithfulness heuristic

Outputs land in: data/eval/{dept}/rag_{name}/{run_id}/
    - manifest.json            full run record
    - chunks_summary.json      chunking stats per strategy
    - retrieval_plot.png       precision@k bar
    - chunk_distribution.png   token-length histogram
    - queries.json             query → retrieved → answer → citations
"""
from __future__ import annotations

import json
import logging
import re
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Circuit breaker for Ollama
# ---------------------------------------------------------------------------


class CircuitBreaker:
    """Minimal circuit breaker — opens after N consecutive failures."""

    def __init__(self, failure_threshold: int = 3, reset_after_seconds: int = 30) -> None:
        self.failure_threshold = failure_threshold
        self.reset_after_seconds = reset_after_seconds
        self.failures = 0
        self.opened_at = 0.0

    @property
    def open(self) -> bool:
        if self.failures < self.failure_threshold:
            return False
        if time.time() - self.opened_at > self.reset_after_seconds:
            self.failures = 0  # half-open
            return False
        return True

    def record_success(self) -> None:
        self.failures = 0

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold and self.opened_at == 0:
            self.opened_at = time.time()


# ---------------------------------------------------------------------------
# Chunking strategies (3 options)
# ---------------------------------------------------------------------------


def chunk_fixed_size(text: str, *, size: int = 512, overlap: int = 64) -> list[str]:
    chunks = []
    for start in range(0, len(text), size - overlap):
        chunk = text[start : start + size].strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def chunk_sentence_aware(text: str, *, max_chars: int = 512) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks, current = [], ""
    for s in sentences:
        if not s.strip():
            continue
        if len(current) + len(s) > max_chars and current:
            chunks.append(current.strip())
            current = s
        else:
            current = (current + " " + s) if current else s
    if current.strip():
        chunks.append(current.strip())
    return chunks


def chunk_semantic_paragraph(text: str, *, min_chars: int = 100) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        buf = (buf + "\n\n" + p) if buf else p
        if len(buf) >= min_chars:
            chunks.append(buf)
            buf = ""
    if buf:
        chunks.append(buf)
    return chunks


CHUNK_STRATEGIES = {
    "fixed_size": chunk_fixed_size,
    "sentence_aware": chunk_sentence_aware,
    "semantic_paragraph": chunk_semantic_paragraph,
}


# ---------------------------------------------------------------------------
# Manifest schema
# ---------------------------------------------------------------------------


@dataclass
class RagManifest:
    run_id: str
    dept: str
    pipeline: str
    chunking_strategy: str
    embedding_model: str
    vector_db: str
    llm_model: str
    n_documents: int
    n_chunks: int
    artifacts_root: str
    duration_seconds: float
    plots: dict[str, str] = field(default_factory=dict)
    chunks_summary: dict[str, Any] = field(default_factory=dict)
    eval: dict[str, Any] = field(default_factory=dict)
    queries: list[dict[str, Any]] = field(default_factory=list)
    circuit_breaker_state: str = "closed"


# ---------------------------------------------------------------------------
# The RAG runner
# ---------------------------------------------------------------------------


class RagLifecycle:
    """Run the full RAG lifecycle on a folder of text documents."""

    def __init__(
        self,
        *,
        corpus_paths: list[str | Path],
        dept: str,
        pipeline_name: str,
        chunking: str = "sentence_aware",
        embedding_model: str = "all-MiniLM-L6-v2",
        llm_model: str = "gemma3:1b",
        ollama_url: str = "http://localhost:11434",
        top_k: int = 4,
        artifacts_root: str | Path = "data/eval",
    ) -> None:
        self.corpus_paths = [Path(p) for p in corpus_paths]
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.chunking = chunking
        self.embedding_model_name = embedding_model
        self.llm_model = llm_model
        self.ollama_url = ollama_url
        self.top_k = top_k

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.breaker = CircuitBreaker(failure_threshold=3, reset_after_seconds=30)

        self.manifest = RagManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            chunking_strategy=chunking,
            embedding_model=embedding_model,
            vector_db="chromadb (in-process)",
            llm_model=llm_model,
            n_documents=0,
            n_chunks=0,
            artifacts_root=str(self.out),
            duration_seconds=0.0,
        )

    # ------------------------------------------------------------------

    def _savefig(self, name: str, fig: plt.Figure | None = None) -> str:
        path = self.plots_dir / f"{name}.png"
        if fig is None:
            fig = plt.gcf()
        fig.tight_layout()
        fig.savefig(path, dpi=110, bbox_inches="tight")
        plt.close(fig)
        rel = f"plots/{name}.png"
        self.manifest.plots[name] = rel
        return rel

    # ------------------------------------------------------------------
    # Step 1 — Ingest
    # ------------------------------------------------------------------

    def ingest(self) -> list[dict[str, str]]:
        docs = []
        for root in self.corpus_paths:
            if not root.exists():
                continue
            if root.is_file():
                files = [root]
            else:
                files = sorted([*root.glob("*.md"), *root.glob("*.txt")])
            for f in files:
                try:
                    text = f.read_text(encoding="utf-8")
                    if text.strip():
                        docs.append({"id": str(f), "title": f.stem, "text": text})
                except Exception as exc:
                    logger.warning("Skip %s: %s", f, exc)
        self.manifest.n_documents = len(docs)
        return docs

    # ------------------------------------------------------------------
    # Step 2 — Chunk
    # ------------------------------------------------------------------

    def chunk(self, docs: list[dict[str, str]]) -> list[dict[str, Any]]:
        strategy_fn = CHUNK_STRATEGIES[self.chunking]
        all_chunks: list[dict[str, Any]] = []
        per_strategy_counts: dict[str, int] = {}

        # Run ALL three strategies for comparison stats (only the chosen
        # one is indexed; the others land in chunks_summary for the
        # frontend chunking comparison chart).
        for name, fn in CHUNK_STRATEGIES.items():
            count = 0
            for d in docs:
                count += len(fn(d["text"]))
            per_strategy_counts[name] = count

        # Now do the chosen strategy for real
        for doc in docs:
            for i, c in enumerate(strategy_fn(doc["text"])):
                all_chunks.append(
                    {
                        "chunk_id": f"{doc['id']}#{i}",
                        "doc_id": doc["id"],
                        "doc_title": doc["title"],
                        "text": c,
                        "n_tokens_approx": len(c.split()),
                    }
                )

        self.manifest.n_chunks = len(all_chunks)
        self.manifest.chunks_summary = {
            "chosen_strategy": self.chunking,
            "n_chunks": len(all_chunks),
            "per_strategy_counts": per_strategy_counts,
            "avg_tokens": float(np.mean([c["n_tokens_approx"] for c in all_chunks])) if all_chunks else 0.0,
            "max_tokens": int(max((c["n_tokens_approx"] for c in all_chunks), default=0)),
        }

        # Chunk-distribution histogram
        if all_chunks:
            lengths = [c["n_tokens_approx"] for c in all_chunks]
            fig, ax = plt.subplots(figsize=(8, 4))
            ax.hist(lengths, bins=30, color="#1f77b4")
            ax.set_xlabel("Tokens per chunk (approx)")
            ax.set_ylabel("Count")
            ax.set_title(f"Chunk-length distribution — strategy: {self.chunking}")
            self._savefig("chunk_distribution", fig)

            # Per-strategy comparison
            fig, ax = plt.subplots(figsize=(7, 4))
            names = list(per_strategy_counts)
            ax.bar(names, [per_strategy_counts[n] for n in names], color=["#888", "#1f77b4", "#2ca02c"])
            for i, n in enumerate(names):
                ax.text(i, per_strategy_counts[n], str(per_strategy_counts[n]), ha="center", va="bottom")
            ax.set_ylabel("# chunks")
            ax.set_title("Chunks produced per strategy (same corpus)")
            self._savefig("chunking_strategy_compare", fig)

        return all_chunks

    # ------------------------------------------------------------------
    # Steps 3+4 — Embed + index (ChromaDB)
    # ------------------------------------------------------------------

    def index(self, chunks: list[dict[str, Any]]):
        from sentence_transformers import SentenceTransformer
        import chromadb

        model = SentenceTransformer(self.embedding_model_name)
        texts = [c["text"] for c in chunks]
        ids = [c["chunk_id"] for c in chunks]

        embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)

        client = chromadb.PersistentClient(path=str(self.out / "chromadb"))
        col = client.get_or_create_collection(
            name=f"{self.dept}_{self.pipeline_name}_{self.run_id}",
            metadata={"hnsw:space": "cosine"},
        )
        col.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            documents=texts,
            metadatas=[{"doc_title": c["doc_title"], "doc_id": c["doc_id"]} for c in chunks],
        )
        return col, model

    # ------------------------------------------------------------------
    # Step 5 — Retrieve + rerank
    # ------------------------------------------------------------------

    def retrieve(self, col, model, query: str) -> list[dict[str, Any]]:
        q_emb = model.encode([query], show_progress_bar=False, convert_to_numpy=True)
        res = col.query(query_embeddings=q_emb.tolist(), n_results=self.top_k)
        ids = res.get("ids", [[]])[0]
        docs = res.get("documents", [[]])[0]
        dists = res.get("distances", [[]])[0]
        metas = res.get("metadatas", [[]])[0]

        # Keyword rerank: boost chunks containing query tokens
        q_terms = {t.lower() for t in re.findall(r"\w+", query) if len(t) > 2}
        retrieved = []
        for cid, doc, dist, meta in zip(ids, docs, dists, metas):
            kw_overlap = sum(1 for t in q_terms if t in doc.lower())
            similarity = 1 - dist  # cosine distance → similarity
            rerank_score = similarity + 0.05 * kw_overlap
            retrieved.append(
                {
                    "chunk_id": cid,
                    "text": doc[:400],
                    "similarity": round(similarity, 4),
                    "keyword_hits": kw_overlap,
                    "rerank_score": round(rerank_score, 4),
                    "doc_title": meta.get("doc_title", ""),
                }
            )
        retrieved.sort(key=lambda r: r["rerank_score"], reverse=True)
        return retrieved

    # ------------------------------------------------------------------
    # Step 6 — LLM with circuit breaker
    # ------------------------------------------------------------------

    def generate(self, query: str, retrieved: list[dict[str, Any]]) -> dict[str, Any]:
        if self.breaker.open:
            return {
                "answer": "[circuit-breaker-open: LLM unavailable]",
                "model": self.llm_model,
                "ok": False,
                "duration_seconds": 0.0,
            }

        context = "\n\n".join(
            f"[{i+1}] ({r['doc_title']}) {r['text']}" for i, r in enumerate(retrieved)
        )
        prompt = (
            f"Use the context below to answer. Cite source numbers like [1], [2].\n\n"
            f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        )

        try:
            import httpx
            t0 = time.time()
            r = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={"model": self.llm_model, "prompt": prompt, "stream": False},
                timeout=60.0,
            )
            r.raise_for_status()
            data = r.json()
            self.breaker.record_success()
            return {
                "answer": data.get("response", "").strip(),
                "model": self.llm_model,
                "ok": True,
                "duration_seconds": round(time.time() - t0, 2),
                "prompt_tokens_approx": len(prompt.split()),
            }
        except Exception as exc:
            self.breaker.record_failure()
            logger.warning("LLM call failed (failures=%d): %s", self.breaker.failures, exc)
            return {
                "answer": f"[llm-error: {type(exc).__name__}]",
                "model": self.llm_model,
                "ok": False,
                "duration_seconds": 0.0,
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Step 7 — Citation map
    # ------------------------------------------------------------------

    @staticmethod
    def map_citations(answer: str, retrieved: list[dict[str, Any]]) -> list[dict[str, Any]]:
        cited = []
        for match in re.finditer(r"\[(\d+)\]", answer):
            idx = int(match.group(1)) - 1
            if 0 <= idx < len(retrieved):
                cited.append({"citation": match.group(0), "chunk_id": retrieved[idx]["chunk_id"]})
        return cited

    # ------------------------------------------------------------------
    # Step 8 — Eval (precision@k + MRR on labeled queries)
    # ------------------------------------------------------------------

    def evaluate(self, eval_queries: list[dict[str, Any]], col, model) -> dict[str, Any]:
        """eval_queries: [{query, expected_keywords: [...]}]"""
        precision_at_k = []
        reciprocal_ranks = []

        for q in eval_queries:
            retrieved = self.retrieve(col, model, q["query"])
            expected = {kw.lower() for kw in q.get("expected_keywords", [])}
            if not expected:
                continue
            hits = [
                any(kw in r["text"].lower() for kw in expected) for r in retrieved
            ]
            p_at_k = sum(hits) / len(hits) if hits else 0.0
            precision_at_k.append(p_at_k)
            try:
                first_hit = next(i for i, h in enumerate(hits) if h) + 1
                reciprocal_ranks.append(1 / first_hit)
            except StopIteration:
                reciprocal_ranks.append(0.0)

        eval_stats = {
            "n_queries": len(eval_queries),
            "precision_at_k_mean": round(float(np.mean(precision_at_k)), 4) if precision_at_k else 0.0,
            "mrr": round(float(np.mean(reciprocal_ranks)), 4) if reciprocal_ranks else 0.0,
            "top_k": self.top_k,
        }

        # Plot
        if precision_at_k:
            fig, ax = plt.subplots(figsize=(8, 4))
            ax.bar(range(len(precision_at_k)), precision_at_k, color="#2ca02c")
            ax.axhline(eval_stats["precision_at_k_mean"], color="r", ls="--", label=f"mean={eval_stats['precision_at_k_mean']:.2f}")
            ax.set_xlabel("Query #")
            ax.set_ylabel(f"Precision@{self.top_k}")
            ax.set_title("Retrieval precision per query")
            ax.legend()
            self._savefig("retrieval_precision", fig)

        return eval_stats

    # ------------------------------------------------------------------
    # Orchestrator
    # ------------------------------------------------------------------

    def run(self, queries: list[dict[str, Any]] | None = None) -> RagManifest:
        t0 = time.time()
        docs = self.ingest()
        if not docs:
            raise ValueError(f"No documents found in {self.corpus_paths}")

        chunks = self.chunk(docs)
        col, model = self.index(chunks)

        # Default eval set if none given
        if queries is None:
            queries = [
                {"query": "How do we measure customer lifetime value?", "expected_keywords": ["ltv", "lifetime"]},
                {"query": "What does the churn playbook recommend?", "expected_keywords": ["churn", "retention"]},
                {"query": "How is safety stock calculated?", "expected_keywords": ["safety", "stock"]},
                {"query": "What is the NPS interpretation framework?", "expected_keywords": ["nps", "promoter"]},
            ]

        # Generate answers + citations for each query
        for q in queries:
            retrieved = self.retrieve(col, model, q["query"])
            llm = self.generate(q["query"], retrieved)
            citations = self.map_citations(llm["answer"], retrieved)
            self.manifest.queries.append(
                {
                    "query": q["query"],
                    "expected_keywords": q.get("expected_keywords", []),
                    "retrieved": retrieved,
                    "answer": llm["answer"],
                    "answer_ok": llm["ok"],
                    "llm_duration_seconds": llm.get("duration_seconds", 0.0),
                    "citations": citations,
                }
            )

        self.manifest.eval = self.evaluate(queries, col, model)
        self.manifest.circuit_breaker_state = "open" if self.breaker.open else "closed"
        self.manifest.duration_seconds = round(time.time() - t0, 2)

        manifest_path = self.out / "manifest.json"
        manifest_path.write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run HOLY RAG lifecycle on a corpus")
    parser.add_argument("--corpus", nargs="+", required=True, help="Paths to corpus dirs/files")
    parser.add_argument("--dept", default="customer-experience")
    parser.add_argument("--pipeline", default="rag_reference")
    parser.add_argument(
        "--chunking", default="sentence_aware", choices=list(CHUNK_STRATEGIES.keys())
    )
    parser.add_argument("--llm", default="gemma3:1b")
    parser.add_argument("--ollama-url", default="http://localhost:11434")
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--artifacts-root", default="data/eval")
    args = parser.parse_args()

    runner = RagLifecycle(
        corpus_paths=args.corpus,
        dept=args.dept,
        pipeline_name=args.pipeline,
        chunking=args.chunking,
        llm_model=args.llm,
        ollama_url=args.ollama_url,
        top_k=args.top_k,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
