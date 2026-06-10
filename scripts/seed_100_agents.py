#!/usr/bin/env python3
"""Seed 100 agents + 25 skills + 25 tools across 12 departments.

Per operator request · ships a realistic demo catalog so the
agentic admin UI has data to render.

Direct SQL · idempotent (ON CONFLICT upsert) · bypasses RBAC.
Usage:
    python3 scripts/seed_100_agents.py
    ./scripts/insur seed
"""
from __future__ import annotations

import argparse
import logging
import os
import random
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

# Use in-process TestClient by default · no need to start uvicorn
USE_IN_PROCESS = True

# ─────────────────────────────────────────────────────────────────────
# Catalog · 12 departments × 8-9 agents/dept = 100 agents

DEPTS = [
    ("IT Operations",     "Production Reliability"),
    ("Claims",            "First Notice of Loss"),
    ("Underwriting",      "Risk Assessment"),
    ("Customer Service",  "Customer Support"),
    ("Fraud",             "Fraud Detection + Investigation"),
    ("Compliance",        "Regulatory Compliance"),
    ("Finance",           "Billing + Payment"),
    ("HR",                "Workforce Operations"),
    ("Sales",             "Quote + Bind"),
    ("Marketing",         "Campaign Operations"),
    ("AI SDLC",           "AI Development Lifecycle"),
    ("Security",          "Cyber + AI Security"),
]

# 25 reusable skills across the catalog (any agent may map multiple)
SKILLS = [
    ("classify_incident",      "Classify Incident",        "Analysis",       "Low",    "Active"),
    ("find_service_owner",     "Find Service Owner",       "Catalog",        "Low",    "Active"),
    ("analyze_logs",           "Analyze Logs",             "Diagnostic",     "Low",    "Active"),
    ("check_cloud_health",     "Check Cloud Health",       "Diagnostic",     "Low",    "Active"),
    ("check_kubernetes_pods",  "Check Kubernetes Pods",    "Diagnostic",     "Medium", "Active"),
    ("generate_rca",           "Generate RCA",             "Reasoning",      "Medium", "Active"),
    ("restart_pod",            "Restart Pod",              "Remediation",    "High",   "Active"),
    ("rollback_deployment",    "Rollback Deployment",      "Remediation",    "High",   "Active"),
    ("create_ticket",          "Create Ticket",            "Workflow",       "Medium", "Active"),
    ("notify_team",            "Notify Team",              "Communication",  "Low",    "Active"),
    ("request_approval",       "Request Approval",         "Governance",     "Low",    "Active"),
    ("score_fraud_risk",       "Score Fraud Risk",         "ML",             "Medium", "Active"),
    ("extract_claim_data",     "Extract Claim Data",       "OCR/Parsing",    "Low",    "Active"),
    ("validate_coverage",      "Validate Coverage",        "Rules",          "Medium", "Active"),
    ("assess_damage",          "Assess Damage",            "ML/CV",          "Medium", "Active"),
    ("rate_quote",             "Generate Quote",           "Pricing",        "Medium", "Active"),
    ("verify_identity",        "Verify Customer Identity", "Security",       "High",   "Active"),
    ("detect_pii",             "Detect PII",               "Privacy",        "Medium", "Active"),
    ("answer_faq",             "Answer FAQ",               "Conversational", "Low",    "Active"),
    ("escalate_to_human",      "Escalate to Human",        "HITL",           "Low",    "Active"),
    ("audit_decision",         "Audit Decision",           "Compliance",     "Low",    "Active"),
    ("enrich_pr",              "Enrich PR with context",   "DevOps",         "Low",    "Active"),
    ("review_code",            "Code Review",              "DevOps",         "Medium", "Active"),
    ("scan_secrets",           "Scan for Secrets",         "Security",       "High",   "Active"),
    ("draft_communication",    "Draft Communication",      "GenAI",          "Low",    "Active"),
]

