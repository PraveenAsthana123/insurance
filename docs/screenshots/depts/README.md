# Department Overview Screenshots

Full-page captures of the OverviewTab for depts that previously had
only the generic description block. Each now renders the shared
**"Data snapshot (static — Phase 1 seed)"** 4-tile enrichment built
on existing frontend data files (workflows.js, aiUseCases.js,
roles.js, dataFlow.js) — no backend dependency.

Captured by: `frontend/e2e/capture-all-depts.spec.js`
Viewport: 1440 × 900, fullPage

| File | Dept slug | Notes |
|---|---|---|
| `supply-chain-overview.png` | `/supply-chain` | 15 workflows, 3 inbound + 2 outbound flows |
| `contact-center-overview.png` | `/contact-center` | Seeded with AI use cases + roles (Phase 1) |
| `marketing-overview.png` | `/marketing` | Seeded with AI use cases + roles (Phase 1) |
| `telehealth-overview.png` | `/telehealth` | Newest dept — proves generic block renders even for minimally-seeded depts |

Re-capture:

```bash
cd frontend
npx playwright test capture-all-depts --project=chromium
```
