#!/usr/bin/env python3
"""Drill: INSUR Graph AI per dept (§38 + §39 + §45 + §47 + §49 + §66).

Steps (10 total; 3 negative):
    1. (+) graph router imports + ALLOWED_NODE_TYPES = 8 canonical types
    2. (+) per-dept GET returns 200 + ≥ 70 nodes + ≥ 50 edges
    3. (+) every node has type ∈ ALLOWED_NODE_TYPES
    4. (+) every edge.source AND edge.target resolve to existing node_ids
           (no dangling edges — graph integrity invariant)
    5. (-) NEGATIVE — unknown dept → 404
    6. (-) NEGATIVE — node filter type=Bogus! → 400 (malformed)
                                     type=unknown_type → 404 (no info leak)
    7. (-) NEGATIVE — neighbors of nonexistent node → 404
    8. (+) /nodes?type=role returns exactly 15 role nodes (per §63)
    9. (+) /neighbors/<role:manager> returns demo + dashboard + ≥ 1 report (1-hop)
   10. (+) _global rollup returns all 19 depts + totals.nodes/edges > 0

# RESOURCES: graph_router disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

EXPECTED_DEPTS = {
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
}

EXPECTED_NODE_TYPES = {
    "master_entity", "process", "pipeline", "role", "report",
    "demo", "audit_event_type", "dashboard",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: INSUR Graph AI per dept (§38 + §39 + §45 + §47 + §49 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router + ALLOWED_NODE_TYPES catalog -----
    try:
        from routers import graph as gr
    except Exception as exc:
        step(1, "graph router imports", False, f"{type(exc).__name__}: {exc}")
        return
    has_taxonomy = (
        hasattr(gr, "ALLOWED_NODE_TYPES")
        and gr.ALLOWED_NODE_TYPES == EXPECTED_NODE_TYPES
    )
    step(1, "router imports + ALLOWED_NODE_TYPES has 8 canonical types",
         has_taxonomy, f"n_types={len(gr.ALLOWED_NODE_TYPES)}")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(gr.router)
    client = TestClient(app)

    # ----- Step 2: per-dept graph 200 + size -----
    r = client.get("/api/v1/insur/graph/sales")
    body = r.json() if r.status_code == 200 else {}
    nodes = body.get("nodes", [])
    edges = body.get("edges", [])
    ok = r.status_code == 200 and len(nodes) >= 70 and len(edges) >= 50
    step(2, "GET /sales → 200 + ≥ 70 nodes + ≥ 50 edges",
         ok, f"status={r.status_code} n_nodes={len(nodes)} n_edges={len(edges)}")

    # ----- Step 3: every node carries allowed type -----
    bad_types = [
        f"{n.get('id')}({n.get('type')})"
        for n in nodes
        if n.get("type") not in EXPECTED_NODE_TYPES
    ]
    step(3, "every node has type ∈ ALLOWED_NODE_TYPES",
         not bad_types, f"bad: {bad_types[:3]}" if bad_types else "")

    # ----- Step 4: edge integrity — no dangling -----
    node_ids = {n["id"] for n in nodes}
    dangling = []
    for e in edges:
        if e["source"] not in node_ids:
            dangling.append(f"src missing: {e['source']}")
        if e["target"] not in node_ids:
            dangling.append(f"tgt missing: {e['target']}")
    step(4, "every edge.source + edge.target resolves to existing node",
         not dangling, "; ".join(dangling[:3]) if dangling else
         f"all {len(edges)} edges resolve")

    # ----- Step 5: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/insur/graph/not-a-real-dept")
    step(5, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — malformed type AND unknown type -----
    r1 = client.get("/api/v1/insur/graph/sales/nodes?type=Bogus!")
    r2 = client.get("/api/v1/insur/graph/sales/nodes?type=unknown_type")
    step(6, "NEGATIVE: malformed type → 400 + unknown type → 404",
         r1.status_code == 400 and r2.status_code == 404,
         f"malformed={r1.status_code} unknown={r2.status_code}")

    # ----- Step 7: NEGATIVE — nonexistent node neighbors -----
    r = client.get("/api/v1/insur/graph/sales/neighbors/entity:totally_bogus_xyz")
    step(7, "NEGATIVE: neighbors of nonexistent node → 404",
         r.status_code == 404, f"got {r.status_code}")

    # ----- Step 8: /nodes?type=role → exactly 15 -----
    r = client.get("/api/v1/insur/graph/sales/nodes?type=role")
    body = r.json() if r.status_code == 200 else {}
    role_count = len(body.get("nodes", []))
    step(8, "/nodes?type=role returns exactly 15 (per §63)",
         r.status_code == 200 and role_count == 15,
         f"status={r.status_code} n_roles={role_count}")

    # ----- Step 9: role:manager 1-hop — demo + dashboard + ≥ 1 report -----
    r = client.get("/api/v1/insur/graph/sales/neighbors/role:manager")
    body = r.json() if r.status_code == 200 else {}
    neighbor_types = {n["type"] for n in body.get("neighbors", [])}
    has_demo = "demo" in neighbor_types
    has_dashboard = "dashboard" in neighbor_types
    has_report = "report" in neighbor_types
    step(9, "/neighbors/role:manager surfaces demo + dashboard + ≥ 1 report",
         r.status_code == 200 and has_demo and has_dashboard and has_report,
         f"types={sorted(neighbor_types)}")

    # ----- Step 10: _global rollup -----
    r = client.get("/api/v1/insur/graph/_global")
    body = r.json() if r.status_code == 200 else {}
    depts_in = set(body.get("depts", []))
    missing = EXPECTED_DEPTS - depts_in
    totals = body.get("totals", {})
    ok = (
        r.status_code == 200
        and not missing
        and totals.get("nodes", 0) > 0
        and totals.get("edges", 0) > 0
    )
    step(10,
         f"_global rollup returns all {len(EXPECTED_DEPTS)} depts + totals>0",
         ok,
         f"depts={len(depts_in)} totals={totals}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
