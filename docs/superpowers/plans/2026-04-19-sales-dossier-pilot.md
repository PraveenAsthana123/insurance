# Sales Department Dossier — Single-Pane-of-Information Pilot

**Goal:** One consolidated page showing **every piece of information** about the Sales department — KPIs, processes, AI use cases, decisions, documents, incidents, reports, governance events, monitoring, lifecycles, roles, data flows — in a single scroll-through view. Built for Sales ONLY as the pilot; other depts keep the existing Admin/Manager split.

**Why:** user wants to validate the "full picture" for one dept before deciding if this view should scale to all. Tests the blueprint's 12-module OS coverage in one screen.

**Constraint:** **Additive only** — do not modify any existing tab, page, or route. Only add new files + one sidebar sub-link + one new route.

---

## Structure of the Dossier (13 sections, scrolling page)

Each section is a self-contained card. Data pulled from existing data files — no new backend.

| # | Section | Data source | Visual |
|---|---|---|---|
| 1 | Header | `departments.js` | Dept banner with icon/color/description/ROI badge |
| 2 | Headline KPIs | computed from live `/api/v1/sales/stores` + synthetic | 6 tiles (Revenue, MAPE, Active SKUs, Forecast accuracy, Simulation runs, RBAC denials) |
| 3 | Live backend status | `/api/v1/sales/stores` + `/api/v1/sales/forecast` | green/red pills per endpoint |
| 4 | Processes & Workflows | `workflows.js` filtered to `dept==='sales'` | Top 6 + link to full Workflows tab |
| 5 | AI Use Cases | `aiUseCases.js` filtered to `dept==='sales'` | 4 category-colored cards with inputs/outputs |
| 6 | Roles & Responsibilities | `roles.js` seeded `sales` entries | 4-role grid with KPIs preview |
| 7 | Reports catalogued | `reports.js` | 4 role-columns with report names |
| 8 | Documents / RAG corpus | `data/sales-context/*.md` (hardcode 4 filenames) | Card per corpus file + link to ExplainDrawer |
| 9 | Active decisions (sim runs) | synthetic from `hashString('sales-sim')` | 5 recent sim results |
| 10 | Incidents / RBAC events | synthetic from `overrideEvents.js` filtered to sales | 5 recent entries |
| 11 | Monitoring snapshot | synthetic | 4 health indicator tiles (uptime, p95 latency, drift, SLA compliance) |
| 12 | Lifecycles | `lifecycles.js` | Mini state-machine diagrams inline |
| 13 | Data flows | `dataFlow.js` filtered | X in / Y out tables |

Scroll layout, each section ~200-300px tall, anchor-navigable via a table-of-contents sidebar at the top.

---

## File structure

**Create:**
```
frontend/src/pages/DepartmentDossierPage.jsx
frontend/src/components/dossier/HeaderBanner.jsx     (dept banner + ROI pill)
frontend/src/components/dossier/KpiStrip.jsx
frontend/src/components/dossier/BackendStatusRow.jsx (reuses salesApi)
frontend/src/components/dossier/ProcessesSection.jsx
frontend/src/components/dossier/UseCasesSection.jsx
frontend/src/components/dossier/RolesSection.jsx
frontend/src/components/dossier/ReportsSection.jsx
frontend/src/components/dossier/DocumentsSection.jsx
frontend/src/components/dossier/DecisionsSection.jsx
frontend/src/components/dossier/IncidentsSection.jsx
frontend/src/components/dossier/MonitoringSection.jsx
frontend/src/components/dossier/LifecyclesSection.jsx
frontend/src/components/dossier/DataFlowsSection.jsx
frontend/src/components/dossier/SectionCard.jsx       (shared wrapper)
```

**Modify:**
```
frontend/src/App.jsx             → add route `/:departmentId/dossier`
frontend/src/components/Sidebar.jsx  → add ⭐ Dossier sub-link ONLY for dept.id==='sales'
```

**Tests:**
```
frontend/e2e/capture-screenshots.spec.js  → add one test capturing Sales dossier
```

---

## Route behavior

- `/sales/dossier` → full page
- For any other dept (e.g. `/supply-chain/dossier`) — ALSO works, renders with whatever data exists (Supply Chain has partial — e.g., seeded AI use cases but empty roles). Document this explicitly so we can see what's "missing" per dept.

But: **sidebar sub-link initially only shows under Sales** to enforce the pilot-first discipline.

---

## Tasks (execute in order)

### Task 1 — Shared primitives

Create `SectionCard.jsx`:

```jsx
export default function SectionCard({ id, icon, title, subtitle, children, footer }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          {subtitle && <span style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</span>}
        </header>
        {children}
        {footer && <footer style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>{footer}</footer>}
      </div>
    </section>
  );
}
```

All sections use this wrapper so visual consistency is automatic.

Commit: `feat(dossier): SectionCard shared primitive`.

### Task 2 — Page shell

`DepartmentDossierPage.jsx`:

