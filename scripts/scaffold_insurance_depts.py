#!/usr/bin/env python3
"""
Insurance departments scaffolder (project-local, MDD per global §59).

Generates the full §64 + §66 artifact set for 4 insurance departments:
  - claims
  - underwriting
  - customer-service
  - fraud-siu

Plus three new artifact types per operator 2026-06-01:
  - INSUR_PROCESS_FLOW.md     — Mermaid swimlane / flowchart per L2 process
  - INSUR_ARCHITECTURE_FLOW.md — Mermaid C4 L2 architecture per dept
  - INSUR_BUSINESS_MODELS.md  — B2C / B2B / B2E process flows per dept

Source-of-truth: a single INSURANCE_DEPTS dict (this file). Edit dict →
re-run → all 50+ files regenerate. Idempotent.

Usage: python3 scripts/scaffold_insurance_depts.py
"""
from __future__ import annotations
import json
import sys
import textwrap
from pathlib import Path
from datetime import datetime, timezone

REPO = Path(__file__).resolve().parent.parent
ROOT = REPO / "global-ai-org" / "departments"

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# ---------------------------------------------------------------------------
# INSURANCE_DEPTS — single source of truth (per §59 MDD discipline)
# Content sourced from operator's domain dump 2026-06-01.
# ---------------------------------------------------------------------------

