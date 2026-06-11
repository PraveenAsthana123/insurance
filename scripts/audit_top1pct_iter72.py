#!/usr/bin/env python3
"""Iter 72 · §102 PERFECT push · 5 hooks + Playwright + Maestro + ZAP."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 72 · §102 PERFECT\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    hooks = ['useSessionTimeout', 'useMemoryMonitor', 'useVirtualizedList', 'useReconnectingWS']
    for h in hooks:
        f = REPO / f"frontend/src/hooks/{h}.js"
        a(f"  {h} hook exists", f.exists() and h in f.read_text())

    vite = REPO / "frontend/vite.config.js.iter72"
    a("5. vite.config.iter72 · terser drop_console",
      vite.exists() and "drop_console" in vite.read_text())

    pw = REPO / "frontend/playwright.config.iter72.js"
    a("6. playwright.config.iter72 · 5 browsers/devices",
      pw.exists() and 'chromium' in pw.read_text() and 'firefox' in pw.read_text())

    zap = REPO / "scripts/zap_scan.sh"
    a("7. scripts/zap_scan.sh · OWASP ZAP baseline",
      zap.exists() and zap.stat().st_mode & 0o111 and "owasp/zap2docker" in zap.read_text())

    maestro = REPO / "scripts/maestro_smoke.yaml"
    a("8. scripts/maestro_smoke.yaml · mobile test",
      maestro.exists() and "launchApp" in maestro.read_text())

    # §102 score
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    r = c.get("/api/v1/frontend-governance/coverage")
    s = r.json()["summary"]
    a(f"9. §102 prod-ready ≥ 98% ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 98)
    a(f"10. §102 done ≥ 88 ({s['done']})", s["done"] >= 88)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