# 25 tools (APIs/MCP/cloud) any agent may connect to
TOOLS = [
    ("catalog_query",       "Catalog Query",          "Read",    "PostgreSQL"),
    ("log_search",          "Log Search",             "Read",    "ELK"),
    ("metric_query",        "Metric Query",           "Read",    "Prometheus"),
    ("azure_monitor",       "Azure Monitor",          "Read",    "Azure"),
    ("kubernetes_api",      "Kubernetes API",         "Execute", "K8s"),
    ("jira_create",         "Jira Create Ticket",     "Write",   "Jira"),
    ("servicenow_create",   "ServiceNow Create",      "Write",   "ServiceNow"),
    ("slack_message",       "Slack Message",          "Write",   "Slack"),
    ("github_pr",           "GitHub PR",              "Write",   "GitHub"),
    ("github_repo_read",    "GitHub Repo Read",       "Read",    "GitHub"),
    ("guidewire_mcp",       "Guidewire MCP",          "MCP",     "Guidewire"),
    ("salesforce_mcp",      "Salesforce MCP",         "MCP",     "Salesforce"),
    ("snowflake_query",     "Snowflake Query",        "Read",    "Snowflake"),
    ("vector_search",       "Vector Search",          "Read",    "Qdrant"),
    ("ocr_tool",            "OCR Tool",               "AI",      "Azure AI"),
    ("fraud_model",         "Fraud Scoring Model",    "AI",      "Azure ML"),
    ("pii_detector",        "PII Detector",           "AI",      "Presidio"),
    ("email_send",          "Email Send",             "Write",   "SMTP"),
    ("sms_send",            "SMS Send",               "Write",   "Twilio"),
    ("payment_gateway",     "Payment Gateway",        "Execute", "Stripe"),
    ("identity_verify",     "Identity Verify",        "Read",    "Onfido"),
    ("knowledge_search",    "Knowledge Search",       "Read",    "Confluence"),
    ("sap_mcp",             "SAP MCP",                "MCP",     "SAP"),
    ("teams_message",       "Teams Message",          "Write",   "Teams"),
    ("doc_summarize",       "Document Summarize",     "AI",      "OpenAI"),
]

