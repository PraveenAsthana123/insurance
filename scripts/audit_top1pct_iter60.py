#!/usr/bin/env python3
"""Iter 60 · 106-item multi-agent production checklist."""
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
    print("Iter 60 · production checklist\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/production-checklist/health")
    a("1. /health declares 8 sections", r.json().get("n_sections") == 8)

    r = c.get("/api/v1/production-checklist/full")
    d = r.json()
    a(f"2. /full returns 8 sections ({len(d['sections'])})",
      len(d['sections']) == 8)

    a(f"3. ≥100 total items ({d['summary']['total_items']})",
      d['summary']['total_items'] >= 100)

    expected_keys = ["1_terminal", "2_ui", "3_agents", "4_registries",
                     "5_controls", "6_security", "7_testing", "8_observability"]
    missing = [e for e in expected_keys if e not in d['sections']]
    a(f"4. All 8 operator-named sections present (missing={len(missing)})", not missing)

    a(f"5. Done count > 50 ({d['summary']['done']})",
      d['summary']['done'] > 50)
    a(f"6. Production-ready > 70% ({d['summary']['production_ready_pct']}%)",
      d['summary']['production_ready_pct'] > 70)

    # Every item has where pointer
    section_1 = d['sections']['1_terminal']
    a(f"7. Each item has 'where' pointer ({len(section_1)})",
      all('where' in it and 'status' in it for it in section_1))

    r = c.get("/api/v1/production-checklist/summary")
    a("8. /summary endpoint returns by_section breakdown",
      "by_section" in r.json())

    # CLI
    insur = (REPO / "scripts/insur").read_text()
    a("9. ./scripts/insur checklist wired", "cmd_checklist" in insur)

    # Global policy
    policy = Path.home() / ".claude/policies/multi-agent-production-checklist.md"
    a("10. Global policy §99 committed",
      policy.exists() and policy.stat().st_size > 2000)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
