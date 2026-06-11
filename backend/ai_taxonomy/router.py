"""/api/v1/ai-taxonomy/* · §131 · Enterprise AI Taxonomy."""
from __future__ import annotations
from fastapi import APIRouter
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/ai-taxonomy", tags=["ai-taxonomy"])


# ════════════════════ 10 MEGA-DOMAINS ════════════════════
MEGA_DOMAINS = [
    {"id": 1,  "name": "Intelligence Layer",  "category_range": "1-10",
     "purpose": "Core intelligence capabilities · AGI · cognitive · memory"},
    {"id": 2,  "name": "Knowledge Layer",     "category_range": "11-14",
     "purpose": "Search · RAG · NLP · CV"},
    {"id": 3,  "name": "Interaction Layer",   "category_range": "15-18",
     "purpose": "Voice · multimodal · recommendation · personalization"},
    {"id": 4,  "name": "Decision Layer",      "category_range": "19-24",
     "purpose": "Prediction · forecasting · decision · optimization · simulation · digital twin"},
    {"id": 5,  "name": "Trust Layer",         "category_range": "25-35",
     "purpose": "Fraud · risk · security · privacy · safety · governance · explainability · compliance · audit · eval · obs"},
    {"id": 6,  "name": "Data Layer",          "category_range": "36-40",
     "purpose": "Monitoring · data · metadata · MDM · synthetic data"},
    {"id": 7,  "name": "Process Layer",       "category_range": "41-50",
     "purpose": "Workflow · process mining · decision workflow · HITL · meeting · contact center"},
    {"id": 8,  "name": "Business Layer",      "category_range": "51-58",
     "purpose": "Marketing · sales · service · HR · finance · procurement · supply chain · operations"},
    {"id": 9,  "name": "Operations Layer",    "category_range": "59-64",
     "purpose": "MLOps · LLMOps · AgentOps · RAGOps · DataOps · FinOps"},
    {"id": 10, "name": "Physical & Future Layer", "category_range": "65-100",
     "purpose": "Robotics · physical · edge · IoT · spatial · XR · scientific · vertical · quantum · enterprise · control tower"},
]


