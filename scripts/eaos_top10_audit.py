#!/usr/bin/env python3
"""§EAOS Top-10 audit · runs every 6h via cron.

Queries /api/v1/eaos/scoreboard and writes a structured JSON report.
Marks DONE / MOSTLY / PARTIAL / MISSING per component honestly.

Exit 0 if overall_score >= 0.80 · exit 1 otherwise.
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
REPORTS = ROOT / "jobs/reports/eaos-top10"
REPORTS.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def main() -> int:
    try:
        r = httpx.get(
            f"{BASE}/api/v1/eaos/scoreboard",
            headers={"X-Demo-Role": "manager"},
            timeout=12,
        )
        if r.status_code != 200:
            print(f"[{stamp()}] FAIL HTTP {r.status_code}")
            return 1
        d = r.json()
    except Exception as e:
        print(f"[{stamp()}] FAIL {type(e).__name__}: {e}")
        return 2

    overall = d.get("overall_score", 0)
    summary = d.get("summary", {})

    print(f"[{stamp()}] §EAOS Top-10 audit")
    print(f"  overall_score: {overall} ({overall * 100:.1f}%)")
    print(f"  done={summary.get('done')} mostly={summary.get('mostly')} "
          f"partial={summary.get('partial')} missing={summary.get('missing')}")
    print()
    print("  Components:")
    for c in d.get("components", []):
        print(f"    {c['status']:8} · {c['label']:40} "
              f"data={c['data_score']:.2f} api={c['endpoint_score']:.2f} "
              f"ui={c['ui_score']:.2f} → {c['overall']:.2f}")

    ts = datetime.now(TZ).strftime("%Y%m%d_%H%M")
    (REPORTS / f"audit-{ts}.json").write_text(json.dumps(d, indent=2))
    (REPORTS / "_latest.json").write_text(json.dumps(d, indent=2))

    return 0 if overall >= 0.80 else 1


if __name__ == "__main__":
    sys.exit(main())
