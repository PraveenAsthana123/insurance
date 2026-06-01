from __future__ import annotations

from fastapi import APIRouter

# Versioned router — preferred for new clients
router = APIRouter(prefix="/api/v1", tags=["health"])

# Unversioned alias — keeps Docker healthcheck + load balancers stable
# even when /api/v1/* is added or moved. Per global §6.5 (versioning rule:
# /api/health stays unversioned to remain stable across version bumps).
unversioned_router = APIRouter(prefix="/api", tags=["health"])


def _health_payload() -> dict:
    return {"status": "healthy", "service": "insur-analytics"}


@router.get("/health")
def health_check_v1() -> dict:
    return _health_payload()


@unversioned_router.get("/health")
def health_check_unversioned() -> dict:
    """Alias for backwards compat — keeps Docker HEALTHCHECK working."""
    return _health_payload()