# ════════════════════ 100 CATEGORIES ════════════════════
CATEGORIES = [
    {"n": 1, "name": "Intelligence AI", "purpose": "Core intelligence", "examples": "AGI, Cognitive, Reactive, Memory"},
    {"n": 2, "name": "Learning AI", "purpose": "Learn from data", "examples": "ML, DL, RL, Transfer"},
    {"n": 3, "name": "Generative AI", "purpose": "Generate content", "examples": "LLM, SLM, Multimodal"},
    {"n": 4, "name": "Conversational AI", "purpose": "Human interaction", "examples": "Chatbot, Copilot"},
    {"n": 5, "name": "Agentic AI", "purpose": "Goal-driven execution", "examples": "Planner, Supervisor, Multi-Agent"},
    {"n": 6, "name": "Autonomous AI", "purpose": "End-to-end automation", "examples": "Autonomous Claims, HR"},
    {"n": 7, "name": "Reasoning AI", "purpose": "Logical thinking", "examples": "CoT, ToT, ReAct, Reflection"},
    {"n": 8, "name": "Planning AI", "purpose": "Task decomposition", "examples": "Strategic, Dynamic"},
    {"n": 9, "name": "Memory AI", "purpose": "Persistent context", "examples": "Episodic, Semantic, Vector"},
    {"n": 10, "name": "Knowledge AI", "purpose": "Enterprise knowledge", "examples": "Ontology, KG, Taxonomy"},
    {"n": 11, "name": "Search AI", "purpose": "Retrieval", "examples": "Semantic, Hybrid"},
    {"n": 12, "name": "RAG AI", "purpose": "Knowledge-grounded generation", "examples": "GraphRAG, Agentic RAG, Self-RAG"},
    {"n": 13, "name": "NLP AI", "purpose": "Text understanding", "examples": "NER, Classification, Summarization"},
    {"n": 14, "name": "Computer Vision AI", "purpose": "Image understanding", "examples": "OCR, Object Detection"},
    {"n": 15, "name": "Voice AI", "purpose": "Audio intelligence", "examples": "STT, TTS, Voice Bots"},
    {"n": 16, "name": "Multimodal AI", "purpose": "Multiple modalities", "examples": "Text+Image+Video"},
    {"n": 17, "name": "Recommendation AI", "purpose": "Personalized suggestions", "examples": "Collaborative Filtering"},
    {"n": 18, "name": "Personalization AI", "purpose": "Tailored experiences", "examples": "Customer Personalization"},
    {"n": 19, "name": "Prediction AI", "purpose": "Future forecasting", "examples": "Demand Forecasting"},
    {"n": 20, "name": "Forecasting AI", "purpose": "Time-series intelligence", "examples": "Revenue Forecasting"},
    {"n": 21, "name": "Decision AI", "purpose": "Decision making", "examples": "Decision Intelligence"},
    {"n": 22, "name": "Optimization AI", "purpose": "Best outcome selection", "examples": "Route Optimization"},
    {"n": 23, "name": "Simulation AI", "purpose": "Scenario analysis", "examples": "Monte Carlo"},
    {"n": 24, "name": "Digital Twin AI", "purpose": "Virtual replica", "examples": "Claims Twin, Factory Twin"},
    {"n": 25, "name": "Fraud AI", "purpose": "Fraud prevention", "examples": "Fraud Detection"},
    {"n": 26, "name": "Risk AI", "purpose": "Risk assessment", "examples": "Credit Risk"},
    {"n": 27, "name": "Security AI", "purpose": "Cyber protection", "examples": "Threat Detection"},
    {"n": 28, "name": "Privacy AI", "purpose": "PII protection", "examples": "Data Masking"},
    {"n": 29, "name": "Safety AI", "purpose": "Harm prevention", "examples": "AI Alignment"},
    {"n": 30, "name": "Governance AI", "purpose": "AI governance", "examples": "AI Control Tower"},
    {"n": 31, "name": "Explainability AI", "purpose": "Explain outcomes", "examples": "XAI"},
    {"n": 32, "name": "Compliance AI", "purpose": "Regulatory compliance", "examples": "GDPR, HIPAA"},
    {"n": 33, "name": "Audit AI", "purpose": "Audit trails", "examples": "Audit Intelligence"},
    {"n": 34, "name": "Evaluation AI", "purpose": "Quality measurement", "examples": "RAGAS, DeepEval"},
    {"n": 35, "name": "Observability AI", "purpose": "Runtime monitoring", "examples": "Langfuse, Phoenix"},
    {"n": 36, "name": "Monitoring AI", "purpose": "Production monitoring", "examples": "Drift Detection"},
    {"n": 37, "name": "Data AI", "purpose": "Data management", "examples": "Data Quality"},
    {"n": 38, "name": "Metadata AI", "purpose": "Metadata intelligence", "examples": "Cataloging"},
    {"n": 39, "name": "MDM AI", "purpose": "Master data intelligence", "examples": "Customer 360"},
    {"n": 40, "name": "Synthetic Data AI", "purpose": "Artificial data generation", "examples": "Synthetic Customers"},
    {"n": 41, "name": "Workflow AI", "purpose": "Process automation", "examples": "BPM AI"},
    {"n": 42, "name": "Process Mining AI", "purpose": "Process discovery", "examples": "Mining Workflows"},
    {"n": 43, "name": "Decision Workflow AI", "purpose": "Decision orchestration", "examples": "Approval Routing"},
    {"n": 44, "name": "Human-AI Collaboration", "purpose": "Human oversight", "examples": "HITL, HOTL"},
    {"n": 45, "name": "Collaboration AI", "purpose": "Team productivity", "examples": "Meeting AI"},
    {"n": 46, "name": "Content AI", "purpose": "Content creation", "examples": "Email AI, Marketing AI"},
    {"n": 47, "name": "Document AI", "purpose": "Document processing", "examples": "Invoice AI"},
    {"n": 48, "name": "Contract AI", "purpose": "Contract understanding", "examples": "Legal AI"},
    {"n": 49, "name": "Contact Center AI", "purpose": "Customer support", "examples": "Voice Agents"},
    {"n": 50, "name": "Meeting AI", "purpose": "Meeting intelligence", "examples": "Meeting Summaries"},
    {"n": 51, "name": "Marketing AI", "purpose": "Marketing optimization", "examples": "Campaign AI"},
    {"n": 52, "name": "Sales AI", "purpose": "Revenue growth", "examples": "Sales Copilot"},
    {"n": 53, "name": "Customer Service AI", "purpose": "Service automation", "examples": "Service Agents"},
    {"n": 54, "name": "HR AI", "purpose": "Workforce management", "examples": "Recruitment AI"},
    {"n": 55, "name": "Finance AI", "purpose": "Financial operations", "examples": "FP&A AI"},
    {"n": 56, "name": "Procurement AI", "purpose": "Vendor intelligence", "examples": "Supplier AI"},
    {"n": 57, "name": "Supply Chain AI", "purpose": "Logistics intelligence", "examples": "Demand Planning"},
    {"n": 58, "name": "Operations AI", "purpose": "Operational excellence", "examples": "AIOps"},
    {"n": 59, "name": "MLOps", "purpose": "ML lifecycle", "examples": "Model Deployment"},
    {"n": 60, "name": "LLMOps", "purpose": "LLM lifecycle", "examples": "Prompt Versioning"},
    {"n": 61, "name": "AgentOps", "purpose": "Agent lifecycle", "examples": "Agent Monitoring"},
    {"n": 62, "name": "RAGOps", "purpose": "RAG lifecycle", "examples": "Retrieval Monitoring"},
    {"n": 63, "name": "DataOps", "purpose": "Data lifecycle", "examples": "Data Pipelines"},
    {"n": 64, "name": "FinOps AI", "purpose": "Cost management", "examples": "GPU Cost Control"},
    {"n": 65, "name": "Robotics AI", "purpose": "Physical automation", "examples": "Industrial Robots"},
    {"n": 66, "name": "Physical AI", "purpose": "Real-world actions", "examples": "Embodied AI"},
    {"n": 67, "name": "Drone AI", "purpose": "Autonomous drones", "examples": "Inspection Drones"},
    {"n": 68, "name": "Edge AI", "purpose": "Edge inference", "examples": "Edge Vision"},
    {"n": 69, "name": "IoT AI", "purpose": "Connected intelligence", "examples": "Smart Sensors"},
    {"n": 70, "name": "Spatial AI", "purpose": "Spatial understanding", "examples": "Indoor Mapping"},
    {"n": 71, "name": "AR AI", "purpose": "Augmented Reality", "examples": "Smart Glasses"},
    {"n": 72, "name": "VR AI", "purpose": "Virtual Reality", "examples": "Training Simulations"},
    {"n": 73, "name": "XR AI", "purpose": "Mixed Experiences", "examples": "XR Platforms"},
    {"n": 74, "name": "Digital Human AI", "purpose": "Human-like avatars", "examples": "AI Avatars"},
    {"n": 75, "name": "Scientific AI", "purpose": "Research acceleration", "examples": "Drug Discovery"},
    {"n": 76, "name": "Healthcare AI", "purpose": "Clinical intelligence", "examples": "EEG AI"},
    {"n": 77, "name": "Bio AI", "purpose": "Biological intelligence", "examples": "Genomics"},
    {"n": 78, "name": "Climate AI", "purpose": "Environmental intelligence", "examples": "Weather Prediction"},
    {"n": 79, "name": "Geospatial AI", "purpose": "Location intelligence", "examples": "GIS Analytics"},
    {"n": 80, "name": "Satellite AI", "purpose": "Earth observation", "examples": "Remote Sensing"},
    {"n": 81, "name": "Manufacturing AI", "purpose": "Factory intelligence", "examples": "Predictive Maintenance"},
    {"n": 82, "name": "Banking AI", "purpose": "Banking-specific AI", "examples": "Credit Scoring"},
    {"n": 83, "name": "Insurance AI", "purpose": "Insurance-specific AI", "examples": "Claims AI"},
    {"n": 84, "name": "Retail AI", "purpose": "Retail intelligence", "examples": "Basket Analysis"},
    {"n": 85, "name": "Government AI", "purpose": "Public sector AI", "examples": "Citizen Services"},
    {"n": 86, "name": "Energy AI", "purpose": "Utilities intelligence", "examples": "Grid Optimization"},
    {"n": 87, "name": "Oil & Gas AI", "purpose": "Energy operations", "examples": "Reservoir Analytics"},
    {"n": 88, "name": "Telecom AI", "purpose": "Network intelligence", "examples": "Network Optimization"},
    {"n": 89, "name": "Education AI", "purpose": "Learning intelligence", "examples": "Adaptive Learning"},
    {"n": 90, "name": "Autonomous Enterprise AI", "purpose": "Self-operating enterprise", "examples": "Autonomous Department"},
    {"n": 91, "name": "AI Workforce", "purpose": "Digital employees", "examples": "Agent Workforce"},
    {"n": 92, "name": "Multi-Agent Systems", "purpose": "Agent societies", "examples": "Agent Swarm"},
    {"n": 93, "name": "Swarm AI", "purpose": "Collective intelligence", "examples": "Swarm Agents"},
    {"n": 94, "name": "World Model AI", "purpose": "Environment modeling", "examples": "Simulation Worlds"},
    {"n": 95, "name": "Causal AI", "purpose": "Cause-effect reasoning", "examples": "Root Cause Analysis"},
    {"n": 96, "name": "Neuro-Symbolic AI", "purpose": "Logic + Neural AI", "examples": "Hybrid Reasoning"},
    {"n": 97, "name": "Quantum AI", "purpose": "Quantum-enhanced AI", "examples": "Quantum ML"},
    {"n": 98, "name": "HPC AI", "purpose": "High-performance AI", "examples": "Large-scale Training"},
    {"n": 99, "name": "Enterprise AI Platform", "purpose": "Unified AI platform", "examples": "AI OS"},
    {"n": 100, "name": "AI Control Tower", "purpose": "Enterprise AI governance", "examples": "AI Portfolio Management"},
]


