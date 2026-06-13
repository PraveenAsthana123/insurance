# UI Link, Performance, Visualization, and Tool Audit - 2026-06-12

## Scope

Checked the insurance UI main menu, B2C/B2B/B2E domain pages, sub-menu behavior, process detail pages, tab coverage, visualization/simulation/report surfaces, and the available testing/tooling approach for fast loading and link validation.

## Fixes Applied

- Domain and department rows in the insurance sub-menu now navigate to their landing pages while keeping chevrons available for expand/collapse.
- Generic insurance processes now default to all canonical domains (`b2c`, `b2b`, `b2e`) unless a process has explicit channel/domain mappings. This fixed empty B2E landing pages for Claims and Policy Administration.
- The full-link Playwright audit now checks actual insurance menu rows instead of only anchor tags, because this UI uses interactive row controls.
- The link audit records load timing, HTTP status, headings, process-card count, sidebar domain/process row count, tab count, selected tab count, feedback widget presence, empty states, warning banners, and browser console errors.
- The link audit is diagnostic/report-first so a single server interruption does not restart the worker and corrupt aggregate evidence.
- Frontend lint was restored by excluding vendored `OmniParser/` from the app lint scope and fixing first-party lint blockers.

## Verified Results

- Targeted B2E checks after fix:
  - `/insurance/7/b2e` Claims: HTTP 200, heading present, 16 process cards, 0 empty states, sub-menu present.
  - `/insurance/5/b2e` Policy Administration: HTTP 200, heading present, 15 process cards, 0 empty states, sub-menu present.
- Domain landing audit after fix:
  - 63/63 B2C/B2B/B2E department-domain pages passed.
- Full all-domain link audit attempt:
  - 1030/1031 checks passed.
  - The only failure occurred immediately after the Vite dev server emitted `Killed`, so it is recorded as an environment/server stability issue, not a reproduced UI defect.
- Frontend lint passed.
- Frontend production build passed with existing large chunk warnings.

## Tool Recommendations

| Need | Recommended Tool | Why |
|---|---|---|
| Test every link, tab, sub-tab, F12 console issue, trace, screenshot | Playwright | Already installed and extended with `all-processes-link-check.spec.js`. |
| Fast loading and bundle size | Lighthouse CI, Vite bundle visualizer, Rollup visualizer | Track time-to-load, chunk growth, lazy-loading regressions. |
| Component render speed | React Profiler | Find slow tabs, charts, simulations, and expensive rerenders. |
| Auto-refresh and freshness | Playwright + app freshness badges | Validate refresh buttons, stale status, last refreshed timestamps. |
| Graph / flowchart / pipeline visualization | Mermaid, React Flow, ECharts, Recharts | Current stack already includes Mermaid, ECharts, Recharts; React Flow is a good next addition for interactive pipelines. |
| Threshold/scoring/history/tracing | OpenTelemetry + existing trace service | Connect frontend actions to backend traces and scoring history. |
| Load and 1000-request tests | k6 | API throughput, latency, threshold checks. |
| Session replay and F12 production errors | Sentry or OpenReplay | Capture user-impacting runtime errors and history. |


## Backend Gate Fix Found During Validation

`project_doctor` exposed a backend idempotency conflict while validating this UI work. The generic idempotency middleware was returning `409` before the OpenClaw and Paperclip routers could apply their tenant-scoped replay logic. The generic middleware now defers `/api/v1/openclaw/tasks` and `/api/v1/paperclip/clips` to the router-level idempotency cache. Targeted backend tests for those three cases pass.

## Remaining Engineering Notes

- The Vite dev server was killed during very long 1,031-check Playwright runs. Use the 63-page domain audit for quick domain validation, and run the full audit in CI or against `vite preview`/production build for more stable evidence.
- The production build still has large chunk warnings for Plotly, ECharts, Recharts, Mermaid parser, and the main index bundle. Further route-level or tab-level lazy loading is recommended for faster initial load.
