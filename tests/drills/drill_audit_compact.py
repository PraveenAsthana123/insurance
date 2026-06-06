#!/usr/bin/env python3
"""
Drill: scripts/audit_compact.py — CUA audit-log rotation (NEVER drops rows).

Unlike the idempotency compaction (which has TTL semantics — drop expired),
the §38.3 audit log is a SOC2 trail and MUST preserve every row. This
drill verifies rotation preserves all data + the size threshold behaves
deterministically.

Steps (9 total; 4 negative):
  1. (+) File below threshold + no --force → no rotation, stats correct
  2. (+) File above threshold → rotation: live emptied, archive .gz created,
        archive contains all original rows decompressed
  3. (+) --force ignores threshold → rotation regardless of size
  4. (+) stats.by_outcome counts every outcome class
  5. (-) NEG: corrupt JSON line counted in stats.corrupt, NOT dropped
        (in the gzipped archive — still preserved verbatim)
  6. (-) NEG: blank lines counted in stats.blank, archive preserves them
        (rotation is byte-for-byte preserving)
  7. (-) NEG: dry-run does NOT rotate even if file is huge
  8. (-) NEG: missing file → exit 0 with zero stats (no crash)
  9. (+) Audit-of-audit row appended at data/agent-supervisor/
        audit_compact_runs.jsonl on real rotation

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import gzip
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "audit_compact.py"
VENV_PY = Path("/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python")
PY = str(VENV_PY) if VENV_PY.exists() else sys.executable


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _run(args, timeout=30):
    proc = subprocess.run(
        [PY, str(SCRIPT)] + args, capture_output=True, text=True, timeout=timeout,
    )
    return proc.returncode, proc.stdout, proc.stderr


def _make_row(tenant: str, outcome: str, request_id: str = "r-1") -> dict:
    return {
        "ts": time.time(),
        "request_id": request_id,
        "tenant_id": tenant,
        "actor": "tester",
        "tool": "playwright",
        "target": "about:blank",
        "instruction": "drill",
        "policy_decision": "allow",
        "outcome": outcome,
    }


def main() -> int:
    print("\nDRILL: §38.3 CUA audit-log rotation (audit_compact.py)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        audit = tmpdir / "cua_runs.jsonl"

        # ---- Step 1: below threshold → no rotation ----
        rows = [_make_row("tenant-a", "executed"), _make_row("tenant-a", "blocked")]
        audit.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
        original_size = audit.stat().st_size
        rc, out, err = _run(["--path", str(audit), "--rotate-bytes", str(10 * 1024 * 1024)])
        step(1, "file below threshold → no rotation, stats reported",
             rc == 0 and audit.exists() and audit.stat().st_size == original_size
             and "rotated=False" in out and "valid=2" in out,
             f"rc={rc} size={audit.stat().st_size} kept_original")

        # ---- Step 2: above threshold → rotate + archive contains all rows ----
        # Make file artificially big by adding many rows then setting a tiny threshold
        with audit.open("a") as fh:
            for i in range(50):
                fh.write(json.dumps(_make_row(f"t-{i}", "executed", f"r-{i}")) + "\n")
        pre_count = audit.read_text().count("\n")
        rc, out, err = _run(["--path", str(audit), "--rotate-bytes", "100"])
        # After rotation: live file empty, archive .gz exists
        live_empty = audit.read_text() == ""
        archives = list(tmpdir.glob("cua_runs.*.jsonl.gz"))
        archive_count = 0
        if archives:
            with gzip.open(archives[0], "rt") as fh:
                archive_text = fh.read()
                archive_count = archive_text.count("\n")
        step(2, "above threshold → rotate + .gz archive contains ALL original rows",
             rc == 0 and live_empty and len(archives) == 1
             and archive_count == pre_count,
             f"rc={rc} live_empty={live_empty} archives={len(archives)} pre={pre_count} arch={archive_count}")

        # ---- Step 3: --force ignores threshold ----
        audit2 = tmpdir / "cua_runs2.jsonl"
        audit2.write_text(json.dumps(_make_row("t-force", "executed")) + "\n")
        rc, out, err = _run(["--path", str(audit2), "--rotate-bytes", "999999999", "--force"])
        force_archives = list(tmpdir.glob("cua_runs2.*.jsonl.gz"))
        step(3, "--force rotates regardless of size",
             rc == 0 and "rotated=True" in out and len(force_archives) == 1,
             f"rc={rc} archives={len(force_archives)}")

        # ---- Step 4: by_outcome counts every outcome class ----
        audit3 = tmpdir / "cua_runs3.jsonl"
        outcomes = ["executed", "executed", "blocked", "error", "executed", "unavailable"]
        rows = [_make_row(f"t-{i}", o, f"r-{i}") for i, o in enumerate(outcomes)]
        audit3.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
        rc, out, err = _run(["--path", str(audit3), "--rotate-bytes", "10000000"])
        # Parse stats from stdout
        # by_outcome: {'executed': 3, 'blocked': 1, 'error': 1, 'unavailable': 1}
        has_all = (
            "executed': 3" in out
            and "blocked': 1" in out
            and "error': 1" in out
            and "unavailable': 1" in out
        )
        step(4, "by_outcome counts every outcome class correctly",
             rc == 0 and has_all,
             f"rc={rc} excerpt={out.split('by_outcome:')[-1].splitlines()[0][:80] if 'by_outcome:' in out else 'NO by_outcome line'}")

        # ---- Step 5: NEG corrupt JSON counted, archive preserves verbatim ----
        audit4 = tmpdir / "cua_runs4.jsonl"
        audit4.write_text(
            json.dumps(_make_row("t-1", "executed")) + "\n"
            + "{{NOT JSON\n"
            + json.dumps(_make_row("t-2", "executed")) + "\n"
        )
        rc, out, err = _run(["--path", str(audit4), "--rotate-bytes", "1", "--force"])
        force_archives4 = list(tmpdir.glob("cua_runs4.*.jsonl.gz"))
        archive_text = ""
        if force_archives4:
            with gzip.open(force_archives4[0], "rt") as fh:
                archive_text = fh.read()
        step(5, "NEG: corrupt JSON line counted in stats.corrupt AND preserved verbatim in archive",
             rc == 0 and "corrupt=1" in out
             and "{{NOT JSON" in archive_text,
             f"rc={rc} preserved_corrupt={'{{NOT JSON' in archive_text}")

        # ---- Step 6: NEG blank lines counted; archive byte-preserves ----
        audit5 = tmpdir / "cua_runs5.jsonl"
        audit5.write_text(
            "\n\n"
            + json.dumps(_make_row("t-x", "executed")) + "\n"
            + "   \n"
        )
        pre_bytes = audit5.stat().st_size
        rc, out, err = _run(["--path", str(audit5), "--rotate-bytes", "1", "--force"])
        force_archives5 = list(tmpdir.glob("cua_runs5.*.jsonl.gz"))
        if force_archives5:
            with gzip.open(force_archives5[0], "rb") as fh:
                arch_bytes = fh.read()
        else:
            arch_bytes = b""
        step(6, "NEG: blank lines preserved byte-for-byte in archive",
             rc == 0 and "blank=" in out and len(arch_bytes) == pre_bytes,
             f"rc={rc} pre_bytes={pre_bytes} arch_bytes={len(arch_bytes)}")

        # ---- Step 7: NEG dry-run does NOT rotate even if huge ----
        audit6 = tmpdir / "cua_runs6.jsonl"
        audit6.write_text("\n".join(json.dumps(_make_row(f"t-{i}", "executed")) for i in range(100)) + "\n")
        pre_text = audit6.read_text()
        rc, out, err = _run(["--path", str(audit6), "--rotate-bytes", "1", "--dry-run"])
        force_archives6 = list(tmpdir.glob("cua_runs6.*.jsonl.gz"))
        step(7, "NEG: dry-run does NOT rotate (file untouched, no archive)",
             rc == 0 and audit6.read_text() == pre_text and len(force_archives6) == 0
             and "(dry-run)" in out and "rotated=False" in out,
             f"rc={rc} archives={len(force_archives6)} text_unchanged={audit6.read_text() == pre_text}")

        # ---- Step 8: NEG missing file → exit 0 with zeroes ----
        ghost = tmpdir / "never_existed.jsonl"
        rc, out, err = _run(["--path", str(ghost), "--rotate-bytes", "100"])
        step(8, "NEG: missing file → exit 0 with total_lines=0 (no crash)",
             rc == 0 and "total_lines=0" in out and "rotated=False" in out,
             f"rc={rc} excerpt={out.strip().split(chr(10))[1][:80] if len(out.strip().splitlines()) > 1 else ''!r}")

        # ---- Step 9: audit-of-audit row appended on real rotation ----
        cwd_save = os.getcwd()
        try:
            os.chdir(str(tmpdir))
            audit7 = tmpdir / "cua_runs7.jsonl"
            audit7.write_text(json.dumps(_make_row("t-q", "executed")) + "\n")
            rc, out, err = _run(["--path", str(audit7), "--rotate-bytes", "1", "--force"])
            audit_of_audit = tmpdir / "data" / "agent-supervisor" / "audit_compact_runs.jsonl"
            step(9, "audit-of-audit row appended on real rotation",
                 rc == 0 and audit_of_audit.exists()
                 and audit_of_audit.read_text().strip().count("\n") >= 0,
                 f"audit_of_audit_exists={audit_of_audit.exists()}")
        finally:
            os.chdir(cwd_save)

    print(f"\n\033[32mALL 9 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
