"""Tier 3 — API tests for finance.

Recommended: pytest + httpx + schemathesis.
Per global §64.30 tier 3: every endpoint × every status code.
"""
import pytest


@pytest.mark.skip(reason="placeholder — requires running backend on :8000")
def test_finance_list_returns_200():
    """REPLACE — GET /api/v1/holy/depts (smoke that backend reachable)."""
    import httpx
    r = httpx.get("http://localhost:8000/api/v1/holy/depts", timeout=5)
    assert r.status_code == 200
    body = r.json()
    assert "finance" in body.get("departments", []), f"finance not in /depts response"


@pytest.mark.skip(reason="placeholder — replace with real endpoint contract test")
def test_finance_invalid_input_returns_400():
    """REPLACE — verify bad input is rejected with 4xx (no silent success)."""
    pass
