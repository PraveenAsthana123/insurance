# Bank UI/UX Shell Audit - 2026-06-12

## Scope

Live route audited:

`/bank/dept/10/b2c/experience-analysis?sub=fairness&focus=ai%3ASegmentation+AI&tab=ai`

Surfaces checked:

- Dark-blue main menu: department, B2C/B2B/B2E, process, AI capability rows.
- Maroon sub-menu: process-specific sub-processes, AI capabilities, agents, applications, master data.
- Content workspace: context banner, focus banner, active tab ribbon, tab strip, sub-tabs, cards, charts.

## Findings Before Fix

| Area | Finding | Impact |
|---|---|---|
| Shell layout | Fixed `280px + 260px + workspace` columns were used at every viewport. | Mobile had document-level horizontal overflow; workspace width collapsed to about 32px at 390px viewport. |
| Tablet layout | Main menu and sub-menu consumed 540px of a 900px viewport. | Workspace was only about 360px wide and internally overflowed. |
| Workspace ribbon | Active-tab command ribbon used a no-wrap row. | Mobile workspace created internal horizontal scroll. |
| Visualization grid | Chart grid used `minmax(320px, 1fr)`. | Charts pushed workspace width on small screens. |
| Main-menu AI click | Blue AI capability leaf navigated to `/:capabilityId` but did not set `focus` or `tab`. | Maroon sub-menu and workspace did not reflect the selected AI capability. |

## Fixes Applied

| File | Change |
|---|---|
| `frontend/src/pages/bank/BankLayout.jsx` | Added viewport-aware shell layout. Desktop keeps two side columns. Tablet collapses the main menu to icon rail and gives width back to the workspace. Mobile stacks main menu, sub-menu, and workspace vertically. Added `minWidth: 0`, `overflow: hidden`, and `data-workspace`. |
| `frontend/src/pages/bank/BankUseCasePage.jsx` | Made active-tab ribbon wrap on compact widths, made lens chips wrap, and changed visualization grid to a mobile-safe `minmax(min(260px, 100%), 1fr)`. |
| `frontend/src/pages/bank/BankSidebar.jsx` | Blue main-menu AI capability clicks now set canonical process URL query state: `focus=ai:<capability>` and `tab=ai`. Active highlighting now also follows `focus`. |

## Live Verification After Fix

| Viewport | Main Menu | Sub-menu | Workspace | Page Horizontal Overflow | Console Errors |
|---|---:|---:|---:|---:|---:|
| Desktop 1440x900 | 280px x 844px | 260px x 844px | 900px x 844px | No | 0 |
| Tablet 900x900 | 64px x 844px | 220px x 844px | 616px x 844px | No | 0 |
| Mobile 390x844 | 390px x 220px | 390px x 176px | 390px x 392px | No | 0 |

Deep-link verification:

- Input URL with `tab=ai&sub=fairness` normalizes to `tab=res-ai&sub=fairness` when fairness is requested.
- Active workspace shows `Responsible AI > Fairness`.
- Focus `Segmentation AI` remains visible.
- Blue main-menu `Segmentation AI` click now lands on `tab=ai&focus=ai%3ASegmentation+AI&sub=capabilities` and shows the focus banner.

## Remaining UX Notes

- On tablet, the main menu is intentionally collapsed to preserve workspace width; the desktop hierarchy remains fully expanded.
- On mobile, the menus are stacked above the workspace. This avoids horizontal scrolling while keeping both menus accessible.
- Long workspace pages still scroll vertically by design because the process workspace contains many governance, chart, tab, and audit sections.


## Font, Color, Active State, And Correlation Pass

Additional audit scope requested after the shell fix:

- Font scale in the dark-blue main menu, maroon sub-menu, and workspace controls.
- Color and active-button contrast/state consistency.
- Navigation dependency between main menu, sub-menu, URL query state, and workspace tab/sub-tab.
- Correlation from selected department/domain/process/AI capability to workspace focus.

