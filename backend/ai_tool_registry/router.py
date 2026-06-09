"""/api/v1/ai-tools/* — read-only tool registry surface.

Per docs/ENTERPRISE_AI_TOOL_LANDSCAPE.md.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from . import registry

router = APIRouter(prefix="/api/v1/ai-tools", tags=["ai-tools"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "ai-tools", "stats": registry.stats()}


@router.get("/categories")
def list_categories():
    return {"categories": registry.CATEGORIES, "count": len(registry.CATEGORIES)}


@router.get("/tools")
def list_tools(category: Optional[str] = None,
                priority: Optional[str] = None,
                status: Optional[str] = None,
                q: Optional[str] = None):
    items = registry.TOOLS
    if category:
        items = [t for t in items if t["category"] == category]
    if priority:
        items = [t for t in items if t["priority"] == priority]
    if status:
        items = [t for t in items if t["this_project_status"] == status]
    if q:
        ql = q.lower()
        items = [t for t in items if ql in t["name"].lower() or ql in t.get("notes", "").lower()]
    return {"tools": items, "count": len(items)}


@router.get("/tools/{tool_id}")
def get_tool(tool_id: str):
    item = next((t for t in registry.TOOLS if t["id"] == tool_id), None)
    if not item:
        raise HTTPException(404, {"detail": "tool not in registry",
                                    "error_code": "TOOL_404"})
    # Also surface alternatives in same category
    alternatives = [t for t in registry.TOOLS
                       if t["category"] == item["category"] and t["id"] != tool_id]
    return {**item, "alternatives_count": len(alternatives),
            "alternatives": alternatives}


@router.get("/top-stack")
def top_stack():
    """Top 1% architect preferred-stack table."""
    return {"top_stack": registry.TOP_STACK, "count": len(registry.TOP_STACK)}


@router.get("/by-phase/{phase}")
def by_phase(phase: str):
    """Group categories by phase (data · retrieval · inference · agentic · quality · ops · training · multimodal)."""
    cats = [c for c in registry.CATEGORIES if c["phase"] == phase]
    cat_ids = {c["id"] for c in cats}
    tools = [t for t in registry.TOOLS if t["category"] in cat_ids]
    return {"phase": phase, "categories": cats, "tools": tools,
            "count": {"categories": len(cats), "tools": len(tools)}}


@router.get("/stats")
def stats():
    return registry.stats()
