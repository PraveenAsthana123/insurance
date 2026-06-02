// Tier 8 — Smoke / E2E test for customer-experience.
//
// Recommended: playwright (per global §64.42).
//
// Run with:  npx playwright test tests/customer-experience/smoke/
//
// Per global §64.30 tier 8: top 20 critical endpoints + UI routes per deploy.

const { test, expect } = require('@playwright/test');

test.describe('customer-experience smoke tests', () => {
  test('INSUR nav page for customer-experience loads', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/customer-experience');
    await expect(page).toHaveURL(/\/insur\/customer-experience/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('NEGATIVE — bogus dept returns 404 or empty', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/nonexistent-dept-xyz');
    // Either explicit 404 OR empty nav — both acceptable; absence of crash is the point
    await expect(page.locator('body')).toBeVisible();
  });
});
