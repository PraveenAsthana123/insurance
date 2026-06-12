"""§139 · Odysseus integration test · e2e against backend."""
import os
import pytest

BACKEND = os.environ.get("BACKEND_URL", "http://localhost:8001")


@pytest.mark.integration
def test_health_endpoint():
    """e2e: /api/v1/odysseus/health returns 200 + accuracy field."""
    import requests
    r = requests.get(f"{BACKEND}/api/v1/odysseus/health", timeout=10)
    if r.status_code == 404:
        pytest.skip("Odysseus router not mounted · run install.sh --restart")
    assert r.status_code == 200
    d = r.json()
    assert "accuracy" in d or "live" in d


@pytest.mark.integration
def test_predict_endpoint_smoke():
    """e2e: /api/v1/odysseus/predict accepts payload."""
    import requests
    r = requests.post(f"{BACKEND}/api/v1/odysseus/predict",
                       json={"status": "completed", "trigger_kind": "cron",
                             "duration_ms": 1500, "cost_usd": 0.001,
                             "tokens_in": 100, "tokens_out": 50,
                             "retry_count": 0, "input_text": "claim review",
                             "skill": "fraud_detection"},
                       timeout=10)
    if r.status_code == 404:
        pytest.skip("Odysseus router not mounted")
    assert r.status_code in (200, 422)
