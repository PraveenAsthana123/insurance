#!/usr/bin/env python3
"""
Drill: disk persistence of the §10.3 CUA idempotency cache.

The in-memory cache (drill_cua_idempotency.py) survives only the lifetime
of the Python process. This drill exercises the JSONL-backed persistence
layer that survives process restarts and supports multi-replica deploys
where multiple workers share the same disk path.

Steps (10 total; 4 negative):
  1. (+) Store K1 -> JSONL file exists on disk with one valid entry
  2. (+) Simulated restart (clear in-memory cache) -> next lookup returns
        cached response from disk + idempotent_replay=True
  3. (+) Cross-tenant isolation survives the restart (tenant-b's K1 missing)
  4. (-) NEG: TTL-expired entry on disk -> load skips it (treated as absent)
  5. (-) NEG: corrupt JSON line in JSONL -> load skips it (doesn't crash)
  6. (-) NEG: blank line in JSONL -> silently skipped
  7. (+) Multiple stores -> multiple lines (append-only, not overwrite)
  8. (+) Latest write wins when same (tenant, key) appears twice
  9. (-) NEG: missing parent dir on first write -> created automatically
  10.(+) /dev/null persistence path: in-memory cache still works in-process

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _reset_service_state():
    """Force re-import + clear module-level cache between scenarios."""
    for mod in (
        "services.agent_platform_service",
        "schemas.agent_platform",
    ):
        if mod in sys.modules:
            del sys.modules[mod]


def _make_service(idem_path: Path, audit_path: Path, ttl: float = 300.0):
    """Build a fresh service instance with the given disk paths."""
    os.environ["CUA_IDEMPOTENCY_PATH"] = str(idem_path)
    os.environ["CUA_AUDIT_PATH"] = str(audit_path)
    os.environ["CUA_IDEMPOTENCY_TTL_SECONDS"] = str(ttl)
    _reset_service_state()
    from services.agent_platform_service import AgentPlatformIntegrationService
    from schemas.agent_platform import CuaExecutionRequest
    return AgentPlatformIntegrationService(), CuaExecutionRequest


def _call(svc, RequestCls, tenant_id: str, key: str | None = None, target: str = "http://localhost:3000"):
    """Helper: dry-run call with optional idempotency key."""
    body = dict(
        instruction="drill call", target=target,
        adapter="playwright", dry_run=True, user_role="tester",
        metadata={"tenant_id": tenant_id},
    )
    if key is not None:
        body["idempotency_key"] = key
    return svc.execute_cua(RequestCls(**body))


def _make_response_dict():
    """Return a minimal valid CuaExecutionResponse dict for hand-seeded entries."""
    return {
        "adapter": "playwright",
        "status": "dry-run",
        "policy": {
            "agent_id": "cua-local", "decision": "allow",
            "reason": "policy passed",
            "required_controls": ["audit", "correlation-id", "rbac"],
            "audit": {"tool": "cua", "action": "x", "target": "http://localhost", "tenant": "tenant-x"},
        },
        "result": {"target": "http://localhost", "instruction": "from disk"},
    }


def main() -> int:
    print("\nDRILL: §10.3 idempotency cache disk persistence\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        idem_path = Path(tmp) / "idem.jsonl"
        audit_path = Path(tmp) / "audit.jsonl"

        # ---- Step 1: Store K1 -> file exists with valid entry ----
        svc1, RequestCls = _make_service(idem_path, audit_path)
        _call(svc1, RequestCls, "tenant-a", "K1", target="http://localhost:3000")
        on_disk = idem_path.exists()
        entries = []
        if on_disk:
            entries = [json.loads(line) for line in idem_path.read_text().splitlines() if line.strip()]
        step(1, "store K1 -> JSONL file exists with one valid entry",
             on_disk and len(entries) == 1
             and entries[0]["tenant_id"] == "tenant-a"
             and entries[0]["idempotency_key"] == "K1",
             f"on_disk={on_disk} entries={len(entries)}")

        # ---- Step 2: Simulated restart - fresh service from same path ----
        svc2, _ = _make_service(idem_path, audit_path)
        r2 = _call(svc2, RequestCls, "tenant-a", "K1", target="http://localhost:9999/DIFFERENT")
        step(2, "simulated restart -> lookup loads from disk + idempotent_replay=True",
             r2.result.get("idempotent_replay") is True
             and r2.result.get("target") == "http://localhost:3000",
             f"replay={r2.result.get('idempotent_replay')} target={r2.result.get('target')!r}")

        # ---- Step 3: Cross-tenant isolation survives restart ----
        svc3, _ = _make_service(idem_path, audit_path)
        r3 = _call(svc3, RequestCls, "tenant-b", "K1")
        step(3, "cross-tenant isolation survives restart (tenant-b K1 -> fresh)",
             "idempotent_replay" not in r3.result,
             f"replay={r3.result.get('idempotent_replay')}")

        # ---- Step 4: NEG - TTL-expired entry on disk -> skipped on load ----
        old_path = Path(tmp) / "expired.jsonl"
        old_path.parent.mkdir(parents=True, exist_ok=True)
        old_entry = {
            "tenant_id": "tenant-x", "idempotency_key": "K-old",
            "stored_at": time.time() - 1000,
            "response": _make_response_dict(),
        }
        old_path.write_text(json.dumps(old_entry) + "\n")
        svc4, _ = _make_service(old_path, audit_path, ttl=10.0)
        r4 = _call(svc4, RequestCls, "tenant-x", "K-old", target="http://localhost:1234/new")
        step(4, "NEG: TTL-expired entry on disk -> skipped (treated as absent)",
             "idempotent_replay" not in r4.result,
             f"replay={r4.result.get('idempotent_replay')} (must be absent)")

        # ---- Step 5: NEG - corrupt JSON line skipped on load ----
        corrupt_path = Path(tmp) / "corrupt.jsonl"
        real_entry_1 = {
            "tenant_id": "tenant-y", "idempotency_key": "K-good-1",
            "stored_at": time.time(), "response": _make_response_dict(),
        }
        real_entry_2 = {
            "tenant_id": "tenant-y", "idempotency_key": "K-good-2",
            "stored_at": time.time(), "response": _make_response_dict(),
        }
        corrupt_path.write_text(
            json.dumps(real_entry_1) + "\n"
            + "{{THIS IS NOT JSON\n"
            + json.dumps(real_entry_2) + "\n"
        )
        svc5, _ = _make_service(corrupt_path, audit_path)
        r5a = _call(svc5, RequestCls, "tenant-y", "K-good-1")
        r5b = _call(svc5, RequestCls, "tenant-y", "K-good-2")
        step(5, "NEG: corrupt JSON line skipped; surrounding valid entries still load",
             r5a.result.get("idempotent_replay") is True
             and r5b.result.get("idempotent_replay") is True,
             f"K-good-1.replay={r5a.result.get('idempotent_replay')} K-good-2.replay={r5b.result.get('idempotent_replay')}")

        # ---- Step 6: NEG - blank line silently skipped ----
        blank_path = Path(tmp) / "blank.jsonl"
        blank_path.write_text(
            "\n\n"
            + json.dumps(real_entry_1) + "\n"
            + "   \n"
        )
        svc6, _ = _make_service(blank_path, audit_path)
        r6 = _call(svc6, RequestCls, "tenant-y", "K-good-1")
        step(6, "NEG: blank/whitespace lines silently skipped",
             r6.result.get("idempotent_replay") is True,
             f"replay={r6.result.get('idempotent_replay')}")

        # ---- Step 7: Multiple stores -> multiple lines (append-only) ----
        multi_path = Path(tmp) / "multi.jsonl"
        svc7, _ = _make_service(multi_path, audit_path)
        _call(svc7, RequestCls, "tenant-z", "K-1")
        _call(svc7, RequestCls, "tenant-z", "K-2")
        _call(svc7, RequestCls, "tenant-z", "K-3")
        lines = [line for line in multi_path.read_text().splitlines() if line.strip()]
        step(7, "multiple distinct stores -> multiple JSONL lines (append-only)",
             len(lines) == 3, f"line_count={len(lines)} (expected 3)")

        # ---- Step 8: Latest write wins when same (tenant, key) appears twice ----
        same_key_path = Path(tmp) / "samekey.jsonl"
        first_resp = _make_response_dict()
        first_resp["result"] = {"target": "http://localhost/FIRST", "instruction": "first"}
        second_resp = _make_response_dict()
        second_resp["result"] = {"target": "http://localhost/SECOND", "instruction": "second"}
        first_entry = {"tenant_id": "tenant-w", "idempotency_key": "K-dup",
                       "stored_at": time.time() - 5, "response": first_resp}
        second_entry = {"tenant_id": "tenant-w", "idempotency_key": "K-dup",
                        "stored_at": time.time(), "response": second_resp}
        same_key_path.write_text(json.dumps(first_entry) + "\n" + json.dumps(second_entry) + "\n")
        svc8, _ = _make_service(same_key_path, audit_path)
        r8 = _call(svc8, RequestCls, "tenant-w", "K-dup")
        step(8, "duplicate (tenant, key) lines -> latest write wins",
             r8.result.get("idempotent_replay") is True
             and r8.result.get("target") == "http://localhost/SECOND",
             f"target={r8.result.get('target')!r}")

        # ---- Step 9: NEG - missing parent dir created on first write ----
        nested_path = Path(tmp) / "nested" / "deep" / "idem.jsonl"
        svc9, _ = _make_service(nested_path, audit_path)
        _call(svc9, RequestCls, "tenant-n", "K-N1")
        step(9, "NEG: missing parent dir created automatically on first write",
             nested_path.exists() and nested_path.parent.is_dir(),
             f"file_exists={nested_path.exists()} dir_exists={nested_path.parent.exists()}")

        # ---- Step 10: /dev/null persistence path - in-memory still works ----
        svc10, RequestCls10 = _make_service(Path("/dev/null"), audit_path)
        r10a = _call(svc10, RequestCls10, "tenant-d", "K-DISABLED")
        r10b = _call(svc10, RequestCls10, "tenant-d", "K-DISABLED")
        step(10, "/dev/null persistence: in-memory cache still works within one process",
             "idempotent_replay" not in r10a.result
             and r10b.result.get("idempotent_replay") is True,
             f"first={r10a.result.get('idempotent_replay')} second={r10b.result.get('idempotent_replay')}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
