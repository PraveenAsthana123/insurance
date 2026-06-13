# UI Global Policy

This policy applies to all frontend work in this repository, including the current React/Vite app and any future Next.js migration. It is intentionally strict for dashboards, admin tools, manager hubs, charts, simulations, and AI-assisted workflows.

## 1. Product Principle

The UI must behave like an operational analytics product, not a marketing page.

Every production screen must make it clear:

- what data is shown
- where the data came from
- when the data was last refreshed
- whether the data is live, cached, stale, mocked, or unavailable
- what the user can do next
- what role or permission controls the action

Blank screens, silent failures, hidden loading states, and unexplained placeholder content are not allowed.

## 1.1 Card Meaning Policy

Operational cards must make their intent visible without relying on surrounding copy. Use a consistent card-kind treatment:

- `INFO`: read-only or reference content; light neutral/blue/green/pink/slate surface, slate badge, and read/inspect CTA.
- `ACTION`: executes a workflow or changes state; light amber/orange surface, strong left rail, action badge, and verb CTA.
- `MIXED`: contains both read-only header/details and executable buttons; light blue/teal/indigo surface, mixed badge, and action buttons separately styled as actions.

Repeated card collections must cycle through different light background colors so adjacent cards are visually separable. Do not render a full card grid where every card uses the same white surface. Do not use the same visual treatment for passive information and executable operations. Every clickable card must expose its kind through visible label text and accessible metadata such as `aria-label` or `data-card-kind`.

## 1.2 Navigation Dependency And Workspace Quality

Process workspaces must show how the selected main-menu item, sub-menu focus, active tab/sub-tab, and content source relate to each other. A user should not need to infer whether the content belongs to the selected department, process, AI focus, or tab.

Operational process screens must also expose a compact quality check for objective, input, process, output, focus correlation, and content/data mapping. Manual execution views must identify the AS-IS human workflow; automatic execution views must identify the TO-BE automation workflow and HITL/governance boundary.


## 1.3 No Black Background Global Policy

Repository-wide frontend work must follow `docs/NO_BLACK_BACKGROUND_GLOBAL_POLICY.md`. Black and near-black colors must not be used as content/workspace backgrounds, table headers, component headers, active card backgrounds, dashboard panels, modal bodies, chart containers, or brand blocks. Dark slate remains allowed for readable text on light surfaces.

Enforcement command:

```bash
./scripts/audit_no_black_backgrounds.sh
```

## 2. Required Screen States

Every route, tab, chart, table, drawer, and API-backed widget must implement these states:

- `loading`: skeleton or stable loading surface
- `success`: normal data rendering
- `empty`: clear no-data state with next action if available
- `error`: readable failure state with retry or recovery path
- `stale`: visible warning when data freshness exceeds SLA
- `unauthorized`: role/permission-specific blocked state
- `degraded`: partial functionality when services such as AI, Redis, MLflow, or backend APIs are unavailable

Do not ship API-backed UI that only handles the happy path.

## 3. Data Freshness Policy

Every dashboard section and operational widget must show freshness metadata.

Required fields:

- Last updated timestamp from backend or source system
- Last fetched timestamp from browser when backend timestamp is unavailable
- Source system label, for example `Postgres`, `Rossmann`, `Supply Chain CSV`, `Ollama`, `MLflow`
- Freshness status: `fresh`, `stale`, `refreshing`, `failed`, or `unknown`

Refresh requirements:

- Add manual refresh for dashboards, tables, charts, and operational widgets.
- Disable or debounce refresh while a request is already running.
- Show refresh progress.
- Show refresh failure with retry.
- Do not silently replace visible data with empty content during refresh.
- Keep previous successful data visible while fetching newer data unless correctness requires clearing it.

Recommended freshness thresholds:

- Executive/dashboard KPIs: stale after 15 minutes
- Operational supply-chain views: stale after 5 minutes
- ML forecasts: stale after 24 hours unless model metadata says otherwise
- Static docs/RAG corpus metadata: stale after 7 days
- Demo/static mock data: always labeled `demo data`

## 4. Performance And Lazy Loading

Heavy UI must be lazy-loaded.

Must lazy-load:

- chart libraries
- graph/network visualization libraries
- markdown renderers
- simulation workbenches
- AI drawers and chat panels
- department-specific deep-dive tabs
- admin-only modules
- e2e/demo-only components

