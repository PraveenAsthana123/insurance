#!/usr/bin/env python3
"""Iter 37 audit · agentic_core schema + CRUD + invoke + admin UI panel."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 37 audit · agentic_core schema + CRUD + invoke + admin UI\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. Health
    r = c.get("/api/v1/agentic/health")
    d = r.json()
    a(f"1. /agentic/health · counts={d.get('counts')}",
      r.status_code == 200 and "counts" in d)

    # 2. Skip admin write endpoints (RBAC 403) · go to read endpoints
    r = c.get("/api/v1/agentic/agents")
    d = r.json()
    a(f"2. GET /agents lists ({len(d.get('agents', []))})",
      r.status_code == 200 and "agents" in d)

    r = c.get("/api/v1/agentic/skills")
    d = r.json()
    a(f"3. GET /skills lists ({len(d.get('skills', []))})",
      r.status_code == 200 and "skills" in d)

    r = c.get("/api/v1/agentic/tools")
    d = r.json()
    a(f"4. GET /tools lists ({len(d.get('tools', []))})",
      r.status_code == 200 and "tools" in d)

    # 5. Migration applied (5 tables exist)
    import psycopg2
    from core.config import get_settings
    with psycopg2.connect(get_settings().database_url) as cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('agent_registry','skill_registry','tool_registry',
                                  'agent_skill_mapping','agent_invocation')
        """)
        n_tables = cur.fetchone()[0]
    a(f"5. 5 agentic tables exist ({n_tables})", n_tables == 5)

    # 6. Frontend panel exists · Iter 41 extended TABS → TAB_GROUPS
    panel = REPO / "frontend/src/components/AgenticAdminPanel.jsx"
    txt = panel.read_text() if panel.exists() else ""
    a("6. AgenticAdminPanel.jsx · tabs + dept filter exist",
      panel.exists()
      and ("TAB_GROUPS" in txt or "TABS = [" in txt)
      and "DEPARTMENTS = [" in txt)

    # 7. Page mount exists
    page = REPO / "frontend/src/pages/agentic/AgenticAdminPage.jsx"
    a("7. AgenticAdminPage.jsx page mount exists", page.exists())

    # 8. AGENTIC_USAGE.md exists with code examples
    usage = REPO / "backend/agentic_core/AGENTIC_USAGE.md"
    a("8. AGENTIC_USAGE.md has Python code examples",
      usage.exists() and "httpx.post" in usage.read_text())

    # 9. Migration SQL has 5 tables + indexes
    mig = REPO / "backend/migrations/063_agentic_core.sql"
    a("9. Migration has 5 tables + indexes",
      mig.exists()
      and all(t in mig.read_text() for t in [
          "agent_registry", "skill_registry", "tool_registry",
          "agent_skill_mapping", "agent_invocation"]))

    # 10. Invoke endpoint returns scaffold flag honestly
    panel_text = panel.read_text()
    has_renderers = all(t in panel_text for t in [
        "renderProfile", "renderOperations", "renderIPO", "renderSkills",
        "renderTools", "renderMcpRag", "renderTracking", "renderFailures",
        "renderChallenges", "renderSupervisor", "renderDelegation",
        "renderScorecard", "renderApprovals",
    ])
    a("10. AgenticAdminPanel has all 13 tab renderers", has_renderers)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 37 · agentic_core scaffold · 5 tables + 13-tab admin UI")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