# 100 agent templates · keyed by dept · agent name patterns
AGENTS_PER_DEPT = [
    # IT Operations
    ("incident_triage",          "Incident Triage Agent",        "Worker",     "Approval Required", "Medium"),
    ("k8s_healing",              "Kubernetes Healing Agent",     "Worker",     "Approval Required", "High"),
    ("alert_aggregator",         "Alert Aggregator",             "Worker",     "Automatic",         "Low"),
    ("on_call_router",           "On-Call Router",               "Worker",     "Automatic",         "Low"),
    ("rca_generator",            "RCA Generator",                "Worker",     "Approval Required", "Medium"),
    ("change_risk_assessor",     "Change Risk Assessor",         "Supervisor", "Approval Required", "High"),
    ("ops_dashboard_agent",      "Ops Dashboard Agent",          "Worker",     "Automatic",         "Low"),
    ("capacity_planner",         "Capacity Planner",             "Planner",    "Automatic",         "Low"),

    # Claims
    ("claim_intake",             "Claim Intake Agent",           "Worker",     "Automatic",         "Low"),
    ("coverage_validator",       "Coverage Validator",           "Worker",     "Automatic",         "Medium"),
    ("damage_assessor",          "Damage Assessor",              "Worker",     "Approval Required", "Medium"),
    ("claim_router",             "Claim Routing Agent",          "Worker",     "Automatic",         "Low"),
    ("claim_approval",           "Claim Approval Agent",         "Supervisor", "Approval Required", "High"),
    ("claim_payment",            "Claim Payment Agent",          "Worker",     "Approval Required", "High"),
    ("claim_audit",              "Claim Audit Agent",            "Worker",     "Automatic",         "Low"),
    ("claim_summary",            "Claim Summary Generator",      "Worker",     "Automatic",         "Low"),
    ("subrogation_agent",        "Subrogation Agent",            "Worker",     "Approval Required", "Medium"),

    # Underwriting
    ("risk_assessor",            "Risk Assessment Agent",        "Worker",     "Approval Required", "Medium"),
    ("quote_generator",          "Quote Generation Agent",       "Worker",     "Automatic",         "Low"),
    ("policy_issuer",            "Policy Issuance Agent",        "Worker",     "Approval Required", "Medium"),
    ("rate_validator",           "Rate Validator",               "Worker",     "Automatic",         "Low"),
    ("underwriter_assistant",    "Underwriter Assistant",        "Worker",     "Automatic",         "Low"),
    ("policy_renewal",           "Policy Renewal Agent",         "Worker",     "Automatic",         "Low"),
    ("uw_referral_agent",        "UW Referral Agent",            "Worker",     "Approval Required", "Medium"),
    ("med_uw_agent",             "Medical Underwriting Agent",   "Worker",     "Approval Required", "High"),

    # Customer Service
    ("support_triage",           "Support Triage Agent",         "Worker",     "Automatic",         "Low"),
    ("policy_lookup",            "Policy Lookup Agent",          "Worker",     "Automatic",         "Low"),
    ("faq_answerer",             "FAQ Answerer",                 "Worker",     "Automatic",         "Low"),
    ("billing_inquiry",          "Billing Inquiry Agent",        "Worker",     "Automatic",         "Low"),
    ("address_change",           "Address Change Agent",         "Worker",     "Approval Required", "Medium"),
    ("complaint_escalator",      "Complaint Escalator",          "Worker",     "Automatic",         "Low"),
    ("retention_agent",          "Retention Agent",              "Worker",     "Approval Required", "Medium"),
    ("nps_collector",            "NPS Collector",                "Worker",     "Automatic",         "Low"),

    # Fraud
    ("fraud_scorer",             "Fraud Risk Scorer",            "Worker",     "Automatic",         "Medium"),
    ("siu_router",               "SIU Routing Agent",            "Worker",     "Approval Required", "High"),
    ("fraud_investigator",       "Fraud Investigation Agent",    "Worker",     "Approval Required", "High"),
    ("graph_rag_fraud",          "GraphRAG Fraud Agent",         "Worker",     "Automatic",         "Medium"),
    ("ring_detector",            "Fraud Ring Detector",          "Worker",     "Automatic",         "High"),
    ("fraud_recovery",           "Fraud Recovery Agent",         "Worker",     "Approval Required", "High"),
    ("anomaly_flagger",          "Anomaly Flagger",              "Worker",     "Automatic",         "Medium"),
    ("siu_report_writer",        "SIU Report Writer",            "Worker",     "Automatic",         "Low"),
    ("siu_case_manager",         "SIU Case Manager",             "Supervisor", "Approval Required", "High"),

    # Compliance
    ("regulatory_filing",        "Regulatory Filing Agent",      "Worker",     "Approval Required", "High"),
    ("audit_trail_agent",        "Audit Trail Agent",            "Worker",     "Automatic",         "Low"),
    ("policy_compliance",        "Policy Compliance Checker",    "Worker",     "Automatic",         "Medium"),
    ("data_retention",           "Data Retention Agent",         "Worker",     "Automatic",         "Medium"),
    ("aml_screener",             "AML Screening Agent",          "Worker",     "Approval Required", "High"),
    ("kyc_checker",              "KYC Checker",                  "Worker",     "Approval Required", "High"),
    ("regulatory_change",        "Regulatory Change Monitor",    "Worker",     "Automatic",         "Low"),

    # Finance
    ("invoice_processor",        "Invoice Processor",            "Worker",     "Automatic",         "Low"),
    ("payment_reconciler",       "Payment Reconciler",           "Worker",     "Automatic",         "Medium"),
    ("commission_calculator",    "Commission Calculator",        "Worker",     "Automatic",         "Low"),
    ("refund_processor",         "Refund Processor",             "Worker",     "Approval Required", "Medium"),
    ("collections_agent",        "Collections Agent",            "Worker",     "Approval Required", "Medium"),
    ("financial_report",         "Financial Report Generator",   "Worker",     "Automatic",         "Low"),
    ("tax_filing",               "Tax Filing Agent",             "Worker",     "Approval Required", "High"),

    # HR
    ("recruitment_screener",     "Recruitment Screener",         "Worker",     "Automatic",         "Medium"),
    ("interview_scheduler",      "Interview Scheduler",          "Worker",     "Automatic",         "Low"),
    ("onboarding_agent",         "Onboarding Agent",             "Worker",     "Automatic",         "Low"),
    ("benefits_inquiry",         "Benefits Inquiry",             "Worker",     "Automatic",         "Low"),
    ("leave_manager",            "Leave Manager",                "Worker",     "Approval Required", "Medium"),
    ("performance_summarizer",   "Performance Summarizer",       "Worker",     "Automatic",         "Low"),
    ("attrition_predictor",      "Attrition Predictor",          "Worker",     "Automatic",         "Medium"),

    # Sales
    ("lead_scorer",              "Lead Scorer",                  "Worker",     "Automatic",         "Low"),
    ("opportunity_router",       "Opportunity Router",           "Worker",     "Automatic",         "Low"),
    ("proposal_generator",       "Proposal Generator",           "Worker",     "Approval Required", "Medium"),
    ("crm_enricher",             "CRM Enricher",                 "Worker",     "Automatic",         "Low"),
    ("sales_forecast",           "Sales Forecaster",             "Worker",     "Automatic",         "Medium"),
    ("upsell_recommender",       "Upsell Recommender",           "Worker",     "Automatic",         "Medium"),
    ("renewal_predictor",        "Renewal Predictor",            "Worker",     "Automatic",         "Medium"),

    # Marketing
    ("content_generator",        "Content Generator",            "Worker",     "Approval Required", "Medium"),
    ("campaign_optimizer",       "Campaign Optimizer",           "Worker",     "Automatic",         "Medium"),
    ("audience_segmenter",       "Audience Segmenter",           "Worker",     "Automatic",         "Medium"),
    ("ab_test_runner",           "A/B Test Runner",              "Worker",     "Automatic",         "Low"),
    ("seo_auditor",              "SEO Auditor",                  "Worker",     "Automatic",         "Low"),
    ("social_publisher",         "Social Publisher",             "Worker",     "Approval Required", "Medium"),
    ("brand_voice_validator",    "Brand Voice Validator",        "Supervisor", "Automatic",         "Low"),

    # AI SDLC
    ("pr_enricher",              "PR Enricher Agent",            "Worker",     "Automatic",         "Low"),
    ("code_reviewer",            "AI Code Reviewer",             "Worker",     "Approval Required", "Medium"),
    ("test_generator",           "Test Generator",               "Worker",     "Automatic",         "Low"),
    ("docs_generator",           "Docs Generator",               "Worker",     "Automatic",         "Low"),
    ("dependency_auditor",       "Dependency Auditor",           "Worker",     "Automatic",         "Medium"),
    ("eval_runner",              "Eval Runner",                  "Worker",     "Automatic",         "Medium"),
    ("model_release_agent",      "Model Release Agent",          "Supervisor", "Approval Required", "High"),
    ("prompt_versioner",         "Prompt Versioner",             "Worker",     "Approval Required", "Medium"),
    ("feature_flag_agent",       "Feature Flag Agent",           "Worker",     "Approval Required", "Medium"),

    # Security
    ("threat_intel_agent",       "Threat Intel Agent",           "Worker",     "Automatic",         "Medium"),
    ("vuln_scanner_agent",       "Vulnerability Scanner",        "Worker",     "Automatic",         "Medium"),
    ("siem_correlator",          "SIEM Correlator",              "Worker",     "Automatic",         "Medium"),
    ("incident_responder",       "Security Incident Responder",  "Worker",     "Approval Required", "High"),
    ("access_reviewer",          "Access Reviewer",              "Worker",     "Approval Required", "High"),
    ("phishing_triager",         "Phishing Triager",             "Worker",     "Automatic",         "Medium"),
    ("data_classifier",          "Data Classifier",              "Worker",     "Automatic",         "Medium"),
    ("aiml_red_team",            "AI/ML Red Team Agent",         "Worker",     "Approval Required", "High"),

    # Extras to hit 100
    ("policy_summarizer",        "Policy Summarizer",            "Worker",     "Automatic",         "Low"),
    ("agent_meta_supervisor",    "Meta-Supervisor Agent",        "Supervisor", "Approval Required", "High"),
    ("kb_curator",               "Knowledge Base Curator",       "Worker",     "Approval Required", "Low"),
    ("translation_agent",        "Translation Agent",            "Worker",     "Automatic",         "Low"),
    ("voice_intent_router",      "Voice Intent Router",          "Worker",     "Automatic",         "Low"),
    ("kpi_dashboard_agent",      "KPI Dashboard Agent",          "Worker",     "Automatic",         "Low"),
    ("cost_optimizer",           "Cost Optimizer",               "Worker",     "Approval Required", "Medium"),
]