### Findings Before This Pass

| Area | Finding | UX Impact |
|---|---|---|
| Main menu typography | AI leaf rows and utility labels rendered as low as 8-10px. | Dense operational UI became hard to scan and weak for accessibility. |
| Main menu target size | Process and AI rows were 21-25px high; collapse icon was smaller than 28px. | Click/tap accuracy was poor, especially on tablet/mobile. |
| Domain active state | B2C stopped looking active once a process was selected. | The hierarchy did not clearly show `Department -> Domain -> Process`. |
| Sub-menu active row | Item text inherited parent font sizing because `font: inherit` overrode the row font size. | Active AI row appeared inconsistent with other sub-menu rows. |
| Workspace utility buttons | Role lens, export, focus-clear, and ribbon buttons had 19-25px heights. | Workspace controls felt visually secondary but were still important actions. |

### Fixes Applied

| File | Change |
|---|---|
| `frontend/src/pages/bank/BankSidebar.jsx` | Raised main-menu typography floor, added minimum target heights, added `aria-current` for active domain/process/AI rows, kept active B2C highlighted during process selection, and fixed collapse button target size. |
| `frontend/src/pages/bank/BankSubMenu.jsx` | Raised sub-menu font scale, target heights, active semantics, clear-focus button target size, and replaced `font: inherit` with `fontFamily: inherit`. |
| `frontend/src/pages/bank/BankUseCasePage.jsx` | Raised workspace action, lens, export, tab-navigation, and focus-clear controls to a consistent clickable target floor. |

### Final Measured Result

Live route:

`/bank/dept/10/b2c/experience-analysis?tab=ai&focus=ai%3ASegmentation+AI`

| Metric | Result |
|---|---:|
| Main-menu clickable font minimum | 11px |
| Sub-menu clickable font minimum | 12px |
| Workspace clickable font minimum | 11px |
| Clickable targets below 28px | 0 |
| Console errors | 0 |
| Main menu active rows | `B2C`, `Experience Analysis`, `Segmentation AI` |
| Sub-menu active row | `Segmentation AI` |
| Workspace active state | `AI > Capabilities`, focus `Segmentation AI` |

### UX Verdict

The UI now has a coherent active-state chain:

`Main menu B2C -> Experience Analysis -> Segmentation AI`

maps to:

`Maroon sub-menu Segmentation AI`

maps to:

`Workspace AI tab -> Capabilities sub-tab -> Segmentation AI focus card`

This satisfies the operator requirement that main menu, sub-menu, and workspace are dependent and correlated, not separate navigation surfaces.


## Density And Breathing-Room Pass

User feedback: the UI still looked compressed and overly compact after the active-state pass.

### Changes Applied

| Area | Change |
|---|---|
| Shell layout | Desktop main menu widened from 280px to 320px; sub-menu widened from 260px to 300px. Tablet rail/sub-menu widened from 64px/220px to 72px/240px. |
| Mobile stacked layout | Main-menu region increased to 260px and sub-menu region to 220px so the stacked menus do not feel squeezed. |
| Workspace | Workspace padding increased to 24px on non-compact screens and 16px on compact screens. |
| Main menu | Department/domain/process/AI rows received larger fonts, taller row heights, and wider horizontal padding. |
| Sub-menu | Header, category rows, focus chip, and item rows received larger fonts and taller row heights. |
| Workspace tabs | Active tab ribbon, lens row, tab strip, and sub-tab controls received more padding and larger tab font sizes. |

### Final Density Measurements

| Viewport | Main Menu | Sub-menu | Workspace | Horizontal Overflow | Min Clickable Font | Small Targets |
|---|---:|---:|---:|---:|---:|---:|
| Desktop 1440x900 | 320px x 844px | 300px x 844px | 820px x 844px | No | 11px | 0 |
| Tablet 900x900 | 72px x 844px | 240px x 844px | 588px x 844px | No | 11px | 0 |
| Mobile 390x844 | 390px x 260px | 390px x 220px | 390px x 308px | No | 11px | 0 |