React/Vite standard:

```jsx
const HeavyTab = React.lazy(() => import('./HeavyTab'));
```

Next.js standard:

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

Performance requirements:

- No route should eagerly import all department tabs.
- No dashboard should load all charting and AI code on first paint.
- Large tables must use pagination or virtualization.
- Long lists must avoid rendering every row at once.
- Expensive derived data must use memoization or server-side calculation.
- Bundle size regressions must be reviewed before merge.

## 5. Charts And Graphs

Every chart must include:

- title
- metric definition or tooltip
- axis labels and units
- legend when multiple series exist
- loading state
- empty state
- error state
- freshness badge
- source label
- accessible text summary

Forecast charts must include:

- forecast horizon
- confidence interval where available
- model version or training timestamp
- quality metric such as MAPE/RMSE when available
- warning if forecast is fallback, cached, or heuristic

Graph/network views must include:

- zoom and pan
- search
- filters
- node legend
- edge legend
- selected-node detail panel
- freshness or health coloring
- export or screenshot support where useful

Graph node types should be standardized:

- `source`
- `pipeline`
- `database`
- `model`
- `api`
- `dashboard`
- `user`
- `external-system`


## 5.1 Per-Page Graph Specificity Policy

Do not reuse the same generic graph across every page, tab, or department workspace. Each chart must declare its business intent, metric, axis/category meaning, source path, and whether it is live, cached, deterministic demo, or pending backend wire-up.

For process workspaces, graph plans must vary by active tab and sub-tab. For example, data tabs should visualize data quality or lineage, AI tabs should visualize model confidence or AI capability usage, business-value tabs should visualize ROI/dollar impact, governance tabs should visualize approvals or controls, and testing tabs should visualize pass rate or coverage.

A shared chart component is allowed only when the data plan, title, metric, categories, and explanatory copy are page-specific.

## 6. Status And Health UI

Every major app shell must expose service status.

Minimum status indicators:

- backend API
- database
- Redis/Celery
- Ollama/RAG
- MLflow
- active role/permission mode
- demo vs live data mode

Status states:

- `online`
- `degraded`
- `offline`
- `unknown`

When a dependency is unavailable, the UI must keep the rest of the page usable and clearly mark the affected feature.

## 7. API And Server State

Use a consistent API state pattern.

Requirements:

- Centralize API calls in service/client modules.
- Use request timeouts.
- Cancel stale requests on route or filter change where possible.
- Use retry only for safe idempotent reads.
- Surface backend correlation IDs in error details when available.
- Standardize API errors into a common UI error object.
- Keep server state separate from local UI state.

Recommended libraries:

- Existing React/Vite: TanStack Query or SWR for server state if the app grows further.
- Next.js: server `fetch` for server-rendered data, client query library for live interactive widgets.

## 8. Microfrontend Policy

Do not introduce microfrontends only for code organization. Use route-level code splitting first.

Microfrontends are allowed only when at least two of these are true:

- different teams own different modules
- modules deploy independently
- modules require independent release cadence
- modules have different runtime dependencies
- modules need failure isolation

If microfrontends are introduced, each module must provide:

- ownership file
- build command
- test command
- health endpoint or health contract
- API contract version
- shared design-system version
- feature flag
- fallback UI when unavailable

Shared shell responsibilities:

- navigation
- auth/session
- role context
- layout frame
- theme tokens
- global status bar
- global error boundary

Microfrontends must not own global auth, global CSS resets, or shell navigation.

## 9. SEO Policy

SEO applies only to public pages, documentation pages, landing pages, and shareable report pages.

Private authenticated dashboards should default to `noindex`.

Public pages must include:

- page title
- meta description
- canonical URL
- Open Graph metadata
- Twitter card metadata where relevant
- semantic heading structure
- sitemap entry
- robots policy

Next.js public route example:

```tsx
export const metadata = {
  title: 'Insur Analytics Dashboard',
  description: 'AI-powered insurerage analytics platform for sales, supply chain, and customer intelligence.',
};
```

Authenticated app routes must not leak private business data through metadata.

## 10. Accessibility Policy

All interactive UI must be keyboard accessible.

Requirements:

