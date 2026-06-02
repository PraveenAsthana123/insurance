"""INSUR Graph AI router — per-dept relationship graph (Cytoscape-compatible).

Unifies per-dept artifacts (master entities, processes, pipelines, roles,
reports, demos, audit event types, dashboards) into one queryable graph.

Composes with global §38 (audit on traversal) + §39 (knowledge graph
requirement) + §45 (KG non-negotiable) + §47 (C4 L5 dep view) + §49
(compose-footer derivable from edges) + §59 MDD + §63 + §64 + §66.

Endpoints:
  GET /api/v1/insur/graph/{dept}                       — full graph
  GET /api/v1/insur/graph/{dept}/nodes?type=<type>     — filtered nodes
  GET /api/v1/insur/graph/{dept}/neighbors/{node_id}   — 1-hop neighbors
  GET /api/v1/insur/graph/_global                      — cross-dept counts
"""
from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.insur_audit import log_insur_access

router = APIRouter(prefix="/api/v1/insur/graph", tags=["insur", "graph"])

INSUR_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Canonical 15 §63 roles.
ROLES = [
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect", "data-owner",
    "ai-strategy", "information-security",
]

# Master entities — keep aligned with master_data.ENTITY_CATALOG keys.
MASTER_ENTITIES = [
    "customer", "customer_hierarchy", "vendor", "employee", "product",
    "product_hierarchy", "price_list", "discount_condition", "organization",
    "sales_area", "sales_org", "sales_office", "company_code", "cost_center",
    "department",
]

# 15 standard report archetypes per §64.37.2 — keep aligned with
# reports.STANDARD_REPORTS report_id values.
REPORTS = [
    "daily_ops_digest", "weekly_business_review", "daily_my_work",
    "pre_release_test_report", "weekly_security_posture", "dora_weekly",
    "monthly_model_review", "quarterly_dt_scorecard", "monthly_arch_review",
    "quarterly_test_strategy", "weekly_db_health", "weekly_api_contract",
    "monthly_data_steward", "quarterly_dt_strategy", "monthly_infosec",
]

# Audit event prefixes per INSUR_TRANSACTIONS event taxonomy.
AUDIT_EVENT_PREFIXES = ["cron", "ml", "sim", "decision", "demo", "report"]

# Per-dept process list — sparse map, falls back to single "default" process.
# Keep aligned with pipelines.PIPELINE_CATALOG keys.
DEPT_PROCESSES: dict[str, list[str]] = {
    "sales":               ["lead_scoring", "churn_prediction", "demand_forecast"],
    "finance":             ["fraud_detection", "cash_flow_forecast", "month_end_close"],
    "manufacturing":       ["defect_detection_cv", "predictive_maintenance", "oee_optimization"],
    "customer-experience": ["ticket_auto_reply"],
    "supply-chain":        ["demand_sensing"],
}

# Allowed node types — drill step 4 enforces every node carries one of these.
ALLOWED_NODE_TYPES = {
    "master_entity", "process", "pipeline", "role", "report",
    "demo", "audit_event_type", "dashboard",
}

# Report → owner_role mapping per §64.37.2 — used to build report→role edges.
REPORT_OWNER: dict[str, str] = {
    "daily_ops_digest":        "admin",
    "weekly_business_review":  "manager",
    "daily_my_work":           "team-member",
    "pre_release_test_report": "tester",
    "weekly_security_posture": "security",
    "dora_weekly":             "devops",
    "monthly_model_review":    "ai-reviewer",
    "quarterly_dt_scorecard":  "digital-transformation",
    "monthly_arch_review":     "system-architect",
    "quarterly_test_strategy": "test-architect",
    "weekly_db_health":        "database-architect",
    "weekly_api_contract":     "api-architect",
    "monthly_data_steward":    "data-owner",
    "quarterly_dt_strategy":   "ai-strategy",
    "monthly_infosec":         "information-security",
}


