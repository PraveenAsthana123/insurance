# Frontend Performance + Visualization Tools Catalog

> Per operator 2026-06-08: which tools help with **fast loading · fast refresh · graph · flowchart · simulation · data visualization · user story · pipeline visualization · threshold · scoring · history · tracing**.

OSS-first. Each row = problem the tool solves + concrete library + how to install + concrete code pattern.

---

## 1. Fast loading (initial page render under 2s)

| Tool | What it solves | Install | Pattern |
|---|---|---|---|
| **Vite** | Native ESM dev · 10x faster than webpack | already in use | `vite build` |
| **React.lazy + Suspense** | Code-split per route · only load what's on screen | built into React | `const Page = lazy(() => import('./Page'))` + `<Suspense fallback={...}>` |
| **rollup-plugin-visualizer** | See bundle composition · find bloated chunks | `npm i -D rollup-plugin-visualizer` | add to `vite.config.js` · opens stats.html after build |
| **vite-plugin-pwa** | Service-worker pre-cache · offline + warm cache | `npm i -D vite-plugin-pwa` | adds `manifest.webmanifest` + `sw.js` |
| **Brotli/Gzip via nginx** | -70-85% network bytes | nginx config | `gzip on; brotli on;` |
| **lighthouse-ci** | Automated perf score per build | `npm i -D @lhci/cli` | `lhci autorun --collect.url=http://localhost:3210` |
| **web-vitals** | Real-user LCP/CLS/INP in browser | `npm i web-vitals` | `getLCP(console.log)` |

## 2. Fast refresh (sub-second after code change)

| Tool | Solves | Use |
|---|---|---|
| **@vitejs/plugin-react** | Fast Refresh for React (HMR preserves state) | already enabled in Vite |
| **vite --force** | Cache busted re-deps when something seems stuck | `npm run dev -- --force` |
| **vite-plugin-inspect** | See what each plugin does to a module | `npm i -D vite-plugin-inspect` |

## 3. Auto-refresh (live reload of data without manual F5)

| Tool | When | Pattern |
|---|---|---|
| **TanStack Query (formerly React Query)** | API data with stale-while-revalidate | `useQuery({ queryKey, queryFn, refetchInterval: 30_000 })` |
| **SWR** | Lighter alternative · stale-while-revalidate | `useSWR(url, fetcher, { refreshInterval: 30000 })` |
| **EventSource (SSE)** | Server-pushed updates · one-way · simpler than WebSocket | `new EventSource('/api/v1/.../stream')` |
| **WebSocket** | Bidirectional real-time | `new WebSocket('ws://...')` |
| **Server-Sent React Hot Reload** | DEV ONLY · auto reload on backend code change | uvicorn `--reload` flag |
| **MutationObserver** | Auto-detect DOM changes for testing | (already used in §46 TTS) |

## 4. Graph visualization

| Library | Best for | Install |
|---|---|---|
| **react-flow** | DAGs · nodes-and-edges editors · agent orchestrations | `npm i reactflow` |
| **vis-network** | Network graphs · physics simulation · large graphs | `npm i vis-network` |
| **cytoscape.js + cytoscape-react** | Bio/ontology-style graphs · 10k+ nodes | `npm i cytoscape react-cytoscapejs` |
| **D3-force** | Force-directed layouts · raw flexibility | `npm i d3-force` |
| **sigma.js** | High-perf large graphs (WebGL) | `npm i sigma` |
| **react-d3-tree** | Hierarchies/org charts | `npm i react-d3-tree` |

## 5. Flowchart / sequence / state diagrams

| Library | Best for | Install |
|---|---|---|
| **Mermaid** | Markdown-embedded diagrams · simplest · already in §86 | `npm i mermaid` |
| **react-flow** (again) | Interactive editable flowcharts | `npm i reactflow` |
| **GoJS** | Production-grade BPM/swimlane (commercial · free for non-prod) | `npm i gojs` |
| **JointJS** | OSS BPMN · UML · ERD | `npm i jointjs` |
| **bpmn-js** | BPMN 2.0 modeler/viewer | `npm i bpmn-js` |
| **dagre** | Auto-layout for DAGs (compose with react-flow) | `npm i dagre` |

## 6. Process simulation (in-browser what-if)

