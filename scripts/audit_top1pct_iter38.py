#!/usr/bin/env python3
"""Iter 38 audit · 7 agentic ops tables + endpoints + UI tabs."""
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

    print("Iter 38 audit · 7 ops tables + endpoints + UI tabs\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # Idempotency · clean up any stale rows from previous runs so unique
    # constraints (e.g., agent_team UNIQUE(agent_id)) don't fail.
    import psycopg2
    from core.config import get_settings
    with psycopg2.connect(get_settings().database_url) as cx, cx.cursor() as cur:
        cur.execute("DELETE FROM agent_team WHERE agent_id = %s", ("incident_triage",))
        cur.execute("DELETE FROM agent_capacity WHERE agent_id = %s", ("incident_triage",))
        cur.execute("DELETE FROM agent_sla WHERE agent_id = %s AND sla_name LIKE %s",
                    ("incident_triage", "Incident Triage Tier1%"))

    # 1. Health
    r = c.get("/api/v1/agentic-ops/health")
    d = r.json()
    a(f"1. /agentic-ops/health · {len(d.get('counts', {}))} tables",
      r.status_code == 200 and len(d.get("counts", {})) == 7)

    # 2-3. Feedback
    r = c.post("/api/v1/agentic-ops/feedback", json={
        "invocation_id": "INV-test38", "agent_id": "incident_triage",
        "feedback_type": "rating", "rating": 4, "category": "accuracy",
        "severity": "Low",
    })
    a(f"2. POST /feedback creates row ({r.status_code})",
      r.status_code == 200 and "feedback_id" in r.json())
    r = c.get("/api/v1/agentic-ops/feedback?agent_id=incident_triage")
    a(f"3. GET /feedback lists ({r.json().get('count')})",
      r.status_code == 200 and r.json().get("count", 0) >= 1)

    # 4. Incident
    r = c.post("/api/v1/agentic-ops/incidents", json={
        "agent_id": "incident_triage", "incident_type": "hallucination",
        "severity": "P2", "title": "Iter 38 test incident",
    })
    a(f"4. POST /incidents creates ({r.status_code})",
      r.status_code == 200 and "incident_id" in r.json())

    # 5. Dependency
    r = c.post("/api/v1/agentic-ops/dependencies", json={
        "agent_id": "incident_triage", "dependency_type": "mcp",
        "dependency_name": "github-mcp", "criticality": "High",
        "status": "Healthy",
    })
    a(f"5. POST /dependencies creates ({r.status_code})",
      r.status_code == 200 and "dependency_id" in r.json())

    # 6. Team
    r = c.post("/api/v1/agentic-ops/teams", json={
        "agent_id": "incident_triage", "business_owner": "VP Ops",
        "technical_owner": "AI Architect", "support_model": "24x7",
    })
    a(f"6. POST /teams creates ({r.status_code})",
      r.status_code == 200 and "team_id" in r.json())

    # 7. SLA
    r = c.post("/api/v1/agentic-ops/slas", json={
        "agent_id": "incident_triage", "sla_name": "Incident Triage Tier1",
        "sla_tier": "Tier1", "availability_target": 99.99,
        "latency_target_ms": 2000, "accuracy_target": 95.0,
    })
    a(f"7. POST /slas creates ({r.status_code})",
      r.status_code == 200 and "sla_id" in r.json())

    # 8. Capacity
    r = c.post("/api/v1/agentic-ops/capacities", json={
        "agent_id": "incident_triage", "max_concurrent_requests": 100,
        "max_queue_depth": 1000, "target_throughput_rps": 100,
    })
    a(f"8. POST /capacities creates ({r.status_code})",
      r.status_code == 200 and "capacity_id" in r.json())

    # 9. Queue
    r = c.post("/api/v1/agentic-ops/queue/enqueue", json={
        "agent_id": "incident_triage", "job_type": "incident_triage",
        "priority": 1, "payload": {"incident_id": "INC-99"},
    })
    a(f"9. POST /queue/enqueue creates ({r.status_code})",
      r.status_code == 200 and "queue_id" in r.json())

    # 10. Rollup pulls all 7 surfaces
    r = c.get("/api/v1/agentic-ops/agent/incident_triage/rollup")
    d = r.json()
    has_all = all(k in d for k in [
        "feedback", "incidents", "dependencies", "team", "sla", "capacity", "queue"
    ])
    a(f"10. /agent/{{id}}/rollup returns 7 surfaces ({has_all})", has_all)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 38 · 7 ops tables (feedback + incident + dep + team + sla + capacity + queue)")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