INSURANCE_DEPTS: dict[str, dict] = {
    "claims": {
        "display": "Claims",
        "owner": "Chief Claims Officer",
        "objective": "Faster, accurate claim settlement across B2C, B2B, B2E channels.",
        "business_models": ["B2C", "B2B", "B2E", "B2G"],
        "ai_priority": "Very High",
        "roi_tier": "Very High",
        "persona": "Maria, Claims Operations Manager at a Top-20 US P&C carrier",
        "goal": "compress claims cycle from 14 days to <24 hours and raise STP from 18% to 80%",
        "main_kpi": "Claims cycle time (FNOL → settlement); STP rate; loss-adjustment expense",
        "stakeholders": [
            ("Policyholder", "Slow settlement", "NPS", "Claims Assistant"),
            ("Claims Adjuster", "Manual document review", "Claims/day", "Adjuster Copilot"),
            ("Claims Manager", "SLA misses", "Cycle Time", "Claims Operations Copilot"),
            ("Fraud Investigator", "False positives", "Fraud Detection Rate", "Fraud Copilot"),
            ("Underwriter", "No claims feedback loop", "Loss Ratio", "Risk Insights Assistant"),
            ("Finance", "Reserve accuracy", "Reserve Accuracy", "Finance Copilot"),
            ("Compliance", "Audit burden", "Audit Findings", "Compliance Copilot"),
            ("Legal", "Litigation review", "Case Resolution Time", "Legal Assistant"),
            ("Executive", "Visibility gaps", "Combined Ratio", "Executive AI Assistant"),
            ("Vendor (Repair/Medical)", "Delayed assignments", "Vendor SLA", "Vendor Portal Assistant"),
        ],
        # L1 process → list of (L2 process, [L3 sub-processes])
        "process_hierarchy": [
            ("FNOL", "Claim Intake", ["Web Claim Submission", "Mobile Claim Submission", "Call Center Intake", "Broker / Agent Submission", "Email / Document Upload"]),
            ("Claim Setup", "Registration", ["Claim Number Generation", "Policy Linking", "Customer Verification", "Loss Date / Location Capture"]),
            ("Document Management", "Collection & Extraction", ["Document Upload", "OCR Extraction", "Document Classification", "Metadata Tagging"]),
            ("Validation", "Completeness & Coverage", ["Missing Data Check", "Duplicate Claim Check", "Coverage Validation", "Policy-in-force Verification"]),
            ("Fraud Management", "Screening", ["Fraud Score Calculation", "Pattern Analysis", "Network / Graph Analysis", "External Watchlist Match"]),
            ("Coverage", "Verification", ["Coverage Check", "Policy Limits Check", "Deductible Application", "Exclusion Review"]),
            ("Assessment", "Damage / Loss Assessment", ["Image / Video Analysis (CV)", "Adjuster Field Review", "Repair Estimate", "Medical Bill Review"]),
            ("Investigation", "Case Analysis", ["Field Investigation", "External Verification (Police / Medical)", "Witness Interview", "Subrogation Review"]),
            ("Settlement", "Reserve & Decision", ["Reserve Calculation", "Settlement Recommendation", "Negotiation", "Approval Routing"]),
            ("Approval", "Approval Workflow", ["Auto Approval (STP)", "Manual Approval", "Manager Escalation", "Committee Review"]),
            ("Payment", "Disbursement", ["EFT Payment", "Check Issuance", "Vendor Direct Pay", "Recovery / Salvage"]),
            ("Closure", "Closeout & Audit", ["File Archive", "Audit Logging", "Customer Notification", "Subrogation Recovery"]),
        ],
        "ai_matrix": [
            ("FNOL", "Claim Creation Workflow", "Claim Classification", "Claim Summary Drafting", "Claims Intake Chatbot (24×7)"),
            ("Validation", "Rules Workflow", "Anomaly Detection", "Validation Report", "Validation Assistant"),
            ("Fraud", "Alert Workflow", "Fraud Scoring + Graph", "Investigation Narrative", "Fraud Copilot"),
            ("Coverage", "Rules Engine", "Coverage Analytics", "Coverage Explanation", "Policy Assistant"),
            ("Assessment", "Workflow", "CV Damage Prediction", "Assessment Report", "Adjuster Copilot"),
            ("Investigation", "Case Routing", "Pattern + Network Analysis", "Investigation Narrative", "Investigator Copilot"),
            ("Settlement", "Payment Workflow", "Reserve Prediction", "Settlement Recommendation", "Claims Assistant"),
            ("Closure", "Audit Workflow", "Trend Analysis", "Closure Summary", "Service Assistant"),
        ],
        "ai_agents": [
            "Claim Intake Agent", "Claim Assessment Agent", "Claim Validation Agent",
            "Claim Triage Agent", "Claim Settlement Agent", "Claims Investigation Agent",
            "Fraud Detection Agent", "Coverage Verification Agent", "Document Extraction Agent",
            "Subrogation Agent", "Customer Notification Agent",
        ],
        # 7-axis AS-IS impact: (process, time_loss_hrs_wk, error_rate, cost_impact, people, process_quality, productivity, technology)
        "as_is": [
            ("FNOL via call center (manual)", 40, "Med", "$2.4M/yr", "Agent burnout; high turnover", "Inconsistent intake quality", "−35% throughput", "Genesys + IVR only"),
            ("Manual document classification + OCR review", 60, "High", "$3.8M/yr", "Adjuster fatigue; rework cycles", "Lost / mis-routed docs", "−40% throughput", "Legacy DMS + manual OCR"),
            ("Manual claim validation (completeness, duplicates)", 35, "Med", "$1.5M/yr", "Adjuster overload", "Inconsistent rules application", "−25% throughput", "Excel checklists"),
            ("Rules-only fraud detection (no ML)", 20, "Very High", "$15M/yr leakage", "SIU understaffed", "Reactive only; misses sophisticated fraud", "−60% detection rate", "SAS-based rules engine"),
            ("Manual damage assessment (in-person inspection)", 80, "Med", "$8M/yr", "Field adjuster overload; 48h schedule lag", "Inconsistent estimates", "−45% throughput", "Polaroid + clipboard"),
            ("Reserve calculation via spreadsheet", 25, "High", "$5M/yr reserve drift", "Actuarial backlog", "Stale assumptions", "−30% accuracy", "Excel + quarterly review"),
            ("Manual approval routing (paper + email)", 30, "Med", "$1.2M/yr", "Manager email overload", "SLA breach common", "−25% cycle time", "Email + Outlook"),
            ("Catastrophe surge handling (manual triage)", 100, "Critical", "$50M/yr (CAT event)", "Adjuster burnout during CAT", "Triage by phone-tree", "−70% during CAT", "No CAT-specific tooling"),
        ],
        # 4P DT strategy: per dimension
        "dt_strategy": {
            "people": [
                "Train 250 adjusters on Adjuster Copilot (3-week certification).",
                "Add 5 prompt engineers + 3 AI/ML engineers to claims tech team.",
                "Re-org: shift 40% of L1 adjusters into exception-handling roles as STP rises.",
                "Establish AI Council per §64.43 #2 (claims-domain SMEs + tech + compliance).",
            ],
            "process": [
                "STP redesign — auto-approve claims under $5K with confidence ≥ 0.85.",
                "Human-in-loop gates for high-severity claims (>$50K) per §40.",
                "Eliminate paper trails — all docs into RAG-indexed DMS per §48.5.",
                "CAT surge playbook — auto-spin-up of 100 cloud adjuster agents per §64.43 #1.",
            ],
            "profit": [
                "Reduce LAE (loss-adjustment expense) by 30% — $45M annual savings.",
                "Fraud leakage recovery: $15M → $5M (66% reduction via §64.36 fraud flavor).",
                "STP cycle improvement → faster cash conversion = $8M working capital release.",
                "Reserve accuracy → reduce IBNR strain by $20M; release capital for growth.",
                "ROI horizon: payback 14 months; 36-month NPV $180M risk-adjusted.",
            ],
            "technology": [
                "Migrate from Guidewire ClaimCenter monolith to event-driven decomposition (3-yr horizon).",
                "Adopt CV pipeline (per §64.20) for damage assessment — vendor: AI inspection SaaS or in-house TF model.",
                "RAG corpus = policy documents + claims history + medical literature + repair estimates.",
                "Stack: FastAPI + PostgreSQL + Redis + Kafka + Ollama (RAG) + Pinecone (vector).",
                "Build-vs-buy: build core decision layer; buy CV + voice transcription SaaS.",
                "Tech debt: legacy mainframe interface costs $4M/yr — sunset in Year 2.",
            ],
        },
        "kpis": [
            ("FNOL → Registration Time", "30 min", "5 min", "−83%"),
            ("Document Validation Accuracy", "78%", "95%+", "+22%"),
            ("Fraud Detection Rate", "55%", "92%+", "+67%"),
            ("Claims STP Rate", "18%", "80%+", "+344%"),
            ("Cycle Time (FNOL → Settlement)", "14 days", "<24 hrs", "−93%"),
            ("Loss Adjustment Expense (LAE)", "$150M", "$105M", "−30%"),
            ("Customer CSAT", "3.4 / 5", "4.6 / 5", "+35%"),
            ("Claims Leakage", "$15M/yr", "<$5M/yr", "−66%"),
        ],
        # B2C / B2B / B2E / B2G journeys
        "business_model_flows": {
            "B2C": {
                "scenario": "Auto policyholder files first-party collision claim",
                "channels": ["Mobile app", "Web portal", "Call center"],
                "happy_path": [
                    "Policyholder uploads accident photos + dash-cam via mobile app",
                    "CV agent estimates damage in <30 sec",
                    "Coverage agent verifies policy in force",
                    "Fraud agent scores transaction (sub-2-sec)",
                    "Settlement agent recommends $4,200 payout (auto-approve threshold)",
                    "EFT issued same-day; customer notified via SMS + email",
                ],
                "exceptions": ["Total loss → manual review", "Injury claim → triage to bodily-injury workflow", "Suspected fraud → SIU queue"],
                "data_sources": ["Customer profile", "Policy in force", "Photos / video", "Telematics (if opt-in)", "Police report (if filed)"],
            },
            "B2B": {
                "scenario": "Commercial fleet operator submits multi-vehicle claim from warehouse fire",
                "channels": ["Broker portal", "Direct EDI", "Account-manager email"],
                "happy_path": [
                    "Broker submits bulk loss notification + spreadsheet of vehicles",
                    "Document extraction agent parses 40-vehicle inventory",
                    "Coverage agent applies fleet master policy + per-vehicle limits",
                    "Reserve agent calculates aggregate reserve ($2.4M)",
                    "Adjuster assigned for in-person inspection of high-value units",
                    "Settlement negotiated with broker; payment via wire",
                ],
                "exceptions": ["Contractor liability cross-claim", "Reinsurance trigger (>$1M)", "Subrogation against fire suppression vendor"],
                "data_sources": ["Commercial policy", "Fleet roster", "Vehicle inspection reports", "Fire marshal report", "Reinsurance treaty"],
            },
            "B2E": {
                "scenario": "Internal adjuster handles a complex catastrophe claim (hurricane)",
                "channels": ["Adjuster Copilot (internal)", "Mobile field-app", "Vendor coordination portal"],
                "happy_path": [
                    "Adjuster Copilot pre-loads similar past claims from RAG corpus",
                    "Field adjuster captures property photos via mobile",
                    "Geospatial AI overlays storm-track + parcel data",
                    "Copilot drafts loss-of-use, ALE, dwelling, contents estimates",
                    "Vendor portal auto-assigns mitigation contractor",
                    "Closure summary auto-generated; sent to underwriting feedback loop",
                ],
                "exceptions": ["FEMA coordination required", "Mortgagee payment routing", "Co-insurance dispute"],
                "data_sources": ["NOAA storm data", "Property records", "Past CAT claims (RAG)", "Vendor scorecards", "Mitigation contractor inventory"],
            },
            "B2G": {
                "scenario": "Regulatory examiner requests claims sample for market-conduct exam",
                "channels": ["State DOI portal", "Audit response workflow"],
                "happy_path": [
                    "Examiner submits sample request (100 claims by criteria)",
                    "Audit agent pulls qualifying claims with full decision audit rows per §38.3",
                    "Compliance copilot generates response narrative",
                    "Legal review gate before submission",
                    "Submitted via secure regulator channel",
                ],
                "exceptions": ["Findings → remediation plan", "Penalty negotiation", "Consent-order workflow"],
                "data_sources": ["Decision audit log", "Customer correspondence", "Settlement records", "Compliance playbook"],
            },
        },
        # Data sources for downloads (Kaggle slugs + fallback descriptions)
        "data_sources": [
            ("auto_insurance_claims", "buntyshah/auto-insurance-claims-data", "Auto claims with fraud flags"),
            ("vehicle_insurance_fraud", "shivamb/vehicle-claim-fraud-detection", "Vehicle claim fraud detection dataset"),
            ("health_insurance_claims", "thedevastator/prediction-of-insurance-charges-using-age-gend", "Health insurance charge prediction"),
            ("property_claims", "natashalan/insurance-claims", "Property + auto claims combined"),
        ],
        # Incident management — L1/L2/L3 + RAG runbooks
        "incident_levels": [
            ("L1", "Top 20 self-service / L1 issues", [
                "Claim status inquiry", "Missing document re-upload", "Policy lookup",
                "Payment status check", "Adjuster contact request", "Repair shop list request",
                "Claim number lost", "Coverage explanation", "Deductible question",
                "ETA on settlement", "How to file new claim", "Mobile app login issue",
                "Document format question", "Direct deposit setup", "Settlement check reissue",
                "Subrogation status", "Total loss process question", "Rental car coverage",
                "Towing reimbursement", "FNOL data correction",
            ]),
            ("L2", "Top 10 escalations needing SME", [
                "Coverage dispute", "Reserve disagreement", "Fraud investigation request",
                "Subrogation initiation", "Total loss valuation dispute", "Bodily injury triage",
                "Multi-vehicle complex assignment", "Loss-of-use dispute",
                "Replacement-cost vs actual-cash-value dispute", "Out-of-state jurisdiction",
            ]),
            ("L3", "Top 5 P1 incidents needing engineering / mgmt", [
                "Claims system down (Guidewire ClaimCenter unavailable)",
                "Payment gateway failure (no EFT possible)",
                "CAT event surge — system cannot scale",
                "Regulatory examination response failure",
                "Data breach involving claims PII",
            ]),
        ],
        "mttd_target": "15 min", "mttr_target_p1": "1 hr", "mttr_target_p2": "4 hrs", "mttr_target_p3": "24 hrs",
    },

    "underwriting": {
        "display": "Underwriting",
        "owner": "Chief Underwriting Officer",
        "objective": "Faster, more accurate risk selection + dynamic pricing across B2C, B2B, B2E.",
        "business_models": ["B2C", "B2B", "B2E"],
        "ai_priority": "Very High",
        "roi_tier": "Very High",
        "persona": "Daniel, Chief Underwriting Officer at a mid-size life + health carrier",
        "goal": "raise STP from 22% to 70% on personal-lines and cut commercial underwriting cycle from 14 days to <48 hours",
        "main_kpi": "Underwriting cycle time; STP rate; loss ratio; combined ratio",
        "stakeholders": [
            ("Applicant", "Slow approval", "Approval Time", "Underwriting Assistant"),
            ("Broker / Agent", "Delayed quote", "Quote TAT", "Broker Copilot"),
            ("Underwriter", "Manual review burden", "Cases/day", "Underwriter Copilot"),
            ("Underwriting Manager", "Capacity planning", "SLA attainment", "Manager Copilot"),
            ("Product Team", "Poor pricing feedback", "Product profitability", "Product Assistant"),
            ("Actuarial Team", "Risk prediction lag", "Loss ratio variance", "Actuarial Copilot"),
            ("Risk Team", "Emerging risks not surfaced", "Risk Exposure", "Risk Assistant"),
            ("Compliance", "Regulatory review burden", "Audit findings", "Compliance Copilot"),
            ("Executive", "Portfolio visibility", "Combined Ratio", "Executive Copilot"),
        ],
        "process_hierarchy": [
            ("Lead Intake", "Application Submission", ["Web Application", "Broker Portal", "Direct Sales Channel", "Reverse Auction Aggregator"]),
            ("Pre-Screening", "Eligibility & Appetite", ["Eligibility Check", "Appetite Match", "Decline-and-redirect", "Quick-quote Path"]),
            ("Data Collection", "External Data Pulls", ["KYC / Identity Verification", "Credit Bureau Pull", "Medical Records (HIPAA-compliant)", "Motor Vehicle Records (MVR)", "CLUE Loss History", "Telematics Onboarding"]),
            ("Risk Assessment", "Multi-Source Risk Scoring", ["Demographic Risk Scoring", "Behavioral Risk Scoring", "Catastrophe Exposure (Geo)", "Credit-based Insurance Score", "Predictive Lapse Risk"]),
            ("Underwriting Review", "Decision Engine", ["Auto Underwriting (STP)", "Manual Underwriting Review", "Senior UW Referral", "Reinsurance Referral (treaty / facultative)"]),
            ("Pricing", "Premium Calculation", ["Base Premium Calculation", "Dynamic Adjustment (telematics, behavior)", "Discount Application", "Surcharge Application", "Rate-filing Compliance Check"]),
            ("Decision", "Decision Issuance", ["Approve", "Reject (with reason codes)", "Refer (with conditions)", "Counter-offer"]),
            ("Policy Issuance", "Binding & Delivery", ["Policy Document Generation", "ID Card Issuance", "Welcome Kit Generation", "Policy Delivery (e-delivery / mail)"]),
            ("Portfolio Monitoring", "In-force Surveillance", ["Risk Re-scoring", "Loss-experience Monitoring", "Renewal Risk Review", "Mid-term Endorsement Review"]),
        ],
        "ai_matrix": [
            ("Application", "Data Capture Workflow", "Risk Pre-screening", "Application Summary", "Application Assistant"),
            ("Data Collection", "External Data Workflow", "Data Quality Scoring", "Data Gap Report", "Data Assistant"),
            ("Risk Assessment", "Scoring Workflow", "ML Risk Models", "Risk Narrative", "Risk Copilot"),
            ("Pricing", "Rating Workflow", "Dynamic Pricing Models", "Pricing Explanation (XAI)", "Pricing Assistant"),
            ("Decision", "Decision Workflow", "Acceptance Probability", "Decision Letter Draft", "UW Copilot"),
            ("Policy Issuance", "Document Workflow", "Document Validation", "Policy Generation (GenAI)", "Policy Assistant"),
            ("Portfolio Monitoring", "Surveillance Workflow", "Drift Detection", "Risk Trend Report", "Portfolio Copilot"),
        ],
        "ai_agents": [
            "Application Intake Agent", "Document Verification Agent", "Risk Scoring Agent",
            "Pricing Agent", "Underwriting Decision Agent", "Policy Generation Agent",
            "Compliance Verification Agent", "Portfolio Monitoring Agent", "Renewal Risk Agent",
        ],
        "as_is": [
            ("Manual application data entry (call center / paper)", 50, "High", "$2.8M/yr", "UW assistants overworked", "Data quality variance 30%", "−40% throughput", "Manual entry + double-key"),
            ("Sequential external data pulls (one bureau at a time)", 30, "Med", "$1.2M/yr", "UW waiting on data", "Stale by time underwriter sees it", "−25% cycle", "Sequential API calls"),
            ("Manual risk classification (book of rules)", 60, "Med", "$3.5M/yr", "Senior UW bottleneck", "Inconsistent class assignment", "−35% throughput", "Spreadsheet rule engine"),
            ("Static pricing tables (annual refresh)", 15, "High", "$8M/yr adverse selection", "Actuarial slow refresh", "Stale price points", "−30% on dynamic risks", "Excel rating tables"),
            ("Manual rate-filing compliance review", 25, "Med", "$800K/yr", "Compliance bottleneck", "Late filings = penalties", "−20% throughput", "Manual review against DOI rules"),
            ("Paper-based policy issuance + mail", 20, "Low", "$400K/yr postage + handling", "Operations overload", "5-7 day delivery", "−15% customer experience", "Print shop + USPS"),
            ("Reactive portfolio review (quarterly)", 12, "Med", "$5M/yr adverse selection", "Senior UW review burden", "Stale risk view", "−40% on emerging risks", "Excel + Tableau quarterly"),
        ],
        "dt_strategy": {
            "people": [
                "Train 180 underwriters on UW Copilot (4-week immersion).",
                "Hire 8 data scientists for risk-model development + monitoring.",
                "Establish UW AI Council per §64.43 #2.",
                "Re-skill 30% of UW staff into model-validation + product roles.",
            ],
            "process": [
                "STP target: 70% on personal lines; 35% on small commercial.",
                "Real-time external data orchestration (parallel pulls, sub-5-sec).",
                "Continuous portfolio re-scoring (weekly vs quarterly).",
                "Dynamic pricing — risk-adjusted premium update on every quote.",
            ],
            "profit": [
                "Loss ratio improvement: 67% → 58% = $90M annual underwriting profit.",
                "Combined ratio: 102% → 94%.",
                "Adverse selection reduction: $8M/yr recovered via dynamic pricing.",
                "Quote-to-bind conversion: +25% via faster TAT.",
                "ROI horizon: payback 11 months; 36-month NPV $220M.",
            ],
            "technology": [
                "Migrate from Duck Creek monolith to event-driven UW platform.",
                "Adopt risk-scoring ensemble (XGBoost + GBM + neural) per §64.20.",
                "RAG corpus: medical records + rate filings + underwriting manual + claim history.",
                "Stack: FastAPI + PostgreSQL + Redis + Kafka + Pinecone + Ollama.",
                "Build core risk models; buy KYC + bureau-pull SaaS.",
                "Sunset Excel-rate-table dependency: Year 1.",
            ],
        },
        "kpis": [
            ("Quote Turnaround Time (personal lines)", "2.5 days", "<5 min", "−99%"),
            ("Underwriting Cycle Time (commercial)", "14 days", "<48 hrs", "−86%"),
            ("STP Rate (personal lines)", "22%", "70%+", "+218%"),
            ("Loss Ratio", "67%", "<58%", "−13%"),
            ("Combined Ratio", "102%", "<94%", "−8 pts"),
            ("Risk Model Accuracy (AUC)", "0.72", ">0.85", "+18%"),
            ("Portfolio Profitability", "+8%", "+18%", "+10 pts"),
            ("UW Adjuster Productivity", "12 cases/day", "30 cases/day", "+150%"),
        ],
        "business_model_flows": {
            "B2C": {
                "scenario": "Individual buys homeowners policy online",
                "channels": ["Web direct", "Mobile app"],
                "happy_path": [
                    "Applicant enters address + basic info",
                    "Property risk agent pulls satellite imagery, CLUE history, geo-perils",
                    "Risk scoring ensemble returns score in <3 sec",
                    "Pricing agent computes dynamic premium",
                    "STP decision (auto-approve if risk ≤ tier-2)",
                    "Policy document generated + e-delivered within 60 sec",
                ],
                "exceptions": ["Wildfire zone → manual review", "Prior CAT claim → endorsement required", "Coastal exposure → reinsurance referral"],
                "data_sources": ["Address geocoding", "CLUE", "Property valuation", "Catastrophe model", "Credit-based insurance score"],
            },
            "B2B": {
                "scenario": "Manufacturing firm seeks commercial property + liability + workers' comp via broker",
                "channels": ["Broker portal", "ACORD-form submission"],
                "happy_path": [
                    "Broker uploads ACORD 125/126/130 + loss runs",
                    "Document agent extracts structured data",
                    "Risk agent assesses occupancy + COPE + loss history",
                    "Senior UW reviews complex risks (asbestos, PFAS exposure)",
                    "Reinsurance check for limits > $5M",
                    "Quote bound; policy issued within 24 hrs",
                ],
                "exceptions": ["EPA-listed site → environmental UW", "Cyber endorsement → cyber-UW handoff", "International exposure → global program"],
                "data_sources": ["ACORD forms", "Loss runs", "OSHA records", "Dun & Bradstreet", "Reinsurance treaty wordings"],
            },
            "B2E": {
                "scenario": "Underwriter handles a complex group-life renewal for a Fortune-500 employer",
                "channels": ["UW Copilot (internal)", "Renewal workflow"],
                "happy_path": [
                    "Copilot pre-loads 3-year experience + benchmark data",
                    "Predicts loss-ratio trajectory + recommends rate action",
                    "Drafts renewal proposal with rate-action narrative",
                    "Senior UW reviews + approves rate-pass-through",
                    "Auto-generates renewal package; sent to broker",
                ],
                "exceptions": ["Large rate action (>15%) → senior committee", "Industry under-performance → re-class", "Pandemic IBNR adjustment"],
                "data_sources": ["3-year claims experience", "Industry benchmarks", "Demographic shift data", "Reinsurance pool data"],
            },
        },
        "data_sources": [
            ("life_insurance_data", "broaniki/insurance", "Health insurance dataset (age/BMI/region/charges)"),
            ("auto_insurance_underwriting", "easonlai/sample-insurance-claim-prediction-dataset", "Auto UW + claims features"),
            ("medical_cost", "mirichoi0218/insurance", "Medical cost personal dataset"),
        ],
        "incident_levels": [
            ("L1", "Top 20 self-service / L1 issues", [
                "Application status inquiry", "Document upload help", "Premium calculation question",
                "Policy delivery status", "ID card request", "Renewal date question",
                "Quote retrieval", "Discount eligibility question", "Coverage limit question",
                "Endorsement procedure", "Cancellation procedure", "Address change",
                "Beneficiary update", "Payment method change", "Late payment grace period",
                "Premium financing", "Lapse reinstatement", "Certificate of insurance request",
                "Lienholder change", "Application correction",
            ]),
            ("L2", "Top 10 escalations needing SME", [
                "Risk class dispute", "Pricing dispute", "Coverage decline appeal",
                "Medical-records delay impacting decision", "Telematics dispute",
                "Reinsurance referral", "Complex commercial UW", "Catastrophe re-rating",
                "Compliance review (rate filing)", "Group renewal rate action",
            ]),
            ("L3", "Top 5 P1 incidents needing engineering / mgmt", [
                "Underwriting platform down", "Bureau / external data feed failure",
                "Rating engine failure (mispricing risk)", "Rate-filing compliance breach",
                "Risk-model accuracy drift (loss ratio spike)",
            ]),
        ],
        "mttd_target": "15 min", "mttr_target_p1": "2 hrs", "mttr_target_p2": "8 hrs", "mttr_target_p3": "48 hrs",
    },

    "customer-service": {
        "display": "Customer Service / Contact Center",
        "owner": "Director of Customer Experience",
        "objective": "Highest customer-touch dept — drive automation + omnichannel + 24×7 + CSAT.",
        "business_models": ["B2C", "B2B", "B2E", "B2G"],
        "ai_priority": "Very High",
        "roi_tier": "High",
        "persona": "Jasmine, VP of Customer Service operating across 3 contact centers (US + Philippines + Costa Rica)",
        "goal": "raise chatbot self-service from 22% to 85% and reduce AHT from 18 min to 6 min",
        "main_kpi": "First-call resolution; AHT; chatbot deflection rate; CSAT; NPS",
        "stakeholders": [
            ("Customer", "Long wait time", "CSAT", "Customer Assistant (chatbot + voice)"),
            ("CSR Agent", "Repeated questions / burnout", "Cases/day", "Agent Copilot"),
            ("Supervisor", "SLA misses", "SLA compliance", "Supervisor Copilot"),
            ("Operations Manager", "Workforce planning", "Productivity", "Operations Copilot"),
            ("Claims Team", "Repeated status questions", "Call deflection", "Claims Assistant"),
            ("Underwriting Team", "Status inquiry volume", "Request volume", "UW Assistant"),
            ("Sales Team", "Product questions", "Lead conversion", "Sales Copilot"),
            ("Executive", "Customer experience visibility", "NPS", "CX Executive Copilot"),
        ],
        "process_hierarchy": [
            ("Customer Contact", "Inbound Channels", ["Phone (IVR + agent)", "Email", "Chat (web + mobile)", "Mobile app", "Social media", "WhatsApp"]),
            ("Authentication", "Identity & Security", ["Voice biometrics", "Knowledge-based authentication", "OTP / 2FA", "Account number + DOB"]),
            ("Inquiry Management", "Intent Routing", ["Policy Inquiry", "Claims Inquiry", "Billing Inquiry", "Coverage Inquiry", "Endorsement / Change Request"]),
            ("Case Management", "Ticket Lifecycle", ["Ticket Creation", "Ticket Assignment", "Routing to Specialist", "SLA Tracking"]),
            ("Resolution", "Resolution Path", ["Self-Service (KB / chatbot)", "Agent Resolution", "Escalation"]),
            ("Escalation", "Tiered Escalation", ["Supervisor Escalation", "Claims / UW Escalation", "Executive Escalation", "Legal / Compliance Escalation"]),
            ("Feedback", "Voice of Customer", ["Survey (CSAT)", "Net Promoter Score", "Complaint Capture", "Compliment Capture"]),
            ("Retention", "Save Path", ["Renewal Reminder", "Save Offer", "Loyalty Program Surface", "Cross-sell Suggestion"]),
        ],
        "ai_matrix": [
            ("Customer Contact", "Omnichannel Routing", "Intent Classification", "Smart Response Drafting", "Conversational AI Chatbot + Voice"),
            ("Authentication", "Verification Workflow", "Fraud Risk Scoring", "Verification Narrative", "Voice Bio Assistant"),
            ("Inquiry", "Ticket Workflow", "Intent + Sentiment", "Response Generation", "Insurance Assistant"),
            ("Case Management", "Routing Workflow", "Volume Forecasting", "Case Summary", "Supervisor Copilot"),
            ("Resolution", "Resolution Workflow", "Resolution Prediction", "FAQ + Article Generation", "Knowledge Assistant"),
            ("Escalation", "Escalation Workflow", "Escalation Risk Scoring", "Escalation Narrative", "Supervisor Copilot"),
            ("Feedback", "Survey Workflow", "Sentiment Analytics", "VOC Summary", "VOC Assistant"),
            ("Retention", "Retention Workflow", "Churn Prediction", "Save-offer Generation", "Retention Copilot"),
        ],
        "ai_agents": [
            "Insurance Chatbot Agent", "Voice Virtual Agent", "Authentication Agent",
            "Intent Classification Agent", "Sentiment Analysis Agent", "Knowledge Search Agent",
            "FAQ Generator Agent", "Article Generator Agent", "Resolution Status Agent",
            "Response Suggestion Agent", "Follow-Up Reminder Agent", "Personalized Communication Agent",
            "Escalation Routing Agent", "Churn Prediction Agent",
        ],
        "as_is": [
            ("Manual IVR menu navigation", 40, "High", "$2M/yr (lost-call cost)", "Customer frustration", "Misroutes 30%", "−40% FCR", "Legacy Avaya IVR"),
            ("Agent manually searches KB for answer", 60, "High", "$3.5M/yr", "Agent confusion + AHT inflation", "KB stale; wrong answers", "−35% accuracy", "Confluence keyword search"),
            ("Manual sentiment review (sample 2% of calls)", 20, "Very High", "$1.5M/yr", "QA-team only", "Reactive feedback", "98% of signals missed", "Excel + sampling"),
            ("Manual QA call audits (5 calls / agent / month)", 15, "Med", "$1.2M/yr", "QA bottleneck", "Stale coaching feedback", "−25% coaching effectiveness", "Excel forms + recordings"),
            ("Voice transcription outsourced (48h SLA)", 25, "Low", "$2.5M/yr", "Slow analytics + missed real-time", "Lag 48h", "−50% real-time visibility", "Vendor transcription"),
            ("Tier-1 calls handled by human (no chatbot deflection)", 80, "Med", "$8M/yr (FTE cost)", "Agent burnout on repetitive Qs", "Inconsistent answers", "−60% on simple Qs", "No chatbot / weak FAQ"),
            ("Manual escalation routing (email + warm transfer)", 12, "Med", "$600K/yr", "Transfer-loss + repeat-explain", "Customer effort high", "−20% FCR", "Outlook + phone"),
        ],
        "dt_strategy": {
            "people": [
                "Train 800 agents on Agent Copilot (2-week certification).",
                "Hire 12 conversational designers + 6 voice engineers.",
                "Re-org: dissolve Tier-1 desk (deflect to chatbot); upskill to Tier-2 specialists.",
                "Establish CX AI Council per §64.43 #2.",
            ],
            "process": [
                "Chatbot self-service target: 85% of Tier-1 volume.",
                "Real-time agent assist on every call (whisper coaching).",
                "100% call transcription + sentiment scoring (no sampling).",
                "Automated QA on 100% of calls (vs 2% sampling).",
            ],
            "profit": [
                "Contact center cost: $35M → $20M = $15M savings (−43%).",
                "CSAT lift drives retention: $25M ARR protected.",
                "AHT reduction = +800K productive minutes annually.",
                "Churn reduction (−5pts) = $12M premium retained.",
                "ROI horizon: payback 10 months; 36-month NPV $80M.",
            ],
            "technology": [
                "Replace Avaya IVR with conversational AI per §67.",
                "Adopt voice biometrics for authentication.",
                "RAG corpus: policy docs + claims history + KB articles + past resolutions.",
                "Stack: FastAPI + Twilio + Genesys integration + Ollama + Pinecone.",
                "Build agent copilot in-house; buy voice-bio + voice-transcription SaaS.",
                "Sunset legacy KB; consolidate into RAG corpus.",
            ],
        },
        "kpis": [
            ("First Call Resolution (FCR)", "62%", "85%+", "+37%"),
            ("Average Handle Time (AHT)", "18 min", "6 min", "−67%"),
            ("Chatbot Deflection / Self-Service", "22%", "85%+", "+286%"),
            ("CSAT", "3.6 / 5", "4.7 / 5", "+31%"),
            ("Net Promoter Score (NPS)", "+18", "+55", "+37 pts"),
            ("Agent Attrition (annualized)", "38%", "<18%", "−53%"),
            ("Cost per Contact", "$8.40", "$3.20", "−62%"),
            ("Voice-of-Customer Coverage", "2%", "100%", "+98 pts"),
        ],
        "business_model_flows": {
            "B2C": {
                "scenario": "Policyholder asks about claim status via mobile chat",
                "channels": ["Mobile app chat", "Web chat", "SMS"],
                "happy_path": [
                    "Customer opens chat → identity confirmed via app session",
                    "Intent classifier: 'claim_status'",
                    "Knowledge agent retrieves real-time claim from claims system",
                    "Generates personalized status update with ETA",
                    "Offers proactive actions (upload missing docs, schedule adjuster)",
                    "Chat ends with CSAT prompt; sentiment scored",
                ],
                "exceptions": ["Authentication fail → step-up to voice bio", "Complex claim query → warm transfer to claims adjuster", "Negative sentiment → manager alert"],
                "data_sources": ["Customer profile", "Active claims", "Policy in force", "Past interaction history", "Sentiment history"],
            },
            "B2B": {
                "scenario": "Commercial broker requests certificates of insurance for 12 clients via account-manager portal",
                "channels": ["Broker portal", "Email", "Account manager"],
                "happy_path": [
                    "Broker submits bulk COI request",
                    "Verification agent confirms broker license + appointment",
                    "Doc-gen agent produces 12 COIs with each client's specific holder",
                    "Compliance check (state-specific COI language)",
                    "Bulk delivery via portal + e-mail",
                ],
                "exceptions": ["Broker appointment expired → retention escalation", "Holder requires special endorsement → underwriter referral", "International COI → global program team"],
                "data_sources": ["Broker license registry", "Policy schedules", "State-specific COI templates"],
            },
            "B2E": {
                "scenario": "Agent Copilot whispers next-best-action during a save call",
                "channels": ["Agent desktop copilot", "Voice headset"],
                "happy_path": [
                    "Customer calls intending to cancel",
                    "Real-time sentiment detects churn risk",
                    "Copilot surfaces save offers + retention scripts",
                    "Agent uses copilot suggestions; customer retained",
                    "Outcome logged for churn-model retraining",
                ],
                "exceptions": ["Strong intent to leave → empathy script + manager hand-off", "Pricing complaint → UW referral", "Service failure complaint → root-cause loop"],
                "data_sources": ["Customer LTV", "Churn risk score", "Save-offer catalog", "Past complaints", "Retention playbook"],
            },
            "B2G": {
                "scenario": "State DOI consumer hotline forwards complaint",
                "channels": ["Regulator-facing complaint portal", "Email"],
                "happy_path": [
                    "DOI submits consumer complaint with case number",
                    "Compliance agent retrieves customer interaction history",
                    "Drafts regulator-facing response narrative",
                    "Legal review gate",
                    "Submitted within state-mandated SLA (typically 10 days)",
                ],
                "exceptions": ["Pattern of complaints → market-conduct flag", "Finding → remediation workflow", "Penalty → consent-order workflow"],
                "data_sources": ["Customer history", "Decision audit log", "Complaint catalog", "State complaint regulations"],
            },
        },
        "data_sources": [
            ("call_center_data", "banuprakashv/call-center-data", "Call center metrics dataset"),
            ("customer_complaints", "anandhuh/insurance-customer-complaints", "Insurance customer complaints"),
            ("customer_churn", "thedevastator/customer-churn-prediction-dataset", "Customer churn prediction"),
            ("nlp_intent_classification", "bittlingmayer/amazonreviews", "Customer intent / sentiment corpus"),
        ],
        "incident_levels": [
            ("L1", "Top 20 self-service / L1 issues", [
                "Policy lookup", "Claim status", "Premium balance", "Next payment due date",
                "ID card request", "Billing address change", "Auto-pay setup",
                "Coverage explanation", "Deductible question", "Adjuster contact",
                "Repair shop list", "Tow service", "Glass claim", "Rental car coverage",
                "Mobile app password reset", "Document upload", "Endorsement initiation",
                "Cancellation procedure", "Beneficiary update", "Producer assignment",
            ]),
            ("L2", "Top 10 escalations needing SME", [
                "Coverage dispute", "Premium dispute", "Service complaint",
                "Claims handling complaint", "Producer complaint", "Compliance complaint",
                "Multi-policy issue", "Bilingual support", "ADA accommodation",
                "Bereavement / fraud-on-deceased policy",
            ]),
            ("L3", "Top 5 P1 incidents needing engineering / mgmt", [
                "Contact center system down (Genesys / Avaya unavailable)",
                "Authentication system failure (mass login outage)",
                "Chatbot outage during peak hours",
                "Regulatory complaint surge (>500/day)",
                "CRM integration failure (no customer context for agents)",
            ]),
        ],
        "mttd_target": "5 min", "mttr_target_p1": "30 min", "mttr_target_p2": "2 hrs", "mttr_target_p3": "8 hrs",
    },

    "fraud-siu": {
        "display": "Fraud / Special Investigations Unit (SIU)",
        "owner": "Chief Fraud Officer",
        "objective": "Detect + prevent insurance fraud across claims, application, and provider networks.",
        "business_models": ["B2C", "B2B", "B2E"],
        "ai_priority": "Very High",
        "roi_tier": "Very High",
        "persona": "Raj, Director of SIU at a multi-line carrier",
        "goal": "raise fraud detection from 55% to 92%+ and cut fraud leakage from $15M to <$5M",
        "main_kpi": "Fraud detection rate; fraud savings; SIU referral conversion; investigation cycle time",
        "stakeholders": [
            ("SIU Investigator", "False-positive overload", "Cases closed / week", "Fraud Copilot"),
            ("Claims Adjuster", "Unclear fraud signals", "Referral accuracy", "Fraud Signal Assistant"),
            ("Underwriter", "Application fraud risk", "Application fraud score", "Application Fraud Agent"),
            ("Provider Network", "Network-level fraud patterns", "Provider risk score", "Network Analysis Agent"),
            ("Legal", "Prosecution readiness", "Case win rate", "Legal Investigation Assistant"),
            ("Compliance", "Regulatory reporting (NICB, state DOI)", "Reporting compliance", "Compliance Reporter"),
            ("Executive", "Fraud-leakage visibility", "Fraud Leakage", "Fraud Executive Dashboard"),
        ],
        "process_hierarchy": [
            ("Fraud Detection", "Multi-Layer Screening", ["Rule-based Screening", "ML Fraud Scoring", "Network / Graph Analysis", "Behavioral Anomaly", "External Watchlist Match"]),
            ("Triage", "Case Prioritization", ["Priority Scoring", "Case Routing", "Investigator Assignment"]),
            ("Investigation", "Active Case Work", ["Document Examination", "Interview", "Surveillance", "Medical Record Review", "Vendor / Provider Audit", "Social Media OSINT"]),
            ("Decision", "Case Disposition", ["Confirm Fraud", "Confirm Legitimate", "Inconclusive / Refer Out"]),
            ("Action", "Outcome", ["Claim Denial", "Recovery / Subrogation", "Law Enforcement Referral", "Provider De-network"]),
            ("Reporting", "Regulatory & Industry", ["NICB Reporting", "State DOI Reporting", "Internal Reporting", "Industry Anti-Fraud Consortium"]),
            ("Prevention", "Forward-looking Controls", ["Application Risk Scoring", "Provider Audit", "Customer Behavioral Monitoring"]),
        ],
        "ai_matrix": [
            ("Detection", "Alert Workflow", "Fraud Scoring + Graph", "Investigation Narrative Draft", "Fraud Copilot"),
            ("Triage", "Case Routing", "Priority Scoring", "Case Brief", "Triage Assistant"),
            ("Investigation", "Case Workflow", "Pattern + Network Analysis", "Investigation Report Generation", "Investigator Copilot"),
            ("Decision", "Decision Workflow", "Outcome Probability", "Decision Memo", "SIU Manager Copilot"),
            ("Action", "Action Workflow", "Recovery Estimation", "Denial / Recovery Letter", "Action Assistant"),
            ("Reporting", "Regulatory Workflow", "Reporting Validation", "NICB / DOI Report Generation", "Compliance Reporter"),
            ("Prevention", "Surveillance Workflow", "Predictive Risk Modeling", "Risk Bulletin Generation", "Prevention Assistant"),
        ],
        "ai_agents": [
            "Fraud Detection Agent", "Anomaly Detection Agent", "Graph / Network Analysis Agent",
            "Behavioral Analysis Agent", "OSINT Agent", "Document Forensics Agent",
            "Provider Audit Agent", "Recovery Agent", "NICB / DOI Reporting Agent",
            "Application Fraud Agent",
        ],
        "as_is": [
            ("Rules-only fraud detection (no ML)", 30, "Very High", "$15M/yr leakage", "SIU misses sophisticated fraud", "Reactive only", "−60% detection", "SAS-based rule engine"),
            ("Manual graph / network analysis (Excel)", 50, "High", "$4M/yr", "Investigator overload", "Misses network rings", "−70% network detection", "Excel + Visio"),
            ("Manual OSINT / social media review", 40, "Med", "$2M/yr", "Investigator overload", "Sampling only", "−50% throughput", "Manual web browsing"),
            ("Sequential document forensics review", 35, "Med", "$3.2M/yr", "Forensic specialist bottleneck", "Slow", "−40% throughput", "Manual document review"),
            ("Manual NICB / DOI reporting", 15, "Med", "$600K/yr", "Compliance bottleneck", "Late filings", "−30% throughput", "Manual data entry"),
            ("Provider audit (annual / reactive)", 25, "High", "$8M/yr provider-fraud leakage", "Audit team capacity", "Reactive only", "−65% on emerging schemes", "Spreadsheet-based audits"),
            ("Manual recovery / subrogation tracking", 20, "Med", "$1.5M/yr lost recovery", "Recovery-team backlog", "Lost-to-aging", "−40% recovery rate", "Excel + email"),
        ],
        "dt_strategy": {
            "people": [
                "Train 60 investigators on Fraud Copilot.",
                "Hire 6 graph / network data scientists.",
                "Hire 3 OSINT specialists with AI-tool fluency.",
                "Establish Fraud AI Council per §64.43 #2.",
                "Re-skill 25% of L1 reviewers into model-validation roles.",
            ],
            "process": [
                "Real-time fraud scoring on every claim (sub-2-sec).",
                "Continuous network re-scoring (vs investigator-initiated).",
                "Automated OSINT pre-loaded for every flagged case.",
                "Provider audits triggered by anomaly, not annual schedule.",
            ],
            "profit": [
                "Fraud leakage: $15M → $5M = $10M annual savings.",
                "Provider-fraud recovery: +$8M annually.",
                "Recovery rate improvement: 40% → 75% = $4M additional recovery.",
                "Reduced LAE on fraud cases: $2M annually.",
                "ROI horizon: payback 8 months; 36-month NPV $90M.",
            ],
            "technology": [
                "Adopt graph DB (Neo4j) for relationship analysis.",
                "Adopt ML fraud-scoring ensemble (XGBoost + Isolation Forest + autoencoder).",
                "RAG corpus: fraud playbooks + historical cases + NICB bulletins + state DOI guidance.",
                "Stack: FastAPI + Neo4j + PostgreSQL + Redis + Kafka + Ollama + Pinecone.",
                "Build core models; buy NICB data feed + OSINT SaaS.",
                "Sunset SAS rule engine: Year 2.",
            ],
        },
        "kpis": [
            ("Fraud Detection Rate", "55%", "92%+", "+67%"),
            ("Fraud Leakage", "$15M/yr", "<$5M/yr", "−66%"),
            ("Provider-Fraud Detection", "30%", "80%+", "+167%"),
            ("Investigation Cycle Time", "45 days", "<15 days", "−67%"),
            ("False-Positive Rate", "62%", "<20%", "−68%"),
            ("Recovery Rate", "40%", "75%+", "+87%"),
            ("Network / Ring Detection", "12%", "65%+", "+442%"),
            ("Investigator Productivity", "8 cases/mo", "22 cases/mo", "+175%"),
        ],
        "business_model_flows": {
            "B2C": {
                "scenario": "Suspicious auto-glass claim flagged at FNOL",
                "channels": ["Claims feed", "Fraud scoring pipeline"],
                "happy_path": [
                    "FNOL → fraud scoring agent flags claim (score 0.87)",
                    "Graph analysis surfaces shared address with 4 other recent glass claims",
                    "OSINT agent pulls social media; finds business posing as policyholder",
                    "Investigator confirms ring; case routed to legal",
                    "Claim denied; NICB report filed; provider de-networked",
                ],
                "exceptions": ["Insufficient evidence → monitor list", "Cross-state ring → multi-state coordination", "Federal interest (RICO) → FBI referral"],
                "data_sources": ["Claims history", "Address graph", "Provider network data", "OSINT (social, biz registries)", "NICB watchlist"],
            },
            "B2B": {
                "scenario": "Provider-fraud detected in workers' comp medical billing",
                "channels": ["Bill-review pipeline", "Provider audit workflow"],
                "happy_path": [
                    "Continuous billing analysis detects up-coding pattern at provider",
                    "Anomaly score escalates → provider audit triggered",
                    "Audit agent reviews 200 recent bills; finds systematic up-coding",
                    "Provider notified; required to remediate or de-network",
                    "Recovery initiated for past 18 months of overbilling",
                ],
                "exceptions": ["Provider counter-claim → legal review", "Multi-carrier pattern → industry consortium alert", "Criminal referral → DOJ healthcare fraud"],
                "data_sources": ["Billing history", "CPT code patterns", "Provider credentials", "State medical board", "Peer-comparison benchmarks"],
            },
            "B2E": {
                "scenario": "Internal fraud — employee colluding with vendor",
                "channels": ["Internal-audit pipeline", "HR coordination"],
                "happy_path": [
                    "Anomaly detected: same employee approves vendor 200% above average",
                    "Graph analysis reveals personal relationship with vendor",
                    "Investigation: interviews + email forensics + transaction review",
                    "Confirmed; termination + recovery + criminal referral",
                ],
                "exceptions": ["Multi-employee ring → broader investigation", "Whistleblower protection requirements", "Privileged communication review"],
                "data_sources": ["Employee approval history", "Vendor relationships", "Email metadata (HR-supervised)", "Bank record subpoena"],
            },
        },
        "data_sources": [
            ("vehicle_claim_fraud", "shivamb/vehicle-claim-fraud-detection", "Vehicle fraud detection"),
            ("creditcard_fraud", "mlg-ulb/creditcardfraud", "Credit-card fraud (Kaggle classic)"),
            ("auto_insurance_fraud", "buntyshah/auto-insurance-claims-data", "Auto claims fraud flags"),
            ("ieee_fraud", "ieee-fraud-detection/ieee-fraud-detection", "IEEE-CIS fraud transactions"),
        ],
        "incident_levels": [
            ("L1", "Top 20 self-service / L1 issues", [
                "Investigator status query", "Case status check", "Document request",
                "NICB record query", "Watchlist add request", "Provider score query",
                "Historical case lookup", "Network query", "Recovery status",
                "OSINT request", "Surveillance scheduling", "Interview scheduling",
                "Subpoena request", "Subrogation status", "Vendor audit status",
                "Reporting deadline reminder", "Investigator workload query", "Case re-assignment",
                "Quality review request", "Training request",
            ]),
            ("L2", "Top 10 escalations needing SME", [
                "Multi-state fraud ring", "Provider-fraud (medical / repair)",
                "Application fraud at scale", "Internal-fraud allegation",
                "Cross-line fraud (auto + life)", "Cyber-fraud / identity-theft",
                "Federal interest (RICO / mail-fraud)", "Litigation-defense fraud",
                "Catastrophe-fraud surge", "Disability-fraud surveillance",
            ]),
            ("L3", "Top 5 P1 incidents needing engineering / mgmt", [
                "Fraud-scoring system down (claims flow uncontrolled)",
                "Graph DB outage (network analysis offline)",
                "NICB feed failure (watchlist stale)",
                "OSINT data-source compromise",
                "Model drift causing high false-positive rate",
            ]),
        ],
        "mttd_target": "10 min", "mttr_target_p1": "1 hr", "mttr_target_p2": "4 hrs", "mttr_target_p3": "24 hrs",
    },
}


