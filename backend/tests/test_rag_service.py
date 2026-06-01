"""Unit tests for RAGService. Mock Ollama HTTP calls — no network needed."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from backend.schemas.ai_explain import ExplainRequest
from backend.services.rag_service import RAGService, _PII_RE, _tokenize


@pytest.fixture
def corpus_tmp(tmp_path):
    d = tmp_path / "ctx"
    d.mkdir()
    (d / "doc-a.md").write_text(
        "# Doc A\n\n## Alpha topic\nAlpha content with keyword xylophone.\n\n## Beta topic\nBeta content.\n"
    )
    (d / "doc-b.md").write_text(
        "# Doc B\n\n## Gamma topic\nGamma content with keyword xylophone again.\n"
    )
    return d


def _mock_embed():
    """Deterministic embed: hash-based pseudo-vector."""
    def inner(text):
        # Return a 8-dim vector based on word hashes so semantically similar
        # texts have deterministic but distinct embeddings.
        vec = [0.0] * 8
        for w in text.lower().split():
            vec[hash(w) % 8] += 1.0
        return vec
    return inner


def test_tokenize_lowercases_and_splits():
    assert _tokenize("Hello, World! 2024") == ["hello", "world", "2024"]


def test_pii_redacts_email_and_phone():
    assert _PII_RE.sub("[X]", "email me at a@b.com or call 555-123-4567") \
        == "email me at [X] or call [X]"


def test_read_chunks_splits_on_h2(corpus_tmp):
    svc = RAGService(corpus_dir=corpus_tmp)
    chunks = list(svc._read_chunks(corpus_tmp))
    assert len(chunks) == 3  # Alpha, Beta, Gamma
    assert {c.heading for c in chunks} == {"Alpha topic", "Beta topic", "Gamma topic"}


def test_retrieval_returns_relevant_chunks(corpus_tmp):
    svc = RAGService(corpus_dir=corpus_tmp)
    with patch.object(svc, "_embed", side_effect=_mock_embed()):
        svc._build_index()
        results = svc._retrieve("xylophone", k=3)
    assert len(results) == 3
    # Xylophone is in Alpha + Gamma; they should rank above Beta.
    top_two_headings = {ch.heading for ch, _ in results[:2]}
    assert "Alpha topic" in top_two_headings or "Gamma topic" in top_two_headings


def test_explain_calls_ollama_and_returns_citations(corpus_tmp):
    svc = RAGService(corpus_dir=corpus_tmp)

    def fake_post(url, json, timeout):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        if "/embeddings" in url:
            resp.json.return_value = {"embedding": _mock_embed()(json["prompt"])}
        else:
            resp.json.return_value = {"response": "Alpha content explains the question. [ref 1]"}
        return resp

    with patch("backend.services.rag_service.requests.post", side_effect=fake_post):
        out = svc.explain(ExplainRequest(question="what is alpha?"))
    assert "[ref 1]" in out.markdown
    assert len(out.citations) >= 1
    assert out.model == "qwen2.5:latest"
    assert out.retrieval_time_ms >= 0
    assert out.generation_time_ms >= 0


def test_explain_soft_fails_when_response_missing_ref(corpus_tmp):
    svc = RAGService(corpus_dir=corpus_tmp)

    def fake_post(url, json, timeout):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        if "/embeddings" in url:
            resp.json.return_value = {"embedding": _mock_embed()(json["prompt"])}
        else:
            resp.json.return_value = {"response": "Generic response without reference."}
        return resp

    with patch("backend.services.rag_service.requests.post", side_effect=fake_post):
        out = svc.explain(ExplainRequest(question="test"))
    # Guardrail appends a [ref 1] if missing.
    assert "[ref 1]" in out.markdown


def test_default_corpus_dir_points_at_sales_context():
    """Constructing RAGService with no args reads from data/sales-context."""
    from backend.services.rag_service import CONTEXT_DIR, SUPPLY_CHAIN_CONTEXT_DIR

    svc = RAGService()
    assert svc._corpus_dir == CONTEXT_DIR
    assert CONTEXT_DIR.name == "sales-context"
    assert SUPPLY_CHAIN_CONTEXT_DIR.name == "supply-chain-context"


def test_corpus_dir_override_reads_from_specified_dir(tmp_path):
    """Passing corpus_dir= reads chunks from that dir, not the default."""
    d = tmp_path / "custom-corpus"
    d.mkdir()
    (d / "only-doc.md").write_text("# T\n\n## Unique heading\nCustom corpus body.\n")

    svc = RAGService(corpus_dir=d)
    chunks = list(svc._read_chunks(svc._corpus_dir))
    assert len(chunks) == 1
    assert chunks[0].source == "only-doc.md"
    assert chunks[0].heading == "Unique heading"


def test_router_per_corpus_cache_returns_distinct_services():
    """ai_explain._rag_for caches one RAGService per corpus key."""
    from backend.routers.ai_explain import _rag_for
    from backend.services.rag_service import CONTEXT_DIR, SUPPLY_CHAIN_CONTEXT_DIR

    _rag_for.cache_clear()
    sales_svc = _rag_for("sales")
    sc_svc = _rag_for("supply-chain")

    assert sales_svc is not sc_svc
    assert sales_svc._corpus_dir == CONTEXT_DIR
    assert sc_svc._corpus_dir == SUPPLY_CHAIN_CONTEXT_DIR

    # Same key → same instance (cached).
    assert _rag_for("sales") is sales_svc
    assert _rag_for("supply-chain") is sc_svc


def test_explain_request_accepts_corpus_field():
    """ExplainRequest validates the new corpus literal."""
    req = ExplainRequest(question="test question", corpus="supply-chain")
    assert req.corpus == "supply-chain"

    req2 = ExplainRequest(question="test question")
    assert req2.corpus is None

    # Invalid value rejected.
    with pytest.raises(Exception):
        ExplainRequest(question="test question", corpus="marketing")
