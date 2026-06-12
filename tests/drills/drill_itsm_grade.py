"""§143 drill · ITSM-grade module · 8 steps · ≥3 negative invariants."""
import os
import requests

BACKEND = os.environ.get("BACKEND_URL", "http://localhost:8001")
PREFIX = f"{BACKEND}/api/v1/itsm"


def test_health_returns_200():
    """POS: health endpoint up."""
    r = requests.get(f"{PREFIX}/health", timeout=10)
    assert r.status_code == 200, r.text


def test_playbook_lists_3_templates():
    """POS: ≥3 playbook templates."""
    r = requests.get(f"{PREFIX}/playbook/templates", timeout=10)
    assert r.status_code == 200
    assert r.json()["n_templates"] >= 3


def test_unknown_template_returns_404():
    """NEG: unknown template_id → 404 not silent default."""
    r = requests.get(f"{PREFIX}/playbook/templates/totally-bogus-xyz", timeout=10)
    assert r.status_code == 404


def test_specialist_perf_has_5_kpis():
    """POS: specialist performance returns all 5 KPIs."""
    r = requests.get(f"{PREFIX}/specialist/performance", timeout=10)
    assert r.status_code == 200
    m = r.json()["metrics"]
    for kpi in ["csat", "sla_pct", "aht_min", "mttr_min", "fcr_pct"]:
        assert kpi in m, f"missing KPI: {kpi}"


def test_security_score_returns_5_dims():
    """POS: 5-dim radar."""
    r = requests.get(f"{PREFIX}/security-score/sys_watchdog_pii", timeout=10)
    assert r.status_code == 200
    d = r.json()["dimensions"]
    for dim in ["quality", "safety", "security", "compliance", "risk"]:
        assert dim in d, f"missing dim: {dim}"


def test_resolution_workflow_has_5_stages():
    """POS: canonical 5 stages."""
    r = requests.get(f"{PREFIX}/resolution-workflow/stages", timeout=10)
    assert r.status_code == 200
    assert r.json()["n_stages"] == 5


def test_l1_orchestration_has_3plus_tiers():
    """POS: at least 3 tiers (Case Intel · Action · Deep Research)."""
    r = requests.get(f"{PREFIX}/l1-orchestration", timeout=10)
    assert r.status_code == 200
    assert len(r.json()["tiers"]) >= 3


def test_score_card_is_real_value_not_fabricated():
    """NEG: score is computed (not hard-coded > 0.92 without dim backing)."""
    r = requests.get(f"{PREFIX}/score-card", timeout=10)
    assert r.status_code == 200
    d = r.json()
    # If score >= 0.92 then all dims must be > 0 (no zero-dim freebies)
    if d["score"] >= 0.92:
        zero_dims = [k for k, v in d["dims"].items() if v == 0]
        assert not zero_dims, f"score inflated · zero dims: {zero_dims}"


def test_create_incident_returns_id():
    """POS: create incident returns INC-XXX id + steps."""
    r = requests.post(
        f"{PREFIX}/playbook/create-incident",
        json={"template_id": "prompt_injection",
              "title": "Drill test incident · DELETE OK"},
        timeout=10,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["incident_id"].startswith("INC-")
    assert len(d["steps"]) >= 4
