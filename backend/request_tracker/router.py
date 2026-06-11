"""/api/v1/request-tracker/* · §125 · sys_request_tracker_agent.

Tracks every operator request · install status · §-policies invoked · iter shipped.
"""
from __future__ import annotations
import json
import re
import subprocess
import uuid
from fastapi import APIRouter
from pydantic import BaseModel
import psycopg2.extras
from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/request-tracker", tags=["request-tracker"])

# Canonical tool install map · the source of truth
TOOL_INSTALL_MAP = {
    # python libs (16)
    "rdflib": ("pip", "rdflib"),
    "pyshacl": ("pip", "pyshacl"),
    "owlrl": ("pip", "owlrl"),
    "SPARQLWrapper": ("pip", "SPARQLWrapper"),
    "owlready2": ("pip", "owlready2"),
    "simpy": ("pip", "simpy"),
    "mesa": ("pip", "mesa"),
    "neo4j": ("pip", "neo4j"),
    "dbt": ("pip", "dbt"),
    "gliner": ("pip", "gliner"),
    "spacy": ("pip", "spacy"),
    "unstructured": ("pip", "unstructured"),
    "docling": ("pip", "docling"),
    "dagster": ("pip", "dagster"),
    "prefect": ("pip", "prefect"),
    "graphrag": ("pip", "graphrag"),
    "langgraph": ("pip", "langgraph"),
    "llama_index": ("pip", "llama_index"),
    "paddleocr": ("pip", "paddleocr"),
    "phoenix": ("pip", "phoenix"),
    "airflow": ("pip", "airflow"),
    # docker
    "fuseki": ("docker", "fuseki"),
    "stardog": ("docker", "stardog"),
    "graphdb": ("docker", "graphdb"),
    "rdf4j": ("docker", "rdf4j"),
    "blazegraph": ("docker", "blazegraph"),
    "virtuoso": ("docker", "virtuoso"),
    "memgraph": ("docker", "memgraph"),
    "neo4j_server": ("docker", "neo4j"),
    "tika": ("docker", "tika"),
    "debezium": ("docker", "debezium"),
    "keycloak": ("docker", "keycloak"),
    "minio": ("docker", "minio"),
    # binaries
    "tesseract": ("bin", "tesseract"),
    "vault": ("bin", "vault"),
}


def check_install(tool_id: str) -> dict:
    if tool_id not in TOOL_INSTALL_MAP:
        return {"installed": None, "reason": "unknown_tool"}
    kind, target = TOOL_INSTALL_MAP[tool_id]
    if kind == "pip":
        import importlib
        try:
            importlib.import_module(target)
            return {"installed": True, "kind": "pip", "target": target}
        except Exception:
            return {"installed": False, "kind": "pip", "target": target}
    elif kind == "bin":
        import shutil
        return {"installed": shutil.which(target) is not None,
                "kind": "bin", "target": target}
    elif kind == "docker":
        try:
            out = subprocess.run(["docker", "ps", "--format", "{{.Image}}"],
                                  capture_output=True, text=True, timeout=3).stdout
            running = target.lower() in out.lower()
            out2 = subprocess.run(["docker", "images", "--format", "{{.Repository}}"],
                                   capture_output=True, text=True, timeout=3).stdout
            pulled = target.lower() in out2.lower()
            return {"installed": pulled, "running": running,
                    "kind": "docker", "target": target,
                    "status": "running" if running else "pulled" if pulled else "missing"}
        except Exception as e:
            return {"installed": False, "kind": "docker", "error": str(e)[:80]}


@router.get("/install-status")
def install_status():
    """Live · check every tool against actual installed state."""
    s = stamp()
    by_kind = {"pip": [], "docker": [], "bin": []}
    counts = {"installed": 0, "missing": 0}
    for tid, (kind, target) in TOOL_INSTALL_MAP.items():
        r = check_install(tid)
        r["tool_id"] = tid
        by_kind[kind].append(r)
        if r.get("installed"):
            counts["installed"] += 1
        else:
            counts["missing"] += 1
    return {**s, "counts": counts,
            "total": len(TOOL_INSTALL_MAP),
            "by_kind": by_kind,
            "spec": "§125 sys_request_tracker_agent · install status (live)"}


class RequestBody(BaseModel):
    request_text: str
    intent_class: str = "ask"  # install · build · ask · status · policy
    tools_mentioned: list[str] = []
    policies_invoked: list[str] = []


@router.post("/log")
def log_request(body: RequestBody):
    s = stamp()
    rid = f"OP-{uuid.uuid4().hex[:10].upper()}"
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO operator_request_log
              (request_id, request_text, intent_class, tools_mentioned,
               policies_invoked, actor_user)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (rid, body.request_text[:2000], body.intent_class,
              body.tools_mentioned, body.policies_invoked,
              s["actor_user"]))
    return {**s, "request_id": rid, "spec": "§125"}


@router.get("/log")
def list_requests(status: str = "any", limit: int = 30):
    sql = "SELECT * FROM operator_request_log"
    args = []
    if status != "any":
        sql += " WHERE status=%s"; args.append(status)
    sql += " ORDER BY requested_at DESC LIMIT %s"; args.append(limit)
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, tuple(args))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "requests": rows, "count": len(rows)}


@router.get("/health")
def health():
    return {**stamp(), "agent": "sys_request_tracker_agent",
            "tracked_tools": len(TOOL_INSTALL_MAP),
            "spec": "§125 · every response includes install table + tracker check"}
