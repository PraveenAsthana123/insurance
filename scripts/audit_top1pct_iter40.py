#!/usr/bin/env python3
"""Iter 40 audit · 8 risk/incident/learning tables + endpoints."""
import logging, os, sys, json
from datetime import datetime, timezone
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

    print("Iter 40 audit · 8 risk/incident/learning tables\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. Health
    r = c.get("/api/v1/ril/health")
    d = r.json()
    a(f"1. /ril/health · 8 tables ({len(d.get('counts', {}))})",
      r.status_code == 200 and len(d.get("counts", {})) == 8)

    # 2. Alert rule
    r = c.post("/api/v1/ril/alert-rules", json={
        "rule_name": "Hallucination > 10%", "rule_category": "AI",
        "warning_threshold": 5.0, "critical_threshold": 10.0,
        "escalation_level": "L2",
    })
    rule_id = r.json().get("rule_id")
    a(f"2. POST /alert-rules creates ({rule_id})", rule_id is not None)

    # 3. Escalation
    r = c.post("/api/v1/ril/escalations", json={
        "escalation_level": "L3", "escalation_reason": "Test escalation",
        "assigned_team": "AgentOps", "response_sla_minutes": 60,
    })
    a(f"3. POST /escalations creates ({r.json().get('escalation_id')})",
      r.status_code == 200)

    # 4. Incident
    r = c.post("/api/v1/ril/incidents", json={
        "incident_title": "Iter 40 test · hallucination spike",
        "incident_category": "AI", "incident_severity": "Sev-2",
        "business_impact": "Reduced trust", "reported_by": "monitor",
    })
    inc_id = r.json().get("incident_id")
    a(f"4. POST /incidents creates ({inc_id})", inc_id is not None)

    # 5. Timeline event
    r = c.post("/api/v1/ril/timeline", json={
        "incident_id": inc_id, "event_timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": "Detection", "event_category": "Detection",
        "event_description": "Alert triggered", "actor_type": "system",
    })
    a("5. POST /timeline event creates", r.status_code == 200)

    # 6. RCA
    r = c.post("/api/v1/ril/rcas", json={
        "incident_id": inc_id, "rca_title": "RCA for iter 40 test",
        "primary_root_cause": "Retrieval quality failure",
        "corrective_actions": "Add reranker",
        "preventive_actions": "Add eval gate before deploy",
    })
    a(f"6. POST /rcas creates ({r.json().get('rca_id')})", r.status_code == 200)

    # 7. Postmortem
    r = c.post("/api/v1/ril/postmortems", json={
        "incident_id": inc_id, "postmortem_title": "Iter 40 postmortem",
        "executive_summary": "Hallucination spike root caused",
        "what_went_well": "Alert fired in 30s",
        "what_went_poorly": "No fallback retrieval",
        "lessons_learned": "Hybrid search required",
    })
    a(f"7. POST /postmortems creates ({r.json().get('postmortem_id')})",
      r.status_code == 200)

    # 8. Lesson
    r = c.post("/api/v1/ril/lessons", json={
        "lesson_title": "Always use reranker for RAG",
        "lesson_category": "AI Governance",
        "source_type": "postmortem", "source_id": inc_id,
        "recommendation": "Enable hybrid search + reranking",
        "best_practice": "Vector + keyword + reranker",
        "anti_pattern": "Vector-only retrieval",
    })
    a(f"8. POST /lessons creates ({r.json().get('lesson_id')})", r.status_code == 200)

    # 9. Knowledge + search
    c.post("/api/v1/ril/knowledge", json={
        "knowledge_title": "RAG Standards", "knowledge_category": "Standard",
        "knowledge_type": "standard",
        "content": "Hybrid search and reranking required for production RAG",
        "tags": "rag, hybrid, reranking",
    })
    r = c.get("/api/v1/ril/knowledge/search?q=reranking")
    a(f"9. /knowledge/search returns matches ({r.json().get('count')})",
      r.status_code == 200 and r.json().get("count", 0) >= 1)

    # 10. Full incident rollup
    r = c.get(f"/api/v1/ril/incidents/{inc_id}/full")
    d = r.json()
    has_all = all(k in d for k in ["incident", "timeline", "rca", "postmortem"])
    a(f"10. /incidents/{{id}}/full returns 4-part rollup ({has_all})", has_all)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 40 · 8 ril tables (rule + escalation + incident + timeline + RCA + postmortem + lesson + knowledge)")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
