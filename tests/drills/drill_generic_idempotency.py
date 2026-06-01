#!/usr/bin/env python3
"""
Drill: §10.3 generic idempotency module on OpenClaw + Paperclip create.

Extends the CUA idempotency contract to two more create endpoints via
the new backend/core/idempotency.py module. The contract is:
  - Idempotency-Key header OR body field accepted
  - First call: real service runs + response cached
  - Second call within TTL: cached response returned with
    X-Idempotent-Replay: true header
  - Cross-tenant isolation: tenant-b's K1 NEVER returns tenant-a's K1
  - Disk persistence: cache survives process restart

Steps (12 total; 5 negative):
  1. (+) OpenClaw: first call with K1 → fresh enqueue
  2. (+) OpenClaw: second call SAME K1 → replay (X-Idempotent-Replay: true);
        service.enqueue NOT called a second time
  3. (-) NEG: OpenClaw cross-tenant SAME K1 → fresh (cache isolation)
  4. (+) OpenClaw: Idempotency-Key HEADER honored when body absent
  5. (-) NEG: OpenClaw no key submitted → never cached
  6. (+) Paperclip: first POST /clips with K2 → fresh create (artifact written)
  7. (+) Paperclip: second SAME K2 → replay (no second disk write)
  8. (-) NEG: Paperclip cross-tenant SAME K2 → fresh
  9. (-) NEG: empty idempotency_key (whitespace only) → never cached
  10.(+) Disk persistence: simulated restart loads cache from JSONL
  11.(-) NEG: corrupt JSONL line skipped on load (graceful)
  12.(+) Replay response identical content to original

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
from unittest.mock import MagicMock

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(paperclip_root: Path, openclaw_path: Path, paperclip_path: Path):
    """Minimal app with TenantId + openclaw + paperclip routers.
    Reset all relevant modules so per-namespace IDEMPOTENCY_PATH env vars
    take effect."""
    os.environ["IDEMPOTENCY_PATH_OPENCLAW"] = str(openclaw_path)
    os.environ["IDEMPOTENCY_PATH_PAPERCLIP"] = str(paperclip_path)
    os.environ["IDEMPOTENCY_TTL_SECONDS"] = "300"
    for mod in (
        "core.middleware", "core.rbac_middleware", "core.idempotency",
        "routers.openclaw", "routers.paperclip",
        "services.openclaw_gateway_service", "services.paperclip_service",
        "schemas.openclaw", "schemas.paperclip",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.openclaw import router as openclaw_router, get_openclaw_service
    from routers.paperclip import router as paperclip_router, get_paperclip_service
    from services.paperclip_service import PaperclipService
    from schemas.openclaw import OpenClawTaskResponse

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(openclaw_router)
    app.include_router(paperclip_router)

    enqueue_calls: list = []
    def fake_openclaw():
        mock = MagicMock()
        def _enqueue(req):
            enqueue_calls.append(req)
            return OpenClawTaskResponse(
                task_id=f"openclaw-{len(enqueue_calls)}", mode=req.mode,
                queue=f"openclaw:{req.mode}:tasks", status="queued",
                queue_length=len(enqueue_calls),
            )
        mock.enqueue.side_effect = _enqueue
        return mock

    app.dependency_overrides[get_openclaw_service] = fake_openclaw
    app.dependency_overrides[get_paperclip_service] = lambda: PaperclipService(paperclip_root)
    return app, enqueue_calls


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §10.3 generic idempotency on OpenClaw + Paperclip\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        paperclip_root = tmpdir / "paperclip-storage"
        paperclip_root.mkdir()
        openclaw_idem = tmpdir / "idem_openclaw.jsonl"
        paperclip_idem = tmpdir / "idem_paperclip.jsonl"

        app, enqueue_calls = _build_app(paperclip_root, openclaw_idem, paperclip_idem)
        client = TestClient(app)
        base_oc = {"prompt": "test", "department": "sales", "mode": "council"}
        base_pc = {"title": "doc", "content": "body content here"}

        # ---- Step 1: OpenClaw fresh K1 ----
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_oc, "idempotency_key": "OC-K1"})
        step(1, "OpenClaw fresh K1 → service.enqueue called, no replay header",
             r.status_code == 200
             and r.headers.get("X-Idempotent-Replay") is None
             and len(enqueue_calls) == 1,
             f"status={r.status_code} replay_hdr={r.headers.get('X-Idempotent-Replay')} enqueue_calls={len(enqueue_calls)}")

        # ---- Step 2: OpenClaw replay K1 ----
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_oc, "idempotency_key": "OC-K1",
                              "prompt": "DIFFERENT"})  # different body
        step(2, "OpenClaw replay SAME K1 → X-Idempotent-Replay: true; enqueue NOT called",
             r.status_code == 200
             and r.headers.get("X-Idempotent-Replay") == "true"
             and len(enqueue_calls) == 1,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')!r} enqueue_calls={len(enqueue_calls)}")

        # ---- Step 3: NEG cross-tenant same K1 → fresh ----
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-b"},
                        json={**base_oc, "idempotency_key": "OC-K1"})
        step(3, "NEG: tenant-b with SAME K1 → fresh (cross-tenant isolation)",
             r.headers.get("X-Idempotent-Replay") is None
             and len(enqueue_calls) == 2,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')} enqueue_calls={len(enqueue_calls)}")

        # ---- Step 4: Idempotency-Key HEADER honored ----
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-c", "Idempotency-Key": "HDR-K"},
                        json=base_oc)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-c", "Idempotency-Key": "HDR-K"},
                        json=base_oc)
        step(4, "OpenClaw Idempotency-Key HEADER honored → 2nd call is replay",
             r.headers.get("X-Idempotent-Replay") == "true",
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')!r}")

        # ---- Step 5: NEG no key ----
        before = len(enqueue_calls)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-d"}, json=base_oc)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-d"}, json=base_oc)
        step(5, "NEG: no key → both calls are fresh (never cached)",
             r.headers.get("X-Idempotent-Replay") is None
             and len(enqueue_calls) == before + 2,
             f"enqueue_calls_delta={len(enqueue_calls) - before}")

        # ---- Step 6: Paperclip fresh K2 ----
        r = client.post("/api/v1/paperclip/clips",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_pc, "idempotency_key": "PC-K2"})
        clip_id_first = r.json()["id"]
        artifact_count_after_first = len(list(paperclip_root.glob("*.json")))
        step(6, "Paperclip fresh K2 → artifact written to disk",
             r.status_code == 201
             and r.headers.get("X-Idempotent-Replay") is None
             and artifact_count_after_first == 1,
             f"status={r.status_code} artifacts_on_disk={artifact_count_after_first}")

        # ---- Step 7: Paperclip replay K2 ----
        r = client.post("/api/v1/paperclip/clips",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_pc, "idempotency_key": "PC-K2",
                              "content": "DIFFERENT — should NOT land"})
        artifact_count_after_replay = len(list(paperclip_root.glob("*.json")))
        replay_id = r.json()["id"]
        step(7, "Paperclip replay SAME K2 → replay header + no new disk write",
             r.status_code == 201
             and r.headers.get("X-Idempotent-Replay") == "true"
             and artifact_count_after_replay == 1
             and replay_id == clip_id_first,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')!r} artifacts={artifact_count_after_replay} id_match={replay_id == clip_id_first}")

        # ---- Step 8: NEG Paperclip cross-tenant ----
        r = client.post("/api/v1/paperclip/clips",
                        headers={"X-Tenant-ID": "tenant-b"},
                        json={**base_pc, "idempotency_key": "PC-K2"})
        artifact_count_after_xtenant = len(list(paperclip_root.glob("*.json")))
        step(8, "NEG: Paperclip tenant-b SAME K2 → fresh + new artifact written",
             r.headers.get("X-Idempotent-Replay") is None
             and artifact_count_after_xtenant == 2,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')} artifacts={artifact_count_after_xtenant}")

        # ---- Step 9: NEG empty key (whitespace only) ----
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-x", "Idempotency-Key": "   "},
                        json=base_oc)
        # Whitespace key should be treated as None — fresh call
        # (Schema will strip via Pydantic field_validator — but Idempotency-Key
        # header is also stripped. So both fall through to no-key path.)
        before = len(enqueue_calls)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-x", "Idempotency-Key": "   "},
                        json=base_oc)
        # Both should be fresh (key whitespace → treated as None)
        step(9, "NEG: whitespace-only Idempotency-Key → treated as None (always fresh)",
             r.headers.get("X-Idempotent-Replay") is None,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')}")

        # ---- Step 10: disk persistence — simulate restart ----
        # Use the SAME idem files but rebuild the app (drops in-memory cache).
        app, enqueue_calls = _build_app(paperclip_root, openclaw_idem, paperclip_idem)
        client = TestClient(app)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_oc, "idempotency_key": "OC-K1"})
        step(10, "after restart: OC-K1 cache loaded from disk → replay",
             r.headers.get("X-Idempotent-Replay") == "true"
             and len(enqueue_calls) == 0,
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')!r} enqueue_calls={len(enqueue_calls)}")

        # ---- Step 11: NEG corrupt JSONL skipped ----
        with openclaw_idem.open("a") as fh:
            fh.write("{{NOT JSON\n\n")
        app, enqueue_calls = _build_app(paperclip_root, openclaw_idem, paperclip_idem)
        client = TestClient(app)
        r = client.post("/api/v1/openclaw/tasks",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**base_oc, "idempotency_key": "OC-K1"})
        step(11, "NEG: corrupt JSONL line skipped on load (still loads good entries)",
             r.headers.get("X-Idempotent-Replay") == "true",
             f"replay_hdr={r.headers.get('X-Idempotent-Replay')!r}")

        # ---- Step 12: replay response content identical ----
        # The first OC-K1 call returned a task_id; the replay should return the SAME task_id
        r1 = client.post("/api/v1/openclaw/tasks",
                         headers={"X-Tenant-ID": "tenant-fresh"},
                         json={**base_oc, "idempotency_key": "RESP-K"})
        first_task_id = r1.json()["task_id"]
        r2 = client.post("/api/v1/openclaw/tasks",
                         headers={"X-Tenant-ID": "tenant-fresh"},
                         json={**base_oc, "idempotency_key": "RESP-K",
                               "prompt": "ignored on replay"})
        step(12, "replay returns IDENTICAL response content (task_id matches)",
             r2.json()["task_id"] == first_task_id,
             f"first_task_id={first_task_id!r} replay_task_id={r2.json()['task_id']!r}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