# Skill-to-dept hint (which skills naturally fit which depts)
DEPT_SKILL_HINTS = {
    "IT Operations":    ["classify_incident", "analyze_logs", "check_cloud_health",
                          "check_kubernetes_pods", "generate_rca", "restart_pod",
                          "rollback_deployment", "create_ticket", "notify_team",
                          "request_approval", "find_service_owner"],
    "Claims":           ["extract_claim_data", "validate_coverage", "assess_damage",
                          "score_fraud_risk", "create_ticket", "notify_team",
                          "request_approval", "audit_decision", "draft_communication"],
    "Underwriting":     ["rate_quote", "validate_coverage", "score_fraud_risk",
                          "verify_identity", "audit_decision", "request_approval"],
    "Customer Service": ["answer_faq", "verify_identity", "notify_team",
                          "escalate_to_human", "draft_communication", "detect_pii"],
    "Fraud":            ["score_fraud_risk", "analyze_logs", "generate_rca",
                          "create_ticket", "request_approval", "audit_decision",
                          "escalate_to_human"],
    "Compliance":       ["audit_decision", "detect_pii", "create_ticket",
                          "request_approval", "draft_communication"],
    "Finance":          ["validate_coverage", "audit_decision", "create_ticket",
                          "notify_team", "request_approval"],
    "HR":               ["verify_identity", "draft_communication", "answer_faq",
                          "notify_team", "request_approval"],
    "Sales":            ["rate_quote", "draft_communication", "notify_team",
                          "create_ticket", "audit_decision"],
    "Marketing":        ["draft_communication", "audit_decision", "request_approval"],
    "AI SDLC":          ["enrich_pr", "review_code", "scan_secrets",
                          "create_ticket", "request_approval"],
    "Security":         ["scan_secrets", "detect_pii", "verify_identity",
                          "analyze_logs", "generate_rca", "create_ticket"],
}


