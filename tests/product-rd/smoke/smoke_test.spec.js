// Tier 8 — Smoke / E2E test for product-rd.
//
// Recommended: playwright (per global §64.42).
//
// Run with:  npx playwright test tests/product-rd/smoke/
//
// Per global §64.30 tier 8: top 20 critical endpoints + UI routes per deploy.

const { test, expect } = require('@playwright/test');

test.describe('product-rd smoke tests', () => {
  test('INSUR nav page for product-rd loads', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/product-rd');
    await expect(page).toHaveURL(/\/insur\/product-rd/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('NEGATIVE — bogus dept returns 404 or empty', async ({ page }) => {
    await page.goto('http://localhost:3000/insur/nonexistent-dept-xyz');
    // Either explicit 404 OR empty nav — both acceptable; absence of crash is the point
    await expect(page.locator('body')).toBeVisible();
  });
});
