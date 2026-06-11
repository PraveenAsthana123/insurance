"""/api/v1/kg-stack/* · Iter 106 · §124 · Enterprise KG + GraphRAG canonical reference.

The complete enterprise KG architecture · 13-layer flow · 40+ tools by category ·
18-phase build plan · 90-day timeline · 8 team roles · 15 brutal missing items.
"""
from __future__ import annotations
from fastapi import APIRouter

from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/kg-stack", tags=["kg-stack"])


# ════════════════════ 13-LAYER FLOW ════════════════════
LAYERS = [
    {"layer": 1, "name": "Data Sources",
     "tools": ["SAP", "CRM", "ERP", "HR", "Claims", "SharePoint", "PDFs", "Emails", "APIs"]},
    {"layer": 2, "name": "Data Engineering",
     "tools": ["Python", "Spark", "Databricks", "Airflow", "Dagster", "Prefect", "Kafka", "Redpanda", "dbt"]},
    {"layer": 3, "name": "Document Extraction",
     "tools": ["Docling", "Unstructured", "Apache Tika", "PaddleOCR", "Tesseract"]},
    {"layer": 4, "name": "Entity Extraction",
     "tools": ["spaCy", "GLiNER", "LLM-based NER", "Stanford NER"]},
    {"layer": 5, "name": "Relationship Extraction",
     "tools": ["REBEL", "LLM RE", "OpenIE", "custom NER+RE"]},
    {"layer": 6, "name": "Semantic Layer (RDF/RDFS/OWL)",
     "tools": ["RDFLib", "owlready2", "Protégé", "TopBraid"]},
    {"layer": 7, "name": "Validation (SHACL)",
     "tools": ["pySHACL", "TopBraid SHACL"]},
    {"layer": 8, "name": "Triple Store",
     "tools": ["Apache Jena Fuseki", "GraphDB", "Stardog", "RDF4J", "Blazegraph", "Virtuoso", "PoolParty"]},
    {"layer": 9, "name": "SPARQL + Reasoning",
     "tools": ["Jena Reasoner (RDFS/OWL/Micro/Mini)", "GraphDB Reasoner", "OWLRL"]},
    {"layer": 10, "name": "Property Graph",
     "tools": ["Neo4j", "Memgraph", "Apache TinkerPop", "JanusGraph", "Amazon Neptune"]},
    {"layer": 11, "name": "Embeddings + Vector DB",
     "tools": ["BGE-M3", "BGE-large", "E5-large / mxbai-embed-large", "Qdrant", "Milvus", "Weaviate", "pgvector", "Chroma"]},
    {"layer": 12, "name": "GraphRAG + LLM Orchestration",
     "tools": ["Microsoft GraphRAG", "LangGraph", "LlamaIndex", "Llama/Qwen/Mistral", "Claude", "GPT-4"]},
    {"layer": 13, "name": "API + UI + Business App",
     "tools": ["FastAPI", "GraphQL", "React", "Next.js", "Cytoscape.js", "Sigma.js", "neovis.js"]},
]


# ════════════════════ KG EMBEDDING METHODS ════════════════════
KG_EMBEDDING_METHODS = [
    {"method": "TransE",    "kind": "translational", "use": "Link prediction · simple · fast"},
    {"method": "RotatE",    "kind": "rotational",    "use": "Link prediction · captures symmetric/anti-symmetric"},
    {"method": "ComplEx",   "kind": "complex",       "use": "Link prediction · asymmetric relations"},
    {"method": "Node2Vec",  "kind": "random walk",   "use": "Node similarity · clustering"},
    {"method": "DeepWalk",  "kind": "random walk",   "use": "Node embeddings · skip-gram"},
    {"method": "GraphSAGE", "kind": "GNN inductive", "use": "Inductive · scales to large graphs"},
    {"method": "GCN",       "kind": "GNN",           "use": "Semi-supervised node classification"},
]