# ════════════════════ 200 AI TYPES (raw catalog) ════════════════════
AI_TYPES = [
    # Foundational (1-17)
    "Generative AI", "Predictive AI", "Prescriptive AI", "Descriptive AI", "Diagnostic AI",
    "Conversational AI", "Agentic AI", "Autonomous AI", "Responsible AI", "Explainable AI",
    "Ethical AI", "Cognitive AI", "Reactive AI", "Limited Memory AI", "Theory of Mind AI",
    "AGI", "ASI",
    # Learning (18-30)
    "Machine Learning", "Deep Learning", "Supervised Learning", "Unsupervised Learning",
    "Semi-Supervised Learning", "Self-Supervised Learning", "Reinforcement Learning", "RLHF",
    "Active Learning", "Online Learning", "Transfer Learning", "Federated Learning",
    "Foundation Models",
    # Language (31-34)
    "LLM", "SLM", "Multimodal AI", "Vision-Language Models",
    # Generation by modality (35-45)
    "Text-to-Image AI", "Text-to-Video AI", "Text-to-Audio AI", "Speech AI", "Voice AI",
    "OCR AI", "Document AI", "NLP AI", "NLU", "NLG", "Translation AI",
    # NLP capabilities (46-50)
    "Summarization AI", "Sentiment AI", "Entity Extraction AI", "Question Answering AI",
    "Information Retrieval AI",
    # Search & RAG (51-61)
    "Semantic Search AI", "Vector Search AI", "Hybrid Search AI", "RAG", "Agentic RAG",
    "GraphRAG", "Self-RAG", "Corrective RAG", "Adaptive RAG", "Multimodal RAG", "SQL RAG",
    # Knowledge & reasoning (62-75)
    "Knowledge Graph AI", "Ontology AI", "Taxonomy AI", "Semantic AI", "Reasoning AI",
    "Symbolic AI", "Neuro-Symbolic AI", "Causal AI", "Chain-of-Thought AI", "Tree-of-Thought AI",
    "Graph-of-Thought AI", "ReAct AI", "Reflection AI", "Planning AI",
    # Decision (76-78)
    "Decision Intelligence", "Business Rule AI", "Policy AI",
    # Simulation (79-81)
    "Simulation AI", "What-if AI", "Digital Twin AI",
    # Optimization (82-91)
    "Optimization AI", "Route Optimization AI", "Schedule Optimization AI", "Pricing AI",
    "Inventory AI", "Forecasting AI", "Time-Series AI", "Demand Forecasting AI",
    "Sales Forecasting AI", "Financial Forecasting AI",
    # Recommendation (92-96)
    "Recommendation AI", "Collaborative Filtering AI", "Content-Based Recommendation AI",
    "Hybrid Recommendation AI", "Personalization AI",
    # Trust (97-119)
    "Fraud Detection AI", "Anomaly Detection AI", "Risk Scoring AI", "AML AI", "Cybersecurity AI",
    "Threat Detection AI", "Intrusion Detection AI", "Adversarial AI", "AI Red Teaming",
    "AI Guardrails", "AI Safety", "AI Alignment", "Bias Detection AI", "Fairness AI",
    "Privacy AI", "PII Detection AI", "Compliance AI", "Audit AI", "Governance AI",
    "AI Control Tower", "Model Governance", "Agent Governance", "Data Governance AI",
    # Ops (120-126)
    "MLOps", "LLMOps", "AgentOps", "RAGOps", "DataOps AI", "AIOps", "FinOps AI",
    # Monitoring (127-137)
    "Model Monitoring AI", "Drift Detection AI", "AI Observability", "Evaluation AI",
    "Benchmarking AI", "Human Evaluation AI", "Synthetic Data AI", "Data Quality AI",
    "Data Observability AI", "Metadata AI", "Lineage AI",
    # CV (138-146)
    "Computer Vision AI", "Image Classification AI", "Object Detection AI", "Image Segmentation AI",
    "Video Analytics AI", "Medical Imaging AI", "Face Recognition AI", "Defect Detection AI",
    "Robotics AI",
    # Physical (147-159)
    "Physical AI", "Embodied AI", "Humanoid AI", "Drone AI", "Industrial Robotics AI",
    "Autonomous Vehicle AI", "Edge AI", "TinyML", "IoT AI", "Cloud AI", "Distributed AI",
    "HPC AI", "Quantum Machine Learning",
    # Spatial & XR (160-165)
    "Spatial AI", "AR AI", "VR AI", "MR AI", "XR AI", "World Models",
    # Vertical (166-200)
    "Scientific AI", "Healthcare AI", "Clinical AI", "EEG AI", "Neuro AI", "Bioinformatics AI",
    "Genomics AI", "Drug Discovery AI", "Materials AI", "Satellite AI", "Geospatial AI",
    "Climate AI", "Energy AI", "Oil & Gas AI", "Manufacturing AI", "Banking AI", "Insurance AI",
    "Retail AI", "Marketing AI", "Sales AI", "HR AI", "Recruitment AI", "Customer Service AI",
    "Contact Center AI", "Meeting AI", "Email AI", "Contract AI", "Legal AI", "Procurement AI",
    "Finance AI", "Supply Chain AI", "Autonomous Enterprise AI", "AI Workforce",
    "Multi-Agent Systems", "Agent Swarm AI",
]


