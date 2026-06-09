"""AI tool registry · single source of truth.

Per docs/ENTERPRISE_AI_TOOL_LANDSCAPE.md (operator brief 2026-06-08).

Schema per tool: {id, name, category, role, alternatives, this_project_status,
                  priority, notes}

this_project_status:
  - 'used'         · tool wired into this codebase
  - 'scaffolded'   · partially wired (see file pointer)
  - 'reference'    · listed for interview-readiness · not used here
  - 'planned'      · scheduled for future adoption per PENDING_PLAN
"""
from __future__ import annotations

from typing import Any


# ─── Categories (25 layers per operator's master matrix) ──────────
CATEGORIES = [
    {"id": "ocr",            "name": "OCR",                       "phase": "data"},
    {"id": "parsing",        "name": "Document Parsing",          "phase": "data"},
    {"id": "chunking",       "name": "Chunking",                  "phase": "data"},
    {"id": "tokenization",   "name": "Tokenization",              "phase": "data"},
    {"id": "embedding",      "name": "Embedding Models",          "phase": "retrieval"},
    {"id": "vector_db",      "name": "Vector Database",           "phase": "retrieval"},
    {"id": "cache",          "name": "Cache",                     "phase": "retrieval"},
    {"id": "retrieval",      "name": "Retrieval",                 "phase": "retrieval"},
    {"id": "reranking",      "name": "Reranking",                 "phase": "retrieval"},
    {"id": "llm",            "name": "LLM (Inference)",           "phase": "inference"},
    {"id": "evaluation",     "name": "Evaluation",                "phase": "quality"},
    {"id": "guardrails",     "name": "Guardrails / Safety",       "phase": "quality"},
    {"id": "agent",          "name": "Agent Framework",           "phase": "agentic"},
    {"id": "workflow",       "name": "Workflow Orchestration",    "phase": "agentic"},
    {"id": "mcp",            "name": "MCP / Tool Protocol",       "phase": "agentic"},
    {"id": "memory",         "name": "Agent Memory",              "phase": "agentic"},
    {"id": "observability",  "name": "Observability",             "phase": "ops"},
    {"id": "security",       "name": "AI Security",               "phase": "ops"},
    {"id": "serving",        "name": "Model Serving",             "phase": "ops"},
    {"id": "scaling",        "name": "Scaling",                   "phase": "ops"},
    {"id": "deployment",     "name": "Deployment",                "phase": "ops"},
    {"id": "cicd",           "name": "CI / CD",                   "phase": "ops"},
    {"id": "training",       "name": "Distributed Training",      "phase": "training"},
    {"id": "speech",         "name": "Speech AI",                 "phase": "multimodal"},
    {"id": "multimodal",     "name": "Multimodal AI",             "phase": "multimodal"},
    {"id": "governance",     "name": "AI Governance / Registry",  "phase": "ops"},
]