```jsx
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import HeaderBanner from '../components/dossier/HeaderBanner';
import KpiStrip from '../components/dossier/KpiStrip';
// ... import all section components

const SECTIONS = [
  { id: 'kpis',        label: 'KPIs',             Component: KpiStrip },
  { id: 'status',      label: 'Backend status',   Component: BackendStatusRow },
  { id: 'processes',   label: 'Processes',        Component: ProcessesSection },
  { id: 'usecases',    label: 'AI Use Cases',     Component: UseCasesSection },
  { id: 'roles',       label: 'Roles',            Component: RolesSection },
  { id: 'reports',     label: 'Reports',          Component: ReportsSection },
  { id: 'documents',   label: 'Documents',        Component: DocumentsSection },
  { id: 'decisions',   label: 'Decisions',        Component: DecisionsSection },
  { id: 'incidents',   label: 'Incidents',        Component: IncidentsSection },
  { id: 'monitoring',  label: 'Monitoring',       Component: MonitoringSection },
  { id: 'lifecycles',  label: 'Lifecycles',       Component: LifecyclesSection },
  { id: 'dataflows',   label: 'Data Flows',       Component: DataFlowsSection },
];

export default function DepartmentDossierPage() {
  const { departmentId } = useParams();
  const dept = departments.find(d => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Left: scroll-to-section TOC */}
      <aside style={{ width: 180, position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
          On this page
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
          {SECTIONS.map(s => (
            <li key={s.id} style={{ marginBottom: 6 }}>
              <a href={`#${s.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{s.label}</a>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <HeaderBanner dept={dept} />
        {SECTIONS.map(({ id, Component }) => (
          <Component key={id} dept={dept} />
        ))}
      </main>
    </div>
  );
}
```

Commit: `feat(dossier): DepartmentDossierPage shell with TOC + 12 section slots`.

### Task 3 — Section implementations (batch commit)

Implement all 12 section components. Each is a small self-contained React component using existing data files. Examples:

**`UseCasesSection.jsx`**:
```jsx
import SectionCard from './SectionCard';
import { getUseCasesForDept } from '../../data/aiUseCases';

const CAT_COLORS = { /* pull from AIUseCasesTab pattern */ };

export default function UseCasesSection({ dept }) {
  const items = getUseCasesForDept(dept.id);
  return (
    <SectionCard id="usecases" icon="🤖" title="AI Use Cases" subtitle={`${items.length} catalogued for ${dept.name}`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {items.slice(0, 6).map(u => (
          <div key={u.id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{u.category}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{u.name}</div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>{u.description}</div>
            <div style={{ fontSize: 11 }}>
              <strong>Input:</strong> {u.inputs.slice(0, 2).join(', ')}
              <br/><strong>Output:</strong> {u.outputs.slice(0, 2).join(', ')}
              <br/><strong>Impact:</strong> {u.businessImpact}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, marginTop: 8 }}>
        <a href={`/${dept.id}/admin`} style={{ color: '#3b82f6' }}>View full catalog in Admin → AI Use Cases →</a>
      </div>
    </SectionCard>
  );
}
```

Each of the 12 sections follows the same thin-component pattern. Batch into 2-3 commits:

- `feat(dossier): Header + KPI + Status + Processes sections`
- `feat(dossier): UseCases + Roles + Reports + Documents sections`
- `feat(dossier): Decisions + Incidents + Monitoring + Lifecycles + DataFlows sections`

### Task 4 — Routing + sidebar link

**App.jsx** — add route BEFORE the `/:deptId/:processId` catchall:
```jsx
<Route path="/:departmentId/dossier" element={<DepartmentDossierPage />} />
```

**Sidebar.jsx** — inside the existing expanded-dept block, add a third sub-link ONLY when `dept.id === 'sales'` (pilot gate):

```jsx
{dept.id === 'sales' && (
  <NavLink
    to={`/${dept.id}/dossier`}
    className={({ isActive }) => 'nav-subitem nav-subitem-dossier' + (isActive ? ' active' : '')}
  >
    <span className="nav-subitem-icon">⭐</span>
    <span className="nav-subitem-label">Dossier</span>
  </NavLink>
)}
```

Add matching CSS to `sidebar.css` (mirror admin/manager variant styles).

Commit: `feat(dossier): /sales/dossier route + sidebar link (pilot-only)`.

### Task 5 — Playwright screenshot

Add to `frontend/e2e/capture-screenshots.spec.js`:

```js
test('14 sales dossier — full single-pane view', async ({ page }) => {
  const DOSSIER_OUT = path.resolve(__dirname, '../../docs/screenshots/dossier');
  await page.goto('/sales/dossier');
  await expect(page.getByText(/Sales & Demand/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/AI Use Cases/)).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DOSSIER_OUT}/sales-dossier-full.png`, fullPage: true });
});
```

Create `docs/screenshots/dossier/` if not exists.

Commit: `test(e2e): capture Sales dossier single-pane screenshot`.

### Task 6 — Verify + push

```bash
cd frontend && npx vite build 2>&1 | tail -5    # clean
npx playwright test 2>&1 | tail -10             # +1 test
python -m pytest backend/tests/ --ignore=backend/tests/eval 2>&1 | tail -3  # unchanged
git push
```

## Completion criteria

- [ ] `/sales/dossier` renders a scrollable page with all 13 sections (1 header + 12 section cards)
- [ ] TOC sidebar with anchor links works
- [ ] ⭐ Dossier sub-link appears in sidebar ONLY for Sales
- [ ] Visiting `/supply-chain/dossier` works but has no sidebar entry (direct URL still works)
- [ ] Existing 42 Playwright tests still pass; +1 new = 43
- [ ] No existing tab/page/component modified except Sidebar (additive) and App.jsx (new route)
- [ ] Screenshot `docs/screenshots/dossier/sales-dossier-full.png` shows all sections visible

## Notes

- **Synthetic data**: Decisions, Incidents, Monitoring sections use deterministic mock data via `hashString` + `overrideEvents.js`. Clearly labeled "synthetic — will wire to real logs in Phase 3b".
- **Why pilot-only**: user explicitly said "one department first to check". Other depts can get the link added later once the pattern is validated.
- **No breaking changes**: enforcing isolation. Existing tab structure untouched. Dossier is orthogonal.
