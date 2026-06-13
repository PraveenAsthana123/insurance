# ADR-011 · Bank Shell Resizable Menu and Workspace

## Status

**Accepted** · 2026-06-12 22:23 MDT

Supersedes: implicit "fixed workspace boundary" rule in commit `4ee7d577`
(2026-06-12 19:43 MDT) `docs(insur): codify Bank Shell Fixed-Workspace-Resize`.

Implements: commit `7ed83336` (2026-06-12 22:20 MDT) `feat(insur): bank shell ·
outer nav-band↔workspace resize handle + policy supersession`.

---

## Context

The bank shell (`frontend/src/pages/bank/BankLayout.jsx`) has three column
zones on desktop/tablet: main menu (blue) · sub-menu (maroon) · workspace
(content). Earlier iterations cycled through three policy interpretations:

| Iteration | Policy interpretation | Commit / source |
|---|---|---|
| 1 | Workspace + menus all fixed-width per breakpoint | initial |
| 2 | Sub-menu height resizable on mobile only | parallel session early |
| 3 | Inner main↔sub split resizable · workspace boundary PINNED | `4ee7d577` (commit body codified §149.2) |
| 4 | Both inner main↔sub AND outer band↔workspace resizable · both persist | `7ed83336` (current) |

Iteration 3's rationale: "charts, cards, flow, and forms do not reflow while
the operator adjusts menu readability." Iteration 4's rationale: "operator
wants to claw back more workspace space without resetting menus to defaults."
Both are legitimate operator needs — they apply at different sizes (1080p
laptop vs 4K external monitor).

The platform shipped iteration 4 code (`7ed83336`) — meaning iteration 3's
policy text in `docs/UI_GLOBAL_POLICY.md` is now contradicting the running
code. Per §57.7 (honest scaffold) policies MUST match shipping code, so the
policy was rewritten in `7ed83336` to match iteration 4.

This ADR records the architectural decision so future engineers and
auditors can trace WHY the policy moved and WHAT the current rule is.

---

## Decision

**Both the inner (main↔sub) AND the outer (band↔workspace) boundaries are
operator-resizable on desktop and tablet. Both widths persist via
`localStorage` and are clamped so neither side starves.**

Implementation details:

- Inner handle: `setResizing('menuSplit')` · double-click resets to default
  (`MAIN_MENU_WIDTH_KEY` = `bank.mainMenu.width`, default 320)
- Outer handle: `setResizing('navBand')` · double-click resets to default
  (`NAV_BAND_WIDTH_KEY` = `bank.navBand.width`, default 628 desktop / 384 tablet)
- Clamps:
  - `minNavBandWidth = 420 (desktop) / 320 (tablet)`
  - `maxNavBandWidth = window.width - 560 (desktop) / 420 (tablet)`
  - `minMainMenuWidth = 220` (else collapsed = 72)
  - `maxMainMenuWidth = min(420, navBand - 180)`
  - `clampedSubMenuWidth = max(160, navBand - mainMenu - handleSize)`
- Both separators use ARIA `role="separator"` + `aria-orientation="vertical"`
  + `aria-label` describing the handle's effect.
- Visual feedback: `#2563eb` (blue) when actively dragging · `#cbd5e1`
  (slate) when idle. Per §137: this blue is the chrome-handle accent, not
  a content background.

---

## Consequences

### Positive
- Operator gains true 2-axis control over menu/workspace allocation.
- Clamps prevent layout breakdown (sub-menu can't be < 160px · workspace
  can't be < 420px depending on breakpoint).
- Both widths persist · the layout the operator chose survives reload.

### Negative
- Charts and dashboards may reflow when the operator drags the outer
  handle (iteration 3's concern). Mitigation: clamps prevent extreme
  reflows · operator explicitly chose to widen by dragging.
- Two handles increase pointer-target density · risk of accidental drag.
  Mitigation: 8px handle size + double-click reset + ARIA labels.
- Policy supersession means engineers must read THIS ADR to know which
  commit's policy is canonical. Mitigation: §137 + §149.2 in
  `docs/UI_GLOBAL_POLICY.md` cross-reference this ADR.

### Risks accepted
- A user on a 1366×768 laptop with default settings sees no problem · but
  a user dragging the outer handle TOWARDS workspace on a 1366 may shrink
  sub-menu to its 160px floor. We accept that floor; below it the operator
  experience becomes unusable and we'd rather refuse the drag than allow it.
- The localStorage values persist across logins on the same browser. On
  shared kiosks this could surprise the next operator. We accept this · the
  bank shell is not a kiosk-grade UI.

---

## Alternatives considered

1. **Iteration 3 (fixed workspace)** — kept. Operator explicitly evolved
   intent past this.
2. **Single resize axis (inner OR outer · operator chooses via setting)** —
   rejected. Doubles the configuration surface without solving more.
3. **Drag = workspace-only, fixed menu allocation** — rejected. Operator
   wants menu allocation control too (per parallel session log iter 4).
4. **CSS Grid template areas without resizing at all** — rejected. Reverts
   to iteration 1, ignoring all subsequent operator feedback.

---

## References

- Policy text: `docs/UI_GLOBAL_POLICY.md` §"Bank Shell Resizable Menu And
  Workspace Policy"
- Implementation: `frontend/src/pages/bank/BankLayout.jsx`
- Predecessor commit: `4ee7d577` (codifies superseded policy)
- Current commit: `7ed83336` (implements + rewrites policy)
- Global §47.3 (ADR discipline) · §57.7 (honest scaffold) · §73 (two-menu
  layout) · §137 (no black content backgrounds — handles use blue accent)
- §149.2 (project-local resizable layout) — this ADR is the upgrade path
  from iteration 3 to iteration 4.

---

## Author

claude-opus-4-7 · autonomous loop · operator "fix all" sweep at
2026-06-12 22:23 MDT · forensic substrate per §51.

---

*Future revisions*: do not edit this ADR. If the policy moves again, supersede
with ADR-012 (or higher) and update the status header. ADRs are immutable per
§47.3.
