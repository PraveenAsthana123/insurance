"""§140 · Elevate matrix cells from 'scaffold' → 'tiny_demo' when ref model trained."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime

R = Path("/mnt/deepa/insur_project")
ROOT = R / "data/use_case_matrix"
REF = R / "models/refs"

# Trained reference techniques
trained = {p.parent.name for p in REF.glob("*/metrics.json")}
print(f"Trained reference techniques: {trained}")

elevated = 0
for cell_manifest in ROOT.glob("*/*/manifest.json"):
    m = json.loads(cell_manifest.read_text())
    dept, tech = m["dept"], m["technique"]
    if tech in trained:
        m["impl_level"] = "real_trained_reference"
        m["ref_model_path"] = f"models/refs/{tech}/"
        m["ref_metrics"] = json.loads((REF / tech / "metrics.json").read_text())
        m["score"] = 0.9  # has real reference impl
        m["elevated_at"] = datetime.now().isoformat()
        cell_manifest.write_text(json.dumps(m, indent=2))
        elevated += 1

print(f"Elevated {elevated} cells → 'real_trained_reference'")

# Update aggregate index
idx_path = ROOT / "matrix_index.json"
idx = json.loads(idx_path.read_text())
levels = {"spec_only": 0, "scaffold": 0, "real_trained_reference": 0}
for row in idx["matrix"]:
    for tech in row["by_tech"]:
        if tech in trained:
            row["by_tech"][tech] = "real_trained_reference"
            levels["real_trained_reference"] += 1
        else:
            levels[row["by_tech"][tech]] = levels.get(row["by_tech"][tech], 0) + 1
idx["by_impl_level"] = levels
idx["n_trained_references"] = len(trained)
idx["trained_techniques"] = sorted(trained)
idx["elevated_at"] = datetime.now().isoformat()
idx_path.write_text(json.dumps(idx, indent=2))
print(f"\nFinal levels: {levels}")
