"""Autonomous Department Registry · structured data per docs/AUTONOMOUS_DEPARTMENT_FRAMEWORK.md."""
from __future__ import annotations

from typing import Any


# ─── 10-Level Autonomy Maturity ──────────────────────────────
MATURITY_LEVELS = [
    {"level": "L1",  "name": "Descriptive",     "question": "What happened?",
     "tech": ["BI", "SQL", "Dashboard", "KPI"],
     "this_project_status": "used",
     "this_project": "AdminAuditPage · MarketingKPIsPage · weekly digest"},
    {"level": "L2",  "name": "Diagnostic",      "question": "Why did it happen?",
     "tech": ["ML", "Correlation", "Root cause", "XAI"],
     "this_project_status": "used",
     "this_project": "weekly_audit_digest failing-row breakdown"},
    {"level": "L3",  "name": "Predictive",      "question": "What will happen?",
     "tech": ["ML", "DL", "Time series", "Transformer"],
     "this_project_status": "scaffolded",
     "this_project": "autonomous_agent rule-based per §57.7"},
    {"level": "L4",  "name": "Prescriptive",    "question": "What should we do?",
     "tech": ["Optimization", "RL", "Recommendation"],
     "this_project_status": "scaffolded",
     "this_project": "NBA recommendation in agent decision chain"},
    {"level": "L5",  "name": "Workflow",        "question": "How do we execute?",
     "tech": ["BPM", "Workflow", "Rules", "Process mining"],
     "this_project_status": "used",
     "this_project": "run_due_schedules · run_due_postings cron"},
    {"level": "L6",  "name": "Intelligent Workflow", "question": "Workflow + AI",
     "tech": ["Workflow", "ML", "NLP", "CV"],
     "this_project_status": "used",
     "this_project": "DLP gate + RAI gate + autonomous decisions"},
    {"level": "L7",  "name": "Agent",           "question": "Single autonomous agent",
     "tech": ["LangGraph", "CrewAI", "MCP", "RAG"],
     "this_project_status": "used",
     "this_project": "autonomous_agent_runs decision loop"},
    {"level": "L8",  "name": "Multi-Agent",     "question": "Agents collaborate",
     "tech": ["LangGraph", "CrewAI", "MCP", "RAG"],
     "this_project_status": "planned",
     "this_project": "Single-agent today · multi-coord planned (T4.1)"},
    {"level": "L9",  "name": "Decision Intelligence", "question": "Predictive + Prescriptive + RL + Graph + Agent",
     "tech": ["Predictive", "Prescriptive", "RL", "Graph AI", "Agent"],
     "this_project_status": "planned",
     "this_project": "Predictive + RL not yet wired · T5.7"},
    {"level": "L10", "name": "Autonomous Department", "question": "End-to-end with HITL exceptions",
     "tech": ["CV", "NLP", "Speech", "ML", "TS", "Graph", "RAG", "Workflow", "RL", "Agent"],
     "this_project_status": "planned",
     "this_project": "Hybrid stack planned · T4 + T5 + T6 chains"},
]


# ─── Continuous Learning Governance (14 layers) ─────────────
GOVERNANCE_GATES = [
    {"id": 1,  "name": "Confidence Score Routing",
     "rules": {"95-100": "Auto Execute", "85-95": "Agent Review",
                "70-85": "Human Approval", "<70": "Manual Processing"},
     "this_project_status": "used",
     "this_project": "autonomous_agent.measure decision · T7.9"},
    {"id": 2,  "name": "Threshold Management",
     "examples": ["Fraud >95 auto-block", "Churn >90% retention campaign"],
     "this_project_status": "used"},
    {"id": 3,  "name": "Human-in-the-Loop (HITL)",
     "capture_fields": ["AI Decision", "Human Decision", "Reason", "Reviewer", "Timestamp"],
     "this_project_status": "planned"},
    {"id": 4,  "name": "Human Feedback (explicit + implicit)",
     "explicit": ["good", "bad", "correct", "incorrect"],
     "implicit": ["accepted", "modified", "rejected", "ignored"],
     "this_project_status": "planned"},
    {"id": 5,  "name": "AI Correction Layer",
     "this_project_status": "planned"},
    {"id": 6,  "name": "RLHF",
     "this_project_status": "planned"},
    {"id": 7,  "name": "Evaluation Layer",
     "tools": ["RAGAS", "DeepEval"],
     "this_project_status": "planned"},
    {"id": 8,  "name": "Benchmark Layer · model comparison",
     "this_project_status": "planned"},
    {"id": 9,  "name": "AI Quality Score (weighted)",
     "weights": {"Accuracy": 0.25, "Precision": 0.15, "Recall": 0.15,
                  "Human Rating": 0.15, "Latency": 0.10, "Cost": 0.10,
                  "Compliance": 0.10},
     "this_project_status": "partial"},
    {"id": 10, "name": "Drift Monitoring · data/concept/model",
     "this_project_status": "partial"},
    {"id": 11, "name": "Autonomous Review Agent",
     "this_project_status": "planned"},
    {"id": 12, "name": "Benchmarking Agent · shadow models",
     "this_project_status": "planned"},
    {"id": 13, "name": "Self-Healing AI · fallback chain",
     "example": "GPT failure → Claude → Llama",
     "this_project_status": "planned"},
    {"id": 14, "name": "Continuous Learning Workflow",
     "this_project_status": "partial",
     "this_project": "weekly_audit_digest IS the learning loop"},
]