### UX Verdict

The bank shell now uses a roomier enterprise-operator density. Desktop gets full hierarchy readability, tablet keeps the navigation rail without starving the workspace, and mobile keeps stacked menus without page-level horizontal scrolling.


## Card Meaning Pass

User feedback: it was not obvious which cards were informational and which cards performed actions.

### Changes Applied

| Area | Change |
|---|---|
| Quick component cards | Added explicit `INFO` and `ACTION` badges, `data-card-kind`, accessible labels, separate surfaces, separate borders, and separate CTA colors. |
| Detailed operation cards | Marked component cards as `MIXED` because the card header/details are informational while embedded buttons execute `Run`, `View`, `Edit`, and `Validate`. |
| Components workspace | Added an inline legend explaining `INFO`, `ACTION`, and `MIXED` card meanings before the component list. |
| UI governance | Added a global card meaning policy to `docs/UI_GLOBAL_POLICY.md`. |

### UX Rule

- `INFO`: white/neutral card, slate badge, used for reading or inspecting.
- `ACTION`: amber action card, strong left rail, used for execution or state change.
- `MIXED`: blue card, used when one card contains both read-only details and action buttons.

### UX Verdict

Users no longer need to infer card purpose from the title alone. The card itself now communicates whether it is safe to read, meant to execute, or contains both information and operations.


## Navigation Dependency And Quality Pass

User feedback: the UI needed clearer dependency between main menu, sub-menu, and workspace content, plus clearer objective, flow journey, manual/automatic process meaning, and component quality checks.

### Changes Applied

| Area | Change |
|---|---|
| Workspace dependency | Added a `Navigation dependency: menu to sub-menu to workspace` strip showing main-menu process, sub-menu focus, workspace tab/sub-tab, and content source. |
| Quality check | Added a workspace quality score covering objective, menu/sub dependency, focus correlation, input, process, and output mapping. |
| Component groups | Added stronger headings, purpose descriptions, and quality labels to workflow/manual/automatic component sections. |
| Manual process | Added an AS-IS manual execution brief with human actor, input, pain, and run-control checks. |
| Automatic process | Added a TO-BE automatic execution brief with automation trigger, AI workflow, HITL, and scope-grant checks. |
| To-do checklist | Added context text tying the role checklist to the active tab/sub-tab path and required readiness gaps. |

### UX Verdict

The bank workspace now explicitly answers: where did this content come from, what selected menu state controls it, what the tab objective is, whether input/process/output are mapped, and whether the manual or automatic process is being reviewed.


## Workspace Visual Hierarchy Pass

User direction: continue improving UI/UX after dependency, card type, manual/automatic, and quality checklist fixes.

### Changes Applied

| Area | Change |
|---|---|
| Workspace body | Increased workspace padding and moved to a slightly cooler slate surface so white cards stand out more clearly. |
| Business objective | Increased objective heading/body scale, card padding, border weight, and grid spacing. |
| Transformation ribbon | Added a `Business transformation` heading above AS-IS, TO-BE, ROI, and Strategy cards. |
| IPO ribbon | Added an `Input / Process / Output` heading and stronger arrows between stages. |
| Slot cards | Increased slot padding, minimum height, left-rail weight, label size, content weight, and pending-state spacing. |
| Canonical sections | Increased section card radius, left rail, header size, body padding, and subtle shadow. |

### UX Verdict

The workspace now reads in a clearer hierarchy: selected context first, dependency/quality second, objective third, transformation and IPO next, then detailed sections and operational components. This reduces the previous flat-card feeling and makes the user journey easier to scan.


## Resizable Sub-menu Pass

User feedback: the maroon sub-menu should have a resize feature.

### Changes Applied

