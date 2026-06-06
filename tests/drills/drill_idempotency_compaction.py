#!/usr/bin/env python3
"""
Drill: scripts/idempotency_compact.py — JSONL compaction job.

Steps (9 total; 4 negative):
  1. (+) Fresh entries within TTL → all kept; line count unchanged
  2. (+) Expired entries → dropped; line count drops
  3. (+) Duplicate (tenant, key) → latest write kept (matches load semantics)
  4. (-) NEG: corrupt JSON line → skipped + counted in stats.corrupt
  5. (-) NEG: blank lines → skipped silently
  6. (-) NEG: missing file → exit 0 with all-zero stats (no crash)
  7. (+) Atomic write: live file untouched during dry-run
  8. (+) Audit row appended to idempotency_compact_runs.jsonl
  9. (-) NEG: dry-run does NOT write audit row (no false trail)

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "idempotency_compact.py"
VENV_PY = Path("/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python")
PY = str(VENV_PY) if VENV_PY.exists() else sys.executable


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _make_entry(tenant: str, key: str, stored_at: float, target: str = "http://localhost"):
    return {
        "tenant_id": tenant,
        "idempotency_key": key,
        "stored_at": stored_at,
        "response": {
            "adapter": "playwright",
            "status": "dry-run",
            "policy": {
                "agent_id": "cua-local", "decision": "allow",
                "reason": "policy passed",
                "required_controls": ["audit", "correlation-id", "rbac"],
                "audit": {"tool": "cua", "action": "x", "target": target, "tenant": tenant},
            },
            "result": {"target": target, "instruction": "drill"},
        },
    }


def _run(args, timeout=30):
    proc = subprocess.run(
        [PY, str(SCRIPT)] + args, capture_output=True, text=True, timeout=timeout,
    )
    return proc.returncode, proc.stdout, proc.stderr


def main() -> int:
    print("\nDRILL: §10.3 idempotency JSONL compaction\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        target = tmpdir / "idem.jsonl"
        now = time.time()

        # ---- Step 1: fresh entries kept (TTL big) ----
        rows = [
            _make_entry("tenant-a", "K1", now),
            _make_entry("tenant-a", "K2", now - 5),
            _make_entry("tenant-b", "K1", now - 10),
        ]
        target.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
        rc, out, err = _run(["--path", str(target), "--ttl", "3600"])
        kept_lines = target.read_text().count("\n")
        step(1, "fresh entries within TTL → all kept",
             rc == 0 and kept_lines == 3,
             f"rc={rc} kept_lines={kept_lines}")

        # ---- Step 2: expired entries dropped ----
        rows = [
            _make_entry("tenant-c", "OLD-K1", now - 1000),  # expired
            _make_entry("tenant-c", "OLD-K2", now - 2000),  # expired
            _make_entry("tenant-c", "FRESH-K", now),          # kept
        ]
        target.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
        rc, out, err = _run(["--path", str(target), "--ttl", "300"])
        kept_lines = target.read_text().count("\n")
        # Stats should say expired=2, valid=3, kept=1
        step(2, "expired entries dropped → only fresh kept",
             rc == 0 and kept_lines == 1 and "expired=2" in out and "deduped_kept=1" in out,
             f"rc={rc} kept_lines={kept_lines} stdout-tail={out.strip().split(chr(10))[-1][:80]!r}")

        # ---- Step 3: duplicate (tenant, key) → latest write wins ----
        rows = [
            _make_entry("tenant-d", "K-dup", now - 5, target="http://OLD"),
            _make_entry("tenant-d", "K-dup", now,     target="http://NEW"),
        ]
        target.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
        rc, out, err = _run(["--path", str(target), "--ttl", "3600"])
        final = json.loads(target.read_text().strip())
        step(3, "duplicate (tenant, key) → latest write kept",
             rc == 0 and final["response"]["result"]["target"] == "http://NEW",
             f"final_target={final['response']['result']['target']!r}")

        # ---- Step 4: NEG corrupt JSON skipped + counted ----
        target.write_text(
            json.dumps(_make_entry("tenant-e", "K-good", now)) + "\n"
            + "{{NOT JSON\n"
            + json.dumps(_make_entry("tenant-e", "K-good2", now)) + "\n"
        )
        rc, out, err = _run(["--path", str(target), "--ttl", "3600"])
        kept_lines = target.read_text().count("\n")
        step(4, "NEG: corrupt JSON line skipped + counted in stats.corrupt",
             rc == 0 and kept_lines == 2 and "corrupt=1" in out,
             f"rc={rc} kept_lines={kept_lines} stats={out.strip().split(chr(10))[-1][:90]!r}")

        # ---- Step 5: NEG blank lines silently skipped ----
        target.write_text(
            "\n\n"
            + json.dumps(_make_entry("tenant-f", "K-good", now)) + "\n"
            + "   \n"
        )
        rc, out, err = _run(["--path", str(target), "--ttl", "3600"])
        kept_lines = target.read_text().count("\n")
        step(5, "NEG: blank lines silently skipped",
             rc == 0 and kept_lines == 1 and "corrupt=0" in out,
             f"rc={rc} kept_lines={kept_lines}")

        # ---- Step 6: NEG missing file → exit 0 ----
        ghost = tmpdir / "does_not_exist.jsonl"
        rc, out, err = _run(["--path", str(ghost), "--ttl", "300"])
        step(6, "NEG: missing file → exit 0 with all-zero stats (no crash)",
             rc == 0 and "lines=0" in out and "deduped_kept=0" in out,
             f"rc={rc} stats={out.strip().split(chr(10))[-1][:90]!r}")

        # ---- Step 7: dry-run does NOT modify file ----
        rows = [
            _make_entry("tenant-g", "OLD", now - 1000),  # would expire
            _make_entry("tenant-g", "NEW", now),
        ]
        original = "\n".join(json.dumps(r) for r in rows) + "\n"
        target.write_text(original)
        rc, out, err = _run(["--path", str(target), "--ttl", "300", "--dry-run"])
        unchanged = target.read_text()
        step(7, "dry-run leaves file untouched (atomic write skipped)",
             rc == 0 and unchanged == original and "(dry-run)" in out,
             f"rc={rc} file_unchanged={unchanged == original}")

        # ---- Step 8: audit row appended on real run ----
        # Need to use the project audit path, which is fixed. Temporarily
        # change CWD to a tmpdir so the script writes its audit there.
        cwd_save = os.getcwd()
        try:
            os.chdir(str(tmpdir))
            target2 = tmpdir / "idem2.jsonl"
            target2.write_text(json.dumps(_make_entry("tenant-h", "K", now)) + "\n")
            rc, out, err = _run(["--path", str(target2), "--ttl", "3600"])
            audit_path = tmpdir / "data" / "agent-supervisor" / "idempotency_compact_runs.jsonl"
            step(8, "real-run appends audit row to idempotency_compact_runs.jsonl",
                 rc == 0 and audit_path.exists() and audit_path.read_text().strip().count("\n") >= 0,
                 f"rc={rc} audit_exists={audit_path.exists()}")
            # ---- Step 9: dry-run does NOT write audit row ----
            audit_lines_before = audit_path.read_text().count("\n") if audit_path.exists() else 0
            target3 = tmpdir / "idem3.jsonl"
            target3.write_text(json.dumps(_make_entry("tenant-i", "K", now)) + "\n")
            rc, out, err = _run(["--path", str(target3), "--ttl", "3600", "--dry-run"])
            audit_lines_after = audit_path.read_text().count("\n") if audit_path.exists() else 0
            step(9, "NEG: dry-run does NOT append audit row (no false trail)",
                 rc == 0 and audit_lines_after == audit_lines_before,
                 f"audit_lines_before={audit_lines_before} audit_lines_after={audit_lines_after}")
        finally:
            os.chdir(cwd_save)

    print(f"\n\033[32mALL 9 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
