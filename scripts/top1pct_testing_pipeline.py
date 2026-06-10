#!/usr/bin/env python3
"""Top-1% testing pipeline · Iter 47.

Runs every test agent through Ollama (local LLM · no API key).
Falls back to honest stub plan when Ollama unreachable.

Cron: daily 04:00 UTC · INSUR-TOP1PCT-TESTING
Reports: jobs/reports/top1pct-testing/run-YYYYMMDD_HHMM.md|.json
"""
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

REPORTS = REPO / "jobs/reports/top1pct-testing"
REPORTS.mkdir(parents=True, exist_ok=True)

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")


def _ollama_available() -> bool:
    try:
        import httpx
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def _invoke_via_runtime(agent_id: str, input_text: str) -> dict:
    """Invoke via in-process runtime · NOT via HTTP."""
    from agentic_core.runtime import invoke
    try:
        return invoke(agent_id=agent_id, input_text=input_text,
                      trigger_kind="cron-top1pct")
    except Exception as e:
        return {"error": str(e)[:200], "agent_id": agent_id, "status": "Failed"}


def main() -> int:
    ts = datetime.now(timezone.utc)
    print(f"Top-1% testing pipeline · {ts:%Y-%m-%d %H:%M:%S} UTC")

    ollama_ok = _ollama_available()
    print(f"  Ollama: {'AVAILABLE @ ' + OLLAMA_URL if ollama_ok else 'unavailable · using stub'}")
    if ollama_ok:
        os.environ["INSUR_LLM_BACKEND"] = "ollama"
        os.environ["INSUR_LLM_OLLAMA_URL"] = OLLAMA_URL
        os.environ["INSUR_LLM_OLLAMA_MODEL"] = OLLAMA_MODEL

    # Pull test agents from DB
    import psycopg2, psycopg2.extras
    from core.config import get_settings
    with psycopg2.connect(get_settings().database_url) as c, \
         c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT agent_id, agent_name, business_domain, runtime_framework
            FROM agent_registry
            WHERE agent_id LIKE 'test\\_%' ESCAPE '\\' AND status='Active'
            ORDER BY agent_id
        """)
        test_agents = [dict(r) for r in cur.fetchall()]

    print(f"  Discovered {len(test_agents)} test agents")

    # Per-phase test inputs
    PHASE_INPUTS = {
        "test_frontend_playwright": "Run smoke E2E · capture console errors · 5 viewports",
        "test_frontend_cua":        "Visual regression vs golden screenshots · top 10 pages",
        "test_frontend_stagehand":  "Semantic navigate /agentic · extract counts per tab",
        "test_backend_pytest":      "Run pytest backend/tests/ · collect failures",
        "test_backend_load_k6":     "5 VU · 30s smoke · p95 < 500ms gate",
        "test_model_accuracy":      "Eval-set run · per-class F1 · confusion matrix",
        "test_model_fairness":      "Disparate impact + equal opportunity per protected group",
        "test_model_robustness":    "Prompt-injection probes · jailbreak resistance",
        "test_data_quality":        "Run GE expectations on 5 key tables",
        "test_data_pipeline":       "Trigger Phase 1-10 lifecycle · validate artifacts",
        "test_inference_runner":    "Inference smoke: p95 + cost per request",
        "test_training_runner":     "Submit MLflow run · capture metric · promote",
        "test_job_runner":          "Dispatch 10 jobs · monitor depth + retries",
        "test_fallback_chain":      "Simulate primary failure · verify fallback < 5s",
    }

    results = []
    t0 = time.perf_counter()
    for agent in test_agents:
        aid = agent["agent_id"]
        input_text = PHASE_INPUTS.get(aid, f"Run default test plan for {aid}")
        t_start = time.perf_counter()
        r = _invoke_via_runtime(aid, input_text)
        results.append({
            "agent_id": aid,
            "name": agent["agent_name"],
            "runtime": agent["runtime_framework"],
            "duration_ms": round((time.perf_counter() - t_start) * 1000, 1),
            "status": r.get("status", "Unknown"),
            "invocation_id": r.get("invocation_id"),
            "trace_id": r.get("trace_id"),
            "tokens": (r.get("tokens_in", 0), r.get("tokens_out", 0)),
            "cost_usd": r.get("cost_usd", 0),
            "scaffold": r.get("scaffold", False),
            "n_skills_executed": r.get("n_skills_executed", 0),
        })
        print(f"  · {aid:<32} {r.get('status', '?'):<15} {results[-1]['duration_ms']}ms"
              f" · {'stub' if results[-1]['scaffold'] else 'live'}")

    total_ms = round((time.perf_counter() - t0) * 1000, 1)
    n_success = sum(1 for r in results if r["status"] == "Success")
    n_failed = sum(1 for r in results if r["status"] in ("Failed", "PartialFailure"))
    n_pending = sum(1 for r in results if r["status"] == "PendingApproval")
    total_cost = sum(r["cost_usd"] for r in results)

    # Reports
    json_path = REPORTS / f"run-{ts:%Y%m%d_%H%M}.json"
    md_path   = REPORTS / f"run-{ts:%Y%m%d_%H%M}.md"
    json_path.write_text(json.dumps({
        "ts": ts.isoformat(), "ollama_available": ollama_ok,
        "model": OLLAMA_MODEL if ollama_ok else "stub",
        "results": results, "total_ms": total_ms, "total_cost_usd": total_cost,
    }, indent=2, default=str))

    md = [
        f"# Top-1% Testing Pipeline · {ts:%Y-%m-%d %H:%M:%S} UTC",
        "",
        f"- Agents run: **{len(results)}**",
        f"- Success: **{n_success}** · Failed: {n_failed} · Pending: {n_pending}",
        f"- Total time: {total_ms} ms",
        f"- Total cost (USD): ${total_cost:.4f}",
        f"- Ollama: {'✓ live @ ' + OLLAMA_URL if ollama_ok else '✗ unavailable · stub'}",
        f"- Model: `{OLLAMA_MODEL if ollama_ok else 'stub'}`",
        "",
        "## Per-agent results",
        "| Agent | Runtime | Status | ms | Tokens | Cost | Mode |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        md.append(
            f"| `{r['agent_id']}` | {r['runtime'][:30]} | {r['status']} | "
            f"{r['duration_ms']} | {r['tokens'][0]}/{r['tokens'][1]} | "
            f"${r['cost_usd']:.4f} | {'stub' if r['scaffold'] else 'live'} |"
        )
    md_path.write_text("\n".join(md))

    print(f"\n  ✓ {n_success}/{len(results)} success · "
          f"${total_cost:.4f} total cost · report → {md_path.relative_to(REPO)}")
    return 0 if n_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