# ════════════════════ CLAIMS DEPT = 60+ AI CAPABILITIES ════════════════════
CLAIMS_AI_CAPABILITIES = {
    "Analytics AI (5)":   ["Claim volume dashboards", "KPI reporting", "Trend analysis",
                            "Claim type analytics", "Location-based analytics"],
    "ML/DL (10)":         ["Fraud classifier", "Approval predictor", "Litigation predictor",
                            "Cost predictor", "Severity classifier", "Risk scorer", "Damage CNN",
                            "Fraud autoencoder", "Survival model (churn)", "Ranking model"],
    "NLP (10)":           ["NER (police reports)", "Entity extraction (claims)", "Sentiment",
                            "Summarization", "Translation", "Topic modeling", "Email triage",
                            "Letter generation", "Call transcript analysis", "Lawsuit risk"],
    "CV (10)":            ["Vehicle damage detection", "License plate OCR", "Document classification",
                            "Signature verification", "Driver license OCR", "Vehicle reg OCR",
                            "Accident scene segmentation", "Repair cost estimation",
                            "Body shop verification", "Adjuster photo QA"],
    "RAG (10)":           ["Policy GraphRAG", "Coverage RAG", "Regulation RAG", "Prior claims RAG",
                            "Repair price RAG", "SOP RAG", "Customer 360 RAG", "Adjuster assist RAG",
                            "Settlement letter RAG", "Compliance RAG"],
    "Agents (15)":        ["FNOL Agent", "Document Agent", "Fraud Agent", "Coverage Agent",
                            "Settlement Agent", "Payment Agent", "Audit Agent", "Compliance Agent",
                            "Customer Notify Agent", "Investigation Agent", "Recovery Agent",
                            "Recoveries Agent", "Reinsurance Agent", "Escalation Agent",
                            "Planner Agent"],
    "Governance (10)":    ["XAI for fraud", "Disparate impact monitor", "Bias audit",
                            "Decision audit log", "Right to explanation (EU AI Act Art 86)",
                            "Counterfactual generator", "Fairness reporter", "Model card publisher",
                            "Drift alerter", "Override tracker"],
    "Security (10)":      ["PII redaction (Presidio)", "PHI mask", "Document encryption",
                            "Adversarial input scan", "Prompt injection guard", "Output safety filter",
                            "Vault secrets", "OAuth2 SSO", "ABAC entity-level access",
                            "DDoS rate limiter"],
    "Evaluation (10)":    ["RAGAS faithfulness", "RAGAS context precision", "DeepEval hallucination",
                            "Promptfoo regression", "Human eval queue", "Citation accuracy check",
                            "Calibration eval", "Subject-wise CV", "Counterfactual eval",
                            "Statistical significance test"],
    "Operations (10)":    ["MLOps deploy", "LLMOps prompt registry", "AgentOps tracing",
                            "RAGOps retrieval health", "DataOps quality", "FinOps cost dashboard",
                            "Drift detection (OCR/ASR/Model)", "Capacity planner",
                            "GPU scheduler", "Circuit breaker"],
    "Decision (10)":      ["Auto-approve rules", "HITL routing", "Manager approval gate",
                            "Decision tree planner", "Confidence threshold gate",
                            "Counterfactual explainer", "Escalation router", "Compliance gate",
                            "Reserve setter", "Litigation triage"],
    "Optimization (5)":   ["Adjuster routing", "Inspection scheduling", "Repair shop matcher",
                            "Workload balancer", "Settlement amount optimizer"],
}


