#!/usr/bin/env python3
"""Snapshot OpenAPI spec to docs/openapi.json for contract evolution tracking.

Per global §6.4 + brutal review 2026-06-01 ("0 OpenAPI snapshots committed").

Usage:
    python scripts/generate_openapi_snapshot.py
    # writes docs/openapi.json

CI gate (recommended):
    python scripts/generate_openapi_snapshot.py --check
    # exits 1 if current spec diffs from committed docs/openapi.json
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SNAPSHOT = REPO / "docs" / "openapi.json"


def main() -> int:
    check_mode = "--check" in sys.argv

    sys.path.insert(0, str(REPO / "backend"))
    try:
        from main import create_app
    except ImportError as e:
        print(f"FAIL: backend import error: {e}")
        return 1

    app = create_app()
    spec = app.openapi()
    new = json.dumps(spec, indent=2, sort_keys=True, default=str)

    if check_mode:
        if not SNAPSHOT.is_file():
            print(f"FAIL: snapshot missing — run without --check to create")
            return 1
        existing = SNAPSHOT.read_text()
        if existing == new:
            print(f"OK: spec matches committed snapshot ({len(new)} bytes)")
            return 0
        print(f"DIFF: spec diverges from committed snapshot")
        print(f"  committed: {len(existing)} bytes")
        print(f"  current:   {len(new)} bytes")
        print(f"  rerun without --check to update")
        return 1

    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(new)
    route_count = len([r for r in app.routes if hasattr(r, "path")])
    op_count = sum(
        1 for _path, methods in spec.get("paths", {}).items()
        for _method in methods if isinstance(methods, dict)
    )
    print(f"Wrote {SNAPSHOT} ({len(new):,} bytes; {route_count} routes; ~{op_count} ops)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