# ─────────────────────────────────────────────────────────────────────
# Direct SQL seeder · bypasses auth · idempotent via ON CONFLICT

import psycopg2


def _conn():
    return psycopg2.connect(
        host=os.environ.get("BEV_POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("BEV_POSTGRES_PORT", "5434")),
        user=os.environ.get("BEV_POSTGRES_USER", "insur_user"),
        password=os.environ.get("BEV_POSTGRES_PASSWORD", "insur_secret_password"),
        dbname=os.environ.get("BEV_POSTGRES_DB", "insur_analytics"),
    )


# ─────────────────────────────────────────────────────────────────────
# Seeders

def seed_skills() -> int:
    with _conn() as c, c.cursor() as cur:
        for skill_id, name, cat, risk, status in SKILLS:
            cur.execute("""
                INSERT INTO skill_registry
                  (skill_id, skill_name, skill_category, risk_level, status,
                   description, owner_team, tenant_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'default')
                ON CONFLICT (skill_id) DO UPDATE SET
                  skill_name = EXCLUDED.skill_name,
                  status     = EXCLUDED.status,
                  updated_at = CURRENT_TIMESTAMP
            """, (skill_id, name, cat, risk, status,
                  f"{name} · reusable skill · {cat} category",
                  "Platform"))
    return len(SKILLS)


def seed_tools() -> int:
    with _conn() as c, c.cursor() as cur:
        for tool_id, name, ttype, system in TOOLS:
            cur.execute("""
                INSERT INTO tool_registry
                  (tool_id, tool_name, tool_type, system_name, category,
                   status, risk_level, requires_approval, owner_team, tenant_id)
                VALUES (%s, %s, %s, %s, 'Standard', 'Available', %s, %s, 'Platform', 'default')
                ON CONFLICT (tool_id) DO UPDATE SET
                  tool_name  = EXCLUDED.tool_name,
                  status     = EXCLUDED.status,
                  updated_at = CURRENT_TIMESTAMP
            """, (tool_id, name, ttype, system,
                  "High" if ttype in ("Execute", "MCP") else "Low",
                  ttype in ("Execute", "Write")))
    return len(TOOLS)


def seed_agents() -> tuple[int, int]:
    """Returns (n_agents, n_mappings)."""
    n_agents = 0
    n_mappings = 0
    rng = random.Random(42)  # deterministic

    with _conn() as c, c.cursor() as cur:
        for i, (agent_id, name, atype, autonomy, risk) in enumerate(AGENTS_PER_DEPT[:100]):
            # Determine which dept based on agent id keyword
            dept_name, domain = None, None
            for d, dom in DEPTS:
                if _agent_belongs(agent_id, d):
                    dept_name, domain = d, dom
                    break
            if dept_name is None:
                dept_name, domain = DEPTS[i % len(DEPTS)]

            cur.execute("""
                INSERT INTO agent_registry
                  (agent_id, agent_name, agent_type, department_id, business_domain,
                   purpose, owner_team, status, autonomy_level, risk_level,
                   model_name, runtime_framework, max_steps, timeout_seconds,
                   cost_limit, tenant_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active', %s, %s, %s,
                        'LangGraph', 10, 60, 5.00, 'default')
                ON CONFLICT (agent_id) DO UPDATE SET
                  agent_name    = EXCLUDED.agent_name,
                  department_id = EXCLUDED.department_id,
                  status        = 'Active',
                  updated_at    = CURRENT_TIMESTAMP
            """, (agent_id, name, atype, dept_name, domain,
                  f"{name} · seeded for {dept_name}",
                  f"{dept_name} AgentOps",
                  autonomy, risk,
                  "gpt-4o" if risk == "High" else "gpt-4o-mini"))
            n_agents += 1

            # Map 2-5 skills
            hinted = DEPT_SKILL_HINTS.get(dept_name, [])
            picked = list(hinted[:rng.randint(2, 4)])
            picked.append(rng.choice([s[0] for s in SKILLS]))
            for skill_id in set(picked):
                cur.execute("""
                    INSERT INTO agent_skill_mapping
                      (agent_id, skill_id, execution_mode, priority, status)
                    VALUES (%s, %s, %s, %s, 'Active')
                    ON CONFLICT (agent_id, skill_id) DO UPDATE SET
                      execution_mode = EXCLUDED.execution_mode,
                      priority       = EXCLUDED.priority
                """, (agent_id, skill_id,
                      "Approval Required" if risk == "High" else "Automatic",
                      rng.randint(50, 200)))
                n_mappings += 1
    return n_agents, n_mappings


def _agent_belongs(agent_id: str, dept: str) -> bool:
    """Heuristic match: agent_id mentions dept keyword."""
    keys = {
        "IT Operations":    ["k8s", "incident", "ops", "alert", "rca", "on_call", "kubernetes", "change_risk"],
        "Claims":           ["claim", "coverage", "damage", "subrogation"],
        "Underwriting":     ["risk_assess", "quote", "policy", "rate", "underwriter", "uw_"],
        "Customer Service": ["support", "billing_inquiry", "address", "complaint", "retention", "nps", "faq"],
        "Fraud":            ["fraud", "siu", "ring_detect", "anomaly"],
        "Compliance":       ["compliance", "regulatory", "audit", "data_retention", "aml", "kyc"],
        "Finance":          ["invoice", "payment", "commission", "refund", "collections", "financial", "tax"],
        "HR":               ["recruit", "interview", "onboarding", "benefits", "leave", "performance", "attrition"],
        "Sales":            ["lead", "opportunity", "proposal", "crm", "sales_forecast", "upsell", "renewal"],
        "Marketing":        ["content", "campaign", "audience", "ab_test", "seo", "social", "brand"],
        "AI SDLC":          ["pr_enricher", "code_review", "test_gen", "docs_gen", "dependency_audit", "eval_runner", "model_release", "prompt_vers"],
        "Security":         ["threat_intel", "vuln_scan", "siem", "incident_responder", "access_review", "phishing", "data_classifier", "aiml_red"],
    }
    for k in keys.get(dept, []):
        if k in agent_id.lower():
            return True
    return False


# ─────────────────────────────────────────────────────────────────────
# Main

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    print(f"Seeding · direct SQL · total templates: {len(AGENTS_PER_DEPT)}")

    print("─── Skills ───")
    ns = seed_skills()
    print(f"  ✓ {ns}/{len(SKILLS)} skills upserted")

    print("─── Tools ───")
    nt = seed_tools()
    print(f"  ✓ {nt}/{len(TOOLS)} tools upserted")

    print("─── Agents (100 across 12 departments) ───")
    na, nm = seed_agents()
    print(f"  ✓ {na}/{len(AGENTS_PER_DEPT[:100])} agents upserted")
    print(f"  ✓ {nm} agent-skill mappings created")

    # Show per-dept distribution
    by_dept: dict[str, int] = {}
    for i, (agent_id, *_) in enumerate(AGENTS_PER_DEPT[:100]):
        # Re-compute the dept assignment same as seeder
        for d, _ in DEPTS:
            if _agent_belongs(agent_id, d):
                by_dept[d] = by_dept.get(d, 0) + 1
                break
        else:
            d, _ = DEPTS[i % len(DEPTS)]
            by_dept[d] = by_dept.get(d, 0) + 1

    print("\n─── Distribution by department ───")
    for d, n in sorted(by_dept.items(), key=lambda x: -x[1]):
        bar = "█" * n
        print(f"  {d:<20} {n:>3}  {bar}")

    print(f"\n✓ Seeding complete · 100 agents · {ns} skills · {nt} tools · {nm} mappings")
    print(f"  Verify: curl http://localhost:8001/api/v1/agentic/agents | jq '.count'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
