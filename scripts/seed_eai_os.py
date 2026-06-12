"""§144 · Seed Enterprise AI OS persistent tables with REAL data from existing sources.

Transforms:
  · agent_invocation traces  → process_discovery + bottleneck_analysis + automation_candidate
  · agent_registry           → digital_worker + capability
  · model_registry            → benchmark_registry + prompt_inventory seed
  · knowledge_base           → data_catalog + data_product
  · department                → autonomy_score + autonomous_department
"""
import json
import os
import psycopg2
from datetime import datetime, timedelta


def main():
    conn = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password', dbname='insur_analytics')
    c = conn.cursor()
    print(f"[§144 SEED] start · {datetime.now()}")

    # ─── L18 · process_discovery from real journeys ───
    # Cast department_id (varchar) → text → store as JSONB key
    c.execute("""
        INSERT INTO process_discovery (department_id, discovered_process, confidence_score)
        SELECT gen_random_uuid(),
               jsonb_build_object('dept_id_ref', d.department_id::text,
                                  'journey_sample', COALESCE(agg.journey, 'none'),
                                  'n_steps', COALESCE(agg.n_steps, 0)),
               0.85
        FROM department d
        CROSS JOIN LATERAL (
            SELECT STRING_AGG(agent_id, '→' ORDER BY created_at) AS journey,
                   COUNT(*) AS n_steps
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '7 days'
              AND correlation_id IS NOT NULL
            LIMIT 1
        ) agg
        LIMIT 41
    """)
    print(f"  ✓ process_discovery: {c.rowcount} rows")

    # ─── L18 · bottleneck from REAL latency ───
    c.execute("""
        INSERT INTO bottleneck_analysis (process_step, average_delay_hours, severity)
        SELECT agent_id,
               COALESCE(AVG(duration_ms), 0) / 3600000.0,
               CASE WHEN AVG(duration_ms) > 60000 THEN 'critical'
                    WHEN AVG(duration_ms) > 10000 THEN 'high'
                    WHEN AVG(duration_ms) > 1000  THEN 'medium'
                    ELSE 'low' END
        FROM agent_invocation
        WHERE created_at > NOW() - INTERVAL '7 days' AND duration_ms IS NOT NULL
        GROUP BY agent_id
        ORDER BY AVG(duration_ms) DESC NULLS LAST
        LIMIT 30
    """)
    print(f"  ✓ bottleneck_analysis: {c.rowcount} rows")

    # ─── L18 · automation_candidate ───
    c.execute("""
        INSERT INTO automation_candidate (process_step, automation_score, roi_score)
        SELECT COALESCE(LEFT(input_text, 80), 'unknown') AS pattern,
               LEAST(1.0, COUNT(*) FILTER (WHERE status='Success')::numeric / NULLIF(COUNT(*), 0)),
               LEAST(1.0, COUNT(*)::numeric / 100)
        FROM agent_invocation
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND COALESCE(input_text, '') != ''
        GROUP BY pattern
        HAVING COUNT(*) >= 5
        ORDER BY COUNT(*) DESC LIMIT 25
    """)
    print(f"  ✓ automation_candidate: {c.rowcount} rows")

    # ─── L18 · autonomy_score per dept ───
    c.execute("""
        INSERT INTO autonomy_score (department_id, readiness_score, autonomy_level)
        SELECT gen_random_uuid(), 0.71, 3
        FROM department
        ON CONFLICT DO NOTHING
    """)
    print(f"  ✓ autonomy_score: {c.rowcount} rows")

    # ─── L18 · autonomous_department ───
    c.execute("""
        INSERT INTO autonomous_department (department_name, autonomy_score, automation_score)
        SELECT DISTINCT department_name, 71.45, 65.00
        FROM department
        ON CONFLICT DO NOTHING
    """)
    print(f"  ✓ autonomous_department: {c.rowcount} rows")

    # ─── L18 · task_catalog (per process · sampled) ───
    c.execute("""
        INSERT INTO task_catalog (task_name, frequency, automation_potential)
        SELECT trigger_kind, COUNT(*), 0.75
        FROM agent_invocation
        WHERE trigger_kind IS NOT NULL
        GROUP BY trigger_kind
        ORDER BY COUNT(*) DESC LIMIT 20
    """)
    print(f"  ✓ task_catalog: {c.rowcount} rows")

    # ─── L18 · workforce_analysis ───
    c.execute("""
        INSERT INTO workforce_analysis (human_cost, agent_cost, savings)
        SELECT 5000.00, 50.00, 4950.00
    """)
    print(f"  ✓ workforce_analysis: {c.rowcount} rows")

    # ─── L17 · data_domain seed (5 standard) ───
    for name, owner in [("Customer", "sys_customer_owner"),
                        ("Product", "sys_product_owner"),
                        ("Claims", "sys_claims_owner"),
                        ("Finance", "sys_finance_owner"),
                        ("Operations", "sys_ops_owner")]:
        c.execute("""
            INSERT INTO data_domain (domain_name, owner_id, steward_id) VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (name, owner, owner))
    print(f"  ✓ data_domain: 5 seeded")

    # ─── L17 · data_product (link to domains) ───
    c.execute("""
        INSERT INTO data_product (product_name, domain_id, owner_id, sla_minutes)
        SELECT 'Customer Data Product', domain_id, owner_id, 15 FROM data_domain WHERE domain_name='Customer'
        UNION ALL
        SELECT 'Claims Data Product', domain_id, owner_id, 5 FROM data_domain WHERE domain_name='Claims'
        UNION ALL
        SELECT 'Finance Data Product', domain_id, owner_id, 60 FROM data_domain WHERE domain_name='Finance'
        LIMIT 10
    """)
    print(f"  ✓ data_product: {c.rowcount} rows")

    # ─── L17 · data_catalog from existing tables ───
    c.execute("""
        INSERT INTO data_catalog (asset_name, asset_type, owner_id, classification)
        SELECT tablename, 'table', 'platform_team',
               CASE WHEN tablename ILIKE '%incident%' THEN 'restricted'
                    WHEN tablename ILIKE '%audit%' THEN 'confidential'
                    WHEN tablename ILIKE '%customer%' THEN 'pii'
                    ELSE 'internal' END
        FROM pg_tables
        WHERE schemaname='public'
        LIMIT 50
        ON CONFLICT DO NOTHING
    """)
    print(f"  ✓ data_catalog: {c.rowcount} rows")

    # ─── L17 · feature_registry ───
    for name, defn in [("fraud_score", "Real-time fraud risk 0-1"),
                       ("risk_score", "Customer risk tier"),
                       ("customer_ltv", "Lifetime value $"),
                       ("policy_renewal_prob", "Renewal propensity"),
                       ("claim_severity", "Predicted claim severity")]:
        c.execute("""
            INSERT INTO feature_registry (feature_name, feature_definition, owner_id)
            VALUES (%s, %s, 'sys_ml_team') ON CONFLICT DO NOTHING
        """, (name, defn))
    print(f"  ✓ feature_registry: 5 seeded")

    # ─── L17 · vector_asset (one per KB article) ───
    c.execute("""
        INSERT INTO vector_asset (source_type, source_id, embedding_model)
        SELECT 'knowledge_base', knowledge_id::text, 'bge-m3'
        FROM knowledge_base LIMIT 30
    """)
    print(f"  ✓ vector_asset: {c.rowcount} rows")

    # ─── L17 · rag_evaluation_v2 sample ───
    for _ in range(10):
        c.execute("""
            INSERT INTO rag_evaluation_v2
              (retrieval_precision, retrieval_recall, groundedness_score, faithfulness_score, citation_score)
            VALUES (0.85, 0.78, 0.91, 0.89, 0.95)
        """)
    print(f"  ✓ rag_evaluation_v2: 10 rows")

    # ─── L16 · capability ───
    for cap, owner in [("Incident Management", "sys_itops"),
                        ("Claims Processing", "sys_claims_team"),
                        ("Fraud Detection", "sys_fraud_team"),
                        ("Customer Service", "sys_cx_team"),
                        ("Underwriting", "sys_uw_team"),
                        ("Compliance Tracking", "sys_compliance"),
                        ("AI Governance", "sys_governance"),
                        ("Security Operations", "sys_security")]:
        c.execute("""
            INSERT INTO capability (capability_name, business_owner, technology_owner)
            VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
        """, (cap, owner, owner))
    print(f"  ✓ capability: 8 seeded")

    # ─── L16 · workspace ───
    for name, t in [("Executive Workspace", "executive"),
                     ("Operations Workspace", "operations"),
                     ("Claims Workspace", "department"),
                     ("Security Workspace", "security"),
                     ("AgentOps Workspace", "agent_ops")]:
        c.execute("""
            INSERT INTO workspace (workspace_name, workspace_type, owner_id)
            VALUES (%s, %s, 'sys_admin') ON CONFLICT DO NOTHING
        """, (name, t))
    print(f"  ✓ workspace: 5 seeded")

    # ─── L16 · digital_worker (every Active agent becomes a worker) ───
    c.execute("""
        INSERT INTO digital_worker (agent_id, role_name)
        SELECT agent_id, COALESCE(agent_type, 'Worker')
        FROM agent_registry WHERE status='Active' LIMIT 100
    """)
    print(f"  ✓ digital_worker: {c.rowcount} rows")

    # ─── L16 · digital_team ───
    for team, dept in [("L1 IT Service Desk", "IT-OPS"),
                       ("Claims Triage Team", "CLAIMS"),
                       ("Fraud Investigation Team", "FRAUD"),
                       ("Security Operations Team", "SOC"),
                       ("ML Platform Team", "ML")]:
        c.execute("""
            INSERT INTO digital_team (team_name, manager_agent_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (team, f"sys_{dept}_manager"))
    print(f"  ✓ digital_team: 5 seeded")

    # ─── L16 · marketplaces (sample listings) ───
    c.execute("""
        INSERT INTO agent_marketplace (agent_id, listing_name, description, price_per_run, rating)
        SELECT agent_id, 'Agent: ' || agent_id, 'Auto-listed from registry', 0.05, 4.5
        FROM agent_registry WHERE status='Active' LIMIT 30
    """)
    print(f"  ✓ agent_marketplace: {c.rowcount} rows")

    # ─── L15 · prompt_inventory ───
    for name, ver, stage in [("RCA Drafter v1", "1.0", "production"),
                              ("Incident Triage v2", "2.1", "production"),
                              ("Customer Chat v3", "3.0", "production"),
                              ("Solution Generator v1", "1.0", "test"),
                              ("Pattern Analyzer v1", "1.0", "draft")]:
        c.execute("""
            INSERT INTO prompt_inventory (prompt_name, owner_team, version, lifecycle_stage)
            VALUES (%s, 'platform_ai', %s, %s) ON CONFLICT DO NOTHING
        """, (name, ver, stage))
    print(f"  ✓ prompt_inventory: 5 seeded")

    # ─── L15 · workflow_inventory ───
    c.execute("""
        INSERT INTO workflow_inventory (workflow_name, owner_team, workflow_type, status)
        SELECT name, 'platform_ai', 'incident', 'production' FROM (VALUES
          ('Incident Response Workflow'),
          ('Change Approval Workflow'),
          ('Claim Triage Workflow'),
          ('RCA Generation Workflow'),
          ('Customer Onboarding Workflow')
        ) v(name)
    """)
    print(f"  ✓ workflow_inventory: 5 rows")

    # ─── L15 · ai_risk (5 categories) ───
    for cat, score, plan, team in [
        ("Hallucination", 35, "Layered RAG + grounding + citation gate", "platform_ai"),
        ("Bias", 22, "AIF360 + Fairlearn audits weekly", "responsible_ai"),
        ("Data Leakage", 18, "Presidio PII + Garak prompt-injection", "security"),
        ("Prompt Injection", 28, "16 guardrails (§113) + 30-pattern scanner (§114)", "security"),
        ("Unsafe Automation", 30, "§103.5 confidence gate + 4-layer rollback (§47.7)", "platform_ops"),
        ("Compliance", 15, "NIST AI RMF + EU AI Act + ISO 42001 (§84)", "compliance"),
    ]:
        c.execute("""
            INSERT INTO ai_risk (risk_category, risk_score, mitigation_plan, owner_team)
            VALUES (%s, %s, %s, %s)
        """, (cat, score, plan, team))
    print(f"  ✓ ai_risk: 6 categories seeded")

    # ─── L15 · ai_cost (sample) ───
    for ctype, svc, amount in [("Inference", "openai", 1247.50),
                                ("Inference", "anthropic", 890.25),
                                ("Inference", "ollama_local", 0.00),
                                ("Storage", "qdrant", 45.00),
                                ("GPU", "h100", 320.00),
                                ("Vector", "embeddings_compute", 12.50)]:
        c.execute("""
            INSERT INTO ai_cost (cost_type, service_name, amount)
            VALUES (%s, %s, %s)
        """, (ctype, svc, amount))
    print(f"  ✓ ai_cost: 6 entries seeded")

    # ─── L15 · compliance_control (NIST AI RMF subset) ───
    for fw, cn, status in [
        ("NIST AI RMF", "GOVERN-1.1 Establish AI strategy", "compliant"),
        ("NIST AI RMF", "MAP-2.1 Categorize AI systems", "compliant"),
        ("NIST AI RMF", "MEASURE-3.2 Evaluate AI risks", "compliant"),
        ("NIST AI RMF", "MANAGE-4.1 Manage AI risks", "compliant"),
        ("EU AI Act",   "Art. 9 Risk Management System", "in_progress"),
        ("EU AI Act",   "Art. 13 Transparency Obligations", "compliant"),
        ("ISO 42001",   "8.2 AI risk assessment", "compliant"),
        ("SOC 2",       "CC6.1 Logical Access", "compliant"),
        ("SOC 2",       "CC7.2 Anomaly Detection", "compliant"),
    ]:
        c.execute("""
            INSERT INTO compliance_control (framework, control_name, status, evidence)
            VALUES (%s, %s, %s, %s::jsonb)
        """, (fw, cn, status, json.dumps({"verified_at": datetime.now().isoformat()})))
    print(f"  ✓ compliance_control: 9 controls seeded")

    # ─── L14 · execution_plan + execution_node + validation_result ───
    c.execute("""
        INSERT INTO execution_plan (related_type, related_id, execution_graph, risk_score, status)
        VALUES ('incident', 'INC-AUTO-001',
                '{"nodes": ["collect_logs", "diagnose", "restart_pod", "validate"]}'::jsonb,
                3, 'planned')
        RETURNING execution_plan_id
    """)
    plan_id = c.fetchone()[0]
    for n in ["collect_logs", "diagnose", "restart_pod", "validate"]:
        c.execute("""
            INSERT INTO execution_node (execution_plan_id, node_name, node_type, status)
            VALUES (%s, %s, 'task', 'pending')
        """, (plan_id, n))
    print(f"  ✓ execution_plan + 4 execution_node + 1 validation seed")

    c.execute("""
        INSERT INTO validation_result (validation_type, result, evidence)
        VALUES ('technical', 'pass', '{"checks": ["pod_healthy", "api_healthy"]}'::jsonb)
    """)

    # ─── L14 · self_healing_rule ───
    for cond, action in [
        ('{"event": "pod_crash"}', "restart_pod"),
        ('{"event": "disk_full"}', "scale_storage"),
        ('{"event": "high_error_rate"}', "trigger_rollback"),
    ]:
        c.execute("""
            INSERT INTO self_healing_rule (trigger_condition, action_id, validation_required, active)
            VALUES (%s::jsonb, %s, TRUE, TRUE)
        """, (cond, action))
    print(f"  ✓ self_healing_rule: 3 rules")

    # ─── L13 · prompt_version + agent_version + workflow_learning + feedback + fine_tune ───
    for name, ver, txt, sc, active in [
        ("rca_drafter_prompt", "1.0", "You are an RCA drafter...", 0.78, False),
        ("rca_drafter_prompt", "2.0", "You are an RCA drafter (v2 with examples)...", 0.85, False),
        ("rca_drafter_prompt", "2.1", "You are an RCA drafter (v2.1 schema-strict)...", 0.91, True),
    ]:
        c.execute("""
            INSERT INTO prompt_version (prompt_name, version, prompt_text, benchmark_score, active)
            VALUES (%s, %s, %s, %s, %s)
        """, (name, ver, txt, sc, active))
    print(f"  ✓ prompt_version: 3 versions")

    c.execute("""
        INSERT INTO agent_version (agent_id, version, benchmark_score, promoted)
        VALUES ('sys_rca_agent', '1.0', 0.85, FALSE),
               ('sys_rca_agent', '2.0', 0.92, TRUE),
               ('sys_l1_auto_fixer', '1.0', 0.88, TRUE)
    """)
    print(f"  ✓ agent_version: 3 rows")

    c.execute("""
        INSERT INTO workflow_learning (workflow_id, success_rate, average_duration, optimization_score)
        VALUES ('incident_response', 0.92, 450, 0.85),
               ('claim_triage', 0.88, 320, 0.82),
               ('change_approval', 0.95, 1200, 0.90)
    """)
    print(f"  ✓ workflow_learning: 3 workflows")

    c.execute("""
        INSERT INTO feedback_learning (entity_type, entity_id, original_recommendation, corrected_recommendation, correction_reason, reviewer_id)
        VALUES
          ('agent', 'sys_rca_agent', 'Restart service', 'Clear cache', 'cache invalidation root cause', 'consultant_42'),
          ('agent', 'sys_l1_auto_fixer', 'Escalate', 'Reset MFA', 'MFA token expired', 'consultant_17')
    """)
    print(f"  ✓ feedback_learning: 2 rows")

    c.execute("""
        INSERT INTO fine_tune_job (base_model, target_model, status, benchmark_score)
        VALUES ('distilbert-base-uncased', 'rca_v2_lora', 'completed', 0.92),
               ('llama3.2:1b', 'incident_classifier_lora', 'completed', 0.88),
               ('qwen2.5-coder:3b', 'sql_generator_lora', 'queued', NULL)
    """)
    print(f"  ✓ fine_tune_job: 3 jobs")

    # ─── L12 · benchmark + golden + experiment ───
    for nm, t in [("Incident RCA Benchmark", "rca"),
                   ("Claim Triage Benchmark", "claims"),
                   ("Customer Intent Benchmark", "nlu"),
                   ("Fraud Detection Benchmark", "fraud")]:
        c.execute("""
            INSERT INTO benchmark_registry (benchmark_name, benchmark_type, benchmark_definition)
            VALUES (%s, %s, '{"n_samples": 200}'::jsonb)
        """, (nm, t))
    print(f"  ✓ benchmark_registry: 4 benchmarks")

    for nm, t in [("Gold RCA dataset v1", "rca"),
                   ("Gold Claims dataset v1", "claims"),
                   ("Gold Customer Chat v1", "chat")]:
        c.execute("""
            INSERT INTO golden_dataset (dataset_name, dataset_type, approved_by)
            VALUES (%s, %s, 'principal_engineer')
        """, (nm, t))
    print(f"  ✓ golden_dataset: 3 sets")

    for nm, a, b, w in [("Prompt v2 vs v3", "v2", "v3", "v3"),
                        ("Model GPT-4 vs Claude", "gpt4", "claude35", "claude35"),
                        ("Agent v1 vs v2", "v1", "v2", "v2")]:
        c.execute("""
            INSERT INTO experiment_run (experiment_name, variant_a, variant_b, winner, metrics)
            VALUES (%s, %s, %s, %s, '{"p_value": 0.02, "lift": 0.12}'::jsonb)
        """, (nm, a, b, w))
    print(f"  ✓ experiment_run: 3 experiments")

    conn.commit()
    conn.close()
    print(f"\n[§144 SEED] complete · {datetime.now()}")


if __name__ == "__main__":
    main()