# ════════════════════ 20-LEVEL MATURITY MODEL ════════════════════
MATURITY = [
    {"level": 1,  "name": "Descriptive AI",     "question": "What happened?",
     "ai_types": ["Descriptive AI", "BI AI", "Analytics AI"]},
    {"level": 2,  "name": "Diagnostic AI",      "question": "Why did it happen?",
     "ai_types": ["Diagnostic AI", "Root Cause AI", "Causal AI"]},
    {"level": 3,  "name": "Predictive AI",      "question": "What will happen?",
     "ai_types": ["Predictive AI", "Time-Series AI", "Forecasting AI"]},
    {"level": 4,  "name": "Prescriptive AI",    "question": "What should we do?",
     "ai_types": ["Prescriptive AI", "Optimization AI", "Decision Intelligence"]},
    {"level": 5,  "name": "Computer Vision AI", "question": "What does the image show?",
     "ai_types": ["OCR AI", "Object Detection AI", "Image Classification AI", "Document AI"]},
    {"level": 6,  "name": "NLP AI",             "question": "What does the text mean?",
     "ai_types": ["NLP", "Entity Extraction", "Summarization", "Sentiment"]},
    {"level": 7,  "name": "Knowledge AI",       "question": "What does the company know?",
     "ai_types": ["Knowledge Graph AI", "Ontology AI", "Semantic AI"]},
    {"level": 8,  "name": "RAG AI",             "question": "What does grounded answer say?",
     "ai_types": ["RAG", "Hybrid Search", "GraphRAG"]},
    {"level": 9,  "name": "Recommendation AI",  "question": "What should we recommend?",
     "ai_types": ["Recommendation AI", "Personalization AI"]},
    {"level": 10, "name": "Fraud AI",           "question": "Is this fraud?",
     "ai_types": ["Fraud Detection AI", "Anomaly Detection AI", "Graph AI"]},
    {"level": 11, "name": "Agentic AI",         "question": "Can an agent do this?",
     "ai_types": ["Planner Agent", "Multi-Agent", "Tool-Using Agent"]},
    {"level": 12, "name": "Human Approval AI",  "question": "Does a human need to approve?",
     "ai_types": ["HITL", "Approval AI"]},
    {"level": 13, "name": "Generative AI",      "question": "Can AI write the response?",
     "ai_types": ["Generative AI", "Copilot AI"]},
    {"level": 14, "name": "Decision Intelligence","question": "What's the right decision?",
     "ai_types": ["Decision AI", "Policy AI", "Rule AI"]},
    {"level": 15, "name": "Simulation AI",      "question": "What if we changed X?",
     "ai_types": ["Scenario AI", "Monte Carlo AI", "Simulation AI"]},
    {"level": 16, "name": "Digital Twin AI",    "question": "Can we model the department?",
     "ai_types": ["Digital Twin AI"]},
    {"level": 17, "name": "Governance AI",      "question": "Is it compliant & fair?",
     "ai_types": ["Responsible AI", "Explainable AI", "Governance AI"]},
    {"level": 18, "name": "Security AI",        "question": "Is it secure?",
     "ai_types": ["Privacy AI", "Security AI", "Guardrail AI"]},
    {"level": 19, "name": "Observability AI",   "question": "Is it working in production?",
     "ai_types": ["Observability AI", "Evaluation AI"]},
    {"level": 20, "name": "Autonomous Dept AI", "question": "Does it run itself?",
     "ai_types": ["Autonomous Enterprise AI", "AI Workforce"]},
]


