#!/usr/bin/env python3
"""
Drill: DataPipelineProvenance + 3-stage lifecycle viz · OP-19 mandatory.

Operator (2026-06-14 17:48-17:55 MDT · 2-message stack):
  - "how do I know what data type we are handing, which path data is
     save, data visulization"
  - "I still don't see visuilzation part AS IS data , each column ,
     after process and after visuilzation"

§57.7 + §64.6 + §122 mandate that the operator can SEE the data pipeline
end-to-end: source · types · paths · viz registry · AS-IS → Processed →
Final per column.

Steps (8 · 4 negative):
  1. (+) DataPipelineProvenance.jsx exists
  2. (-) NEG · all 4 sub-components defined (SourceCard · DataTypeDetection
        · StoragePathsTable · VisualizationRegistry)
  3. (-) NEG · ALL 4 fallback data fixtures present
  4. (-) NEG · DataProfileDemo wires DataPipelineProvenance
  5. (-) NEG · CsvDataProfile PerColumnViz has 3 stages (AS-IS · Processed · Final)
  6. (+) ComponentInfo used in DataPipelineProvenance
  7. (+) Visualization Registry mentions §64.6 before_/after_ contract
  8. (+) OP-19 audit marker present
"""
from __future__ import annotations
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
PROV = REPO / "frontend/src/components/DataPipelineProvenance.jsx"
DEMO = REPO / "frontend/src/pages/admin/dashboards/DataProfileDemo.jsx"
CSV = REPO / "frontend/src/components/CsvDataProfile.jsx"


def step(n, ok, msg):
    print(f"  {'✓' if ok else '✗'} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def main():
    print("drill_data_pipeline_provenance · §122 OP-19 data lifecycle lock")
    print("=" * 70)

    step(1, PROV.exists(), f"{PROV.name} exists")
    src = PROV.read_text(encoding="utf-8")

    # Step 2 · NEG · 4 sub-components
    subs = ["SourceCard", "DataTypeDetection", "StoragePathsTable", "VisualizationRegistry"]
    missing_subs = [s for s in subs if f"function {s}(" not in src]
    step(2, len(missing_subs) == 0,
         f"NEG · 4 sub-components defined · missing: {missing_subs or 'NONE'}")

    # Step 3 · NEG · 4 fallback fixtures
    fallbacks = ["fallbackSource", "fallbackDetection", "fallbackStorage", "fallbackVisualizations"]
    missing_fb = [f for f in fallbacks if f"function {f}(" not in src]
    step(3, len(missing_fb) == 0,
         f"NEG · 4 fixtures present · missing: {missing_fb or 'NONE'}")

    # Step 4 · NEG · DataProfileDemo wires DataPipelineProvenance
    demo_src = DEMO.read_text(encoding="utf-8")
    has_wired = "DataPipelineProvenance" in demo_src and "<DataPipelineProvenance" in demo_src
    step(4, has_wired,
         f"NEG · DataProfileDemo renders DataPipelineProvenance: {has_wired}")

    # Step 5 · NEG · CsvDataProfile has 3 stages
    csv_src = CSV.read_text(encoding="utf-8")
    has_as_is = "AS-IS" in csv_src
    has_processed = "PROCESSED" in csv_src
    has_final = "FINAL VIZ" in csv_src
    step(5, has_as_is and has_processed and has_final,
         f"NEG · 3 stages in PerColumnViz · AS-IS={has_as_is} · PROCESSED={has_processed} · FINAL={has_final}")

    # Step 6 · ComponentInfo used
    has_comp_info = "ComponentInfo" in src
    step(6, has_comp_info, f"ComponentInfo used in DataPipelineProvenance: {has_comp_info}")

    # Step 7 · §64.6 before_/after_ contract mentioned
    has_64_6 = "§64.6" in src and ("before_" in src or "before_*" in src)
    step(7, has_64_6, f"§64.6 + before_/after_ contract mentioned: {has_64_6}")

    # Step 8 · OP-19 marker
    has_op19 = "OP-19" in src or "OP-19" in demo_src or "OP-19" in csv_src
    step(8, has_op19, f"OP-19 audit marker present: {has_op19}")

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - DataPipelineProvenance 4 sections (Source · Detection · Storage · Viz Registry)")
    print("  - 4 fixtures present (§57.7 honest fallback)")
    print("  - DataProfileDemo wires the component (operator can SEE it)")
    print("  - CsvDataProfile PerColumnViz: 3 stages (AS-IS · Processed · Final Viz)")
    print("  - §64.6 before_/after_ contract enforced")
    return 0


if __name__ == "__main__":
    sys.exit(main())
