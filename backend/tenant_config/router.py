"""/api/v1/tenant-config/* · Iter 34 · per-tenant feature flag overrides."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/tenant-config", tags=["tenant-config"])

STORE = Path(os.environ.get("INSUR_TENANT_CONFIG_PATH", "data/tenant_config.json"))
STORE.parent.mkdir(parents=True, exist_ok=True)


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"tenants": {}}


def _save(d: dict) -> None:
    STORE.write_text(json.dumps(d, indent=2))


class OverrideRequest(BaseModel):
    flag_key: str
    enabled: bool | None = None
    rollout_pct: int | None = None
    description: str | None = None


@router.get("/health")
def health():
    d = _load()
    return {
        "status": "ok",
        "module": "tenant-config",
        "tenants_configured": len(d.get("tenants", {})),
    }


@router.get("/{tenant_id}")
def get_tenant_config(tenant_id: str):
    d = _load()
    return {
        "tenant_id": tenant_id,
        "overrides": d["tenants"].get(tenant_id, {}),
    }


@router.put("/{tenant_id}/{flag_key}", dependencies=[Depends(require_admin)])
def set_override(tenant_id: str, flag_key: str, body: OverrideRequest):
    d = _load()
    tenant = d["tenants"].setdefault(tenant_id, {})
    cur = tenant.get(flag_key, {})
    if body.enabled is not None: cur["enabled"] = body.enabled
    if body.rollout_pct is not None:
        if body.rollout_pct < 0 or body.rollout_pct > 100:
            raise HTTPException(400, {"detail": "rollout_pct must be 0-100",
                                       "error_code": "BAD_PCT"})
        cur["rollout_pct"] = body.rollout_pct
    if body.description is not None: cur["description"] = body.description
    tenant[flag_key] = cur
    _save(d)
    return {"tenant_id": tenant_id, "flag_key": flag_key, "config": cur}


@router.delete("/{tenant_id}/{flag_key}", dependencies=[Depends(require_admin)])
def remove_override(tenant_id: str, flag_key: str):
    d = _load()
    tenant = d["tenants"].get(tenant_id, {})
    if flag_key in tenant:
        del tenant[flag_key]
        _save(d)
        return {"removed": flag_key, "tenant_id": tenant_id}
    return {"not_found": flag_key, "tenant_id": tenant_id}


@router.get("/{tenant_id}/effective/{flag_key}")
def effective_value(tenant_id: str, flag_key: str):
    """Returns effective value · tenant override first · global default fallback."""
    d = _load()
    tenant = d["tenants"].get(tenant_id, {})
    if flag_key in tenant:
        return {"source": "tenant", "tenant_id": tenant_id, **tenant[flag_key]}
    try:
        from feature_flags.router import _load as load_global
        global_flags = load_global()
        if flag_key in global_flags:
            return {"source": "global-default", **global_flags[flag_key]}
    except Exception:
        pass
    return {"source": "none", "enabled": False, "rollout_pct": 0}
