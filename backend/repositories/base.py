from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PgConnection

from core.config import get_settings

logger = logging.getLogger(__name__)


class BaseRepository:
    """
    Base class for all repositories.
    Provides a context-manager connection helper with auto commit/rollback.
    """

    def __init__(self) -> None:
        self._settings = get_settings()

    @contextmanager
    def _connect(self) -> Generator[PgConnection, None, None]:
        """
        Opens a psycopg2 connection, yields it, then commits.
        Rolls back on any exception and always closes the connection.

        Usage:
            with self._connect() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT ...")
        """
        conn: PgConnection | None = None
        try:
            conn = psycopg2.connect(
                self._settings.database_url,
                connect_timeout=10,
            )
            yield conn
            conn.commit()
        except psycopg2.Error:
            if conn is not None:
                conn.rollback()
            logger.exception("Repository database error")
            raise
        finally:
            if conn is not None:
                conn.close()