# ---------------------------------------------------------------------------
# Render helpers
# ---------------------------------------------------------------------------

def w(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def md_table(headers: list[str], rows: list[list]) -> str:
    """Render a markdown table from headers + rows."""
    header_line = "| " + " | ".join(headers) + " |"
    sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = []
    for row in rows:
        cells = [str(c).replace("|", "\\|").replace("\n", " ") for c in row]
        row_lines.append("| " + " | ".join(cells) + " |")
    return "\n".join([header_line, sep_line] + row_lines)


def render_dept_readme(slug: str, d: dict) -> str:
    return f"""# {d['display']}

**Department slug**: `{slug}`
**Owner**: {d['owner']}
**Objective**: {d['objective']}
**Business models**: {", ".join(d['business_models'])}
**AI priority**: {d['ai_priority']} · **ROI tier**: {d['roi_tier']}

Generated by `scripts/scaffold_insurance_depts.py` at {NOW}.
Re-run the scaffolder to regenerate this folder's INSUR_*.md artifacts.

## Quick links
- Demo story: [business-layer/INSUR_DEMO_STORY.md](business-layer/INSUR_DEMO_STORY.md)
- AS-IS 7-axis: [business-layer/INSUR_ASIS_ASSESSMENT.md](business-layer/INSUR_ASIS_ASSESSMENT.md)
- 4P DT strategy: [business-layer/INSUR_DT_STRATEGY.md](business-layer/INSUR_DT_STRATEGY.md)
- Process flow: [business-layer/INSUR_PROCESS_FLOW.md](business-layer/INSUR_PROCESS_FLOW.md)
- Architecture flow: [business-layer/INSUR_ARCHITECTURE_FLOW.md](business-layer/INSUR_ARCHITECTURE_FLOW.md)
- B2C / B2B / B2E flows: [business-layer/INSUR_BUSINESS_MODELS.md](business-layer/INSUR_BUSINESS_MODELS.md)
- Use cases: [business-layer/INSUR_USE_CASES.md](business-layer/INSUR_USE_CASES.md)
- Data management: [business-layer/INSUR_DATA_MGMT.md](business-layer/INSUR_DATA_MGMT.md)
- Incident management: [business-layer/INSUR_INCIDENT_MGMT.md](business-layer/INSUR_INCIDENT_MGMT.md)
- Department spec: [business-layer/INSUR_DEPT_SPEC.md](business-layer/INSUR_DEPT_SPEC.md)
- BRD: [docs/brd/INSUR_BRD.md](docs/brd/INSUR_BRD.md)
- FRD: [docs/frd/INSUR_FRD.md](docs/frd/INSUR_FRD.md)
- AI agents: [business-layer/INSUR_AI_AGENTS.md](business-layer/INSUR_AI_AGENTS.md)
- KPIs: [business-layer/INSUR_KPIS.md](business-layer/INSUR_KPIS.md)
"""


def render_demo_story(slug: str, d: dict) -> str:
    walkthrough_lines = []
    for i, (l1, l2, subs) in enumerate(d["process_hierarchy"][:6], 1):
        walkthrough_lines.append(f"{i}. **{l1} → {l2}** — {subs[0]} (and {len(subs)-1} more sub-steps)")
    walkthrough = "\n".join(walkthrough_lines)

    return f"""# Demo Story — {d['display']}

## Persona
**{d['persona']}**

## Scenario
Goal: {d['goal']}.
Main KPI: {d['main_kpi']}.

## Walkthrough (first 6 processes)
{walkthrough}

## Pitch (30 seconds)
> "{d['display']} is the {'highest' if d['roi_tier'] == 'Very High' else 'high'}-ROI surface for insurance AI. Today we operate {d['display'].lower()} on legacy tooling with manual workflows costing tens of millions annually in inefficiency + leakage. Our AI roadmap turns {d['process_hierarchy'][0][1].lower()} into a sub-second straight-through process, surfaces the right escalations to humans, and creates a full audit trail per regulatory requirements. Year-1 payback; 36-month NPV in the nine figures."

## Demo Script

{md_table(["Step", "Action", "Expected Screen", "Talking Point"], [
    ["1", f"Open /insur/{slug}/dashboard?role=manager", "Manager dashboard with 6-flavor scorecard", "Every sub-process governed across 6 AI flavors per §64.36"],
    ["2", "Click first L2 process card", "Process detail with IPO + sub-processes", "IPO + TODO + Task per §64.15"],
    ["3", "Open Simulation tab", "Side-by-side Manual vs Automatic", "Per §64.34 — 5-layer simulation"],
    ["4", "Open Agentic tab", "10-layer execution trace for a goal", "Per §64.40 — goal → council → plan → policy → CUA"],
    ["5", "Open Security tab", "Live logs + audit + PII inventory", "Per §64.32 + §68"],
    ["6", "Open Reports tab", "Role-scoped reports", "Per §64.37"],
])}

## Success Criteria (drill-able)

- [ ] Dashboard loads in < 2 sec
- [ ] All 6 flavors show a score (or N/A with reason)
- [ ] Simulation Auto-mode beats Manual on time + cost + error
- [ ] Agentic execution writes audit row per §38.3
- [ ] Security tab shows last-24h activity with tenant isolation

## Common Gotchas
- Pre-warm Ollama (`ollama pull llama3`) before demo
- Set `INSUR_DEMO_MODE=true` in `.env.template`
- Confirm Kaggle data downloaded (see INSUR_DATA_MGMT.md)
"""


def render_asis(slug: str, d: dict) -> str:
    rows = [[name, f"{tl} hrs/wk", er, ci, ppl, prc, prd, tech]
            for (name, tl, er, ci, ppl, prc, prd, tech) in d["as_is"]]
    total_cost = "—"
    return f"""# AS-IS Process Assessment (7-Axis) — {d['display']}

Owner: AI-Strategy role.
Per global §64.3 — every AS-IS process captured across 7 axes.

## Process Impact Matrix

{md_table(["Process", "Time Loss", "Error Rate", "Cost Impact", "Impact: People", "Impact: Process", "Impact: Productivity", "Impact: Technology"], rows)}

## Prioritized Automation Backlog (highest impact first)

{md_table(["Rank", "Process", "Estimated Cost Impact", "ROI Tier"], [
    [i+1, row[0], row[3], "Very High" if "M/yr" in row[3] else "High"]
    for i, row in enumerate(rows[:5])
])}

## Methodology

Per §64.3:
1. Score each row by `(time-loss × labor-rate + cost-impact) × error-multiplier`
2. Sort descending → prioritized automation backlog
3. Map each row to a sub-process in INSUR_DEPT_SPEC.md process hierarchy
4. Re-assess quarterly + diff vs last quarter

Next quarterly re-assessment: TBD
"""


def render_dt_strategy(slug: str, d: dict) -> str:
    p = d["dt_strategy"]
    def bullets(items): return "\n".join(f"- {i}" for i in items)
    return f"""# AI Digital Transformation Strategy (4P) — {d['display']}

Owner: AI-Strategy role.
Per global §64.4 — the 4P dimensions: People / Process / Profit / Technology.

## P1. People
{bullets(p['people'])}

## P2. Process
{bullets(p['process'])}

## P3. Profit
{bullets(p['profit'])}

## P4. Technology
{bullets(p['technology'])}

## Cross-cutting

| Dimension | AS-IS evidence | TO-BE target | Success metric |
|---|---|---|---|
| People | Manual workforce | AI-assisted workforce | Productivity per FTE |
| Process | Sequential | Event-driven + STP | STP rate, cycle time |
| Profit | High LAE + leakage | Reduced LAE + recovered leakage | LAE %, leakage $ |
| Technology | Monolithic legacy | Event-driven + AI native | Time to deploy a new rule / model |
"""


def render_process_flow(slug: str, d: dict) -> str:
    """Mermaid swimlane / flowchart per L2 process. Per operator 2026-06-01."""
    blocks = []
    for l1, l2, subs in d["process_hierarchy"]:
        sub_nodes = "\n".join(
            f'    {chr(65+i)}[{s}]' for i, s in enumerate(subs)
        )
        sub_edges = "\n".join(
            f'    {chr(65+i)} --> {chr(65+i+1)}'
            for i in range(len(subs)-1)
        )
        blocks.append(f"""### {l1} → {l2}

```mermaid
flowchart LR
{sub_nodes}
{sub_edges}
```
""")
    return f"""# Process Flow Diagrams — {d['display']}

Per operator 2026-06-01.
Mermaid flowcharts per L2 process. Each L2 → ordered L3 sub-process chain.

## L1 → L2 Process Hierarchy

```mermaid
flowchart TB
""" + "\n".join(
        f"    P{i}[{l1}] --> S{i}[{l2}]"
        for i, (l1, l2, _) in enumerate(d["process_hierarchy"])
    ) + "\n" + "\n".join(
        f"    S{i} --> S{i+1}"
        for i in range(len(d["process_hierarchy"])-1)
    ) + "\n```\n\n" + "\n".join(blocks) + f"""

## End-to-End Happy Path

```mermaid
sequenceDiagram
    participant Customer
    participant API as API Gateway
    participant Council as Council of Agents
    participant Planner as Planner Agent
    participant Tool as Domain Agents
    participant Audit as Decision Audit

    Customer->>API: Initiate {d["display"].lower()} request
    API->>Council: Goal interpretation
    Council->>Planner: Decompose to task DAG
    Planner->>Tool: Execute (1..N tasks)
    Tool->>Audit: Per-layer audit row
    Tool->>API: Final response
    API->>Customer: Result + citations
```
"""


def render_architecture_flow(slug: str, d: dict) -> str:
    """Mermaid C4 L2 architecture per dept. Per operator 2026-06-01."""
    return f"""# Architecture Flow — {d['display']}

Per operator 2026-06-01.
C4 L2 container diagram — services + agents + models that back this department.

## C4 L2 Container Diagram

```mermaid
flowchart TB
    subgraph Channels
        Web[Web Portal]
        Mobile[Mobile App]
        CC[Contact Center]
        Broker[Broker / Agent Portal]
    end

    subgraph Gateway
        API[API Gateway<br/>FastAPI]
        Auth[Auth + Tenant Middleware]
    end

    subgraph Orchestration
        Council[Council of Agents<br/>3-stage author/reviewer/chair]
        Planner[Planner Agent]
        Policy[Policy Engine<br/>OPA + scope grants]
    end

    subgraph "Domain Agents — {d['display']}"
{chr(10).join(f'        A{i}[{a}]' for i, a in enumerate(d["ai_agents"][:8]))}
    end

    subgraph Models
        LLM[LLM Layer<br/>Ollama / GPT / Claude]
        Embed[Embedding Model<br/>nomic-embed]
        ML[ML Models<br/>XGBoost / NN]
    end

    subgraph Memory
        Vector[Vector DB<br/>Pinecone / pgvector]
        Graph[Graph DB<br/>Neo4j]
        RAG[RAG Corpus<br/>Policy + Claims + KB]
    end

    subgraph Insurance Core
        Policy_Sys[Policy Admin System]
        Claims_Sys[Claims System]
        CRM[CRM]
        Billing[Billing]
        DMS[Document Mgmt]
    end

    subgraph Observability
        OTel[OpenTelemetry]
        Audit[Decision Audit §38.3]
        Logs[Structured Logs]
    end

    Channels --> Gateway
    Gateway --> Orchestration
    Orchestration --> "Domain Agents — {d['display']}"
    "Domain Agents — {d['display']}" --> Models
    "Domain Agents — {d['display']}" --> Memory
    "Domain Agents — {d['display']}" --> Insurance Core
    "Domain Agents — {d['display']}" --> Observability
```

## Component Inventory

| Layer | Component | Role | Owner |
|---|---|---|---|
| Channels | Web / Mobile / CC / Broker | Customer-facing entry | Frontend |
| Gateway | API Gateway (FastAPI) | HTTP + auth + tenant | Platform |
| Orchestration | Council / Planner / Policy | Goal → plan → policy gate | AI Platform |
| Domain | {len(d['ai_agents'])} agents | {d['display']} business logic | Domain |
| Models | LLM + Embed + ML | Foundation models | AI Platform |
| Memory | Vector + Graph + RAG | Retrieval substrate | Data Platform |
| Insurance Core | Policy / Claims / CRM / Billing / DMS | Systems of record | Core Platform |
| Observability | OTel + Audit + Logs | Trace + governance | SRE |

## Request Flow (single endpoint deep-dive)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant GW as API Gateway
    participant TM as Tenant Middleware
    participant CO as Council
    participant PL as Planner
    participant PO as Policy Engine
    participant DA as Domain Agent
    participant RAG as RAG Layer
    participant LLM as LLM
    participant AU as Audit

    U->>GW: POST /api/v1/insur/{slug}/execute
    GW->>TM: Validate X-Tenant-ID
    TM->>CO: Forward + request_id
    CO->>PL: Interpret + clarify
    PL->>PO: Decompose to task DAG
    PO->>PO: Allow / deny each task
    PO->>DA: Execute allowed tasks
    DA->>RAG: Retrieve context (top-k)
    DA->>LLM: Generate
    LLM->>DA: Response + citations
    DA->>AU: Write audit row
    DA->>GW: Result
    GW->>U: 200 + body + correlation_id
```

## Cross-Cutting Concerns

| Concern | Mechanism | Reference |
|---|---|---|
| AuthN / AuthZ | API key + tenant + RBAC | §47.6 SOC2 CC6.2 |
| Rate limiting | Per-tenant token bucket | §41.4 |
| Circuit breaker | 3-fail / 30s reset on every external call | §47 |
| Tracing | OpenTelemetry baggage carries request_id | §47.6 |
| Audit | Every decision → audit row | §38.3 |
| Explainability | SHAP / counterfactual on every model output | §48 |
"""


def render_business_models(slug: str, d: dict) -> str:
    """B2C / B2B / B2E (+ B2G if present) flows per dept. Per operator 2026-06-01."""
    sections = []
    for model, flow in d["business_model_flows"].items():
        happy_path_lines = "\n".join(f"{i+1}. {step}" for i, step in enumerate(flow["happy_path"]))
        exceptions_lines = "\n".join(f"- {e}" for e in flow["exceptions"])
        data_lines = "\n".join(f"- {ds}" for ds in flow["data_sources"])

        sections.append(f"""## {model} — {flow['scenario']}

**Channels**: {", ".join(flow["channels"])}

### Happy Path
{happy_path_lines}

### Exception Branches
{exceptions_lines}

### Data Sources
{data_lines}

### Mermaid Flow
```mermaid
sequenceDiagram
    participant {model}_User as {model} User
    participant Channel as {flow['channels'][0]}
    participant Agent as Domain Agent
    participant Audit as Decision Audit

    {model}_User->>Channel: Initiate request
    Channel->>Agent: Forward with context
    Agent->>Agent: Execute happy path
    Agent->>Audit: Write audit row
    Agent->>{model}_User: Result
```
""")

    return f"""# Business Model Flows (B2C / B2B / B2E / B2G) — {d['display']}

Per operator 2026-06-01.
Each business model gets a distinct scenario, channels, happy path, exceptions, and data sources.

Business models supported by this department: **{", ".join(d['business_models'])}**

""" + "\n".join(sections) + """

## Cross-model considerations

| Concern | B2C | B2B | B2E | B2G |
|---|---|---|---|---|
| Authentication | Customer auth (OTP / bio) | Broker license + appointment | SSO + RBAC | Mutual TLS + signed envelope |
| Audit depth | Per-decision audit row | Per-transaction + treaty link | Per-action + supervisor | Per-record + regulator-readable |
| Compliance gate | State DOI consumer rules | Commercial / multi-state | Internal policy + HR | Regulator-mandated SLA |
| Reporting cadence | On-demand | Quarterly broker scorecard | Daily ops dashboard | Per state requirement |
"""


def render_data_mgmt(slug: str, d: dict) -> str:
    sources_rows = [
        [name, f"`{slug_kg}`" if slug_kg else "—", desc, f"`data/insurance/{slug}/{name}/`"]
        for name, slug_kg, desc in d["data_sources"]
    ]
    return f"""# Data Management — {d['display']}

Per global §64.10 + §64.17 — input data sources + before/after viz per process + per sub-process.

## Data Sources (downloadable via Kaggle CLI per global §36)

{md_table(["Dataset name", "Kaggle slug", "Description", "Local path"], sources_rows)}

## Download Commands

```bash
# Per global §36 — Kaggle CLI is globally installed.
{chr(10).join(
    f"kaggle datasets download -d {slug_kg} -p data/insurance/{slug}/{name}/ --unzip"
    for name, slug_kg, _ in d["data_sources"] if slug_kg
)}
```

Run from project root. Reuses existing `scripts/download_kaggle_data.py` infrastructure.

## Master Data (SAP-style)

| Entity | Source System | Owner | Freshness SLA |
|---|---|---|---|
| Customer | CRM | CX | Real-time |
| Policy | Policy Admin | UW | Real-time |
| Claim | Claims System | Claims | Real-time |
| Vendor / Provider | Vendor Mgmt | Procurement | Daily |
| Adjuster / Agent | HR / Identity | HR | Daily |
| Product / Coverage | Product Catalog | Product | Per release |

## Transactional Data

| Entity | Source | Volume estimate |
|---|---|---|
| Claim transactions | Claims System | 1M / month |
| Policy transactions | Policy Admin | 500K / month |
| Payment transactions | Billing / Finance | 200K / month |
| Customer interactions | CRM + Contact Center | 2M / month |
| Decision audit rows | This system | per-decision |

## Condition Data (real-time context)

| Signal | Source | Use case |
|---|---|---|
| Weather | NOAA API | Catastrophe risk |
| Telematics | Device API | Auto risk scoring |
| Medical records | EHR (HIPAA-secured) | Health UW |
| Police reports | State LE feed | Claim verification |
| Credit bureau | Experian / Equifax | Underwriting |
| Watchlists | NICB / state DOI | Fraud screening |

## Before / After Preprocessing

Every ML/RAG pipeline run MUST save before/after pairs per global §64.7:

```
data/eval/{slug}/<pipeline-name>/<run_id>/plots/
├── before_distribution.png    after_distribution.png
├── before_correlation.png     after_correlation.png
├── before_missing.png         after_missing.png
├── before_target.png          after_target.png
└── before_outliers.png        after_outliers.png
```

Drill `tests/drills/drill_insurance_dept_artifacts.py` enforces existence per run.

## Data Quality Rules

Per global §40.6 — every dataset has rules:

- Customer table: customer_id NOT NULL, primary_email regex-valid, tenant_id mandatory
- Policy table: policy_number unique within tenant, effective_date ≤ expiry_date
- Claims table: claim_number unique, claim_date ≤ now()
- Fraud table: score ∈ [0, 1], confidence ∈ [0, 1]

PII redaction per global §47.6 SOC2 CC6.2 — default redacted; `?include_pii=1` requires audit row.
"""


def render_use_cases(slug: str, d: dict) -> str:
    """Top 10 use cases per dept extracted from process_hierarchy + ai_matrix."""
    rows = []
    for i, (l1, l2, subs) in enumerate(d["process_hierarchy"][:10], 1):
        if i <= len(d["ai_matrix"]):
            txn_ai, ana_ai, gen_ai, conv_ai = d["ai_matrix"][i-1][1:5]
        else:
            txn_ai = ana_ai = gen_ai = conv_ai = "TBD"
        rows.append([
            f"UC-{i:03d}",
            f"{l1} / {l2}",
            txn_ai, ana_ai, gen_ai, conv_ai,
            "Very High" if i <= 3 else "High",
        ])
    return f"""# Use Cases — {d['display']}

Per global §64.1 — per-dept use case catalog filtered from the enterprise master.

## Top 10 Use Cases (by ROI)

{md_table(["UC ID", "Process", "Transaction AI", "Analytical AI", "Generative AI", "Conversational AI", "ROI tier"], rows)}

## Use-Case Detail Template

```
UC-NNN — <name>
Description: <one-liner>
Persona: <who>
Trigger: <event>
Happy path: <5 steps>
Exception paths: <2-3>
Success metric: <KPI>
Reference data: <sources>
Reference agents: <agents>
```
"""


def render_incident_mgmt(slug: str, d: dict) -> str:
    sections = []
    for level, label, items in d["incident_levels"]:
        items_md = "\n".join(f"- [ ] {item}" for item in items)
        sections.append(f"""## {level} — {label}

{items_md}
""")
    return f"""# Incident Management — {d['display']}

Per global §64.5 — L1/L2/L3 + RAG-backed resolutions.

## Severity Matrix

| Severity | Example | MTTD target | MTTR target |
|---|---|---|---|
| P1 | System down / data breach / regulatory breach | {d['mttd_target']} | {d['mttr_target_p1']} |
| P2 | SME-needed escalation / partial outage | {d['mttd_target']} | {d['mttr_target_p2']} |
| P3 | Operational degradation | 1 hour | {d['mttr_target_p3']} |
| P4 | Cosmetic / non-blocking | 1 day | 1 week |

## Support Levels

| Level | Responsibility | First responder |
|---|---|---|
| L0 | Self-service (chatbot + RAG) | Customer |
| L1 | Help desk | Contact Center |
| L2 | Application support + domain SME | Claims / UW / Fraud team |
| L3 | Engineering / model owners | AI Platform |
| L4 | Vendor support | Vendor SaaS contracts |

""" + "\n".join(sections) + """

## RAG-Driven Resolutions

Every L1 issue has a runbook chunk indexed in the RAG corpus. When the chatbot or
support agent retrieves a chunk, the response carries citations per §48.5.

## Post-Incident Learning Loop

Every closed P1/P2 incident:
1. Loops back into the RAG corpus as a resolved case
2. Updates drill regression catalog per §43
3. Triggers retro per global §64.5
"""


def render_dept_spec(slug: str, d: dict) -> str:
    proc_rows = []
    for l1, l2, subs in d["process_hierarchy"]:
        for sub in subs:
            proc_rows.append([l1, l2, sub])

    return f"""# Department Spec — {d['display']}

The canonical reference for this department. Drives everything else.

## Overview

- **Owner**: {d['owner']}
- **Objective**: {d['objective']}
- **Business models**: {", ".join(d['business_models'])}
- **AI priority**: {d['ai_priority']}
- **ROI tier**: {d['roi_tier']}

## Stakeholder Matrix

{md_table(["Stakeholder", "Pain", "KPI", "AI Assistant"], [list(s) for s in d['stakeholders']])}

## Process Hierarchy (L1 → L2 → L3)

{md_table(["L1 Process", "L2 Process", "L3 Sub-Process"], proc_rows)}

## AI Capability Matrix (per L2)

{md_table(["Process", "Transaction AI", "Analytical AI", "Generative AI", "Conversational AI"], [list(r) for r in d['ai_matrix']])}

## AI Agent Inventory

{"\n".join(f"- {a}" for a in d['ai_agents'])}

## KPIs

{md_table(["KPI", "AS-IS", "TO-BE", "Change"], [list(k) for k in d['kpis']])}

## References

- Demo Story → [INSUR_DEMO_STORY.md](INSUR_DEMO_STORY.md)
- AS-IS Assessment → [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md)
- DT Strategy → [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md)
- Process Flow → [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md)
- Architecture → [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md)
- Business Models → [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md)
- BRD → [../docs/brd/INSUR_BRD.md](../docs/brd/INSUR_BRD.md)
- FRD → [../docs/frd/INSUR_FRD.md](../docs/frd/INSUR_FRD.md)
"""


def render_ai_agents(slug: str, d: dict) -> str:
    rows = [[f"AGT-{slug.upper()[:4]}-{i+1:03d}", a, "Domain agent", "Council + Planner"] for i, a in enumerate(d["ai_agents"])]
    return f"""# AI Agent Inventory — {d['display']}

{md_table(["Agent ID", "Agent name", "Role", "Orchestration pattern"], rows)}

## Composition per §64.40 (10-layer agentic stack)

Each agent in this dept fits into the 10-layer stack:

```
Layer 1: User Goal
Layer 2: Council of Agents (3-stage triage)
Layer 3: Planner Agent (decompose to DAG)
Layer 4: Task Decomposition
Layer 5: Policy / Governance
Layer 6: Computer-Using Agent (CUA)
Layer 7: Stagehand / Browser-Use
Layer 8: Playwright
Layer 9: Browser / Desktop / API
Layer 10: Insurance Core Systems
```

## Patterns Used (per §64.43)

| Pattern | Why |
|---|---|
| #1 Hub-and-Spoke | Worker fleet for parallel claim processing |
| #2 Council | Decision validation for high-severity cases |
| #4 Hierarchical | Multi-step user goal decomposition |
| #5 Blackboard | Shared memory across agents |
| #8 DAG Workflow | Conditional pipeline |
| #9 Debate | Risk validation on borderline decisions |
| #12 Mixture-of-Agents | Ensemble for high-stakes decisions |

## Required drills per agent (§43)

Each agent ships with:
- Health probe (§47.8 3-probe)
- Drill with ≥ 3 negative assertions (§43)
- Outcome metric (§55.3)
"""


def render_kpis(slug: str, d: dict) -> str:
    return f"""# KPI Catalog — {d['display']}

Main KPI: **{d['main_kpi']}**

## Targets

{md_table(["KPI", "AS-IS baseline", "TO-BE target", "Change"], [list(k) for k in d['kpis']])}

## Tracking

| Cadence | Stakeholder | Source |
|---|---|---|
| Real-time | Operations team | Live dashboard |
| Daily | Manager | Daily digest |
| Weekly | Executive | Weekly report |
| Monthly | Board | Monthly review |
| Quarterly | Reg / Audit | Quarterly filing |

Per global §38.3 — every KPI change traces back to a decision audit row.
"""


def render_brd(slug: str, d: dict) -> str:
    return f"""# Business Requirements Document (BRD) — {d['display']}

## 1. Executive Summary

{d['display']} transformation aims to {d['goal']}. Current state involves significant manual effort and risk leakage; target state delivers automation, AI augmentation, and full audit traceability.

## 2. Business Problem

| Pain | Cost | Source |
|---|---|---|
{chr(10).join(f"| {row[0]} | {row[3]} | AS-IS row |" for row in d['as_is'])}

## 3. Business Objectives

{chr(10).join(f"- **OBJ-{i+1:03d}**: {kpi[0]} from {kpi[1]} to {kpi[2]} ({kpi[3]})" for i, kpi in enumerate(d['kpis']))}

## 4. Scope

In-scope:
{chr(10).join(f"- {l1} (and {len(subs)} sub-processes)" for l1, l2, subs in d['process_hierarchy'])}

Out-of-scope:
- Adjacent department systems (covered by their own BRDs)
- Reinsurance treaty management (Risk Management dept)
- Customer acquisition / marketing (Marketing dept)

## 5. Stakeholders

{md_table(["Stakeholder", "Role", "KPI Owned"], [[s[0], s[1], s[2]] for s in d['stakeholders']])}

## 6. Business Models Supported

{md_table(["Model", "Scenario", "Channels"], [[model, flow['scenario'], ", ".join(flow['channels'])] for model, flow in d['business_model_flows'].items()])}

## 7. Constraints

- Regulatory: EU AI Act Art. 12 (logging ≥ 6mo), state DOI rate-filing approval, NICB reporting
- Privacy: HIPAA (health), GLBA (financial), state-specific PII rules
- Security: SOC2 Type II, ISO 27001, encryption AES-256
- Operational: 99.95% availability, p95 latency ≤ 5s

## 8. Success Criteria

{chr(10).join(f"- [ ] {kpi[0]} reaches {kpi[2]}" for kpi in d['kpis'])}

## 9. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Regulatory delay (rate filing) | High | Med | Engage compliance early; phased rollout |
| Model drift causing wrong decisions | High | Med | Continuous monitoring + drift detection (§53) |
| Adverse selection during transition | High | Low | Champion-challenger deployment |
| Adoption resistance (adjusters) | Med | High | Change mgmt program; copilot training |
| External data feed outage | Med | Med | Circuit breaker + cached fallback (§47) |

## 10. Approval

| Role | Name | Signed | Date |
|---|---|---|---|
| {d['owner']} | TBD | TBD | TBD |
| CIO / CTO | TBD | TBD | TBD |
| Chief Risk Officer | TBD | TBD | TBD |
| Compliance | TBD | TBD | TBD |
| Executive Sponsor | TBD | TBD | TBD |
"""


def render_frd(slug: str, d: dict) -> str:
    """Generate FRD with FR-XXX-NNN IDs per global §66.2."""
    prefix_map = {
        "claims": "CLM",
        "underwriting": "UWR",
        "customer-service": "CSV",
        "fraud-siu": "FRD",
    }
    prefix = prefix_map.get(slug, slug.upper()[:3])

    fr_rows = []
    fr_num = 1
    for l1, l2, subs in d["process_hierarchy"]:
        for sub in subs:
            fr_rows.append([
                f"FR-{prefix}-{fr_num:03d}",
                f"{l1} — {l2}",
                sub,
                "Functional",
                "Must",
                "User / System",
                "Inputs from upstream",
                "Outputs to downstream",
                "Per dept SLA",
                "Yes",
            ])
            fr_num += 1

    nfr_rows = [
        ["NFR-001", "Availability", "System availability", "99.95% uptime"],
        ["NFR-002", "Latency", "p95 latency", "≤ 5s for non-AI, ≤ 30s for AI inference"],
        ["NFR-003", "Throughput", "Concurrent users", "50,000"],
        ["NFR-004", "Scalability", "Horizontal scale-out", "Linear to 5x baseline"],
        ["NFR-005", "Security", "RBAC + ABAC", "SOC2 CC6.2 enforcement"],
        ["NFR-006", "Authentication", "SSO + MFA", "Mandatory for staff; OTP for customers"],
        ["NFR-007", "Encryption", "Data at rest + transit", "AES-256 + TLS 1.3"],
        ["NFR-008", "Audit", "Full traceability", "Per §38.3 audit row schema"],
        ["NFR-009", "Compliance", "Regulatory", "GDPR, HIPAA (where applicable), SOC2, EU AI Act"],
        ["NFR-010", "Hallucination", "AI output reliability", "< 2% hallucination rate"],
        ["NFR-011", "Explainability", "XAI for decisions", "Mandatory per §48"],
        ["NFR-012", "Fairness", "Disparate impact", "≥ 0.8 across protected classes"],
        ["NFR-013", "Human override", "HITL", "Mandatory for high-risk decisions"],
        ["NFR-014", "Logging", "Structured logs", "JSON + canonical fields (§57.6)"],
        ["NFR-015", "Observability", "Tracing + metrics + logs", "OpenTelemetry"],
    ]

    return f"""# Functional Requirements Document (FRD) — {d['display']}

Per global §66.2 — FR-IDs use the **{prefix}** prefix.

## Functional Requirements

{md_table(["FR ID", "Process", "Sub-Process", "Type", "Priority", "Actor", "Inputs", "Outputs", "SLA", "Audit"], fr_rows)}

## Non-Functional Requirements

{md_table(["NFR ID", "Category", "Requirement", "Target"], nfr_rows)}

## Acceptance Criteria (cross-FR)

- [ ] All functional requirements pass acceptance tests
- [ ] All NFRs pass load test (§47.10)
- [ ] All AI features pass eval gate (§59.4 ORF metrics)
- [ ] Decision audit row written for every regulated decision
- [ ] Explainability surface available via `/api/v1/explain?prediction_id=<id>`
- [ ] Fairness pre-deploy gate green
- [ ] Drill regression catalog passes (§43)

## Traceability

| FR ID prefix | Implementation surface | Drill | Owner |
|---|---|---|---|
| FR-{prefix}-001..N | `backend/routers/{slug}.py` + agents | `tests/drills/drill_{slug}.py` | Domain team |

Per global §51 forensic substrate — every code change implementing an FR must cite the FR ID in the commit body.
"""


def render_global_readme(slug: str, d: dict) -> str:
    return f"""# {d['display']} — GLOBAL_README

This folder fits into the global-ai-org structure at:

```
global-ai-org/
└── departments/
    └── {slug}/        ← you are here
        ├── README.md
        ├── GLOBAL_README.md   ← this file
        ├── business-layer/
        │   ├── INSUR_DEPT_SPEC.md
        │   ├── INSUR_DEMO_STORY.md
        │   ├── INSUR_ASIS_ASSESSMENT.md
        │   ├── INSUR_DT_STRATEGY.md
        │   ├── INSUR_PROCESS_FLOW.md
        │   ├── INSUR_ARCHITECTURE_FLOW.md
        │   ├── INSUR_BUSINESS_MODELS.md
        │   ├── INSUR_DATA_MGMT.md
        │   ├── INSUR_USE_CASES.md
        │   ├── INSUR_INCIDENT_MGMT.md
        │   ├── INSUR_AI_AGENTS.md
        │   └── INSUR_KPIS.md
        └── docs/
            ├── brd/INSUR_BRD.md
            └── frd/INSUR_FRD.md
```

## Composes with

- Global §63 (org structure) — this dept fills `departments/{slug}/`
- Global §64 (per-dept artifacts) — the 12 business-layer files implement this contract
- Global §66 (BRD/FRD) — the docs/brd + docs/frd folders implement this
- Global §48 (explainability) — every AI feature must surface SHAP / counterfactual / citation
- Global §43 (drills) — each agent + each FR has a paired drill

Generated by `scripts/scaffold_insurance_depts.py` at {NOW}.
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# Per global §64.37 — 15 mandatory roles per dept
ROLES = [
    "admin", "manager", "team-member", "tester", "security",
    "devops", "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect",
    "data-owner", "ai-strategy", "information-security",
]


# Per global §64.37.2 — role-specific dashboard focus
ROLE_DASHBOARD_FOCUS = {
    "admin": ("System health + user mgmt + RBAC events", "Daily ops digest"),
    "manager": ("Dept KPIs, ROI, approval queue, team performance", "Weekly business review"),
    "team-member": ("Personal queue, my tickets/cases, my SLA", "Daily my-work brief"),
    "tester": ("Test coverage, defect density, regression heatmap", "Pre-release test report"),
    "security": ("Threat counts, alert volume, MTTD/MTTR, vuln backlog", "Weekly security posture"),
    "devops": ("Deploy frequency, change-fail rate, MTTR, infra cost", "DORA weekly + monthly cost"),
    "ai-reviewer": ("Model accuracy drift, fairness, override rate", "Monthly model-card review"),
    "digital-transformation": ("AS-IS vs TO-BE progress, automation % per process", "Quarterly DT scorecard"),
    "system-architect": ("Service health, dependency graph, capacity vs forecast", "Monthly architecture review"),
    "test-architect": ("Test pyramid health, flaky-test count, coverage per service", "Quarterly test strategy"),
    "database-architect": ("Query latency, slow-query list, schema drift", "Weekly DB health"),
    "api-architect": ("API latency p95, error rate, version adoption", "Weekly API contract review"),
    "data-owner": ("Data quality, lineage gaps, freshness SLA, consumer count", "Monthly data steward report"),
    "ai-strategy": ("Automation backlog rank, AS-IS impact, ROI realized vs planned", "Quarterly DT strategy"),
    "information-security": ("Pen-test results, compliance gates, CVE backlog", "Monthly InfoSec report"),
}


def render_role_dashboard(slug: str, role: str, d: dict) -> str:
    focus, cadence = ROLE_DASHBOARD_FOCUS[role]
    return f"""# {d['display']} — {role} Dashboard

Per global §64.37 — role-scoped dashboard.

## Persona
**{role}** in {d['display']}.

## Focus
{focus}

## Tiles

| Tile | Metric | Target | Alert threshold |
|---|---|---|---|
| KPI tile 1 | {d['kpis'][0][0]} | {d['kpis'][0][2]} | < {d['kpis'][0][1]} |
| KPI tile 2 | {d['kpis'][1][0]} | {d['kpis'][1][2]} | < {d['kpis'][1][1]} |
| KPI tile 3 | {d['kpis'][2][0]} | {d['kpis'][2][2]} | < {d['kpis'][2][1]} |
| KPI tile 4 | {d['kpis'][3][0]} | {d['kpis'][3][2]} | < {d['kpis'][3][1]} |

## Charts

Per global §64.39 — apply the 4-category chart vocabulary:

- **Data analysis**: time-series line of {d['kpis'][0][0]} over 12 weeks
- **Management analysis**: KPI gauge for {d['kpis'][1][0]} with RAG status
- **Statistical analysis**: boxplot of variance vs target
- **Subjective analysis**: sentiment trend (where applicable)

## Filters
- Date range (last 7/30/90/365 days)
- Tenant
- Sub-process (drill from process_hierarchy)

## Refresh
{cadence}

## Permissions
Per global §47.6 SOC2 CC6.2 — role-scoped. PII redacted by default; `?include_pii=1` requires audit row.

## Actions
- Drill into any tile → row-level audit per §38.3
- Approve / escalate (where role permits)

## API
```
GET /api/v1/insur/dashboards/{slug}/{role}
```

## Endpoint contract
Returns 4-tile JSON per global §64.39.4 schema (chart_id, library, type, data, baseline, threshold, drill_url, refreshed_at).
"""


def render_role_reports(slug: str, role: str, d: dict) -> str:
    focus, cadence = ROLE_DASHBOARD_FOCUS[role]
    main_kpi = d['main_kpi']
    return f"""# {d['display']} — {role} Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — {d['display']} {role} digest
- **Purpose**: {focus}
- **Cadence**: {cadence}
- **Format**: PDF + email
- **Recipients**: {role} mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI ({main_kpi}) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: {role} + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: {role}
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/{slug}/{role}
POST /api/v1/insur/reports/{slug}/{role}/{{report_id}}/run
```
"""


def render_simulation_ui(slug: str, d: dict) -> str:
    """Per global §64.34 — Simulation UI spec per dept (manual vs auto, 5 layers visible)."""
    proc_names = [l2 for _, l2, _ in d["process_hierarchy"][:6]]
    return f"""# Simulation UI — {d['display']}

Per global §64.34 + operator 2026-06-01.

This dept's `/insur/{slug}/simulation` tab specification. Manual-mode + Automatic-mode
side-by-side with 5 layers visible per run.

## Tab path
`/insur/{slug}/simulation?process=<L2-process-name>`

## Available processes (L2)
{chr(10).join(f"- {p}" for p in proc_names)}

## The 5 mandatory visible layers (per §64.34.1)

| Layer | Manual mode | Automatic mode |
|---|---|---|
| **Backend** | Email + paper trails (no telemetry) | Every HTTP/DB/agent call with latency + status — live waterfall |
| **Process** | Actor switches with hand-offs; no timing | Step transitions with active-step highlight + duration |
| **Data** | Raw input only; mutation hidden | Step-by-step data card showing input → cleaned → enriched → predicted → audited |
| **Accuracy** | "Verified by reviewer" stamp | Per-step confidence gauge + accuracy vs ground truth |
| **Reporting** | Final outcome only | Per-run summary: time-saved, error-avoided, cost-saved, accuracy-gained vs Manual baseline |

## Side-by-side panel layout

```
┌───────────────────────────────────────────────────────────┐
│  Manual flow (AS-IS)        │  Automatic flow (TO-BE)    │
├─────────────────────────────┼─────────────────────────────┤
│  Step 1: human actor        │  Step 1: agent             │
│    {f'~15 min':12s}              │    ~200 ms                │
│  Step 2: human actor        │  Step 2: model + rule       │
│    {f'~25 min':12s} ❌ error      │    ~400 ms ✓             │
│  Step 3: queue              │  Step 3: auto-route         │
│    {f'~240 min wait':12s}         │    ~80 ms                │
├─────────────────────────────┼─────────────────────────────┤
│  Manual total: ~{f'{280} min':10s}      │  Auto total: ~{f'{0.68} sec':10s} │
│  Manual cost:  $135         │  Auto cost:  $0.03         │
│  Manual errors: 1           │  Auto errors: 0            │
└─────────────────────────────────────────────────────────────┘
```

## Backend API (§64.34.4)

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/insur/sim/{slug}/{{process}}/run` | Trigger sim; body: `{{mode, inputs, seed}}` |
| `GET /api/v1/insur/sim/{slug}/{{process}}/runs/{{sim_id}}/events` | SSE stream for live waterfall |
| `GET /api/v1/insur/sim/{slug}/{{process}}/runs/{{sim_id}}/manifest` | Per-layer summary + comparison report |
| `GET /api/v1/insur/sim/{slug}/{{process}}/runs/{{sim_id}}/replay` | Frame-by-frame replay of past run |

## Engine requirements (§64.34.3)

| Requirement | Detail |
|---|---|
| Replayable | Each run gets `simulation_id` + full event log; frame-by-frame |
| Deterministic seed | Same seed → same result across operators |
| Speed control | 0.25× / 1× / 4× / instant playback |
| Inputs configurable | Operator picks row from per-process dataset OR Faker synthesis |
| What-if mutations | Edit input field mid-flow → sensitivity probe |
| Audit-trail capture | `data/eval/sim/{slug}/<process>/<sim_id>/events.jsonl` |
| MLflow integration | Simulation run = MLflow run with 5-layer artifacts |

## Frontend stack (per global §14)

- Next.js App Router + vanilla CSS
- Server Component for the page shell + tab list
- Client Component for the side-by-side comparison panel (state for play/pause/speed)
- Mermaid renderer for the L2 process map
- Recharts for layer charts; Plotly for waterfall

## Composes with

- [INSUR_MANUAL_VS_AUTO_FLOW.md](INSUR_MANUAL_VS_AUTO_FLOW.md) — static doc; simulation tab is the **runnable** version
- [INSUR_PIPELINES.md](INSUR_PIPELINES.md) — Automatic-mode invokes registered pipelines
- [INSUR_AI_AGENTS.md](INSUR_AI_AGENTS.md) — Automatic-mode shows agent traces
- §38.3 — every sim run writes audit row keyed by `sim_id`
- §40 — confidence + HITL gate per step
- §43 — drill: Auto-mode produces M events; beats Manual on time + cost + error
- §47 — backend layer view IS the C4 L2 dynamic view per request

## Implementation status

- [x] Spec document (this file)
- [x] Backend pipeline runner: [backend/ml/insurance/run_dept_pipelines.py](../../../backend/ml/insurance/run_dept_pipelines.py)
- [ ] Frontend simulation tab (Next.js component) — future iteration
- [ ] SSE event stream wiring — future iteration
- [ ] MLflow run linkage — future iteration
"""


def render_system_design(slug: str, d: dict) -> str:
    """Per operator 2026-06-01: technical architect / internal flow / system design."""
    n_subs = sum(len(s) for _, _, s in d["process_hierarchy"])
    n_agents = len(d["ai_agents"])
    return f"""# System Design — {d['display']}

Per operator 2026-06-01: "technical architect, flow internal flow, system design".

Consolidated technical architecture for the {d['display']} dept. Pairs with
[INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md) (C4 L2 + sequence) and
extends it with internal-flow detail.

## 1. Architecture at a glance

| Layer | Component count | Tech |
|---|---|---|
| Channels | 4 (Web / Mobile / CC / Broker) | Next.js 14 + Twilio |
| Gateway | 1 (FastAPI) + tenant middleware + auth | FastAPI + Pydantic |
| Orchestration | 3 (Council + Planner + Policy) | Python + LangGraph |
| Domain agents | {n_agents} | Python + Ollama / LLM-router |
| ML pipelines | 3-5 | scikit-learn + XGBoost + sentence-transformers + ChromaDB |
| Insurance core | 5 (Policy / Claims / CRM / Billing / DMS) | External / synthetic for now |
| Observability | 3 (OTel + Audit table + structured logs) | OpenTelemetry + Postgres |

## 2. Internal flow (request lifecycle)

A single user-initiated request flows:

```mermaid
flowchart LR
    A[Channel] --> B[Gateway]
    B --> C[Tenant Middleware]
    C --> D{{Auth pass?}}
    D -->|no| E[401 + audit denial]
    D -->|yes| F[Council]
    F --> G[Planner]
    G --> H{{Plan emitted?}}
    H -->|no| I[Clarify / reject]
    H -->|yes| J[Policy Engine]
    J --> K{{All tasks allowed?}}
    K -->|no| L[Deny / HITL]
    K -->|yes| M[Domain Agents]
    M --> N[RAG]
    M --> O[ML Pipelines]
    M --> P[Insurance Core]
    M --> Q[Audit Row §38.3]
    M --> R[Response]
    R --> A
```

Every step writes to OpenTelemetry traces with `request_id` baggage propagated end-to-end (§47.6 + §57.6).

## 3. Process count (this dept)

- L1 processes: {len(d["process_hierarchy"])}
- L2 processes: {len(d["process_hierarchy"])}
- L3 sub-processes: {n_subs}
- Total addressable for automation: {n_subs}
- Currently automated (TO-BE target): 60-80% (per [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md))

## 4. Data flow

```mermaid
flowchart LR
    DS[(Data sources)] --> ING[Ingestion]
    ING --> CLN[Cleaning + validation]
    CLN --> FEAT[Feature engineering]
    FEAT --> SPLIT[Train/test split]
    SPLIT --> TRAIN[Model training]
    TRAIN --> EVAL[Eval: AUC / RMSE / Ragas / DeepEval]
    EVAL --> REG[Model registry]
    REG --> SERVE[Serving]
    SERVE --> AGENT[Domain Agents]
    AGENT --> AUDIT[Audit row]
    AGENT --> USER[User]
```

## 5. Component responsibilities

| Component | Owns | Does NOT own |
|---|---|---|
| Router (`backend/routers/insurance.py`) | HTTP only | No SQL, no business logic |
| Service (`backend/services/insurance_*.py`) | Business logic, exceptions | No HTTPException |
| Repository (`backend/repositories/*.py`) | All SQL, parameterized queries | No business logic |
| ML pipeline (`backend/ml/reference/*.py`) | Model lifecycle | No HTTP / no orchestration |
| Agents (`agents/*.py`) | Long-running execution | No HTTP entry |
| Workers (`backend/workers/tasks.py`) | Async orchestration | No HTTP entry |

(Per global §1 architecture standards table.)

## 6. State boundaries

| State | Lives in | Lifetime |
|---|---|---|
| Request context (request_id, tenant_id, actor) | OTel baggage | request |
| Decision audit row | Postgres `decision_audit` | 7 years (regulated) |
| Model + prompt versions | Registry table | forever (immutable) |
| Conversation memory | Redis | session TTL |
| Vector index | ChromaDB persistent | rebuild on corpus change |
| Idempotency cache | Postgres `idempotency` | 24h |

## 7. Failure-mode catalog (per dept top-5)

| Failure | Detection | Mitigation | Mitigation policy |
|---|---|---|---|
| External data feed down | Circuit breaker opens | Cached fallback | §47.7 |
| Model accuracy drift | Weekly eval gate | Retraining trigger | §53 |
| Tenant data leak | Drill: tenant A → ZERO tenant B rows | RLS at SQL boundary | §41.3 |
| LLM hallucination | Ragas faithfulness < 0.85 | Block answer; route to human | §48.5 + §59.4 |
| Scope-deny on action | Policy engine returns deny | Audit row + 403 | §64.40 layer 5 |

## 8. SLOs

| SLO | Target |
|---|---|
| Availability | 99.95% (per global §47.10) |
| Latency p95 (non-AI endpoint) | < 500ms |
| Latency p95 (AI inference) | < 30s |
| Throughput | 50K concurrent users |
| Mean time to detect (MTTD) | {d.get('mttd_target', '15 min')} |
| Mean time to recover P1 (MTTR) | {d.get('mttr_target_p1', '1 hr')} |

## 9. Capacity model

For peak claims/UW/CS day (e.g., CAT event or quarter-end):

| Component | Baseline | Peak | Scale strategy |
|---|---|---|---|
| API gateway | 100 req/s | 1000 req/s | Horizontal: docker-compose `backend --scale 5` |
| Worker fleet (Celery) | 4 workers | 40 workers | Horizontal: `worker --scale 10` |
| Agent fleet | 100 agents | 500 agents | Horizontal: `agents --scale 5` |
| Council agents | 3 | 12 | Horizontal: `council_agents --scale 4` |
| Postgres | 50 conn | 500 conn | PgBouncer pooling |
| Ollama | 1 GPU | 4 GPUs | GPU pool / vLLM upgrade |

## 10. Reference impls used

| Stage | Reference impl | Used by |
|---|---|---|
| Preprocessing | `full_lifecycle.py` | All dept pipelines |
| Tabular ML | `full_lifecycle.py` + `ensemble_compare.py` | All depts |
| NLP | `nlp_lifecycle.py` | CS + Claims (notes) |
| CV | `cv_lifecycle.py` | Claims (damage photos) |
| Time series | `timeseries_lifecycle.py` | UW (portfolio LR) |
| RAG | `rag_lifecycle.py` | All depts |
| Recommendation | `recommendation_lifecycle.py` | CS |
| Anomaly | `anomaly_lifecycle.py` | All depts |
| Fraud | `fraud_lifecycle.py` (synthetic ref) + `full_lifecycle.py` (real) | Claims + Fraud |
| Agent orchestration | `agent_orchestration.py` | Fraud (multi-agent investigation) |
| Simulation engine | `simulation_engine.py` | All depts |

## 11. Architecture decisions (ADRs)

To file for this dept:

- ADR — Ollama vs OpenAI for {d['display']} (cost + latency + data residency)
- ADR — Chunking strategy for {d['display']} RAG corpus (fixed / sentence / semantic-paragraph)
- ADR — Tenant isolation: row-level vs column-level
- ADR — Decision audit retention (7y regulated vs 1y default)
- ADR — Idempotency key TTL ({d['display']} retry storm pattern)

## 12. Composes with

- §38 (AI governance) — every decision is auditable
- §43 (drill) — every component has ≥3 negative-assertion drill
- §47 (architecture) — all 7 surfaces (C4 / ADR / JAD / Security / Rollout / Principles / Load)
- §48 (explainability) — every model carries SHAP / counterfactual / citation
- §53 (maturity) — 14-item enterprise rigor checklist
- §57 (production discipline) — 5-question runbook surfaces
- §64.27 (manual + auto flow + architecture) — this doc + [INSUR_MANUAL_VS_AUTO_FLOW.md](INSUR_MANUAL_VS_AUTO_FLOW.md) + [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md) jointly satisfy the §64.27 contract
"""


def render_manual_vs_auto_flow(slug: str, d: dict) -> str:
    """Per global §64.27 + operator 2026-06-01 — side-by-side manual vs automated flow per dept."""
    # Build manual swimlane from process hierarchy (human actors)
    # Build automated swimlane mapping each step to an agent + reference pipeline
    pipeline_modules = {
        "claims": ["full_lifecycle", "fraud_lifecycle", "rag_lifecycle", "anomaly_lifecycle"],
        "underwriting": ["full_lifecycle", "ensemble_compare", "rag_lifecycle"],
        "customer-service": ["full_lifecycle", "nlp_lifecycle", "anomaly_lifecycle"],
        "fraud-siu": ["fraud_lifecycle", "anomaly_lifecycle", "rag_lifecycle"],
    }.get(slug, [])

    # Pick first 6 L2 processes for comparison
    procs = d["process_hierarchy"][:6]

    manual_rows = [
        [l1, l2, "Human (CSR / Adjuster / UW / Investigator)", f"~{15*(i+1)} min",
         "Manual checklist + email", "Variable (skill-dependent)"]
        for i, (l1, l2, _) in enumerate(procs)
    ]
    auto_rows = [
        [l1, l2, f"AI Agent ({d['ai_matrix'][i][4] if i < len(d['ai_matrix']) else 'Specialist Agent'})",
         f"~{(i+1)*200} ms", f"`{pipeline_modules[i % max(len(pipeline_modules),1)]}`" if pipeline_modules else "agent_orchestration",
         "Deterministic + audited (§38.3)"]
        for i, (l1, l2, _) in enumerate(procs)
    ]

    manual_seq_lines = []
    for i, (l1, l2, _) in enumerate(procs):
        prev = "Customer" if i == 0 else f"Actor{i-1}"
        manual_seq_lines.append(f"    {prev}->>Actor{i}: hand off {l2}")

    auto_seq_lines = []
    for i, (l1, l2, _) in enumerate(procs):
        prev = "User" if i == 0 else f"Agent{i-1}"
        auto_seq_lines.append(f"    {prev}->>Agent{i}: invoke {l2} (sub-sec)")
        auto_seq_lines.append(f"    Agent{i}->>Audit: write audit row (§38.3)")

    manual_total_min = 15 * sum(range(1, len(procs) + 1))
    auto_total_ms = 200 * sum(range(1, len(procs) + 1))

    return f"""# Manual vs Automated Flow — {d['display']}

Per global §64.27 + operator 2026-06-01.
Side-by-side comparison of AS-IS (manual, human-driven) vs TO-BE (AI-driven, agentic) for the first 6 L2 processes.

## Side-by-side comparison table

### Manual (AS-IS)

{md_table(["L1", "L2", "Actor", "Duration", "Tools", "Quality"], manual_rows)}

**Total cycle time (Manual):** ~{manual_total_min} minutes
**Error rate:** Medium-to-High (per [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md))
**Audit trail:** Email + paper + spreadsheet (incomplete)
**Cost basis:** Fully-loaded labor cost per step

### Automated (TO-BE)

{md_table(["L1", "L2", "Agent", "Duration", "Reference pipeline", "Quality"], auto_rows)}

**Total cycle time (Automated):** ~{auto_total_ms} ms
**Error rate:** Low (model-monitored; drift detection per §53)
**Audit trail:** Per-decision audit row keyed by `request_id` (§38.3)
**Cost basis:** Token + compute + agent execution (~$0.01–0.10/transaction)

## Cycle-time delta

| Metric | Manual | Automated | Improvement |
|---|---|---|---|
| Total cycle | ~{manual_total_min} min | ~{auto_total_ms} ms | **~{manual_total_min*60_000//max(auto_total_ms,1):,}×** |
| Human touch-points | {len(procs)} | 0–1 (only HITL gates per §40) | **~{len(procs)}×** reduction |
| Per-transaction cost | $5–50 (labor) | $0.01–0.10 (compute) | **~50–500×** cheaper |
| Error rate | 8–15% | < 2% | **~5–8×** lower |
| Audit completeness | partial | 100% per §38.3 | **discrete to full** |

## Manual sequence

```mermaid
sequenceDiagram
    participant Customer
{chr(10).join(f"    participant Actor{i} as {l1} actor" for i, (l1, _, _) in enumerate(procs))}
{chr(10).join(manual_seq_lines)}
    Actor{len(procs)-1}->>Customer: result (eventually)
```

## Automated sequence

```mermaid
sequenceDiagram
    participant User
{chr(10).join(f"    participant Agent{i} as {l2} agent" for i, (_, l2, _) in enumerate(procs))}
    participant Audit
{chr(10).join(auto_seq_lines)}
    Agent{len(procs)-1}->>User: result + citations
```

## Run the automated pipeline

```bash
# List registered pipelines for this dept
python backend/ml/insurance/run_dept_pipelines.py --list

# Run all pipelines for this dept (smoke mode)
python backend/ml/insurance/run_dept_pipelines.py --all --dept {slug} --smoke

# Run a specific pipeline end-to-end
python backend/ml/insurance/run_dept_pipelines.py --dept {slug} --pipeline 1
```

Output lands at `data/eval/insurance/{slug}/pipeline_<id>/run-<ts>/` per global §64.7.

## Manual fallback

When the automated pipeline rejects (HITL gate / low confidence / scope-denied per §40), routing flows back to the manual sequence above. Per global §38 — the system cannot ship if no manual fallback exists for any automated step.

## Composes with

- [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md) — L1/L2/L3 process hierarchy
- [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md) — B2C / B2B / B2E channel-specific paths
- [INSUR_PIPELINES.md](INSUR_PIPELINES.md) — which reference impl maps to which step
- [INSUR_AI_AGENTS.md](INSUR_AI_AGENTS.md) — agent inventory + §64.43 patterns
- [INSUR_INCIDENT_MGMT.md](INSUR_INCIDENT_MGMT.md) — when automation fails, escalation path
"""


def render_pipelines(slug: str, d: dict) -> str:
    """Per global §64.20 — wire dept to backend/ml/reference/* pipelines."""
    # Dept-specific lifecycle picks based on data + use cases
    pipeline_map = {
        "claims": [
            ("Tabular ML — claim severity", "backend/ml/reference/full_lifecycle.py", "claims/auto_insurance_claims/insurance_claims.csv", "Predict claim severity + fraud_reported"),
            ("Fraud detection", "backend/ml/reference/fraud_lifecycle.py", "claims/vehicle_insurance_fraud/fraud_oracle.csv", "Detect suspicious claims"),
            ("RAG over policy + claims history", "backend/ml/reference/rag_lifecycle.py", "policy docs + claims/*", "Adjuster Copilot RAG"),
            ("Anomaly detection", "backend/ml/reference/anomaly_lifecycle.py", "claims/*.csv", "Surge / catastrophe detection"),
            ("NLP — claim notes", "backend/ml/reference/nlp_lifecycle.py", "claim notes corpus", "Note classification + sentiment"),
        ],
        "underwriting": [
            ("Tabular ML — risk scoring ensemble", "backend/ml/reference/full_lifecycle.py", "underwriting/medical_cost/insurance.csv", "Predict charges + risk class"),
            ("Ensemble compare", "backend/ml/reference/ensemble_compare.py", "underwriting/auto_insurance_underwriting/*.csv", "XGB vs RF vs LGBM"),
            ("RAG over UW manual + rate filings", "backend/ml/reference/rag_lifecycle.py", "UW manual corpus", "UW Copilot RAG"),
            ("Time-series — portfolio loss ratio", "backend/ml/reference/timeseries_lifecycle.py", "loss-ratio history", "Forecast LR by line"),
            ("DL — embedding-based risk", "backend/ml/reference/dl_lifecycle.py", "underwriting/*.csv", "NN risk scoring"),
        ],
        "customer-service": [
            ("NLP — intent + sentiment", "backend/ml/reference/nlp_lifecycle.py", "customer-service/customer_complaints/*.csv", "Intent classification + sentiment"),
            ("Customer churn", "backend/ml/reference/full_lifecycle.py", "customer-service/customer_churn/WA_Fn-UseC_-Telco-Customer-Churn.csv", "Predict churn"),
            ("RAG — KB + past resolutions", "backend/ml/reference/rag_lifecycle.py", "KB corpus", "Agent Copilot RAG"),
            ("Recommendation — next-best-action", "backend/ml/reference/recommendation_lifecycle.py", "interaction history", "Save offers"),
            ("Anomaly — call volume spikes", "backend/ml/reference/anomaly_lifecycle.py", "customer-service/call_center_data/Call Center Data.csv", "CAT / outage detection"),
        ],
        "fraud-siu": [
            ("Tabular fraud — credit-card benchmark", "backend/ml/reference/fraud_lifecycle.py", "fraud-siu/creditcard_fraud/creditcard.csv", "Imbalanced binary classification"),
            ("Tabular fraud — vehicle claim", "backend/ml/reference/fraud_lifecycle.py", "fraud-siu/vehicle_claim_fraud/fraud_oracle.csv", "Vehicle fraud detection"),
            ("Anomaly — behavioral", "backend/ml/reference/anomaly_lifecycle.py", "fraud-siu/auto_insurance_fraud/insurance_claims.csv", "Behavioral anomalies"),
            ("RAG — fraud playbooks + NICB bulletins", "backend/ml/reference/rag_lifecycle.py", "fraud playbook corpus", "Fraud Investigator Copilot"),
            ("Agent orchestration — investigation", "backend/ml/reference/agent_orchestration.py", "case workflow", "Multi-agent investigation"),
        ],
    }

    pipelines = pipeline_map.get(slug, [])
    rows = [[i+1, name, f"`{ref}`", f"`data/insurance/{dataset}`" if "/" in dataset and not dataset.startswith("backend/") else dataset, purpose]
            for i, (name, ref, dataset, purpose) in enumerate(pipelines)]

    return f"""# Pipeline Manifest — {d['display']}

Per global §64.20 — every dept must deploy ≥ 1 pipeline per applicable lifecycle type.

This dept wires the following existing reference pipelines at `backend/ml/reference/`:

{md_table(["#", "Pipeline", "Reference impl", "Input dataset", "Purpose"], rows)}

## Eval harness

Per global §59.4 — every AI feature MUST track:

| Metric | Threshold | Tool |
|---|---|---|
| Faithfulness | ≥ 0.85 | Ragas (installed) |
| Context precision | ≥ 0.75 | Ragas |
| Answer relevance | ≥ 0.80 | Ragas |
| Citation accuracy | 100% | Custom (§48.5) |
| Hallucination | < 2% | DeepEval (installed) |

## Tech stack used

| Concern | Tool | Status |
|---|---|---|
| Chunking + embedding | sentence-transformers + custom strategies | available in `rag_lifecycle.py` |
| Vector DB | ChromaDB | installed |
| Vector-less / keyword | TF-IDF + BM25-like rerank | in `rag_lifecycle.py` |
| Elasticsearch | — | NOT installed; defer or add adapter per §56 |
| RAG eval | Ragas | installed |
| LLM eval | DeepEval | installed |
| Workflow engine | temporal-io (python SDK) | installed |
| Tracing | OpenTelemetry | installed |
| LLM runtime | Ollama (gemma3:1b default) | available |
| Orchestration | LangGraph + native agent_orchestration.py | langchain installed |

## Run

```bash
# Run all pipelines for this dept (per global §43 drill + §38 audit)
python backend/ml/insurance/run_dept_pipelines.py --dept {slug}

# Run one pipeline
python backend/ml/insurance/run_dept_pipelines.py --dept {slug} --pipeline 1
```

## Output

Per global §64.7 — every run writes:

```
data/eval/{slug}/<pipeline-name>/<run_id>/
├── manifest.json
├── plots/
│   ├── before_distribution.png    after_distribution.png
│   ├── before_correlation.png     after_correlation.png
│   ├── before_missing.png         after_missing.png
│   └── ...
├── scores.json
├── eval.json (Ragas + DeepEval where applicable)
└── trace.json (OpenTelemetry spans)
```

Drill `tests/drills/drill_insurance_dept_artifacts.py` enforces presence of pipeline manifest.

## Composes with

- §38.3 (audit) — every pipeline run writes audit row keyed by `run_id`
- §43 (drill) — every pipeline has a paired drill in `tests/drills/`
- §47 (architecture) — pipelines run as Celery workers; results indexed for dashboard tiles
- §48 (explainability) — every model output carries SHAP / counterfactual / citations
- §57.6 (canonical fields) — request_id + tenant_id + actor on every log line
- §59.4 (ORF) — every AI pipeline gated on Ragas thresholds before merge
- §64.20 (10 lifecycle types) — this manifest implements the contract
- §64.36 (6-flavor scorecard) — surfaces per sub-process in role dashboards
"""



def nav_slug(value: str) -> str:
    """Return a lowercase dash slug suitable for INSUR_NAV.json."""
    chars = []
    prev_dash = False
    for ch in value.lower():
        if ch.isalnum():
            chars.append(ch)
            prev_dash = False
        elif not prev_dash:
            chars.append("-")
            prev_dash = True
    return "".join(chars).strip("-") or "item"


def render_nav(slug: str, d: dict) -> str:
    """Render the live navigator JSON consumed by frontend /insur/:departmentId."""
    tabs = ["Overview", "Inputs", "AI", "Outputs", "KPIs", "Governance"]
    left_nav = []
    for l1, l2, subs in d["process_hierarchy"]:
        process_slug = nav_slug(l1)
        sub_processes = []
        for sub in subs:
            sub_slug = nav_slug(sub)
            sub_processes.append({
                "slug": f"{process_slug}-{sub_slug}",
                "name": sub,
                "audiences": [a.lower() for a in d.get("business_models", ["B2C", "B2B", "B2E"]) if a in {"B2C", "B2B", "B2E"}],
                "tabs": tabs,
                "tab_content": {
                    "Overview": f"{sub} supports {l2} in {d['display']}.",
                    "Inputs": f"Primary inputs come from {d['display']} systems, customer/broker channels, documents, and external insurance data feeds.",
                    "AI": f"Relevant AI agents: {', '.join(d['ai_agents'][:4])}.",
                    "Outputs": f"Outputs include workflow decisions, recommendations, explanations, audit rows, and role dashboard signals for {d['display']}.",
                    "KPIs": d.get("main_kpi", "Cycle time, accuracy, cost, and service quality."),
                    "Governance": "Tenant-scoped, role-scoped, PII-redacted by default, and audited per decision.",
                },
            })
        left_nav.append({
            "slug": process_slug,
            "process": f"{l1} - {l2}",
            "sub_processes": sub_processes,
        })

    payload = {
        "department_id": slug,
        "display_name": d["display"],
        "owner": d["owner"],
        "objective": d["objective"],
        "business_models": d.get("business_models", []),
        "ai_priority": d.get("ai_priority"),
        "roi_tier": d.get("roi_tier"),
        "main_kpi": d.get("main_kpi"),
        "left_nav": left_nav,
    }
    return json.dumps(payload, indent=2) + "\n"


def scaffold_dept(slug: str, d: dict) -> int:
    dept_root = ROOT / slug
    bl = dept_root / "business-layer"
    docs = dept_root / "docs"

    files_written = 0

    # Dept-level
    w(dept_root / "README.md", render_dept_readme(slug, d))
    files_written += 1
    w(dept_root / "GLOBAL_README.md", render_global_readme(slug, d))
    files_written += 1
    w(dept_root / "INSUR_NAV.json", render_nav(slug, d))
    files_written += 1

    # business-layer/
    w(bl / "INSUR_DEPT_SPEC.md", render_dept_spec(slug, d))
    w(bl / "INSUR_DEMO_STORY.md", render_demo_story(slug, d))
    w(bl / "INSUR_ASIS_ASSESSMENT.md", render_asis(slug, d))
    w(bl / "INSUR_DT_STRATEGY.md", render_dt_strategy(slug, d))
    w(bl / "INSUR_PROCESS_FLOW.md", render_process_flow(slug, d))
    w(bl / "INSUR_ARCHITECTURE_FLOW.md", render_architecture_flow(slug, d))
    w(bl / "INSUR_BUSINESS_MODELS.md", render_business_models(slug, d))
    w(bl / "INSUR_DATA_MGMT.md", render_data_mgmt(slug, d))
    w(bl / "INSUR_USE_CASES.md", render_use_cases(slug, d))
    w(bl / "INSUR_INCIDENT_MGMT.md", render_incident_mgmt(slug, d))
    w(bl / "INSUR_AI_AGENTS.md", render_ai_agents(slug, d))
    w(bl / "INSUR_KPIS.md", render_kpis(slug, d))
    w(bl / "INSUR_PIPELINES.md", render_pipelines(slug, d))
    w(bl / "INSUR_MANUAL_VS_AUTO_FLOW.md", render_manual_vs_auto_flow(slug, d))
    w(bl / "INSUR_SIMULATION_UI.md", render_simulation_ui(slug, d))
    w(bl / "INSUR_SYSTEM_DESIGN.md", render_system_design(slug, d))
    files_written += 16

    # docs/
    w(docs / "brd" / "INSUR_BRD.md", render_brd(slug, d))
    w(docs / "frd" / "INSUR_FRD.md", render_frd(slug, d))
    files_written += 2

    # Role dashboards + reports per §64.37 (15 roles × 2 per dept)
    for role in ROLES:
        w(dept_root / "dashboards-by-role" / role / "INSUR_DASHBOARD.md",
          render_role_dashboard(slug, role, d))
        w(dept_root / "reports-by-role" / role / "INSUR_REPORTS.md",
          render_role_reports(slug, role, d))
        files_written += 2

    return files_written


def main() -> int:
    if not ROOT.exists():
        print(f"ERROR: global-ai-org not found at {ROOT}", file=sys.stderr)
        return 1

    total = 0
    for slug, d in INSURANCE_DEPTS.items():
        n = scaffold_dept(slug, d)
        print(f"  {slug}: {n} files written")
        total += n

    print(f"\nTotal: {total} files across {len(INSURANCE_DEPTS)} departments.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
