#!/usr/bin/env python3
"""build_insurance_catalog.py — single editable source for the insurance catalog.

Per global §82. Emits:
  - config/brand.config.json          (lean nav, all 22 depts)
  - config/insurance.catalog.json     (deep tree, all processes + sub-procs)
  - config/ai_capabilities.json       (the cross-cutting AI registry)
  - config/stakeholders.json          (the stakeholder role registry)
  - data/insurance/<dept>/<process>.<ext>  (multi-format sample data)
  - data/insurance/manifest.json      (download index for the UI)

Idempotent: rerun anytime. Sample data is deterministic per (dept, process).
"""
from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from lib import datafmt  # noqa: E402


# =============================================================================
# 1. AI CAPABILITY REGISTRY  (per global §82.1, 90+ entries)
# =============================================================================

# Each entry: (id, name, family, icon, description). De-duped across depts.
AI_REGISTRY: list[tuple[str, str, str, str, str]] = [
    # Foundational
    ("predictive",     "Predictive AI",        "Foundational", "🔮", "Forecasts + propensity scoring."),
    ("generative",     "Generative AI",        "Foundational", "✨", "LLM/diffusion content generation."),
    ("conversational", "Conversational AI",    "Foundational", "💬", "Multi-turn dialogue agents."),
    ("voice",          "Voice AI",             "Foundational", "🎙️", "ASR + TTS + voice biometrics."),
    ("multimodal",     "Multimodal AI",        "Foundational", "🎛️", "Text + image + voice fusion."),
    ("vision",         "Vision AI",            "Foundational", "👁", "Image classification + object detection."),
    ("video",          "Video AI",             "Foundational", "🎬", "Video analytics + scene parsing."),
    ("ocr",            "OCR AI",               "Foundational", "📄", "Text extraction from images + scans."),
    ("nlp",            "NLP AI",               "Foundational", "🅰", "Tokenisation, NER, classification, summarisation."),
    # Decision
    ("decision",       "Decision Intelligence","Decision",     "🧭", "Rule+ML+HITL decisioning layer."),
    ("recommendation", "Recommendation AI",    "Decision",     "🎯", "Personalised offer / next-best-action."),
    ("nextbestaction", "Next-Best-Action AI",  "Decision",     "➡️", "Real-time best follow-up suggestion."),
    ("risk",           "Risk AI",              "Decision",     "⚠️", "Risk scoring + exposure analytics."),
    ("pricing",        "Pricing AI",           "Decision",     "💲", "Premium / quote pricing models."),
    ("underwriting",   "Underwriting AI",      "Decision",     "📋", "Risk acceptance + tier assignment."),
    # Reasoning
    ("rag",            "RAG AI",               "Reasoning",    "📚", "Retrieval-augmented generation."),
    ("knowledge",      "Knowledge AI",         "Reasoning",    "🧠", "Structured + curated knowledge access."),
    ("knowledgegraph", "Knowledge Graph AI",   "Reasoning",    "🕸", "Entity + relation reasoning."),
    ("search",         "Search AI",            "Reasoning",    "🔎", "Semantic + hybrid search."),
    ("document",       "Document AI",          "Reasoning",    "📑", "Layout-aware document understanding."),
    ("agentic",        "Agentic AI",           "Reasoning",    "🤖", "Plan→tool→act autonomous workflows."),
    ("multiagent",     "Multi-Agent AI",       "Reasoning",    "🐝", "Collaborating specialised agents."),
    # Operations
    ("process",        "Process AI",           "Operations",   "🧩", "Process mining + orchestration."),
    ("workflow",       "Workflow AI",          "Operations",   "🪢", "Stateful long-running workflows."),
    ("automation",     "Automation AI",        "Operations",   "⚙️", "RPA + intelligent automation."),
    ("reconciliation", "Reconciliation AI",    "Operations",   "🧾", "Two-/three-way matching + break detection."),
    ("notification",   "Notification AI",      "Operations",   "🔔", "Smart routing + throttling of alerts."),
    ("communication",  "Communication AI",     "Operations",   "📨", "Outbound email / SMS / push generation."),
    ("meeting",        "Meeting AI",           "Operations",   "📅", "Transcripts + summaries + action items."),
    ("documentation",  "Documentation AI",     "Operations",   "📝", "Auto-doc generation + sidecar refresh."),
    ("reporting",      "Reporting AI",         "Operations",   "📊", "Auto-build dashboards + narratives."),
    ("cron",           "Cron AI",              "Operations",   "⏰", "Self-tuning scheduled job orchestration."),
    ("monitoring",     "Monitoring AI",        "Operations",   "📈", "Service + KPI monitoring."),
    ("incident",       "Incident AI",          "Operations",   "🚒", "Detection + triage + on-call routing."),
    ("aiops",          "AIOps",                "Operations",   "🛠", "AI-assisted IT operations."),
    # Governance
    ("governance",     "Governance AI",        "Governance",   "🏛", "AI policy + change-mgmt + risk register."),
    ("responsible",    "Responsible AI",       "Governance",   "🤝", "Stakeholder-aware design + review."),
    ("ethical",        "Ethical AI",           "Governance",   "⚖️", "Ethics review + redlines."),
    ("fairness",       "Fairness AI",          "Governance",   "📐", "Bias scans + parity gates."),
    ("explainable",    "Explainable AI",       "Governance",   "🔍", "SHAP / LIME / counterfactual."),
    ("trust",          "Trust AI",             "Governance",   "🛡", "Trust signals + provenance + watermarking."),
    ("compliance",     "Compliance AI",        "Governance",   "✅", "Regulatory rule mapping + filing checks."),
    ("audit",          "Audit AI",             "Governance",   "🗂", "Audit-row generation + trace linkage."),
    ("validation",     "Validation AI",        "Governance",   "🟢", "Schema + business-rule validation."),
    ("verification",   "Verification AI",      "Governance",   "✔️", "Identity / document / fact verification."),
    ("policy",         "Policy AI",            "Governance",   "📜", "Policy text drafting + diff."),
    ("secure",         "Secure AI",            "Governance",   "🔒", "Threat-aware secure development."),
    ("privacy",        "Privacy AI",           "Governance",   "🕶", "Privacy-preserving processing."),
    ("pii",            "PII AI",               "Governance",   "👤", "PII detection + redaction."),
    ("dlp",            "DLP AI",               "Governance",   "🚫", "Data loss prevention scanning."),
    # Quality
    ("evaluation",     "Evaluation AI",        "Quality",      "📏", "Eval harness + golden datasets."),
    ("benchmark",      "Benchmark AI",         "Quality",      "🏁", "Continuous benchmark suites."),
    ("performance",    "Performance AI",       "Quality",      "⚡", "Latency / throughput / cost tracking."),
    ("quality",        "Quality AI",           "Quality",      "💎", "Output quality monitoring."),
    ("sentiment",      "Sentiment AI",         "Quality",      "🙂", "Sentiment + emotion analysis."),
    ("anomaly",        "Anomaly Detection AI", "Quality",      "🚨", "Outlier + change-point detection."),
    ("behavioral",     "Behavioral AI",        "Quality",      "🧬", "User / entity behaviour analytics."),
    ("networkanalytics","Network Analytics AI","Quality",      "🌐", "Network / link analysis."),
    ("graph",          "Graph AI",             "Quality",      "🔗", "Graph algorithms + GNN reasoning."),
    # Domain
    ("product",        "Product AI",           "Domain",       "🧪", "Product design + lifecycle analytics."),
    ("marketing",      "Marketing AI",         "Domain",       "📣", "Campaign + content + attribution."),
    ("customer360",    "Customer 360 AI",      "Domain",       "🌟", "Unified customer profile."),
    ("segmentation",   "Segmentation AI",      "Domain",       "🎚", "Behavioural + demographic segmentation."),
    ("campaign",       "Campaign AI",          "Domain",       "🎪", "Campaign planning + optimisation."),
    ("churn",          "Churn AI",             "Domain",       "📉", "Churn prediction + intervention."),
    ("retention",      "Retention AI",         "Domain",       "🪝", "Retention treatments."),
    ("crosssell",      "Cross-Sell AI",        "Domain",       "🔄", "Cross-product opportunity scoring."),
    ("upsell",         "Upsell AI",            "Domain",       "⬆️", "Upgrade opportunity scoring."),
    ("personalization","Personalization AI",   "Domain",       "🧑‍🎨", "Personalised UX + offers."),
    ("content",        "Content AI",           "Domain",       "✍️", "Content generation + ranking."),
    ("socialmedia",    "Social Media AI",      "Domain",       "📱", "Social signal analytics."),
    ("sales",          "Sales AI",             "Domain",       "💼", "Sales pipeline + forecasting."),
    ("quote",          "Quote AI",             "Domain",       "💱", "Quote generation + pricing."),
    ("proposal",       "Proposal AI",          "Domain",       "📃", "Proposal drafting + tracking."),
    ("crm",            "CRM AI",               "Domain",       "👥", "CRM enrichment + automation."),
    ("customerintel",  "Customer Intelligence AI", "Domain",   "🔭", "Customer intent + behaviour insights."),
    ("claims",         "Claims AI",            "Domain",       "🧾", "Claims triage + settlement automation."),
    ("fnol",           "FNOL AI",              "Domain",       "📞", "First notice of loss capture."),
    ("investigation",  "Investigation AI",     "Domain",       "🕵", "SIU + fraud investigation workflows."),
    ("siu",            "SIU AI",               "Domain",       "🚓", "Special Investigation Unit tooling."),
    ("fraud",          "Fraud AI",             "Domain",       "🎭", "Fraud detection + scoring."),
    ("actuarial",      "Actuarial AI",         "Domain",       "📐", "Actuarial modelling + reserving."),
    ("reserving",      "Reserving AI",         "Domain",       "🗄", "IBNR + loss reserving."),
    ("forecasting",    "Forecasting AI",       "Domain",       "📈", "Time-series + scenario forecasting."),
    ("reinsurance",    "Reinsurance AI",       "Domain",       "🌐", "Treaty + facultative analytics."),
    ("catastrophe",    "Catastrophe AI",       "Domain",       "🌪", "Cat modelling + accumulation."),
    ("exposure",       "Exposure AI",          "Domain",       "🗺", "Exposure aggregation + concentration."),
    ("billing",        "Billing AI",           "Domain",       "🧮", "Premium billing automation."),
    ("payment",        "Payment AI",           "Domain",       "💳", "Payment orchestration + fraud."),
    ("collection",     "Collection AI",        "Domain",       "📥", "Dunning + collections strategy."),
    ("translation",    "Translation AI",       "Domain",       "🌍", "Multilingual translation + localisation."),
    ("contractai",     "Contract AI",          "Domain",       "📜", "Contract parsing + clause analytics."),
    ("vendor",         "Vendor AI",            "Domain",       "🏢", "Vendor scoring + performance."),
    ("procurement",    "Procurement AI",       "Domain",       "🛒", "Procurement + spend analytics."),
    ("legal",          "Legal AI",             "Domain",       "⚖️", "Legal research + drafting assist."),
    ("litigation",     "Litigation AI",        "Domain",       "🧑‍⚖️","Litigation prediction + strategy."),
    ("financial",      "Financial AI",         "Domain",       "💰", "Financial analytics + planning."),
    ("cost",           "Cost AI",              "Domain",       "💸", "Cost analysis + allocation."),
    ("finops",         "FinOps AI",            "Domain",       "📊", "Cloud + AI cost optimisation."),
    ("talent",         "Talent AI",            "Domain",       "🧑‍💼", "Talent acquisition + retention."),
    ("workforce",      "Workforce AI",         "Domain",       "🏗", "Workforce planning + scheduling."),
    ("learning",       "Learning AI",          "Domain",       "🎓", "Adaptive learning paths."),
    ("training",       "Training AI",          "Domain",       "🏋", "Training content + skill gaps."),
    ("coaching",       "Coaching AI",          "Domain",       "🤲", "Coaching + nudges + feedback."),
    ("recruitment",    "Recruitment AI",       "Domain",       "🎯", "Recruitment + screening."),
    ("regulatory",     "Regulatory AI",        "Domain",       "🏛", "Regulatory tracking + horizon scan."),
    ("esg",            "ESG AI",               "Domain",       "🌱", "ESG metrics + reporting."),
    ("climaterisk",    "Climate Risk AI",      "Domain",       "🌡", "Climate scenario + transition risk."),
    ("marketrisk",     "Market Risk AI",       "Domain",       "📉", "Market risk modelling."),
    ("creditrisk",     "Credit Risk AI",       "Domain",       "💵", "Credit risk + counterparty exposure."),
    ("opsrisk",        "Operational Risk AI",  "Domain",       "🛡", "Operational loss event scoring."),
    ("enterpriserisk", "Enterprise Risk AI",   "Domain",       "🏢", "Enterprise-wide risk integration."),
    # Platform
    ("modelops",       "ModelOps AI",          "Platform",     "🧰", "Model lifecycle + registry."),
    ("mlops",          "MLOps AI",             "Platform",     "🔁", "Training + serving + monitoring."),
    ("llmops",         "LLMOps AI",            "Platform",     "🧠", "Prompt + eval + cost mgmt for LLMs."),
    ("agentops",       "AgentOps AI",          "Platform",     "🐙", "Agent fleet observability + control."),
    ("rl",             "Reinforcement Learning AI","Platform", "🎮", "RL training + policy serving."),
    ("simulation",     "Simulation AI",        "Platform",     "🧪", "Discrete + agent-based simulation."),
    ("montecarlo",     "Monte Carlo AI",       "Platform",     "🎲", "Stochastic simulation."),
    ("scenario",       "Scenario Planning AI", "Platform",     "🗺", "Scenario tree + impact modelling."),
    ("reliability",    "Reliability AI",       "Platform",     "🧱", "SRE + chaos + drift control."),
    ("selfhealing",    "Self-Healing AI",      "Platform",     "🩹", "Autonomous remediation."),
    ("recovery",       "Recovery AI",          "Platform",     "♻️", "Backup + DR orchestration."),
    ("capacityplanning","Capacity Planning AI","Platform",     "📦", "Capacity forecasting + sizing."),
    ("observability",  "Observability AI",     "Platform",     "🔭", "Trace + log + metric correlation."),
    ("threatdetection","Threat Detection AI",  "Platform",     "🛡", "Cyber threat scoring."),
    ("identity",       "Identity AI",          "Platform",     "🆔", "Identity verification + risk."),
    ("accesscontrol",  "Access Control AI",    "Platform",     "🔑", "Adaptive RBAC + ABAC."),
    ("zerotrust",      "Zero Trust AI",        "Platform",     "🚧", "Zero-trust posture continuous eval."),
    ("dataquality",    "Data Quality AI",      "Platform",     "💎", "DQ monitoring + scoring."),
    ("datagovernance", "Data Governance AI",   "Platform",     "🏛", "Data governance + classification."),
    ("datastewardship","Data Stewardship AI",  "Platform",     "🧑‍🌾", "Stewardship workflow."),
    ("metadata",       "Metadata AI",          "Platform",     "🏷", "Metadata enrichment."),
    ("lineage",        "Lineage AI",           "Platform",     "🌳", "Data lineage tracking."),
    ("masterdata",     "Master Data AI",       "Platform",     "🗝", "MDM + golden record."),
    ("duplicate",      "Duplicate Detection AI","Platform",    "👯", "Entity-resolution + dedup."),
    ("datareconciliation","Data Reconciliation AI","Platform", "🪞", "Cross-source reconciliation."),
    ("analytical",     "Analytical AI",        "Platform",     "🧮", "Descriptive + diagnostic analytics."),
    # Insurance-specific extras the operator named
    ("market_intel",   "Market Intelligence AI","Domain",      "🛰", "Market intel + share-of-voice."),
    ("competitor_intel","Competitor Intelligence AI","Domain", "🎯", "Competitor watch + signals."),
    ("redundancy",     "Redundancy AI",         "Operations", "♻", "Eliminate duplicate work + idle compute."),
    ("transactional",  "Transactional AI",      "Operations", "💱", "Transaction enrichment + scoring."),
]


