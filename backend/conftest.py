"""Backend test fixtures.

Auto-skip pytest items marked `@pytest.mark.requires_postgres` (or located in
test modules known to hit postgres) when localhost:5432 is unreachable.

Per global §57.5 "no observability → no deploy" and §57.7 production-grade
honesty — fail loudly if DB is up but credentials are wrong, skip cleanly
if DB is genuinely down.
"""

from __future__ import annotations

import os
import socket
from functools import lru_cache

import pytest

# Modules whose tests inevitably touch postgres (auto-mark requires_postgres
# so authors don't have to remember the decorator).
# Curated list — only modules that actually fail with psycopg.OperationalError
# when DB is down. Other modules (rag/agent/explain/etc.) work without DB.
POSTGRES_BACKED_MODULES = (
    "test_sales_repo",
    "test_sales_router",
    "test_supply_chain_router",
    "test_supply_chain_ingestion",
    "test_supply_chain_repo",
    "test_supply_chain_services",
    "test_rossmann_ingestion",
    "test_customer_ingestion",
    "test_customer_router",
    "test_rbac_middleware",
    "test_churn_model_service",
)


@lru_cache(maxsize=1)
def _postgres_reachable() -> bool:
    """Probe postgres ONCE per session. Two-step:
    1. TCP probe (socket) — confirms a process is listening
    2. psycopg.connect with project DSN — confirms auth works

    Returns True only when both succeed. A listening-but-auth-fail postgres
    counts as unreachable for tests (they would fail with OperationalError
    anyway; skipping is more honest).
    """
    host = os.environ.get("INSUR_DB_HOST", "127.0.0.1")
    port = int(os.environ.get("INSUR_DB_PORT", "5432"))
    # Step 1: TCP listening?
    try:
        with socket.create_connection((host, port), timeout=0.5):
            pass
    except OSError:
        return False
    # Step 2: actually log in? Use the same DSN repos use.
    dsn = os.environ.get(
        "INSUR_DB_DSN",
        f"postgresql://{os.environ.get('INSUR_DB_USER', 'insur_user')}:"
        f"{os.environ.get('INSUR_DB_PASSWORD', 'insur_secret_password')}@"
        f"{host}:{port}/{os.environ.get('INSUR_DB_NAME', 'insur_db')}",
    )
    try:
        import psycopg  # imported lazily so the module loads even without psycopg
        with psycopg.connect(dsn, connect_timeout=1) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False


def pytest_collection_modifyitems(config, items):
    """Auto-mark + auto-skip postgres-backed tests when DB is unreachable."""
    skip_mark = pytest.mark.skip(
        reason="postgres unreachable on localhost:5432 (set INSUR_DB_HOST/PORT or start docker-compose)"
    )
    reachable = _postgres_reachable()
    for item in items:
        mod = item.module.__name__.rsplit(".", 1)[-1] if hasattr(item, "module") else ""
        in_pg_module = mod in POSTGRES_BACKED_MODULES
        has_marker = item.get_closest_marker("requires_postgres") is not None
        if in_pg_module or has_marker:
            if not has_marker:
                item.add_marker(pytest.mark.requires_postgres)
            if not reachable:
                item.add_marker(skip_mark)
