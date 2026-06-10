#!/usr/bin/env python3
"""Top-1% Iter 16-20 audit · final P1 closure."""
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

    print("Top-1% iter 16-20 audit · final P1\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. Regulatory P1 #16
    r = c.get("/api/v1/regulatory/articles")
    d = r.json()
    a(f"1. /regulatory/articles returns {d.get('count')} (≥24)",
      r.status_code == 200 and d.get("count", 0) >= 24)

    r = c.get("/api/v1/regulatory/test-proc")
    d = r.json()
    a(f"2. /regulatory/{{pid}} returns mapping ({d.get('compliance_pct')}%)",
      r.status_code == 200 and "compliance_pct" in d)
    a("3. mapping has by_framework_status breakdown",
      isinstance(d.get("by_framework_status"), dict)
      and "EU AI Act" in d.get("by_framework_status", {}))

    # 4-6. Comments P1 #18
    r = c.get("/api/v1/comments/health")
    d = r.json()
    a("4. /comments/health 200", r.status_code == 200)

    body = {"panel_id": "test-panel", "process_id": "test-proc",
            "author": "auditor", "body": "iter16 test comment"}
    r = c.post("/api/v1/comments", json=body)
    a("5. POST /comments creates thread entry", r.status_code == 200)

    r = c.get("/api/v1/comments/test-panel/test-proc")
    d = r.json()
    a(f"6. GET thread returns {d.get('count')} comments",
      r.status_code == 200 and d.get("count", 0) >= 1)

    # 7-10. UI components exist
    files = {
        "RegulatoryMappingPanel": "frontend/src/components/RegulatoryMappingPanel.jsx",
        "RoleViewSelector": "frontend/src/components/RoleViewSelector.jsx",
        "CommentsThread": "frontend/src/components/CommentsThread.jsx",
        "ExportButton": "frontend/src/components/ExportButton.jsx",
        "GlobalCmdK": "frontend/src/components/GlobalCmdK.jsx",
    }
    a("7. RegulatoryMappingPanel exists",
      (REPO / files["RegulatoryMappingPanel"]).exists())
    a("8. RoleViewSelector + ROLES + RoleGate exists",
      (REPO / files["RoleViewSelector"]).exists()
      and "RoleGate" in (REPO / files["RoleViewSelector"]).read_text())
    a("9. CommentsThread + ExportButton exist",
      (REPO / files["CommentsThread"]).exists()
      and (REPO / files["ExportButton"]).exists())
    a("10. GlobalCmdK exists + has Cmd+K handler",
      (REPO / files["GlobalCmdK"]).exists()
      and "metaKey" in (REPO / files["GlobalCmdK"]).read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: TOP_1_PCT_PLAN · P1 #16-20 closure")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