# =============================================================================
# 2. STAKEHOLDER REGISTRY (per global §82.5)
# =============================================================================

# (role-id, display-name, side, icon, default-responsibility)
STAKEHOLDERS: list[tuple[str, str, str, str, str]] = [
    # Internal (B2E)
    ("product-manager",      "Product Manager",       "B2E", "🧪", "Owns product P&L + roadmap."),
    ("actuary",              "Actuary",               "B2E", "📐", "Pricing + reserving + experience analysis."),
    ("underwriter",          "Underwriter",           "B2E", "🧮", "Risk acceptance + tier assignment."),
    ("claims-adjuster",      "Claims Adjuster",       "B2E", "🧾", "Claim triage + investigation + settlement."),
    ("siu-investigator",     "SIU Investigator",      "B2E", "🕵", "Fraud investigation + interviewing."),
    ("csr",                  "Customer Service Rep",  "B2E", "📞", "Customer inquiries + service."),
    ("compliance-officer",   "Compliance Officer",    "B2E", "✅", "Reg filings + audit response."),
    ("legal-counsel",        "Legal Counsel",         "B2E", "⚖️", "Legal advice + contract review."),
    ("finance-controller",   "Finance Controller",    "B2E", "💰", "Financial close + reporting."),
    ("risk-officer",         "Risk Officer",          "B2E", "🛡", "Enterprise risk + capital."),
    ("hr-business-partner",  "HR Business Partner",   "B2E", "🧑‍💼", "Workforce planning + employee experience."),
    ("procurement-officer",  "Procurement Officer",   "B2E", "🛒", "Sourcing + supplier mgmt."),
    ("data-steward",         "Data Steward",          "B2E", "🧑‍🌾", "Data quality + governance."),
    ("data-scientist",       "Data Scientist",        "B2E", "🧪", "Modelling + experimentation."),
    ("ml-engineer",          "ML Engineer",           "B2E", "🔁", "Productionising models."),
    ("sre",                  "Site Reliability Eng",  "B2E", "🛠", "Reliability + on-call."),
    ("ciso-team",            "CISO Team",             "B2E", "🔒", "Cybersecurity controls + response."),
    ("ai-governance",        "AI Governance Lead",    "B2E", "🏛", "AI policy + risk approvals."),
    ("marketing-manager",    "Marketing Manager",     "B2E", "📣", "Campaign + brand."),
    ("sales-manager",        "Sales Manager",         "B2E", "💼", "Sales pipeline + targets."),
    ("billing-clerk",        "Billing Clerk",         "B2E", "🧮", "Premium billing operations."),
    ("collections-analyst",  "Collections Analyst",   "B2E", "📥", "Receivables + dunning."),
    # B2B counterparties
    ("broker",               "Broker / Agent",        "B2B", "🤝", "Distributes products + serves clients."),
    ("reinsurer",            "Reinsurer",             "B2B", "🌐", "Provides treaty / facultative capacity."),
    ("vendor",               "Vendor",                "B2B", "🏢", "Third-party service / data provider."),
    ("regulator",            "Regulator",             "B2B", "🏛", "DOI / NAIC / EU AI Act authority."),
    ("auditor",              "External Auditor",      "B2B", "🗂", "Independent audit."),
    ("rating-agency",        "Rating Agency",         "B2B", "🏅", "Financial strength rating."),
    ("partner",              "Strategic Partner",     "B2B", "🤝", "Channel / data partner."),
    ("law-firm",             "External Law Firm",     "B2B", "⚖️", "Outside counsel."),
    # B2C
    ("policyholder",         "Policyholder",          "B2C", "🧑", "Holds an insurance policy."),
    ("prospect",             "Prospect",              "B2C", "🎯", "Considering a quote."),
    ("claimant",              "Claimant",              "B2C", "🧾", "Files / receives a claim."),
    ("beneficiary",          "Beneficiary",           "B2C", "💝", "Named on a life / annuity policy."),
]


