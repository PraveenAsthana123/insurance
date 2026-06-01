# Sales Phase η — RBAC Demo-Mode

**Goal:** Demo-mode RBAC across Sales endpoints + UI. No real auth; user picks a role in the top-bar and the frontend sends `X-Demo-Role: <role>` on every fetch. Backend middleware enforces a permission matrix — unpermitted action → 403. UI hides admin-only buttons when role lacks permission (defense-in-depth).

**Scope:** backend middleware + frontend role selector + permission matrix. No real JWT, no session store, no user-management UI. Purely presentational + enforced at API boundary.

**Spec:** `docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md` §10.8.

**Architecture:**
- `backend/core/rbac_middleware.py` — maps `X-Demo-Role` header to a permission set; before each Sales-prefixed request, checks if `(method, path-pattern)` is in the set; 403 if not
- Permission matrix lives as a Python dict (can be extracted to JSON later)
- `frontend/src/hooks/useRole.js` — reads/writes role in localStorage
- `frontend/src/components/RoleSelector.jsx` — dropdown in topbar
- All existing `fetch` calls auto-attach `X-Demo-Role` via a small `apiFetch` wrapper
- salesApi.js + aiExplainApi.js refactored to use the wrapper

**Files:**
```
CREATE: backend/core/rbac_middleware.py
CREATE: backend/tests/test_rbac_middleware.py
MODIFY: backend/main.py                         (register middleware)
MODIFY: backend/routers/sales.py                (no code change; middleware handles it)
CREATE: frontend/src/hooks/useRole.js
CREATE: frontend/src/components/RoleSelector.jsx
MODIFY: frontend/src/components/Topbar.jsx       (mount RoleSelector)
MODIFY: frontend/src/services/salesApi.js        (use apiFetch wrapper)
MODIFY: frontend/src/services/aiExplainApi.js    (use apiFetch wrapper)
CREATE: frontend/src/services/apiFetch.js       (shared fetch with role header)
MODIFY: frontend/src/components/manager-tabs/sales/SimulationTab.jsx  (hide Run button when role lacks 'simulate' perm)
MODIFY: frontend/e2e/admin-manager-hubs.spec.js  (assertions for role selector + 403 path)
```

## Tasks

### Task 1 — backend RBAC middleware + permission matrix

Create `backend/core/rbac_middleware.py`:

```python
"""rbac_middleware — demo-mode RBAC. Reads X-Demo-Role header, enforces matrix.

NOT real auth — no token signing, no session. For demo + portfolio purposes.
Real RBAC is Phase 2b (see roadmap §12).
"""
from __future__ import annotations

import logging
import re
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# ----- Permission matrix for Sales endpoints -----
# Each entry: (method, path-regex) -> set of roles allowed.
# If no entry matches, request is ALLOWED (so /health, /docs, etc. stay open).

SALES_PERMS: list[tuple[str, re.Pattern, set[str]]] = [
    ("GET",  re.compile(r"^/api/v1/sales/stores$"),        {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("POST", re.compile(r"^/api/v1/sales/forecast$"),      {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("POST", re.compile(r"^/api/v1/sales/simulate$"),      {"manager"}),  # simulation is manager-only per spec
    ("POST", re.compile(r"^/api/v1/ai/explain$"),          {"manager", "team-member", "compliance", "reporting-monitoring"}),
]

VALID_ROLES = {"manager", "team-member", "compliance", "reporting-monitoring"}


class RBACMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next: Callable):
        method = request.method
        path = request.url.path

        match = next(((m, rx, roles) for (m, rx, roles) in SALES_PERMS
                      if m == method and rx.match(path)), None)

        if match is None:
            # Path not in matrix → allow (covers /health, /docs, /openapi.json, etc.)
            return await call_next(request)

        _, _, allowed = match
        role = request.headers.get("x-demo-role", "manager")   # default to manager for unauthenticated
        if role not in VALID_ROLES:
            return JSONResponse(
                status_code=400,
                content={"detail": f"Unknown role '{role}'. Valid: {sorted(VALID_ROLES)}"},
            )

        if role not in allowed:
            logger.info("rbac.denied role=%s method=%s path=%s", role, method, path)
            return JSONResponse(
                status_code=403,
                content={"detail": f"Role '{role}' not permitted on {method} {path}"},
            )

        return await call_next(request)
```

Register in `backend/main.py`:
```python
from core.rbac_middleware import RBACMiddleware
app.add_middleware(RBACMiddleware)
```
(Add AFTER CorrelationIdMiddleware so correlation_id is set first on 403 responses.)

