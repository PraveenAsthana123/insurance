from __future__ import annotations

import logging
from contextlib import contextmanager
from functools import lru_cache
from typing import Generator

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PgConnection

from core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def get_cached_settings() -> Settings:
    """FastAPI Depends() factory — returns the cached Settings singleton."""
    return get_settings()


# ── Repository factories ───────────────────────────────────────────────────────

def get_department_repo():
    from repositories.department_repo import DepartmentRepository
    return DepartmentRepository()


def get_process_repo():
    from repositories.process_repo import ProcessRepository
    return ProcessRepository()


def get_dataset_repo():
    from repositories.dataset_repo import DatasetRepository
    return DatasetRepository()


def get_model_repo():
    from repositories.model_repo import ModelRepository
    return ModelRepository()


def get_job_repo():
    from repositories.job_repo import JobRepository
    return JobRepository()


# ── Service factories ──────────────────────────────────────────────────────────

def get_department_service():
    from services.department_service import DepartmentService
    return DepartmentService(
        dept_repo=get_department_repo(),
        process_repo=get_process_repo(),
    )


def get_process_service():
    from services.process_service import ProcessService
    return ProcessService(process_repo=get_process_repo())


def get_dataset_service():
    from services.dataset_service import DatasetService
    return DatasetService(dataset_repo=get_dataset_repo())


def get_ml_service():
    from services.ml_service import MLService
    return MLService(model_repo=get_model_repo())


def get_job_service():
    from services.job_service import JobService
    return JobService(job_repo=get_job_repo())


@contextmanager
def get_db_connection() -> Generator[PgConnection, None, None]:
    """
    Context manager that opens a psycopg2 connection to PostgreSQL and
    ensures it is always closed, even on error.

    Usage:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT 1")
    """
    settings = get_settings()
    conn: PgConnection | None = None
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
        conn.commit()
    except psycopg2.Error:
        if conn is not None:
            conn.rollback()
        logger.exception("Database connection error")
        raise
    finally:
        if conn is not None:
            conn.close()