# =============================================================================
# 3. PER-PROCESS DATA-COLUMN BLUEPRINTS (used to seed sample data)
# =============================================================================

# Common synthetic data — kept tiny + deterministic. Per-process blueprint may
# override via DEPTS[*].processes[*].columns. Default for any process without
# an explicit blueprint:
DEFAULT_COLUMNS = ("id", "name", "status", "owner", "channel", "score", "updated_at")


def synth_rows(process_id: str, columns: Sequence[str], n: int = 10) -> list[list[object]]:
    """Deterministic per-process sample rows. Hash-seeded for stability."""
    seed = int(hashlib.sha256(process_id.encode()).hexdigest()[:8], 16)
    rows: list[list[object]] = []
    statuses = ["open", "in-progress", "review", "closed"]
    owners = ["alice", "bob", "carol", "dave", "erin"]
    channels = ["B2B", "B2C", "B2E"]
    for i in range(n):
        r = (seed + i * 31) % 9973
        row = []
        for col in columns:
            if col == "id":
                row.append(f"{process_id[:4].upper()}-{1000+i}")
            elif col == "name":
                row.append(f"{process_id.title().replace('-', ' ')} #{i+1}")
            elif col == "status":
                row.append(statuses[r % len(statuses)])
            elif col == "owner":
                row.append(owners[(r >> 3) % len(owners)])
            elif col == "channel":
                row.append(channels[(r >> 5) % len(channels)])
            elif col == "score":
                row.append(round(50 + (r % 50) + ((r >> 7) % 100) / 100, 2))
            elif col.endswith("_at") or col == "date":
                row.append(f"2026-{((r % 12) + 1):02d}-{((r % 28) + 1):02d}")
            elif col == "amount":
                row.append(round((r % 50000) / 100, 2))
            else:
                row.append(f"val_{r % 1000}")
        rows.append(row)
    return rows


# =============================================================================
# 4. DEPARTMENTS  — 22 entries with operator-supplied AI capability maps
# =============================================================================

# Convenience aliases for the proc() helper.
B2B, B2C, B2E = "B2B", "B2C", "B2E"

# Default format set per process. Override via proc(formats=...).
ALL_FORMATS = ("csv", "json", "xml", "txt", "docx", "pdf", "png", "wav", "mp4")
LIGHT_FORMATS = ("csv", "json", "txt", "pdf")
DOC_HEAVY = ("csv", "json", "txt", "docx", "pdf")
MEDIA_HEAVY = ("csv", "json", "txt", "pdf", "png", "wav", "mp4")


@dataclass
class SubProcess:
    id: str
    name: str
    description: str
    channels: tuple[str, ...]
    stakeholders: tuple[str, ...]
    aiCapabilities: tuple[str, ...]


@dataclass
class Process:
    id: str
    name: str
    description: str
    channels: tuple[str, ...]
    stakeholders: tuple[str, ...]
    aiCapabilities: tuple[str, ...]
    formats: tuple[str, ...] = LIGHT_FORMATS
    columns: tuple[str, ...] = DEFAULT_COLUMNS
    subProcesses: tuple[SubProcess, ...] = field(default_factory=tuple)


@dataclass
class Department:
    id: str
    name: str
    icon: str
    color: str
    priority: int
    description: str
    roi: str
    aiCapabilities: tuple[str, ...]
    processes: tuple[Process, ...]


def sub(id_, name, desc, channels, stakeholders, ai):
    return SubProcess(id_, name, desc, tuple(channels), tuple(stakeholders), tuple(ai))


def proc(id_, name, desc, channels, stakeholders, ai, subs=(), formats=LIGHT_FORMATS, columns=DEFAULT_COLUMNS):
    return Process(
        id_, name, desc, tuple(channels), tuple(stakeholders), tuple(ai),
        formats=tuple(formats), columns=tuple(columns), subProcesses=tuple(subs),
    )


