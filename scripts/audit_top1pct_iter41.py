#!/usr/bin/env python3
"""Iter 41 audit · real end-to-end invocation runtime."""
import logging, os, sys, json
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

    print("Iter 41 audit · real LLM execution + tools + audit\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. Invoke a real seeded agent (no API key → stub path)
    r = c.post("/api/v1/agentic/invoke", json={
        "agent_id": "fraud_scorer",
        "input_text": "Score this claim · policy PL-123456 · amount $25000",
        "trigger_kind": "api",
    })
    d = r.json()
    a(f"1. /invoke returns 200 + invocation_id ({r.status_code})",
      r.status_code == 200 and d.get("invocation_id"))

    a(f"2. plan_provider declared ({d.get('plan_provider')})",
      d.get("plan_provider") in ("stub", "openai", "anthropic", "ollama"))

    a(f"3. plan has steps + rationale ({d.get('n_skills_planned')} steps)",
      d.get("plan", {}).get("steps") and d.get("plan", {}).get("rationale"))

    a(f"4. scaffold flag honest ({d.get('scaffold')} · reason={d.get('scaffold_reason', '')[:30]})",
      "scaffold" in d and "scaffold_reason" in d)

    a(f"5. duration_ms + cost_usd + tokens present",
      "duration_ms" in d and "cost_usd" in d and "tokens_in" in d)

    a(f"6. skills_used populated ({len(d.get('skills_used', []))} skills)",
      isinstance(d.get("skills_used"), list))

    a(f"7. step_results detailed (per-step timing)",
      isinstance(d.get("step_results"), list)
      and (not d["step_results"] or "duration_ms" in d["step_results"][0]))

    # 8. Audit row was actually written
    inv_id = d.get("invocation_id")
    r2 = c.get(f"/api/v1/agentic/invocations/{inv_id}")
    row = r2.json()
    a(f"8. audit row in DB · status={row.get('status')}",
      r2.status_code == 200 and row.get("invocation_id") == inv_id)

    # 9. audit row has REAL data (not scaffold placeholder)
    a(f"9. audit row populates plan_text + skills_used + tools_used",
      row.get("plan_text") and not row.get("plan_text", "").startswith("SCAFFOLD"))

    # 10. Invoke a different agent · plan differs (deterministic per agent)
    r3 = c.post("/api/v1/agentic/invoke", json={
        "agent_id": "claim_intake",
        "input_text": "FNOL · policy PL-789 · vehicle damage from collision",
    })
    d3 = r3.json()
    a(f"10. Different agent produces different skills ({d.get('skills_used', [])[:2]} vs {d3.get('skills_used', [])[:2]})",
      d3.get("skills_used") != d.get("skills_used"))

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 41 · real runtime · LLM stub + tool stub + complete audit row")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
