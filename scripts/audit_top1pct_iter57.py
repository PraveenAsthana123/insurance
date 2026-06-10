#!/usr/bin/env python3
"""Iter 57 · RAGAS + DeepEval + 5-OS + canonical pattern agents + global policy."""
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
    print("Iter 57 · output evaluation + canonical patterns\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from production_pipeline.evaluation import evaluate_output
    r = evaluate_output("How do I escalate?",
                        "To escalate, contact on-call via Slack.",
                        ["Escalate via Slack #ops"])
    a(f"1. evaluate_output returns composite_quality ({r['composite_quality']})",
      "composite_quality" in r)
    a("2. RAGAS faithfulness measured",
      "score" in r['ragas']['faithfulness'])
    a("3. RAGAS answer_relevance measured",
      "score" in r['ragas']['answer_relevance'])
    a("4. DeepEval g_score measured",
      "score" in r['deepeval']['g_score'])
    a("5. toxicity measured", "score" in r['toxicity'])
    a("6. social_bias measured", "score" in r['social_bias'])
    a("7. sentiment measured (polarity declared)",
      "polarity" in r['sentiment'])

    # Pipeline integration
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    r = c.post("/api/v1/production-pipeline/run",
               json={"user_input": "test eval", "severity": "info"})
    d = r.json()
    verifier = next(s for s in d['stages'] if s['stage_no'] == 17)
    a(f"8. Stage 17 verifier includes evaluation",
      "evaluation" in verifier['output'])

    # Canonical agents
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""SELECT COUNT(*) FROM agent_registry
                       WHERE agent_id IN ('sys_paperclip','sys_openclaw','sys_harness_agent',
                                          'sys_poliai','sys_council','sys_hub_spoke',
                                          'sys_dark_factory','sys_output_evaluator')""")
        n = cur.fetchone()[0]
    cx.close()
    a(f"9. 8 canonical pattern agents registered ({n})", n == 8)

    policy = Path.home() / ".claude/policies/agentic-system-patterns.md"
    a("10. Global policy agentic-system-patterns.md committed",
      policy.exists() and policy.stat().st_size > 2000)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