def _validate_dept(dept: str) -> None:
    if dept not in INSUR_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(INSUR_DEPTS)} INSUR depts")


def _build_graph(dept: str) -> dict[str, Any]:
    """Materialize the per-dept graph from the canonical source catalogs."""
    nodes: list[dict[str, str]] = []
    edges: list[dict[str, str]] = []

    # ---- Nodes ----
    for entity in MASTER_ENTITIES:
        nodes.append({"id": f"entity:{entity}", "type": "master_entity", "label": entity})

    processes = DEPT_PROCESSES.get(dept, ["default_pipeline"])
    for proc in processes:
        nodes.append({"id": f"process:{proc}", "type": "process", "label": proc.replace("_", " ").title()})
        nodes.append({"id": f"pipeline:{proc}", "type": "pipeline", "label": f"Pipeline: {proc}"})

    for role in ROLES:
        nodes.append({"id": f"role:{role}", "type": "role", "label": role.replace("-", " ").title()})

    for rid in REPORTS:
        nodes.append({"id": f"report:{rid}", "type": "report", "label": rid.replace("_", " ").title()})

    for role in ROLES:
        demo_id = f"{role.replace('-', '_')}_demo"
        nodes.append({"id": f"demo:{demo_id}", "type": "demo", "label": f"{role} demo"})

    for prefix in AUDIT_EVENT_PREFIXES:
        nodes.append({"id": f"audit_event_type:{prefix}", "type": "audit_event_type", "label": f"{prefix}.*"})

    for role in ROLES:
        nodes.append({"id": f"dashboard:{role}", "type": "dashboard", "label": f"{role} dashboard"})

    # ---- Edges ----
    # entity → process: every process consumes a representative customer/product/vendor.
    # Heuristic: bind processes to the most-likely-relevant entity (lightweight model).
    process_entity_hint = {
        "lead_scoring": "customer", "churn_prediction": "customer",
        "demand_forecast": "product", "fraud_detection": "customer",
        "cash_flow_forecast": "company_code", "month_end_close": "cost_center",
        "defect_detection_cv": "product", "predictive_maintenance": "product",
        "oee_optimization": "product", "ticket_auto_reply": "customer",
        "demand_sensing": "product", "default_pipeline": "customer",
    }
    for proc in processes:
        hint_entity = process_entity_hint.get(proc, "customer")
        edges.append({
            "source": f"entity:{hint_entity}",
            "target": f"process:{proc}",
            "type": "entity_to_process",
        })

    # process → pipeline (1:1 since pipeline_id == process_id)
    for proc in processes:
        edges.append({
            "source": f"process:{proc}",
            "target": f"pipeline:{proc}",
            "type": "process_to_pipeline",
        })

    # pipeline → report (each pipeline phase-5 produces a manager-tier report)
    for proc in processes:
        edges.append({
            "source": f"pipeline:{proc}",
            "target": "report:weekly_business_review",
            "type": "pipeline_to_report",
        })

    # report → role (owner)
    for rid, owner in REPORT_OWNER.items():
        edges.append({
            "source": f"report:{rid}",
            "target": f"role:{owner}",
            "type": "report_to_role",
        })

    # role → demo (1:1)
    for role in ROLES:
        demo_id = f"{role.replace('-', '_')}_demo"
        edges.append({
            "source": f"role:{role}",
            "target": f"demo:{demo_id}",
            "type": "role_to_demo",
        })

    # role → dashboard (1:1)
    for role in ROLES:
        edges.append({
            "source": f"role:{role}",
            "target": f"dashboard:{role}",
            "type": "role_to_dashboard",
        })

    # process → audit_event_type (every process emits ml.* events)
    for proc in processes:
        edges.append({
            "source": f"process:{proc}",
            "target": "audit_event_type:ml",
            "type": "process_to_event_type",
        })

    return {"nodes": nodes, "edges": edges}


