"""test_ai_explain_router.py — router-level tests for /api/v1/ai/*.

Scope is intentionally narrow: we don't exercise the RAG pipeline here
(that lives in test_rag_service.py). We only assert the feedback endpoint
accepts valid payloads, rejects invalid ones, and returns 204 No Content
with an empty body.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def test_feedback_positive_returns_204(client: TestClient) -> None:
    r = client.post(
        "/api/v1/ai/feedback",
        json={
            "correlation_id": "abc123def456",
            "rating": "positive",
            "response_excerpt": "Store 1 promo drives +14% uplift",
            "comment": "Exactly what I needed",
        },
    )
    assert r.status_code == 204
    # 204 No Content — body must be empty.
    assert r.content == b""


def test_feedback_negative_minimal_payload_returns_204(client: TestClient) -> None:
    r = client.post(
        "/api/v1/ai/feedback",
        json={"correlation_id": "deadbeefcafe", "rating": "negative"},
    )
    assert r.status_code == 204
    assert r.content == b""


def test_feedback_rejects_invalid_rating(client: TestClient) -> None:
    r = client.post(
        "/api/v1/ai/feedback",
        json={"correlation_id": "abc", "rating": "meh"},
    )
    assert r.status_code == 422


def test_feedback_rejects_unknown_field(client: TestClient) -> None:
    r = client.post(
        "/api/v1/ai/feedback",
        json={
            "correlation_id": "abc",
            "rating": "positive",
            "unexpected": True,
        },
    )
    assert r.status_code == 422  # extra='forbid' in schema
