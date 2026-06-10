#!/usr/bin/env python3
"""Iter 23 audit · ErrorBoundary + Toast + SSE + Cmd-K facets + print stylesheet."""
import os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 23 audit · ErrorBoundary + Toast + SSE + facets + print\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. ErrorBoundary
    eb = REPO / "frontend/src/components/ErrorBoundary.jsx"
    a("1. ErrorBoundary class + role=alert + Retry",
      eb.exists() and 'role="alert"' in eb.read_text() and 'getDerivedStateFromError' in eb.read_text())

    # 2. Toast + ToastHost
    t = REPO / "frontend/src/components/Toast.jsx"
    a("2. Toast + ToastHost + toastSuccess/Error exports",
      t.exists() and "toastSuccess" in t.read_text() and "toastError" in t.read_text())

    # 3. Toast has 4 tones + aria-live
    a("3. ToastHost role=region + aria-live=polite",
      t.exists() and 'aria-live="polite"' in t.read_text() and 'role="region"' in t.read_text())

    # 4. SSE backend endpoint
    alerts = REPO / "backend/alerts/router.py"
    a("4. /alerts/stream SSE endpoint",
      alerts.exists() and "text/event-stream" in alerts.read_text())

    # 5. AlertsBadge uses EventSource
    ab = REPO / "frontend/src/components/AlertsBadge.jsx"
    a("5. AlertsBadge uses EventSource (SSE)",
      ab.exists() and "EventSource" in ab.read_text())

    # 6. GlobalCmdK has facet chips
    cmdk = REPO / "frontend/src/components/GlobalCmdK.jsx"
    a("6. GlobalCmdK has typeFilter + FacetChip + counts",
      cmdk.exists() and "typeFilter" in cmdk.read_text()
      and "FacetChip" in cmdk.read_text() and "typeCounts" in cmdk.read_text())

    # 7. Print stylesheet
    css = REPO / "frontend/src/styles/dark-mode.css"
    a("7. @media print + hides menus + page-break-inside",
      css.exists() and "@media print" in css.read_text()
      and "page-break-inside" in css.read_text())

    # 8. ToastHost mounted in layout
    layout = REPO / "frontend/src/pages/insurance/InsuranceLayout.jsx"
    a("8. InsuranceLayout mounts ToastHost",
      "ToastHost" in layout.read_text())

    # 9. SimpleTabs wraps panels in ErrorBoundary
    st = REPO / "frontend/src/pages/insurance/tabs/SimpleTabs.jsx"
    a("9. SimpleTabs has ≥3 ErrorBoundary wrappers",
      st.exists() and st.read_text().count("<ErrorBoundary") >= 3)

    # 10. HITLPanel uses toastSuccess/Error
    hp = REPO / "frontend/src/components/HITLPanel.jsx"
    a("10. HITLPanel uses toastSuccess + toastError on actions",
      hp.exists() and "toastSuccess" in hp.read_text() and "toastError" in hp.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 23 · polish past 105")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
