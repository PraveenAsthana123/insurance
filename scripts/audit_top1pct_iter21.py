#!/usr/bin/env python3
"""Iter 21 audit · alerts + activity + bulk HITL + permalink + process compare."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 21 audit · alerts + activity + bulk + permalink + compare\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. Alerts counts
    r = c.get("/api/v1/alerts/health")
    a("1. /alerts/health 200", r.status_code == 200)

    r = c.get("/api/v1/alerts/counts")
    d = r.json()
    a(f"2. /alerts/counts returns total ({d.get('total')})",
      r.status_code == 200 and "total" in d)
    a("3. counts has hitl + drift + comments",
      "hitl_pending" in d and "drift_alerts" in d and "new_comments" in d)

    # 4-5. Activity log
    r = c.post("/api/v1/alerts/activity", json={"actor": "test", "action": "test_action", "target": "test-target"})
    a("4. POST /activity logs entry", r.status_code == 200)

    r = c.get("/api/v1/alerts/activity?limit=5")
    d = r.json()
    # Iter 26 retrofit · /activity returns paginated envelope (items/total)
    n = d.get("total") if d.get("total") is not None else len(d.get("items") or d.get("rows") or [])
    a(f"5. GET /activity returns rows ({n})",
      r.status_code == 200 and n >= 1)

    # 6. Bulk HITL
    r = c.post("/api/v1/alerts/hitl/bulk", json={
        "decisions": [{"run_ref": "R1", "decision_iter": 1}, {"run_ref": "R2", "decision_iter": 2}],
        "action": "approve",
        "actor": "test",
    })
    d = r.json()
    a(f"6. /alerts/hitl/bulk returns {d.get('n_processed')} receipts",
      r.status_code == 200 and d.get("n_processed") == 2)

    # 7-10. UI components exist
    files = {
        "AlertsBadge": "frontend/src/components/AlertsBadge.jsx",
        "PermalinkShare": "frontend/src/components/PermalinkShare.jsx",
        "ActivityLogPanel": "frontend/src/components/ActivityLogPanel.jsx",
        "ProcessComparePanel": "frontend/src/components/ProcessComparePanel.jsx",
    }
    a("7. AlertsBadge + PermalinkShare exist",
      (REPO / files["AlertsBadge"]).exists() and (REPO / files["PermalinkShare"]).exists())
    a("8. ActivityLogPanel exists + has logActivity helper",
      (REPO / files["ActivityLogPanel"]).exists()
      and "logActivity" in (REPO / files["ActivityLogPanel"]).read_text())
    a("9. ProcessComparePanel exists + has 2-process selector",
      (REPO / files["ProcessComparePanel"]).exists()
      and "ProcessPicker" in (REPO / files["ProcessComparePanel"]).read_text())
    hitl = (REPO / "frontend/src/components/HITLPanel.jsx").read_text()
    a("10. HITLPanel has bulk approve/reject + checkbox column",
      "Bulk approve" in hitl and "Bulk reject" in hitl and "toggleSelect" in hitl)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 21 · push composite 95 → 100")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
