#!/usr/bin/env python3
"""Iter 43 audit · all-blueprints + TF-IDF + trace events + AllAgentsNetworkPanel."""
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

    print("Iter 43 audit · all-blueprints + Tier-1 #3 + #4\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. /all-blueprints
    r = c.get("/api/v1/agentic/agents/all-blueprints")
    d = r.json()
    a(f"1. /all-blueprints returns 100 agents ({d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 100)
    a(f"2. Stats include MCPs ({d.get('stats', {}).get('n_unique_mcps', 0)})",
      d.get("stats", {}).get("n_unique_mcps", 0) >= 10)
    a(f"3. Stats include RAG ({d.get('stats', {}).get('n_unique_rag', 0)})",
      d.get("stats", {}).get("n_unique_rag", 0) >= 10)

    # 4. Filter by department
    r = c.get("/api/v1/agentic/agents/all-blueprints?department=Fraud")
    d = r.json()
    a(f"4. Filter by department Fraud ({d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 5
      and all(row["department"] == "Fraud" for row in d.get("agents", [])))

    # 5-6. Tier-1 #3 · TF-IDF search
    c.post("/api/v1/ril/knowledge", json={
        "knowledge_title": "Hybrid retrieval pattern",
        "content": "Combine BM25 keyword search with dense vector embeddings then rerank",
        "tags": "rag, search, reranking",
    })
    r = c.get("/api/v1/ril/knowledge/search?q=vector%20reranking")
    d = r.json()
    a(f"5. /knowledge/search · engine declared ({d.get('engine')})",
      d.get("engine") in ("sklearn-tfidf", "ilike-fallback"))
    a(f"6. TF-IDF returns scored results ({d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 1)

    # 7-8. Tier-1 #4 · trace events
    r = c.post("/api/v1/agentic/invoke", json={
        "agent_id": "fraud_scorer", "input_text": "Trace test",
    })
    d = r.json()
    inv_id = d.get("invocation_id")
    trace_id = d.get("trace_id")
    a(f"7. /invoke returns trace_id ({trace_id and trace_id[:16]})",
      bool(trace_id) and len(trace_id or "") >= 16)

    r = c.get(f"/api/v1/agentic/invocations/{inv_id}/trace")
    t = r.json()
    a(f"8. /trace returns event spans ({t.get('n_events')})",
      r.status_code == 200 and t.get("n_events", 0) >= 1
      and any(ev["event_name"] == "plan" for ev in t.get("events", [])))

    # 9. Trace events include skill spans
    skill_events = [ev for ev in t.get("events", []) if ev["event_name"].startswith("skill.")]
    a(f"9. Trace has skill spans ({len(skill_events)})",
      len(skill_events) >= 1)

    # 10. AllAgentsNetworkPanel exists
    panel = REPO / "frontend/src/components/AllAgentsNetworkPanel.jsx"
    a("10. AllAgentsNetworkPanel.jsx · filterable + expandable",
      panel.exists()
      and "filterDept" in panel.read_text()
      and "all-blueprints" in panel.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 43 · all-blueprints + Tier-1 #3 TF-IDF + #4 trace events")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