# ════════════════════ 18-PHASE BUILD PLAN ════════════════════
BUILD_PHASES = [
    {"phase": 1, "name": "Business Discovery",
     "deliverables": ["business glossary", "use case catalog 10-20", "source inventory",
                       "ownership matrix", "success metrics"]},
    {"phase": 2, "name": "Use Case Selection",
     "deliverables": ["1 pilot use case", "5+ business questions", "data mix decision"]},
    {"phase": 3, "name": "Reference Architecture",
     "deliverables": ["7-tier diagram", "tool selection rationale", "deployment topology"]},
    {"phase": 4, "name": "Technology Selection",
     "deliverables": ["pilot stack", "enterprise stack", "swap matrix"]},
    {"phase": 5, "name": "Ontology Design",
     "deliverables": ["core classes (10+)", "relationships table", "RDFS/OWL TTL",
                       "Protégé project"]},
    {"phase": 6, "name": "SHACL Validation",
     "deliverables": ["per-entity shapes", "violation report", "SHACL CI/CD"]},
    {"phase": 7, "name": "Data Mapping",
     "deliverables": ["source-to-ontology table", "mapping notebooks",
                       "data contracts per source"]},
    {"phase": 8, "name": "RDF Generation Pipeline",
     "deliverables": ["extractor.py", "mapper.py", "rdf_builder.py",
                       "validator.py", "loader.py", "lineage_logger.py"]},
    {"phase": 9, "name": "Triple Store Setup",
     "deliverables": ["Fuseki/GraphDB up", "auth wired", "backup/restore tested"]},
    {"phase": 10, "name": "SPARQL Query Layer",
     "deliverables": ["20+ competency questions", "query API", "perf tuning"]},
    {"phase": 11, "name": "GraphRAG Layer",
     "deliverables": ["intent detection", "graph neighborhood retrieval",
                       "vector retrieval", "context merge", "citation+confidence"]},
    {"phase": 12, "name": "KG from Unstructured",
     "deliverables": ["PDF/email/web pipeline", "entity+RE+ER",
                       "human review queue", "RDF emit"]},
    {"phase": 13, "name": "KG Embeddings",
     "deliverables": ["embed model selection", "vector store",
                       "link prediction baseline"]},
    {"phase": 14, "name": "API Layer (8 mandatory)",
     "deliverables": ["/entities/search", "/entities/{id}", "/relationships",
                       "/sparql/query", "/rag/ask", "/validate/shacl",
                       "/lineage/{id}", "/feedback"]},
    {"phase": 15, "name": "UI / Business App (7 screens)",
     "deliverables": ["Enterprise Search", "Entity 360", "Relationship Explorer",
                       "GraphRAG Chat", "DQ Dashboard", "Lineage View",
                       "Governance Console"]},
    {"phase": 16, "name": "Security & Governance",
     "deliverables": ["SSO/OAuth2", "RBAC+ABAC", "entity-level security",
                       "PII detection", "audit log", "OPA policies"]},
    {"phase": 17, "name": "Evaluation",
     "deliverables": ["KG quality KPIs ≥ targets", "GraphRAG faithfulness ≥ 90%",
                       "hallucination < 5%", "human approval ≥ 90%"]},
    {"phase": 18, "name": "Production Rollout",
     "deliverables": ["POC → Pilot → MVP → Prod → Enterprise scale",
                       "multi-region", "HA/DR", "CI/CD ontology lifecycle"]},
]


# ════════════════════ 90-DAY TIMELINE ════════════════════
TIMELINE_90D = [
    {"days": "1-15",  "goal": "Discovery · use case · ontology v1"},
    {"days": "16-30", "goal": "Triple store · RDF mapping · SHACL"},
    {"days": "31-45", "goal": "Data ingestion (SQL + documents)"},
    {"days": "46-60", "goal": "SPARQL APIs + entity search"},
    {"days": "61-75", "goal": "GraphRAG + vector retrieval"},
    {"days": "76-90", "goal": "Evaluation · governance · deployment demo"},
]


# ════════════════════ TEAM ROLES ════════════════════
TEAM_ROLES = [
    {"role": "Knowledge Graph Architect",  "owns": "ontology · RDF · OWL · SHACL · SPARQL"},
    {"role": "Data Engineer",              "owns": "pipelines · SQL · lakehouse · batch/stream"},
    {"role": "Python Engineer",            "owns": "RDF generation · APIs · automation"},
    {"role": "Data Steward",               "owns": "glossary · data quality · definitions"},
    {"role": "Domain SME",                 "owns": "business meaning · validation"},
    {"role": "AI Engineer",                "owns": "GraphRAG · embeddings · LLM eval"},
    {"role": "DevOps",                     "owns": "deployment · monitoring · CI/CD"},
    {"role": "Security Architect",         "owns": "access · audit · PII · governance"},
]