# ─── Tools (~140 across 26 categories) ──────────────────────────
TOOLS: list[dict[str, Any]] = [
    # OCR
    {"id": "paddleocr",     "category": "ocr", "name": "PaddleOCR",     "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "Default OSS OCR"},
    {"id": "tesseract",     "category": "ocr", "name": "Tesseract",     "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "Classic OSS OCR"},
    {"id": "azure_di",      "category": "ocr", "name": "Azure Document Intelligence", "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "Forms · table aware"},
    {"id": "google_di",     "category": "ocr", "name": "Google Document AI",          "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "GCP lock-in"},
    {"id": "textract",      "category": "ocr", "name": "AWS Textract",   "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "AWS lock-in"},
    {"id": "ocrmypdf",      "category": "ocr", "name": "OCRmyPDF",       "role": "OCR", "this_project_status": "reference", "priority": "common", "notes": "PDF wrapper for Tesseract"},
    # Parsing
    {"id": "docling",       "category": "parsing", "name": "Docling",        "role": "Document parser", "this_project_status": "reference", "priority": "top",    "notes": "Tables + images · top 1% architect default"},
    {"id": "unstructured",  "category": "parsing", "name": "Unstructured",   "role": "Document parser", "this_project_status": "reference", "priority": "common", "notes": "General docs · OSS"},
    {"id": "llamaparse",    "category": "parsing", "name": "LlamaParse",     "role": "Document parser", "this_project_status": "reference", "priority": "top",    "notes": "Complex PDF · paid"},
    {"id": "marker",        "category": "parsing", "name": "Marker",         "role": "Document parser", "this_project_status": "reference", "priority": "common", "notes": "Research PDFs · fast"},
    # Chunking
    {"id": "recursive_splitter", "category": "chunking", "name": "Recursive Splitter", "role": "Chunking", "this_project_status": "reference", "priority": "common", "notes": "LangChain default"},
    {"id": "semantic_chunker",   "category": "chunking", "name": "Semantic Chunker",   "role": "Chunking", "this_project_status": "reference", "priority": "top",    "notes": "Meaning-based"},
    {"id": "raptor",             "category": "chunking", "name": "RAPTOR",             "role": "Chunking", "this_project_status": "reference", "priority": "top",    "notes": "Hierarchical retrieval"},
    {"id": "graphrag_chunker",   "category": "chunking", "name": "GraphRAG Chunking",  "role": "Chunking", "this_project_status": "reference", "priority": "top",    "notes": "Relationship retrieval"},
    {"id": "agentic_chunker",    "category": "chunking", "name": "Agentic Chunking",   "role": "Chunking", "this_project_status": "reference", "priority": "top",    "notes": "LLM-driven"},
    {"id": "late_chunking",      "category": "chunking", "name": "Late Chunking",      "role": "Chunking", "this_project_status": "reference", "priority": "top",    "notes": "Embedding-optimized"},
    # Tokenization
    {"id": "tiktoken",         "category": "tokenization", "name": "TikToken",         "role": "Tokenizer", "this_project_status": "reference", "priority": "top",    "notes": "OpenAI · default"},
    {"id": "sentencepiece",    "category": "tokenization", "name": "SentencePiece",    "role": "Tokenizer", "this_project_status": "reference", "priority": "top",    "notes": "Language-independent"},
    {"id": "hf_tokenizers",    "category": "tokenization", "name": "HuggingFace Tokenizers", "role": "Tokenizer", "this_project_status": "reference", "priority": "common", "notes": "Multi-format"},
    {"id": "wordpiece",        "category": "tokenization", "name": "WordPiece",        "role": "Tokenizer", "this_project_status": "reference", "priority": "common", "notes": "BERT family"},
    {"id": "bpe",              "category": "tokenization", "name": "BPE",              "role": "Tokenizer", "this_project_status": "reference", "priority": "common", "notes": "Base for many LLMs"},
    # Embedding
    {"id": "bge_m3",           "category": "embedding", "name": "BGE-M3",          "role": "Embedding model", "this_project_status": "reference", "priority": "top",    "notes": "Enterprise RAG default"},
    {"id": "voyageai",         "category": "embedding", "name": "VoyageAI",        "role": "Embedding model", "this_project_status": "reference", "priority": "top",    "notes": "High recall"},
    {"id": "openai_embed_3",   "category": "embedding", "name": "OpenAI text-embedding-3", "role": "Embedding model", "this_project_status": "reference", "priority": "common", "notes": "General purpose"},
    {"id": "e5_mistral",       "category": "embedding", "name": "E5-Mistral",      "role": "Embedding model", "this_project_status": "reference", "priority": "common", "notes": "OSS"},
    {"id": "instructor_xl",    "category": "embedding", "name": "Instructor XL",   "role": "Embedding model", "this_project_status": "reference", "priority": "common", "notes": "Instruction following"},
    {"id": "jina_embeddings",  "category": "embedding", "name": "Jina Embeddings", "role": "Embedding model", "this_project_status": "reference", "priority": "common", "notes": "Multilingual"},
    {"id": "cohere_embed",     "category": "embedding", "name": "Cohere Embed",    "role": "Embedding model", "this_project_status": "reference", "priority": "common", "notes": "Enterprise search"},
    # Vector DB
    {"id": "qdrant",           "category": "vector_db", "name": "Qdrant",          "role": "Vector DB", "this_project_status": "reference", "priority": "top",    "notes": "Top 1% architect default · 9.8/10"},
    {"id": "pinecone",         "category": "vector_db", "name": "Pinecone",        "role": "Vector DB", "this_project_status": "reference", "priority": "top",    "notes": "9.5/10 · SaaS"},
    {"id": "weaviate",         "category": "vector_db", "name": "Weaviate",        "role": "Vector DB", "this_project_status": "reference", "priority": "top",    "notes": "9.4/10"},
    {"id": "milvus",           "category": "vector_db", "name": "Milvus",          "role": "Vector DB", "this_project_status": "reference", "priority": "common", "notes": "9.3/10"},
    {"id": "elasticsearch",    "category": "vector_db", "name": "Elasticsearch",   "role": "Vector DB + Search", "this_project_status": "reference", "priority": "common", "notes": "9.1/10 · hybrid search"},
    {"id": "pgvector",         "category": "vector_db", "name": "pgvector",        "role": "Vector DB", "this_project_status": "planned",   "priority": "common", "notes": "PostgreSQL extension · already on Postgres 15"},
    {"id": "chromadb",         "category": "vector_db", "name": "ChromaDB",        "role": "Vector DB", "this_project_status": "reference", "priority": "common", "notes": "8.2/10 · OSS"},
    # Cache
    {"id": "redis",            "category": "cache", "name": "Redis",           "role": "Cache", "this_project_status": "reference", "priority": "top",    "notes": "Standard cache layer"},
    {"id": "dragonflydb",      "category": "cache", "name": "DragonflyDB",     "role": "Cache", "this_project_status": "reference", "priority": "common", "notes": "Redis-compatible"},
    {"id": "momento",          "category": "cache", "name": "Momento",         "role": "Cache", "this_project_status": "reference", "priority": "common", "notes": "Serverless"},
    {"id": "hazelcast",        "category": "cache", "name": "Hazelcast",       "role": "Cache", "this_project_status": "reference", "priority": "common", "notes": "Distributed"},
    # Retrieval
    {"id": "bm25",             "category": "retrieval", "name": "BM25",            "role": "Sparse retrieval", "this_project_status": "reference", "priority": "common", "notes": "Lexical baseline"},
    {"id": "hybrid_search",    "category": "retrieval", "name": "Hybrid Search",   "role": "Vector + BM25", "this_project_status": "reference", "priority": "top",    "notes": "Best-of-both default"},
    {"id": "graphrag",         "category": "retrieval", "name": "GraphRAG",        "role": "Graph retrieval", "this_project_status": "reference", "priority": "top",    "notes": "Relationship-aware"},
    {"id": "hyde",             "category": "retrieval", "name": "HyDE",            "role": "Query expansion", "this_project_status": "reference", "priority": "top",    "notes": "Hypothetical document"},
    {"id": "agentic_search",   "category": "retrieval", "name": "Agentic Search",  "role": "LLM-driven search", "this_project_status": "reference", "priority": "top",    "notes": "Multi-step retrieval"},
    # Reranking
    {"id": "mmr",              "category": "reranking", "name": "MMR",             "role": "Reranker", "this_project_status": "reference", "priority": "common", "notes": "Diversity-aware"},
    {"id": "bge_reranker",     "category": "reranking", "name": "BGE-Reranker",    "role": "Reranker", "this_project_status": "reference", "priority": "top",    "notes": "OSS leader"},
    {"id": "cohere_rerank",    "category": "reranking", "name": "Cohere Rerank",   "role": "Reranker", "this_project_status": "reference", "priority": "top",    "notes": "Enterprise SaaS"},
    {"id": "colbert",          "category": "reranking", "name": "ColBERT",         "role": "Reranker", "this_project_status": "reference", "priority": "common", "notes": "Research grade"},
    {"id": "cross_encoder",    "category": "reranking", "name": "Cross Encoder",   "role": "Reranker", "this_project_status": "reference", "priority": "common", "notes": "High accuracy"},
    # LLM
    {"id": "gpt_4o",           "category": "llm", "name": "GPT-4o",          "role": "LLM", "this_project_status": "reference", "priority": "top",    "notes": "OpenAI flagship"},
    {"id": "claude",           "category": "llm", "name": "Claude (3.5/4)",  "role": "LLM", "this_project_status": "reference", "priority": "top",    "notes": "Anthropic"},
    {"id": "gemini",           "category": "llm", "name": "Gemini",          "role": "LLM", "this_project_status": "reference", "priority": "top",    "notes": "Google"},
    {"id": "llama_3",          "category": "llm", "name": "Llama 3",         "role": "LLM", "this_project_status": "reference", "priority": "top",    "notes": "Meta OSS"},
    {"id": "qwen",             "category": "llm", "name": "Qwen",            "role": "LLM", "this_project_status": "reference", "priority": "common", "notes": "Alibaba OSS"},
    {"id": "deepseek",         "category": "llm", "name": "DeepSeek",        "role": "LLM", "this_project_status": "reference", "priority": "common", "notes": "Strong reasoning"},
    {"id": "mistral",          "category": "llm", "name": "Mistral",         "role": "LLM", "this_project_status": "reference", "priority": "common", "notes": "OSS · multilingual"},
    {"id": "webllm",           "category": "llm", "name": "WebLLM",          "role": "Browser LLM", "this_project_status": "scaffolded", "priority": "top", "notes": "§91 · browser-native LLM · backend/webllm_cdp_rag_langgraph/"},
    # Evaluation
    {"id": "ragas",            "category": "evaluation", "name": "RAGAS",           "role": "RAG eval", "this_project_status": "planned", "priority": "top", "notes": "Faithfulness + context P/R"},
    {"id": "deepeval",         "category": "evaluation", "name": "DeepEval",        "role": "LLM eval", "this_project_status": "planned", "priority": "top", "notes": "Toxicity + bias + consistency"},
    {"id": "g_eval",           "category": "evaluation", "name": "G-Eval",          "role": "LLM eval", "this_project_status": "planned", "priority": "top", "notes": "GPT-based eval"},
    {"id": "trulens",          "category": "evaluation", "name": "TruLens",         "role": "Eval + explainability", "this_project_status": "planned", "priority": "common", "notes": "Trace + eval"},
    {"id": "promptfoo",        "category": "evaluation", "name": "Promptfoo",       "role": "Prompt testing", "this_project_status": "planned", "priority": "common", "notes": "A/B prompts"},
    {"id": "ares",             "category": "evaluation", "name": "ARES",            "role": "Automated eval", "this_project_status": "reference", "priority": "common", "notes": "Auto-eval"},
    {"id": "openai_evals",     "category": "evaluation", "name": "OpenAI Evals",    "role": "Benchmark", "this_project_status": "reference", "priority": "common", "notes": "Benchmarking"},
    # Guardrails
    {"id": "nemo_guardrails",  "category": "guardrails", "name": "NeMo Guardrails", "role": "Conversational rails", "this_project_status": "planned",   "priority": "top",    "notes": "Top architect default"},
    {"id": "lakera",           "category": "guardrails", "name": "Lakera",          "role": "Prompt injection",     "this_project_status": "planned",   "priority": "top",    "notes": "SaaS · prompt injection"},
    {"id": "rebuff",           "category": "guardrails", "name": "Rebuff",          "role": "Injection detection", "this_project_status": "reference", "priority": "common", "notes": "OSS"},
    {"id": "llama_guard",      "category": "guardrails", "name": "Llama Guard",     "role": "Safety classifier",   "this_project_status": "reference", "priority": "common", "notes": "Meta OSS"},
    {"id": "guardrails_ai",    "category": "guardrails", "name": "Guardrails AI",   "role": "Output validation",   "this_project_status": "reference", "priority": "common", "notes": "Validation framework"},
    {"id": "shieldgemma",      "category": "guardrails", "name": "ShieldGemma",     "role": "Content safety",      "this_project_status": "reference", "priority": "common", "notes": "Google"},
    {"id": "internal_dlp",     "category": "guardrails", "name": "Internal DLP (this project)", "role": "PII pattern reject", "this_project_status": "used", "priority": "top", "notes": "5-shape DLP gate · marketing_campaigns/services._dlp_scan"},
    # Agent frameworks
    {"id": "langgraph",        "category": "agent", "name": "LangGraph",       "role": "Agent workflow", "this_project_status": "scaffolded", "priority": "top",    "notes": "§91 · enterprise production default"},
    {"id": "crewai",           "category": "agent", "name": "CrewAI",          "role": "Multi-agent",    "this_project_status": "reference",  "priority": "top",    "notes": "Role-based"},
    {"id": "autogen",          "category": "agent", "name": "AutoGen",         "role": "Multi-agent",    "this_project_status": "reference",  "priority": "top",    "notes": "Microsoft · conversations"},
    {"id": "semantic_kernel",  "category": "agent", "name": "Semantic Kernel", "role": "Agent",          "this_project_status": "reference",  "priority": "common", "notes": "MS ecosystem"},
    {"id": "pydantic_ai",      "category": "agent", "name": "PydanticAI",      "role": "Typed agent",    "this_project_status": "reference",  "priority": "common", "notes": "Pydantic-native"},
    {"id": "google_adk",       "category": "agent", "name": "Google ADK",      "role": "Agent",          "this_project_status": "reference",  "priority": "common", "notes": "GCP ecosystem"},
    {"id": "openai_agents_sdk","category": "agent", "name": "OpenAI Agents SDK","role": "Agent",         "this_project_status": "reference",  "priority": "common", "notes": "OpenAI native"},
    {"id": "smolagents",       "category": "agent", "name": "SmolAgents",      "role": "Lightweight",    "this_project_status": "reference",  "priority": "common", "notes": "Minimalist"},
    {"id": "openhands",        "category": "agent", "name": "OpenHands",       "role": "Coding agent",   "this_project_status": "reference",  "priority": "top",    "notes": "Autonomous SWE · OSS"},
    {"id": "openclaw",         "category": "agent", "name": "OpenClaw",        "role": "Personal assistant", "this_project_status": "reference", "priority": "common", "notes": "Self-hosted"},
    {"id": "paperclip",        "category": "agent", "name": "Paperclip",       "role": "Org-level mgmt", "this_project_status": "reference",  "priority": "top",    "notes": "AI workforce governance"},
    {"id": "internal_autonomous_agent", "category": "agent", "name": "Internal Autonomous Agent (this project)", "role": "Rule-based decision loop", "this_project_status": "used", "priority": "top", "notes": "marketing_campaigns/autonomous_agent.py · per §57.7"},
    # Workflow
    {"id": "temporal",         "category": "workflow", "name": "Temporal",        "role": "Durable workflow", "this_project_status": "reference", "priority": "top",    "notes": "Long-running · top architect default"},
    {"id": "airflow",          "category": "workflow", "name": "Airflow",         "role": "Data pipelines",   "this_project_status": "reference", "priority": "top",    "notes": "Apache · standard"},
    {"id": "prefect",          "category": "workflow", "name": "Prefect",         "role": "Python-native",    "this_project_status": "reference", "priority": "common", "notes": "Modern DAG"},
    {"id": "dagster",          "category": "workflow", "name": "Dagster",         "role": "Data eng",         "this_project_status": "reference", "priority": "common", "notes": "Asset-based"},
    {"id": "camunda",          "category": "workflow", "name": "Camunda",         "role": "BPMN",             "this_project_status": "reference", "priority": "common", "notes": "Enterprise BPMN"},
    {"id": "argoworkflows",    "category": "workflow", "name": "Argo Workflows",  "role": "K8s native",       "this_project_status": "reference", "priority": "common", "notes": "Kubernetes-native"},
    {"id": "internal_cron",    "category": "workflow", "name": "Internal cron + run_due_*", "role": "Cron executor", "this_project_status": "used", "priority": "top", "notes": "11 weekly audits + 2 continuous executors"},
    # MCP
    {"id": "mcp",              "category": "mcp", "name": "MCP",                "role": "Tool protocol",    "this_project_status": "scaffolded", "priority": "top",    "notes": "§91 · canonical tool protocol"},
    {"id": "a2a",              "category": "mcp", "name": "A2A",                "role": "Agent comm",       "this_project_status": "reference",  "priority": "top",    "notes": "Agent-to-agent"},
    {"id": "acp",              "category": "mcp", "name": "ACP",                "role": "Agent comm",       "this_project_status": "reference",  "priority": "common", "notes": "Agent comm protocol"},
    {"id": "openapi_tools",    "category": "mcp", "name": "OpenAPI Tools",      "role": "Tool spec",        "this_project_status": "reference",  "priority": "common", "notes": "OpenAPI-as-tools"},
    # Memory
    {"id": "mem0",             "category": "memory", "name": "Mem0",            "role": "Agent memory", "this_project_status": "reference", "priority": "top",    "notes": "Top architect default"},
    {"id": "zep",              "category": "memory", "name": "Zep",             "role": "Agent memory", "this_project_status": "reference", "priority": "top",    "notes": "Long-term"},
    {"id": "letta",            "category": "memory", "name": "Letta",           "role": "Agent memory", "this_project_status": "reference", "priority": "common", "notes": "Letta (was MemGPT)"},
    {"id": "langmem",          "category": "memory", "name": "LangMem",         "role": "Agent memory", "this_project_status": "reference", "priority": "common", "notes": "LangChain-native"},
    # Observability
    {"id": "opentelemetry",    "category": "observability", "name": "OpenTelemetry",  "role": "Tracing",       "this_project_status": "scaffolded", "priority": "top",    "notes": "Industry standard"},
    {"id": "langfuse",         "category": "observability", "name": "Langfuse",       "role": "LLM observability", "this_project_status": "planned",   "priority": "top",    "notes": "OSS · top architect default"},
    {"id": "langsmith",        "category": "observability", "name": "LangSmith",      "role": "LLM observability", "this_project_status": "reference", "priority": "common", "notes": "LangChain SaaS"},
    {"id": "phoenix",          "category": "observability", "name": "Phoenix",        "role": "RAG observability", "this_project_status": "planned",   "priority": "top",    "notes": "Arize · RAG-focused"},
    {"id": "agentops",         "category": "observability", "name": "AgentOps",       "role": "Agent monitoring", "this_project_status": "reference", "priority": "common", "notes": "Agent-focused"},
    {"id": "helicone",         "category": "observability", "name": "Helicone",       "role": "LLM observability", "this_project_status": "reference", "priority": "common", "notes": "Proxy-based"},
    {"id": "jaeger",           "category": "observability", "name": "Jaeger",         "role": "Distributed trace", "this_project_status": "reference", "priority": "common", "notes": "OSS · CNCF"},
    {"id": "prometheus",       "category": "observability", "name": "Prometheus",     "role": "Metrics",       "this_project_status": "reference", "priority": "top",    "notes": "Standard"},
    {"id": "grafana",          "category": "observability", "name": "Grafana",        "role": "Dashboards",    "this_project_status": "reference", "priority": "top",    "notes": "Standard"},
    {"id": "elk",              "category": "observability", "name": "ELK / Loki",     "role": "Log aggregation", "this_project_status": "reference", "priority": "top",    "notes": "Logs"},
    {"id": "internal_digest",  "category": "observability", "name": "Internal weekly_audit_digest (this project)", "role": "Cron audit aggregator", "this_project_status": "used", "priority": "top", "notes": "scripts/weekly_audit_digest.py · 11 audits"},
    # Security
    {"id": "presidio",         "category": "security", "name": "Presidio",        "role": "PII detection",   "this_project_status": "planned",   "priority": "top",    "notes": "Microsoft OSS · top default"},
    {"id": "garak",            "category": "security", "name": "Garak",           "role": "AI red teaming",  "this_project_status": "planned",   "priority": "top",    "notes": "NVIDIA OSS · LLM attacks"},
    {"id": "protect_ai",       "category": "security", "name": "Protect AI",      "role": "Model security",  "this_project_status": "reference", "priority": "common", "notes": "SaaS"},
    {"id": "hiddenlayer",      "category": "security", "name": "HiddenLayer",     "role": "AI security",     "this_project_status": "reference", "priority": "common", "notes": "SaaS"},
    {"id": "falco",            "category": "security", "name": "Falco",           "role": "Runtime security", "this_project_status": "reference", "priority": "common", "notes": "K8s runtime"},
    {"id": "trivy",            "category": "security", "name": "Trivy",           "role": "Container scan",  "this_project_status": "reference", "priority": "common", "notes": "Aqua OSS"},
    {"id": "gitleaks",         "category": "security", "name": "Gitleaks",        "role": "Secret scan",     "this_project_status": "reference", "priority": "common", "notes": "Pre-commit secrets"},
    {"id": "snyk",             "category": "security", "name": "Snyk",            "role": "Vuln scan",       "this_project_status": "reference", "priority": "common", "notes": "Dep scan"},
    # Serving
    {"id": "vllm",             "category": "serving", "name": "vLLM",            "role": "LLM serving",     "this_project_status": "reference", "priority": "top",    "notes": "Top architect default"},
    {"id": "tgi",              "category": "serving", "name": "TGI",             "role": "HF serving",      "this_project_status": "reference", "priority": "top",    "notes": "HuggingFace"},
    {"id": "tensorrt_llm",     "category": "serving", "name": "TensorRT-LLM",    "role": "NVIDIA optim",    "this_project_status": "reference", "priority": "top",    "notes": "NVIDIA-specific"},
    {"id": "triton",           "category": "serving", "name": "Triton Inference Server", "role": "Multi-model serving", "this_project_status": "reference", "priority": "top",    "notes": "NVIDIA"},
    {"id": "sglang",           "category": "serving", "name": "SGLang",          "role": "Agentic inference", "this_project_status": "reference", "priority": "common", "notes": "Structured gen"},
    {"id": "ollama",           "category": "serving", "name": "Ollama",          "role": "Local dev",       "this_project_status": "reference", "priority": "common", "notes": "Dev/test"},
    {"id": "lmdeploy",         "category": "serving", "name": "LMDeploy",        "role": "High throughput", "this_project_status": "reference", "priority": "common", "notes": "Throughput-focused"},
    # Scaling
    {"id": "kuberay",          "category": "scaling", "name": "KubeRay",         "role": "Ray on K8s",      "this_project_status": "reference", "priority": "top",    "notes": "Top architect default"},
    {"id": "ray_serve",        "category": "scaling", "name": "Ray Serve",       "role": "Serving",         "this_project_status": "reference", "priority": "top",    "notes": "GPU scheduling"},
    {"id": "keda",             "category": "scaling", "name": "KEDA",            "role": "Event-driven autoscale", "this_project_status": "reference", "priority": "common", "notes": "Event-based"},
    {"id": "hpa",              "category": "scaling", "name": "HPA",             "role": "K8s autoscale",   "this_project_status": "reference", "priority": "common", "notes": "Horizontal pod autoscaler"},
    {"id": "istio",            "category": "scaling", "name": "Istio",           "role": "Service mesh",    "this_project_status": "reference", "priority": "common", "notes": "Mesh + policy"},
    # Deployment
    {"id": "kubernetes",       "category": "deployment", "name": "Kubernetes",      "role": "Container orchestration", "this_project_status": "reference", "priority": "top",    "notes": "Standard"},
    {"id": "openshift",        "category": "deployment", "name": "OpenShift",       "role": "Enterprise K8s", "this_project_status": "reference", "priority": "common", "notes": "RedHat"},
    {"id": "eks",              "category": "deployment", "name": "AWS EKS",         "role": "Managed K8s",   "this_project_status": "reference", "priority": "common", "notes": "AWS"},
    {"id": "aks",              "category": "deployment", "name": "Azure AKS",       "role": "Managed K8s",   "this_project_status": "reference", "priority": "common", "notes": "Azure"},
    {"id": "gke",              "category": "deployment", "name": "GKE",             "role": "Managed K8s",   "this_project_status": "reference", "priority": "common", "notes": "GCP"},
    {"id": "docker_compose",   "category": "deployment", "name": "Docker Compose",  "role": "Local/dev orchestration", "this_project_status": "used", "priority": "common", "notes": "docker-compose.yml · used for local dev"},
    # CI/CD
    {"id": "github_actions",   "category": "cicd", "name": "GitHub Actions", "role": "CI",  "this_project_status": "used", "priority": "top", "notes": ".github/workflows/audits.yml · 12 hard-fail steps"},
    {"id": "harness",          "category": "cicd", "name": "Harness",       "role": "AI-native CI/CD", "this_project_status": "reference", "priority": "top",    "notes": "12 AI agents"},
    {"id": "argocd",           "category": "cicd", "name": "ArgoCD",        "role": "GitOps CD",     "this_project_status": "reference", "priority": "top",    "notes": "Pull-based"},
    {"id": "jenkins",          "category": "cicd", "name": "Jenkins",       "role": "CI/CD",         "this_project_status": "reference", "priority": "common", "notes": "Legacy"},
    # Training
    {"id": "axolotl",          "category": "training", "name": "Axolotl",        "role": "Fine-tuning framework", "this_project_status": "reference", "priority": "top",    "notes": "OSS"},
    {"id": "unsloth",          "category": "training", "name": "Unsloth",        "role": "Fast fine-tune",       "this_project_status": "reference", "priority": "top",    "notes": "2-5x speedup"},
    {"id": "trl",              "category": "training", "name": "TRL (HF)",       "role": "RLHF/DPO",             "this_project_status": "reference", "priority": "top",    "notes": "HuggingFace"},
    {"id": "deepspeed",        "category": "training", "name": "DeepSpeed",      "role": "Distributed training", "this_project_status": "reference", "priority": "top",    "notes": "ZeRO-1/2/3"},
    {"id": "fsdp",             "category": "training", "name": "FSDP",           "role": "Sharded training",     "this_project_status": "reference", "priority": "top",    "notes": "PyTorch native"},
    {"id": "megatron_lm",      "category": "training", "name": "Megatron-LM",    "role": "Large scale training", "this_project_status": "reference", "priority": "top",    "notes": "NVIDIA"},
    {"id": "mlflow",           "category": "training", "name": "MLflow",         "role": "Experiment tracking",  "this_project_status": "reference", "priority": "top",    "notes": "OSS · top default"},
    {"id": "wandb",            "category": "training", "name": "Weights & Biases", "role": "Experiment tracking", "this_project_status": "reference", "priority": "top",    "notes": "SaaS"},
    # Speech
    {"id": "whisper",          "category": "speech", "name": "Whisper",        "role": "ASR",  "this_project_status": "reference", "priority": "top", "notes": "OpenAI OSS"},
    {"id": "deepgram",         "category": "speech", "name": "Deepgram",       "role": "ASR SaaS", "this_project_status": "reference", "priority": "common", "notes": "Real-time"},
    {"id": "assemblyai",       "category": "speech", "name": "AssemblyAI",     "role": "ASR SaaS", "this_project_status": "reference", "priority": "common", "notes": "Transcription"},
    {"id": "elevenlabs",       "category": "speech", "name": "ElevenLabs",     "role": "TTS",      "this_project_status": "reference", "priority": "top",    "notes": "Top TTS SaaS"},
    {"id": "xtts",             "category": "speech", "name": "XTTS",           "role": "TTS",      "this_project_status": "reference", "priority": "common", "notes": "Coqui OSS · voice cloning"},
    {"id": "bark",             "category": "speech", "name": "Bark",           "role": "TTS",      "this_project_status": "reference", "priority": "common", "notes": "Multi-language"},
    {"id": "vall_e",           "category": "speech", "name": "VALL-E",         "role": "TTS",      "this_project_status": "reference", "priority": "common", "notes": "Microsoft research"},
    {"id": "polyai",           "category": "speech", "name": "PolyAI",         "role": "Voice agent platform", "this_project_status": "reference", "priority": "top", "notes": "Enterprise voice + contact center"},
    # Multimodal
    {"id": "clip",             "category": "multimodal", "name": "CLIP",          "role": "Image embedding", "this_project_status": "reference", "priority": "top",    "notes": "OpenAI · standard"},
    {"id": "siglip",           "category": "multimodal", "name": "SigLIP",        "role": "Image embedding", "this_project_status": "reference", "priority": "common", "notes": "Google · sigmoid loss"},
    {"id": "llava",            "category": "multimodal", "name": "LLaVA",         "role": "VLM",           "this_project_status": "reference", "priority": "top",    "notes": "OSS VLM"},
    {"id": "qwen_vl",          "category": "multimodal", "name": "Qwen-VL",       "role": "VLM",           "this_project_status": "reference", "priority": "common", "notes": "Alibaba"},
    {"id": "video_llava",      "category": "multimodal", "name": "Video-LLaVA",   "role": "Video AI",      "this_project_status": "reference", "priority": "common", "notes": "Video reasoning"},
    {"id": "blip",             "category": "multimodal", "name": "BLIP",          "role": "Image captioning", "this_project_status": "reference", "priority": "common", "notes": "Salesforce"},
    {"id": "stable_diffusion", "category": "multimodal", "name": "Stable Diffusion / SDXL", "role": "Image generation", "this_project_status": "reference", "priority": "top", "notes": "Image gen"},
    {"id": "flux",             "category": "multimodal", "name": "Flux",          "role": "Image generation", "this_project_status": "reference", "priority": "common", "notes": "High quality"},
    # Governance
    {"id": "opa",              "category": "governance", "name": "OPA",           "role": "Policy engine",       "this_project_status": "reference", "priority": "top",    "notes": "Top default"},
    {"id": "mlflow_registry",  "category": "governance", "name": "MLflow Registry", "role": "Model registry",     "this_project_status": "reference", "priority": "top",    "notes": "OSS"},
    {"id": "datahub",          "category": "governance", "name": "DataHub",       "role": "Data catalog",        "this_project_status": "reference", "priority": "common", "notes": "OSS"},
    {"id": "fairlearn",        "category": "governance", "name": "Fairlearn",     "role": "Fairness assessment", "this_project_status": "reference", "priority": "top",    "notes": "Microsoft OSS"},
    {"id": "shap",             "category": "governance", "name": "SHAP",          "role": "Explainability",      "this_project_status": "reference", "priority": "top",    "notes": "Game-theoretic"},
    {"id": "lime",             "category": "governance", "name": "LIME",          "role": "Explainability",      "this_project_status": "reference", "priority": "common", "notes": "Local interpretable"},
    {"id": "responsible_ai_toolkit", "category": "governance", "name": "Responsible AI Toolkit", "role": "AI governance", "this_project_status": "reference", "priority": "top", "notes": "Microsoft"},
    {"id": "collibra",         "category": "governance", "name": "Collibra",      "role": "Data governance",     "this_project_status": "reference", "priority": "common", "notes": "Enterprise SaaS"},
    {"id": "openlineage",      "category": "governance", "name": "OpenLineage",   "role": "Data lineage",        "this_project_status": "reference", "priority": "common", "notes": "OSS standard"},
    {"id": "feast",            "category": "governance", "name": "Feast",         "role": "Feature store",       "this_project_status": "reference", "priority": "top",    "notes": "OSS · top default"},
]


# ─── Recommended stack (Top 1% architect) ──────────────────────
TOP_STACK = [
    {"layer": "Parsing",       "preferred": "Docling"},
    {"layer": "Chunking",      "preferred": "Semantic + RAPTOR"},
    {"layer": "Embedding",     "preferred": "BGE-M3"},
    {"layer": "Vector DB",     "preferred": "Qdrant"},
    {"layer": "Retrieval",     "preferred": "Hybrid + GraphRAG"},
    {"layer": "Reranker",      "preferred": "BGE-Reranker"},
    {"layer": "Agents",        "preferred": "LangGraph"},
    {"layer": "Workflow",      "preferred": "Temporal"},
    {"layer": "MCP",           "preferred": "MCP Protocol"},
    {"layer": "LLM",           "preferred": "GPT-4o + Claude + Gemini"},
    {"layer": "Guardrails",    "preferred": "NeMo + Lakera"},
    {"layer": "Evaluation",    "preferred": "RAGAS + DeepEval"},
    {"layer": "Observability", "preferred": "Langfuse + Phoenix + OTel"},
    {"layer": "Security",      "preferred": "Presidio + Garak"},
    {"layer": "Serving",       "preferred": "vLLM"},
    {"layer": "Deployment",    "preferred": "Kubernetes"},
    {"layer": "Governance",    "preferred": "Archon + SpecKit + Harness"},
]


# ─── Stats helper ──────────────────────────────────────────────
def stats() -> dict[str, Any]:
    return {
        "total_categories": len(CATEGORIES),
        "total_tools": len(TOOLS),
        "by_status": {
            "used":       sum(1 for t in TOOLS if t["this_project_status"] == "used"),
            "scaffolded": sum(1 for t in TOOLS if t["this_project_status"] == "scaffolded"),
            "planned":    sum(1 for t in TOOLS if t["this_project_status"] == "planned"),
            "reference":  sum(1 for t in TOOLS if t["this_project_status"] == "reference"),
        },
        "by_priority": {
            "top":    sum(1 for t in TOOLS if t["priority"] == "top"),
            "common": sum(1 for t in TOOLS if t["priority"] == "common"),
        },
        "top_stack_layers": len(TOP_STACK),
    }
