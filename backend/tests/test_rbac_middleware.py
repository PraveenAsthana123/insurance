"""test_rbac_middleware — permission matrix enforcement for Sales + AI endpoints.

Covers:
- All four roles allowed on GET /stores
- /simulate restricted to manager (other 3 roles → 403)
- Unknown X-Demo-Role → 400
- Missing X-Demo-Role → defaults to manager (200)
- Paths not in matrix pass through unchanged
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def test_stores_allowed_for_all_roles(client: TestClient) -> None:
    for role in ("manager", "team-member", "compliance", "reporting-monitoring"):
        r = client.get("/api/v1/sales/stores", headers={"X-Demo-Role": role})
        # /stores may return 404/503 if fact_sales empty, but MUST NOT be 403
        assert r.status_code != 403, f"role {role} blocked on /stores (should be allowed)"
        assert r.status_code != 400, f"role {role} rejected as invalid on /stores"


def test_simulate_manager_only(client: TestClient) -> None:
    body = {"store_id": 1, "discount_pct": 10, "duration_days": 7}

    # Manager: should not be 403 (actual 2xx/4xx depends on data — just not RBAC-blocked)
    r = client.post(
        "/api/v1/sales/simulate",
        json=body,
        headers={"X-Demo-Role": "manager"},
    )
    assert r.status_code != 403, "manager incorrectly blocked on /simulate"

    # All three non-manager roles → 403
    for role in ("team-member", "compliance", "reporting-monitoring"):
        r = client.post(
            "/api/v1/sales/simulate",
            json=body,
            headers={"X-Demo-Role": role},
        )
        assert r.status_code == 403, f"role {role} incorrectly allowed on /simulate"
        payload = r.json()
        assert payload["error_code"] == "FORBIDDEN"
        assert role in payload["detail"]


def test_unknown_role_returns_400(client: TestClient) -> None:
    r = client.get("/api/v1/sales/stores", headers={"X-Demo-Role": "hackerman"})
    assert r.status_code == 400
    payload = r.json()
    assert payload["error_code"] == "INVALID_ROLE"
    assert "hackerman" in payload["detail"]


def test_missing_role_defaults_to_manager(client: TestClient) -> None:
    # No X-Demo-Role header → middleware defaults to manager → not 403/400
    r = client.get("/api/v1/sales/stores")
    assert r.status_code not in (400, 403)


def test_non_matrix_path_is_allowed(client: TestClient) -> None:
    # A path NOT in PERMS_MATRIX should pass through regardless of role.
    r = client.get(
        "/api/v1/departments",
        headers={"X-Demo-Role": "team-member"},
    )
    # Whatever the route returns, it must NOT be RBAC-blocked.
    assert r.status_code not in (400, 403)


# ----- Supply Chain (Wave 3 η) -----

def test_supply_chain_simulate_manager_only(client: TestClient) -> None:
    """Network simulation is manager-only — matches the Sales /simulate pattern."""
    body = {"supplier_id": "Supplier 1", "delay_days": 5, "affected_sku_count": 10}

    # Manager is allowed (200 or 4xx based on data — just not RBAC-blocked).
    r = client.post(
        "/api/v1/supply-chain/simulate",
        json=body,
        headers={"X-Demo-Role": "manager"},
    )
    assert r.status_code != 403, "manager incorrectly blocked on /supply-chain/simulate"

    # All three non-manager roles → 403 with FORBIDDEN error code.
    for role in ("team-member", "compliance", "reporting-monitoring"):
        r = client.post(
            "/api/v1/supply-chain/simulate",
            json=body,
            headers={"X-Demo-Role": role},
        )
        assert r.status_code == 403, f"role {role} incorrectly allowed on /supply-chain/simulate"
        payload = r.json()
        assert payload["error_code"] == "FORBIDDEN"
        assert role in payload["detail"]


def test_supply_chain_stockout_allowed_for_all_roles(client: TestClient) -> None:
    """Read-ish endpoints are open to all four demo roles."""
    body = {"sku_id": "SKU0"}
    for role in ("manager", "team-member", "compliance", "reporting-monitoring"):
        r = client.post(
            "/api/v1/supply-chain/stockout-risk",
            json=body,
            headers={"X-Demo-Role": role},
        )
        # 404 on unknown sku_id is fine — we only care RBAC is not blocking.
        assert r.status_code != 403, f"role {role} blocked on /supply-chain/stockout-risk"
        assert r.status_code != 400, f"role {role} rejected as invalid role on stockout-risk"


# ----- Phase ζ: 5th canonical role "tester" -----

def test_tester_can_hit_stores(client: TestClient) -> None:
    """Tester (read-only role) is permitted on GET /sales/stores — expect non-403/400."""
    r = client.get("/api/v1/sales/stores", headers={"X-Demo-Role": "tester"})
    # /stores may return 404/503 if fact_sales empty, but MUST NOT be RBAC-blocked.
    assert r.status_code != 403, "tester blocked on /stores (should be allowed)"
    assert r.status_code != 400, "tester rejected as invalid role on /stores"


def test_tester_cannot_simulate(client: TestClient) -> None:
    """Simulation remains manager-only — tester should be 403 with FORBIDDEN."""
    body = {"store_id": 1, "discount_pct": 10, "duration_days": 7}
    r = client.post(
        "/api/v1/sales/simulate",
        json=body,
        headers={"X-Demo-Role": "tester"},
    )
    assert r.status_code == 403, "tester incorrectly allowed on /simulate"
    payload = r.json()
    assert payload["error_code"] == "FORBIDDEN"
    assert "tester" in payload["detail"]