| Library | What | Install |
|---|---|---|
| **react-state-machines (XState)** | Statechart-based simulators · visualizer | `npm i xstate @xstate/react` |
| **simjs** | Discrete-event simulation engine | `npm i sim-js` |
| **simpy** (Python backend) | Heavier simulation · agent-based · run on backend | `pip install simpy` |
| **rl-js** | Reinforcement-learning sim for what-if | `npm i rl-js` |
| **react-chrono** | Timeline-based simulation playback | `npm i react-chrono` |

Reference impl in this project: `SimulationTab` in `frontend/src/pages/insurance/tabs/SimpleTabs.jsx`.

## 7. Data visualization (charts · plots · KPIs)

| Library | Best for | Install |
|---|---|---|
| **Recharts** | Standard React charts · declarative · already in use | `npm i recharts` |
| **Plotly.js + react-plotly.js** | Scientific (boxplot · violin · contour · 3-D · sankey) | `npm i plotly.js-dist-min react-plotly.js` |
| **ECharts (echarts-for-react)** | Big-data · geo heatmap · gauge · radar · calendar | `npm i echarts echarts-for-react` |
| **Vega-Lite (react-vega)** | Grammar-of-graphics · reproducible spec-based | `npm i react-vega vega-lite` |
| **Visx** (Airbnb) | Low-level · D3-react bridge · max control | `npm i @visx/visx` |
| **Apache Superset** (server) | BI dashboard · embed iframes | docker pull `apache/superset` |
| **Grafana** (server) | Time-series dashboards · panels-as-code | `docker run grafana/grafana` |

## 8. User story · journey · persona

| Tool | What | Install |
|---|---|---|
| **react-chrono** | Vertical/horizontal timeline · story walkthrough | `npm i react-chrono` |
| **Storybook** | Component-as-story · visual catalog · per-state walkthrough | `npm i -D @storybook/react-vite` |
| **react-joyride** | Guided in-app product tours | `npm i react-joyride` |
| **Intro.js (intro.js-react)** | Step-by-step UI tutorials | `npm i intro.js intro.js-react` |
| **Driver.js** | Lightweight in-app spotlight tours | `npm i driver.js` |
| **Shepherd.js** | Multi-step UI walkthroughs · framework-agnostic | `npm i shepherd.js` |

## 9. Pipeline visualization (ML/data/agent pipelines)

| Tool | Best for | Install |
|---|---|---|
| **react-flow** | Agent DAG visualizer · drag/drop · auto-layout via dagre | `npm i reactflow dagre` |
| **DVC Studio** (web) | Data-version-control pipeline graph | https://dvc.org/doc/studio |
| **Apache Airflow UI** | Workflow DAG visualization | server-side · `pip install apache-airflow` |
| **MLflow UI** | Model lineage · runs · artifact tree | `pip install mlflow` + `mlflow ui` |
| **Phoenix (arize-phoenix)** | LLM/RAG/agent traces · already in §88 #8 catalog | `pip install arize-phoenix` |
| **Langfuse** | LLM trace + eval pipeline visualizer | self-host docker · or langfuse.com |
| **OpenLLMetry** | OTel-based LLM trace | `pip install traceloop-sdk` |

## 10. Threshold + alerts (red/amber/green gates)

| Tool | What | Install |
|---|---|---|
| **react-gauge-component** | RAG-status gauge with threshold bands | `npm i react-gauge-component` |
| **react-circular-progressbar** | Single KPI with threshold color | `npm i react-circular-progressbar` |
| **react-vis** (deprecated · still works) | Threshold annotations on series | `npm i react-vis` |
| **D3-color** + ECharts visualMap | Threshold-driven color scales | `npm i echarts` |
| **AlertManager** (server) | Prometheus-based threshold alerts | docker `prom/alertmanager` |
| **Grafana threshold panels** | Visual + alert on threshold breach | server-side |

In this project: thresholds defined per §75 (clinical), §82 (fairness), §87 (audit row) · enforced via `tools_executed` in §88 reports.

## 11. Scoring (composite metrics · weighted scores)