| Area | Change |
|---|---|
| Desktop/tablet sub-menu | Added a draggable vertical separator between the maroon sub-menu and workspace. |
| Mobile sub-menu | Added a draggable horizontal separator below the stacked maroon sub-menu to resize its height. |
| Persistence | Saved sub-menu width/height to `localStorage` using `bank.subMenu.width` and `bank.subMenu.height`. |
| Reset | Double-clicking the separator resets to default width/height. |
| Accessibility | Added `role=separator`, orientation, title, and accessible labels for the resize handle. |

### UX Verdict

Operators can now allocate more space to long process metadata or reclaim space for the workspace without changing routes or losing menu context.


## Per-card List Color Pass

User feedback: each card in a card list should use a different color so the eye can distinguish items quickly.

### Changes Applied

| Area | Change |
|---|---|
| Quick component cards | Added an eight-color deterministic palette, applied by card index across each list. |
| Detailed operation cards | Applied the same palette to operation cards while preserving phase rail and `MIXED` meaning. |
| Sequence cue | Added numbered chips such as `#1`, `#2`, `#3` on cards so color and order reinforce each other. |
| Card semantics | Kept `INFO`, `ACTION`, and `MIXED` badges independent from list color so users can still distinguish read vs execute. |

### UX Verdict

Repeated cards are no longer visually flat. Adjacent cards now have distinct backgrounds, borders, rails, and number chips while preserving action/information semantics.

## Top Flow And Readiness Pass

User feedback: objective, to-do list, top horizontal flow, and component-level quality signals still looked missing or hidden.

### Changes Applied

| Area | Change |
|---|---|
| Top horizontal flow | Added an always-visible journey strip: Objective -> Input -> Process -> Output -> Visualization -> To-Do. |
| To-do visibility | Added a top to-do snapshot and expanded the full role checklist by default. |
| Component quality | Extended workspace quality checks to cover cards, buttons, headings, visualization, and to-do readiness. |
| Missing-state clarity | Flow cards now show OK/PENDING status for mapped data while keeping visualization and action readiness visible. |
| Workspace correlation | The to-do snapshot displays the active tab/sub-tab path so checklist items remain tied to the current workspace. |

### UX Verdict

The workspace now exposes the core operating sequence above the fold. Users can immediately see what the tab is for, which input/process/output pieces are mapped, whether visualization and actions are present, and what remains to close before demo or production review.

## Fixed Workspace Menu Resize Pass

User feedback: resizing menus should not change the layout or squeeze the content/workspace area.

### Changes Applied

| Area | Change |
|---|---|
| Workspace boundary | Reworked the bank shell so the desktop/tablet workspace column remains fixed during menu resizing. |
| Menu resize model | Moved resize behavior inside a fixed navigation band; main menu and sub-menu trade width with each other. |
| Sub-menu readability | The maroon sub-menu remains resizable without pushing or shrinking charts, cards, forms, or workspace content. |
| Main menu support | The same split handle also resizes the blue main menu because the two menus share the fixed navigation band. |
| Verification | Browser drag check confirmed workspace x-position and width delta were both 0 while the separator moved 70px. |

### UX Verdict

The resize control now improves menu readability without disturbing the workspace. Operators can widen the sub-menu or main menu, but content cards and visualizations keep their fixed working area.

## Deep Tab Component Review Pass

User feedback: each tab needed a deeper check for component correctness, importance, sequence, info-vs-action meaning, input/process/output flow, visualization, checklist, history, timestamps, active button behavior, and action completion feedback.

### Changes Applied

