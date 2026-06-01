from __future__ import annotations

import json
import logging
import os

import psycopg2

from core.config import get_settings

logger = logging.getLogger(__name__)

_SEEDS_DIR = os.path.dirname(__file__)


def _load_json(filename: str) -> list:
    path = os.path.join(_SEEDS_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def run_seeds() -> None:
    """
    Seed the database with reference data on first run.
    Checks department count — if already seeded, exits immediately.
    """
    settings = get_settings()

    conn = psycopg2.connect(settings.database_url)
    try:
        cur = conn.cursor()

        # Idempotency guard
        cur.execute("SELECT COUNT(*) FROM departments")
        if cur.fetchone()[0] > 0:
            logger.info("Database already seeded, skipping.")
            cur.close()
            return

        # ── 1. Departments ─────────────────────────────────────────────────
        departments = _load_json("departments.json")
        for dept in departments:
            cur.execute(
                """
                INSERT INTO departments (name, icon, description, color, route)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (dept["name"], dept["icon"], dept["description"], dept["color"], dept["route"]),
            )
        conn.commit()
        logger.info("Seeded %d departments", len(departments))

        # ── 2. Processes ───────────────────────────────────────────────────
        processes = _load_json("processes.json")
        process_id_map: dict[tuple[str, str], int] = {}  # (dept_route, proc_name) -> id

        for proc in processes:
            cur.execute("SELECT id FROM departments WHERE route = %s", (proc["department_route"],))
            row = cur.fetchone()
            if row is None:
                logger.warning("Department route not found: %s — skipping process %s", proc["department_route"], proc["name"])
                continue
            dept_id = row[0]

            cur.execute(
                """
                INSERT INTO processes
                    (department_id, name, description, inputs, outputs, pain_points, kpi, data_needed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    dept_id,
                    proc["name"],
                    proc["description"],
                    proc["inputs"],
                    proc["outputs"],
                    proc["pain_points"],
                    proc["kpi"],
                    proc["data_needed"],
                ),
            )
            proc_id = cur.fetchone()[0]
            process_id_map[(proc["department_route"], proc["name"])] = proc_id

        conn.commit()
        logger.info("Seeded %d processes", len(processes))

        # ── 3. AI Mappings ─────────────────────────────────────────────────
        ai_mappings = _load_json("ai_mappings.json")
        ai_seeded = 0
        for mapping in ai_mappings:
            key = (mapping["department_route"], mapping["process_name"])
            proc_id = process_id_map.get(key)
            if proc_id is None:
                logger.warning("Process not found for AI mapping: %s/%s — skipping", *key)
                continue
            cur.execute(
                """
                INSERT INTO ai_mappings (process_id, ai_type, use_case, example_output)
                VALUES (%s, %s, %s, %s)
                """,
                (proc_id, mapping["ai_type"], mapping["use_case"], mapping["example_output"]),
            )
            ai_seeded += 1

        conn.commit()
        logger.info("Seeded %d AI mappings", ai_seeded)

        # ── 4. ROI Metrics ─────────────────────────────────────────────────
        roi_metrics = _load_json("roi_metrics.json")
        roi_seeded = 0
        for roi in roi_metrics:
            cur.execute("SELECT id FROM departments WHERE route = %s", (roi["department_route"],))
            row = cur.fetchone()
            if row is None:
                logger.warning("Department route not found for ROI metric: %s", roi["department_route"])
                continue
            cur.execute(
                """
                INSERT INTO roi_metrics
                    (department_id, benefit_area, impact_range, description, measurement_method)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    row[0],
                    roi["benefit_area"],
                    roi["impact_range"],
                    roi["description"],
                    roi["measurement_method"],
                ),
            )
            roi_seeded += 1

        conn.commit()
        logger.info("Seeded %d ROI metrics", roi_seeded)
        logger.info(
            "Seed complete — %d departments, %d processes, %d AI mappings, %d ROI metrics",
            len(departments),
            len(processes),
            ai_seeded,
            roi_seeded,
        )

        cur.close()

    except psycopg2.Error:
        conn.rollback()
        logger.exception("Seed failed — rolling back")
        raise
    finally:
        conn.close()
