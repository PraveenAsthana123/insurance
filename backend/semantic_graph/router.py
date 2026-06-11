"""/api/v1/semantic-graph/* · Iter 105 · §123 mandatory.

Tools surfaced (Stage-1 per §56):
  ✓ rdflib       · in-memory RDF triple store
  ✓ pyshacl      · SHACL constraint validation
  ✓ owlrl        · OWL 2 RL reasoner (Python)
  ✓ SPARQLWrapper· client for any SPARQL endpoint
  ✓ owlready2    · OWL ontology manipulation
  ✓ simpy        · discrete-event Digital Twin
  ✓ mesa         · agent-based Digital Twin
  ✓ neo4j        · property graph (Cypher)
  🟡 Fuseki      · Apache Jena SPARQL server (Stage-1 scaffold · activate via FUSEKI_URL)
  🟡 Jena Reasoner· Apache Jena OWL/RDFS reasoner (Stage-1 scaffold · activate via JENA_URL)
  🟡 Stardog     · Stage-1 scaffold · activate via STARDOG_URL + STARDOG_AUTH
  🟡 GraphDB     · Stage-1 scaffold · activate via GRAPHDB_URL
  🟡 Memgraph    · Stage-1 scaffold (Cypher-compat) · activate via MEMGRAPH_URL
  🟡 Airflow     · Stage-1 scaffold · activate via AIRFLOW_URL + AIRFLOW_AUTH
  📌 Protégé     · desktop tool · not API-callable · linked for reference
"""
from __future__ import annotations
import json
import os
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/semantic-graph", tags=["semantic-graph"])

