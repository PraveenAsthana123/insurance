"""Role dependency · Iter 26 · C1 closure.

Convenience wrappers for FastAPI endpoints to declare role requirements.
"""
from __future__ import annotations


from fastapi import Depends, HTTPException, Request


def get_current_role(request: Request) -> str:
    """Read role from RBACMiddleware-set request.state · default 'manager'."""
    return getattr(request.state, "role", None) or "manager"


def require_role(*allowed: str):
    """Endpoint dependency · 403 if role not in allowed set.

    Example:
        @router.delete("/admin/foo", dependencies=[Depends(require_role('admin'))])
    """
    allowed_set = set(allowed)

    def checker(role: str = Depends(get_current_role)):
        if role not in allowed_set:
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": f"role '{role}' not in allowed set",
                    "error_code": "ROLE_FORBIDDEN",
                    "allowed": sorted(allowed_set),
                },
            )
        return role

    return checker


# Pre-bound common dependencies
require_admin = require_role("admin")
require_manager_or_above = require_role("admin", "manager")
require_authenticated = require_role("admin", "manager", "team-member", "tester", "ai-reviewer")
