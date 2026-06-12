"""/api/v1/autonomous-dept/* — read-only autonomous-department framework registry."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter

from . import registry

router = APIRouter(prefix="/api/v1/autonomous-dept", tags=["autonomous-dept"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "autonomous-dept-registry",
            "stats": registry.stats()}


@router.get("/maturity")
def maturity():
    """10-level autonomy maturity model · this project's position annotated."""
    return {"levels": registry.MATURITY_LEVELS,
            "count": len(registry.MATURITY_LEVELS)}


@router.get("/governance")
def governance():
    """14 continuous-learning governance gates."""
    return {"gates": registry.GOVERNANCE_GATES,
            "count": len(registry.GOVERNANCE_GATES)}


@router.get("/mcp-categories")
def mcp_categories(priority_lte: Optional[int] = None):
    """13 MCP marketing categories · optional priority filter."""
    items = registry.MCP_CATEGORIES
    if priority_lte is not None:
        items = [m for m in items if m["priority"] <= priority_lte]
    return {"mcp_categories": items, "count": len(items)}


@router.get("/hybrids")
def hybrids(value: Optional[str] = None, level: Optional[str] = None):
    """10 multi-AI hybrid use cases."""
    items = registry.HYBRIDS
    if value:
        items = [h for h in items if h["value"] == value]
    if level:
        items = [h for h in items if h["level"] == level]
    return {"hybrids": items, "count": len(items)}


@router.get("/marketing-stack")
def marketing_stack():
    """Open-source autonomous marketing stack."""
    return {"tools": registry.MARKETING_OSS_STACK,
            "count": len(registry.MARKETING_OSS_STACK)}


@router.get("/contact-center")
def contact_center():
    """Contact center voice AI stack (STT · TTS · platforms · LLMs)."""
    return {"tools": registry.CONTACT_CENTER_STACK,
            "count": len(registry.CONTACT_CENTER_STACK)}


@router.get("/browser-stack")
def browser_stack(layer: Optional[str] = None):
    """6-layer browser-agent + computer-use stack."""
    items = registry.BROWSER_STACK
    if layer:
        items = [t for t in items if layer.lower() in t["layer"].lower()]
    return {"tools": items, "count": len(items)}


@router.get("/hitl-tiers")
def hitl_tiers():
    """Human-in-the-loop risk tier matrix."""
    return {"tiers": registry.HITL_RISK_TIERS,
            "count": len(registry.HITL_RISK_TIERS)}


@router.get("/stats")
def stats():
    return registry.stats()
