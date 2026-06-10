"""Per-agent blueprint generator · Iter 41.

Returns agent-specific IPO + flowchart + MCP + RAG + integration shape
so the UI tabs render REAL agent-specific data, not generic placeholders.

Pattern: agent_id → (dept-based template) → blueprint dict
Per §57.7: dept + skills + risk drive the blueprint deterministically.
"""
from __future__ import annotations

import hashlib
from typing import Any

# ──────────────────────────────────────────────────────────────────────
# Per-department blueprint templates
# Each template defines: process_summary · inputs · steps · outputs ·
# mcp_servers · rag_corpora · tools

DEPT_TEMPLATES: dict[str, dict[str, Any]] = {
    "IT Operations": {
        "process_summary": "Detect production issues · diagnose root cause · trigger remediation · notify on-call",
        "inputs": [
            {"name": "alert_payload",   "type": "json",   "from": "Prometheus/PagerDuty"},
            {"name": "service_id",      "type": "string", "from": "service_catalog"},
            {"name": "severity",        "type": "P1-P5",  "from": "alert metadata"},
            {"name": "correlation_id",  "type": "uuid",   "from": "tracing header"},
        ],
        "steps": [
            "Classify severity from KRI thresholds",
            "Look up service owner from catalog",
            "Pull recent logs + metrics + deploys",
            "Generate RCA hypothesis from incident_rca corpus",
            "Decide: auto-remediate vs HITL approval",
            "If auto · execute Kubernetes/cloud action",
            "Notify owner via Slack/PagerDuty",
            "Write incident_management + agent_invocation rows",
        ],
        "outputs": [
            {"name": "incident_id",     "type": "string", "to": "ServiceNow"},
            {"name": "rca_summary",     "type": "text",   "to": "knowledge_base"},
            {"name": "remediation_log", "type": "json",   "to": "agent_invocation"},
            {"name": "slack_notice",    "type": "message","to": "Slack channel"},
        ],
        "mcp_servers": ["servicenow-mcp", "slack-mcp", "kubernetes-mcp", "pagerduty-mcp"],
        "rag_corpora": ["runbooks", "past-incidents", "service-catalog", "post-mortems"],
        "tools": ["log_search", "metric_query", "kubernetes_api", "azure_monitor"],
    },
    "Claims": {
        "process_summary": "First Notice of Loss · validate coverage · assess damage · route to adjuster · settle claim",
        "inputs": [
            {"name": "policy_number",    "type": "string", "from": "customer portal"},
            {"name": "claim_documents",  "type": "PDF[]",  "from": "upload"},
            {"name": "incident_date",    "type": "date",   "from": "form"},
            {"name": "claimant_id",      "type": "string", "from": "auth"},
        ],
        "steps": [
            "OCR claim documents · extract structured data",
            "Validate policy coverage from policy_admin",
            "Check fraud indicators (link to fraud_scorer)",
            "Score damage from photos (CV model)",
            "Route by complexity: auto-settle <$1k · adjuster $1k-50k · SIU >$50k",
            "If auto-settle · trigger payment + close",
            "Else · create work item in claims_workbench",
            "Write claim_event + audit row",
        ],
        "outputs": [
            {"name": "claim_id",         "type": "string", "to": "Guidewire"},
            {"name": "coverage_decision","type": "enum",   "to": "claim_event"},
            {"name": "estimated_payout", "type": "USD",    "to": "finance"},
            {"name": "next_action",      "type": "enum",   "to": "workflow"},
        ],
        "mcp_servers": ["guidewire-mcp", "policy-admin-mcp", "imaging-mcp"],
        "rag_corpora": ["policy-documents", "underwriting-guidelines", "state-regulations", "fraud-patterns"],
        "tools": ["ocr_tool", "fraud_model", "payment_gateway", "doc_summarize"],
    },
    "Underwriting": {
        "process_summary": "Risk assessment · pricing · policy issuance · referral routing",
        "inputs": [
            {"name": "applicant_data",   "type": "json",   "from": "quote form"},
            {"name": "property_details", "type": "json",   "from": "appraisal"},
            {"name": "loss_history",     "type": "json",   "from": "CLUE report"},
            {"name": "credit_score",     "type": "int",    "from": "Experian"},
        ],
        "steps": [
            "Pull loss history + credit + property data",
            "Run risk model · score 0-100",
            "Apply state regulations from rate filing",
            "Calculate base premium · apply discounts",
            "Check appetite rules · refer if outside",
            "Generate quote document",
            "If accepted · issue policy + bind",
            "Write underwriting_decision row",
        ],
        "outputs": [
            {"name": "risk_score",       "type": "float",  "to": "underwriting_decision"},
            {"name": "premium",          "type": "USD",    "to": "policy"},
            {"name": "policy_doc",       "type": "PDF",    "to": "document_store"},
            {"name": "referral_flag",    "type": "bool",   "to": "uw_workbench"},
        ],
        "mcp_servers": ["policy-admin-mcp", "clue-mcp", "credit-bureau-mcp"],
        "rag_corpora": ["rate-filings", "underwriting-guidelines", "state-regulations", "appetite-rules"],
        "tools": ["rate_quote", "fraud_model", "identity_verify", "doc_summarize"],
    },
    "Customer Service": {
        "process_summary": "Intake customer requests · classify intent · resolve or escalate",
        "inputs": [
            {"name": "customer_message", "type": "text",   "from": "chat/email/voice"},
            {"name": "customer_id",      "type": "string", "from": "auth"},
            {"name": "channel",          "type": "enum",   "from": "router"},
            {"name": "conversation_id",  "type": "uuid",   "from": "session"},
        ],
        "steps": [
            "Classify intent · 20+ categories",
            "Authenticate customer + load policy context",
            "Retrieve relevant KB articles via RAG",
            "Draft response · brand voice guardrail",
            "If sentiment negative OR P1 issue · escalate to human",
            "Send response + log to CRM",
            "Capture NPS opportunity",
            "Update customer_interaction history",
        ],
        "outputs": [
            {"name": "intent_class",     "type": "string", "to": "analytics"},
            {"name": "response_text",    "type": "text",   "to": "customer"},
            {"name": "escalation_flag",  "type": "bool",   "to": "agent_queue"},
            {"name": "interaction_log",  "type": "json",   "to": "CRM"},
        ],
        "mcp_servers": ["salesforce-mcp", "zendesk-mcp", "twilio-mcp"],
        "rag_corpora": ["faq", "policy-documents", "billing-rules", "product-catalog"],
        "tools": ["answer_faq", "verify_identity", "email_send", "draft_communication"],
    },
    "Fraud": {
        "process_summary": "Score fraud risk · detect patterns · investigate · recover loss",
        "inputs": [
            {"name": "transaction_or_claim", "type": "json", "from": "claims/payments"},
            {"name": "claimant_history",     "type": "json", "from": "data lake"},
            {"name": "network_graph",        "type": "graph","from": "graph DB"},
            {"name": "model_features",       "type": "json", "from": "feature store"},
        ],
        "steps": [
            "Pull historical features + network graph",
            "Run XGBoost + GraphSAGE fraud model",
            "Cross-reference SIU watchlist + AML hits",
            "Compute fraud score 0-1 + reason codes",
            "If score > 0.85 · auto-flag for SIU",
            "If 0.5-0.85 · queue for human review",
            "Build investigation case if confirmed",
            "Trigger recovery + write fraud_event row",
        ],
        "outputs": [
            {"name": "fraud_score",      "type": "float",  "to": "claim_event"},
            {"name": "reason_codes",     "type": "string[]","to": "siu_case"},
            {"name": "siu_case_id",      "type": "string", "to": "SIU workbench"},
            {"name": "recovery_amount",  "type": "USD",    "to": "finance"},
        ],
        "mcp_servers": ["siu-mcp", "aml-watchlist-mcp", "graph-db-mcp"],
        "rag_corpora": ["fraud-patterns", "siu-runbooks", "past-investigations", "ring-databases"],
        "tools": ["fraud_model", "score_fraud_risk", "graph_search", "vector_search"],
    },
    "Compliance": {
        "process_summary": "Monitor regulatory adherence · file required reports · audit trail",
        "inputs": [
            {"name": "transactions",     "type": "json[]", "from": "policy/claims"},
            {"name": "regulation_id",    "type": "string", "from": "filing schedule"},
            {"name": "state_jurisdiction","type": "enum",  "from": "policy_admin"},
            {"name": "audit_period",     "type": "daterange","from": "compliance calendar"},
        ],
        "steps": [
            "Pull all in-scope transactions",
            "Apply current regulation rules",
            "Identify violations + missing fields",
            "Generate regulatory filing document",
            "Submit via state-specific API",
            "Track receipt + confirmation",
            "Update audit_trail · sign report",
            "Write compliance_event row",
        ],
        "outputs": [
            {"name": "filing_id",        "type": "string", "to": "state regulator"},
            {"name": "violation_count",  "type": "int",    "to": "audit_trail"},
            {"name": "audit_report",     "type": "PDF",    "to": "document_store"},
            {"name": "remediation_list", "type": "json",   "to": "agent_queue"},
        ],
        "mcp_servers": ["state-filing-mcp", "audit-trail-mcp", "document-mcp"],
        "rag_corpora": ["regulations", "rate-filings", "past-audits", "policy-documents"],
        "tools": ["audit_decision", "detect_pii", "doc_summarize", "draft_communication"],
    },
    "Finance": {
        "process_summary": "Process invoices · reconcile payments · manage commissions + refunds",
        "inputs": [
            {"name": "invoice_or_payment","type": "json",  "from": "AP/AR system"},
            {"name": "policy_data",      "type": "json",   "from": "policy_admin"},
            {"name": "commission_rules", "type": "json",   "from": "agency_mgmt"},
            {"name": "vendor_id",        "type": "string", "from": "vendor master"},
        ],
        "steps": [
            "OCR invoice or parse payment file",
            "Match to policy/commission rule",
            "Run 3-way match: invoice/PO/receipt",
            "Validate against budget + authority",
            "Route by amount: auto <$10k · manager $10k-100k · CFO >$100k",
            "Post to GL + update reserves",
            "Send remittance advice",
            "Write finance_event row",
        ],
        "outputs": [
            {"name": "transaction_id",   "type": "string", "to": "GL"},
            {"name": "approval_route",   "type": "enum",   "to": "agent_queue"},
            {"name": "remittance_doc",   "type": "PDF",    "to": "vendor"},
            {"name": "reserve_update",   "type": "USD",    "to": "ledger"},
        ],
        "mcp_servers": ["sap-mcp", "stripe-mcp", "agency-mcp"],
        "rag_corpora": ["accounting-policies", "commission-rules", "vendor-contracts"],
        "tools": ["ocr_tool", "payment_gateway", "audit_decision", "create_ticket"],
    },
    "HR": {
        "process_summary": "Recruitment screening · employee lifecycle · benefits inquiry · leave management",
        "inputs": [
            {"name": "applicant_resume", "type": "PDF",    "from": "ATS"},
            {"name": "employee_id",      "type": "string", "from": "HRIS"},
            {"name": "job_requisition",  "type": "json",   "from": "ATS"},
            {"name": "request_payload",  "type": "json",   "from": "self-service portal"},
        ],
        "steps": [
            "Parse resume · extract structured fields",
            "Match against job description (semantic similarity)",
            "Run background + reference checks",
            "Schedule interviews via calendar API",
            "For benefits inquiries · pull plan rules from KB",
            "For leave · check balance + manager approval",
            "Update Workday · notify employee",
            "Write hr_event row",
        ],
        "outputs": [
            {"name": "candidate_score",  "type": "float",  "to": "ATS"},
            {"name": "interview_slot",   "type": "datetime","to": "calendar"},
            {"name": "decision",         "type": "enum",   "to": "Workday"},
            {"name": "comm_log",         "type": "json",   "to": "audit"},
        ],
        "mcp_servers": ["workday-mcp", "ats-mcp", "calendar-mcp"],
        "rag_corpora": ["job-descriptions", "benefits-guides", "company-policies"],
        "tools": ["doc_summarize", "verify_identity", "answer_faq", "email_send"],
    },
    "Sales": {
        "process_summary": "Score leads · route opportunities · generate proposals · forecast",
        "inputs": [
            {"name": "lead_data",        "type": "json",   "from": "marketing"},
            {"name": "opportunity_record","type": "json",  "from": "Salesforce"},
            {"name": "product_catalog",  "type": "json",   "from": "PIM"},
            {"name": "pricing_rules",    "type": "json",   "from": "pricing engine"},
        ],
        "steps": [
            "Enrich lead with firmographic data",
            "Score lead (propensity model · 0-100)",
            "Route to right rep based on territory + capacity",
            "Generate quote/proposal document",
            "Run upsell + cross-sell recommendations",
            "Forecast pipeline · pull historical close rates",
            "Update Salesforce · trigger nurture sequence",
            "Write sales_event row",
        ],
        "outputs": [
            {"name": "lead_score",       "type": "float",  "to": "Salesforce"},
            {"name": "proposal_doc",     "type": "PDF",    "to": "prospect"},
            {"name": "forecast_value",   "type": "USD",    "to": "pipeline"},
            {"name": "next_action",      "type": "enum",   "to": "rep workbench"},
        ],
        "mcp_servers": ["salesforce-mcp", "marketo-mcp", "docusign-mcp"],
        "rag_corpora": ["product-catalog", "competitive-intel", "win-stories"],
        "tools": ["rate_quote", "draft_communication", "doc_summarize", "vector_search"],
    },
    "Marketing": {
        "process_summary": "Generate content · optimize campaigns · segment audiences · A/B test",
        "inputs": [
            {"name": "brief",            "type": "text",   "from": "campaign mgr"},
            {"name": "audience_segment", "type": "json",   "from": "CDP"},
            {"name": "performance_data", "type": "json",   "from": "analytics"},
            {"name": "brand_guidelines", "type": "PDF",    "from": "brand"},
        ],
        "steps": [
            "Pull audience segment + persona",
            "Retrieve brand voice + past high-performing content",
            "Generate copy + creative variants (3-5)",
            "Run brand-voice + tone guardrail",
            "Set up A/B test in MAP",
            "Schedule + publish across channels",
            "Track performance vs control",
            "Write campaign_event row",
        ],
        "outputs": [
            {"name": "campaign_id",      "type": "string", "to": "MAP"},
            {"name": "creative_variants","type": "json[]", "to": "asset_mgmt"},
            {"name": "test_results",     "type": "json",   "to": "analytics"},
            {"name": "winner_variant",   "type": "string", "to": "deploy"},
        ],
        "mcp_servers": ["marketo-mcp", "hubspot-mcp", "facebook-ads-mcp"],
        "rag_corpora": ["brand-guidelines", "past-campaigns", "competitor-intel"],
        "tools": ["draft_communication", "doc_summarize", "audit_decision"],
    },
    "AI SDLC": {
        "process_summary": "AI-assisted dev lifecycle · PR enrichment · code review · test/docs generation",
        "inputs": [
            {"name": "git_event",        "type": "json",   "from": "GitHub webhook"},
            {"name": "diff_payload",     "type": "patch",  "from": "git"},
            {"name": "repo_context",     "type": "json",   "from": "repo metadata"},
            {"name": "eval_set",         "type": "json",   "from": "eval registry"},
        ],
        "steps": [
            "Fetch PR diff + commit history",
            "Retrieve relevant code + docs from RAG",
            "Run security scan + dependency audit",
            "Generate tests for changed paths",
            "Update docs + ADR if architecture changed",
            "Post review comments + suggestions",
            "Trigger eval pipeline · gate on regression",
            "Write sdlc_event row",
        ],
        "outputs": [
            {"name": "review_comments",  "type": "json[]", "to": "GitHub PR"},
            {"name": "test_files",       "type": "patch",  "to": "PR"},
            {"name": "doc_updates",      "type": "patch",  "to": "PR"},
            {"name": "eval_verdict",     "type": "enum",   "to": "deploy gate"},
        ],
        "mcp_servers": ["github-mcp", "snyk-mcp", "openai-mcp"],
        "rag_corpora": ["code-corpus", "adr-history", "test-patterns", "security-advisories"],
        "tools": ["enrich_pr", "review_code", "scan_secrets", "test_generator"],
    },
    "Security": {
        "process_summary": "Threat detection · vulnerability response · access governance · incident triage",
        "inputs": [
            {"name": "alert_event",      "type": "json",   "from": "SIEM"},
            {"name": "asset_inventory",  "type": "json",   "from": "CMDB"},
            {"name": "user_directory",   "type": "json",   "from": "Azure AD"},
            {"name": "threat_intel",     "type": "json",   "from": "TI feeds"},
        ],
        "steps": [
            "Correlate alert across data sources",
            "Pull asset criticality + owner",
            "Match against MITRE ATT&CK + threat intel",
            "Generate IOC list + investigation steps",
            "If confirmed · auto-isolate via EDR",
            "Open incident + page on-call",
            "Trigger access review or token revoke",
            "Write security_event row",
        ],
        "outputs": [
            {"name": "incident_id",      "type": "string", "to": "incident_management"},
            {"name": "ioc_list",         "type": "json[]", "to": "TI platform"},
            {"name": "containment_actions","type": "json", "to": "EDR"},
            {"name": "compliance_log",   "type": "json",   "to": "audit_trail"},
        ],
        "mcp_servers": ["splunk-mcp", "crowdstrike-mcp", "azure-ad-mcp"],
        "rag_corpora": ["security-playbooks", "threat-intel", "past-incidents", "compliance-controls"],
        "tools": ["scan_secrets", "detect_pii", "verify_identity", "analyze_logs"],
    },
}