# ════════════════════ 6 DETAILED DOMAINS (operator's drop) ════════════════════
DETAILED_DOMAINS = {
    1: {"name": "Intelligence AI", "n_types": 33,
        "examples": ["Reactive", "Limited Memory", "Long-Term Memory", "Working Memory",
                      "Cognitive", "Context-Aware", "Adaptive", "Self-Learning", "Self-Correcting",
                      "Self-Improving", "Autonomous", "Agentic", "Collaborative",
                      "Collective Intelligence", "Swarm", "Distributed", "Embodied", "Spatial",
                      "Social", "Emotional", "Creative", "Strategic", "Operational", "Business",
                      "Decision", "Predictive", "Prescriptive", "Diagnostic", "Descriptive",
                      "Meta", "Hybrid", "AGI", "ASI"]},
    2: {"name": "Learning AI", "n_types": 80,
        "subdomains": ["ML (10+)", "Supervised (6+)", "Unsupervised (8+)",
                        "Semi-Supervised (4+)", "Self-Supervised (5+)", "DL (12+)",
                        "RL (8+)", "RLHF (6+)", "Transfer (7+)", "Continual (5+)",
                        "Active (4+)", "Online (4+)", "Federated (4+)", "Meta (5+)",
                        "Evolutionary (4+)", "Autonomous (6+)"]},
    3: {"name": "Reasoning AI", "n_types": 100,
        "subdomains": ["Logical (6+)", "Symbolic (6+)", "Causal (5+)", "Probabilistic (5+)",
                        "Mathematical (5+)", "Multi-Step CoT (5+)", "Tree-of-Thoughts (4+)",
                        "Graph (5+)", "ReAct (4+)", "Reflection (5+)", "Debate (4+)",
                        "Constitutional (4+)", "Scientific (4+)", "Legal (4+)",
                        "Financial (4+)", "Strategic (4+)", "Multi-Agent (5+)",
                        "Neuro-Symbolic (4+)", "Autonomous (4+)"]},
    4: {"name": "Planning AI", "n_types": 100,
        "subdomains": ["Goal (5+)", "Task (5+)", "Workflow (5+)", "Strategic (5+)",
                        "Tactical (5+)", "Operational (5+)", "Resource (5+)", "Scheduling (5+)",
                        "Dependency (4+)", "Hierarchical (4+)", "Dynamic (4+)",
                        "Agent (5+)", "Multi-Agent (5+)", "Tool (5+)", "Retrieval (5+)",
                        "Decision (4+)", "Scenario (4+)", "Autonomous (5+)", "Enterprise (5+)"]},
    5: {"name": "Memory AI", "n_types": 100,
        "subdomains": ["Working (5+)", "Short-Term (4+)", "Long-Term (4+)",
                        "Episodic (4+)", "Semantic (4+)", "Procedural (4+)", "Vector (3+)",
                        "Graph (3+)", "Agent (4+)", "Team/Shared (3+)", "Organizational (4+)",
                        "Temporal (3+)", "Personal (3+)", "Business (3+)", "Decision (3+)",
                        "Experience (3+)", "Retrieval (3+)", "Autonomous (4+)",
                        "Governance (4+)"]},
    6: {"name": "Knowledge AI", "n_types": 100,
        "subdomains": ["Knowledge Mgmt", "Knowledge Representation", "Knowledge Graph",
                        "Ontology Mgmt", "Taxonomy Mgmt", "Semantic Intelligence",
                        "Metadata Intelligence", "Master Data Intelligence",
                        "Relationship Intelligence", "Enterprise Knowledge", "Domain Knowledge",
                        "Expert Knowledge", "Knowledge Discovery", "Knowledge Reasoning",
                        "Knowledge Governance", "Knowledge Automation", "GraphRAG"]},
}


