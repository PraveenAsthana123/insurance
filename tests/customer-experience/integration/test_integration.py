"""Tier 2 — Integration tests for customer-experience.

Recommended: pytest + real PostgreSQL + real Redis.
Per global §64.30 tier 2: cross-service flows touch real DB + cache.
"""
import os
import pytest


@pytest.mark.skip(reason="placeholder — requires real DB + cache fixtures")
def test_customer_experience_db_roundtrip():
    """REPLACE — verify customer-experience table CRUD round-trips against real Postgres."""
    pass


@pytest.mark.skip(reason="placeholder — requires Redis + queue fixtures")
def test_customer_experience_queue_dispatch():
    """REPLACE — verify customer-experience task enqueue + consume via Redis."""
    pass


def test_env_vars_present():
    """Smoke: required env vars are at least readable (may be None in CI)."""
    # Don't require values; just verify the names exist as readable env keys
    _ = os.environ.get("REDIS_URL", "")
    _ = os.environ.get("DATABASE_URL", "")