# ─── MCP Categories for Marketing ──────────────────────────
MCP_CATEGORIES = [
    {"area": "CRM",       "mcps": ["HubSpot MCP", "Salesforce MCP", "Postgres MCP"],
     "use": "Customer/contact master", "priority": 1},
    {"area": "Email",     "mcps": ["Gmail MCP", "SMTP MCP", "Mailchimp custom MCP"],
     "use": "Send/review campaign emails", "priority": 7},
    {"area": "Social",    "mcps": ["LinkedIn/X/Facebook/Instagram custom MCP"],
     "use": "Publish posts · fetch comments", "priority": 10},
    {"area": "Survey",    "mcps": ["Typeform MCP", "Google Forms MCP", "LimeSurvey MCP"],
     "use": "Create survey · collect responses", "priority": 9},
    {"area": "Files",     "mcps": ["Google Drive MCP", "OneDrive MCP", "S3 MCP"],
     "use": "Store banners · CSVs · PDFs", "priority": 2},
    {"area": "Database",  "mcps": ["Postgres MCP", "MySQL MCP", "SQLite MCP"],
     "use": "Campaign/contact/survey data", "priority": 1},
    {"area": "Analytics", "mcps": ["Google Analytics MCP", "Matomo MCP"],
     "use": "Track visits/clicks/conversions", "priority": 8},
    {"area": "Browser",   "mcps": ["Puppeteer MCP", "Playwright MCP"],
     "use": "Operate web UIs directly", "priority": 3},
    {"area": "Design",    "mcps": ["Canva MCP", "Figma MCP"],
     "use": "Banner/design workflow", "priority": 6},
    {"area": "Workflow",  "mcps": ["n8n MCP", "Activepieces MCP"],
     "use": "Trigger full campaign pipeline", "priority": 4},
    {"area": "Chat",      "mcps": ["Slack MCP", "Teams MCP"],
     "use": "Approval · alerts · review", "priority": 4},
    {"area": "Payments",  "mcps": ["Stripe MCP", "Shopify MCP"],
     "use": "Customer/product/event triggers", "priority": 5},
    {"area": "Docs",      "mcps": ["Notion MCP", "Confluence MCP"],
     "use": "Campaign briefs · script library", "priority": 5},
]


