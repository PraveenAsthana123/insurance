"""Insurance dept + role scope — single source of truth.

Per Phase 2.2 of docs/AUDIT_FIX_PLAN.md. Removes the 4-dept hardcoding from
backend/routers/insurance.py and scripts/audit_insurance_artifacts.py.

Three scope modes (env var INSUR_DEPT_SCOPE):
  - 'core'   (default): the 4 wired-end-to-end depts (claims/underwriting/CS/fraud-siu)
  - 'full'   : all 22 depts from data/insurance/blueprint.json or config/insurance.catalog.json
  - 'custom' : comma-separated list in env INSUR_DEPT_CUSTOM

Returns deterministic order (sorted) so downstream code is stable.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_JSON = REPO_ROOT / "config" / "insurance.catalog.json"
BLUEPRINT_JSON = REPO_ROOT / "data" / "insurance" / "blueprint.json"

CORE_DEPTS = ("claims", "underwriting", "customer-service", "fraud-siu")

ROLES = (
    "admin", "manager", "team-member", "tester", "security",
    "devops", "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect",
    "data-owner", "ai-strategy", "information-security",
)


@lru_cache(maxsize=1)
def _load_full_depts() -> tuple[str, ...]:
    """Load full dept list from catalog or blueprint. Cached."""
    # Prefer config/insurance.catalog.json (lighter)
    if CATALOG_JSON.is_file():
        try:
            data = json.loads(CATALOG_JSON.read_text())
            depts = [d.get("slug") or d.get("id") or d.get("name", "").lower().replace(" ", "-")
                     for d in data.get("departments", [])]
            depts = [d for d in depts if d]
            if depts:
                return tuple(sorted(set(depts)))
        except Exception:
            pass
    if BLUEPRINT_JSON.is_file():
        try:
            data = json.loads(BLUEPRINT_JSON.read_text())
            depts = [d.get("id") or d.get("name", "").lower().replace(" ", "-")
                     for d in data.get("department_catalog", [])]
            depts = [d for d in depts if d]
            if depts:
                return tuple(sorted(set(depts)))
        except Exception:
            pass
    return CORE_DEPTS


def get_insurance_depts() -> tuple[str, ...]:
    """Return the active dept list per INSUR_DEPT_SCOPE env var."""
    scope = os.environ.get("INSUR_DEPT_SCOPE", "core").lower()
    if scope == "full":
        return _load_full_depts()
    if scope == "custom":
        custom = os.environ.get("INSUR_DEPT_CUSTOM", "")
        depts = tuple(sorted({d.strip() for d in custom.split(",") if d.strip()}))
        return depts or CORE_DEPTS
    return CORE_DEPTS


def get_roles() -> tuple[str, ...]:
    return ROLES
