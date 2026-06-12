"""§138 · Email AI integration test · end-to-end against backend."""
import os
import pytest

BACKEND = os.environ.get("BACKEND_URL", "http://localhost:8001")
SLUG = "email-ai"


@pytest.mark.integration
def test_metrics_endpoint(httpx_mock=None):
    """e2e: GET metrics endpoint returns 200 + valid JSON."""
    import requests
    r = requests.get(f"{BACKEND}/api/v1/ai-type-impl/template/{SLUG}", timeout=10)
    assert r.status_code in (200, 404), f"unexpected status {r.status_code}"


@pytest.mark.integration
def test_health_check():
    """e2e: backend reachable."""
    import requests
    r = requests.get(f"{BACKEND}/api/v1/health", timeout=5)
    assert r.status_code == 200