| Tool | What |
|---|---|
| **Custom React component + Recharts** | composite-score bar with per-metric weighting (see SimulationTab) |
| **react-scorecard** | drop-in scorecard component | `npm i react-scorecard` (limited; often built custom) |
| **Plotly bullet chart** | Score vs target with thresholds | included in Plotly |
| **G-Eval (Python)** | LLM-as-judge composite scoring | `pip install deepeval` (§88 #8) |
| **Ragas (Python)** | RAG faithfulness/relevance composite | `pip install ragas` (§88 #8) |
| **scikit-learn** | Classification/regression metrics composite | `pip install scikit-learn` |

Reference: per-process composite formulas in `process-detail.md §10`.

## 12. History (audit trail · time-travel · replay)

| Tool | What | Install |
|---|---|---|
| **React Router v6 history** | Browser history · back/forward already exists | built-in |
| **TanStack Query devtools** | Inspect cached query history (DEV) | `npm i @tanstack/react-query-devtools` |
| **Redux DevTools** (if using Redux/Zustand) | Time-travel state debugging | browser extension |
| **Sentry session replay** | Production session replay with audio/video | `npm i @sentry/react @sentry/replay` (free tier limited) |
| **Highlight.io** (OSS · self-host) | Session replay + error tracking | docker · or highlight.io |
| **OpenReplay** (OSS · self-host) | Session replay · scrubbable | docker `openreplay/openreplay` |
| **Postgres temporal tables** | Server-side audit history | `CREATE TABLE ... WITH (system_versioning = ON);` (postgres-temporal-tables ext) |

In this project: per-operation audit row stored in `user_input_events` (§87) · replayable via `/api/v1/admin/feedback/comments`.

## 13. Tracing (distributed traces · spans · correlation)

| Tool | What | Install |
|---|---|---|
| **OpenTelemetry JS** | W3C-standard trace propagation in browser | `npm i @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch` |
| **Jaeger** (server) | Trace visualizer | docker `jaegertracing/all-in-one` |
| **Tempo** (Grafana) | Trace storage · cheaper than Jaeger | docker `grafana/tempo` |
| **Zipkin** (server) | Distributed tracing visualizer | docker `openzipkin/zipkin` |
| **SigNoz** (OSS · OTel-native) | Full APM · traces + logs + metrics | docker · self-host |
| **Honeycomb** (SaaS · free tier) | Powerful trace query language | api.honeycomb.io |
| **Datadog APM** (SaaS) | Production APM · expensive but feature-rich | `npm i dd-trace` |
| **B3 propagation headers** | Cross-service trace ID propagation | OTel default |

In this project: backend uses correlation_id middleware (`backend/core/middleware.py CorrelationIdMiddleware`). Browser side: add `@opentelemetry/instrumentation-fetch` to propagate trace IDs to the backend.

---

## Recommended for this project (priority order)

1. **TanStack Query** for auto-refresh + cached fetches (replaces ad-hoc useEffect+fetch in `useFeedbackSummary`)
2. **react-flow** for pipeline/agent DAGs (visualize the 10 agents in `DEFAULT_TESTING_AGENT_ASSIGNMENTS.json`)
3. **OpenTelemetry instrumentation-fetch** in browser → matches backend's correlation_id middleware
4. **vite-plugin-pwa** + service worker → makes refresh instant after first load
5. **Storybook** for per-tab story snapshots (each of 22 tabs gets a story)
6. **Plotly.js** for sankey + boxplot in Visualization tab (Recharts can't do sankey)
7. **Lighthouse CI** in `jobs/reports/testing/` per §88 area #4
8. **rollup-plugin-visualizer** baseline + per-release diff
9. **Langfuse OR OpenLLMetry** for LLM trace propagation (extends §88 area #8)
10. **react-chrono** for user-story tab in process detail

## Quick wins (install in one PR · ~2 hours)

```bash
npm i @tanstack/react-query @tanstack/react-query-devtools
npm i reactflow dagre
npm i @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch
npm i -D rollup-plugin-visualizer vite-plugin-pwa
npm i -D @lhci/cli
```

Then:
1. Wrap `<App>` in `<QueryClientProvider>` (replaces AdminFeedbackPage's manual hooks)
2. Add `LinkAuditDashboard` in `/admin/link-audit` showing the JSON output of comprehensive-ui-audit
3. Add `LighthouseDashboard` reading `lhci` JSON from `jobs/reports/testing/lighthouse_latest.json`
4. Add `<TraceProvider>` propagating W3C traceparent header on all fetches

---

Composes with **§88** (this catalog feeds tool choices for areas #4 frontend/F12 + #5 load) · §47 (architecture C4 + UI patterns) · §76 (RAI · session-replay-with-consent) · §87 (universal audit row carries trace_id propagated from browser).
