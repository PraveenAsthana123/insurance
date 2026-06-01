// Screenshots of newly-live Admin + Manager pages across non-flagship depts.
// Part of the "all-depts 100%" consolidation — proves the filled-stub tabs
// render for every dept (marketing, customer, finance, and a control dept
// like logistics).

import { test } from '@playwright/test';

const OUT = '../docs/screenshots/depts';

test.describe('Live dept tabs — consolidation screenshots', () => {
  test('marketing Manager — Campaign ROI tab', async ({ page }) => {
    await page.goto('/marketing/manager');
    await page.getByText('Campaign ROI', { exact: false }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/marketing-campaign-roi.png`, fullPage: true });
  });

  test('customer Manager — Churn Risk tab', async ({ page }) => {
    await page.goto('/customer/manager');
    await page.getByText('Churn Risk', { exact: false }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/customer-churn-risk.png`, fullPage: true });
  });

  test('finance Manager — Budget Variance tab', async ({ page }) => {
    await page.goto('/finance/manager');
    await page.getByText('Budget Variance', { exact: false }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/finance-budget-variance.png`, fullPage: true });
  });

  test('logistics Admin — live Users & Roles tab', async ({ page }) => {
    await page.goto('/logistics/admin');
    // Default Admin tab is users-roles — just capture.
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/logistics-admin-users-roles.png`, fullPage: true });
  });

  test('logistics Manager — live KPI Dashboard tab', async ({ page }) => {
    await page.goto('/logistics/manager');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/logistics-manager-kpi-dashboard.png`, fullPage: true });
  });
});
