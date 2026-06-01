import { test, expect } from '@playwright/test';

test.describe('Admin & Manager hubs — Phase 1 scaffolding', () => {
  test('Sidebar shows Admin and Manager sub-links for Sales', async ({ page }) => {
    await page.goto('/');
    // Expand Sales by clicking its parent row
    await page.getByText('Sales & Demand', { exact: false }).first().click();
    await expect(page.getByRole('link', { name: /Admin/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Manager/ }).first()).toBeVisible();
  });

  test('Admin page renders 13 tabs for Sales', async ({ page }) => {
    // 10 baseline admin tabs + 2 shared governance tabs added in Phase 3a
    // (Override Analytics, Lifecycles) + Manager Archetypes tab added
    // alongside the 9-archetype manager sub-specialization catalog.
    await page.goto('/sales/admin');
    await expect(page.locator('.page-title')).toContainText('Admin');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(13);
  });

  test('Manager page renders 7 tabs for Logistics', async ({ page }) => {
    // Sales manager now has 10 tabs (Phase ε adds 3 sales-specific tabs);
    // use Logistics here as the baseline 7-tab check for non-sales depts.
    await page.goto('/logistics/manager');
    await expect(page.locator('.page-title')).toContainText('Manager');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(7);
  });

  test('New departments appear on dashboard', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Contact Center', 'Marketing', 'Telehealth']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('/data-flow renders seeded edges', async ({ page }) => {
    await page.goto('/data-flow');
    await expect(page.locator('.page-title')).toContainText('Cross-Department Data Flow');
    // Has at least one row
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('Admin page for new Telehealth dept works', async ({ page }) => {
    await page.goto('/telehealth/admin');
    await expect(page.locator('.page-title')).toContainText('Telehealth');
    await expect(page.locator('.page-title')).toContainText('Admin');
  });

  test('Sidebar shows Tester sub-link for Sales', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Sales & Demand', { exact: false }).first().click();
    await expect(page.getByRole('link', { name: /Tester/ }).first()).toBeVisible();
  });

  test('Tester page renders 5 tabs for Sales', async ({ page }) => {
    await page.goto('/sales/tester');
    await expect(page.locator('.page-title')).toContainText('Tester');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(5);
  });

  test('Invalid dept redirects to dashboard', async ({ page }) => {
    await page.goto('/does-not-exist/admin');
    // The redirect sends us to "/" which renders Dashboard
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Sales flagship — Phase ε', () => {
  test('Sales Manager page shows 10 tabs (7 base + 3 sales-specific)', async ({ page }) => {
    await page.goto('/sales/manager');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(10);
    await expect(page.getByText('Forecast', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Simulation', { exact: false }).first()).toBeVisible();
  });

  test('Non-flagship Manager page still has 7 tabs', async ({ page }) => {
    // Phase ε adds 3 supply-chain-specific tabs (Stockout Risk, Supplier
    // Scorecard, Network Sim), so /supply-chain/manager now has 10 tabs like
    // Sales. Use Logistics as the non-flagship baseline for the 7-tab check.
    await page.goto('/logistics/manager');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(7);
  });

  test('Supply Chain Manager page shows 10 tabs (7 base + 3 SC-specific)', async ({ page }) => {
    await page.goto('/supply-chain/manager');
    const tabs = page.locator('.tab-item');
    await expect(tabs).toHaveCount(10);
    await expect(page.getByText('Stockout Risk', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Supplier Scorecard', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Network Sim', { exact: false }).first()).toBeVisible();
  });

  test('Sales overview fetches store count', async ({ page }) => {
    await page.goto('/sales');
    // The overview tab has the live tiles — "Active stores" label must render
    await expect(page.getByText('Active stores').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Simulation tab renders live form with enabled Run button', async ({ page }) => {
    // Phase δ replaced the placeholder with a live form that POSTs to /api/v1/sales/simulate.
    // Assert structural UI — NOT the backend response (which requires a Prophet fit and
    // is covered by capture-screenshots.spec.js test 06).
    // Phase η: default role is 'manager' so Run button is enabled unless the
    // previous test switched roles. Clear localStorage to guarantee default.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('insur.role'));
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
    const runBtn = page.getByRole('button', { name: /Run scenario/ });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();
    // Sanity check: the three input fields are in the DOM.
    await expect(page.getByText(/Store ID/).first()).toBeVisible();
    await expect(page.getByText(/Discount %/).first()).toBeVisible();
    await expect(page.getByText(/Duration/).first()).toBeVisible();
  });
});

test.describe('Manager Archetype pages — Phase θ', () => {
  test('Manager Archetype page renders for Agile on Sales', async ({ page }) => {
    await page.goto('/sales/manager/archetype/agile-manager');
    await expect(page.locator('.page-title')).toContainText(/Agile/i);
    await expect(page.getByText(/Responsibilities/i).first()).toBeVisible();
    await expect(page.getByText(/KPI/i).first()).toBeVisible();
  });

  test('Invalid archetype redirects', async ({ page }) => {
    await page.goto('/sales/manager/archetype/does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Demo-mode RBAC — Phase η', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure each RBAC test starts from a clean role = 'manager' default.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('insur.role'));
  });

  test('Topbar has role selector with 5 options', async ({ page }) => {
    // Phase ζ added a 5th canonical role "Tester".
    await page.goto('/');
    const selector = page.getByLabel('Demo role selector');
    await expect(selector).toBeVisible();
    const options = await selector.locator('option').allTextContents();
    expect(options).toEqual([
      'Manager',
      'Team Member',
      'Compliance',
      'Reporting & Monitoring',
      'Tester',
    ]);
  });

  test('SimulationTab disables Run when role is team-member', async ({ page }) => {
    await page.goto('/');
    // Switch to team-member via the selector BEFORE navigating.
    await page.getByLabel('Demo role selector').selectOption('team-member');
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
    const runBtn = page.getByRole('button', {
      name: /Manager role required|Run scenario/,
    });
    await expect(runBtn).toBeDisabled();
    await expect(page.getByText(/Current role:/)).toBeVisible();
    await expect(page.getByText(/team-member/).first()).toBeVisible();
    // Reset for downstream tests (they also clear in beforeEach but be explicit).
    await page.getByLabel('Demo role selector').selectOption('manager');
  });
});
