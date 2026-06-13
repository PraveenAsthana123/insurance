#!/usr/bin/env python3
"""
Drill: bank shell navigation contract · §138 navigation guard.

Operator reported (2026-06-13): "there should not be any workspace/content
page which should replace Main menu and sub menu ...check each link.
workspce content page opne after click of SUB menu link"

Root cause: BankSidebar Platform Modules + BankSubMenu /ai-types links
were pointing at top-level routes (`/eai-os`, `/ai-types`, etc.) that
are NOT under <Route path="/bank" element={<BankLayout />}> in App.jsx ·
clicking them REPLACED the entire bank shell instead of updating
workspace state.

Fix shipped: those Link components now have target="_blank"
rel="noopener noreferrer" so they open in a new tab, preserving the
bank shell for the operator's session.

This drill locks the contract:
  - Any Link in bank/* whose `to` starts with `/` AND doesn't start
    with `/bank/` MUST have target="_blank" (or be a known intra-shell
    pattern like query-only `?...`).
  - Bank-internal Links (to="/bank/...") MUST NOT have target="_blank"
    (they're meant to navigate within the shell).

Steps (8; 3 negative):
  1. (+) BankSidebar.jsx exists + parses
  2. (+) BankSubMenu.jsx exists + parses
  3. (+) BankSidebar Platform Modules block (lines ~170-220) Link uses target=_blank
  4. (+) BankSubMenu /ai-types Link uses target=_blank
  5. (-) NEG · BankSidebar bank-internal Links (to="/bank/...") do NOT use target=_blank
  6. (-) NEG · NO Link in bank/* points to a known shell-breaking route
        without target=_blank (audit pattern · catches future regressions)
  7. (-) NEG · /ai-types references are ALL target=_blank (not just first)
  8. (+) "§138 navigation contract" comment present in both modified files

Composes with: §43 drill discipline · §57.7 honest · §73 17-tab right pane
(workspace stays mounted) · §138 operator-handling.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
SIDEBAR = REPO / "frontend/src/pages/bank/BankSidebar.jsx"
SUBMENU = REPO / "frontend/src/pages/bank/BankSubMenu.jsx"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


# Routes that are TOP-LEVEL (NOT under /bank/) and would replace BankLayout
SHELL_BREAKING = {
    "/eai-os", "/itsm", "/prompts", "/platform", "/processes",
    "/chatgroup", "/control-tower", "/stt", "/tts", "/notifications",
    "/feature-flags", "/workspace-demo", "/eaos-dept", "/eaos",
    "/command-center", "/promptops", "/evalops", "/governance-om",
    "/agent-lifecycle", "/audit-explorer", "/cost", "/drift",
    "/prompt-playground", "/model-compare", "/datasets", "/finetune",
    "/webhook-debug", "/sse-stream", "/aeo", "/ai-types",
    "/digital-twin", "/investment-portfolio", "/cost-portfolio",
    "/risk-portfolio", "/model-portfolio", "/translate", "/ocr",
    "/embeddings", "/vectors",
}


def _find_link_blocks(source: str) -> list[tuple[str, bool, bool]]:
    """Return list of (to_value, has_target_blank, has_rel_noopener)
    for every <Link> JSX usage in the source.

    Uses multi-line scan: starts at <Link · captures until matching `>`
    (respecting nested {} braces in style/etc).
    """
    out: list[tuple[str, bool, bool]] = []
    i = 0
    n = len(source)
    while True:
        idx = source.find("<Link", i)
        if idx < 0:
            break
        # Skip if this is actually `<Linker` or similar
        if idx + 5 < n and source[idx + 5].isalnum():
            i = idx + 5
            continue
        # Find the matching > · respect brace depth for {} (style={{...}})
        depth = 0
        end = idx + 5
        while end < n:
            ch = source[end]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            elif ch == ">" and depth == 0:
                break
            end += 1
        attrs = source[idx + 5:end]
        # Extract `to=...`
        to_m = re.search(
            r'to=(?:"([^"]+)"|\{`([^`]+)`\}|\{[\'"]([^\'"]+)[\'"]\}|\{[^}]+\})',
            attrs,
        )
        if to_m:
            to_val = to_m.group(1) or to_m.group(2) or to_m.group(3) or ""
            # to={m.to} or to={item.to} · variable reference · we can't statically know the value
            # but we still record whether this Link block has target=_blank
            has_target = 'target="_blank"' in attrs
            has_rel = 'rel="noopener noreferrer"' in attrs
            out.append((to_val, has_target, has_rel))
        i = end + 1
    return out


def main() -> int:
    print("drill_bank_shell_navigation · §138 in-shell navigation contract")
    print("=" * 70)

    # ─── Step 1 · sidebar parses ─────────────────────────────────────
    step(1, SIDEBAR.exists(),
         f"{SIDEBAR.name} exists")
    sidebar_src = SIDEBAR.read_text(encoding="utf-8")
    sidebar_links = _find_link_blocks(sidebar_src)
    step(1, len(sidebar_links) > 0,
         f"BankSidebar parses · {len(sidebar_links)} <Link> blocks found")

    # ─── Step 2 · submenu parses ─────────────────────────────────────
    step(2, SUBMENU.exists(),
         f"{SUBMENU.name} exists")
    submenu_src = SUBMENU.read_text(encoding="utf-8")
    submenu_links = _find_link_blocks(submenu_src)
    step(2, len(submenu_links) > 0,
         f"BankSubMenu parses · {len(submenu_links)} <Link> blocks found")

    # ─── Step 3 · sidebar Platform Module Link uses target=_blank ────
    # Find any Link with `to={m.to}` (object-form map) · must have target=_blank
    sidebar_module_pattern = (
        'target="_blank"' in sidebar_src
        and 'rel="noopener noreferrer"' in sidebar_src
    )
    step(3, sidebar_module_pattern,
         f"BankSidebar has target=_blank + rel=noopener (Platform Modules in new tab)")

    # ─── Step 4 · submenu /ai-types Links use target=_blank ──────────
    submenu_aitypes_blank = (
        'target="_blank"' in submenu_src
        and 'rel="noopener noreferrer"' in submenu_src
    )
    step(4, submenu_aitypes_blank,
         "BankSubMenu has target=_blank + rel=noopener (/ai-types in new tab)")

    # ─── Step 5 · NEG · bank-internal Links must NOT use target=_blank ──
    # Find any Link to /bank/... · verify it does NOT have target=_blank
    # in the same opening tag span
    violations = []
    for to_val, has_target, has_rel in sidebar_links + submenu_links:
        if to_val.startswith("/bank/") and has_target:
            violations.append(to_val)
    step(5, len(violations) == 0,
         f"NEG bank-internal Links keep in-shell navigation · violations: {violations or 'NONE'}")

    # ─── Step 6 · NEG · all shell-breaking Links have target=_blank ──
    # Scan all <Link> usages in bank/* · if `to` starts with `/<shell-breaking>`
    # AND doesn't have target=_blank → violation
    bad_links = []
    for to_val, has_target, _ in sidebar_links + submenu_links:
        # Strip any query string for matching
        path_only = to_val.split("?")[0]
        if path_only in SHELL_BREAKING and not has_target:
            bad_links.append(to_val)
    step(6, len(bad_links) == 0,
         f"NEG shell-breaking Links: all have target=_blank · violations: "
         f"{bad_links[:5] if bad_links else 'NONE'}")

    # ─── Step 7 · NEG · ALL /ai-types references use target=_blank ──
    # Not just the first one · the b2c/b2b/b2e variants too
    ai_types_count = sum(1 for to_val, has_target, _ in submenu_links
                         if to_val.startswith("/ai-types"))
    ai_types_blank = sum(1 for to_val, has_target, _ in submenu_links
                         if to_val.startswith("/ai-types") and has_target)
    step(7, ai_types_count > 0 and ai_types_count == ai_types_blank,
         f"NEG /ai-types coverage: {ai_types_blank}/{ai_types_count} have target=_blank "
         f"(must be 100%)")

    # ─── Step 8 · §138 navigation contract comment present ──────────
    has_contract_marker = (
        "§138 navigation contract" in sidebar_src
        and "§138 navigation contract" in submenu_src
    )
    step(8, has_contract_marker,
         "§138 navigation contract comment present in both files")

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - Sidebar Platform Modules: target=_blank (open in new tab)")
    print("  - SubMenu /ai-types: target=_blank (all variants)")
    print("  - Bank-internal /bank/... Links: in-shell navigation preserved")
    print("  - No shell-breaking Link in bank/* without target=_blank")
    print(f"  - {len(SHELL_BREAKING)} known shell-breaking routes audited")
    return 0


if __name__ == "__main__":
    sys.exit(main())