- visible focus states
- correct heading order
- buttons for actions, links for navigation
- ARIA labels for icon-only controls
- focus trap for modal/drawer surfaces
- Escape closes modal/drawer surfaces
- tables use real table semantics
- status is not communicated by color alone
- chart data has a text/table alternative or summary
- UI respects reduced-motion preferences

Minimum contrast target:

- WCAG AA for text and controls

## 11. Security Policy

Frontend must not expose secrets.

Requirements:

- Only public browser env vars may use `VITE_*` or `NEXT_PUBLIC_*`.
- Never render raw HTML from API responses unless sanitized.
- Markdown rendering must be sanitized or restricted.
- URLs from data must be validated before being used as links.
- Permission checks must exist on backend; frontend checks are only UX.
- Sensitive data must not be stored in localStorage.
- Private pages must not be indexed.

Next.js deployments must define security headers in `next.config.js` or middleware.

## 12. Observability Policy

Frontend errors and key actions must be observable.

Required events:

- route change
- API failure
- refresh started/succeeded/failed
- simulation submitted/succeeded/failed
- AI explain submitted/succeeded/failed
- permission denied
- chart render failure
- uncaught frontend error

Every API failure UI should expose or log:

- route
- endpoint
- status code
- correlation ID when available
- timestamp
- active role

## 13. Testing Policy

Every significant UI feature must include tests proportional to risk.

Required coverage for dashboard features:

- loading state
- success state
- empty state
- error state
- stale state if data-backed
- role-denied state if permissioned
- refresh behavior

Required E2E flows:

- dashboard loads
- department manager page loads
- flagship chart renders
- refresh works
- role permission blocks protected action
- AI/RAG unavailable state is graceful
- backend unavailable state is graceful

CI must run:

```bash
npm run validate
PYTHONPATH=backend python -m pytest backend/tests -q -m "not eval"
```

Opt-in eval tests may depend on Ollama and should not run in default CI unless the required model is available.

## 14. Design System Policy

New frontend work should use shared primitives instead of one-off markup.

Required shared primitives:

- `Button`
- `IconButton`
- `Tabs`
- `Drawer`
- `Modal`
- `Table`
- `StatusPill`
- `FreshnessBadge`
- `ErrorState`
- `EmptyState`
- `Skeleton`
- `ChartFrame`
- `KpiCard`
- `PermissionGate`

Until those primitives exist, new features must at least follow the same naming, state, and styling conventions so migration is straightforward.

Avoid:

- nested cards
- unexplained decorative UI
- one-off inline styles for repeated patterns
- hidden scroll areas without visible affordance
- color-only status indicators
- route-level blank screens

## 15. Next.js Migration Policy

If the app migrates to Next.js, the migration must preserve current behavior and add route-level production primitives.

Required route files:

- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- route `page.tsx`
- route metadata for public pages

Migration rules:

- Use server components by default.
- Use client components only for interaction, browser APIs, charts, and live refresh.
- Keep charting and graph libraries out of the default server bundle.
- Use `dynamic()` for heavy browser-only components.
- Use middleware for auth redirects only; backend remains source of permission truth.
- Do not expose private dashboard content through static metadata.

## 16. Pull Request Gate

A frontend PR is not ready unless this checklist is satisfied:

- `npm run validate` passes
- `./scripts/project_doctor.sh` passes locally when backend changes are involved
- all API-backed UI has loading, empty, error, and refresh states
- all data-backed UI shows freshness metadata
- heavy modules are lazy-loaded
- role-gated actions have blocked states
- charts include units, legends, and source/freshness labels
- private routes are not indexed
- keyboard navigation works for new interactive surfaces
- no secrets are exposed through client env vars
- screenshots or E2E coverage exist for major visual changes

## 17. Implementation Priority

Implement this policy in this order:

1. Shared `FreshnessBadge`, `StatusPill`, `ErrorState`, `EmptyState`, and `Skeleton` components.
2. Route/tab lazy loading for heavy manager/admin modules.
3. Standard chart wrapper with loading/error/empty/freshness/source states.
4. Dashboard refresh pattern with stale-while-refresh behavior.
5. Global service health/status bar.
6. Role-aware permission gate component.
7. Frontend observability events and correlation ID display.
8. Accessibility pass for sidebar, tabs, drawers, and charts.
9. Public-page SEO only where pages are intentionally public.
10. Microfrontend boundaries only if independent deployment becomes real.

## 18. User Input Persistence Policy