Commit `feat(rbac): RBACMiddleware + Sales permission matrix`.

### Task 2 — backend tests

Create `backend/tests/test_rbac_middleware.py`:

```python
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_stores_allowed_for_all_roles(client):
    for role in ("manager", "team-member", "compliance", "reporting-monitoring"):
        r = client.get("/api/v1/sales/stores", headers={"X-Demo-Role": role})
        assert r.status_code == 200, f"role {role} blocked on /stores"


def test_simulate_manager_only(client):
    body = {"store_id": 1, "discount_pct": 10, "duration_days": 7}
    r = client.post("/api/v1/sales/simulate", json=body, headers={"X-Demo-Role": "manager"})
    assert r.status_code == 200

    for role in ("team-member", "compliance", "reporting-monitoring"):
        r = client.post("/api/v1/sales/simulate", json=body, headers={"X-Demo-Role": role})
        assert r.status_code == 403, f"role {role} incorrectly allowed on /simulate"


def test_unknown_role_returns_400(client):
    r = client.get("/api/v1/sales/stores", headers={"X-Demo-Role": "hackerman"})
    assert r.status_code == 400


def test_missing_role_defaults_to_manager(client):
    r = client.get("/api/v1/sales/stores")
    assert r.status_code == 200


def test_non_matrix_path_is_allowed(client):
    # A path NOT in SALES_PERMS should pass through.
    r = client.get("/api/v1/departments")  # existing pre-RBAC route
    assert r.status_code in (200, 404)  # whatever the actual route returns — just not 403
```

Run: `python -m pytest backend/tests/test_rbac_middleware.py -v` → 5/5 pass.
Regress: `python -m pytest backend/tests/test_sales_router.py -v` → should still pass (no X-Demo-Role on those; middleware defaults to manager).

Commit `test(rbac): middleware permission enforcement`.

### Task 3 — frontend apiFetch wrapper + useRole hook

Create `frontend/src/services/apiFetch.js`:

```js
// apiFetch — thin fetch wrapper that attaches X-Demo-Role from localStorage.

const DEFAULT_ROLE = 'manager';

export function getCurrentRole() {
  if (typeof localStorage === 'undefined') return DEFAULT_ROLE;
  return localStorage.getItem('insur.role') || DEFAULT_ROLE;
}

export function setCurrentRole(role) {
  localStorage.setItem('insur.role', role);
  // Notify listeners (RoleSelector + SimulationTab).
  window.dispatchEvent(new CustomEvent('insur:role-change', { detail: role }));
}

export async function apiFetch(url, init = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Demo-Role': getCurrentRole(),
    ...(init.headers || {}),
  };
  const r = await fetch(url, { ...init, headers });
  if (!r.ok) {
    let detail = r.statusText;
    try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
    const err = new Error(`${r.status} ${detail}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}
```

Create `frontend/src/hooks/useRole.js`:

```js
import { useEffect, useState } from 'react';
import { getCurrentRole, setCurrentRole } from '../services/apiFetch';

export const ROLES = ['manager', 'team-member', 'compliance', 'reporting-monitoring'];

export function useRole() {
  const [role, setRole] = useState(getCurrentRole);

  useEffect(() => {
    const onChange = (e) => setRole(e.detail);
    window.addEventListener('insur:role-change', onChange);
    return () => window.removeEventListener('insur:role-change', onChange);
  }, []);

  return [role, (next) => setCurrentRole(next)];
}
```

Refactor `frontend/src/services/salesApi.js` and `frontend/src/services/aiExplainApi.js` to import and use `apiFetch` instead of their local `fetchJson` helpers.

Commit `feat(rbac): apiFetch wrapper + useRole hook (frontend)`.

### Task 4 — RoleSelector component + Topbar integration

Create `frontend/src/components/RoleSelector.jsx`:

```jsx
import { useRole, ROLES } from '../hooks/useRole';

const LABELS = {
  manager: 'Manager',
  'team-member': 'Team Member',
  compliance: 'Compliance',
  'reporting-monitoring': 'Reporting & Monitoring',
};

const COLORS = {
  manager: '#2563eb',
  'team-member': '#059669',
  compliance: '#7c3aed',
  'reporting-monitoring': '#c2410c',
};

