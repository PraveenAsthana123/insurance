#!/usr/bin/env python3
"""Seed 12 testing-specific agents · Iter 47.

Per operator brief: 'have agent for testing · frontend · backend · model
· data · accuracy · pipeline · CUA · Stagehand · Playwright · pytest ·
fallback · inference · training · job'.

Direct SQL upsert (same pattern as seed_100_agents.py · bypasses RBAC).
"""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)

import psycopg2
from core.config import get_settings


# (agent_id, name, runtime, purpose, risk, skills[])
TEST_AGENTS = [
    # ─── Frontend test agents ───
    ("test_frontend_playwright",  "Frontend · Playwright E2E",
     "Playwright (Iter 22)",
     "Browser automation · click flows · console error capture · screenshot diff",
     "Low",
     ["smoke_test", "click_through_flow", "capture_console", "screenshot_diff"]),
    ("test_frontend_cua",         "Frontend · Computer-Using Agent",
     "Anthropic Claude CUA / OpenAI Operator",
     "Vision-based browser interaction · visual regression · accessibility tests",
     "Medium",
     ["visual_regression", "a11y_audit", "natural_lang_navigation"]),
    ("test_frontend_stagehand",   "Frontend · Stagehand semantic browser",
     "Stagehand (Browserbase)",
     "Semantic page.act · page.extract · page.observe primitives",
     "Medium",
     ["semantic_navigate", "extract_structured_data", "observe_dom_changes"]),

    # ─── Backend test agents ───
    ("test_backend_pytest",       "Backend · pytest",
     "pytest + httpx",
     "Unit + integration tests · TestClient against in-process FastAPI",
     "Low",
     ["unit_test", "integration_test", "contract_test", "fixture_setup"]),
    ("test_backend_load_k6",      "Backend · k6 load test",
     "k6 (Iter 26)",
     "p95/p99 thresholds · throughput soak tests · 5-phase per §47.10",
     "Medium",
     ["smoke_load", "stress_test", "soak_test", "spike_test"]),

    # ─── Model + accuracy test agents ───
    ("test_model_accuracy",       "Model · accuracy evaluator",
     "sklearn + RAGAS",
     "Eval set runs · confusion matrix · calibration · drift detection",
     "Medium",
     ["eval_set_run", "confusion_matrix", "ece_brier", "drift_psi"]),
    ("test_model_fairness",       "Model · fairness gates",
     "Fairlearn + AIF360",
     "Disparate impact ≥0.8 · equal opportunity · calibration parity",
     "High",
     ["disparate_impact", "equal_opportunity", "calibration_parity"]),
    ("test_model_robustness",     "Model · adversarial + perturbation",
     "Garak + custom",
     "Prompt injection · jailbreak · adversarial example resistance",
     "High",
     ["prompt_injection_test", "jailbreak_test", "adversarial_input"]),

    # ─── Data quality test agents ───
    ("test_data_quality",         "Data · quality runner",
     "Great Expectations + Soda (Iter 27)",
     "Null rate · uniqueness · range · referential integrity per table",
     "Low",
     ["null_check", "uniqueness_check", "range_check", "ref_integrity"]),
    ("test_data_pipeline",        "Pipeline · end-to-end runner",
     "Custom pipeline runner",
     "Triggers data pipeline · validates intermediate artifacts · final metrics",
     "Medium",
     ["pipeline_smoke", "intermediate_validate", "final_metric_gate"]),

    # ─── Runtime test agents ───
    ("test_inference_runner",     "Inference · production runner",
     "Direct LLM client",
     "Periodic inference health check · latency p95 · cost per request",
     "Medium",
     ["inference_smoke", "latency_p95", "cost_per_request"]),
    ("test_training_runner",      "Training · MLflow run validator",
     "MLflow + sklearn",
     "Training job submit · metric capture · model registry promote",
     "High",
     ["submit_training_job", "capture_metrics", "registry_promote"]),
    ("test_job_runner",           "Job · queue executor",
     "Celery + RQ",
     "Background job dispatch · retries · DLQ monitoring",
     "Medium",
     ["dispatch_job", "monitor_queue_depth", "dlq_review"]),

    # ─── Fallback chain test ───
    ("test_fallback_chain",       "Fallback · degraded path tester",
     "Custom",
     "Verifies primary→fallback→degraded·simulates dependency failure",
     "High",
     ["primary_fail_simulate", "fallback_activates", "degraded_mode_reaches"]),
]


def main() -> int:
    cx = psycopg2.connect(get_settings().database_url)
    n_agents = 0
    n_skills = 0
    n_mappings = 0
    with cx, cx.cursor() as cur:
        for agent_id, name, runtime, purpose, risk, skills in TEST_AGENTS:
            # Upsert agent
            cur.execute("""
                INSERT INTO agent_registry
                  (agent_id, agent_name, agent_type, department_id, business_domain,
                   purpose, owner_team, status, autonomy_level, risk_level,
                   model_name, runtime_framework, max_steps, timeout_seconds,
                   cost_limit, tenant_id)
                VALUES (%s, %s, 'Worker', 'Quality Engineering', 'Testing',
                        %s, 'Quality Engineering', 'Active',
                        'Approval Required', %s, %s, %s, 5, 300, 1.00, 'default')
                ON CONFLICT (agent_id) DO UPDATE SET
                  agent_name = EXCLUDED.agent_name,
                  business_domain = EXCLUDED.business_domain,
                  purpose = EXCLUDED.purpose,
                  status = 'Active',
                  updated_at = CURRENT_TIMESTAMP
            """, (agent_id, name, purpose, risk,
                  "gpt-4o" if risk == "High" else "gpt-4o-mini",
                  runtime))
            n_agents += 1

            # Upsert skills + map
            for skill_id in skills:
                full_id = f"test_{skill_id}"
                cur.execute("""
                    INSERT INTO skill_registry
                      (skill_id, skill_name, skill_category, description,
                       risk_level, execution_mode, status, owner_team, tenant_id)
                    VALUES (%s, %s, 'Testing', %s, %s,
                            CASE WHEN %s = 'High' THEN 'Approval Required' ELSE 'Automatic' END,
                            'Active', 'Quality Engineering', 'default')
                    ON CONFLICT (skill_id) DO UPDATE SET
                      status = 'Active', updated_at = CURRENT_TIMESTAMP
                """, (full_id, skill_id.replace("_", " ").title(),
                      f"{skill_id} · used by {agent_id}",
                      risk, risk))
                n_skills += 1

                cur.execute("""
                    INSERT INTO agent_skill_mapping
                      (agent_id, skill_id, execution_mode, priority, status)
                    VALUES (%s, %s,
                            CASE WHEN %s = 'High' THEN 'Approval Required' ELSE 'Automatic' END,
                            100, 'Active')
                    ON CONFLICT (agent_id, skill_id) DO NOTHING
                """, (agent_id, full_id, risk))
                n_mappings += 1

    print(f"  ✓ {n_agents} test agents upserted")
    print(f"  ✓ {n_skills} test skills upserted")
    print(f"  ✓ {n_mappings} agent-skill mappings")
    cx.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
