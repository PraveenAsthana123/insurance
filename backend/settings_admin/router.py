"""/api/v1/settings/* · Iter 35 · reload pydantic Settings without restart."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from core.config import get_settings
from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _redact(value):
    """Per §47.6 + §76 Privacy · never leak secrets."""
    if value is None:
        return None
    s = str(value)
    if len(s) <= 8:
        return "***"
    return s[:3] + "***" + s[-3:]


_SECRET_KEYS = {
    "database_url", "redis_url", "secret_key", "api_key",
    "jwt_secret", "encryption_key", "smtp_password",
}


@router.get("/health")
def health():
    return {"status": "ok", "module": "settings"}


@router.get("", dependencies=[Depends(require_admin)])
def view_settings():
    """View current settings · admin only · secrets redacted."""
    try:
        s = get_settings()
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
    fields = {}
    try:
        # Pydantic v2 .model_fields_set / model_dump
        dump = s.model_dump() if hasattr(s, "model_dump") else s.dict()
    except Exception:
        dump = {k: getattr(s, k) for k in dir(s) if not k.startswith("_")}
    for k, v in dump.items():
        if any(secret in k.lower() for secret in _SECRET_KEYS):
            fields[k] = _redact(v)
        else:
            try:
                # Truncate long lists / dicts
                if isinstance(v, (list, tuple)) and len(v) > 10:
                    fields[k] = list(v)[:10] + ["..."]
                else:
                    fields[k] = v
            except Exception:
                fields[k] = repr(v)
    return {"settings": fields, "n_fields": len(fields)}


@router.post("/reload", dependencies=[Depends(require_admin)])
def reload_settings():
    """Bust the LRU cache on get_settings · force re-read of env vars."""
    try:
        get_settings.cache_clear()
        new = get_settings()
        return {
            "reloaded": True,
            "note": "Cache cleared · next get_settings() reads env",
            "sample_field": "database_url=" + _redact(new.database_url),
        }
    except Exception as e:
        return {"reloaded": False, "error": f"{type(e).__name__}: {e}"}