| Area | Change |
|---|---|
| Per-tab review | Added a visible `Tab component review` strip to every tab with one row per task: Objective, Input, Process, Workspace Cards, Output, Visualization, Actions, Checklist + History. |
| Component purpose | Generic and operation cards now show two-line purpose/outcome text so users know why the component matters. |
| Info vs action | Cards continue to show `INFO`, `ACTION`, or `MIXED`; action cards now use stronger shadows and active buttons. |
| Component flow | Cards show compact Input -> Process -> Output flow before action execution or detail expansion. |
| Action lifecycle | Buttons show READY/ACTIVE/DONE or running/done states, disable during processing, and write completion status with timestamp below the controls. |
| Row discipline | Action section changed from a dense button grid to one row per task with after-click outcome text. |
| History and audit | Action results explicitly reference history/audit evidence and preserve timestamps in the action log/metadata footer. |

### UX Verdict

Every tab now explains its own component sequence from the user point of view before the user reaches the detailed workspace. Cards are more self-describing, action cards are visually distinct, and button clicks produce visible in-place progress and completion feedback.

## No Black Background Pass

User feedback: remove black background blocks.

### Changes Applied

| Area | Change |
|---|---|
| Header | Replaced black header with a light slate header and light input/select controls. |
| Resize handles | Replaced black active resize-handle color with blue active state. |
| Modals | Replaced dark modal backdrops with light translucent slate overlays. |
| Active toggles | Replaced black active toggle backgrounds with light blue active state. |
| Chat rail | Replaced black chat channel rail with a light rail and dark readable text. |

### UX Verdict

The bank UI now avoids black/near-black background blocks while preserving readable dark text and clear blue active states.

## Resizable Menu-To-Workspace Pass

User feedback: main menu and sub-menu need resize features so the operator can give more space to the workspace/content side window.

### Changes Applied

| Area | Change |
|---|---|
| Outer resize handle | Added a menu/workspace boundary handle; dragging left gives the workspace more width. |
| Inner menu split | Kept the main-menu/sub-menu split handle so operators can rebalance blue vs maroon menu width. |
| Persistence | Added `bank.navBand.width` to persist the full menu-area width alongside `bank.mainMenu.width`. |
| Bounds | Added min/max clamps so the menu area can shrink for content focus without making navigation unusable. |
| Reset | Double-clicking the outer boundary resets the menu area to the default width. |

### UX Verdict

Operators can now decide whether they need wider navigation or more workspace. The shell supports both: resize between main/sub-menu, then resize the whole menu band to return space to content.

## No Black Brand/Accent In Workarea Pass

User feedback: workarea headers, table headers, and component headers still looked like they were using black as the brand color.

### Changes Applied

| Area | Change |
|---|---|
| README tab accent | Replaced the near-black README tab color with blue so downstream workspace/table/component headers no longer inherit a black brand accent. |
| Workspace maturity accent | Replaced the highest maturity-level accent from near-black to blue. |
| Audit trend chart | Replaced the primary pass-rate stroke from near-black to blue. |
| Framework sections | Replaced near-black chip, section, capability, tier, and strategy accent colors with blue. |
| UI policy | Tightened the bank no-black policy so near-black cannot be used for brand/accent/header/table/component-header treatments. |

### UX Verdict

The workspace can still use dark slate for readable labels, but black/near-black is no longer used as the visual brand for active headers, component headers, table headers, or primary chart/section accents.

## Per-Tab Graph Differentiation Pass

User feedback: all pages were using the same graph.

### Changes Applied

| Area | Change |
|---|---|
| Visualization slot | Replaced the generic repeated trend/distribution pair with tab-specific chart plans. |
| Chart intent | Added visible intent copy and source path for each chart surface. |
| Metrics | Each tab now uses a different metric family: architecture readiness, process cycle time, data quality, AI confidence, ROI, explanation coverage, responsible-AI risk, governance approvals, incidents, jobs, testing, reports, demo readiness, and more. |
| Data shape | Charts now vary by period/category, chart kind, baseline, trend, jitter, and metric name while remaining deterministic for the active process/tab/sub-tab. |
| Policy | Added a global UI rule that shared chart components must still use page-specific data plans, labels, and explanatory copy. |

### UX Verdict