# Tool catalog · canonical
TOOL_CATALOG = [
    # Python · LIVE
    {"id": "rdflib",       "kind": "rdf-store",  "lang": "python",
     "status": "live", "category": "RDF · in-memory",
     "policy": "§123", "doc": "https://rdflib.readthedocs.io"},
    {"id": "pyshacl",      "kind": "validator",  "lang": "python",
     "status": "live", "category": "SHACL · constraints",
     "policy": "§123", "doc": "https://github.com/RDFLib/pySHACL"},
    {"id": "owlrl",        "kind": "reasoner",   "lang": "python",
     "status": "live", "category": "OWL 2 RL · reasoner",
     "policy": "§123", "doc": "https://owl-rl.readthedocs.io"},
    {"id": "sparql_client","kind": "client",     "lang": "python",
     "status": "live", "category": "SPARQL · client",
     "policy": "§123", "doc": "https://sparqlwrapper.readthedocs.io"},
    {"id": "owlready2",    "kind": "ontology",   "lang": "python",
     "status": "live", "category": "OWL · ontology",
     "policy": "§123", "doc": "https://owlready2.readthedocs.io"},
    {"id": "simpy",        "kind": "dt-event",   "lang": "python",
     "status": "live", "category": "Digital Twin · discrete event",
     "policy": "§123", "doc": "https://simpy.readthedocs.io"},
    {"id": "mesa",         "kind": "dt-agent",   "lang": "python",
     "status": "live", "category": "Digital Twin · agent based",
     "policy": "§123", "doc": "https://mesa.readthedocs.io"},
    {"id": "neo4j",        "kind": "property-graph","lang": "python",
     "status": "live", "category": "Property Graph · Cypher",
     "policy": "§123", "doc": "https://neo4j.com/docs"},
    # External · Stage-1
    {"id": "fuseki",       "kind": "sparql-server","lang": "java",
     "status": "scaffold", "env": "FUSEKI_URL",
     "category": "Apache Jena · SPARQL endpoint",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://jena.apache.org/documentation/fuseki2/"},
    {"id": "jena_reasoner","kind": "reasoner",   "lang": "java",
     "status": "scaffold", "env": "JENA_URL",
     "category": "Apache Jena · OWL/RDFS reasoner",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://jena.apache.org/documentation/inference/"},
    {"id": "stardog",      "kind": "rdf-store",  "lang": "java",
     "status": "scaffold", "env": "STARDOG_URL",
     "category": "Stardog · enterprise RDF",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://docs.stardog.com"},
    {"id": "graphdb",      "kind": "rdf-store",  "lang": "java",
     "status": "scaffold", "env": "GRAPHDB_URL",
     "category": "Ontotext GraphDB · enterprise RDF",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://graphdb.ontotext.com/documentation/"},
    {"id": "memgraph",     "kind": "property-graph","lang": "cpp",
     "status": "scaffold", "env": "MEMGRAPH_URL",
     "category": "Memgraph · in-mem property graph",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://memgraph.com/docs"},
    {"id": "airflow",      "kind": "workflow",   "lang": "python",
     "status": "scaffold", "env": "AIRFLOW_URL",
     "category": "Apache Airflow · workflow orchestration",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://airflow.apache.org/docs/"},

    # Added per operator 2026-06-11 brief
    {"id": "debezium",     "kind": "cdc",        "lang": "java",
     "status": "scaffold", "env": "DEBEZIUM_URL",
     "category": "Debezium · Change Data Capture",
     "policy": "§123 · Stage-1 per §56",
     "doc": "https://debezium.io/documentation/"},
    {"id": "dbt_core",     "kind": "transform",  "lang": "python",
     "status": "live", "category": "dbt-core · data transform",
     "policy": "§123", "doc": "https://docs.getdbt.com/"},
    {"id": "gliner",       "kind": "ner",        "lang": "python",
     "status": "live", "category": "GLiNER · zero-shot NER",
     "policy": "§123", "doc": "https://github.com/urchade/GLiNER"},
    {"id": "rebel",        "kind": "rel-extract","lang": "python",
     "status": "scaffold", "env": "REBEL_MODEL_PATH",
     "category": "REBEL · relation extraction",
     "policy": "§123 · Stage-1 (use Babelscape/rebel-large via HF)",
     "doc": "https://huggingface.co/Babelscape/rebel-large"},
    {"id": "spacy",        "kind": "nlp",        "lang": "python",
     "status": "live", "category": "spaCy · NLP toolkit",
     "policy": "§123", "doc": "https://spacy.io"},

    # Added per operator §124 enterprise KG spec 2026-06-11
    {"id": "unstructured", "kind": "doc-parse",  "lang": "python",
     "status": "live", "category": "Unstructured · doc parser",
     "policy": "§124", "doc": "https://docs.unstructured.io"},
    {"id": "docling",      "kind": "doc-parse",  "lang": "python",
     "status": "scaffold", "env": "DOCLING_PATH",
     "category": "Docling · doc-to-structured", "policy": "§124 · Stage-1",
     "doc": "https://ds4sd.github.io/docling/"},
    {"id": "apache_tika",  "kind": "doc-parse",  "lang": "java",
     "status": "scaffold", "env": "TIKA_URL",
     "category": "Apache Tika · doc parser server", "policy": "§124 · Stage-1",
     "doc": "https://tika.apache.org/"},
    {"id": "tesseract",    "kind": "ocr",        "lang": "c++",
     "status": "scaffold", "env": "TESSERACT_BIN",
     "category": "Tesseract · OCR", "policy": "§124 · Stage-1",
     "doc": "https://github.com/tesseract-ocr/tesseract"},
    {"id": "paddleocr",    "kind": "ocr",        "lang": "python",
     "status": "scaffold", "env": "PADDLE_MODEL_PATH",
     "category": "PaddleOCR · OCR", "policy": "§124 · Stage-1",
     "doc": "https://github.com/PaddlePaddle/PaddleOCR"},
    {"id": "ms_graphrag",  "kind": "graphrag",   "lang": "python",
     "status": "scaffold", "env": "GRAPHRAG_DATA_PATH",
     "category": "Microsoft GraphRAG", "policy": "§124 · Stage-1",
     "doc": "https://microsoft.github.io/graphrag/"},
    {"id": "langgraph",    "kind": "orchestration","lang": "python",
     "status": "scaffold", "env": "LANGGRAPH_CHECKPOINT",
     "category": "LangGraph · agent orchestration", "policy": "§124 · Stage-1",
     "doc": "https://langchain-ai.github.io/langgraph/"},
    {"id": "llamaindex",   "kind": "orchestration","lang": "python",
     "status": "scaffold", "env": "LLAMA_INDEX_STORE",
     "category": "LlamaIndex · RAG framework", "policy": "§124 · Stage-1",
     "doc": "https://docs.llamaindex.ai/"},
    {"id": "minio",        "kind": "object-store","lang": "go",
     "status": "scaffold", "env": "MINIO_URL",
     "category": "MinIO · S3-compatible storage", "policy": "§124 · Stage-1",
     "doc": "https://min.io/docs"},
    {"id": "keycloak",     "kind": "auth",       "lang": "java",
     "status": "scaffold", "env": "KEYCLOAK_URL",
     "category": "Keycloak · SSO/OAuth2/OIDC", "policy": "§124 · Stage-1",
     "doc": "https://www.keycloak.org/documentation"},
    {"id": "vault",        "kind": "secrets",    "lang": "go",
     "status": "scaffold", "env": "VAULT_URL",
     "category": "HashiCorp Vault · secrets", "policy": "§124 · Stage-1",
     "doc": "https://www.vaultproject.io/docs"},
    {"id": "dagster",      "kind": "workflow",   "lang": "python",
     "status": "scaffold", "env": "DAGSTER_URL",
     "category": "Dagster · data orchestration", "policy": "§124 · Stage-1",
     "doc": "https://docs.dagster.io"},
    {"id": "prefect",      "kind": "workflow",   "lang": "python",
     "status": "scaffold", "env": "PREFECT_URL",
     "category": "Prefect · workflow", "policy": "§124 · Stage-1",
     "doc": "https://docs.prefect.io"},
    {"id": "rdf4j",        "kind": "rdf-store",  "lang": "java",
     "status": "scaffold", "env": "RDF4J_URL",
     "category": "RDF4J · open-source triple store", "policy": "§124 · Stage-1",
     "doc": "https://rdf4j.org/documentation/"},
    {"id": "blazegraph",   "kind": "rdf-store",  "lang": "java",
     "status": "scaffold", "env": "BLAZEGRAPH_URL",
     "category": "Blazegraph · open-source triple store", "policy": "§124 · Stage-1",
     "doc": "https://blazegraph.com/"},
    {"id": "virtuoso",     "kind": "rdf-store",  "lang": "c",
     "status": "scaffold", "env": "VIRTUOSO_URL",
     "category": "Virtuoso · hybrid store", "policy": "§124 · Stage-1",
     "doc": "https://virtuoso.openlinksw.com/"},
    {"id": "cytoscape_js", "kind": "viz",        "lang": "js",
     "status": "scaffold", "category": "Cytoscape.js · graph viz",
     "policy": "§124 · frontend", "doc": "https://js.cytoscape.org/"},
    {"id": "sigma_js",     "kind": "viz",        "lang": "js",
     "status": "scaffold", "category": "Sigma.js · graph viz",
     "policy": "§124 · frontend", "doc": "https://www.sigmajs.org/"},
    {"id": "phoenix",      "kind": "eval",       "lang": "python",
     "status": "scaffold", "env": "PHOENIX_URL",
     "category": "Arize Phoenix · LLM tracing/eval", "policy": "§124 · Stage-1",
     "doc": "https://docs.arize.com/phoenix"},
    {"id": "protege",      "kind": "desktop",    "lang": "java",
     "status": "external", "category": "Protégé · ontology editor (desktop)",
     "policy": "§123 reference only",
     "doc": "https://protege.stanford.edu/"},
]


@router.get("/catalog")
def catalog():
    by_status = {}
    for t in TOOL_CATALOG:
        by_status[t["status"]] = by_status.get(t["status"], 0) + 1
    return {**stamp(), "tools": TOOL_CATALOG, "count": len(TOOL_CATALOG),
            "by_status": by_status,
            "spec": "§123 Semantic Graph + DT + Workflow stack"}


@router.get("/health")
def health():
    live = [t["id"] for t in TOOL_CATALOG if t["status"] == "live"]
    scaffold = [t["id"] for t in TOOL_CATALOG if t["status"] == "scaffold"]
    return {**stamp(), "module": "semantic-graph", "live": live,
            "scaffold": scaffold, "scaffold_count": len(scaffold),
            "live_count": len(live), "policy": "§123"}


# ──────────────── RDF (rdflib) ────────────────
class RdfParseBody(BaseModel):
    turtle: str
    base: str = "http://insur.example/"


@router.post("/rdf/parse-turtle")
def rdf_parse_turtle(body: RdfParseBody):
    """Parse Turtle string · count triples · return summary."""
    try:
        import rdflib
        g = rdflib.Graph()
        g.parse(data=body.turtle, format="turtle", publicID=body.base)
        triples = [{"s": str(s), "p": str(p), "o": str(o)[:100]}
                   for s, p, o in list(g)[:10]]
        return {**stamp(), "triple_count": len(g),
                "first_10": triples,
                "namespaces": {prefix: str(ns) for prefix, ns in g.namespaces()},
                "spec": "§123 rdflib LIVE"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


# ──────────────── SPARQL (any endpoint) ────────────────
class SparqlQueryBody(BaseModel):
    endpoint: str = ""  # default: DBpedia public
    query: str
    format: str = "json"


@router.post("/sparql/query")
def sparql_query(body: SparqlQueryBody):
    """Query any SPARQL endpoint · default DBpedia for live demo."""
    endpoint = body.endpoint or "https://dbpedia.org/sparql"
    try:
        from SPARQLWrapper import SPARQLWrapper, JSON
        sw = SPARQLWrapper(endpoint)
        sw.setQuery(body.query)
        sw.setReturnFormat(JSON)
        sw.setTimeout(15)
        result = sw.query().convert()
        bindings = result.get("results", {}).get("bindings", [])
        return {**stamp(), "endpoint": endpoint,
                "n_results": len(bindings),
                "first_5": bindings[:5],
                "spec": "§123 SPARQLWrapper LIVE"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200],
                "endpoint": endpoint}


# ──────────────── SHACL (pyshacl) ────────────────
class ShaclValidateBody(BaseModel):
    data_graph: str  # turtle
    shapes_graph: str  # turtle


@router.post("/shacl/validate")
def shacl_validate(body: ShaclValidateBody):
    try:
        from pyshacl import validate as ps_validate
        conforms, report_graph, report_text = ps_validate(
            data_graph=body.data_graph, shacl_graph=body.shapes_graph,
            data_graph_format="turtle", shacl_graph_format="turtle",
            inference="rdfs", debug=False
        )
        return {**stamp(), "conforms": conforms,
                "report_text": report_text[:1000],
                "spec": "§123 pyshacl LIVE"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


# ──────────────── OWL Reasoner (owlrl) ────────────────
class OwlReasonBody(BaseModel):
    turtle: str
    profile: str = "owlrl"  # owlrl · rdfs · rdfs_owl


@router.post("/owl/reason")
def owl_reason(body: OwlReasonBody):
    try:
        import rdflib
        from owlrl import DeductiveClosure, OWLRL_Semantics, RDFS_Semantics
        g = rdflib.Graph()
        g.parse(data=body.turtle, format="turtle")
        original_count = len(g)
        if body.profile == "rdfs":
            DeductiveClosure(RDFS_Semantics).expand(g)
        else:
            DeductiveClosure(OWLRL_Semantics).expand(g)
        return {**stamp(), "profile": body.profile,
                "triples_before": original_count,
                "triples_after": len(g),
                "inferred": len(g) - original_count,
                "spec": "§123 owlrl LIVE"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


# ──────────────── Stage-1 adapters (scaffold) ────────────────
def _stage1_check(env_key: str) -> dict:
    """Stage-1 per §56 · returns scaffold/live based on env."""
    url = os.environ.get(env_key, "")
    return {"env": env_key, "configured": bool(url),
            "url": url if url else None,
            "status": "live_unreachable" if url else "scaffold"}


@router.get("/fuseki/health")
def fuseki_health():
    s = _stage1_check("FUSEKI_URL")
    # If FUSEKI_URL set · attempt to query
    if s["configured"]:
        try:
            import httpx
            r = httpx.get(f"{s['url']}/$/server", timeout=5)
            s["http_status"] = r.status_code
            s["status"] = "live" if r.status_code == 200 else "live_unreachable"
        except Exception as e:
            s["error"] = str(e)[:100]
    return {**stamp(), **s, "tool": "fuseki", "spec": "§123 Stage-1 per §56"}


@router.get("/stardog/health")
def stardog_health():
    return {**stamp(), **_stage1_check("STARDOG_URL"),
            "tool": "stardog", "auth_env": "STARDOG_AUTH",
            "spec": "§123 Stage-1 per §56"}


@router.get("/graphdb/health")
def graphdb_health():
    return {**stamp(), **_stage1_check("GRAPHDB_URL"),
            "tool": "graphdb", "spec": "§123 Stage-1 per §56"}


@router.get("/memgraph/health")
def memgraph_health():
    return {**stamp(), **_stage1_check("MEMGRAPH_URL"),
            "tool": "memgraph", "kind": "property-graph",
            "spec": "§123 Stage-1 per §56"}


@router.get("/jena-reasoner/health")
def jena_reasoner_health():
    return {**stamp(), **_stage1_check("JENA_URL"),
            "tool": "jena-reasoner",
            "profiles": ["RDFS", "OWL", "OWLMicro", "OWLMini"],
            "spec": "§123 Stage-1 per §56"}


@router.get("/airflow/health")
def airflow_health():
    return {**stamp(), **_stage1_check("AIRFLOW_URL"),
            "tool": "airflow", "auth_env": "AIRFLOW_AUTH",
            "spec": "§123 Stage-1 per §56"}


# ──────────────── Digital Twin (simpy + mesa) ────────────────
class DtSimBody(BaseModel):
    sim_kind: str = "queue"  # queue · diffusion
    n_steps: int = 50
    arrival_rate: float = 0.5
    service_rate: float = 0.4


@router.post("/dt/simulate")
def dt_simulate(body: DtSimBody):
    """Discrete-event simulation via simpy · queue demo."""
    try:
        import simpy
        env = simpy.Environment()
        log = []

        def customer(env, name, server):
            arrive = env.now
            log.append({"event": "arrive", "name": name, "t": arrive})
            with server.request() as req:
                yield req
                wait = env.now - arrive
                log.append({"event": "service", "name": name,
                             "wait": round(wait, 2), "t": env.now})
                yield env.timeout(1.0 / body.service_rate)
                log.append({"event": "leave", "name": name,
                             "t": round(env.now, 2)})

        def source(env, n, server):
            for i in range(n):
                yield env.timeout(1.0 / body.arrival_rate)
                env.process(customer(env, f"c{i}", server))

        server = simpy.Resource(env, capacity=1)
        env.process(source(env, body.n_steps, server))
        env.run(until=body.n_steps * 2)
        return {**stamp(), "sim_kind": body.sim_kind,
                "n_events": len(log),
                "first_10_events": log[:10],
                "n_customers": sum(1 for e in log if e["event"] == "arrive"),
                "spec": "§123 simpy LIVE · queue DT"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}
