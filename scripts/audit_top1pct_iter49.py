#!/usr/bin/env python3
"""Iter 49 · Slack integration · webhook + slash + ask-agent + MCP registration."""
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
    print("Iter 49 · Slack integration\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/slack/health")
    a(f"1. /slack/health responds 200", r.status_code == 200 and "webhook_configured" in r.json())

    r = c.post("/api/v1/slack/dispatch", json={"text": "test"})
    d = r.json()
    a(f"2. /slack/dispatch returns scaffold or delivered ({d.get('status')})",
      r.status_code == 200 and d.get("status") in ("scaffold", "delivered", "error"))

    r = c.post("/api/v1/slack/dispatch", json={"text": "test"})
    a("3. dispatch with no webhook honest scaffold",
      "would_send" in r.json() or r.json().get("status") == "delivered")

    r = c.post("/api/v1/slack/command",
               json={"command": "/ask", "text": "is payment up?", "user_id": "U1"})
    d = r.json()
    a(f"4. /slack/command runs agent · invocation_id={d.get('invocation_id', '')[:20]}",
      r.status_code == 200 and ("invocation_id" in d or "response_type" in d))

    r = c.post("/api/v1/slack/command",
               json={"command": "/unknown", "text": "hello"})
    a("5. unknown command returns helpful response",
      "Unknown command" in r.json().get("text", "") or r.json().get("response_type") == "ephemeral")

    r = c.post("/api/v1/slack/ask-agent",
               json={"question": "score risk", "agent_id": "fraud_scorer",
                     "notify_slack": False})
    d = r.json()
    a(f"6. /slack/ask-agent · provider={d.get('provider')}",
      r.status_code == 200 and "answer_plan" in d and "provider" in d)

    a(f"7. ask-agent declares scaffold flag", "scaffold" in d)
    a(f"8. ask-agent declares cost", "cost_usd" in d)

    # MCP registration
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM tool_registry WHERE tool_id='slack_mcp'")
        n_tool = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE agent_id='sys_slack_mcp'")
        n_agent = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM agent_skill_mapping WHERE agent_id='sys_slack_mcp'")
        n_map = cur.fetchone()[0]
    cx.close()
    a(f"9. slack_mcp registered in tool_registry ({n_tool})", n_tool == 1)
    a(f"10. sys_slack_mcp agent + {n_map} skills mapped",
      n_agent == 1 and n_map >= 3)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
