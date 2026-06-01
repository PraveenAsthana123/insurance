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
