"""rag_service.py — hybrid retrieval + Ollama generation + citation extraction.

Lean stack: BM25 keyword + numpy cosine over Ollama embeddings.
No external vector DB; ~50 chunks fit comfortably in memory.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import requests
from rank_bm25 import BM25Okapi

from core.structured_logger import emit_event, get_correlation_id
from schemas.ai_explain import Citation, ExplainRequest, ExplainResponse

logger = logging.getLogger(__name__)

OLLAMA_BASE = "http://localhost:11434"
MODEL = "qwen2.5:latest"
EMBED_MODEL = MODEL    # qwen2.5 also serves embeddings via /api/embeddings

CONTEXT_DIR = Path(__file__).resolve().parents[2] / "data" / "sales-context"
SUPPLY_CHAIN_CONTEXT_DIR = Path(__file__).resolve().parents[2] / "data" / "supply-chain-context"
CUSTOMER_CONTEXT_DIR = Path(__file__).resolve().parents[2] / "data" / "customer-context"
MAX_CONTEXT_TOKENS = 3000
MAX_RESPONSE_TOKENS = 800
TIMEOUT_SEC = 30
TOP_K_RETRIEVAL = 10
TOP_N_RERANK = 3

# PII regex (phone + email only for Phase γ — Phase 2b adds full detection)
_PII_RE = re.compile(
    r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"              # email
    r"|\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b", # US phone
)


@dataclass
class Chunk:
    id: str
    source: str
    heading: str
    text: str


class RAGService:
    def __init__(self, corpus_dir: Path = CONTEXT_DIR, eager: bool = False) -> None:
        self._corpus_dir = corpus_dir
        self._chunks: list[Chunk] = []
        self._bm25: BM25Okapi | None = None
        self._embeddings: np.ndarray | None = None
        self._ready = False
        if eager:
            self._build_index()

    # ----- public -----

    def explain(self, req: ExplainRequest) -> ExplainResponse:
        if not self._ready:
            self._build_index()

        # Redact any PII in the user's question before sending to LLM.
        question = _PII_RE.sub("[REDACTED]", req.question)

        # Retrieve.
        t0 = time.perf_counter()
        scored = self._retrieve(question, k=TOP_K_RETRIEVAL)
        topn = scored[:TOP_N_RERANK]
        retrieval_ms = int((time.perf_counter() - t0) * 1000)

        # Generate.
        t1 = time.perf_counter()
        prompt = self._assemble_prompt(question, req.context, topn)
        response_md = self._call_ollama(prompt)
        generation_ms = int((time.perf_counter() - t1) * 1000)

        # Attach citations.
        citations = [
            Citation(
                chunk_id=ch.id,
                source=ch.source,
                snippet=ch.text[:200],
                score=score,
            )
            for ch, score in topn
        ]

        # Guardrail: require at least 1 citation; if response has no [ref N] markers,
        # append a note rather than rejecting (soft-fail for Phase γ).
        if "[ref " not in response_md and citations:
            response_md = response_md.rstrip() + f"\n\n[ref 1] {citations[0].source}"

        emit_event(
            "ai.explain",
            model=MODEL,
            prompt_chars=len(prompt),
            response_chars=len(response_md),
            citation_count=len(citations),
            retrieved_ids=[c.chunk_id for c in citations],
            retrieval_time_ms=retrieval_ms,
            generation_time_ms=generation_ms,
        )

        return ExplainResponse(
            markdown=response_md,
            citations=citations,
            retrieval_time_ms=retrieval_ms,
            generation_time_ms=generation_ms,
            model=MODEL,
            correlation_id=get_correlation_id(),
        )

    # ----- indexing -----

    def _build_index(self) -> None:
        self._chunks = list(self._read_chunks(self._corpus_dir))
        if not self._chunks:
            raise RuntimeError(f"no chunks found in {self._corpus_dir}")

        tokenized = [_tokenize(c.text) for c in self._chunks]
        self._bm25 = BM25Okapi(tokenized)

        logger.info("computing embeddings for %d chunks (Ollama)", len(self._chunks))
        vecs = [self._embed(c.text) for c in self._chunks]
        self._embeddings = np.array(vecs)
        self._ready = True
        logger.info("RAG index ready: %d chunks, embed-dim=%d", len(self._chunks), self._embeddings.shape[1])

    @staticmethod
    def _read_chunks(dir_: Path) -> Iterable[Chunk]:
        for md in sorted(dir_.glob("*.md")):
            text = md.read_text()
            # Split on H2 headings; yield one chunk per section.
            parts = re.split(r"^##\s+", text, flags=re.MULTILINE)
            for part in parts[1:]:          # skip content before first H2
                lines = part.strip().splitlines()
                heading = lines[0].strip()
                body = "\n".join(lines[1:]).strip()
                if not body:
                    continue
                slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
                yield Chunk(
                    id=f"{md.name}#{slug}",
                    source=md.name,
                    heading=heading,
                    text=body,
                )

    def _embed(self, text: str) -> list[float]:
        r = requests.post(
            f"{OLLAMA_BASE}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=TIMEOUT_SEC,
        )
        r.raise_for_status()
        return r.json()["embedding"]

    # ----- retrieval -----

    def _retrieve(self, query: str, k: int) -> list[tuple[Chunk, float]]:
        bm25_scores = self._bm25.get_scores(_tokenize(query))
        q_embed = np.array(self._embed(query))
        # cosine similarity (vectors unit-normalize approximately via dot-prod / norm).
        sims = self._embeddings @ q_embed / (
            np.linalg.norm(self._embeddings, axis=1) * np.linalg.norm(q_embed) + 1e-9
        )
        # Normalize BM25 to 0..1 for fair combination.
        bm25_norm = bm25_scores / (bm25_scores.max() + 1e-9) if bm25_scores.max() > 0 else bm25_scores
        hybrid = 0.5 * sims + 0.5 * bm25_norm
        idxs = np.argsort(-hybrid)[:k]
        return [(self._chunks[i], float(hybrid[i])) for i in idxs]

    # ----- generation -----

    def _assemble_prompt(self, question: str, context, topn) -> str:
        ctx_lines = []
        for i, (chunk, score) in enumerate(topn, 1):
            ctx_lines.append(f"[{i}] ({chunk.source} — {chunk.heading})\n{chunk.text}\n")
        corpus_ctx = "\n".join(ctx_lines)

        situation = ""
        if context is not None:
            situation = f"\n\nSituation the user is viewing: {context.model_dump_json()}"

        return (
            "You are an enterprise analytics assistant for the BEV platform. "
            "Answer concisely using ONLY the numbered source snippets below. "
            "End each factual claim with a [ref N] referencing the source number. "
            "If the snippets don't answer the question, say so explicitly.\n\n"
            f"SOURCES:\n{corpus_ctx}\n\n"
            f"QUESTION: {question}{situation}\n\n"
            "ANSWER (markdown, ≤ 300 words):"
        )

    def _call_ollama(self, prompt: str) -> str:
        r = requests.post(
            f"{OLLAMA_BASE}/api/generate",
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"num_predict": MAX_RESPONSE_TOKENS, "temperature": 0.2},
            },
            timeout=TIMEOUT_SEC,
        )
        r.raise_for_status()
        return r.json().get("response", "").strip() or "(no response)"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())
