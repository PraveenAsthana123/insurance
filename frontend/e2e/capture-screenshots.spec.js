// capture-screenshots.spec.js — one-shot capture of key pages for demo assets.
// Run: npm run test:e2e -- capture-screenshots.spec.js --project=chromium
// Produces PNGs in docs/screenshots/sales/

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../docs/screenshots/sales');

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('Sales flagship — demo screenshots', () => {
  test('01 dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT}/01-dashboard.png`, fullPage: true });
  });

  test('02 sales overview (live KPI tiles)', async ({ page }) => {
    await page.goto('/sales');
    // Wait for sales-specific tile to mount (label renders on skeleton too)
    await expect(page.getByText('Active stores').first()).toBeVisible({ timeout: 10_000 });
    // Give a moment for the live fetch to populate values
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/02-sales-overview.png`, fullPage: true });
  });

  test('03 sales manager (10 tabs)', async ({ page }) => {
    await page.goto('/sales/manager');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT}/03-sales-manager-10-tabs.png`, fullPage: true });
  });

  test('04 forecast tab — store picker + generated Prophet chart', async ({ page }) => {
    test.setTimeout(120_000); // First RAG call can take 15-40s (index build + embed)
    await page.goto('/sales/manager');
    // "Forecast" tab button uniquely — use last() since the word may appear elsewhere
    await page.locator('.tab-item').filter({ hasText: /Forecast/ }).first().click();
    await expect(page.getByRole('button', { name: /^Generate forecast$/ })).toBeVisible();
    await page.screenshot({ path: `${OUT}/04a-forecast-empty.png`, fullPage: true });

    // Run the forecast (click Generate forecast — first Prophet fit ~3–8s)
    await page.getByRole('button', { name: /^Generate forecast$/ }).click();
    // Wait for MAPE text which only appears after a successful response
    await expect(page.getByText(/Backtest MAPE/)).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/04b-forecast-generated.png`, fullPage: true });

    // Open ExplainDrawer
    await page.getByRole('button', { name: /Ask AI why/ }).click();
    await expect(page.getByRole('dialog', { name: /AI Explanation/ })).toBeVisible();
    // Drawer now has an input + Ask button + returns live RAG content.
    // Question is pre-seeded from context — just submit.
    await page.getByRole('button', { name: /^Ask$/ }).click();
    // Wait for the Citations section — first RAG call can take ~15-40s on cold cache.
    await expect(page.locator('text=/Citations \\(/')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/04c-explain-drawer.png`, fullPage: true });
  });

  test('05 revenue drill-down tab', async ({ page }) => {
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Revenue Tree/ }).first().click();
    await expect(page.getByText(/Sales hierarchy/)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/05-revenue-drilldown.png`, fullPage: true });
  });

  test('06 simulation — live waterfall', async ({ page }) => {
    test.setTimeout(90_000);  // First-run Prophet fit can take ~30–60s
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
    await expect(page.getByRole('button', { name: /Run scenario/ })).toBeVisible();
    await page.screenshot({ path: `${OUT}/06a-simulation-empty.png`, fullPage: true });

    await page.getByRole('button', { name: /Run scenario/ }).click();
    await expect(page.getByText(/Baseline revenue/)).toBeVisible({ timeout: 75_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/06b-simulation-waterfall.png`, fullPage: true });
  });

  test('07 admin workflows tab (enhancement workflows)', async ({ page }) => {
    await page.goto('/sales/admin');
    await page.getByRole('button', { name: /Workflows/ }).click();
    // WorkflowsTab renders "N workflows" in the stats bar — wait for it.
    await expect(page.locator('text=/\\d+\\s+workflows/').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/07-admin-workflows.png`, fullPage: true });
  });

  test('08 data-flow page', async ({ page }) => {
    await page.goto('/data-flow');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT}/08-data-flow.png`, fullPage: true });
  });

  test('09 sidebar expanded showing Admin + Manager sub-links', async ({ page }) => {
    await page.goto('/');
    // Expand Sales & Demand by clicking its parent row
    await page.getByText('Sales & Demand').first().click();
    await expect(page.getByRole('link', { name: /Admin/ }).first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/09-sidebar-sales-expanded.png`, fullPage: false });
  });

  test('10 admin AI Use Cases tab — sales', async ({ page }) => {
    await page.goto('/sales/admin');
    await page.getByRole('button', { name: /AI Use Cases/ }).click();
    // Wait for the stats line "N use cases" to render
    await expect(page.locator('text=/\\d+\\s+use cases/').first()).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/10-admin-ai-use-cases.png`, fullPage: true });
  });

  test('10b admin AI Use Cases tab — supply-chain', async ({ page }) => {
    const DEPT_OUT = path.resolve(__dirname, '../../docs/screenshots/depts');
    await page.goto('/supply-chain/admin');
    await page.getByRole('button', { name: /AI Use Cases/ }).click();
    await expect(page.locator('text=/\\d+\\s+use cases/').first()).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${DEPT_OUT}/supply-chain-ai-use-cases.png`,
      fullPage: true,
    });
  });

  test('10d supply-chain flagship — overview (live tiles)', async ({ page }) => {
    const SC_OUT = path.resolve(__dirname, '../../docs/screenshots/supply-chain');
    await page.goto('/supply-chain');
    // Wait for one of the new Supply Chain tiles to mount.
    await expect(page.getByText('SKUs tracked').first()).toBeVisible({ timeout: 10_000 });
    // Give the live fetch a moment to populate values.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SC_OUT}/11-supply-chain-overview.png`, fullPage: true });
  });

  test('10e supply-chain stockout risk tab — run for SKU0', async ({ page }) => {
    const SC_OUT = path.resolve(__dirname, '../../docs/screenshots/supply-chain');
    await page.goto('/supply-chain/manager');
    await page.locator('.tab-item').filter({ hasText: /Stockout Risk/ }).first().click();
    await expect(page.getByRole('button', { name: /^Assess risk$/ })).toBeVisible();
    // Default SKU dropdown value is SKU0 — just click Assess.
    await page.getByRole('button', { name: /^Assess risk$/ }).click();
    await expect(page.getByText(/Risk band/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SC_OUT}/12-supply-chain-stockout-risk.png`,
      fullPage: true,
    });
  });

  test('10f supply-chain supplier scorecard tab', async ({ page }) => {
    const SC_OUT = path.resolve(__dirname, '../../docs/screenshots/supply-chain');
    await page.goto('/supply-chain/manager');
    await page.locator('.tab-item').filter({ hasText: /Supplier Scorecard/ }).first().click();
    // Wait for at least one supplier row to render.
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SC_OUT}/13-supply-chain-supplier-scorecard.png`,
      fullPage: true,
    });
  });

  test('10g supply-chain network-sim tab — run scenario', async ({ page }) => {
    const SC_OUT = path.resolve(__dirname, '../../docs/screenshots/supply-chain');
    // Guarantee manager role so the Run button is enabled.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('insur.role'));
    await page.goto('/supply-chain/manager');
    await page.locator('.tab-item').filter({ hasText: /Network Sim/ }).first().click();
    const runBtn = page.getByRole('button', { name: /Run scenario/ });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();
    await runBtn.click();
    // Wait for the result-stat tiles.
    await expect(page.getByText(/Revenue at risk/).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SC_OUT}/14-supply-chain-network-sim.png`,
      fullPage: true,
    });
  });

  test('11 admin override-analytics tab', async ({ page }) => {
    await page.goto('/sales/admin');
    await page.getByRole('button', { name: /Override Analytics/ }).click();
    // Wait for the "N events total" stats line to render.
    await expect(page.locator('text=/\\d+\\s+events total/').first()).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT}/11-admin-override-analytics.png`,
      fullPage: true,
    });
  });

  test('12 admin lifecycles tab', async ({ page }) => {
    await page.goto('/sales/admin');
    await page.getByRole('button', { name: /Lifecycles/ }).click();
    // Each lifecycle renders an <h3> with the entity name — wait for Task (first).
    await expect(page.getByRole('heading', { name: 'Task' })).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/12-admin-lifecycles.png`,
      fullPage: true,
    });
  });

  test('14 admin manager-archetypes tab', async ({ page }) => {
    await page.goto('/sales/admin');
    await page.getByRole('button', { name: /Manager Archetypes/ }).click();
    // Header line mentions "9 specializations" — wait for it to render.
    await expect(page.getByText(/9 specializations of the Manager role/)).toBeVisible({
      timeout: 5000,
    });
    // Stats line confirms the 9 archetypes are loaded.
    await expect(page.locator('text=/\\b9\\s+archetypes/').first()).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT}/14-admin-manager-archetypes.png`,
      fullPage: true,
    });
  });

  test('13 feedback drawer — thumbs-up submit', async ({ page }) => {
    test.setTimeout(150_000); // First RAG call can take 15-40s + submit round-trip.
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Forecast/ }).first().click();
    await expect(page.getByRole('button', { name: /^Generate forecast$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Generate forecast$/ }).click();
    await expect(page.getByText(/Backtest MAPE/)).toBeVisible({ timeout: 60_000 });

    // Open the drawer + submit the seeded question.
    await page.getByRole('button', { name: /Ask AI why/ }).click();
    await expect(page.getByRole('dialog', { name: /AI Explanation/ })).toBeVisible();
    await page.getByRole('button', { name: /^Ask$/ }).click();
    // Wait for the feedback prompt which only renders after result arrives.
    await expect(page.getByText(/Was this helpful\?/)).toBeVisible({ timeout: 90_000 });

    // Click thumbs-up.
    await page.getByRole('button', { name: 'Thumbs up' }).click();
    // Thank-you text should appear; if the endpoint errored it'd say "Feedback failed".
    await expect(page.getByText(/Thanks — feedback recorded/)).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/13-feedback-drawer.png`,
      fullPage: true,
    });
  });

  test('14 sales dossier — full single-pane view', async ({ page }) => {
    const DOSSIER_OUT = path.resolve(__dirname, '../../docs/screenshots/dossier');
    await page.goto('/sales/dossier');
    // Header banner — dept name must render.
    await expect(page.getByRole('heading', { name: /Sales & Demand/ })).toBeVisible({
      timeout: 10_000,
    });
    // Every section card must render its header; spot-check a few spread through the page.
    await expect(page.getByRole('heading', { name: /Headline KPIs/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /AI Use Cases/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Data flows/ })).toBeVisible();
    // Wait a moment for the live /api/v1/sales/stores probe to populate the
    // green status pill + live Active-stores KPI tile.
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `${DOSSIER_OUT}/sales-dossier-full.png`,
      fullPage: true,
    });
  });

  test('10c role selector switching visible in topbar (Phase η)', async ({ page }) => {
    // Start from a clean role = manager default.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('insur.role'));
    await page.goto('/sales/manager');
    await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT}/10-role-selector-manager.png`,
      fullPage: false,
    });

    // Switch to team-member — the Run button should now show "Manager role required"
    // and a yellow banner should appear.
    await page.getByLabel('Demo role selector').selectOption('team-member');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${OUT}/10-role-selector-team-member.png`,
      fullPage: false,
    });

    // Reset for any downstream re-runs.
    await page.getByLabel('Demo role selector').selectOption('manager');
  });

  test('15 sales tester page — overview', async ({ page }) => {
    await page.goto('/sales/tester');
    await expect(page.locator('.page-title')).toContainText('Tester');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/15-sales-tester-overview.png`, fullPage: true });
  });

  test('16 manager archetype page — agile for sales', async ({ page }) => {
    await page.goto('/sales/manager/archetype/agile-manager');
    await expect(page.getByText(/Agile Manager/i).first()).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/16-manager-archetype-agile.png`, fullPage: true });
  });
});