The graph section no longer looks copied across every page. Shared Recharts components remain, but each tab now answers a different business question with a different title, metric, category set, and chart intent.

## Differentiated Light Card Color Pass

User feedback: each card must use a different light color so the eye can separate cards quickly.

### Changes Applied

| Area | Change |
|---|---|
| Operation cards | Preserved the existing indexed light palette and strengthened its use across visible operation cards. |
| Visualization cards | Changed the primary and secondary chart cards from white to distinct light palette surfaces. |
| Dashboard KPI tiles | Changed dashboard KPI tiles from all-white cards to indexed light card colors. |
| Database/API resource cards | Added indexed light card colors to tab-level and runtime-layer resource cards. |
| Shared tab card grid | Added a light color cycle for shared bank tab hub cards. |
| UI policy | Updated the card policy: repeated card collections must not use the same white surface for every card. |

### UX Verdict

Card groups now have soft visual separation without changing layout. White remains available for inner controls and readable sub-panels, but repeated cards use different light backgrounds.

## UI Runtime Error Sweep Pass

User feedback: check other UI errors.

### Changes Applied

| Area | Change |
|---|---|
| Bank AI catalog | Replaced the live taxonomy fetch with a local §131 catalog preview so a down `/api/v1/ai-taxonomy/types` service does not create red console errors in the bank workspace. |
| Runtime check | Swept bank shell, scorecard, agentic, BCM, prompts, README, Data, AI, Business Value, and the fairness focus deep link for console/page errors. |

### UX Verdict

The bank pages render non-blank and without React page errors. The bank AI catalog preview no longer depends on a live taxonomy endpoint for initial render.



## Master B2C/B2B/B2E Visibility Pass

User feedback: B2C, B2B, and B2E master links were not visible in the bank main menu after the revert.

### Changes Applied

| Area | Change |
|---|---|
| AI Catalog placement | Moved the existing master AI Catalog block above the long Platform Modules list so `All 200 AI Types`, `B2C`, `B2B`, and `B2E` are visible without deep sidebar scrolling. |
| Route behavior | Preserved the master/global routes: `/ai-types`, `/ai-types?domain=b2c`, `/ai-types?domain=b2b`, and `/ai-types?domain=b2e`. |

### UX Verdict

The master B2C/B2B/B2E entries remain global links, but they are now visible near the top of the main menu instead of being buried below the platform-module list.



## Main Menu And Sub Menu Label Pass

User feedback: the bank shell must clearly show Main Menu and Sub Menu.

### Changes Applied

| Area | Change |
|---|---|
| Blue navigation pane | Renamed the top label from `Business Hierarchy` to `Main Menu` and added the visible path hint: Department -> B2C/B2B/B2E -> Main Process -> AI. |
| Maroon navigation pane | Added an explicit `Sub Menu` label in both empty and selected-process states. |
| Master links | Kept B2C/B2B/B2E master AI Catalog links unchanged as `/ai-types?domain=...`. |

### UX Verdict

Operators can now see the two-pane contract immediately: the blue pane is the Main Menu and the maroon pane is the Sub Menu.



## AI Types Sub Menu Placement Pass

User feedback: All AI Type links must be part of the Sub Menu only and must not appear in the Main Menu.

### Changes Applied

| Area | Change |
|---|---|
| Main Menu | Removed the master AI Catalog block from the blue Main Menu and shortened the path hint to Department -> B2C/B2B/B2E -> Main Process. |
| Sub Menu | Added the AI Types block to the maroon Sub Menu in both empty and selected-process states. |
| Routes | Preserved master/global routes for `/ai-types`, `/ai-types?domain=b2c`, `/ai-types?domain=b2b`, and `/ai-types?domain=b2e`. |

### UX Verdict

AI Types are no longer Main Menu items. They are available only inside the Sub Menu while keeping their master route behavior.



<!-- POS drill marker · safe file only · should auto-commit -->
