"""§140 · policy-admin × vae drill · ≥1 pos + ≥1 neg."""
import json
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
CELL = R / "data/use_case_matrix/policy-admin/vae"


def test_spec_exists():
    """POSITIVE · spec.md must exist."""
    assert (CELL / "spec.md").exists()


def test_manifest_has_dept_and_technique():
    """POSITIVE · manifest names both dimensions."""
    m = json.loads((CELL / "manifest.json").read_text())
    assert m["dept"] == "policy-admin"
    assert m["technique"] == "vae"


def test_metrics_not_fabricated():
    """NEGATIVE · scaffold metrics MUST declare honest_caveat (per §57.7)."""
    m = json.loads((CELL / "metrics.json").read_text())
    if m.get("impl_level") in ("spec_only", "scaffold"):
        assert "honest_caveat" in m, "scaffold cell must declare honest_caveat"
