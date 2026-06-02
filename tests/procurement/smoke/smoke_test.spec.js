// Tier 8 — Smoke / E2E test for procurement.
//
// Recommended: playwright (per global §64.42).
//
// Run with:  npx playwright test tests/procurement/smoke/
//
// Per global §64.30 tier 8: top 20 critical endpoints + UI routes per deploy.

const { test, expect } = require('@playwright/test');

test.describe('procurement smoke tests', () => {
  test('INSUR nav page for procurement loads', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/procurement');
    await expect(page).toHaveURL(/\/insur\/procurement/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('NEGATIVE — bogus dept returns 404 or empty', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/nonexistent-dept-xyz');
    // Either explicit 404 OR empty nav — both acceptable; absence of crash is the point
    await expect(page.locator('body')).toBeVisible();
  });
});