# Default fallback for unknown depts
_DEFAULT_TEMPLATE = {
    "process_summary": "Generic agent flow · classify input · pick skill · execute · audit",
    "inputs": [
        {"name": "input_text",     "type": "text",   "from": "API caller"},
        {"name": "correlation_id", "type": "uuid",   "from": "tracing header"},
    ],
    "steps": [
        "Classify input intent",
        "Plan skill sequence",
        "Execute tools",
        "Validate output",
        "Write audit row",
    ],
    "outputs": [
        {"name": "output_text",    "type": "text",   "to": "API caller"},
        {"name": "audit_row",      "type": "json",   "to": "agent_invocation"},
    ],
    "mcp_servers": ["generic-mcp"],
    "rag_corpora": ["general-kb"],
    "tools": ["doc_summarize"],
}


def build_blueprint(agent_id: str, agent_name: str, department_id: str,
                    risk_level: str, skills: list[str]) -> dict[str, Any]:
    """Compose a per-agent blueprint from dept template + agent specifics."""
    template = DEPT_TEMPLATES.get(department_id, _DEFAULT_TEMPLATE)

    # Deterministic variation seeded by agent_id hash
    h = int(hashlib.sha256(agent_id.encode()).hexdigest()[:8], 16)

    # Customize MCP/RAG/tools based on agent's actual skills
    extra_tools = list(skills[:5]) if skills else []

    # Flowchart string · ASCII per agent
    autonomy_marker = "auto" if risk_level == "Low" else \
                      "HITL" if risk_level == "Medium" else "approval"

    flowchart = (
        f"[trigger]\n  ↓\n[agent: {agent_id}]\n"
        f"  ↓  (autonomy={autonomy_marker})\n"
        f"[planner] picks from {len(skills)} skill(s)\n"
        f"  ↓\n[research]\n  ↓→ vector search\n"
        f"  ↓→ MCP: {', '.join(template['mcp_servers'][:2])}\n  ↓\n"
        f"[skill execution]\n"
        + "\n".join(f"  · {step}" for step in template["steps"][:4])
        + f"\n  ↓\n[review] · risk={risk_level}\n  ↓\n[verify] · 9 gates\n"
        f"  ↓\n[audit_row] → agent_invocation\n  ↓\n[response]"
    )

    return {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "department_id": department_id,
        "risk_level": risk_level,
        "process_summary": template["process_summary"],
        "inputs": template["inputs"],
        "steps": template["steps"],
        "outputs": template["outputs"],
        "mcp_servers": template["mcp_servers"],
        "rag_corpora": template["rag_corpora"],
        "tools_template": template["tools"],
        "tools_mapped": extra_tools,
        "flowchart_ascii": flowchart,
        "autonomy_marker": autonomy_marker,
        "blueprint_hash": f"{h:08x}",
    }