# ════════════════════ BRUTAL MISSING ITEMS (15) ════════════════════
BRUTAL_MISSING_ITEMS = [
    {"item": "URI strategy",            "why_matters": "Without stable IDs · graph becomes messy"},
    {"item": "Entity resolution",       "why_matters": "Same customer appears many times"},
    {"item": "Ontology versioning",     "why_matters": "Business definitions change"},
    {"item": "SHACL lifecycle",         "why_matters": "Rules need approval + testing"},
    {"item": "SPARQL perf tuning",      "why_matters": "Bad queries kill triple store"},
    {"item": "Entity-level access",     "why_matters": "Not every user sees every relationship"},
    {"item": "Human review queue",      "why_matters": "LLM triples may be wrong"},
    {"item": "Lineage tracking",        "why_matters": "Required for trust + audit"},
    {"item": "Data contracts",          "why_matters": "Source systems change silently"},
    {"item": "Graph drift monitoring",  "why_matters": "Relationships go stale"},
    {"item": "Cost control",            "why_matters": "Embeddings + LLM extraction expensive"},
    {"item": "Explainability",          "why_matters": "Users need 'why this answer?'"},
    {"item": "Fallback search",         "why_matters": "SPARQL may fail · vector helps"},
    {"item": "Graph backup/restore",    "why_matters": "Critical for production"},
    {"item": "Test datasets",           "why_matters": "Needed before enterprise rollout"},
]


# ════════════════════ KG QUALITY KPIs ════════════════════
KG_KPI_TARGETS = [
    {"metric": "Entity accuracy",        "target": ">95%"},
    {"metric": "Relationship accuracy",  "target": ">90%"},
    {"metric": "Duplicate entity rate",  "target": "<3%"},
    {"metric": "SHACL pass rate",        "target": ">98%"},
    {"metric": "Ontology coverage",      "target": ">80%"},
    {"metric": "SPARQL query latency",   "target": "<2 sec (common queries)"},
]

GRAPHRAG_KPI_TARGETS = [
    {"metric": "Answer faithfulness",    "target": ">90%"},
    {"metric": "Citation accuracy",      "target": ">95%"},
    {"metric": "Retrieval precision",    "target": ">85%"},
    {"metric": "Retrieval recall",       "target": ">85%"},
    {"metric": "Hallucination rate",     "target": "<5%"},
    {"metric": "Human approval pass",    "target": ">90%"},
]


# ════════════════════ MVP vs ENTERPRISE STACK ════════════════════
MVP_STACK = [
    {"need": "Triple store",      "tool": "Apache Jena Fuseki"},
    {"need": "Ontology",          "tool": "Protégé"},
    {"need": "RDF coding",        "tool": "Python RDFLib"},
    {"need": "Validation",        "tool": "pySHACL"},
    {"need": "Query",             "tool": "SPARQL"},
    {"need": "KG + documents",    "tool": "Docling + LLM extraction"},
    {"need": "GraphRAG",          "tool": "LangGraph + Qdrant"},
    {"need": "API",               "tool": "FastAPI"},
    {"need": "UI",                "tool": "React + Cytoscape.js"},
    {"need": "Metadata",          "tool": "PostgreSQL"},
    {"need": "Storage",           "tool": "MinIO"},
    {"need": "Deployment",        "tool": "Docker Compose"},
]

ENTERPRISE_STACK = [
    {"need": "Triple store",      "tool": "GraphDB / Stardog"},
    {"need": "Lakehouse",         "tool": "Databricks"},
    {"need": "Cloud",             "tool": "Azure / AWS / GCP"},
    {"need": "Pipeline",          "tool": "Airflow / Dagster"},
    {"need": "Governance",        "tool": "Collibra / Purview"},
    {"need": "Security",          "tool": "Keycloak + OPA + Vault"},
    {"need": "GraphRAG",          "tool": "LangGraph + enterprise LLM"},
    {"need": "Monitoring",        "tool": "OpenTelemetry + Grafana + Langfuse"},
    {"need": "Deployment",        "tool": "Kubernetes + Terraform"},
]


