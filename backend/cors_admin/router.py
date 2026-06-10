"""/api/v1/cors-admin/* · Iter 32 · CORS allowlist + rate-limit view."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from core.config import get_settings
from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/cors-admin", tags=["cors-admin"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "cors-admin"}


@router.get("/origins")
def list_origins():
    """View configured CORS origins · public · no secrets."""
    s = get_settings()
    origins = getattr(s, "cors_origin_list", [])
    return {
        "origins": list(origins),
        "count": len(origins),
        "note": "Restart required to change CORS_ORIGINS env var",
    }


@router.get("/rate-limits", dependencies=[Depends(require_admin)])
def view_rate_limits():
    """Per-tenant + per-IP rate-limit state · admin only."""
    try:
        # Use existing RateLimitMiddleware module · expose its in-memory dict.
        from core.middleware import RateLimitMiddleware
        rl_state = getattr(RateLimitMiddleware, "_window", {})
        # Aggregate
        by_key: dict[str, int] = {}
        for k, v in rl_state.items():
            count = len(v) if hasattr(v, "__len__") else 0
            by_key[k] = count
        return {
            "tenants_tracked": sum(1 for k in by_key if not k.startswith("ip:")),
            "ips_tracked": sum(1 for k in by_key if k.startswith("ip:")),
            "by_key": dict(sorted(by_key.items(), key=lambda x: x[1], reverse=True)[:50]),
            "total_keys": len(by_key),
            "note": "Counts from last sliding window · resets at window edge",
        }
    except Exception as e:
        return {
            "error": f"{type(e).__name__}: {e}",
            "tenants_tracked": 0,
            "ips_tracked": 0,
            "by_key": {},
        }