export default function RoleSelector() {
  const [role, setRole] = useRole();

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#64748b' }}>Role</span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        aria-label="Demo role selector"
        style={{
          padding: '4px 8px', fontSize: 12, fontWeight: 600,
          border: `1px solid ${COLORS[role]}`, borderRadius: 4,
          color: COLORS[role], background: '#fff',
          cursor: 'pointer',
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{LABELS[r]}</option>
        ))}
      </select>
    </label>
  );
}
```

Read `frontend/src/components/Topbar.jsx` and add `<RoleSelector />` inside the top-right area (next to the existing "Live" badge or wherever user info lives).

Commit `feat(ui): RoleSelector in Topbar — demo-mode RBAC switcher`.

### Task 5 — SimulationTab hides Run button for non-manager

Modify `frontend/src/components/manager-tabs/sales/SimulationTab.jsx`:

Import the hook + disable button when role isn't manager:

```jsx
import { useRole } from '../../../hooks/useRole';

// Inside the component:
const [role] = useRole();
const canSimulate = role === 'manager';

// In the Run button:
<button
  onClick={run}
  disabled={loading || !canSimulate}
  title={canSimulate ? 'Run simulation' : 'Manager role required'}
  ...
>
  {canSimulate ? (loading ? 'Running…' : '▶ Run scenario')
                : '🔒 Manager role required'}
</button>
```

Also show a small note above the button for non-managers:

```jsx
{!canSimulate && (
  <div style={{
    padding: 8, marginBottom: 8, background: '#fef3c7', color: '#92400e',
    border: '1px solid #fde68a', borderRadius: 4, fontSize: 12,
  }}>
    Current role: <strong>{role}</strong>. Switch to Manager in the top-bar role selector to run simulations.
  </div>
)}
```

Commit `feat(ui): SimulationTab respects demo role — manager-only`.

### Task 6 — Playwright assertions

Append to `frontend/e2e/admin-manager-hubs.spec.js` (new describe block):

```js
test.describe('Demo-mode RBAC — Phase η', () => {
  test('Topbar has role selector with 4 options', async ({ page }) => {
    await page.goto('/');
    const selector = page.getByLabel('Demo role selector');
    await expect(selector).toBeVisible();
    const options = await selector.locator('option').allTextContents();
    expect(options).toEqual(['Manager', 'Team Member', 'Compliance', 'Reporting & Monitoring']);
  });

  test('SimulationTab disables Run when role is team-member', async ({ page }) => {
    await page.goto('/');
    // Switch to team-member via the selector
    await page.getByLabel('Demo role selector').selectOption('team-member');
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
    const runBtn = page.getByRole('button', { name: /Manager role required|Run scenario/ });
    await expect(runBtn).toBeDisabled();
    await expect(page.getByText(/Current role:.+team-member/)).toBeVisible();
    // Reset for other tests
    await page.getByLabel('Demo role selector').selectOption('manager');
  });
});
```

Run: `npx playwright test admin-manager-hubs --reporter=list` → all tests (11 + 2 new = 13) pass.

Commit `test(e2e): role selector + simulation RBAC UI gating`.

### Task 7 — Screenshot

Append a 7th test to `capture-screenshots.spec.js`:

```js
test('10 role selector switching visible in topbar', async ({ page }) => {
  await page.goto('/sales/manager');
  await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/10-role-selector-manager.png`, fullPage: false });

  await page.getByLabel('Demo role selector').selectOption('team-member');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/10-role-selector-team-member.png`, fullPage: false });

  await page.getByLabel('Demo role selector').selectOption('manager');
});
```

Run + commit `test(e2e): capture role selector state screenshots`.

### Task 8 — Verify + push

```bash
python -m pytest backend/tests/ -v --ignore=backend/tests/eval 2>&1 | tail -5     # 45/45 pass (40 prior + 5 rbac)
cd frontend && npx vite build && npm run test:e2e 2>&1 | tail -10
git push
```

## Completion criteria

- [ ] `POST /api/v1/sales/simulate` with `X-Demo-Role: team-member` returns 403
- [ ] Same request with `X-Demo-Role: manager` returns 200
- [ ] Unknown role returns 400
- [ ] UI RoleSelector in topbar switches role and persists via localStorage
- [ ] SimulationTab disables Run when role != manager
- [ ] 5 RBAC unit tests + 2 Playwright tests pass
- [ ] No regressions on existing 40 backend + 11 Playwright tests
- [ ] Screenshots captured showing role selector states

## Risks

| Risk | Mitigation |
|---|---|
| Middleware blocks existing test flows (no header → default manager) | Default role = manager so existing unauthenticated flows still work |
| localStorage unavailable in some environments | `getCurrentRole()` guards with `typeof localStorage === 'undefined'` |
| Role change mid-request — stale header in flight | Accept — demo only; real fix is session-scoped tokens |
