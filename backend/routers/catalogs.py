"""Catalogs router — surfaces analysis_phase (frameworks + ML phases),
tenants + departments tables, and serves raw markdown docs to the
frontend CatalogsPage.

Per migration 015 + 016 + 017. Composes with §38.3, §41.3, §47.6,
§63, §66.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse

from repositories import catalogs_repo

router = APIRouter(prefix="/api/v1/catalogs", tags=["catalogs"])

# Repo root — files live at <root>/docs/{ai_assurance,ml_methodology,digital_transformation}/
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Allowed markdown prefixes — defense in depth against path traversal.
_ALLOWED_PREFIXES = (
    "docs/ai_assurance/",
    "docs/ml_methodology/",
    "docs/digital_transformation/",
)


@router.get("/phases", summary="List analysis phases (AI assurance + ML methodology)")
def list_phases(
    family: str | None = Query(default=None, description="ai_assurance | ml_methodology | governance"),
) -> dict[str, Any]:
    """Read analysis_phase table from migration 015 + 016."""
    try:
        rows = catalogs_repo.list_phases(family=family)
    except Exception as exc:  # noqa: BLE001
        return {"items": [], "error": str(exc), "source": "fallback"}
    return {"items": rows, "total": len(rows), "source": "live"}


@router.get("/modules", summary="List analysis modules for a phase")
def list_modules(
    phase_id: int = Query(..., description="phase id (101-111 ai_assurance, 201-211 ml_methodology)"),
) -> dict[str, Any]:
    try:
        rows = catalogs_repo.list_modules(phase_id)
    except Exception as exc:  # noqa: BLE001
        return {"items": [], "error": str(exc), "source": "fallback"}
    return {"items": rows, "total": len(rows), "phase_id": phase_id, "source": "live"}


@router.get("/raw", summary="Serve raw markdown from docs/", response_class=PlainTextResponse)
def get_raw_markdown(path: str = Query(..., description="Path under docs/ to serve")) -> Response:
    """Serve raw markdown for the frontend CatalogsPage.

    Defense-in-depth:
    - Allowlist prefix check (no traversal out of docs/)
    - Path resolution + startswith() guard
    - Read-only; no mutation surface
    """
    # Prefix allowlist
    if not any(path.startswith(p) for p in _ALLOWED_PREFIXES):
        raise HTTPException(status_code=400, detail="path must be under docs/ai_assurance, docs/ml_methodology, or docs/digital_transformation")

    target = (_REPO_ROOT / path).resolve()
    # startswith guard against ../../ escape attempts
    if not str(target).startswith(str(_REPO_ROOT.resolve()) + "/"):
        raise HTTPException(status_code=400, detail="path traversal rejected")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail=f"not found: {path}")
    if not target.suffix == ".md":
        raise HTTPException(status_code=400, detail="only .md files supported")

    text = target.read_text(encoding="utf-8")
    return PlainTextResponse(content=text, media_type="text/markdown; charset=utf-8")


@router.get("/dt-checklists", summary="List digital transformation docs (checklists + process catalogs)")
def list_dt_docs() -> dict[str, Any]:
    """Discover DT docs by scanning the folder. Avoids hardcoding."""
    folder = _REPO_ROOT / "docs" / "digital_transformation"
    if not folder.exists():
        return {"items": [], "error": "folder missing", "source": "fallback"}

    items = []
    for md in sorted(folder.glob("*.md")):
        if md.name == "README.md":
            continue
        # Classify by filename
        if "checklist" in md.name or "2026" in md.name:
            kind = "checklist"
        elif "processes" in md.name:
            kind = "process_catalog"
        else:
            kind = "other"
        items.append({
            "file": f"docs/digital_transformation/{md.name}",
            "name": md.stem.replace("_", " ").title(),
            "kind": kind,
            "size_bytes": md.stat().st_size,
        })

    return {"items": items, "total": len(items), "source": "live"}
