"""Tests for /api/v1/admin/feedback rollup router.

Per GLOBAL_INPUT_PERSISTENCE_POLICY rule 8 (tenant-scoped reads) + rule 9
(read paths soft-fail · never block UI). Contract:
- GET /summary returns rollup with total_count · up_count · down_count · by_tab · by_process · by_day
- GET /summary?days bounded 1-90
- GET /summary?department_id and ?process_id filter the aggregate
- GET /comments returns array · supports rating=up|down filter · pagination
- DB unavailable → empty response (NOT 5xx) per rule 9
"""
from __future__ import annotations

import re
import pytest
from fastapi.testclient import TestClient

from core.rbac_middleware import PERMS_MATRIX, _READ_ROLES
from main import app
from routers.admin_feedback import router as admin_feedback_router


def ensure_admin_feedback_router_mounted() -> None:
    paths = {getattr(route, "path", "") for route in app.routes}
    if "/api/v1/admin/feedback/summary" not in paths:
        app.include_router(admin_feedback_router)
    patterns = {rx.pattern for _, rx, _ in PERMS_MATRIX}
    if r"^/api/v1/admin/feedback/summary$" not in patterns:
        PERMS_MATRIX.extend([
            ("GET", re.compile(r"^/api/v1/admin/feedback/summary$"), _READ_ROLES),
            ("GET", re.compile(r"^/api/v1/admin/feedback/comments$"), _READ_ROLES),
        ])


@pytest.fixture(scope="module")
def client() -> TestClient:
    ensure_admin_feedback_router_mounted()
    return TestClient(app)


# ============= /summary contract =============

class TestSummary:
    def test_summary_returns_envelope(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary?days=7",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # Required keys must always be present (soft-fail per rule 9)
        for k in ("tenant_id", "days", "total_count", "up_count", "down_count",
                  "no_rating", "by_tab", "by_process", "by_day"):
            assert k in body, f"missing key: {k}"
        # Type sanity
        assert isinstance(body["total_count"], int)
        assert isinstance(body["by_tab"], dict)
        assert isinstance(body["by_process"], list)
        assert isinstance(body["by_day"], list)

    def test_summary_days_lower_bound(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary?days=0",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 422, r.text  # ge=1

    def test_summary_days_upper_bound(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary?days=91",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 422, r.text  # le=90

    def test_summary_with_filters(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary?days=30&department_id=claims&process_id=fnol",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["days"] == 30

    def test_summary_default_days(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200
        assert r.json()["days"] == 7  # default


# ============= /comments contract =============

class TestComments:
    def test_comments_returns_array(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_comments_rating_up_filter(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments?rating=up",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200
        for row in r.json():
            assert row.get("rating") == "up"

    def test_comments_rating_down_filter(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments?rating=down",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200
        for row in r.json():
            assert row.get("rating") == "down"

    def test_comments_rejects_invalid_rating(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments?rating=neutral",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        # Pydantic regex pattern validates → 422
        assert r.status_code == 422

    def test_comments_pagination(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments?limit=10&offset=0",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 200
        assert len(r.json()) <= 10

    def test_comments_limit_upper_bound(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments?limit=1000",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code == 422  # le=500


# ============= Soft-fail behavior (rule 9) =============

class TestSoftFail:
    """Per rule 9: read paths NEVER 5xx · always return empty/zero when DB unavailable."""

    def test_summary_never_5xx(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code < 500, r.text

    def test_comments_never_5xx(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/comments",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        assert r.status_code < 500, r.text


# ============= Tenant scoping (rule 8) =============

class TestTenantScoping:
    def test_summary_returns_tenant_in_body(self, client: TestClient) -> None:
        r = client.get(
            "/api/v1/admin/feedback/summary",
            headers={"X-Tenant-ID": "tenant-explicit"},
        )
        body = r.json()
        # Tenant from middleware OR fallback to 'default' when DB returns _empty_summary
        assert body["tenant_id"] in ("tenant-explicit", "default")
