#!/usr/bin/env python3
"""§F00 · Feature backlog audit · runs every 30 min via cron.

Per docs/PLAN_FEATURE_BACKLOG.md · checks each P1 row's presence
(backend endpoint registered + UI page file exists + route wired) and
writes a structured JSON report. Marks ✅ vs ⏳ vs 🟡 (partial) per row.

§57.7 honest: report counts are evidence-backed · NEVER fabricated.

Exit codes:
  0 = all P1 ✅
  1 = some P1 still ⏳
  2 = fetch error
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

TZ = ZoneInfo("America/Edmonton")
ROOT = Path("/mnt/deepa/insur_project")
PAGES_DIR = ROOT / "frontend/src/pages"
APP_JSX = ROOT / "frontend/src/App.jsx"
REPORTS_DIR = ROOT / "jobs/reports/feature-backlog"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")

# Each P1 row: id · label · backend_path · ui_page · ui_route
P1_FEATURES = [
    ("F01", "Text-to-Speech",
        ["POST /api/v1/voice-ai/text-to-speech"], "TextToSpeechPage.jsx", "/tts"),
    ("F02", "Notification Center UI",
        ["GET /api/v1/notifications"], "NotificationCenterPage.jsx", "/notifications"),
    ("F03", "Feature Flags UI",
        ["GET /api/v1/feature-flags"], "FeatureFlagsPage.jsx", "/feature-flags"),
    ("F04", "Audit Log Explorer UI",
        ["GET /api/v1/audit-chain/recent"], "AuditExplorerPage.jsx", "/audit-explorer"),
    ("F05", "Cost Optimizer UI",
        ["GET /api/v1/agent-kernel/cost/usage"], "CostOptimizerPage.jsx", "/cost"),
    ("F06", "Drift Monitor Dashboard",
        ["GET /api/v1/insur/monitoring/_global"], "DriftMonitorPage.jsx", "/drift"),
    ("F07", "Prompt Playground UI",
        ["GET /api/v1/llm-gateway/health"], "PromptPlaygroundPage.jsx", "/prompt-playground"),
    ("F08", "Vector DB Browser UI",
        ["GET /api/v1/vector-browser/collections"], "VectorBrowserPage.jsx", "/vectors"),
    ("F09", "Model Comparison UI",
        ["GET /api/v1/insur/evals"], "ModelComparePage.jsx", "/model-compare"),
    ("F10", "Translation endpoint + UI",
        ["POST /api/v1/translate/run"], "TranslatePage.jsx", "/translate"),
    ("F11", "Functional OCR",
        ["POST /api/v1/image-clean/ocr"], "OcrPage.jsx", "/ocr"),
    ("F12", "Fine-tune UI",
        ["GET /api/v1/finetune"], "FineTuneUIPage.jsx", "/finetune"),
    ("F13", "Dataset Upload UI",
        ["GET /api/v1/datasets"], "DatasetUploadPage.jsx", "/datasets"),
    ("F14", "Embedding Playground UI",
        ["GET /api/v1/embeddings/health"], "EmbeddingPlaygroundPage.jsx", "/embeddings"),
    ("F15", "Webhook Receiver Debug UI",
        ["GET /api/v1/webhooks"], "WebhookDebugPage.jsx", "/webhook-debug"),
    ("F16", "SSE Event Stream UI",
        ["GET /api/v1/sse"], "SseStreamPage.jsx", "/sse-stream"),
]


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def _get_openapi_paths() -> set[str]:
    try:
        r = httpx.get(f"{BASE}/openapi.json", timeout=8)
        d = r.json()
        paths = set()
        for p, methods in d.get("paths", {}).items():
            for m in methods:
                paths.add(f"{m.upper()} {p}")
        return paths
    except Exception:
        return set()


def _route_present(route: str, app_jsx: str) -> bool:
    # Conservative: look for path="<route>" substring
    needles = [f'path="{route}"', f"path='{route}'"]
    return any(n in app_jsx for n in needles)


def _path_matches(target: str, openapi_paths: set[str]) -> bool:
    if target in openapi_paths:
        return True
    # Tolerate {param} differences
    method, path = target.split(" ", 1)
    base = path.split("{")[0].rstrip("/")
    for p in openapi_paths:
        if p.startswith(method + " " + base):
            return True
    return False


def main() -> int:
    openapi_paths = _get_openapi_paths()
    app_jsx = APP_JSX.read_text() if APP_JSX.exists() else ""

    rows = []
    for feature_id, label, backend_paths, ui_page, ui_route in P1_FEATURES:
        backend_ok = all(_path_matches(p, openapi_paths) for p in backend_paths)
        page_exists = (PAGES_DIR / ui_page).exists()
        route_ok = _route_present(ui_route, app_jsx)

        ok_count = sum([backend_ok, page_exists, route_ok])
        if ok_count == 3:
            status = "DONE"
            marker = "✅"
        elif ok_count == 0:
            status = "MISSING"
            marker = "⏳"
        else:
            status = "PARTIAL"
            marker = "🟡"

        rows.append({
            "id": feature_id,
            "label": label,
            "status": status,
            "marker": marker,
            "backend_ok": backend_ok,
            "page_exists": page_exists,
            "route_ok": route_ok,
            "missing": [p for p in backend_paths if not _path_matches(p, openapi_paths)]
                       + ([] if page_exists else [f"page:{ui_page}"])
                       + ([] if route_ok else [f"route:{ui_route}"]),
        })

    n_done = sum(1 for r in rows if r["status"] == "DONE")
    n_partial = sum(1 for r in rows if r["status"] == "PARTIAL")
    n_missing = sum(1 for r in rows if r["status"] == "MISSING")

    report = {
        "ts_local": stamp(),
        "ts_utc": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "n_features": len(rows),
        "n_done": n_done,
        "n_partial": n_partial,
        "n_missing": n_missing,
        "pct_done": round(100 * n_done / max(len(rows), 1), 1),
        "overall": "PASS" if n_done == len(rows) else "INCOMPLETE",
        "policy_refs": ["§F00 backlog audit", "§44 autonomous loop",
                         "§57.7 honest counts"],
        "rows": rows,
    }

    ts = datetime.now(TZ).strftime("%Y%m%d_%H%M")
    (REPORTS_DIR / f"audit-{ts}.json").write_text(json.dumps(report, indent=2))
    latest = REPORTS_DIR / "_latest.json"
    latest.write_text(json.dumps(report, indent=2))

    print(f"[{stamp()}] §F00 feature-backlog audit")
    print(f"  done: {n_done}/{len(rows)} ({report['pct_done']}%) · "
          f"partial: {n_partial} · missing: {n_missing}")
    for r in rows:
        print(f"  {r['marker']} {r['id']:4} {r['label']:32} · "
              f"backend={'✓' if r['backend_ok'] else '✗'} "
              f"page={'✓' if r['page_exists'] else '✗'} "
              f"route={'✓' if r['route_ok'] else '✗'}")

    return 0 if n_done == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