All frontend work that accepts meaningful user input must follow `docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md`.

Required frontend behavior:

- Send prompts, chats, forms, filters, simulations, approvals, feedback, uploads, exports, and agent commands through backend APIs that persist input events.
- Use shared API bindings; never write directly from browser code to the database.
- Include route path, component ID, department/process context, input kind, input name, purpose, and non-sensitive payload in the request envelope when available.
- Do not store sensitive input in localStorage.
- Do not send known secrets, tokens, passwords, private keys, or unnecessary PII.
- Surface `input_event_id` or correlation ID in debug/error UI when backend returns it.
- For critical inputs, show a clear error if persistence fails and the backend rejects processing.
- Add E2E or component tests for high-value input surfaces such as Ask AI, chat, prompts, simulations, approvals, and feedback.

## Bank Shell Resizable Menu And Workspace Policy

Desktop and tablet bank layouts must provide two resize controls: an inner split handle between the blue main menu and maroon sub-menu, and an outer boundary handle between the full menu area and the workspace. Dragging the inner split reallocates width between menus. Dragging the outer boundary left gives more width to the workspace/content area; dragging it right widens the menus. Widths must persist in `localStorage` and stay clamped so the workspace remains usable.

## Bank Tab Component Review And Action Lifecycle Policy

Every bank workspace tab must expose a visible component review before the detailed tab body. The review must use one row per task and show sequence, component type, purpose, expected outcome, and readiness for Objective, Input, Process, Workspace Cards, Output, Visualization, Actions, Checklist, History, and Audit.

Cards must identify whether they are `INFO`, `ACTION`, or `MIXED`, use light differentiated colors, include a two-line purpose/outcome summary, and show a compact Input -> Process -> Output flow. Action buttons must show active/running state, disable conflicting duplicate clicks while processing, and render completion status with timestamp in the space directly below the action controls.



## Bank No Black Background Policy

Bank workspace, header, resize handles, modal backdrops, chat rails, active toggle blocks, table headers, component headers, section accents, chart primary strokes, and tab brand colors must avoid black or near-black treatments. Use light slate surfaces for passive containers and blue-tinted states for active controls. Dark slate such as `#0f172a` is allowed only for readable body text or labels, not as a brand/accent/header color in the bank UI.


## §137 — No Black Background in Content / Workspace Areas (Global)

Effective 2026-06-12 · operator directive `create global policy ...not to use black color as background`. Canonical project policy: `docs/NO_BLACK_BACKGROUND_GLOBAL_POLICY.md`. This section enforces it for this project.

### Rule

Content / workspace areas MUST use light backgrounds. Dark backgrounds
are reserved for **navigation chrome** (sidebars, headers, channel-list
asides, nav-rails).

### Forbidden hex in `frontend/src/{pages,components}/`

```
#000000 · #0f172a · #111827 · #181818 · #1a1a2e · #1e293b · #1f2937
#212121 · #222222 · (and CSS-var equivalents resolving to any of these)
```

### Permitted light palette

```
#ffffff   primary card
#f8fafc   page background (slate-50)
#f1f5f9   secondary surface (slate-100)
#ecfdf5   success/positive (mint-50)
#fef3c7   warning/action (amber-50)
#fee2e2   error/destructive (red-50)
#dbeafe   info (blue-50)
border: '1px solid #e5e7eb' (slate-200)
```

### Where dark IS still allowed

- `BankSidebar.jsx` (left main menu) · `BankHeader.jsx` (top bar)
- `BankChatPage.jsx:54` channel-list `<aside>`
- `HolyNavPage.css` sidebar variables
- `AeoDepartmentPage` + `EaosDepartmentPage` main `<aside>` (department menu)

### Audit (deterministic · cron-locked)

```bash
scripts/audit_no_black_backgrounds.sh
```

- Exit 0 = clean · Exit 1 = release blocker · Exit 2 = no frontend
- Uses awk 5-line context window to exempt navigation chrome
- Cron-installed at **09:00 + 21:00 daily** with tag `§137 NO-BLACK-CONTENT-BG`
- Log: `jobs/logs/no_black_backgrounds_audit.log`

### CI gate

```yaml
- name: §137 no-black-background audit
  run: ./scripts/audit_no_black_backgrounds.sh
```

### Reference implementation

Commit `fe713e95` (18 files dark→light · zero behavior change).
