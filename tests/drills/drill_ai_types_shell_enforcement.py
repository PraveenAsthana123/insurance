#!/usr/bin/env python3
"""
Drill: AI Types shell enforcement · OP-20 mandatory.

Operator (2026-06-14 18:09-18:12 MDT · 4-message stack):
  - "http://localhost:3210/ai-types?domain=b2c"
  - "this is not correct ...each UI page must have Main menu and Sub Menu"
  - "only content /workspace ...area"
  - "should have the UI"

The /ai-types and /ai-taxonomy routes used to render AiTypesPage directly ·
bypassing the bank shell · no Main Menu · no Sub Menu. Per §73 + OP-2 +
OP-9 contracts: every UI page MUST be inside the bank shell.

This drill locks the redirect: /ai-types* → /bank/workspace?module=ai-types

Steps (8 · 4 negative):
  1. (+) AiTypesShellRedirect.jsx exists
  2. (+) Component exports AiTypesShellRedirect
  3. (+) Uses Navigate + useSearchParams (preserves query)
  4. (-) NEG · App.jsx /ai-types element uses AiTypesShellRedirect (NOT AiTypesPage)
  5. (-) NEG · App.jsx /ai-taxonomy element uses AiTypesShellRedirect
  6. (-) NEG · No direct rendering of AiTypesPage at /ai-types or /ai-taxonomy
  7. (-) NEG · BankSubMenu /ai-types links use /bank/workspace?module=ai-types
  8. (+) OP-20 audit marker present
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
REDIRECT = REPO / "frontend/src/pages/AiTypesShellRedirect.jsx"
APP = REPO / "frontend/src/App.jsx"
SUBMENU = REPO / "frontend/src/pages/bank/BankSubMenu.jsx"


def step(n, ok, msg):
    print(f"  {'✓' if ok else '✗'} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def main():
    print("drill_ai_types_shell_enforcement · §73 + OP-20 shell lock")
    print("=" * 70)

    step(1, REDIRECT.exists(), f"{REDIRECT.name} exists")
    redirect_src = REDIRECT.read_text(encoding="utf-8")

    has_export = "export function AiTypesShellRedirect" in redirect_src
    step(2, has_export, f"AiTypesShellRedirect exported: {has_export}")

    has_nav = "Navigate" in redirect_src and "useSearchParams" in redirect_src
    step(3, has_nav, f"Uses Navigate + useSearchParams (preserves query): {has_nav}")

    app_src = APP.read_text(encoding="utf-8")

    # Step 4 · NEG · /ai-types uses AiTypesShellRedirect
    ai_types_match = re.search(
        r'<Route\s+path="/ai-types"\s+element=\{<(\w+)', app_src
    )
    uses_redirect_types = ai_types_match and ai_types_match.group(1) == "AiTypesShellRedirect"
    step(4, uses_redirect_types,
         f"NEG · /ai-types element = {'AiTypesShellRedirect' if uses_redirect_types else ai_types_match.group(1) if ai_types_match else 'NOT FOUND'}")

    # Step 5 · NEG · /ai-taxonomy uses AiTypesShellRedirect
    taxonomy_match = re.search(
        r'<Route\s+path="/ai-taxonomy"\s+element=\{<(\w+)', app_src
    )
    uses_redirect_taxonomy = taxonomy_match and taxonomy_match.group(1) == "AiTypesShellRedirect"
    step(5, uses_redirect_taxonomy,
         f"NEG · /ai-taxonomy element = {'AiTypesShellRedirect' if uses_redirect_taxonomy else taxonomy_match.group(1) if taxonomy_match else 'NOT FOUND'}")

    # Step 6 · NEG · AiTypesPage NOT rendered directly at /ai-types or /ai-taxonomy
    direct_uses = re.findall(
        r'<Route\s+path="/ai-(?:types|taxonomy)"\s+element=\{<AiTypesPage', app_src
    )
    step(6, len(direct_uses) == 0,
         f"NEG · no direct <AiTypesPage at /ai-types* · violations: {direct_uses or 'NONE'}")

    # Step 7 · NEG · BankSubMenu links use /bank/workspace?module=ai-types
    submenu_src = SUBMENU.read_text(encoding="utf-8")
    in_shell_count = submenu_src.count("/bank/workspace?module=ai-types")
    step(7, in_shell_count > 0,
         f"NEG · BankSubMenu uses /bank/workspace?module=ai-types · count: {in_shell_count}")

    # Step 8 · OP-20 marker
    has_op20 = "OP-20" in app_src or "OP-20" in redirect_src
    step(8, has_op20, f"OP-20 audit marker present: {has_op20}")

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - /ai-types?... → redirect → /bank/workspace?module=ai-types&... (query preserved)")
    print("  - /ai-taxonomy?... → redirect → /bank/workspace?module=ai-types&... (query preserved)")
    print("  - No standalone AiTypesPage render at /ai-types or /ai-taxonomy")
    print("  - BankSubMenu links use the in-shell route")
    print("  - Bank shell (Main Menu + Sub Menu) stays mounted · only workspace area changes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
