"""Tests for insurance department artifact and navigator endpoints."""
from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from main import app
from routers import insurance as insurance_router
from routers import insur as insur_router


client = TestClient(app)


def test_insurance_depts_lists_four_priority_domains() -> None:
    response = client.get("/api/v1/insurance/depts", headers={"X-Demo-Role": "manager"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["count"] == 4
    assert payload["depts"] == ["claims", "underwriting", "customer-service", "fraud-siu"]


def test_insurance_markdown_artifacts_are_served() -> None:
    spec = client.get("/api/v1/insurance/depts/claims/spec", headers={"X-Demo-Role": "manager"})
    dashboard = client.get(
        "/api/v1/insurance/depts/claims/dashboards/manager",
        headers={"X-Demo-Role": "manager"},
    )
    reports = client.get(
        "/api/v1/insurance/depts/claims/reports/manager",
        headers={"X-Demo-Role": "manager"},
    )

    assert spec.status_code == 200, spec.text
    assert spec.headers["content-type"].startswith("text/markdown")
    assert "Claims" in spec.text
    assert "FNOL" in spec.text

    assert dashboard.status_code == 200, dashboard.text
    assert "Claims" in dashboard.text
    assert "manager" in dashboard.text

    assert reports.status_code == 200, reports.text
    assert "Claims" in reports.text
    assert "manager" in reports.text


def test_insurance_invalid_dept_and_role_are_not_enumerable() -> None:
    unknown_dept = client.get(
        "/api/v1/insurance/depts/no-such-dept/spec",
        headers={"X-Demo-Role": "manager"},
    )
    unknown_role = client.get(
        "/api/v1/insurance/depts/claims/dashboards/no-such-role",
        headers={"X-Demo-Role": "manager"},
    )

    assert unknown_dept.status_code == 404
    assert unknown_role.status_code == 404


def test_insurance_missing_artifact_returns_404(tmp_path: Path, monkeypatch) -> None:
    fake_root = tmp_path / "departments"
    fake_dept = fake_root / "claims" / "business-layer"
    fake_dept.mkdir(parents=True)
    monkeypatch.setattr(insurance_router, "DEPT_ROOT", fake_root)

    response = client.get("/api/v1/insurance/depts/claims/spec", headers={"X-Demo-Role": "manager"})

    assert response.status_code == 404


def test_insurance_pipeline_list_uses_registry() -> None:
    response = client.get("/api/v1/insurance/depts/claims/pipelines", headers={"X-Demo-Role": "manager"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["dept"] == "claims"
    assert payload["count"] == 4
    assert {item["id"] for item in payload["pipelines"]} == {1, 2, 3, 4}


def test_insur_nav_lists_generated_insurance_departments() -> None:
    response = client.get("/api/v1/insur/depts", headers={"X-Demo-Role": "manager"})

    assert response.status_code == 200, response.text
    departments = set(response.json()["departments"])
    assert {"claims", "underwriting", "customer-service", "fraud-siu"}.issubset(departments)


def test_insur_nav_serves_generated_nav_shape() -> None:
    response = client.get("/api/v1/insur/nav/claims", headers={"X-Demo-Role": "manager"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["department_id"] == "claims"
    assert payload["display_name"] == "Claims"
    assert payload["left_nav"]
    first_process = payload["left_nav"][0]
    assert {"slug", "process", "sub_processes"}.issubset(first_process)
    first_sub = first_process["sub_processes"][0]
    assert {"slug", "name", "audiences", "tabs", "tab_content"}.issubset(first_sub)
    assert "Overview" in first_sub["tabs"]
