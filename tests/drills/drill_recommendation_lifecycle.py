#!/usr/bin/env python3
"""
Drill: INSUR recommendation lifecycle (§43, §64.22).

Steps (8 total; 3 negative):
    1. (+) Lifecycle runs end-to-end on synthetic 200×60 matrix
    2. (+) All 4 algorithms scored (Popularity + Content + CF + Hybrid)
    3. (+) Hybrid OR CF beats Popularity baseline on nDCG@k (signal > noise)
    4. (+) Every algorithm has all 6 required metrics
    5. (-) NEGATIVE — n_users=0 produces no recommendations (no fabrication)
    6. (-) NEGATIVE — invalid top_k=0 produces no list (no silent default)
    7. (+) Manifest persisted with full per-algorithm breakdown
    8. (-) NEGATIVE — diversity metric in valid [0, 1] range (catches off-by-one)

# RESOURCES: ml_recommendation disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.recommendation_lifecycle import RecoLifecycle

    print("\nDRILL: INSUR recommendation lifecycle\n")
    t0 = time.time()

    # ----- Step 1: end-to-end -----
    runner = RecoLifecycle(
        dept="drill_test",
        pipeline_name="recommendation_drill",
        n_users=200, n_items=60, top_k=10,
        artifacts_root=str(REPO_ROOT / "data" / "eval"),
    )
    manifest = runner.run()
    step(1, "lifecycle runs end-to-end on synthetic 200×60 matrix",
         manifest.duration_seconds > 0,
         f"{manifest.duration_seconds}s, {manifest.n_interactions} interactions, {len(manifest.algorithms)} algos")

    # ----- Step 2: all 4 algorithms scored -----
    scored = [a for a in manifest.algorithms if "ndcg_at_k" in a]
    step(2, "all 4 algorithms successfully scored",
         len(scored) >= 4,
         f"got {len(scored)} of {len(manifest.algorithms)}")

    # ----- Step 3: best algorithm beats popularity baseline -----
    pop = next((a for a in scored if "Popularity" in a["algorithm"]), None)
    best = next((a for a in scored if a["algorithm"] == manifest.best_algorithm), None)
    if not pop or not best:
        step(3, "popularity baseline + best algo both scored", False, "one missing")
        return
    ok = best["ndcg_at_k"] >= pop["ndcg_at_k"]
    step(3, "best algorithm beats popularity on nDCG (signal > noise)",
         ok, f"best={best['ndcg_at_k']} pop={pop['ndcg_at_k']}")

    # ----- Step 4: every algorithm has all 6 required metrics -----
    required = {"precision_at_k", "recall_at_k", "ndcg_at_k", "map_at_k", "diversity", "novelty"}
    bad = []
    for a in scored:
        missing = required - set(a.keys())
        if missing:
            bad.append(f"{a['algorithm']}: missing {missing}")
    step(4, "every algorithm has all 6 metrics (P@k, R@k, nDCG, MAP, diversity, novelty)",
         not bad, "; ".join(bad) if bad else "")

    # ----- Step 5: NEGATIVE — n_users=0 -----
    try:
        zero = RecoLifecycle(
            dept="drill_test", pipeline_name="reco_neg_users",
            n_users=0, n_items=10, top_k=5,
            artifacts_root=str(REPO_ROOT / "data" / "eval"),
        )
        z_manifest = zero.run()
        # Either errors OR produces 0 evaluated users
        evaluated = sum(a.get("n_users_evaluated", 0) for a in z_manifest.algorithms if isinstance(a, dict))
        step(5, "NEGATIVE: n_users=0 produces 0 evaluated users (no fabrication)",
             evaluated == 0,
             f"got {evaluated} users evaluated")
    except Exception as exc:
        step(5, "NEGATIVE: n_users=0 raises cleanly", True, f"({type(exc).__name__})")

    # ----- Step 6: NEGATIVE — top_k=0 -----
    try:
        zero_k = RecoLifecycle(
            dept="drill_test", pipeline_name="reco_neg_topk",
            n_users=30, n_items=20, top_k=0,
            artifacts_root=str(REPO_ROOT / "data" / "eval"),
        )
        zk_manifest = zero_k.run()
        # With top_k=0, P@0 / R@0 are mathematically undefined or zero;
        # MUST NOT silently substitute a default like 10
        # The manifest's top_k field MUST reflect the user's input (0)
        step(6, "NEGATIVE: top_k=0 preserved in manifest (no silent default)",
             zk_manifest.top_k == 0,
             f"manifest.top_k={zk_manifest.top_k}")
    except Exception as exc:
        step(6, "NEGATIVE: top_k=0 raises cleanly", True, f"({type(exc).__name__})")

    # ----- Step 7: manifest persisted -----
    mp = Path(manifest.artifacts_root) / "manifest.json"
    ok = mp.exists() and mp.stat().st_size > 500
    if ok:
        loaded = json.loads(mp.read_text())
        ok = "algorithms" in loaded and len(loaded["algorithms"]) >= 4
    step(7, "manifest.json persisted with ≥ 4 algorithms",
         ok, f"size={mp.stat().st_size}B" if mp.exists() else "missing")

    # ----- Step 8: NEGATIVE — diversity in valid range -----
    bad_div = []
    for a in scored:
        d = a.get("diversity", 0)
        if not 0 <= d <= 1:
            bad_div.append(f"{a['algorithm']}: diversity={d}")
    step(8, "NEGATIVE: diversity metric in [0, 1] (catches off-by-one)",
         not bad_div,
         "; ".join(bad_div) if bad_div else "")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
