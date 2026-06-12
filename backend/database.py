from __future__ import annotations

import logging
from pathlib import Path

import psycopg2
import psycopg2.extras

from contextlib import contextmanager
from typing import Generator
from core.config import get_settings

logger = logging.getLogger(__name__)


@contextmanager
def _connect() -> Generator["psycopg2.extensions.connection", None, None]:
    """Project-local connection context manager.

    Mirrors `core.dependencies.get_db_connection` but is imported by
    routers as `from database import _connect` for legacy compatibility.
    """
    settings = get_settings()
    conn = None
    try:
        conn = psycopg2.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            dbname=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
            connect_timeout=10,
        )
        yield conn
    finally:
        if conn is not None:
            conn.close()

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run_migrations() -> None:
    """
    Applies all unapplied SQL migrations in sorted order.

    - Tracks applied migrations in a `_migrations` table.
    - Reads .sql files from the migrations/ directory.
    - Skips files already recorded in `_migrations`.
    - Never modifies deployed migrations — always add new files.
    """
    settings = get_settings()

    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        dbname=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password,
        connect_timeout=10,
    )

    try:
        with conn.cursor() as cur:
            # Bootstrap migration tracker table
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS _migrations (
                    id          SERIAL PRIMARY KEY,
                    filename    TEXT NOT NULL UNIQUE,
                    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            conn.commit()

            # Discover .sql files
            sql_files = sorted(
                f for f in MIGRATIONS_DIR.iterdir() if f.suffix == ".sql"
            )
            if not sql_files:
                logger.info("No migration files found in %s", MIGRATIONS_DIR)
                return

            # Load already-applied migrations
            cur.execute("SELECT filename FROM _migrations;")
            applied: set[str] = {row[0] for row in cur.fetchall()}

            for sql_file in sql_files:
                filename = sql_file.name
                if filename in applied:
                    logger.debug("Migration already applied: %s", filename)
                    continue

                logger.info("Applying migration: %s", filename)
                sql_content = sql_file.read_text(encoding="utf-8")

                cur.execute(sql_content)
                cur.execute(
                    "INSERT INTO _migrations (filename) VALUES (%s);", (filename,)
                )
                conn.commit()
                logger.info("Migration applied successfully: %s", filename)

    except psycopg2.Error:
        conn.rollback()
        logger.exception("Migration failed — rolling back")
        raise
    finally:
        conn.close()
