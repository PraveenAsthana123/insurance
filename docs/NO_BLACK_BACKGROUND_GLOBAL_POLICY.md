# No Black Background Global Policy

This policy applies to every frontend surface in this repository: pages, components, dashboards, workspaces, cards, tables, modals, drawers, forms, simulations, charts, and AI/agent panels.

## Rule

Do not use black or near-black as a background color in content or workspace areas.

The UI must use light backgrounds for user work areas so content stays readable, scannable, and consistent across departments and tabs. Black and near-black may not be used as a brand block, component header, table header, active card background, modal body, dashboard panel, chart container, or workarea section surface.

## Forbidden Background Colors

The following values are forbidden as `background`, `backgroundColor`, `background-color`, gradients, CSS variables, theme tokens, or generated style values for content/workspace UI:

```
#000000
#000
#020617
#0f172a
#111827
#181818
#1a1a2e
#1e293b
#1f2937
#212121
#222222
rgb(0, 0, 0)
rgb(2, 6, 23)
rgb(15, 23, 42)
rgb(17, 24, 39)
```

This also blocks semantic aliases such as `black`, `slate-950`, `gray-950`, `zinc-950`, `neutral-950`, or local design tokens that resolve to those values when they are used as backgrounds.

## Required Light Palette

Use these defaults unless a local design system already provides equivalent light tokens:

```
#ffffff   primary card/table surface
#f8fafc   page/workspace background
#f1f5f9   secondary section surface
#eef2ff   active/info surface
#dbeafe   active blue tint
#ecfdf5   success surface
#fef3c7   warning/action surface
#fee2e2   error/destructive surface
#e5e7eb   default border
```

Use readable dark text on these light surfaces, for example `#0f172a`, `#1f2937`, or `#475569`. Dark text is allowed; dark backgrounds are not.

## Limited Exceptions

Dark backgrounds are allowed only for intentional navigation chrome or code-like inspection surfaces where the component is clearly not a workspace/content panel:

- left sidebars and navigation rails
- top application chrome when the product design explicitly requires it
- terminal/log/code preview blocks
- externally embedded widgets that cannot be themed locally

Even in these exceptions, do not use black as the brand color for table headers, component headers, workspace cards, dashboard panels, action cards, or chart containers. Prefer blue, teal, indigo, or role-specific accent colors for brand/active states.

## Component Requirements

Every new or changed frontend component must follow these rules:

- Workspace/page backgrounds use light slate or white.
- Cards use white or light tinted surfaces, with borders or left rails for distinction.
- Info, action, input, process, output, and visualization cards must be visually distinguishable without black blocks.
- Table headers use light backgrounds with dark text, not black fill.
- Component headers use light backgrounds or colored borders/badges, not black fill.
- Active buttons use blue or domain accent colors, not black.
- Modal backdrops may be translucent but should not create a black content surface.

## Enforcement

Run the deterministic audit before handing back frontend work that touches layout, cards, tables, headers, dashboards, or workspaces:

```bash
./scripts/audit_no_black_backgrounds.sh
```

Expected results:

- Exit `0`: clean.
- Exit `1`: release blocker; replace offending background with a light palette value.
- Exit `2`: no frontend source found or script misconfigured.

The default project health check remains:

```bash
./scripts/project_doctor.sh
```

## Review Checklist

Before marking UI work complete, verify:

- no visible black/near-black background in content/workspace area
- no black table header or component header
- no black active card, action card, or CTA block
- dark colors are used only for text, icons, borders where appropriate, or allowed chrome
- the no-black audit passes or any exception is documented with a clear reason
