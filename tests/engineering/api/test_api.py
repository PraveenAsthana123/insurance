"""Tier 3 — API tests for engineering.

Recommended: pytest + httpx + schemathesis.
Per global §64.30 tier 3: every endpoint × every status code.
"""
import pytest


@pytest.mark.skip(reason="placeholder — requires running backend on :8000")
def test_engineering_list_returns_200():
    """REPLACE — GET /api/v1/insur/depts (smoke that backend reachable)."""
    import httpx
    r = httpx.get("http://localhost:8000/api/v1/insur/depts", timeout=5)
    assert r.status_code == 200
    body = r.json()
    assert "engineering" in body.get("departments", []), f"engineering not in /depts response"


@pytest.mark.skip(reason="placeholder — replace with real endpoint contract test")
def test_engineering_invalid_input_returns_400():
    """REPLACE — verify bad input is rejected with 4xx (no silent success)."""
    pass