# ════════════════════ ENDPOINTS ════════════════════
@router.get("/domains")
def domains():
    return {**stamp(), "n_domains": len(MEGA_DOMAINS),
            "mega_domains": MEGA_DOMAINS, "spec": "§131"}


@router.get("/categories")
def categories():
    return {**stamp(), "n_categories": len(CATEGORIES),
            "categories": CATEGORIES, "spec": "§131"}


@router.get("/types")
def types():
    return {**stamp(), "n_types": len(AI_TYPES),
            "types": AI_TYPES, "spec": "§131 · all AI types catalog"}


@router.get("/claims-capabilities")
def claims_capabilities():
    total = sum(len(v) for v in CLAIMS_AI_CAPABILITIES.values())
    return {**stamp(), "department": "Claims",
            "n_categories": len(CLAIMS_AI_CAPABILITIES),
            "n_total_capabilities": total,
            "by_category": CLAIMS_AI_CAPABILITIES,
            "traditional_view": "Claims = Fraud Detection AI",
            "top_1pct_view": f"Claims = {total} AI capabilities working together",
            "spec": "§131 claims-as-system"}


@router.get("/maturity-model")
def maturity():
    return {**stamp(), "n_levels": len(MATURITY),
            "levels": MATURITY,
            "current_position": "Level 11 (Agentic AI) · operator at top-25%",
            "target": "Level 20 (Autonomous Dept AI) · top-1%",
            "spec": "§131 20-level model"}


