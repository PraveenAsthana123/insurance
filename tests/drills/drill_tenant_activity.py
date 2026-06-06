#!/usr/bin/env python3
"""
Drill: GET /api/v1/agent-platform/activity — unified per-tenant feed.

Composes audit rows from multiple agent-platform surfaces (CUA executes,
admin reads, Paperclip artifacts) into one response. Locks the §64.43 #7
tenant-isolation contract across the composed feed.

Steps (10 total; 4 negative):
  1. (+) Empty state → 200 with items=[], total_items=0
  2. (+) CUA executed rows surface as source="cua"
  3. (+) Admin audit-of-audit rows surface as source="admin"
  4. (+) Paperclip artifacts surface as source="paperclip"
        (file mtime / created_at as ts)
  5. (-) NEG: cross-tenant rows EXCLUDED (tenant-b sees only tenant-b)
  6. (-) NEG: no `?tenant_id=` query parameter accepted — pass
        ?tenant_id=tenant-a as tenant-b → returns ONLY tenant-b's rows
  7. (+) sources_available dict reports which sources contributed
  8. (+) Items sorted descending by ts (most recent first)
  9. (-) NEG: corrupt CUA line skipped (gracefully); valid rows still load
  10.(-) NEG: limit=0 → 422 (Pydantic Query(ge=1))

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


def _build_app(audit_path: Path, paperclip_root: Path):
    os.environ["CUA_AUDIT_PATH"] = str(audit_path)
    os.environ["BEV_PAPERCLIP_ROOT"] = str(paperclip_root)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in (
        "core.middleware", "core.rbac_middleware",
        "routers.agent_platform", "services.agent_platform_service",
        "schemas.agent_platform",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.agent_platform import router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def _seed_cua(audit_path: Path, rows: list[dict]) -> None:
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    with audit_path.open("a") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def _make_cua(tenant: str, tool: str, outcome: str, ts: float, request_id: str) -> dict:
    return {
        "ts": ts, "request_id": request_id, "tenant_id": tenant,
        "actor": "tester", "tool": tool, "target": "about:blank",
        "instruction": "drill", "policy_decision": "allow", "outcome": outcome,
    }


def _make_paperclip_artifact(tenant: str, clip_id: str, title: str, ts: float) -> dict:
    return {
        "id": clip_id, "tenant_id": tenant, "title": title,
        "content": "body", "content_type": "text",
        "source": "paperclip-api", "metadata": {},
        "sha256": "0" * 64, "size_bytes": 4,
        "preview": "body", "created_at": ts, "redacted": False,
    }


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 unified tenant-activity feed\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        audit_path = tmpdir / "cua_runs.jsonl"
        paperclip_root = tmpdir / "paperclip"
        paperclip_root.mkdir()

        # ---- Step 1: empty ----
        client = TestClient(_build_app(audit_path, paperclip_root))
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        step(1, "empty state → items=[], total_items=0",
             r.status_code == 200 and body["total_items"] == 0 and body["items"] == [],
             f"status={r.status_code} total={body.get('total_items')}")

        # ---- Step 2: CUA rows ----
        _seed_cua(audit_path, [
            _make_cua("tenant-a", "playwright", "executed", 1000.0, "a-1"),
            _make_cua("tenant-a", "playwright", "executed", 1001.0, "a-2"),
        ])
        client = TestClient(_build_app(audit_path, paperclip_root))
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        sources_set = {item["source"] for item in body["items"]}
        step(2, "CUA executed rows surface as source='cua'",
             r.status_code == 200 and body["total_items"] == 2
             and sources_set == {"cua"},
             f"total={body.get('total_items')} sources={sources_set}")

        # ---- Step 3: admin rows ----
        _seed_cua(audit_path, [
            {"ts": 1002.0, "request_id": "adm-1", "tenant_id": "tenant-a",
             "actor": "compliance", "tool": "admin.cua.audit.read",
             "instruction": "x", "target": "y",
             "policy_decision": "allow", "outcome": "executed"},
        ])
        client = TestClient(_build_app(audit_path, paperclip_root))
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        admin_items = [i for i in body["items"] if i["source"] == "admin"]
        step(3, "admin audit-of-audit rows surface as source='admin'",
             r.status_code == 200 and len(admin_items) == 1
             and admin_items[0]["tool"] == "admin.cua.audit.read",
             f"admin_items_count={len(admin_items)}")

        # ---- Step 4: Paperclip artifacts ----
        for clip in [_make_paperclip_artifact("tenant-a", "clip-aaa", "doc 1", 1003.0),
                     _make_paperclip_artifact("tenant-b", "clip-bbb", "doc 2", 1004.0)]:
            (paperclip_root / f"{clip['id']}.json").write_text(json.dumps(clip))
        client = TestClient(_build_app(audit_path, paperclip_root))
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        paperclip_items = [i for i in body["items"] if i["source"] == "paperclip"]
        step(4, "Paperclip artifacts surface as source='paperclip'",
             r.status_code == 200 and len(paperclip_items) == 1
             and paperclip_items[0]["artifact_id"] == "clip-aaa",
             f"paperclip_items={len(paperclip_items)}")

        # ---- Step 5: cross-tenant exclusion ----
        # Add a CUA row for tenant-b
        _seed_cua(audit_path, [
            _make_cua("tenant-b", "playwright", "executed", 1010.0, "b-1"),
        ])
        client = TestClient(_build_app(audit_path, paperclip_root))
        # tenant-a should NOT see tenant-b's stuff
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        non_a = [i for i in body["items"] if i["tenant_id"] != "tenant-a"]
        step(5, "NEG: cross-tenant rows EXCLUDED",
             not non_a and all(i["tenant_id"] == "tenant-a" for i in body["items"]),
             f"non_tenant_a_rows={len(non_a)}")

        # ---- Step 6: NEG no ?tenant_id= URL manipulation ----
        r = client.get("/api/v1/agent-platform/activity?tenant_id=tenant-a",
                       headers={"X-Tenant-ID": "tenant-b"})
        body = r.json()
        non_b = [i for i in body["items"] if i["tenant_id"] != "tenant-b"]
        step(6, "NEG: ?tenant_id= URL param IGNORED — middleware tenant wins",
             body.get("tenant_id") == "tenant-b" and not non_b,
             f"echo_tenant={body.get('tenant_id')!r} non_tenant_b={len(non_b)}")

        # ---- Step 7: sources_available ----
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        sa = body.get("sources_available", {})
        step(7, "sources_available reports cua=True, admin=True, paperclip=True for tenant-a",
             sa.get("cua") is True and sa.get("admin") is True
             and sa.get("paperclip") is True,
             f"sources_available={sa}")

        # ---- Step 8: sorted desc by ts ----
        ts_list = [i["ts"] for i in body["items"]]
        step(8, "items sorted descending by ts (most recent first)",
             ts_list == sorted(ts_list, reverse=True),
             f"ts_desc={ts_list == sorted(ts_list, reverse=True)} first_ts={ts_list[0] if ts_list else None}")

        # ---- Step 9: NEG corrupt CUA line skipped ----
        with audit_path.open("a") as fh:
            fh.write("{{NOT JSON\n\n")
        client = TestClient(_build_app(audit_path, paperclip_root))
        r = client.get("/api/v1/agent-platform/activity",
                       headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        # Should still load tenant-a's items (corrupt line skipped, no crash)
        step(9, "NEG: corrupt CUA line skipped; valid rows still load",
             r.status_code == 200 and body["total_items"] > 0,
             f"status={r.status_code} total={body.get('total_items')}")

        # ---- Step 10: NEG limit=0 → 422 ----
        r = client.get("/api/v1/agent-platform/activity?limit=0",
                       headers={"X-Tenant-ID": "tenant-a"})
        step(10, "NEG: limit=0 → 422 (Pydantic Query(ge=1))",
             r.status_code == 422,
             f"status={r.status_code}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