# ─── Multi-AI Hybrid Use Cases ───────────────────────────────
HYBRIDS = [
    {"id": "fraud_detection", "domain": "Fraud Detection",
     "techniques": ["ML", "NLP", "CV", "Graph AI", "RAG", "RLHF"],
     "value": "highest", "level": "L10"},
    {"id": "claims_automation", "domain": "Claims Automation",
     "techniques": ["CV", "NLP", "Transformer", "Workflow"],
     "value": "very_high", "level": "L10"},
    {"id": "underwriting_copilot", "domain": "Underwriting Copilot",
     "techniques": ["NLP", "RAG", "Transformer", "ML"],
     "value": "very_high", "level": "L7"},
    {"id": "churn_prevention", "domain": "Churn Prevention",
     "techniques": ["Sentiment", "ML", "Time Series", "RL"],
     "value": "high", "level": "L4"},
    {"id": "dynamic_pricing", "domain": "Dynamic Pricing",
     "techniques": ["Time Series", "RL", "ML", "DL", "RAG"],
     "value": "high", "level": "L9"},
    {"id": "agent_assist_cc", "domain": "Agent Assist Contact Center",
     "techniques": ["Speech", "NLP", "RAG", "LLM", "Workflow"],
     "value": "high", "level": "L7"},
    {"id": "next_best_offer", "domain": "Next Best Offer",
     "techniques": ["Recommender", "Transformer", "Graph AI", "RAG"],
     "value": "high", "level": "L4"},
    {"id": "customer_360", "domain": "Customer 360",
     "techniques": ["NLP", "Recommender", "RAG"],
     "value": "medium_high", "level": "L3"},
    {"id": "cat_risk_modeling", "domain": "CAT Risk Modeling",
     "techniques": ["CV", "Time Series", "DL", "Graph AI", "Transformer"],
     "value": "high", "level": "L3"},
    {"id": "autonomous_claims", "domain": "Autonomous Claims",
     "techniques": ["CV", "NLP", "Speech", "ML", "Time Series", "Graph AI",
                     "RAG", "Workflow", "RL", "Agent"],
     "value": "highest", "level": "L10"},
]


# ─── Open-Source Autonomous Marketing Stack ────────────────
MARKETING_OSS_STACK = [
    {"tool": "Mautic",       "category": "Campaign automation", "score": 9.4},
    {"tool": "Listmonk",     "category": "Email sending",        "score": 9.5},
    {"tool": "Dittofeed",    "category": "Customer engagement",  "score": 9.2},
    {"tool": "Postal",       "category": "Email infrastructure", "score": 8.8},
    {"tool": "Keila",        "category": "Email marketing",      "score": 8.5},
    {"tool": "LimeSurvey",   "category": "Survey platform",      "score": 9.8},
    {"tool": "Formbricks",   "category": "Feedback widget",      "score": 9.5},
    {"tool": "SurveyJS",     "category": "Form builder",         "score": 9.3},
    {"tool": "ComfyUI",      "category": "Banner generation",    "score": 10.0},
    {"tool": "Stable Diffusion WebUI", "category": "Banner generation", "score": 9.8},
    {"tool": "InvokeAI",     "category": "Banner generation",    "score": 9.5},
    {"tool": "Fooocus",      "category": "Banner generation",    "score": 9.3},
    {"tool": "Mixpost",      "category": "Social publishing",    "score": 9.7},
    {"tool": "Activepieces", "category": "Workflow",             "score": 9.8},
    {"tool": "n8n",          "category": "Workflow",             "score": 9.7},
    {"tool": "Ollama",       "category": "Local LLM",            "score": 9.0},
    {"tool": "Matomo",       "category": "Web analytics",        "score": 8.8},
    {"tool": "Metabase",     "category": "Dashboard",            "score": 8.7},
    {"tool": "PostgreSQL",   "category": "Database",             "score": 10.0},
]


# ─── Contact Center AI Voice Stack ──────────────────────────
CONTACT_CENTER_STACK = [
    # STT
    {"tool": "Deepgram",     "layer": "STT",            "score": 9.8},
    {"tool": "AssemblyAI",   "layer": "STT",            "score": 9.5},
    {"tool": "Whisper",      "layer": "STT",            "score": 9.3},
    {"tool": "SpeechBrain",  "layer": "STT",            "score": 8.8},
    # TTS
    {"tool": "ElevenLabs",   "layer": "TTS",            "score": 10.0},
    {"tool": "Cartesia",     "layer": "TTS",            "score": 9.8},
    {"tool": "Coqui TTS",    "layer": "TTS",            "score": 9.0},
    {"tool": "Piper TTS",    "layer": "TTS",            "score": 8.8},
    # Voice platforms
    {"tool": "Vapi",         "layer": "Voice Agent Platform", "score": None},
    {"tool": "Retell AI",    "layer": "Voice Agent Platform", "score": None},
    {"tool": "LiveKit",      "layer": "Realtime Voice", "score": None},
    {"tool": "Pipecat",      "layer": "OSS Voice Agent Framework", "score": None},
    # LLM
    {"tool": "GPT-4o",       "layer": "LLM",            "score": None},
    {"tool": "Claude",       "layer": "LLM",            "score": None},
    {"tool": "Gemini",       "layer": "LLM",            "score": None},
    {"tool": "Qwen",         "layer": "LLM (Local)",    "score": None},
    {"tool": "Llama 3",      "layer": "LLM (Local)",    "score": None},
]


