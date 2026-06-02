"""§68.6 PII inventory — answers "where does PII live? what's redacted?"

Source-of-truth is the per-process tables catalog (data/dbviewer/
per_process_tables.json) PLUS live introspection via dbviewer_service
when the DB is reachable. When the DB is unreachable, returns catalog-
only view (graceful degradation per §57.7).

Three operator questions this answers:
  1. Which columns project-wide contain PII? (cross-dept inventory)
  2. Which PII columns does this dept touch? (per-dept slice)
  3. Has PII appeared in plaintext anywhere it shouldn't have?
     (leak scan over recent audit-log lines — best-effort regex match)

Composes with §38.3 (audit on read) + §41.3 (tenant isolation —
per-dept is already implicitly tenant-scoped via dept filter) + §47.6
(SOC2 CC6.2 PII handling) + §57.7 (graceful degradation) + §68
(Observability Hub iter 2).

The "leak" surface is intentionally heuristic-only: scans the insur_reads
audit log for plaintext PII patterns that should have been redacted. A
hit means either (a) a real leak (operator should investigate) OR (b)
the PII heuristic over-redacted somewhere else. Both are actionable.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

from services import dbviewer_service as dbv

logger = logging.getLogger(__name__)

# Audit log to scan for leaks. Same env var the federation helper writes
# to (core.insur_audit) — INSUR_AUDIT_PATH wins, then well-known fallbacks.
_AUDIT_LOG_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "insur_reads.jsonl",
    Path("/app/data/agent-supervisor/insur_reads.jsonl"),
    Path("/data/agent-supervisor/insur_reads.jsonl"),
]


def _audit_log_path() -> Path | None:
    """Resolve the active audit log. INSUR_AUDIT_PATH env wins (matches
    the federation helper) so tests + alternate deploys can override."""
    env_override = os.environ.get("INSUR_AUDIT_PATH")
    if env_override:
        p = Path(env_override)
        if p.exists():
            return p
    for p in _AUDIT_LOG_CANDIDATES:
        if p.exists():
            return p
    return None


# Plaintext PII pattern catalog. Conservative — false positives are OK
# (operator investigates), false negatives are NOT OK (leak undetected).
# These patterns match RAW PII as it would appear in a log line, NOT just
# column names — that's the dbviewer.is_pii_column job.
_LEAK_PATTERNS: dict[str, re.Pattern[str]] = {
    "email":       re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "phone":       re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "ssn_us":      re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
    "iban":        re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b"),
}


# Allowlist of substrings that look PII-like but are NOT leaks (request_id
# patterns / correlation IDs / typed-field placeholders). Anything in the
# audit row matching one of these is skipped before the leak regex runs.
_LEAK_FALSE_POSITIVE_HINTS = ("request_id", "correlation_id", "tenant_id",
                              "evt-", "openclaw-", "council-", "drill-")


def cross_dept_inventory() -> dict[str, Any]:
    """Aggregate PII inventory across every annotated process + entity.

    Pulls from:
      - per_process_tables.json (pii_columns annotations per process)
      - master_data ENTITY_CATALOG (fields_pii per entity — already
        ships via the existing master_data router)
    """
    cat = dbv.load_process_tables()
    processes = cat.get("processes", [])

    # Process-level inventory
    per_process: list[dict[str, Any]] = []
    all_pii_columns: set[str] = set()
    for p in processes:
        pii_cols = p.get("pii_columns", []) or []
        per_process.append({
            "dept": p.get("dept"),
            "process_id": p.get("process_id"),
            "primary_table": p.get("primary_table"),
            "pii_columns": pii_cols,
            "n_pii_columns": len(pii_cols),
            "status": p.get("status"),
        })
        all_pii_columns.update(pii_cols)

    # Master-entity inventory — best-effort, the catalog lives in
    # master_data router so import lazily.
    entity_inventory: list[dict[str, Any]] = []
    try:
        from routers.master_data import ENTITY_CATALOG  # noqa: PLC0415
        for name, meta in ENTITY_CATALOG.items():
            pii_fields = meta.get("fields_pii", []) or []
            entity_inventory.append({
                "entity": name,
                "owner": meta.get("owner"),
                "pii_fields": pii_fields,
                "n_pii_fields": len(pii_fields),
            })
    except Exception as exc:  # noqa: BLE001
        logger.info("pii_inventory: ENTITY_CATALOG load skipped (%s)", type(exc).__name__)

    return {
        "policy": "§68.6 PII inventory",
        "n_processes_annotated": sum(1 for p in per_process if p["n_pii_columns"] > 0),
        "n_processes_total": len(per_process),
        "n_distinct_pii_columns": len(all_pii_columns),
        "distinct_pii_columns": sorted(all_pii_columns),
        "per_process": per_process,
        "entity_inventory": entity_inventory,
        "redaction_default": "PII redacted unless ?include_pii=1 + SOC2 CC6.2 audit row (§47.6)",
        "scanned_at": time.time(),
    }


def per_dept_inventory(dept: str) -> dict[str, Any] | None:
    """PII inventory slice for one dept."""
    cat = dbv.load_process_tables()
    rows = [p for p in cat.get("processes", []) if p.get("dept") == dept]
    if not rows:
        return None
    pii_total: set[str] = set()
    per_process = []
    for p in rows:
        pii_cols = p.get("pii_columns", []) or []
        per_process.append({
            "process_id": p.get("process_id"),
            "primary_table": p.get("primary_table"),
            "pii_columns": pii_cols,
            "n_pii_columns": len(pii_cols),
            "status": p.get("status"),
        })
        pii_total.update(pii_cols)
    return {
        "dept": dept,
        "n_processes": len(rows),
        "n_distinct_pii_columns": len(pii_total),
        "distinct_pii_columns": sorted(pii_total),
        "per_process": per_process,
        "scanned_at": time.time(),
    }


def scan_leaks(since_epoch: float = 0.0, limit: int = 100) -> dict[str, Any]:
    """Scan recent audit-log lines for plaintext PII patterns.

    Per §68.6 — hits flag either (a) a real leak the redactor missed OR
    (b) the heuristic over-redacted somewhere else; both actionable.
    Best-effort: missing file → empty result; corrupt JSON skipped.
    """
    path = _audit_log_path()
    if path is None:
        return {
            "status": "no_audit_log",
            "since_epoch": since_epoch,
            "n_hits": 0,
            "hits": [],
            "scanned_at": time.time(),
        }

    hits: list[dict[str, Any]] = []
    n_scanned = 0
    try:
        for line in path.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            n_scanned += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            row_ts = row.get("ts", 0)
            if since_epoch and row_ts < since_epoch:
                continue

            # Skip rows whose only PII-looking content is allowlist IDs.
            blob = json.dumps(row, separators=(",", ":"))
            for hint in _LEAK_FALSE_POSITIVE_HINTS:
                # Replace ID-like fields with empty so they don't trigger leak regex
                blob = re.sub(
                    rf'"{hint}":"[^"]+"',
                    f'"{hint}":""',
                    blob,
                )

            for pii_type, pattern in _LEAK_PATTERNS.items():
                m = pattern.search(blob)
                if m:
                    # Don't return the actual matched PII string — hash + first/last char
                    matched = m.group(0)
                    redacted_match = (
                        f"{matched[0]}***{matched[-1]}" if len(matched) >= 2 else "***"
                    )
                    hits.append({
                        "pii_type": pii_type,
                        "row_ts": row_ts,
                        "row_request_id": row.get("request_id", ""),
                        "row_surface": row.get("surface", ""),
                        "row_endpoint": row.get("endpoint", ""),
                        "row_tenant_id": row.get("tenant_id", ""),
                        "match_redacted": redacted_match,
                        "match_length": len(matched),
                    })
                    if len(hits) >= limit:
                        break
            if len(hits) >= limit:
                break
    except OSError as exc:
        return {
            "status": "audit_log_unreadable",
            "error_type": type(exc).__name__,
            "n_hits": 0,
            "hits": [],
            "scanned_at": time.time(),
        }

    return {
        "status": "scanned",
        "audit_log": str(path),
        "since_epoch": since_epoch,
        "n_rows_scanned": n_scanned,
        "n_hits": len(hits),
        "hits": hits,
        "patterns_checked": sorted(_LEAK_PATTERNS.keys()),
        "scanned_at": time.time(),
    }