DEPTS: list[Department] = [
    Department(
        id="product",
        name="Product Management",
        icon="🧪",
        color="#1e40af",
        priority=1,
        description="Product design, filing, pricing strategy, performance review.",
        roi="15–20% time-to-market",
        aiCapabilities=("product", "pricing", "recommendation", "predictive", "risk", "customerintel",
                        "personalization", "decision", "explainable", "fairness", "compliance", "governance",
                        "simulation", "scenario", "benchmark", "market_intel", "competitor_intel"),
        processes=(
            proc("product-design", "Product Design & Filing",
                 "Concept → spec → state DOI filing for new insurance products.",
                 [B2E, B2B], ["product-manager", "actuary", "compliance-officer", "regulator"],
                 ["product", "simulation", "scenario", "compliance", "governance", "fairness"],
                 subs=(
                    sub("concept-ideation", "Concept ideation",
                        "Market gap analysis + concept brief.", [B2E],
                        ["product-manager", "actuary"],
                        ["market_intel", "competitor_intel", "scenario"]),
                    sub("doi-filing", "State DOI filing",
                        "SERFF / state submission + tracking.", [B2E, B2B],
                        ["compliance-officer", "regulator"],
                        ["compliance", "documentation", "validation"]),
                 ),
                 formats=DOC_HEAVY,
                 columns=("filing_id", "product_name", "state", "status", "owner", "filed_at")),
            proc("pricing-strategy", "Pricing Strategy",
                 "Per-segment pricing curves with explainable factor weights.",
                 [B2E], ["actuary", "data-scientist", "compliance-officer"],
                 ["pricing", "predictive", "explainable", "fairness", "simulation"],
                 subs=(
                    sub("factor-analysis", "Factor analysis",
                        "GLM + SHAP feature importance review.", [B2E],
                        ["actuary", "data-scientist"],
                        ["explainable", "predictive", "fairness"]),
                    sub("price-monitor", "Price monitoring",
                        "Real-time loss-ratio + competitor gap dashboard.", [B2E],
                        ["product-manager", "actuary"],
                        ["monitoring", "benchmark", "competitor_intel"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("segment", "base_premium", "elasticity", "loss_ratio", "competitor_index", "updated_at")),
            proc("product-launch", "Product Launch & Enablement",
                 "Broker enablement, customer materials, KPIs go-live.",
                 [B2E, B2B, B2C], ["product-manager", "marketing-manager", "broker", "policyholder"],
                 ["campaign", "content", "generative", "personalization", "notification"],
                 subs=(
                    sub("broker-kit", "Broker kit assembly",
                        "Brochures + FAQs + training video.", [B2E, B2B],
                        ["product-manager", "broker"],
                        ["content", "generative", "documentation"]),
                    sub("kpi-readiness", "KPI dashboard readiness",
                        "Pre-launch metric + tracking sanity.", [B2E],
                        ["product-manager", "data-scientist"],
                        ["reporting", "monitoring", "validation"]),
                 ),
                 formats=MEDIA_HEAVY,
                 columns=("asset_id", "asset_type", "language", "audience", "version", "published_at")),
        ),
    ),
    Department(
        id="marketing",
        name="Marketing",
        icon="📣",
        color="#f97316",
        priority=2,
        description="Customer 360, segmentation, campaigns, content, social, reporting.",
        roi="20–30% campaign ROI uplift",
        aiCapabilities=("marketing", "customer360", "segmentation", "personalization", "campaign",
                        "recommendation", "nextbestaction", "churn", "retention", "crosssell", "upsell",
                        "sentiment", "predictive", "generative", "content", "socialmedia", "reporting"),
        processes=(
            proc("campaign-planning", "Campaign Planning",
                 "Audience segmentation + creative + channel mix optimisation.",
                 [B2E, B2C], ["marketing-manager", "data-scientist", "prospect"],
                 ["campaign", "segmentation", "predictive", "generative", "content"],
                 subs=(
                    sub("segment-build", "Segment build",
                        "Behavioural + demographic segmentation.", [B2E],
                        ["data-scientist", "marketing-manager"],
                        ["segmentation", "customer360", "predictive"]),
                    sub("creative-test", "Creative A/B test",
                        "GenAI variant + lift testing.", [B2E, B2C],
                        ["marketing-manager"],
                        ["generative", "content", "evaluation"]),
                 ),
                 formats=DOC_HEAVY,
                 columns=("campaign_id", "segment", "channel", "spend", "ctr", "conversion")),
            proc("churn-and-retention", "Churn & Retention",
                 "Predict at-risk policyholders + retention treatments.",
                 [B2E, B2C], ["marketing-manager", "data-scientist", "policyholder"],
                 ["churn", "retention", "nextbestaction", "personalization", "predictive"],
                 subs=(
                    sub("churn-model", "Churn model",
                        "GBM model + monthly drift check.", [B2E],
                        ["data-scientist"],
                        ["predictive", "monitoring", "explainable"]),
                    sub("save-offer", "Save-offer engine",
                        "NBA-based retention offers + audit.", [B2E, B2C],
                        ["marketing-manager"],
                        ["nextbestaction", "personalization", "audit"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("policy_id", "tenure_months", "churn_score", "offer_id", "outcome", "updated_at")),
            proc("social-listening", "Social Listening",
                 "Brand mentions + sentiment + competitor signals.",
                 [B2E], ["marketing-manager", "data-scientist"],
                 ["socialmedia", "sentiment", "nlp", "competitor_intel", "reporting"],
                 formats=MEDIA_HEAVY,
                 columns=("post_id", "platform", "author", "sentiment", "reach", "captured_at")),
        ),
    ),
    Department(
        id="sales",
        name="Sales & Distribution",
        icon="💼",
        color="#10b981",
        priority=3,
        description="Quote-to-bind, broker enablement, conversational + voice + agentic.",
        roi="20–30% lead conversion uplift",
        aiCapabilities=("sales", "conversational", "voice", "recommendation", "quote", "proposal",
                        "customerintel", "predictive", "agentic", "search", "knowledge", "rag",
                        "notification", "communication", "crm", "meeting", "performance"),
        processes=(
            proc("lead-qualification", "Lead Qualification",
                 "Score inbound leads + route to best agent / channel.",
                 [B2E, B2B, B2C], ["sales-manager", "broker", "prospect"],
                 ["sales", "predictive", "recommendation", "nextbestaction", "crm"],
                 subs=(
                    sub("score-lead", "Score lead",
                        "Propensity + risk + lifetime value.", [B2E],
                        ["sales-manager", "data-scientist"],
                        ["predictive", "scoring" if False else "risk", "customer360"]),
                    sub("route-lead", "Route lead",
                        "NBA + broker assignment + SLA.", [B2E, B2B],
                        ["sales-manager", "broker"],
                        ["nextbestaction", "recommendation", "crm", "notification"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("lead_id", "channel", "score", "owner", "stage", "updated_at")),
            proc("quote-and-bind", "Quote & Bind",
                 "Multi-line quote → underwriting → bind.",
                 [B2C, B2B, B2E], ["prospect", "broker", "underwriter"],
                 ["quote", "underwriting", "decision", "explainable", "conversational"],
                 subs=(
                    sub("quote-gen", "Quote generation",
                        "Generative + factor-aware quote.", [B2C, B2B],
                        ["prospect", "broker"],
                        ["quote", "generative", "personalization"]),
                    sub("bind", "Bind",
                        "Policy issue + payment + welcome pack.", [B2C, B2B],
                        ["policyholder", "broker"],
                        ["workflow", "notification", "documentation"]),
                 ),
                 formats=DOC_HEAVY,
                 columns=("quote_id", "product", "annual_premium", "stage", "broker", "expires_at")),
            proc("broker-enablement", "Broker Enablement",
                 "Broker portal, training, performance scorecards.",
                 [B2B, B2E], ["broker", "sales-manager"],
                 ["knowledge", "rag", "training", "performance", "search", "reporting"],
                 formats=DOC_HEAVY,
                 columns=("broker_id", "agency", "premium_ytd", "loss_ratio", "tier", "updated_at")),
        ),
    ),
    Department(
        id="underwriting",
        name="Underwriting",
        icon="📋",
        color="#1e3a8a",
        priority=4,
        description="Application triage, risk assessment, pricing, renewal underwriting.",
        roi="15–25% loss ratio improvement",
        aiCapabilities=("underwriting", "risk", "predictive", "pricing", "decision", "explainable",
                        "verification", "validation", "compliance", "fairness", "trust", "search",
                        "rag", "document", "ocr", "knowledgegraph", "agentic", "governance"),
        processes=(
            proc("application-triage", "Application Triage",
                 "Classify + route applications + missing-info chase.",
                 [B2E, B2B, B2C], ["underwriter", "broker", "prospect"],
                 ["underwriting", "document", "ocr", "validation", "verification", "agentic"],
                 subs=(
                    sub("doc-ingest", "Document ingest",
                        "OCR + entity extraction from broker submissions.", [B2E, B2B],
                        ["underwriter", "broker"],
                        ["ocr", "document", "verification"]),
                    sub("missing-info-chase", "Missing-info chase",
                        "Conversational agent fills gaps.", [B2E, B2B, B2C],
                        ["underwriter", "prospect"],
                        ["conversational", "agentic", "communication"]),
                 ),
                 formats=DOC_HEAVY,
                 columns=("application_id", "product", "state", "completeness", "owner", "received_at")),
            proc("risk-assessment", "Risk Assessment",
                 "Risk score + tier + explainability + fairness check.",
                 [B2E], ["underwriter", "data-scientist", "ai-governance"],
                 ["risk", "predictive", "explainable", "fairness", "trust", "knowledgegraph"],
                 subs=(
                    sub("score-risk", "Score risk",
                        "Ensemble risk score with SHAP.", [B2E],
                        ["data-scientist", "underwriter"],
                        ["predictive", "explainable", "risk"]),
                    sub("fairness-gate", "Fairness gate",
                        "Disparate impact + equal opportunity check.", [B2E],
                        ["ai-governance", "compliance-officer"],
                        ["fairness", "governance", "audit"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("application_id", "risk_score", "tier", "factor_top", "fairness_flag", "decided_at")),
            proc("renewal-underwriting", "Renewal Underwriting",
                 "Loss-ratio aware re-tiering + retention offers.",
                 [B2E, B2C], ["underwriter", "policyholder"],
                 ["underwriting", "predictive", "retention", "decision", "explainable"],
                 formats=LIGHT_FORMATS,
                 columns=("policy_id", "prior_premium", "new_premium", "loss_ratio", "action", "effective_at")),
        ),
    ),
    Department(
        id="policy-admin",
        name="Policy Administration",
        icon="📑",
        color="#7c3aed",
        priority=5,
        description="Policy lifecycle — issue, endorsements, renewals, cancellations.",
        roi="20% admin cost reduction",
        aiCapabilities=("process", "workflow", "document", "ocr", "search", "rag", "verification",
                        "validation", "notification", "communication", "agentic", "reporting",
                        "governance", "monitoring"),
        processes=(
            proc("policy-issuance", "Policy Issuance",
                 "Generate policy docs + welcome pack + first-bill.",
                 [B2E, B2C, B2B], ["policyholder", "broker", "billing-clerk"],
                 ["workflow", "documentation", "communication", "notification"],
                 formats=DOC_HEAVY,
                 columns=("policy_id", "product", "effective_at", "premium", "broker", "status")),
            proc("endorsement", "Endorsement",
                 "Mid-term changes + recalc + audit.",
                 [B2E, B2C, B2B], ["csr", "policyholder", "broker"],
                 ["process", "validation", "verification", "audit"],
                 subs=(
                    sub("endorse-validate", "Validate change",
                        "Rule + business validation.", [B2E],
                        ["csr"],
                        ["validation", "verification"]),
                    sub("endorse-doc", "Issue endorsement doc",
                        "Doc gen + delivery.", [B2E, B2C],
                        ["csr", "policyholder"],
                        ["documentation", "communication"]),
                 ),
                 formats=DOC_HEAVY,
                 columns=("endorsement_id", "policy_id", "change_type", "premium_delta", "status", "issued_at")),
            proc("renewal-processing", "Renewal Processing",
                 "Auto-renewal + non-renewal + customer comms.",
                 [B2E, B2C], ["csr", "policyholder"],
                 ["workflow", "communication", "monitoring", "reporting"],
                 formats=LIGHT_FORMATS,
                 columns=("policy_id", "renewal_type", "next_premium", "owner", "status", "renewed_at")),
        ),
    ),
    Department(
        id="billing",
        name="Billing & Collections",
        icon="💳",
        color="#10b981",
        priority=6,
        description="Premium billing, payment, collections, reconciliation.",
        roi="5–10% collection rate gain",
        aiCapabilities=("billing", "payment", "collection", "fraud", "predictive", "validation",
                        "verification", "notification", "reporting", "reconciliation", "process",
                        "automation", "governance", "compliance"),
        processes=(
            proc("invoicing", "Invoicing",
                 "Generate + deliver premium invoices.",
                 [B2E, B2C, B2B], ["billing-clerk", "policyholder", "broker"],
                 ["billing", "automation", "documentation", "communication"],
                 formats=LIGHT_FORMATS,
                 columns=("invoice_id", "policy_id", "amount", "due_at", "channel", "status")),
            proc("payment-processing", "Payment Processing",
                 "Card + ACH + check intake + fraud screen.",
                 [B2C, B2B, B2E], ["policyholder", "billing-clerk"],
                 ["payment", "fraud", "validation", "verification", "reconciliation"],
                 subs=(
                    sub("auth-and-capture", "Auth & capture",
                        "Tokenised payment + risk score.", [B2C, B2B],
                        ["policyholder"],
                        ["payment", "fraud", "secure"]),
                    sub("recon-daily", "Daily reconciliation",
                        "Card processor ↔ ledger match.", [B2E],
                        ["finance-controller"],
                        ["reconciliation", "audit"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("payment_id", "policy_id", "amount", "method", "fraud_score", "captured_at")),
            proc("collections", "Collections",
                 "Dunning strategy + write-off + agency referral.",
                 [B2E, B2C], ["collections-analyst", "policyholder"],
                 ["collection", "predictive", "nextbestaction", "communication"],
                 formats=LIGHT_FORMATS,
                 columns=("account_id", "days_late", "balance", "strategy", "outcome", "updated_at")),
        ),
    ),
    Department(
        id="claims",
        name="Claims",
        icon="🧾",
        color="#dc2626",
        priority=7,
        description="FNOL → investigation → settlement → recovery, multi-modal AI-heavy.",
        roi="20–30% cycle time reduction",
        aiCapabilities=("claims", "fnol", "fraud", "investigation", "vision", "video", "ocr",
                        "document", "multimodal", "predictive", "decision", "explainable",
                        "verification", "validation", "agentic", "search", "rag", "knowledge",
                        "reporting", "notification", "communication", "monitoring", "incident",
                        "governance"),
        processes=(
            proc("fnol-intake", "FNOL Intake",
                 "First notice of loss across voice / portal / broker / mobile.",
                 [B2C, B2B, B2E], ["claimant", "broker", "claims-adjuster"],
                 ["fnol", "conversational", "voice", "document", "rag", "multimodal"],
                 subs=(
                    sub("fnol-voice", "Voice-channel FNOL",
                        "Voice agent intake with transcript + summary.", [B2C],
                        ["claimant", "csr"],
                        ["voice", "conversational", "documentation"]),
                    sub("fnol-portal", "Portal FNOL",
                        "Self-service portal with photo / doc upload.", [B2C, B2B],
                        ["claimant", "broker"],
                        ["document", "vision", "validation"]),
                 ),
                 formats=MEDIA_HEAVY,
                 columns=("claim_id", "policy_id", "peril", "loss_date", "channel", "severity")),
            proc("claim-triage", "Claim Triage & Assignment",
                 "Severity + complexity → adjuster routing.",
                 [B2E], ["claims-adjuster"],
                 ["claims", "decision", "predictive", "explainable", "agentic"],
                 formats=LIGHT_FORMATS,
                 columns=("claim_id", "severity", "complexity", "adjuster", "sla_hours", "assigned_at")),
            proc("investigation", "Investigation",
                 "Damage assessment via vision + interviews + docs.",
                 [B2E, B2B, B2C], ["claims-adjuster", "vendor", "claimant"],
                 ["investigation", "vision", "video", "ocr", "multimodal", "fraud"],
                 subs=(
                    sub("damage-assessment", "Damage assessment",
                        "CV-based estimate from photos / video.", [B2E],
                        ["claims-adjuster"],
                        ["vision", "video", "multimodal"]),
                    sub("fraud-screen", "Fraud screen",
                        "Anomaly + network + behavioural signals.", [B2E],
                        ["claims-adjuster", "siu-investigator"],
                        ["fraud", "anomaly", "graph"]),
                 ),
                 formats=MEDIA_HEAVY,
                 columns=("claim_id", "evidence_type", "source", "ai_finding", "confidence", "captured_at")),
            proc("settlement", "Settlement",
                 "Payment + closing letter + recovery posture.",
                 [B2E, B2C, B2B], ["claims-adjuster", "claimant"],
                 ["decision", "payment", "documentation", "communication", "audit"],
                 formats=DOC_HEAVY,
                 columns=("claim_id", "settlement_amount", "method", "letter_sent", "closed_at", "owner")),
        ),
    ),
    Department(
        id="siu",
        name="Special Investigation Unit",
        icon="🕵",
        color="#ef4444",
        priority=8,
        description="Fraud detection, investigation, behavioural + network analytics.",
        roi="30–40% fraud loss reduction",
        aiCapabilities=("fraud", "anomaly", "investigation", "behavioral", "networkanalytics",
                        "graph", "verification", "validation", "risk", "predictive", "search",
                        "rag", "secure", "governance", "monitoring"),
        processes=(
            proc("fraud-detection", "Fraud Detection",
                 "Continuous scoring across claims + payments + identities.",
                 [B2E], ["siu-investigator", "data-scientist"],
                 ["fraud", "anomaly", "predictive", "behavioral", "graph"],
                 subs=(
                    sub("model-scoring", "Model scoring",
                        "Ensemble + GNN scoring.", [B2E],
                        ["data-scientist"],
                        ["predictive", "graph", "anomaly"]),
                    sub("alert-triage", "Alert triage",
                        "Investigator queue + prioritisation.", [B2E],
                        ["siu-investigator"],
                        ["decision", "nextbestaction"]),
                 ),
                 formats=LIGHT_FORMATS,
                 columns=("alert_id", "claim_id", "score", "ring_id", "status", "raised_at")),
            proc("investigation-workflow", "Investigation Workflow",
                 "Case management + interviews + evidence chain.",
                 [B2E, B2B], ["siu-investigator", "vendor"],
                 ["investigation", "documentation", "search", "rag", "secure"],
                 formats=DOC_HEAVY,
                 columns=("case_id", "investigator", "stage", "evidence_count", "sla_days", "updated_at")),
            proc("network-analytics", "Network Analytics",
                 "Ring detection + collusion + repeat-claimant graphs.",
                 [B2E], ["siu-investigator", "data-scientist"],
                 ["graph", "networkanalytics", "anomaly", "behavioral"],
                 formats=LIGHT_FORMATS,
                 columns=("ring_id", "members", "edges", "score", "first_seen", "last_seen")),
        ),
    ),
    Department(
        id="customer-service",
        name="Customer Service",
        icon="📞",
        color="#0ea5e9",
        priority=9,
        description="Voice + chat + agent assist + sentiment + quality monitoring.",
        roi="25–35% AHT reduction",
        aiCapabilities=("conversational", "voice", "rag", "knowledge", "agentic", "generative",
                        "sentiment", "translation", "communication", "notification", "documentation",
                        "reporting", "quality", "monitoring", "search"),
        processes=(
            proc("inquiry-handling", "Inquiry Handling",
                 "Voice + chat + email intent + resolution.",
                 [B2C, B2E], ["policyholder", "csr"],
                 ["conversational", "voice", "rag", "knowledge", "sentiment", "agentic"],
                 subs=(
                    sub("voice-intent", "Voice intent + routing",
                        "ASR + intent + agent / bot routing.", [B2C, B2E],
                        ["policyholder", "csr"],
                        ["voice", "conversational", "nextbestaction"]),
                    sub("agent-assist", "Agent assist",
                        "Real-time RAG suggestions + summary.", [B2E],
                        ["csr"],
                        ["rag", "knowledge", "documentation"]),
                 ),
                 formats=MEDIA_HEAVY,
                 columns=("interaction_id", "channel", "intent", "sentiment", "csat", "captured_at")),
            proc("complaint-resolution", "Complaint Resolution",
                 "Complaint triage + escalation + root cause + close-loop.",
                 [B2C, B2E, B2B], ["policyholder", "csr", "compliance-officer"],
                 ["sentiment", "decision", "documentation", "compliance", "monitoring"],
                 formats=DOC_HEAVY,
                 columns=("complaint_id", "policy_id", "topic", "sentiment", "stage", "closed_at")),
            proc("quality-monitoring", "Quality Monitoring",
                 "Auto-score interactions + coaching nudges.",
                 [B2E], ["csr", "sales-manager"],
                 ["quality", "evaluation", "sentiment", "coaching"],
                 formats=LIGHT_FORMATS,
                 columns=("interaction_id", "csr", "quality_score", "issues", "coach_nudge", "scored_at")),
        ),
    ),
    Department(
        id="actuarial",
        name="Actuarial",
        icon="📐",
        color="#f59e0b",
        priority=10,
        description="Pricing, reserving, forecasting, scenario + simulation.",
        roi="5–8% combined ratio gain",
        aiCapabilities=("actuarial", "pricing", "reserving", "forecasting", "predictive",
                        "simulation", "montecarlo", "scenario", "risk", "explainable",
                        "benchmark", "validation", "verification", "governance"),
        processes=(
            proc("loss-reserving", "Loss Reserving",
                 "Chain ladder + ML + IBNR + roll-forward.",
                 [B2E], ["actuary", "finance-controller"],
                 ["reserving", "predictive", "explainable", "validation"],
                 formats=LIGHT_FORMATS,
                 columns=("triangle_id", "method", "ibnr", "case_reserve", "ultimate", "as_of")),
            proc("experience-study", "Experience Study",
                 "Mortality / morbidity / lapse studies + benchmark.",
                 [B2E], ["actuary", "data-scientist"],
                 ["forecasting", "predictive", "benchmark", "validation"],
                 formats=DOC_HEAVY,
                 columns=("study_id", "cohort", "actual", "expected", "ae_ratio", "as_of")),
            proc("cat-modeling", "Catastrophe Modelling",
                 "Hurricane / earthquake / wildfire scenarios.",
                 [B2E, B2B], ["actuary", "reinsurer"],
                 ["catastrophe", "simulation", "montecarlo", "scenario", "climaterisk"],
                 formats=LIGHT_FORMATS,
                 columns=("scenario_id", "peril", "region", "PML", "EP_curve", "as_of")),
        ),
    ),
    Department(
        id="reinsurance",
        name="Reinsurance",
        icon="🌐",
        color="#8b5cf6",
        priority=11,
        description="Treaty + facultative placement, exposure, cession accounting.",
        roi="Capital efficiency uplift",
        aiCapabilities=("reinsurance", "exposure", "catastrophe", "risk", "simulation", "scenario",
                        "forecasting", "reporting", "contractai", "document", "search", "rag",
                        "governance"),
        processes=(
            proc("treaty-placement", "Treaty Placement",
                 "Annual treaty renewal + broker negotiation.",
                 [B2B, B2E], ["reinsurer", "broker", "risk-officer"],
                 ["reinsurance", "contractai", "document", "scenario", "explainable"],
                 formats=DOC_HEAVY,
                 columns=("treaty_id", "type", "layer", "limit", "rate_on_line", "effective_at")),
            proc("facultative-placement", "Facultative Placement",
                 "Per-risk reinsurance for large or unusual risks.",
                 [B2B, B2E], ["reinsurer", "underwriter"],
                 ["reinsurance", "risk", "explainable", "documentation"],
                 formats=LIGHT_FORMATS,
                 columns=("fac_id", "risk_ref", "sum_insured", "ceded_pct", "broker", "bound_at")),
            proc("cession-accounting", "Cession Accounting",
                 "Bordereau + cash settlement + commutation.",
                 [B2E, B2B], ["finance-controller", "reinsurer"],
                 ["reconciliation", "validation", "reporting", "audit"],
                 formats=LIGHT_FORMATS,
                 columns=("period", "treaty_id", "ceded_premium", "ceded_loss", "comm", "balance")),
        ),
    ),
    Department(
        id="compliance",
        name="Compliance",
        icon="🏛",
        color="#78716c",
        priority=12,
        description="Regulatory tracking, filings, audit response, responsible AI.",
        roi="Risk + penalty avoidance",
        aiCapabilities=("compliance", "regulatory", "audit", "governance", "responsible", "ethical",
                        "fairness", "explainable", "verification", "validation", "policy",
                        "documentation", "reporting", "monitoring", "trust"),
        processes=(
            proc("regulatory-tracking", "Regulatory Tracking",
                 "Horizon scan + impact assessment.",
                 [B2E, B2B], ["compliance-officer", "regulator"],
                 ["regulatory", "search", "rag", "documentation", "monitoring"],
                 formats=DOC_HEAVY,
                 columns=("reg_id", "jurisdiction", "topic", "impact", "status", "due_at")),
            proc("filing-management", "Filing Management",
                 "State DOI + NAIC + EU filings + tracking.",
                 [B2E, B2B], ["compliance-officer", "regulator"],
                 ["compliance", "validation", "documentation", "audit"],
                 formats=DOC_HEAVY,
                 columns=("filing_id", "jurisdiction", "type", "status", "owner", "filed_at")),
            proc("audit-response", "Audit Response",
                 "Internal + external audit findings + remediation.",
                 [B2E, B2B], ["compliance-officer", "auditor"],
                 ["audit", "documentation", "explainable", "trust"],
                 formats=DOC_HEAVY,
                 columns=("audit_id", "finding", "severity", "owner", "status", "due_at")),
        ),
    ),
    Department(
        id="legal",
        name="Legal",
        icon="⚖️",
        color="#475569",
        priority=13,
        description="Contracts, litigation, regulatory liaison, document AI.",
        roi="Reduced legal cycle time",
        aiCapabilities=("legal", "contractai", "document", "search", "rag", "knowledge",
                        "compliance", "litigation", "investigation", "reporting", "governance"),
        processes=(
            proc("contract-drafting", "Contract Drafting & Review",
                 "Clause library + redline + risk flags.",
                 [B2E, B2B], ["legal-counsel", "vendor"],
                 ["contractai", "document", "search", "rag", "compliance"],
                 formats=DOC_HEAVY,
                 columns=("contract_id", "counterparty", "value", "stage", "owner", "expires_at")),
            proc("litigation-management", "Litigation Management",
                 "Matter management + e-discovery + outcome prediction.",
                 [B2E, B2B], ["legal-counsel", "law-firm"],
                 ["litigation", "document", "predictive", "search"],
                 formats=DOC_HEAVY,
                 columns=("matter_id", "court", "stage", "exposure", "next_event", "updated_at")),
            proc("regulatory-liaison", "Regulatory Liaison",
                 "Outbound regulator engagement + records.",
                 [B2E, B2B], ["legal-counsel", "regulator"],
                 ["regulatory", "documentation", "communication"],
                 formats=DOC_HEAVY,
                 columns=("engagement_id", "regulator", "topic", "owner", "status", "due_at")),
        ),
    ),
    Department(
        id="finance",
        name="Finance",
        icon="💰",
        color="#16a34a",
        priority=14,
        description="Premium accounting, loss reserves, financial reporting, FinOps.",
        roi="Close-cycle + cost-avoidance gains",
        aiCapabilities=("financial", "reporting", "forecasting", "predictive", "reconciliation",
                        "validation", "verification", "cost", "finops", "governance", "audit",
                        "monitoring"),
        processes=(
            proc("financial-close", "Financial Close",
                 "Sub-ledger close + journal automation.",
                 [B2E], ["finance-controller"],
                 ["reconciliation", "validation", "automation", "audit"],
                 formats=LIGHT_FORMATS,
                 columns=("period", "entity", "stage", "open_items", "owner", "closed_at")),
            proc("forecasting", "Forecasting & FP&A",
                 "Premium + loss + expense forecast.",
                 [B2E], ["finance-controller", "actuary"],
                 ["forecasting", "predictive", "scenario", "explainable"],
                 formats=LIGHT_FORMATS,
                 columns=("scenario", "line", "metric", "value", "as_of", "owner")),
            proc("finops-monitoring", "FinOps Monitoring",
                 "Cloud + AI cost tracking + alerts.",
                 [B2E], ["finance-controller", "sre"],
                 ["finops", "cost", "monitoring", "reporting"],
                 formats=LIGHT_FORMATS,
                 columns=("date", "service", "cost", "anomaly_flag", "owner", "captured_at")),
        ),
    ),
    Department(
        id="erm",
        name="Enterprise Risk Management",
        icon="🛡",
        color="#dc2626",
        priority=15,
        description="Enterprise risks: operational, credit, market, cat, climate, ESG.",
        roi="Capital + risk integration",
        aiCapabilities=("enterpriserisk", "opsrisk", "creditrisk", "marketrisk", "catastrophe",
                        "climaterisk", "esg", "scenario", "simulation", "predictive", "monitoring",
                        "governance"),
        processes=(
            proc("risk-register", "Risk Register",
                 "Top risks + control owners + heatmap.",
                 [B2E], ["risk-officer", "compliance-officer"],
                 ["enterpriserisk", "monitoring", "reporting", "governance"],
                 formats=DOC_HEAVY,
                 columns=("risk_id", "category", "likelihood", "impact", "owner", "review_at")),
            proc("stress-testing", "Stress Testing",
                 "ICAAP / ORSA / climate stress scenarios.",
                 [B2E, B2B], ["risk-officer", "actuary"],
                 ["scenario", "simulation", "montecarlo", "climaterisk", "esg"],
                 formats=LIGHT_FORMATS,
                 columns=("scenario", "metric", "baseline", "stressed", "headroom", "as_of")),
            proc("emerging-risk", "Emerging Risk Scan",
                 "Horizon scan + signals + Bayesian update.",
                 [B2E], ["risk-officer"],
                 ["search", "rag", "predictive", "scenario"],
                 formats=DOC_HEAVY,
                 columns=("signal_id", "topic", "source", "confidence", "impact", "captured_at")),
        ),
    ),
    Department(
        id="hr",
        name="Human Resources",
        icon="🧑‍💼",
        color="#a855f7",
        priority=16,
        description="Talent, learning, workforce, coaching, meeting AI.",
        roi="Engagement + productivity gains",
        aiCapabilities=("talent", "workforce", "learning", "training", "coaching", "recruitment",
                        "knowledge", "conversational", "meeting", "documentation", "notification",
                        "performance"),
        processes=(
            proc("recruitment", "Recruitment",
                 "Screening + scoring + scheduling.",
                 [B2E, B2C, B2B], ["hr-business-partner", "prospect", "vendor"],
                 ["recruitment", "talent", "conversational", "fairness", "explainable"],
                 formats=DOC_HEAVY,
                 columns=("req_id", "role", "candidate_id", "stage", "score", "updated_at")),
            proc("learning-paths", "Learning Paths",
                 "Skill-gap driven adaptive learning.",
                 [B2E], ["hr-business-partner", "csr"],
                 ["learning", "training", "coaching", "personalization"],
                 formats=DOC_HEAVY,
                 columns=("employee_id", "skill", "level", "gap", "next_course", "updated_at")),
            proc("workforce-planning", "Workforce Planning",
                 "Headcount + scheduling + attrition forecast.",
                 [B2E], ["hr-business-partner", "sales-manager"],
                 ["workforce", "forecasting", "predictive", "scenario"],
                 formats=LIGHT_FORMATS,
                 columns=("team", "headcount", "attrition_pred", "hire_plan", "owner", "as_of")),
        ),
    ),
    Department(
        id="procurement",
        name="Procurement & Vendor Mgmt",
        icon="🛒",
        color="#84cc16",
        priority=17,
        description="Sourcing, vendor performance, contract risk, compliance.",
        roi="7–12% spend savings",
        aiCapabilities=("vendor", "contractai", "procurement", "risk", "compliance", "performance",
                        "search", "rag", "governance", "monitoring"),
        processes=(
            proc("vendor-onboarding", "Vendor Onboarding",
                 "KYC + sanctions + risk + contract.",
                 [B2E, B2B], ["procurement-officer", "vendor"],
                 ["vendor", "risk", "compliance", "verification", "documentation"],
                 formats=DOC_HEAVY,
                 columns=("vendor_id", "name", "category", "risk", "owner", "onboarded_at")),
            proc("contract-mgmt", "Contract Management",
                 "Renewal alerts + obligation tracking.",
                 [B2E, B2B], ["procurement-officer", "vendor"],
                 ["contractai", "monitoring", "notification"],
                 formats=DOC_HEAVY,
                 columns=("contract_id", "vendor", "value", "renewal_at", "owner", "status")),
            proc("vendor-performance", "Vendor Performance",
                 "SLA + quality + cost scorecards.",
                 [B2E, B2B], ["procurement-officer", "vendor"],
                 ["performance", "monitoring", "reporting", "benchmark"],
                 formats=LIGHT_FORMATS,
                 columns=("vendor", "period", "sla_pct", "quality", "cost", "score")),
        ),
    ),
    Department(
        id="data-analytics",
        name="Data & Analytics",
        icon="📊",
        color="#0891b2",
        priority=18,
        description="Data quality, governance, master data, reporting.",
        roi="Decision quality uplift",
        aiCapabilities=("dataquality", "datagovernance", "datastewardship", "metadata", "lineage",
                        "masterdata", "duplicate", "datareconciliation", "analytical", "reporting",
                        "monitoring"),
        processes=(
            proc("dq-monitoring", "Data Quality Monitoring",
                 "Per-domain DQ scoring + alerts.",
                 [B2E], ["data-steward", "data-scientist"],
                 ["dataquality", "monitoring", "anomaly", "notification"],
                 formats=LIGHT_FORMATS,
                 columns=("dataset", "rule", "pass_pct", "anomalies", "owner", "as_of")),
            proc("mdm", "Master Data Mgmt",
                 "Golden record + dedup + steward review.",
                 [B2E], ["data-steward"],
                 ["masterdata", "duplicate", "datareconciliation", "validation"],
                 formats=LIGHT_FORMATS,
                 columns=("entity_type", "golden_id", "sources", "confidence", "steward", "updated_at")),
            proc("self-serve-bi", "Self-Serve BI",
                 "Catalogued datasets + dashboards + narratives.",
                 [B2E], ["data-steward", "marketing-manager"],
                 ["analytical", "reporting", "knowledge", "search"],
                 formats=DOC_HEAVY,
                 columns=("dataset", "owner", "rows", "freshness_min", "queries", "as_of")),
        ),
    ),
    Department(
        id="ai-data-science",
        name="AI / Data Science",
        icon="🧠",
        color="#6366f1",
        priority=19,
        description="Predictive, generative, agentic, multi-agent, RL, MLOps.",
        roi="Cross-enterprise uplift",
        aiCapabilities=("predictive", "generative", "agentic", "multiagent", "rl", "evaluation",
                        "benchmark", "modelops", "mlops", "llmops", "agentops", "governance",
                        "monitoring", "trust"),
        processes=(
            proc("model-development", "Model Development",
                 "Experiment tracking + eval + reproducibility.",
                 [B2E], ["data-scientist", "ml-engineer"],
                 ["predictive", "evaluation", "explainable", "validation"],
                 formats=DOC_HEAVY,
                 columns=("experiment_id", "model", "metric", "value", "owner", "trained_at")),
            proc("model-deployment", "Model Deployment",
                 "Canary + shadow + rollback.",
                 [B2E], ["ml-engineer", "sre"],
                 ["mlops", "monitoring", "selfhealing", "reliability"],
                 formats=LIGHT_FORMATS,
                 columns=("model", "version", "stage", "traffic_pct", "latency_ms", "deployed_at")),
            proc("model-monitoring", "Model Monitoring",
                 "Drift + performance + fairness in production.",
                 [B2E], ["ml-engineer", "ai-governance"],
                 ["monitoring", "anomaly", "fairness", "trust", "evaluation"],
                 formats=LIGHT_FORMATS,
                 columns=("model", "metric", "value", "baseline", "drift", "as_of")),
        ),
    ),
    Department(
        id="it-ops",
        name="IT Operations",
        icon="🛠",
        color="#0ea5e9",
        priority=20,
        description="AIOps, incident, observability, performance, capacity, FinOps.",
        roi="MTTR + uptime gains",
        aiCapabilities=("aiops", "incident", "monitoring", "observability", "performance",
                        "capacityplanning", "reliability", "selfhealing", "recovery", "automation",
                        "agentic", "finops"),
        processes=(
            proc("incident-mgmt", "Incident Management",
                 "Detect → triage → resolve → post-mortem.",
                 [B2E], ["sre", "ciso-team"],
                 ["incident", "anomaly", "selfhealing", "agentic", "notification"],
                 formats=DOC_HEAVY,
                 columns=("inc_id", "severity", "service", "owner", "ttf", "ttr")),
            proc("capacity-planning", "Capacity Planning",
                 "Forecast + buffer + cost view.",
                 [B2E], ["sre", "finance-controller"],
                 ["capacityplanning", "forecasting", "finops", "scenario"],
                 formats=LIGHT_FORMATS,
                 columns=("service", "metric", "current", "forecast", "headroom", "as_of")),
            proc("observability", "Observability",
                 "Logs + metrics + traces + RUM.",
                 [B2E], ["sre"],
                 ["observability", "monitoring", "performance"],
                 formats=LIGHT_FORMATS,
                 columns=("service", "p95_ms", "errors", "rps", "saturation", "captured_at")),
        ),
    ),
    Department(
        id="cybersecurity",
        name="Cybersecurity",
        icon="🔒",
        color="#9333ea",
        priority=21,
        description="Threat detection, identity, access, zero-trust, privacy, DLP.",
        roi="Breach + penalty avoidance",
        aiCapabilities=("secure", "threatdetection", "identity", "accesscontrol", "zerotrust",
                        "privacy", "pii", "dlp", "incident", "governance", "monitoring", "audit"),
        processes=(
            proc("threat-detection", "Threat Detection",
                 "SOC alert pipeline + AI triage.",
                 [B2E], ["ciso-team", "sre"],
                 ["threatdetection", "anomaly", "behavioral", "agentic"],
                 formats=LIGHT_FORMATS,
                 columns=("alert_id", "rule", "asset", "severity", "status", "raised_at")),
            proc("identity-mgmt", "Identity & Access",
                 "Adaptive auth + privileged access + reviews.",
                 [B2E, B2B], ["ciso-team", "vendor"],
                 ["identity", "accesscontrol", "zerotrust", "audit"],
                 formats=DOC_HEAVY,
                 columns=("identity", "role", "risk", "mfa", "last_review", "owner")),
            proc("privacy-dlp", "Privacy & DLP",
                 "PII discovery + redaction + DLP enforcement.",
                 [B2E], ["ciso-team", "compliance-officer"],
                 ["privacy", "pii", "dlp", "documentation"],
                 formats=LIGHT_FORMATS,
                 columns=("scan_id", "asset", "pii_types", "leaks", "owner", "scanned_at")),
        ),
    ),
    Department(
        id="ai-governance-office",
        name="Enterprise AI Governance Office",
        icon="🏛",
        color="#0f172a",
        priority=22,
        description="AI policy + risk + evaluation + responsible + ethical.",
        roi="AI risk + trust gains",
        aiCapabilities=("governance", "responsible", "ethical", "trust", "fairness", "explainable",
                        "audit", "compliance", "evaluation", "benchmark", "risk", "monitoring",
                        "policy", "validation"),
        processes=(
            proc("model-risk-review", "Model Risk Review",
                 "Pre-deploy risk approval + sign-off.",
                 [B2E], ["ai-governance", "risk-officer"],
                 ["risk", "governance", "explainable", "audit"],
                 formats=DOC_HEAVY,
                 columns=("model_id", "tier", "risk", "approver", "status", "decided_at")),
            proc("fairness-audit", "Fairness Audit",
                 "Bias scan across protected attributes.",
                 [B2E], ["ai-governance", "compliance-officer"],
                 ["fairness", "explainable", "audit", "responsible"],
                 formats=LIGHT_FORMATS,
                 columns=("model_id", "attribute", "metric", "value", "threshold", "audited_at")),
            proc("policy-enforcement", "Policy Enforcement",
                 "Real-time guardrail + audit-row generation.",
                 [B2E], ["ai-governance"],
                 ["policy", "governance", "monitoring", "audit"],
                 formats=LIGHT_FORMATS,
                 columns=("event_id", "policy", "actor", "decision", "reason", "captured_at")),
        ),
    ),
]


# =============================================================================
# 5. BUILD
# =============================================================================

def build() -> dict:
    started = datetime.now(timezone.utc).isoformat()

    # ----- registries -----
    ai_registry = [
        {"id": i, "name": n, "family": f, "icon": ico, "description": d}
        for (i, n, f, ico, d) in AI_REGISTRY
    ]
    stakeholders = [
        {"role": r, "displayName": n, "side": s, "icon": ico, "defaultResponsibility": d}
        for (r, n, s, ico, d) in STAKEHOLDERS
    ]

    valid_ai_ids = {x["id"] for x in ai_registry}
    valid_role_ids = {x["role"] for x in stakeholders}

    # ----- deep tree -----
    data_dir = ROOT / "data" / "insurance"
    manifest_entries: list[dict] = []
    catalog_depts: list[dict] = []
    brand_depts: list[dict] = [
        {"id": "dashboard", "name": "Dashboard", "icon": "🏠", "route": "/", "color": "#3b82f6",
         "priority": 0, "description": "Executive overview of insurance operations.",
         "processCount": 0, "aiTypes": [], "kaggleDataset": "insurance-overview",
         "roi": "Enterprise-wide"}
    ]

    for dept in DEPTS:
        unknown_ai = [c for c in dept.aiCapabilities if c not in valid_ai_ids]
        assert not unknown_ai, f"{dept.id}: unknown AI capabilities {unknown_ai}"

        deep_processes: list[dict] = []
        for p in dept.processes:
            unknown_role = [r for r in p.stakeholders if r not in valid_role_ids]
            assert not unknown_role, f"{dept.id}/{p.id}: unknown roles {unknown_role}"
            unknown_p_ai = [c for c in p.aiCapabilities if c not in valid_ai_ids]
            assert not unknown_p_ai, f"{dept.id}/{p.id}: unknown AIs {unknown_p_ai}"

            # ----- sample data files for this process -----
            samples: list[dict] = []
            rows = synth_rows(p.id, p.columns, n=10)
            stem = data_dir / dept.id / p.id
            stem.parent.mkdir(parents=True, exist_ok=True)

            for fmt in p.formats:
                target = stem.with_suffix(f".{fmt}")
                if fmt == "csv":
                    size = datafmt.write_csv(target, p.columns, rows)
                elif fmt == "json":
                    payload = {
                        "process": p.id,
                        "department": dept.id,
                        "columns": list(p.columns),
                        "rows": [dict(zip(p.columns, r)) for r in rows],
                    }
                    size = datafmt.write_json(target, payload)
                elif fmt == "xml":
                    size = datafmt.write_xml(target, "records",
                                             [dict(zip(p.columns, r)) for r in rows])
                elif fmt == "txt":
                    body = (
                        f"# {p.name} — {dept.name}\n\n"
                        f"{p.description}\n\n"
                        f"Channels: {', '.join(p.channels)}\n"
                        f"Stakeholders: {', '.join(p.stakeholders)}\n"
                        f"AI capabilities: {', '.join(p.aiCapabilities)}\n\n"
                        f"This is a sample artefact generated by build_insurance_catalog.py. "
                        f"Replace with the operator's real artefact when available."
                    )
                    size = datafmt.write_text(target, body)
                elif fmt == "docx":
                    paras = [
                        f"{p.name} — {dept.name}",
                        p.description,
                        f"Channels: {', '.join(p.channels)}",
                        f"Stakeholders: {', '.join(p.stakeholders)}",
                        f"AI capabilities: {', '.join(p.aiCapabilities)}",
                        "Sample artefact generated by build_insurance_catalog.py.",
                    ]
                    size = datafmt.write_docx(target, paras)
                elif fmt == "pdf":
                    lines = [
                        f"{p.name} - {dept.name}",
                        "",
                        p.description,
                        "",
                        f"Channels: {', '.join(p.channels)}",
                        f"Stakeholders: {', '.join(p.stakeholders)}",
                        f"AI capabilities: {', '.join(p.aiCapabilities)}",
                        "",
                        "Sample columns:",
                        ", ".join(p.columns),
                    ]
                    size = datafmt.write_pdf(target, lines)
                elif fmt == "png":
                    size = datafmt.write_png(target)
                elif fmt == "wav":
                    size = datafmt.write_wav(target, seconds=0.5)
                elif fmt == "mp4":
                    size = datafmt.write_mp4(target)
                else:
                    raise ValueError(f"unknown format: {fmt}")

                rel_path = target.relative_to(ROOT).as_posix()
                samples.append({
                    "format": fmt,
                    "filename": target.name,
                    "path": rel_path,
                    "downloadUrl": "/" + rel_path,  # vite fs.allow exposes /
                    "sizeBytes": size,
                })
                manifest_entries.append({
                    "department": dept.id,
                    "process": p.id,
                    "format": fmt,
                    "path": rel_path,
                    "sizeBytes": size,
                })

            deep_processes.append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "channels": list(p.channels),
                "stakeholders": [{"role": r, "verb": "owns"} for r in p.stakeholders],
                "aiCapabilities": list(p.aiCapabilities),
                "dataSamples": samples,
                "columns": list(p.columns),
                "subProcesses": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "description": s.description,
                        "channels": list(s.channels),
                        "stakeholders": [{"role": r, "verb": "supports"} for r in s.stakeholders],
                        "aiCapabilities": list(s.aiCapabilities),
                    }
                    for s in p.subProcesses
                ],
            })

        catalog_depts.append({
            "id": dept.id,
            "name": dept.name,
            "icon": dept.icon,
            "color": dept.color,
            "priority": dept.priority,
            "description": dept.description,
            "roi": dept.roi,
            "aiCapabilities": list(dept.aiCapabilities),
            "processes": deep_processes,
        })

        brand_depts.append({
            "id": dept.id,
            "name": dept.name,
            "icon": dept.icon,
            "route": f"/insurance-catalog/{dept.id}",
            "color": dept.color,
            "priority": dept.priority,
            "description": dept.description,
            "processCount": len(dept.processes),
            "aiTypes": list(dept.aiCapabilities)[:6],  # nav-list shortlist
            "kaggleDataset": f"insurance-{dept.id}",
            "roi": dept.roi,
        })

    # ----- write outputs -----
    cfg_dir = ROOT / "config"
    (cfg_dir / "ai_capabilities.json").write_text(
        json.dumps({"_generated": started, "capabilities": ai_registry}, indent=2),
        encoding="utf-8",
    )
    (cfg_dir / "stakeholders.json").write_text(
        json.dumps({"_generated": started, "stakeholders": stakeholders}, indent=2),
        encoding="utf-8",
    )
    (cfg_dir / "insurance.catalog.json").write_text(
        json.dumps({
            "_generated": started,
            "_version": "1.0.0",
            "departments": catalog_depts,
        }, indent=2),
        encoding="utf-8",
    )

    # Brand.config.json — preserve existing brand block, swap dept list.
    brand_path = cfg_dir / "brand.config.json"
    existing = json.loads(brand_path.read_text(encoding="utf-8")) if brand_path.exists() else {}
    new_brand = existing.get("brand", {
        "name": "Insurance Analytics Platform",
        "shortName": "InsurAI",
        "icon": "🛡️",
        "tagline": "AI-powered insurance operations — 22 departments, multi-channel, governed.",
        "primaryColor": "#1e40af",
        "accentColor": "#dc2626",
    })
    new_industry = existing.get("industry", {
        "key": "insurance",
        "displayName": "Insurance",
        "datasetPrefix": "insurance",
        "priorityDepartmentId": "claims",
    })
    new_labels = existing.get("labels", {
        "departmentCount": "Departments",
        "processCount": "Total Processes",
        "aiTypes": "AI Capabilities",
        "datasets": "Reference Datasets",
        "aiTypesSubtitle": "Predictive · RAG · Voice · Vision · Agentic · Governance",
        "lastUpdatedPrefix": "Last updated:",
    })
    brand_path.write_text(json.dumps({
        "_about": "Single source of truth — generated by config/build_insurance_catalog.py. Edit the Python, not this file.",
        "_version": "2.0.0",
        "_generated": started,
        "brand": new_brand,
        "industry": new_industry,
        "labels": new_labels,
        "departments": brand_depts,
    }, indent=2), encoding="utf-8")

    # Manifest
    (data_dir / "manifest.json").write_text(
        json.dumps({
            "_generated": started,
            "totalFiles": len(manifest_entries),
            "totalBytes": sum(e["sizeBytes"] for e in manifest_entries),
            "files": manifest_entries,
        }, indent=2),
        encoding="utf-8",
    )

    return {
        "departments": len(catalog_depts),
        "processes": sum(len(d["processes"]) for d in catalog_depts),
        "sub_processes": sum(
            len(p["subProcesses"]) for d in catalog_depts for p in d["processes"]
        ),
        "ai_capabilities": len(ai_registry),
        "stakeholders": len(stakeholders),
        "data_files": len(manifest_entries),
        "total_bytes": sum(e["sizeBytes"] for e in manifest_entries),
    }


if __name__ == "__main__":
    summary = build()
    print(json.dumps(summary, indent=2))