# _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def global_summary(http_request: Request) -> dict[str, Any]:
    """Cross-dept summary: node + edge counts per dept."""
    log_insur_access(http_request, "graph", "global_summary")
    summary: dict[str, dict[str, int]] = {}
    total_nodes = total_edges = 0
    for dept in INSUR_DEPTS:
        g = _build_graph(dept)
        n, e = len(g["nodes"]), len(g["edges"])
        summary[dept] = {"nodes": n, "edges": e}
        total_nodes += n
        total_edges += e
    return {
        "n_depts": len(INSUR_DEPTS),
        "depts": INSUR_DEPTS,
        "per_dept_counts": summary,
        "totals": {"nodes": total_nodes, "edges": total_edges},
        "allowed_node_types": sorted(ALLOWED_NODE_TYPES),
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_graph(http_request: Request, dept: str) -> dict[str, Any]:
    """Full per-dept relationship graph."""
    _validate_dept(dept)
    log_insur_access(http_request, "graph", "dept_graph", dept=dept)
    g = _build_graph(dept)
    return {
        "dept": dept,
        "n_nodes": len(g["nodes"]),
        "n_edges": len(g["edges"]),
        "nodes": g["nodes"],
        "edges": g["edges"],
        "scanned_at": time.time(),
    }


@router.get("/{dept}/nodes")
def dept_nodes_filtered(
    http_request: Request,
    dept: str,
    type: str = Query("all", description="Node type filter: all / master_entity / process / pipeline / role / report / demo / audit_event_type / dashboard"),
) -> dict[str, Any]:
    """Per-dept node list, optionally filtered by type."""
    _validate_dept(dept)
    if type != "all":
        if not re.match(r"^[a-z_]+$", type):
            raise HTTPException(400, f"Malformed type filter '{type}' (must be lowercase + underscores)")
        if type not in ALLOWED_NODE_TYPES:
            raise HTTPException(
                404, f"Unknown node type '{type}' — must be one of {sorted(ALLOWED_NODE_TYPES)}"
            )
    log_insur_access(http_request, "graph", "dept_nodes_filtered",
                    dept=dept, extra={"type": type})
    g = _build_graph(dept)
    filtered = g["nodes"] if type == "all" else [n for n in g["nodes"] if n["type"] == type]
    return {
        "dept": dept,
        "type_filter": type,
        "n_nodes": len(filtered),
        "nodes": filtered,
        "scanned_at": time.time(),
    }


@router.get("/{dept}/neighbors/{node_id:path}")
def dept_neighbors(http_request: Request, dept: str, node_id: str) -> dict[str, Any]:
    """1-hop neighbors of a node (both incoming and outgoing edges)."""
    _validate_dept(dept)
    if not re.match(r"^[a-z_]+:[a-z0-9_.-]+$", node_id):
        raise HTTPException(400, f"Malformed node_id '{node_id}' (must be type:id with lowercase / digits / -._)")

    g = _build_graph(dept)
    node_ids = {n["id"] for n in g["nodes"]}
    if node_id not in node_ids:
        raise HTTPException(404, f"Node '{node_id}' not found in dept '{dept}' graph")

    log_insur_access(http_request, "graph", "dept_neighbors",
                    dept=dept, extra={"node_id": node_id})

    outgoing = [e for e in g["edges"] if e["source"] == node_id]
    incoming = [e for e in g["edges"] if e["target"] == node_id]
    neighbor_ids = {e["target"] for e in outgoing} | {e["source"] for e in incoming}
    neighbor_nodes = [n for n in g["nodes"] if n["id"] in neighbor_ids]

    return {
        "dept": dept,
        "node_id": node_id,
        "n_outgoing": len(outgoing),
        "n_incoming": len(incoming),
        "n_neighbors": len(neighbor_nodes),
        "outgoing_edges": outgoing,
        "incoming_edges": incoming,
        "neighbors": neighbor_nodes,
        "scanned_at": time.time(),
    }
