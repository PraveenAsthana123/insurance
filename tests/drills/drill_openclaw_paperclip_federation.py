#!/usr/bin/env python3
"""
Drill: §64.43 #7 federation extended to OpenClaw + Paperclip routers.

Builds on commits f57b255b (TenantIdMiddleware + CUA anti-spoof) and 5fc64d3e
(audit readback) by propagating tenant_id through the other agent-platform-
adjacent routers:

  - /api/v1/openclaw/tasks  — task metadata gets middleware tenant_id
                              (body metadata.tenant_id is overridden)
  - /api/v1/paperclip/clips — stored artifact carries tenant_id
                              list/get/delete enforce ownership
                              context-pack filters cross-tenant clips

Steps (14 total; 6 negative):
  1. (+) OpenClaw create_task → enqueued task metadata.tenant_id == middleware
  2. (-) NEG: OpenClaw body metadata.tenant_id=EVIL ignored — middleware wins
  3. (+) Paperclip create stores tenant_id on disk
  4. (+) Paperclip list as tenant-a shows tenant-a's clip
  5. (-) NEG: Paperclip list as tenant-b → ZERO of tenant-a's clips
  6. (-) NEG: Paperclip GET tenant-a's clip as tenant-b → 404 (anti-enumeration)
  7. (-) NEG: Paperclip DELETE tenant-a's clip as tenant-b → 404 AND clip still exists
  8. (+) Paperclip context-pack as tenant-b with tenant-a's clip_id → missing_ids
  9. (-) NEG: Paperclip body metadata.tenant_id=EVIL does NOT change stored tenant_id
  10.(+) Backward-compat: pre-existing artifact without tenant_id → 'default' tenant
  11.(+) tenant-a CAN still GET + DELETE its OWN clip (federation isn't lockout)
  12.(+) OpenClaw Idempotency-Key replay does not enqueue twice
  13.(+) Paperclip Idempotency-Key replay does not create duplicate artifacts
  14.(-) NEG: same Idempotency-Key is isolated across tenants

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
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(paperclip_root: Path):
    """Minimal app: middlewares + openclaw + paperclip routers. OpenClaw service
    overridden with a Mock to avoid Redis dependency."""
    for mod in (
        "core.middleware", "core.rbac_middleware",
        "routers.openclaw", "routers.paperclip",
        "services.openclaw_gateway_service", "services.paperclip_service",
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

    # Capture-mock for OpenClaw service so we can inspect what the router passes.
    captured_enqueue: list = []
    def fake_openclaw():
        mock = MagicMock()
        def _enqueue(req):
            captured_enqueue.append(req)
            return OpenClawTaskResponse(
                task_id="openclaw-test", mode=req.mode,
                queue=f"openclaw:{req.mode}:tasks", status="queued", queue_length=1,
            )
        mock.enqueue.side_effect = _enqueue
        return mock

    app.dependency_overrides[get_openclaw_service] = fake_openclaw
    app.dependency_overrides[get_paperclip_service] = lambda: PaperclipService(paperclip_root)

    return app, captured_enqueue


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 federation — OpenClaw + Paperclip\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        paperclip_root = Path(tmp) / "paperclip"
        paperclip_root.mkdir()
        os.environ.pop("TENANT_ID_STRICT", None)
        os.environ.pop("TENANT_ID_ALLOWLIST", None)
        os.environ["IDEMPOTENCY_PATH_OPENCLAW"] = str(Path(tmp) / "openclaw_idempotency.jsonl")
        os.environ["IDEMPOTENCY_PATH_PAPERCLIP"] = str(Path(tmp) / "paperclip_idempotency.jsonl")

        app, captured = _build_app(paperclip_root)
        client = TestClient(app)

        # ---- Step 1: OpenClaw create_task tenant injection ----
        r = client.post(
            "/api/v1/openclaw/tasks",
            headers={"X-Tenant-ID": "tenant-a"},
            json={"prompt": "test task", "department": "sales", "mode": "council"},
        )
        body = r.json()
        last_req = captured[-1] if captured else None
        step(1, "OpenClaw enqueued request carries middleware tenant_id in metadata",
             r.status_code == 200 and last_req is not None
             and last_req.metadata.get("tenant_id") == "tenant-a",
             f"status={r.status_code} meta.tenant_id={last_req.metadata.get('tenant_id') if last_req else None!r}")

        # ---- Step 2: NEG anti-spoof on OpenClaw body metadata ----
        r = client.post(
            "/api/v1/openclaw/tasks",
            headers={"X-Tenant-ID": "tenant-a"},
            json={
                "prompt": "spoofed",
                "department": "sales",
                "mode": "council",
                "metadata": {"tenant_id": "EVIL-TENANT-B"},  # MUST be overridden
            },
        )
        last_req = captured[-1] if captured else None
        step(2, "NEGATIVE: OpenClaw body metadata.tenant_id IGNORED — middleware wins",
             r.status_code == 200 and last_req is not None
             and last_req.metadata.get("tenant_id") == "tenant-a",
             f"meta.tenant_id={last_req.metadata.get('tenant_id') if last_req else None!r} (must be tenant-a)")

        # ---- Step 3: Paperclip create stores tenant_id on disk ----
        r = client.post(
            "/api/v1/paperclip/clips",
            headers={"X-Tenant-ID": "tenant-a"},
            json={"title": "doc-a", "content": "hello from tenant-a"},
        )
        body = r.json()
        clip_a_id = body["id"]
        clip_a_path = paperclip_root / f"{clip_a_id}.json"
        on_disk = json.loads(clip_a_path.read_text())
        step(3, "Paperclip create stores tenant_id on disk (auth source: middleware)",
             r.status_code == 201 and on_disk.get("tenant_id") == "tenant-a",
             f"on_disk.tenant_id={on_disk.get('tenant_id')!r}")

        # Create one for tenant-b too so we have cross-tenant rows
        r = client.post(
            "/api/v1/paperclip/clips",
            headers={"X-Tenant-ID": "tenant-b"},
            json={"title": "doc-b", "content": "hello from tenant-b"},
        )
        clip_b_id = r.json()["id"]

        # ---- Step 4: tenant-a list shows its own clip ----
        r = client.get("/api/v1/paperclip/clips", headers={"X-Tenant-ID": "tenant-a"})
        ids_a = {c["id"] for c in r.json()}
        step(4, "tenant-a list includes tenant-a's clip",
             r.status_code == 200 and clip_a_id in ids_a and clip_b_id not in ids_a,
             f"tenant-a sees {len(ids_a)} clip(s)")

        # ---- Step 5: NEG tenant-b list doesn't see tenant-a's clip ----
        r = client.get("/api/v1/paperclip/clips", headers={"X-Tenant-ID": "tenant-b"})
        ids_b = {c["id"] for c in r.json()}
        step(5, "NEGATIVE: tenant-b list excludes tenant-a's clip (federation isolation)",
             r.status_code == 200 and clip_a_id not in ids_b and clip_b_id in ids_b,
             f"tenant-b sees {len(ids_b)} clip(s), tenant-a's clip in list: {clip_a_id in ids_b}")

        # ---- Step 6: NEG cross-tenant GET → 404 (anti-enumeration) ----
        r = client.get(f"/api/v1/paperclip/clips/{clip_a_id}",
                       headers={"X-Tenant-ID": "tenant-b"})
        step(6, "NEGATIVE: cross-tenant GET → 404 (not 403, prevents enumeration)",
             r.status_code == 404,
             f"status={r.status_code} (must be 404 not 403)")

        # ---- Step 7: NEG cross-tenant DELETE → 404 AND clip still exists ----
        r = client.delete(f"/api/v1/paperclip/clips/{clip_a_id}",
                          headers={"X-Tenant-ID": "tenant-b"})
        still_exists = clip_a_path.exists()
        step(7, "NEGATIVE: cross-tenant DELETE → 404 AND tenant-a's clip still on disk",
             r.status_code == 404 and still_exists,
             f"status={r.status_code} clip_still_exists={still_exists}")

        # ---- Step 8: NEG context-pack — foreign clip in missing_ids ----
        r = client.post(
            "/api/v1/paperclip/context-pack",
            headers={"X-Tenant-ID": "tenant-b"},
            json={"clip_ids": [clip_a_id], "max_chars": 1000},
        )
        body = r.json()
        step(8, "NEGATIVE: context-pack from tenant-b with tenant-a's clip_id → missing_ids",
             r.status_code == 200 and clip_a_id in body.get("missing_ids", [])
             and "hello from tenant-a" not in body.get("context", ""),
             f"missing_ids={body.get('missing_ids')} context_leak={'hello from tenant-a' in body.get('context', '')}")

        # ---- Step 9: NEG body metadata.tenant_id ignored on Paperclip create ----
        r = client.post(
            "/api/v1/paperclip/clips",
            headers={"X-Tenant-ID": "tenant-a"},
            json={
                "title": "spoofed-clip",
                "content": "this should belong to tenant-a, not EVIL-B",
                "metadata": {"tenant_id": "EVIL-TENANT-B"},
            },
        )
        spoof_id = r.json()["id"]
        spoof_disk = json.loads((paperclip_root / f"{spoof_id}.json").read_text())
        step(9, "NEGATIVE: Paperclip body metadata.tenant_id ignored — middleware wins",
             r.status_code == 201 and spoof_disk.get("tenant_id") == "tenant-a",
             f"on_disk.tenant_id={spoof_disk.get('tenant_id')!r} (must be tenant-a)")

        # ---- Step 10: backward-compat — artifact without tenant_id ----
        legacy_id = "clip-aaaaaaaaaaaa"
        legacy_artifact = {
            "id": legacy_id,
            "title": "legacy",
            "content": "from before federation",
            "content_type": "text",
            "source": "legacy",
            "metadata": {},
            "sha256": "0" * 64,
            "size_bytes": 20,
            "preview": "from before federation",
            "created_at": 1000.0,
            "redacted": False,
            # NOTE: no tenant_id field — pre-federation artifact
        }
        (paperclip_root / f"{legacy_id}.json").write_text(json.dumps(legacy_artifact, indent=2, sort_keys=True))

        r = client.get(f"/api/v1/paperclip/clips/{legacy_id}",
                       headers={"X-Tenant-ID": "default"})
        ok_default = r.status_code == 200
        r2 = client.get(f"/api/v1/paperclip/clips/{legacy_id}",
                        headers={"X-Tenant-ID": "tenant-a"})
        ok_a_404 = r2.status_code == 404
        step(10, "backward-compat: pre-federation clip readable by 'default' tenant; 404 for others",
             ok_default and ok_a_404,
             f"default={r.status_code} tenant-a={r2.status_code}")

        # ---- Step 11: tenant-a CAN still operate on its OWN clip (not lockout) ----
        # GET own
        r = client.get(f"/api/v1/paperclip/clips/{clip_a_id}",
                       headers={"X-Tenant-ID": "tenant-a"})
        own_get_ok = r.status_code == 200
        # DELETE own
        r = client.delete(f"/api/v1/paperclip/clips/{clip_a_id}",
                          headers={"X-Tenant-ID": "tenant-a"})
        own_delete_ok = r.status_code == 200 and not clip_a_path.exists()
        step(11, "tenant-a CAN GET + DELETE its OWN clip (federation isn't lockout)",
             own_get_ok and own_delete_ok,
             f"own_get={own_get_ok} own_delete={own_delete_ok}")

        # ---- Step 12: OpenClaw Idempotency-Key replay does not enqueue twice ----
        before = len(captured)
        headers = {"X-Tenant-ID": "tenant-a", "Idempotency-Key": "openclaw-drill-retry"}
        r1 = client.post(
            "/api/v1/openclaw/tasks",
            headers=headers,
            json={"prompt": "idempotent task", "mode": "council"},
        )
        r2 = client.post(
            "/api/v1/openclaw/tasks",
            headers=headers,
            json={"prompt": "retry with different body", "mode": "simple", "task_id": "different"},
        )
        step(12, "OpenClaw Idempotency-Key replay does not enqueue twice",
             r1.status_code == 200 and r2.status_code == 200
             and r1.json() == r2.json()
             and r2.headers.get("X-Idempotent-Replay") == "true"
             and len(captured) == before + 1,
             f"enqueue_delta={len(captured) - before} replay={r2.headers.get('X-Idempotent-Replay')!r}")

        # ---- Step 13: Paperclip Idempotency-Key replay does not create duplicates ----
        before_files = len(list(paperclip_root.glob("*.json")))
        headers = {"X-Tenant-ID": "tenant-a", "Idempotency-Key": "paperclip-drill-retry"}
        r1 = client.post(
            "/api/v1/paperclip/clips",
            headers=headers,
            json={"title": "idem", "content": "create exactly once"},
        )
        r2 = client.post(
            "/api/v1/paperclip/clips",
            headers=headers,
            json={"title": "idem retry", "content": "would duplicate without cache"},
        )
        after_files = len(list(paperclip_root.glob("*.json")))
        step(13, "Paperclip Idempotency-Key replay does not create duplicate artifacts",
             r1.status_code == 201 and r2.status_code == 201
             and r1.json() == r2.json()
             and r2.headers.get("X-Idempotent-Replay") == "true"
             and after_files == before_files + 1,
             f"file_delta={after_files - before_files} replay={r2.headers.get('X-Idempotent-Replay')!r}")

        # ---- Step 14: NEG same key is isolated across tenants ----
        r1 = client.post(
            "/api/v1/paperclip/clips",
            headers={"X-Tenant-ID": "tenant-a", "Idempotency-Key": "shared-drill-key"},
            json={"title": "tenant-a idem", "content": "tenant a"},
        )
        r2 = client.post(
            "/api/v1/paperclip/clips",
            headers={"X-Tenant-ID": "tenant-b", "Idempotency-Key": "shared-drill-key"},
            json={"title": "tenant-b idem", "content": "tenant b"},
        )
        step(14, "NEGATIVE: same Idempotency-Key is isolated across tenants",
             r1.status_code == 201 and r2.status_code == 201
             and r1.json()["id"] != r2.json()["id"]
             and r2.headers.get("X-Idempotent-Replay") is None,
             f"same_id={r1.json().get('id') == r2.json().get('id')} replay={r2.headers.get('X-Idempotent-Replay')!r}")

    print(f"\n\033[32mALL 14 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
