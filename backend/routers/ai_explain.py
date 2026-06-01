from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Response, status

from core.structured_logger import emit_event
from schemas.ai_explain import ExplainRequest, ExplainResponse, FeedbackRequest
from services.rag_service import (
    CONTEXT_DIR,
    CUSTOMER_CONTEXT_DIR,
    SUPPLY_CHAIN_CONTEXT_DIR,
    RAGService,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@lru_cache(maxsize=None)
def _rag_for(corpus: str) -> RAGService:
    """One RAGService singleton per corpus. Index builds lazily on first request."""
    if corpus == "supply-chain":
        return RAGService(corpus_dir=SUPPLY_CHAIN_CONTEXT_DIR, eager=False)
    if corpus == "customer":
        return RAGService(corpus_dir=CUSTOMER_CONTEXT_DIR, eager=False)
    # default = sales
    return RAGService(corpus_dir=CONTEXT_DIR, eager=False)


def get_rag_service() -> RAGService:
    # Backwards-compatible: tests or callers that bypass the corpus selector get sales.
    return _rag_for("sales")


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest) -> ExplainResponse:
    svc = _rag_for(req.corpus or "sales")
    try:
        return svc.explain(req)
    except Exception as e:
        logger.exception("RAG pipeline failed")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI explanation temporarily unavailable: {e}",
        )


@router.post("/feedback", status_code=status.HTTP_204_NO_CONTENT)
def feedback(req: FeedbackRequest) -> Response:
    """Record a thumbs-up/down rating against a previous explain call.

    Emits a structured event (``ai.feedback.positive`` / ``ai.feedback.negative``)
    tagged with the source correlation_id so the two log rows can be joined
    downstream. No database write — stdout only in Phase γ. Returns 204.
    """
    emit_event(
        f"ai.feedback.{req.rating}",
        source_correlation_id=req.correlation_id,
        response_excerpt=req.response_excerpt,
        comment=req.comment,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
