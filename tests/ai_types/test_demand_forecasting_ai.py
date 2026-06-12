"""§138 · Demand Forecasting AI unit tests · 5 cases · 3 negative."""
import json
import pytest
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
SLUG = "demand-forecasting-ai"


def test_metrics_file_exists():
    """1. POSITIVE · metrics.json must exist."""
    assert (R / f"data/metrics/{SLUG}.json").exists()


def test_metrics_accuracy_above_threshold():
    """2. POSITIVE · accuracy ≥ 0.90."""
    d = json.loads((R / f"data/metrics/{SLUG}.json").read_text())
    acc = d.get("accuracy", 0)
    assert acc >= 0.90, f"acc {acc} below 0.90 threshold"


def test_model_artifact_exists():
    """3. POSITIVE · model.joblib must exist."""
    assert (R / f"models/{SLUG}/model.joblib").exists()


def test_no_pii_in_metrics():
    """4. NEGATIVE · metrics must NOT contain PII patterns."""
    text = (R / f"data/metrics/{SLUG}.json").read_text()
    import re
    assert not re.search(r"\b\d{3}-\d{2}-\d{4}\b", text), "SSN-like in metrics"
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text), "email-like in metrics"


def test_runbook_has_rollback_section():
    """5. NEGATIVE · runbook missing rollback = test FAIL."""
    runbook = (R / f"data/runbooks/{SLUG}.md").read_text()
    assert "rollback" in runbook.lower(), "runbook missing rollback section"
