"""test_customer_corpus.py — smoke-check the customer RAG corpus.

Validates that:
  1. The 4 customer-context markdown files exist and parse into chunks.
  2. The RAG corpus selector accepts 'customer' (schema literal).
  3. Pydantic rejects unknown corpus values.

We do NOT exercise the Ollama embedding path here — that's tested in the
opt-in eval harness. These tests run without Ollama.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from schemas.ai_explain import ExplainRequest
from services.rag_service import CUSTOMER_CONTEXT_DIR, RAGService


EXPECTED_FILES = [
    "churn-playbook.md",
    "segmentation-methodology.md",
    "ltv-calculation-guide.md",
    "nps-interpretation.md",
]


def test_corpus_files_exist():
    assert CUSTOMER_CONTEXT_DIR.exists(), f"missing {CUSTOMER_CONTEXT_DIR}"
    names = {p.name for p in CUSTOMER_CONTEXT_DIR.glob("*.md")}
    for expected in EXPECTED_FILES:
        assert expected in names, f"missing corpus file {expected}"


def test_corpus_chunks_parseable():
    chunks = list(RAGService._read_chunks(CUSTOMER_CONTEXT_DIR))
    # Each file has multiple ## sections → expect at least 4 × 3 = 12 chunks.
    assert len(chunks) >= 12, f"expected >= 12 chunks, got {len(chunks)}"
    # Unique ids.
    ids = [c.id for c in chunks]
    assert len(set(ids)) == len(ids), "duplicate chunk ids"


def test_corpus_covers_all_four_files():
    sources = {c.source for c in RAGService._read_chunks(CUSTOMER_CONTEXT_DIR)}
    assert sources == set(EXPECTED_FILES), f"source mismatch: {sources}"


def test_explainrequest_accepts_customer_corpus():
    req = ExplainRequest(question="what drives churn?", corpus="customer")
    assert req.corpus == "customer"


def test_explainrequest_rejects_unknown_corpus():
    with pytest.raises(ValidationError):
        ExplainRequest(question="unused question", corpus="not-a-corpus")


def test_corpus_content_includes_key_vocab():
    """A lightweight sanity check: the corpus should include domain terms we
    expect the retriever to match."""
    all_text = " ".join(
        p.read_text() for p in CUSTOMER_CONTEXT_DIR.glob("*.md")
    ).lower()
    for term in ("churn", "segment", "clv", "nps", "retention", "detractor"):
        assert term in all_text, f"corpus missing term {term!r}"