# ════════════════════ ENDPOINTS ════════════════════
@router.get("/architecture")
def architecture():
    """13-layer enterprise KG flow · top-down."""
    return {**stamp(), "n_layers": len(LAYERS), "layers": LAYERS,
            "spec": "§124 enterprise KG architecture"}


@router.get("/tools")
def all_tools_by_layer():
    """All 40+ tools grouped by layer."""
    out = {}
    total = 0
    for layer in LAYERS:
        out[f"layer_{layer['layer']}_{layer['name']}"] = layer["tools"]
        total += len(layer["tools"])
    return {**stamp(), "total_tools": total, "by_layer": out,
            "spec": "§124 canonical tool catalog"}


@router.get("/build-plan")
def build_plan():
    return {**stamp(), "n_phases": len(BUILD_PHASES), "phases": BUILD_PHASES,
            "spec": "§124 18-phase enterprise KG build plan"}


@router.get("/timeline-90d")
def timeline_90d():
    return {**stamp(), "phases": TIMELINE_90D,
            "total_days": 90, "spec": "§124 90-day implementation"}


@router.get("/team-roles")
def team_roles():
    return {**stamp(), "n_roles": len(TEAM_ROLES), "roles": TEAM_ROLES,
            "spec": "§124 mandatory 8 roles"}


@router.get("/brutal-missing-items")
def brutal_missing():
    return {**stamp(), "n_items": len(BRUTAL_MISSING_ITEMS),
            "items": BRUTAL_MISSING_ITEMS,
            "spec": "§124 brutal missing items · 15 things teams forget"}


@router.get("/kpis")
def kpis():
    return {**stamp(),
            "kg_quality": KG_KPI_TARGETS,
            "graphrag_quality": GRAPHRAG_KPI_TARGETS,
            "spec": "§124 production KPIs"}


@router.get("/stack/mvp")
def stack_mvp():
    return {**stamp(), "stack": MVP_STACK, "n_components": len(MVP_STACK),
            "deployment": "Docker Compose · single host", "spec": "§124 MVP"}


@router.get("/stack/enterprise")
def stack_enterprise():
    return {**stamp(), "stack": ENTERPRISE_STACK,
            "n_components": len(ENTERPRISE_STACK),
            "deployment": "Kubernetes + Terraform · multi-region",
            "spec": "§124 Enterprise"}


@router.get("/kg-embeddings/methods")
def kg_embedding_methods():
    return {**stamp(), "methods": KG_EMBEDDING_METHODS,
            "count": len(KG_EMBEDDING_METHODS),
            "spec": "§124 KG embedding methods"}


@router.get("/health")
def health():
    return {**stamp(),
            "module": "kg-stack",
            "n_layers": len(LAYERS),
            "n_phases": len(BUILD_PHASES),
            "n_brutal_items": len(BRUTAL_MISSING_ITEMS),
            "n_roles": len(TEAM_ROLES),
            "n_kpis_kg": len(KG_KPI_TARGETS),
            "n_kpis_graphrag": len(GRAPHRAG_KPI_TARGETS),
            "spec": "§124 Enterprise KG + GraphRAG canonical reference"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Enterprise Knowledge Graph + GraphRAG Platform",
            "endpoints": [
                "/architecture · 13-layer flow",
                "/tools · 40+ tools by layer",
                "/build-plan · 18 phases",
                "/timeline-90d · day-by-day",
                "/team-roles · 8 roles",
                "/brutal-missing-items · 15 traps",
                "/kpis · KG + GraphRAG quality targets",
                "/stack/mvp · 12-component Docker Compose",
                "/stack/enterprise · 9-component K8s",
                "/kg-embeddings/methods · 7 methods",
            ],
            "rdf_layer_summary": ("RDF (subject-predicate-object) → "
                                   "RDFS (classes + hierarchy) → "
                                   "OWL (reasoning) → "
                                   "SHACL (validation) → "
                                   "SPARQL (query)"),
            "graphrag_generations": [
                "Gen 1: RAG · vector + LLM · no relationships",
                "Gen 2: GraphRAG · entities + relationships + communities",
                "Gen 3: KG + RAG · ontology + reasoning + rules + graph"
            ],
            "spec": "§124 canonical reference"}
