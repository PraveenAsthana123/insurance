# All-Department 100% Completion

**Goal:** No dept has a `TabStub` placeholder anywhere. Every Admin tab (10) and every Manager tab (7) renders meaningful, data-driven content for every one of the 14 departments, using existing data files (no new backend needed).

**Current state:**
- 2 admin tabs live: WorkflowsTab, AIUseCasesTab
- 3 Sales-specific + 3 Supply-Chain-specific manager tabs live (those flagships)
- 15 remaining stubs for every other dept (8 admin + 7 manager)

**Strategy:** Replace each `TabStub` consumer with a real component that reads from existing JS data files (`roles.js`, `reports.js`, `workflows.js`, `aiUseCases.js`, `dataFlow.js`, `departments.js`) plus a few new static data files for infrastructure-style tabs (Permissions matrix, MCP Servers list, etc.).

**No backend work.** All content is static-data-driven and renders instantly.

---

## Files to write (15 replacements + ~3 new data files)

### Admin tabs (8 remaining stubs to replace)

1. **UsersRolesTab** — shows roles from `roles.js` for the dept + mock user list (5-10 users per role)
2. **PermissionsTab** — 4 roles × 10 actions grid with checkmarks (matrix from a new `permissionsMatrix.js`)
3. **IntegrationsTab** — shows data flows in/out + mock connector catalog (from a new `integrations.js`)
4. **MCPServersTab** — mock list of 4-6 MCP servers with url/transport/health (from a new `mcpServers.js`)
5. **ModelRegistryTab** — filters `aiUseCases.js` for ML-category entries per dept, renders as model cards
6. **ScheduledJobsTab** — filters `workflows.js` for time-based triggers per dept
7. **AuditLogTab** — generates 20 synthetic recent events per dept (deterministic from dept.id hash)
8. **SettingsTab** — renders dept metadata from `departments.js` + mock SLA/alert config

### Manager tabs (7 stubs to replace)

1. **KPIDashboardTab** — 6 mock KPI tiles with sparklines per dept
2. **StatusHealthTab** — model drift %, pipeline uptime, SLA compliance — mock but dept-specific
3. **ReportsTab** — filters `reports.js` by the 4 roles, renders as 4 columns
4. **MonitoringAlertsTab** — mock alert feed + trend sparkline (5-10 alerts)
5. **TeamPerformanceTab** — roles table + mock productivity per role
6. **DataFlowTab** — filters `dataFlow.js` inbound + outbound edges for this dept
7. **RolesResponsibilitiesTab** — renders `rolesByDept[dept.id]` — responsibilities list + KPIs + reports per role

### New static-data files

- `frontend/src/data/permissionsMatrix.js` — 4 roles × 10 actions × {allow, deny}
- `frontend/src/data/integrations.js` — list of 8 mock connectors (Salesforce, SAP, Snowflake, Databricks, Kafka, etc.) with fields used per dept
- `frontend/src/data/mcpServers.js` — list of 5 mock MCP server registrations

### Also fix

- `frontend/src/data/roles.js` — the 11 non-seeded depts have `{}`. For 100% completion, **synthesize** reasonable role entries for each using the dept metadata + patterns from the 3 seeded depts. This way the Roles & Responsibilities tab has real content everywhere.

---

## Build pattern per tab

Every tab follows this template (inline styles; no new CSS):

```jsx
import { useMemo } from 'react';
import { /* relevant data file */ } from '../../data/...';

export default function XyzTab({ dept }) {
  const items = useMemo(() => resolveForDept(dept?.id), [dept?.id]);

  if (!dept) return null;
  if (!items.length) {
    return <EmptyState message={`No data catalogued for ${dept.name} yet.`} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>{dept.name} — {TAB_TITLE}</h3>
      <p style={{ color: '#64748b' }}>{DESCRIPTION}</p>
      <TableOrListView items={items} />
    </div>
  );
}
```

Reuse the existing `WorkflowsTab.jsx` as the structural reference — search/filter pills, color-coded badges, inline table.

## Completion criteria

- [ ] All 10 admin tabs render live content for all 14 depts
- [ ] All 7 manager tabs render live content for all 14 depts
- [ ] Roles `{}` entries populated for all 11 non-seeded depts (synthesized from patterns)
- [ ] Zero `TabStub` imports in `components/admin-tabs/` and `components/manager-tabs/` (other than the shared TabStub component itself and possibly as a last-resort fallback)
- [ ] Vite build clean
- [ ] Playwright 34/34 still pass
- [ ] 2-3 new screenshots: one random non-flagship dept's admin + manager page showing live content

## Execution

**Single wave** — dispatch one subagent to do all 15 tab replacements + 3 data files + roles.js synthesis + verification. 

No need to commit each file separately — batch into 5-6 logical commits (new data files → admin tabs batch → manager tabs batch → roles.js synthesis → screenshots).