# ─── Browser Agent + Computer Use Stack ────────────────────
BROWSER_STACK = [
    # Layer 1 · Browser Control
    {"tool": "Playwright",   "layer": "Browser Control", "score": 9.8},
    {"tool": "Puppeteer",    "layer": "Browser Control", "score": 9.0},
    {"tool": "Selenium",     "layer": "Browser Control", "score": 7.8},
    {"tool": "CDP",          "layer": "Browser Control · low-level", "score": None},
    # Layer 2 · Computer Use
    {"tool": "Claude Computer Use", "layer": "Computer Use Agent", "score": None},
    {"tool": "OpenAI Operator",     "layer": "Computer Use Agent", "score": None},
    {"tool": "UI-TARS",             "layer": "Computer Use Agent", "score": 9.3},
    {"tool": "Agent S2",            "layer": "Computer Use Agent", "score": None},
    # Layer 3 · Vision Agents
    {"tool": "OmniParser",   "layer": "Vision Agent", "score": 9.1},
    {"tool": "UI-TARS",      "layer": "Vision Agent", "score": 9.2},
    {"tool": "GPT-4o Vision","layer": "Vision Agent", "score": None},
    {"tool": "Claude Vision","layer": "Vision Agent", "score": None},
    # Layer 4 · OCR
    {"tool": "Azure Document Intelligence", "layer": "OCR", "score": 10.0},
    {"tool": "Google Document AI",          "layer": "OCR", "score": 9.5},
    {"tool": "Amazon Textract",             "layer": "OCR", "score": 9.0},
    {"tool": "Tesseract",                   "layer": "OCR", "score": 7.0},
    # Layer 5 · RPA
    {"tool": "UiPath",               "layer": "RPA", "score": None},
    {"tool": "Automation Anywhere",  "layer": "RPA", "score": None},
    {"tool": "MS Power Automate",    "layer": "RPA", "score": None},
    {"tool": "Blue Prism",           "layer": "RPA", "score": None},
    # AI browser agents (OSS)
    {"tool": "Browser Use",  "layer": "AI Browser Agent (OSS)", "score": 9.4},
    {"tool": "Skyvern",      "layer": "AI Browser Agent (OSS)", "score": 9.6},
    {"tool": "Stagehand",    "layer": "AI Browser Agent (OSS)", "score": 8.8},
    {"tool": "OpenAdapt",    "layer": "Learn from user actions (OSS)", "score": 8.9},
    {"tool": "OpenHands",    "layer": "Autonomous Agent (OSS)", "score": 8.5},
    # Frameworks
    {"tool": "LangGraph",    "layer": "Workflow Engine", "score": 9.4},
    {"tool": "AgentOps",     "layer": "Agent Monitoring", "score": None},
    {"tool": "Langfuse",     "layer": "Observability",    "score": None},
]


# ─── HITL Risk Tiers ────────────────────────────────────────
HITL_RISK_TIERS = [
    {"tier": "low",    "examples": ["Read email", "Read report",
                                       "Search knowledge base"],
     "action": "auto_execute"},
    {"tier": "medium", "examples": ["Submit form", "Update ticket", "Create user"],
     "action": "approval_optional"},
    {"tier": "high",   "examples": ["Transfer money", "Delete data",
                                       "Approve loan", "Terminate employee"],
     "action": "approval_mandatory"},
]


# ─── Stats helper ──────────────────────────────────────────
def stats() -> dict[str, Any]:
    return {
        "total_maturity_levels": len(MATURITY_LEVELS),
        "by_status": {
            "used":       sum(1 for l in MATURITY_LEVELS if l["this_project_status"] == "used"),
            "scaffolded": sum(1 for l in MATURITY_LEVELS if l["this_project_status"] == "scaffolded"),
            "planned":    sum(1 for l in MATURITY_LEVELS if l["this_project_status"] == "planned"),
        },
        "total_governance_gates": len(GOVERNANCE_GATES),
        "total_mcp_categories": len(MCP_CATEGORIES),
        "total_hybrids": len(HYBRIDS),
        "total_marketing_oss_tools": len(MARKETING_OSS_STACK),
        "total_contact_center_tools": len(CONTACT_CENTER_STACK),
        "total_browser_stack_tools": len(BROWSER_STACK),
        "total_hitl_tiers": len(HITL_RISK_TIERS),
    }
