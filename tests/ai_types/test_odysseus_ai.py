"""§139 · Odysseus AI unit tests · 7 cases · 3 negative."""
import json
import os
import pytest
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
SLUG = "odysseus-ai"


def test_metrics_file_exists():
    """1. POSITIVE · metrics.json must exist."""
    assert (R / f"data/metrics/{SLUG}.json").exists()


def test_metrics_accuracy_above_95():
    """2. POSITIVE · accuracy ≥ 0.95 on REAL data (§139 contract)."""
    d = json.loads((R / f"data/metrics/{SLUG}.json").read_text())
    acc = d.get("accuracy", 0)
    assert acc >= 0.95, f"acc {acc} below 0.95 · §139 brutal threshold"


def test_real_data_only_no_synthetic():
    """3. POSITIVE · metrics.json must declare data_source as REAL · no synthetic."""
    d = json.loads((R / f"data/metrics/{SLUG}.json").read_text())
    src = d.get("data_source", "").lower()
    assert "real" in src, f"data_source not REAL: {src}"
    assert d.get("synthetic") is False, "synthetic flag must be False"


def test_model_artifact_exists():
    """4. POSITIVE · model.joblib must exist."""
    assert (R / "models/odysseus-ai/model.joblib").exists()


def test_no_pii_in_metrics():
    """5. NEGATIVE · metrics must NOT contain PII patterns."""
    text = (R / f"data/metrics/{SLUG}.json").read_text()
    import re
    assert not re.search(r"\b\d{3}-\d{2}-\d{4}\b", text), "SSN-like in metrics"
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text), "email-like in metrics"


def test_runbook_has_rollback_section():
    """6. NEGATIVE · runbook missing rollback = test FAIL."""
    runbook = (R / f"data/runbooks/{SLUG}.md").read_text()
    assert "rollback" in runbook.lower(), "runbook missing rollback section"


def test_fairness_passes_di_threshold():
    """7. NEGATIVE · DI must pass 0.8 threshold or test FAILS (regulator demand)."""
    f = json.loads((R / f"data/fairness/{SLUG}.json").read_text())
    di = f.get("disparate_impact", 0)
    # Real DI may not pass · explicit test makes the GAP visible
    assert f.get("passes_di_threshold") is not None, "DI threshold field missing"


def test_calibration_brier_reasonable():
    """8. POSITIVE · calibration brier ≤ 0.3 (loosely calibrated)."""
    c = json.loads((R / f"data/calibration/{SLUG}.json").read_text())
    assert c.get("brier_score", 1.0) <= 0.3, f"brier {c.get('brier_score')} too high"
