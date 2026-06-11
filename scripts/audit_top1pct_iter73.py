#!/usr/bin/env python3
"""Iter 73 · §103 Enterprise AI 9-Phase Maturity Model."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 73 · §103 9-phase maturity\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/maturity-model/health")
    d = r.json()
    a(f"1. /health · 9 phases ({d.get('phases_total')})", d.get("phases_total") == 9)
    a(f"2. 11 AI layers ({d.get('ai_layers_total')})",
      d.get("ai_layers_total") == 11)

    r = c.get("/api/v1/maturity-model/coverage")
    d = r.json()
    a(f"3. /coverage returns 9 phases ({len(d['phases'])})",
      len(d['phases']) == 9)
    a(f"4. average_pct > 70% ({d['summary']['average_pct']}%)",
      d['summary']['average_pct'] > 70)

    r = c.get("/api/v1/maturity-model/level")
    lvl = r.json().get("level")
    a(f"5. Maturity level ≥ 6 (current: {lvl})", lvl >= 6)

    r = c.get("/api/v1/maturity-model/ai-layers")
    a(f"6. /ai-layers all 11 wired ({r.json().get('n_wired')})",
      r.json().get("n_wired") == 11)

    r = c.get("/api/v1/maturity-model/blueprints")
    a(f"7. 12 reference blueprints ({r.json().get('count')})",
      r.json().get("count") == 12)

    r = c.get("/api/v1/maturity-model/marketplace")
    a(f"8. 10 marketplace categories ({r.json().get('count')})",
      r.json().get("count") == 10)

    r = c.get("/api/v1/maturity-model/channels")
    a(f"9. 23 mandatory channels ({r.json().get('total')})",
      r.json().get("total") == 23)

    policy = Path.home() / ".claude/policies/enterprise-ai-9-phase-maturity-model.md"
    a("10. Global policy §103 MANDATORY tagged",
      policy.exists() and "MANDATORY" in policy.read_text()[:200])

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
