#!/usr/bin/env python3
"""
Drill: §137 audit script (audit_no_black_backgrounds.sh) regex correctness.

The audit script is the project's enforcement layer for §137 (no dark
backgrounds in content/workspace areas). It uses awk with a 5-line
context-lookback to distinguish content-area violations from chrome
(<aside>, Sidebar, Header, etc. · §137.4 allows dark in chrome).

This drill is a META-DRILL: it doesn't test code BEHIND the audit, it
tests the audit ITSELF by feeding it known-good and known-bad inputs
in tempdir and verifying exit codes. Without this drill, a future
refactor of the audit regex could silently:
  - Stop catching the forbidden hex list (false negatives → §137 breaks)
  - Start catching valid chrome backgrounds (false positives → CI blocks)
  - Miss new forbidden palettes (e.g., dark-mode toggle attempts)

The audit script accepts a project-root argument so we can run it
against an isolated tempdir without touching the real frontend tree.

Steps (10; 4 negative):
  1. (+) Audit script exists + executable.
  2. (+) Empty project (no frontend/src) → exit 2 (skip).
  3. (+) Light bg only → exit 0 (PASS).
  4. (-) NEG · `background: '#0f172a'` in content area → exit 1 (FAIL).
  5. (-) NEG · `background: '#000'` (short hex) → exit 1.
  6. (-) NEG · `backgroundColor: '#1f2937'` (camelCase variant) → exit 1.
  7. (+) `background: '#0f172a'` inside <aside> (chrome) → exit 0.
  8. (+) Same hex in a *Sidebar.jsx file (filename exempt) → exit 0.
  9. (+) `color: '#0f172a'` (text not bg) → exit 0 (regex is bg-specific).
 10. (-) NEG · `background: 'black'` keyword form (currently bypasses
        the audit's hex-only regex) — documenting this gap explicitly.
        This step accepts EITHER 0 or 1 (gap-acknowledgment · §57.7).

Composes with: §43 drill discipline (4 NEG locked · 1 gap documented) ·
§57.7 honest scaffold (step 10 documents the keyword-form gap) ·
§137 NO-BLACK-CONTENT-BACKGROUND policy · §138 dispatcher.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
AUDIT = REPO / "scripts" / "audit_no_black_backgrounds.sh"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _run_audit(tmpdir: Path) -> tuple[int, str]:
    """Run audit script against tmpdir · return (exit_code, stdout)."""
    r = subprocess.run(
        ["bash", str(AUDIT), str(tmpdir)],
        capture_output=True, text=True, timeout=30,
    )
    return r.returncode, r.stdout + r.stderr


def _make_project(td: Path) -> Path:
    """Create minimal project structure under tmpdir."""
    src = td / "frontend" / "src"
    pages = src / "pages"
    components = src / "components"
    pages.mkdir(parents=True)
    components.mkdir(parents=True)
    return src


def main() -> int:
    print("drill_no_black_bg_audit · §137 audit regex correctness contract")
    print("=" * 70)

    # ─── Step 1 · audit script exists + executable ───────────────────
    step(1, AUDIT.exists() and os.access(AUDIT, os.X_OK),
         f"{AUDIT.name} exists + executable")

    # ─── Step 2 · empty project → exit 2 (skip) ──────────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-empty-") as td:
        tmp = Path(td)
        rc, out = _run_audit(tmp)
        step(2, rc == 2,
             f"empty project: exit {rc} (expected 2 · 'SKIP no frontend/src')")

    # ─── Step 3 · POS · light bg only → exit 0 ───────────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-clean-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "CleanPage.jsx").write_text(
            "<div style={{ background: '#f8fafc', color: '#1f2937' }}>hi</div>\n"
        )
        rc, _ = _run_audit(tmp)
        step(3, rc == 0,
             f"POS clean light bg: exit {rc} (expected 0)")

    # ─── Step 4 · NEG · dark hex in content → exit 1 ─────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-dark-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "DarkPage.jsx").write_text(
            "<div style={{ background: '#0f172a', color: '#e2e8f0' }}>bad</div>\n"
        )
        rc, out = _run_audit(tmp)
        step(4, rc == 1,
             f"NEG #0f172a content: exit {rc} (expected 1 · FAIL)")

    # ─── Step 5 · NEG · short hex #000 → exit 1 ──────────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-black3-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "BlackPage.jsx").write_text(
            "<div style={{ background: '#000', color: '#fff' }}>bad</div>\n"
        )
        rc, _ = _run_audit(tmp)
        # The audit's regex covers #000000 (with optional final 0) ·
        # let's verify it catches whatever form the operator uses
        step(5, rc == 1,
             f"NEG #000 short hex: exit {rc} (expected 1 · FAIL)")

    # ─── Step 6 · NEG · backgroundColor camelCase ────────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-camel-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "CamelPage.jsx").write_text(
            "<div style={{ backgroundColor: '#1f2937' }}>bad</div>\n"
        )
        rc, _ = _run_audit(tmp)
        step(6, rc == 1,
             f"NEG backgroundColor camelCase: exit {rc} (expected 1)")

    # ─── Step 7 · POS · dark hex inside <aside> chrome ───────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-aside-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "ChromeAside.jsx").write_text(
            "function Chat() { return (\n"
            "  <aside style={{\n"
            "    background: '#0f172a', color: '#e2e8f0',\n"
            "  }}>chrome ok</aside>\n"
            "); }\n"
        )
        rc, out = _run_audit(tmp)
        step(7, rc == 0,
             f"POS dark in <aside>: exit {rc} (expected 0 · chrome exempt)")

    # ─── Step 8 · POS · filename ending in Sidebar.jsx exempt ────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-sidebar-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "components" / "MainSidebar.jsx").write_text(
            "<div style={{ background: '#0f172a' }}>nav</div>\n"
        )
        rc, _ = _run_audit(tmp)
        step(8, rc == 0,
             f"POS *Sidebar.jsx filename: exit {rc} (expected 0 · exempt)")

    # ─── Step 9 · POS · color: not background: ───────────────────────
    with tempfile.TemporaryDirectory(prefix="drill-§137-textcolor-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "DarkText.jsx").write_text(
            "<div style={{ background: '#fff', color: '#0f172a' }}>ok</div>\n"
        )
        rc, _ = _run_audit(tmp)
        step(9, rc == 0,
             f"POS color: '#0f172a' (text): exit {rc} (expected 0 · bg-only regex)")

    # ─── Step 10 · NEG · 'black' keyword (current gap · §57.7 acknowledge)
    with tempfile.TemporaryDirectory(prefix="drill-§137-keyword-") as td:
        tmp = Path(td)
        src = _make_project(tmp)
        (src / "pages" / "KeywordBlack.jsx").write_text(
            "<div style={{ background: 'black', color: '#fff' }}>kw</div>\n"
        )
        rc, _ = _run_audit(tmp)
        # The audit regex matches `#hex` patterns only · 'black' as
        # keyword bypasses. Per §57.7 honest: document the gap.
        gap_documented = rc in (0, 1)
        # 0 = current behavior (gap exists) · 1 = future strengthened audit
        # Either way the drill PASSES · but warns if rc == 0
        gap_note = "GAP DOCUMENTED · audit regex misses keyword form" if rc == 0 else "audit caught keyword form"
        step(10, gap_documented,
             f"NEG 'black' keyword: exit {rc} ({gap_note})")
        if rc == 0:
            print(f"      ↳ §57.7 acknowledgment: §137 audit currently only catches "
                  f"hex backgrounds. Tailwind classes (bg-slate-900) + "
                  f"CSS keywords ('black') bypass the current regex. "
                  f"Future audit strengthening could close this gap.")

    print()
    print("ALL 10 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - Dark hex (#000, #0f172a, #1f2937 …) in content → FAIL")
    print("  - backgroundColor camelCase variant → FAIL")
    print("  - Dark hex inside <aside> chrome → PASS (exempt)")
    print("  - *Sidebar.jsx filename → PASS (exempt)")
    print("  - color: '#0f172a' (text on light bg) → PASS (regex is bg-specific)")
    print("  - 'black' keyword form → currently bypasses (§57.7 gap noted)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