@router.get("/domain/{n}")
def domain_detail(n: int):
    if n not in DETAILED_DOMAINS:
        return {"ok": False, "available": list(DETAILED_DOMAINS.keys())}
    return {**stamp(), "domain_n": n, "detail": DETAILED_DOMAINS[n],
            "spec": "§131 detailed domain drilldown"}


@router.get("/full-enterprise-counts")
def full_counts():
    """If a single dept has 60-100 AI capabilities · entire enterprise has 500-1000."""
    depts = ["Claims", "Underwriting", "Policy Admin", "Billing & Payments",
             "Contact Center", "Sales & Distribution", "Broker Management",
             "Actuarial", "Risk Management", "Legal & Compliance",
             "Finance", "HR", "Procurement"]
    per_dept = 80  # mid-point
    return {**stamp(), "n_departments": len(depts), "departments": depts,
            "ai_capabilities_per_dept": per_dept,
            "total_enterprise_capabilities": len(depts) * per_dept,
            "spec": "§131 enterprise AI capability counting"}


@router.get("/health")
def health():
    return {**stamp(), "module": "ai-taxonomy",
            "n_mega_domains": len(MEGA_DOMAINS),
            "n_categories": len(CATEGORIES),
            "n_types": len(AI_TYPES),
            "n_maturity_levels": len(MATURITY),
            "n_detailed_domains": len(DETAILED_DOMAINS),
            "spec": "§131"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Enterprise AI Taxonomy (Top-1% Architect View)",
            "endpoints": [
                "/domains              · 10 mega-domains",
                "/categories           · 100 categories",
                "/types                · 200 AI types catalog",
                "/claims-capabilities  · 110 Claims AI capabilities (vs 1 'fraud detection')",
                "/maturity-model       · 20-level model (Descriptive → Autonomous Dept)",
                "/domain/{n}           · detailed drilldown (1=Intelligence · 2=Learning · 3=Reasoning · 4=Planning · 5=Memory · 6=Knowledge)",
                "/full-enterprise-counts · 13 depts × 80 = 1040 enterprise AI capabilities",
            ],
            "headline":  "Top-1% view: Claims = 110 AI capabilities · NOT 1 'fraud detection'",
            "enterprise": "13 depts × ~80 capabilities = ~1,040 AI capabilities per insurance company",
            "spec": "§131"}
